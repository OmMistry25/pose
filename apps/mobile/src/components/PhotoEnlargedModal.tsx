import type { Capture } from '@pose-match/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteCapture, saveCaptureToLibrary } from '../capture/saveCapture';
import { supabase } from '../supabase/client';
import { capturesQueryKey } from '../supabase/queries';
import { colors, fonts } from '../theme/tokens';
import { formatShortDate } from '../ui/format';
import { CloseIcon, TickIcon } from '../ui/Icons';

type Props = {
  capture: Capture | null;
  onClose: () => void;
};

export function PhotoEnlargedModal({ capture, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(false);
    setError(null);
    if (!capture?.image_path) {
      setUrl(null);
      return;
    }
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
  }, [capture?.image_path]);

  const handleSave = async () => {
    if (!url || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveCaptureToLibrary(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      console.log('save to photos failed:', e);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!capture || deleting) return;
    Alert.alert('Delete capture?', 'This removes it from your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            setError(null);
            try {
              await deleteCapture(capture);
              await queryClient.invalidateQueries({ queryKey: capturesQueryKey });
              onClose();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Delete failed';
              console.log('delete capture failed:', e);
              setError(message);
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Modal visible={capture != null} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <CloseIcon color={colors.bg} />
          </Pressable>
          <View style={styles.headerCenter}>
            {capture ? (
              <Text style={styles.subtitle}>{formatShortDate(capture.created_at)}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => void handleSave()} style={[styles.iconBtn, saved && styles.iconBtnSaved]}>
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : saved ? (
              <TickIcon color={colors.bg} size={16} />
            ) : (
              <Text style={styles.saveGlyph}>↓</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.imageWrap}>
          {url ? (
            <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
          ) : (
            <ActivityIndicator color={colors.bg} />
          )}
          {capture?.match_score != null ? (
            <View style={styles.scoreChip}>
              <TickIcon color={colors.readyDot} size={13} />
              <Text style={styles.scoreText}>{Math.round(capture.match_score)}% match</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          style={[styles.deleteBtn, deleting && styles.deleteBtnBusy]}
        >
          {deleting ? (
            <ActivityIndicator color={colors.dangerText} />
          ) : (
            <Text style={styles.deleteText}>Delete</Text>
          )}
        </Pressable>

        {saved ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Saved to Photos</Text>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.toast, styles.toastError]}>
            <Text style={styles.toastText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e0b08',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(250,245,236,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(250,245,236,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSaved: {
    backgroundColor: colors.readyDot,
    borderColor: colors.readyDot,
  },
  saveGlyph: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  subtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.bg,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  image: {
    width: '100%',
    height: '85%',
    borderRadius: 12,
  },
  scoreChip: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.ink,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  scoreText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.bg,
  },
  deleteBtn: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  deleteBtnBusy: {
    opacity: 0.7,
  },
  deleteText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.dangerText,
  },
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: colors.readyDot,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxWidth: '86%',
  },
  toastError: {
    backgroundColor: colors.dangerText,
  },
  toastText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.bg,
    textAlign: 'center',
  },
});
