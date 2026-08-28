package expo.modules.mediastoreresolver

import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream

// Uses ACTION_OPEN_DOCUMENT (SAF) instead of the modern Photo Picker,
// because Photo Picker Uris are read-only/session-scoped with no path to
// later deletion. A persistable grant is taken on pick so the same Uri can
// still be acted on after encryption verifies the copy.
//
// requestDelete tries DocumentsContract.deleteDocument on the picked Uri
// directly first (no extra confirmation dialog, since permission was
// already granted at pick time); only if that's unsupported does it fall
// back to MediaStore.getMediaUri + MediaStore.createDeleteRequest (one
// system dialog for the whole batch). A raw ContentResolver.delete
// (what expo-media-library's deleteAssetsAsync does) reliably fails for
// media this app didn't create, so it's never used. If neither path
// applies, the original is left untouched, never guessed at.
//
// Android-only — iOS keeps using expo-image-picker + expo-media-library.
class MediaStoreResolverModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React Application Context is null" }

  private lateinit var pickImagesLauncher: AppContextActivityResultLauncher<PickImagesOptions, List<Uri>>
  private lateinit var deleteRequestLauncher: AppContextActivityResultLauncher<DeleteRequestOptions, Boolean>

  // Mirrors expo-image-picker's own isPickerOpen guard — a second launch
  // while one is already in flight would otherwise crash the activity
  // result registry.
  private var isPickerOpen = false

  override fun definition() = ModuleDefinition {
    Name("MediaStoreResolver")

    AsyncFunction("pickImages") Coroutine { selectionLimit: Int ->
      if (isPickerOpen) return@Coroutine emptyList<PickedImageResult>()
      isPickerOpen = true
      try {
        val uris = pickImagesLauncher.launch(PickImagesOptions(selectionLimit))
        uris.map { uri -> processPickedUri(uri) }
      } finally {
        isPickerOpen = false
      }
    }

    // documentUris are the raw Uris returned by pickImages (persistable
    // permission already taken at pick time). This function does its own
    // identity resolution per Uri — deleteDocument first, MediaStore
    // translation+createDeleteRequest fallback second — it does not trust
    // any pre-resolved id, because none is computed at pick time anymore.
    AsyncFunction("requestDelete") Coroutine { documentUris: List<String> ->
      if (documentUris.isEmpty()) return@Coroutine false
      requestDelete(documentUris.map { Uri.parse(it) })
    }

    RegisterActivityContracts {
      pickImagesLauncher = registerForActivityResult(PickImagesContract()) { _, _ -> }
      deleteRequestLauncher = registerForActivityResult(DeleteRequestContract()) { _, _ -> }
    }
  }

  /**
   * Copies the picked Uri's bytes into app cache (the encryption pipeline
   * needs a real file:// path) and takes a persistable permission grant on
   * the original Uri so it can be acted on later, once encryption has
   * verified the copy. The copy always happens — encryption must proceed
   * regardless of whether the permission grant succeeds; only the ability
   * to later delete is affected by that.
   */
  private fun processPickedUri(uri: Uri): PickedImageResult {
    val resolver = context.contentResolver

    // Take the persistable grant as early as possible — it's only valid
    // for as long as the app holds the (non-persistable) grant the picker
    // activity result carried, and we need it to outlive this function
    // call (deletion happens later, after encryption completes).
    try {
      resolver.takePersistableUriPermission(
        uri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
      )
    } catch (e: Exception) {
      // Not every provider grants persistable/write access — this is a
      // normal, expected outcome for some providers, not a failure to
      // surface loudly. requestDelete will simply find no delete path for
      // this Uri later.
    }

    val mimeType = resolver.getType(uri) ?: "image/jpeg"
    val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "jpg"
    val outputFile = File.createTempFile("picked_", ".$extension", context.cacheDir)

    resolver.openInputStream(uri)?.use { input ->
      FileOutputStream(outputFile).use { output -> input.copyTo(output) }
    }

    val fileName = queryDisplayName(resolver, uri)
    val (width, height) = decodeBounds(outputFile)

    return PickedImageResult(
      uri = Uri.fromFile(outputFile).toString(),
      fileName = fileName,
      width = width,
      height = height,
      documentUri = uri.toString(),
    )
  }

  private fun queryDisplayName(resolver: android.content.ContentResolver, uri: Uri): String? {
    return try {
      resolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        if (nameIndex >= 0 && cursor.moveToFirst()) cursor.getString(nameIndex) else null
      }
    } catch (e: Exception) {
      null
    }
  }

  private fun decodeBounds(file: File): Pair<Int, Int> {
    return try {
      val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, options)
      Pair(options.outWidth, options.outHeight)
    } catch (e: Exception) {
      Pair(0, 0)
    }
  }

  /**
   * Attempts to delete each document Uri directly via DocumentsContract,
   * only when its provider reports FLAG_SUPPORTS_DELETE. Uris that aren't
   * supported or that throw are collected and retried through the
   * MediaStore translation + createDeleteRequest fallback. Returns true
   * only if every Uri was deleted by one path or the other.
   */
  private suspend fun requestDelete(uris: List<Uri>): Boolean {
    val resolver = context.contentResolver
    val needsFallback = mutableListOf<Uri>()

    for (uri in uris) {
      val supportsDelete = documentSupportsDelete(resolver, uri)
      if (!supportsDelete) {
        needsFallback.add(uri)
        continue
      }
      val deleted = try {
        DocumentsContract.deleteDocument(resolver, uri)
      } catch (e: Exception) {
        false
      }
      if (!deleted) needsFallback.add(uri)
    }

    if (needsFallback.isEmpty()) return true

    val fallbackIds = needsFallback.mapNotNull { translateAndVerify(context, it) }
    if (fallbackIds.isEmpty()) return false

    val fallbackApproved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        deleteRequestLauncher.launch(DeleteRequestOptions(fallbackIds))
      } catch (e: Exception) {
        false
      }
    } else {
      var allDeleted = true
      for (idStr in fallbackIds) {
        try {
          val mediaUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, idStr.toLong())
          val rows = resolver.delete(mediaUri, null, null)
          if (rows == 0) allDeleted = false
        } catch (e: Exception) {
          allDeleted = false
        }
      }
      allDeleted
    }

    // Overall success requires both the direct deletions and the fallback
    // batch to have succeeded — a partial result is reported as false so
    // callers don't assume everything was cleaned up.
    return fallbackApproved && fallbackIds.size == needsFallback.size
  }

  private fun documentSupportsDelete(resolver: android.content.ContentResolver, uri: Uri): Boolean {
    return try {
      resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_FLAGS), null, null, null)?.use { cursor ->
        if (!cursor.moveToFirst()) return false
        val flagsIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_FLAGS)
        if (flagsIndex < 0) return false
        val flags = cursor.getInt(flagsIndex)
        (flags and DocumentsContract.Document.FLAG_SUPPORTS_DELETE) != 0
      } ?: false
    } catch (e: Exception) {
      false
    }
  }

  /**
   * android.provider.MediaStore.getMediaUri(Context, Uri) — see this
   * module's own doc comment for why this is the fallback mechanism rather
   * than an inference from copied metadata. The resolved id is re-queried
   * before being trusted; a translation success alone is not treated as
   * sufficient proof.
   */
  private fun translateAndVerify(context: Context, sourceUri: Uri): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null

    val mediaUri = try {
      MediaStore.getMediaUri(context, sourceUri)
    } catch (e: Exception) {
      null
    } ?: return null

    val id = try {
      ContentUris.parseId(mediaUri)
    } catch (e: Exception) {
      return null
    }

    val verified = context.contentResolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      arrayOf(MediaStore.Images.Media._ID),
      "${MediaStore.Images.Media._ID} = ?",
      arrayOf(id.toString()),
      null,
    )?.use { cursor -> cursor.moveToFirst() } ?: false

    return if (verified) id.toString() else null
  }
}

class PickedImageResult(
  @Field val uri: String = "",
  @Field val fileName: String? = null,
  @Field val width: Int = 0,
  @Field val height: Int = 0,
  // The original SAF document Uri (content://...) with a persistable
  // permission grant already taken, ready to pass to requestDelete once
  // encryption is verified. Null only if a Uri somehow lacked one, in
  // which case it must never be deleted.
  @Field val documentUri: String? = null,
) : Record
