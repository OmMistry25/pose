import type { Reference } from '@pose-match/shared-types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../supabase/client';
import { colors, fonts } from '../theme/tokens';
import { formatShortDate } from '../ui/format';
import { ChevRight } from '../ui/Icons';

type Props = {
  reference: Reference;
};

export function ReferenceCard({ reference }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isReady = reference.status === 'ready';
  const isFailed = reference.status === 'failed';
  const dimmed = !isReady;

  useEffect(() => {
    let active = true;
    supabase.storage
      .from('reference-images')
      .createSignedUrl(reference.image_path, 3600)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [reference.image_path]);

  const statusLabel = isReady ? 'Ready' : isFailed ? 'Failed' : 'Processing…';
  const statusStyles = isReady
    ? { bg: colors.readyBg, border: colors.readyBorder, text: colors.readyText, dot: colors.readyDot }
    : {
        bg: colors.processingBg,
        border: colors.border,
        text: colors.processingText,
        dot: colors.processingDot,
      };

  const body = (
    <View style={[styles.row, dimmed && styles.dimmed]}>
      <View style={styles.thumbWrap}>
        {signedUrl ? (
          <Image source={{ uri: signedUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.placeholder]} />
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.date}>Added {formatShortDate(reference.created_at)}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusStyles.bg, borderColor: statusStyles.border },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: statusStyles.dot }]} />
          <Text style={[styles.badgeText, { color: statusStyles.text }]}>{statusLabel}</Text>
        </View>
      </View>
      {isReady ? <ChevRight /> : null}
    </View>
  );

  return (
    <Link href={`/reference/${reference.id}`} asChild>
      <Pressable>{body}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimmed: {
    opacity: 0.6,
  },
  thumbWrap: {
    width: 56,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.card2,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.card2,
  },
  meta: {
    flex: 1,
    gap: 8,
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkLight,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
