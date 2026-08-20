package expo.modules.mediastoreresolver

import android.app.Activity
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.Serializable

// ─── Picker ─────────────────────────────────────────────────────────────────
// Launches Intent.ACTION_OPEN_DOCUMENT (Storage Access Framework) instead of
// the modern Photo Picker. Unlike Photo Picker Uris — which Android
// documents as read-only, session-scoped grants with no path to later
// deletion — ACTION_OPEN_DOCUMENT lets us request a persistable read/write
// grant on the exact Uri the provider returns, so it can still be acted on
// (queried for delete support, or deleted outright) after the picker
// activity has finished, once encryption has verified the copy landed
// safely. See MediaStoreResolverModule.processPickedUri /
// MediaStoreResolverModule.requestDelete for what's done with the Uri.

data class PickImagesOptions(val selectionLimit: Int) : Serializable

class PickImagesContract : AppContextActivityResultContract<PickImagesOptions, List<Uri>> {
  override fun createIntent(context: Context, input: PickImagesOptions): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "image/*"
      putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*"))
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, input.selectionLimit > 1)
      // Request the strongest grant the provider is willing to give. A
      // provider that only supports read simply won't honor the write/
      // persistable flags — that's discovered later, when we actually try
      // to take/use them, not something assumed here.
      addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION or
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
          Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
      )
    }
  }

  override fun parseResult(input: PickImagesOptions, resultCode: Int, intent: Intent?): List<Uri> {
    if (resultCode == Activity.RESULT_CANCELED || intent == null) return emptyList()
    val results = LinkedHashSet<Uri>()
    intent.data?.let { results.add(it) }
    intent.clipData?.let { clipData ->
      for (i in 0 until clipData.itemCount) {
        clipData.getItemAt(i)?.uri?.let { results.add(it) }
      }
    }
    return results.toList()
  }
}

// ─── Delete confirmation (MediaStore fallback) ─────────────────────────────
// Used only when a picked document's own provider doesn't support
// DocumentsContract.deleteDocument (see MediaStoreResolverModule.requestDelete
// for the primary path). Wraps android.provider.MediaStore.createDeleteRequest
// (API 30+) — the Android-documented flow for a third-party app to delete
// MediaStore items it doesn't own: the OS shows a system confirmation
// dialog and performs the deletion itself if approved. One request covers
// the whole batch of fallback items, so it's still at most one extra
// dialog, not one per photo.

data class DeleteRequestOptions(val mediaStoreIds: List<String>) : Serializable

class DeleteRequestContract : AppContextActivityResultContract<DeleteRequestOptions, Boolean> {
  private val delegate = ActivityResultContracts.StartIntentSenderForResult()

  @RequiresApi(Build.VERSION_CODES.R)
  override fun createIntent(context: Context, input: DeleteRequestOptions): Intent {
    val uris = input.mediaStoreIds.map { id ->
      ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toLong())
    }
    val deleteRequest = MediaStore.createDeleteRequest(context.contentResolver, uris)
    val senderRequest = IntentSenderRequest.Builder(deleteRequest.intentSender).build()
    return delegate.createIntent(context, senderRequest)
  }

  override fun parseResult(input: DeleteRequestOptions, resultCode: Int, intent: Intent?): Boolean {
    return resultCode == Activity.RESULT_OK
  }
}
