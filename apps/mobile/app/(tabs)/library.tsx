import type { Capture } from '@pose-match/shared-types';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureCard } from '../../src/components/CaptureCard';
import { PhotoEnlargedModal } from '../../src/components/PhotoEnlargedModal';
import { useCaptures } from '../../src/supabase/queries';
import { colors, fonts } from '../../src/theme/tokens';

export default function LibraryTab() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: captures, isLoading } = useCaptures();
  const [enlarged, setEnlarged] = useState<Capture | null>(null);

  const gap = 10;
  const pad = 24;
  const tileW = (width - pad * 2 - gap) / 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>Library</Text>
      <Text style={styles.sub}>
        {(captures?.length ?? 0)} captured poses — tap to enlarge
      </Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.ink} />
      ) : (
        <FlatList
          data={captures ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved shots yet</Text>
              <Text style={styles.emptyBody}>
                Capture a pose and tap Save — it will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CaptureCard
              capture={item}
              width={tileW}
              imageHeight={150}
              onPress={() => setEnlarged(item)}
            />
          )}
        />
      )}

      <PhotoEnlargedModal capture={enlarged} onClose={() => setEnlarged(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    paddingHorizontal: 24,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkLight,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 14,
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
    paddingTop: 64,
    alignItems: 'center',
    paddingHorizontal: 16,
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
});
