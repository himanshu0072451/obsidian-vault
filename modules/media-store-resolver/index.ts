import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

export interface PickedImage {
  /** file:// path, ready for the encryption pipeline. */
  uri: string;
  fileName: string | null;
  width: number;
  height: number;
  /**
   * The original SAF content:// document Uri, with a persistable
   * read/write permission grant already taken at pick time — pass this
   * straight to requestDeleteNative once encryption is verified. Null only
   * if the picker somehow returned no Uri for this item, in which case it
   * must never be deleted.
   */
  documentUri: string | null;
}

type NativeModule = {
  pickImages(selectionLimit: number): Promise<PickedImage[]>;
  requestDelete(documentUris: string[]): Promise<boolean>;
};

let nativeModule: NativeModule | null = null;
if (Platform.OS === "android") {
  try {
    // requireNativeModule throws if the native module isn't present in
    // the running binary (e.g. Expo Go, or a build that hasn't picked up
    // this local module yet via prebuild).
    nativeModule = requireNativeModule<NativeModule>("MediaStoreResolver");
  } catch {
    nativeModule = null;
  }
}

/**
 * Launches Intent.ACTION_OPEN_DOCUMENT (Storage Access Framework) directly
 * — see MediaStoreResolverModule.kt for why — and returns, for each picked
 * image, a cache-copied file:// uri ready for encryption plus the original
 * document Uri (with a persistable permission grant already taken) to pass
 * to requestDeleteNative later. Android only — throws if called on any
 * other platform; callers must branch on Platform.OS themselves for iOS.
 */
export async function pickImagesNative(
  selectionLimit: number,
): Promise<PickedImage[]> {
  if (!nativeModule) {
    throw new Error(
      "MediaStoreResolver native module unavailable — this build hasn't picked it up (needs a native rebuild), or this isn't Android.",
    );
  }
  return nativeModule.pickImages(selectionLimit);
}

/**
 * Requests deletion of the given document Uris (from pickImagesNative's
 * documentUri). For each Uri the native side first tries
 * DocumentsContract.deleteDocument directly (no extra confirmation needed
 * — permission was already granted at pick time); any Uri whose provider
 * doesn't support that falls back to MediaStore translation +
 * MediaStore.createDeleteRequest, which shows a single system confirmation
 * dialog for the whole fallback batch. A Uri whose provider supports
 * neither path is left untouched. Returns whether every Uri was
 * successfully deleted by one path or the other — a `false` result is
 * non-fatal; the encrypted copies are already safe in the vault regardless.
 */
export async function requestDeleteNative(
  documentUris: string[],
): Promise<boolean> {
  if (!nativeModule || documentUris.length === 0) return false;
  try {
    return await nativeModule.requestDelete(documentUris);
  } catch {
    return false;
  }
}
