import type { Reference } from '@pose-match/shared-types';
import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../state/authStore';
import { supabase } from './client';

/** Convert a local image URI to JPEG bytes for storage upload. */
export async function jpegArrayBufferFromUri(uri: string): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.renderAsync();
  const { uri: jpegUri } = await rendered.saveAsync({ format: SaveFormat.JPEG });
  context.release();
  rendered.release();
  return fetch(jpegUri).then((r) => r.arrayBuffer());
}

/**
 * Upload a local image as a new reference and insert the DB row.
 * Returns the inserted reference, or null if cancelled / not signed in.
 */
export async function uploadReferenceFromUri(uri: string): Promise<Reference | null> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    console.log('cannot upload: not signed in');
    return null;
  }

  const arrayBuffer = await jpegArrayBufferFromUri(uri);
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('reference-images')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

  if (uploadError) {
    throw new Error(`reference upload failed: ${uploadError.message}`);
  }

  const { data: row, error: insertError } = await supabase
    .from('references')
    .insert({ user_id: userId, image_path: path })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from('reference-images').remove([path]);
    throw new Error(`reference row insert failed: ${insertError.message}`);
  }

  return row as Reference;
}

/** Open the photo library and upload the selected image as a reference. */
export async function pickAndUploadReference(): Promise<Reference | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
  });
  if (result.canceled) return null;
  return uploadReferenceFromUri(result.assets[0].uri);
}

const TRENDING_FILLER_FILENAME = 'trending-filler.jpg';

/**
 * Ensure the bundled trending pose exists as a reference for this user
 * (fixed storage path), then return its row id.
 */
export async function ensureTrendingFillerReference(
  localUri: string,
): Promise<string> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    throw new Error('Not signed in');
  }

  const path = `${userId}/${TRENDING_FILLER_FILENAME}`;

  const { data: existing } = await supabase
    .from('references')
    .select('id')
    .eq('image_path', path)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const arrayBuffer = await jpegArrayBufferFromUri(localUri);

  const { error: uploadError } = await supabase.storage
    .from('reference-images')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    throw new Error(`trending upload failed: ${uploadError.message}`);
  }

  const { data: row, error: insertError } = await supabase
    .from('references')
    .insert({ user_id: userId, image_path: path })
    .select('id')
    .single();

  if (insertError) {
    const { data: again } = await supabase
      .from('references')
      .select('id')
      .eq('image_path', path)
      .maybeSingle();
    if (again?.id) return again.id as string;
    throw new Error(`trending row insert failed: ${insertError.message}`);
  }

  return row.id as string;
}
