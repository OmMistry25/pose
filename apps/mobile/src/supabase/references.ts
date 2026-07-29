import type { Reference } from '@pose-match/shared-types';

import { supabase } from './client';

/** Delete a reference photo from Storage and remove its DB row. */
export async function deleteReference(reference: Reference): Promise<void> {
  const paths = [reference.image_path, reference.thumbnail_path].filter(
    (p): p is string => Boolean(p),
  );

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('reference-images')
      .remove(paths);
    if (storageError) {
      console.log('storage delete warning:', storageError.message);
    }
  }

  const { error } = await supabase.from('references').delete().eq('id', reference.id);
  if (error) {
    throw new Error(error.message);
  }
}
