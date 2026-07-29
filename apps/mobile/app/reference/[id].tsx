import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { deleteReference } from '../../src/supabase/references';
import { supabase } from '../../src/supabase/client';
import { useReference } from '../../src/supabase/queries';
import { colors, fonts } from '../../src/theme/tokens';
import { formatShortDate } from '../../src/ui/format';
import { CamIcon } from '../../src/ui/Icons';

export default function ReferenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: reference, isLoading } = useReference(id);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(0.75);
  const [boxWidth, setBoxWidth] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const imagePath = reference?.image_path;

  useEffect(() => {
    if (!imagePath) return;
    let active = true;
    supabase.storage
      .from('reference-images')
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        setSignedUrl(data.signedUrl);
        Image.getSize(data.signedUrl, (w, h) => {
          if (active && h > 0) setAspectRatio(w / h);
        });
      });
    return () => {
      active = false;
    };
  }, [imagePath]);

  const confirmDelete = () => {
    if (!reference || deleting) return;
    Alert.alert('Delete reference?', 'This removes the photo from Pose Match.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            try {
              await deleteReference(reference);
              router.replace('/(tabs)/references');
            } catch (e) {
              console.log('delete reference failed:', e);
              setDeleting(false);
              Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again.');
            }
          })();
        },
      },
    ]);
  };

  if (isLoading || !reference) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'Reference',
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.ink,
            headerShadowVisible: false,
          }}
        />
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (reference.status !== 'ready') {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'Reference',
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.ink,
            headerShadowVisible: false,
          }}
        />
        <ActivityIndicator color={colors.ink} />
        <Text style={styles.status}>{reference.status}</Text>
        <Text style={styles.dateHint}>Added {formatShortDate(reference.created_at)}</Text>
        <Pressable style={styles.deleteGhost} onPress={confirmDelete} disabled={deleting}>
          <Text style={styles.deleteGhostText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
        </Pressable>
      </View>
    );
  }

  const boxHeight = boxWidth > 0 ? boxWidth / aspectRatio : 0;
  const keypoints = reference.keypoints ?? [];
  const onLayout = (e: LayoutChangeEvent) => setBoxWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Reference',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Text style={styles.dateLine}>Added {formatShortDate(reference.created_at)}</Text>
        <View style={styles.imageWrap} onLayout={onLayout}>
          {signedUrl && boxWidth > 0 ? (
            <Image
              source={{ uri: signedUrl }}
              style={{ width: boxWidth, height: boxHeight }}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { aspectRatio }]} />
          )}
          {boxWidth > 0
            ? keypoints
                .filter((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
                .map((point, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        left: point.x * boxWidth - 4,
                        top: point.y * boxHeight - 4,
                      },
                    ]}
                  />
                ))
            : null}
        </View>
        <Text style={styles.blurb}>
          Position yourself in frame and recreate this pose. The app scores your alignment live and
          captures when you nail it.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
          <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
        </Pressable>
        <Link href={`/shoot/${reference.id}`} asChild>
          <Pressable style={styles.shootButton}>
            <CamIcon color={colors.bg} size={18} />
            <Text style={styles.shootButtonText}>Open Camera</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 8,
    padding: 24,
  },
  scroll: {
    paddingBottom: 12,
  },
  dateLine: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkLight,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.card2,
    marginHorizontal: 0,
    borderRadius: 0,
  },
  imagePlaceholder: {
    width: '100%',
    backgroundColor: colors.card,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.readyDot,
  },
  blurb: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkLight,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  status: {
    fontFamily: fonts.sansMedium,
    color: colors.inkMid,
    textTransform: 'capitalize',
  },
  dateHint: {
    fontFamily: fonts.sans,
    color: colors.inkLight,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  shootButton: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  shootButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  deleteButton: {
    paddingHorizontal: 18,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  deleteButtonText: {
    color: colors.dangerText,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  deleteGhost: {
    marginTop: 16,
    padding: 12,
  },
  deleteGhostText: {
    color: colors.dangerText,
    fontFamily: fonts.sansSemiBold,
  },
});
