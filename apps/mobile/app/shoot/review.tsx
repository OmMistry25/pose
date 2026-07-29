import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  deleteCloudCapture,
  saveCaptureToLibrary,
  syncCaptureToCloud,
  type CloudCaptureResult,
} from '../../src/capture/saveCapture';
import { capturesQueryKey } from '../../src/supabase/queries';

/**
 * After a shot: your photo above the reference.
 * Save = keep it (Photos + cloud) → library. Retake = back to camera.
 */
export default function CaptureReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    uri: string;
    score: string;
    referenceId: string;
    referenceUrl?: string;
  }>();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uri = params.uri ? decodeURIComponent(params.uri) : '';
  const referenceId = params.referenceId;
  const score = Number(params.score ?? 0);
  const referenceUrl = params.referenceUrl
    ? decodeURIComponent(params.referenceUrl)
    : null;

  const handleSave = async () => {
    if (!uri || !referenceId || busy) return;
    setBusy(true);
    setError(null);
    let cloud: CloudCaptureResult | null = null;
    try {
      await saveCaptureToLibrary(uri);
      cloud = await syncCaptureToCloud({
        uri,
        referenceId,
        matchScore: score,
      });
      console.log('capture saved', { score, cloud });
      await queryClient.invalidateQueries({ queryKey: capturesQueryKey });
      // Exit shoot/review so the camera can't auto-capture again.
      if (typeof router.dismissTo === 'function') {
        router.dismissTo('/(tabs)/library');
      } else {
        router.replace('/(tabs)/library');
      }
    } catch (e) {
      if (cloud) {
        try {
          await deleteCloudCapture(cloud);
        } catch {
          // ignore cleanup failure
        }
      }
      const message = e instanceof Error ? e.message : 'Save failed';
      console.log('capture save failed:', message);
      setError(message);
      setBusy(false);
    }
  };

  const handleRetake = () => {
    if (busy) return;
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Review', presentation: 'modal' }} />
      <Text style={styles.title}>Nice shot</Text>
      <Text style={styles.score}>Match {Math.round(score)}</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Yours</Text>
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}

        <Text style={[styles.label, styles.labelSpaced]}>Reference</Text>
        {referenceUrl ? (
          <Image source={{ uri: referenceUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={handleRetake}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => void handleSave()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  score: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 0,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  placeholder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  error: {
    color: '#f87171',
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#fff',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
