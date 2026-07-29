import type { Capture, Reference } from '@pose-match/shared-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo } from 'react';

import { supabase } from './client';

export const referencesQueryKey = ['references'] as const;
export const capturesQueryKey = ['captures'] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Ready reference with the most captures in the last 7 days; else newest ready. */
export function selectTrendingReference(
  references: Reference[] | undefined,
  captures: Capture[] | undefined,
): Reference | null {
  if (!references?.length) return null;
  const ready = references.filter((r) => r.status === 'ready');
  if (ready.length === 0) return null;

  const weekAgo = Date.now() - WEEK_MS;
  const counts = new Map<string, number>();
  for (const c of captures ?? []) {
    if (!c.reference_id) continue;
    if (new Date(c.created_at).getTime() < weekAgo) continue;
    counts.set(c.reference_id, (counts.get(c.reference_id) ?? 0) + 1);
  }

  let best: Reference | null = null;
  let bestCount = 0;
  for (const ref of ready) {
    const n = counts.get(ref.id) ?? 0;
    if (n > bestCount) {
      bestCount = n;
      best = ref;
    }
  }
  if (best && bestCount > 0) return best;

  return (
    [...ready].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

export function useTrendingReference() {
  const refs = useReferences();
  const caps = useCaptures();
  const data = useMemo(
    () => selectTrendingReference(refs.data, caps.data),
    [refs.data, caps.data],
  );
  return {
    data,
    isLoading: refs.isLoading || caps.isLoading,
    error: refs.error ?? caps.error,
  };
}

export function useReferences() {
  const queryClient = useQueryClient();
  const channelId = useId();

  useEffect(() => {
    // Unique name: Home/Library-style remounts must not re-bind the same channel.
    const channel = supabase
      .channel(`references-changes:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'references' },
        () => {
          queryClient.invalidateQueries({ queryKey: referencesQueryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, channelId]);

  return useQuery({
    queryKey: referencesQueryKey,
    queryFn: async (): Promise<Reference[]> => {
      const { data, error } = await supabase
        .from('references')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Reference[];
    },
  });
}

export function useReference(id: string) {
  return useQuery({
    queryKey: ['reference', id] as const,
    queryFn: async (): Promise<Reference> => {
      const { data, error } = await supabase
        .from('references')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Reference;
    },
  });
}

export function useCaptures() {
  const queryClient = useQueryClient();
  const channelId = useId();

  useEffect(() => {
    // Home + Library both call this hook; shared channel names break after subscribe().
    const channel = supabase
      .channel(`captures-changes:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'captures' },
        () => {
          queryClient.invalidateQueries({ queryKey: capturesQueryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, channelId]);

  return useQuery({
    queryKey: capturesQueryKey,
    queryFn: async (): Promise<Capture[]> => {
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Capture[];
    },
  });
}
