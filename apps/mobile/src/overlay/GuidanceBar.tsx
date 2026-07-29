import type { BoundingBox, PoseLandmarks } from '@pose-match/shared-types';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';

import { buildBodyCues, type BodyCue } from '../guidance/bodyCues';
import { createFatigueTracker } from '../guidance/cueFatigue';
import { framingHints, type FramingHint } from '../guidance/framingCues';
import { compareToGuide } from '../guidance/guideFraming';
import type { FrameMeta } from './mapCoords';
import { liveBboxSV, liveFrameMetaSV, liveKeypointsSV, matchScoreSV } from '../state/frameState';
import { guideTransformSV, type GuideTransform } from '../state/guideState';
import { fonts } from '../theme/tokens';

type GuidanceBarProps = {
  targetKeypoints: PoseLandmarks | null;
  targetBbox: BoundingBox | null;
  facingFront: boolean;
};

/** Sits at the top; leave room on the right for the reference thumbnail. */
const THUMB_GUTTER = 96;

/**
 * Top strip: body cue text + framing arrow side by side.
 * Hidden at score ≥ 85.
 */
export function GuidanceBar({
  targetKeypoints,
  targetBbox,
  facingFront,
}: GuidanceBarProps) {
  const insets = useSafeAreaInsets();
  const { width: viewW, height: viewH } = useWindowDimensions();
  const [bodyCue, setBodyCue] = useState<BodyCue | null>(null);
  const [frameHint, setFrameHint] = useState<FramingHint | null>(null);
  const [liveBbox, setLiveBbox] = useState<BoundingBox | null>(null);
  const [meta, setMeta] = useState<FrameMeta | null>(null);
  const [guide, setGuide] = useState<GuideTransform | null>(null);
  const [score, setScore] = useState(0);
  const [tick, setTick] = useState(0);

  const bodyFatigue = useRef(createFatigueTracker()).current;
  const frameFatigue = useRef(createFatigueTracker()).current;
  const previousBodyId = useRef<string | null>(null);

  useAnimatedReaction(
    () => liveBboxSV.value,
    (next) => runOnJS(setLiveBbox)(next),
    [],
  );
  useAnimatedReaction(
    () => liveFrameMetaSV.value,
    (next) => runOnJS(setMeta)(next),
    [],
  );
  useAnimatedReaction(
    () => guideTransformSV.value,
    (next) => runOnJS(setGuide)(next),
    [],
  );
  useAnimatedReaction(
    () => Math.round(matchScoreSV.value),
    (next) => runOnJS(setScore)(next),
    [],
  );

  useEffect(() => {
    setLiveBbox(liveBboxSV.value);
    setMeta(liveFrameMetaSV.value);
    setGuide(guideTransformSV.value);
    setScore(Math.round(matchScoreSV.value));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bodyFatigue.reset();
    frameFatigue.reset();
  }, [facingFront, bodyFatigue, frameFatigue]);

  const updateBody = useCallback(() => {
    if (matchScoreSV.value >= 85 || !targetKeypoints) {
      setBodyCue(null);
      return;
    }
    const facingFrontNow = Boolean(liveFrameMetaSV.value?.facingFront);
    const mirrored =
      facingFrontNow && !liveFrameMetaSV.value?.isMirrored;
    const cues = buildBodyCues(targetKeypoints, liveKeypointsSV.value, {
      mirrored,
      facingFront: facingFrontNow,
    });
    setBodyCue(bodyFatigue.pick(cues));
  }, [bodyFatigue, targetKeypoints]);

  useEffect(() => {
    updateBody();
    const interval = setInterval(updateBody, 500);
    return () => clearInterval(interval);
  }, [updateBody]);

  useEffect(() => {
    if (!bodyCue) {
      previousBodyId.current = null;
      return;
    }
    if (bodyCue.id !== previousBodyId.current) {
      previousBodyId.current = bodyCue.id;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [bodyCue]);

  const nextFrame = useMemo(() => {
    if (score >= 85 || !targetBbox || !liveBbox || !guide || !meta || viewW <= 0) {
      return null;
    }
    const diff = compareToGuide({
      liveBbox,
      targetBbox,
      guide,
      meta,
      viewW,
      viewH,
      facingFront,
    });
    const candidates = framingHints(diff, { facingFront, displaySpace: true });
    return frameFatigue.pick(candidates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBbox, liveBbox, guide, meta, facingFront, score, tick, frameFatigue, viewW, viewH]);

  useEffect(() => {
    setFrameHint(nextFrame);
  }, [nextFrame]);

  if (score >= 85) return null;
  if (!bodyCue && !frameHint) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 12, right: THUMB_GUTTER }]} pointerEvents="none">
      <View style={styles.bar}>
        {bodyCue ? <Text style={styles.body}>{bodyCue.text}</Text> : <View style={styles.bodySpacer} />}
        {frameHint ? (
          <View style={styles.arrowPill}>
            <Text style={styles.arrow}>{frameHint.symbol}</Text>
            <Text style={styles.arrowLabel}>{frameHint.label}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    zIndex: 30,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  body: {
    flex: 1,
    fontFamily: fonts.sansBold,
    color: '#fff',
    fontSize: 16,
  },
  bodySpacer: {
    flex: 1,
  },
  arrowPill: {
    alignItems: 'center',
    minWidth: 64,
    paddingLeft: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.25)',
  },
  arrow: {
    fontFamily: fonts.sansBold,
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
  },
  arrowLabel: {
    fontFamily: fonts.sansBold,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
