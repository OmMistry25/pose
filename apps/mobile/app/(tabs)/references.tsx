import type { Reference } from '@pose-match/shared-types';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReferenceCard } from '../../src/components/ReferenceCard';
import { useReferences } from '../../src/supabase/queries';
import { pickAndUploadReference } from '../../src/supabase/uploadReference';
import { colors, fonts } from '../../src/theme/tokens';
import { AppButton } from '../../src/ui/AppButton';
import { Chip } from '../../src/ui/Chip';
import { UploadIcon } from '../../src/ui/Icons';

type Filter = 'all' | 'ready' | 'processing';

const STUCK_PROCESSING_MS = 15 * 60 * 1000;

function isStuckProcessing(ref: Reference, now: number): boolean {
  if (ref.status !== 'processing') return false;
  const created = Date.parse(ref.created_at);
  if (Number.isNaN(created)) return true;
  return now - created > STUCK_PROCESSING_MS;
}

export default function ReferencesTab() {
  const insets = useSafeAreaInsets();
  const { data: references, isLoading } = useReferences();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState(false);
  const now = Date.now();

  const visible = useMemo(() => {
    const list = (references ?? []).filter((r) => !isStuckProcessing(r, now));
    if (filter === 'all') return list;
    if (filter === 'ready') return list.filter((r) => r.status === 'ready');
    return list.filter((r) => r.status === 'processing' || r.status === 'failed');
  }, [references, filter, now]);

  const counts = useMemo(() => {
    const list = (references ?? []).filter((r) => !isStuckProcessing(r, now));
    return {
      all: list.length,
      ready: list.filter((r) => r.status === 'ready').length,
      processing: list.filter((r) => r.status === 'processing' || r.status === 'failed').length,
    };
  }, [references, now]);

  const handleAddReference = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const row = await pickAndUploadReference();
      if (row) {
        console.log('reference row inserted:', row);
        setFilter('processing');
      }
    } catch (e) {
      console.log('reference upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>References</Text>

      <View style={styles.uploadWrap}>
        <AppButton
          title={uploading ? 'Uploading…' : 'Load New Reference'}
          disabled={uploading}
          onPress={() => void handleAddReference()}
        >
          {uploading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <>
              <UploadIcon color={colors.bg} />
              <Text style={styles.uploadLabel}>Load New Reference</Text>
            </>
          )}
        </AppButton>
      </View>

      <View style={styles.chips}>
        <Chip label="All" count={counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label="Ready"
          count={counts.ready}
          active={filter === 'ready'}
          dotColor={colors.readyDot}
          onPress={() => setFilter('ready')}
        />
        <Chip
          label="Processing"
          count={counts.processing}
          active={filter === 'processing'}
          dotColor={colors.processingDot}
          onPress={() => setFilter('processing')}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.ink} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No {filter === 'all' ? '' : filter + ' '}references</Text>
          }
          renderItem={({ item }) => <ReferenceCard reference={item} />}
        />
      )}
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
    marginBottom: 14,
  },
  uploadWrap: {
    paddingHorizontal: 24,
  },
  uploadLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.bg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkLight,
    textAlign: 'center',
    paddingTop: 24,
  },
});
