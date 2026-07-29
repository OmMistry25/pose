import type { Capture } from '@pose-match/shared-types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureCard } from '../../src/components/CaptureCard';
import { PhotoEnlargedModal } from '../../src/components/PhotoEnlargedModal';
import { TrendingPoseCard } from '../../src/components/TrendingPoseCard';
import { useAuthStore } from '../../src/state/authStore';
import { signedAvatarUrl } from '../../src/supabase/profile';
import { useCaptures } from '../../src/supabase/queries';
import { pickAndUploadReference } from '../../src/supabase/uploadReference';
import { colors, fonts } from '../../src/theme/tokens';
import { displayNameFromUser, greetingForNow } from '../../src/ui/format';

const TRENDING_ASSET = require('../../assets/trending-filler.png');

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { data: captures } = useCaptures();
  const recent = (captures ?? []).slice(0, 4);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState<Capture | null>(null);
  const [uploading, setUploading] = useState(false);

  const gap = 10;
  const pad = 24;
  const tileW = (width - pad * 2 - gap) / 2;
  const name = displayNameFromUser(user);
  const avatarPath =
    typeof user?.user_metadata?.avatar_path === 'string'
      ? user.user_metadata.avatar_path
      : null;

  useEffect(() => {
    let alive = true;
    signedAvatarUrl(avatarPath).then((url) => {
      if (alive) setAvatarUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  const handleNewPose = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      await pickAndUploadReference();
    } catch (e) {
      console.log('home new pose upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greetingForNow()}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.avatarBtn}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TrendingPoseCard imageSource={TRENDING_ASSET} />
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Captures</Text>
              <Pressable onPress={() => void handleNewPose()} disabled={uploading}>
                <Text style={styles.link}>{uploading ? 'Uploading…' : 'New pose →'}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No captures yet</Text>
            <Text style={styles.emptyBody}>Load a reference and shoot your first pose.</Text>
            <Pressable onPress={() => router.push('/(tabs)/references')} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>Browse references</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <CaptureCard
            capture={item}
            width={tileW}
            imageHeight={170}
            onPress={() => setEnlarged(item)}
          />
        )}
      />

      <PhotoEnlargedModal capture={enlarged} onClose={() => setEnlarged(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warm,
    marginBottom: 4,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
    lineHeight: 38,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    fontSize: 16,
  },
  listHeader: {
    marginHorizontal: -24,
  },
  sectionHead: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warm,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
    flexGrow: 1,
  },
  row: {
    gap: 10,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkLight,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.bg,
    fontSize: 14,
  },
});
