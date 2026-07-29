import type { Capture } from '@pose-match/shared-types';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../supabase/client';
import { colors, fonts } from '../theme/tokens';
import { formatShortDate } from '../ui/format';

type Props = {
  capture: Capture;
  width: number;
  imageHeight?: number;
  onPress: () => void;
};

export function CaptureCard({ capture, width, imageHeight = 150, onPress }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!capture.image_path) return;
    let alive = true;
    supabase.storage
      .from('captures')
      .createSignedUrl(capture.image_path, 3600)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [capture.image_path]);

  return (
    <Pressable onPress={onPress} style={[styles.card, { width }]}>
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, { height: imageHeight }]} />
      ) : (
        <View style={[styles.image, styles.placeholder, { height: imageHeight }]} />
      )}
      {capture.match_score != null ? (
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{Math.round(capture.match_score)}%</Text>
        </View>
      ) : null}
      <View style={styles.meta}>
        <Text style={styles.date}>{formatShortDate(capture.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.card2,
  },
  image: {
    width: '100%',
  },
  placeholder: {
    backgroundColor: colors.card,
  },
  scorePill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.ink,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  scoreText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.bg,
  },
  meta: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkLight,
  },
});
