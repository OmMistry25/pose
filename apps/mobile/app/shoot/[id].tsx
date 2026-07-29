import { useIsFocused } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type CameraPosition, useCameraDevice } from 'react-native-vision-camera';

import { CameraView, type CapturedPhoto } from '../../src/camera/CameraView';
import { useCameraPermissions } from '../../src/camera/useCameraPermissions';
import { supabase } from '../../src/supabase/client';
import { useReference } from '../../src/supabase/queries';
import { fonts } from '../../src/theme/tokens';
import { AppButton } from '../../src/ui/AppButton';
import { CloseIcon } from '../../src/ui/Icons';

function useAppIsActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      setActive(state === 'active');
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return active;
}

export default function ShootScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: reference, isLoading } = useReference(id);
  const { granted, request } = useCameraPermissions();
  const [facing, setFacing] = useState<CameraPosition>('back');
  const device = useCameraDevice(facing);
  const isFocused = useIsFocused();
  const appIsActive = useAppIsActive();
  const isActive = isFocused && appIsActive;

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!reference?.image_path) return;
    let alive = true;
    supabase.storage
      .from('reference-images')
      .createSignedUrl(reference.image_path, 3600)
      .then(({ data }) => {
        if (alive) setThumbnailUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [reference?.image_path]);

  const handleCaptured = useCallback(
    (photo: CapturedPhoto) => {
      if (!id) return;
      router.push({
        pathname: '/shoot/review',
        params: {
          uri: encodeURIComponent(photo.uri),
          score: String(photo.score),
          referenceId: id,
          referenceUrl: encodeURIComponent(thumbnailUrl ?? ''),
        },
      });
    },
    [id, router, thumbnailUrl],
  );

  const flip = () => setFacing((current) => (current === 'back' ? 'front' : 'back'));

  if (isLoading || !reference) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Shoot', headerShown: false }} />
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!granted) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Shoot', headerShown: false }} />
        <Text style={styles.message}>Camera access is needed to match poses.</Text>
        <AppButton title="Grant access" onPress={request} style={{ minWidth: 180 }} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Shoot', headerShown: false }} />
        <Text style={styles.message}>No {facing} camera found on this device.</Text>
      </View>
    );
  }

  const top = insets.top + 12;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Shoot', headerShown: false }} />
      <CameraView
        device={device}
        isActive={isActive}
        targetKeypoints={reference.keypoints}
        targetBbox={reference.bounding_box}
        targetImageUrl={thumbnailUrl}
        onCaptured={handleCaptured}
      />

      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { bottom: insets.bottom + 36 + 19 }]}
        accessibilityLabel="Close camera"
      >
        <CloseIcon color="#fff" size={18} />
      </Pressable>

      <View style={[styles.rightChrome, { top }]}>
        {thumbnailUrl ? (
          <Pressable onPress={() => setPreviewOpen(true)}>
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          </Pressable>
        ) : (
          <View style={[styles.thumbnail, styles.thumbPlaceholder]} />
        )}
        <Pressable onPress={flip} style={styles.flipBtn}>
          <Text style={styles.flipText}>Flip</Text>
        </Pressable>
      </View>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewOpen(false)}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
          <Text style={styles.previewHint}>Tap to close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 24,
    gap: 16,
  },
  message: {
    fontFamily: fonts.sansBold,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 24,
    zIndex: 50,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightChrome: {
    position: 'absolute',
    right: 16,
    zIndex: 40,
    alignItems: 'center',
    gap: 8,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  flipBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  flipText: {
    fontFamily: fonts.sansBold,
    color: '#fff',
    fontSize: 14,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewImage: {
    width: '100%',
    height: '75%',
    borderRadius: 12,
  },
  previewHint: {
    fontFamily: fonts.sansBold,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
    fontSize: 15,
  },
});
