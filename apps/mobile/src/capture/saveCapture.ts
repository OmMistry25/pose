import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import { useAuthStore } from '../state/authStore';
import { supabase } from '../supabase/client';

export function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

/**
 * Ask for add-to-Photos permission (write-only on iOS when possible).
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync(true);
  if (current.granted) return true;
  const next = await MediaLibrary.requestPermissionsAsync(true);
  return next.granted;
}

/** Download a remote image to the app cache as a local file. */
async function downloadRemote(uri: string): Promise<string> {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    throw new Error('No cache directory available to download photo');
  }
  const dest = `${base}pose-save-${Crypto.randomUUID()}.jpg`;

  try {
    const result = await FileSystem.downloadAsync(uri, dest);
    if (result.status >= 200 && result.status < 300) {
      return result.uri;
    }
  } catch (e) {
    console.log('downloadAsync failed, trying fetch:', e);
  }

  // Fallback: fetch bytes and write as base64 (handles picky signed URLs).
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = globalThis.btoa(binary);
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

/** Re-encode a local image as JPEG so Photos always gets a supported asset. */
async function ensureJpegFile(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(toFileUri(localUri));
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG });
  context.release();
  rendered.release();
  return saved.uri;
}

/**
 * Save a photo into the device Photos / Gallery app.
 * Accepts local file:// URIs or remote https URLs.
 */
export async function saveCaptureToLibrary(uri: string): Promise<void> {
  const ok = await ensureMediaLibraryPermission();
  if (!ok) {
    throw new Error('Photo library permission was denied');
  }

  const localSource = isRemoteUri(uri) ? await downloadRemote(uri) : toFileUri(uri);
  const localJpeg = await ensureJpegFile(localSource);

  try {
    await MediaLibrary.createAssetAsync(localJpeg);
  } catch (firstError) {
    try {
      await MediaLibrary.saveToLibraryAsync(localJpeg);
    } catch {
      const message =
        firstError instanceof Error ? firstError.message : 'Could not save to Photos';
      throw new Error(message);
    }
  }
}

export type CloudCaptureResult = {
  id: string;
  imagePath: string;
};

/**
 * Upload the photo to Supabase Storage and insert a captures row.
 * Returns null if the user is not signed in.
 */
export async function syncCaptureToCloud(options: {
  uri: string;
  referenceId: string;
  matchScore: number;
}): Promise<CloudCaptureResult | null> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    console.log('cloud capture skipped: not signed in');
    return null;
  }

  const fileUri = toFileUri(options.uri);
  const arrayBuffer = await fetch(fileUri).then((r) => r.arrayBuffer());
  const imagePath = `${userId}/${Crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('captures')
    .upload(imagePath, arrayBuffer, { contentType: 'image/jpeg' });

  if (uploadError) {
    throw new Error(`capture upload failed: ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabase
    .from('captures')
    .insert({
      user_id: userId,
      reference_id: options.referenceId,
      match_score: Math.round(options.matchScore),
      image_path: imagePath,
    })
    .select('id, image_path')
    .single();

  if (insertError) {
    await supabase.storage.from('captures').remove([imagePath]);
    throw new Error(`capture row insert failed: ${insertError.message}`);
  }

  return { id: data.id as string, imagePath: data.image_path as string };
}

/** Undo a cloud save (used when the user taps Retake). */
export async function deleteCloudCapture(capture: CloudCaptureResult): Promise<void> {
  await supabase.storage.from('captures').remove([capture.imagePath]);
  await supabase.from('captures').delete().eq('id', capture.id);
}

/** Delete a library/home capture (storage object + row). */
export async function deleteCapture(capture: {
  id: string;
  image_path: string | null;
}): Promise<void> {
  if (capture.image_path) {
    await supabase.storage.from('captures').remove([capture.image_path]);
  }
  const { error } = await supabase.from('captures').delete().eq('id', capture.id);
  if (error) {
    throw new Error(`capture delete failed: ${error.message}`);
  }
}
