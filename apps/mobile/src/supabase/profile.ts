import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../state/authStore';
import { supabase } from './client';

async function refreshAuthStore(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(data.session);
}

export async function updateDisplayName(name: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: name.trim() },
  });
  if (error) throw new Error(error.message);
  await refreshAuthStore();
}

export async function pickAndUploadAvatar(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('Not signed in');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled) return;

  const { uri } = result.assets[0];
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 512 });
  const rendered = await context.renderAsync();
  const { uri: jpegUri } = await rendered.saveAsync({ format: SaveFormat.JPEG });
  context.release();
  rendered.release();

  const arrayBuffer = await fetch(jpegUri).then((r) => r.arrayBuffer());
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const prev = useAuthStore.getState().user?.user_metadata?.avatar_path;
  const { error } = await supabase.auth.updateUser({
    data: { avatar_path: path },
  });
  if (error) throw new Error(error.message);

  if (typeof prev === 'string' && prev && prev !== path) {
    await supabase.storage.from('avatars').remove([prev]).catch(() => undefined);
  }

  await refreshAuthStore();
}

export async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
