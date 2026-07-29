import { requireNativeModule } from 'expo-modules-core';
import {
  compareFraming,
  comparePoses,
  swapLeftRightLandmarks,
} from '@pose-match/pose-math';
import type { BoundingBox, PoseLandmarks } from '@pose-match/shared-types';
import type { CameraDevice, CameraPosition } from 'react-native-vision-camera';
import { Camera, runAtTargetFps, useFrameProcessor } from 'react-native-vision-camera';
import { StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';

import { toFileUri } from '../capture/saveCapture';
import { combineMatchScore, framingMatchScore } from '../guidance/matchScore';
import { detectPoseInFrame } from '../ml/poseFrameProcessor';
import type { FrameMeta } from '../overlay/mapCoords';
import { GuidanceBar } from '../overlay/GuidanceBar';
import { MatchIndicator } from '../overlay/MatchIndicator';
import { ShutterButton } from '../overlay/ShutterButton';
import { landmarksBBox } from '../overlay/projectPose';
import { SkeletonOverlay } from '../overlay/SkeletonOverlay';
import { TargetGuideOverlay } from '../overlay/TargetGuideOverlay';
import {
  liveBboxSV,
  liveFrameMetaSV,
  liveKeypointCountSV,
  liveKeypointsSV,
  matchScoreSV,
} from '../state/frameState';
import { fonts } from '../theme/tokens';

export type CapturedPhoto = {
  uri: string;
  score: number;
};

type CameraViewProps = {
  device: CameraDevice;
  isActive: boolean;
  targetKeypoints?: PoseLandmarks | null;
  targetBbox?: BoundingBox | null;
  targetImageUrl?: string | null;
  /** Called after a manual photo is taken. */
  onCaptured?: (photo: CapturedPhoto) => void;
};

type DetectionPayload = {
  landmarks: PoseLandmarks | null;
  meta: FrameMeta;
};

const PoseDetector = requireNativeModule('PoseDetector');
/** Smooth score so the badge doesn't flicker every frame. */
const SCORE_SMOOTH = 0.35;

function KeypointDebugOverlay({
  modelReady,
  keypointCount,
  score,
}: {
  modelReady: boolean;
  keypointCount: number;
  score: number;
}) {
  let label = 'starting…';
  if (!modelReady) {
    label = 'Keypoints: model missing — rebuild app';
  } else if (keypointCount > 0) {
    label = `Keypoints: ${keypointCount} · score ${score}`;
  } else {
    label = 'Keypoints: — (step into frame)';
  }

  return (
    <View style={styles.debugWrap} pointerEvents="none">
      <Text style={styles.debugText}>{label}</Text>
    </View>
  );
}

export function CameraView({
  device,
  isActive,
  targetKeypoints = null,
  targetBbox = null,
  targetImageUrl = null,
  onCaptured,
}: CameraViewProps) {
  const cameraRef = useRef<Camera>(null);
  const [modelReady, setModelReady] = useState(false);
  const [keypointCount, setKeypointCount] = useState(0);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const facingFrontSV = useSharedValue(device.position === 'front');
  const smoothedScore = useRef(0);
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;

  const resolvedTargetBbox = useMemo(() => {
    if (targetBbox) return targetBbox;
    if (targetKeypoints) return landmarksBBox(targetKeypoints);
    return null;
  }, [targetBbox, targetKeypoints]);

  useEffect(() => {
    facingFrontSV.value = device.position === 'front';
  }, [device.position, facingFrontSV]);

  const onDetectionJS = useCallback(
    ({ landmarks, meta }: DetectionPayload) => {
      liveFrameMetaSV.value = meta;
      liveKeypointsSV.value = landmarks;
      const count = landmarks?.length ?? 0;
      liveKeypointCountSV.value = count;
      setKeypointCount(count);
      liveBboxSV.value = landmarks ? landmarksBBox(landmarks) : null;

      if (landmarks && targetKeypoints && landmarks.length === 33 && targetKeypoints.length === 33) {
        try {
          // Front cam guide is mirrored; swap L/R on live so scoring matches what the user copies.
          const liveForScore =
            meta.facingFront && !meta.isMirrored
              ? swapLeftRightLandmarks(landmarks)
              : landmarks;
          const { score: poseScore } = comparePoses(targetKeypoints, liveForScore);
          const targetBox = landmarksBBox(targetKeypoints);
          const liveBox = landmarksBBox(liveForScore);
          const framingScore =
            targetBox && liveBox
              ? framingMatchScore(compareFraming(targetBox, liveBox))
              : 0;
          const combined = combineMatchScore(poseScore, framingScore);
          const blended =
            smoothedScore.current === 0
              ? combined
              : smoothedScore.current * (1 - SCORE_SMOOTH) + combined * SCORE_SMOOTH;
          smoothedScore.current = blended;
          const rounded = Math.round(blended);
          matchScoreSV.value = rounded;
          setScore(rounded);
        } catch {
          matchScoreSV.value = 0;
          setScore(0);
          smoothedScore.current = 0;
        }
      } else {
        matchScoreSV.value = 0;
        setScore(0);
        smoothedScore.current = 0;
      }
    },
    [targetKeypoints],
  );

  const onDetection = useMemo(
    () => Worklets.createRunOnJS(onDetectionJS),
    [onDetectionJS],
  );

  useEffect(() => {
    try {
      setModelReady(Boolean(PoseDetector.isReady()));
    } catch {
      setModelReady(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      liveKeypointsSV.value = null;
      liveKeypointCountSV.value = 0;
      liveFrameMetaSV.value = null;
      liveBboxSV.value = null;
      matchScoreSV.value = 0;
      setKeypointCount(0);
      setScore(0);
      smoothedScore.current = 0;
    }
  }, [isActive]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });
      const uri = toFileUri(photo.path);
      const capturedScore = Math.round(matchScoreSV.value);
      console.log('photo captured:', uri, 'score:', capturedScore);
      onCapturedRef.current?.({ uri, score: capturedScore });
    } catch (error) {
      console.log('takePhoto failed:', error);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const facingFront = device.position === 'front';

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      runAtTargetFps(10, () => {
        'worklet';
        onDetection({
          landmarks: detectPoseInFrame(frame),
          meta: {
            width: frame.width,
            height: frame.height,
            orientation: String(frame.orientation),
            facingFront,
            isMirrored: Boolean(frame.isMirrored),
          },
        });
      });
    },
    [onDetection, facingFront],
  );

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo
        pixelFormat="rgb"
        resizeMode="cover"
        frameProcessor={frameProcessor}
      />
      <SkeletonOverlay
        liveKeypoints={liveKeypointsSV}
        frameMeta={liveFrameMetaSV}
        facingFront={facingFrontSV}
      />
      <TargetGuideOverlay
        imageUrl={targetImageUrl}
        keypoints={targetKeypoints}
        facingFront={facingFrontSV}
      />
      <GuidanceBar
        targetKeypoints={targetKeypoints}
        targetBbox={resolvedTargetBbox}
        facingFront={facingFront}
      />
      <MatchIndicator />
      <KeypointDebugOverlay modelReady={modelReady} keypointCount={keypointCount} score={score} />
      <ShutterButton onPress={() => void takePhoto()} disabled={busy} />
    </View>
  );
}

export type { CameraPosition };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugWrap: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 30,
  },
  debugText: {
    fontFamily: fonts.sansBold,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
