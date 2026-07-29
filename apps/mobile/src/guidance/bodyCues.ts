import { getHeadRoll, getJointAngles, normalize, type JointName } from '@pose-match/pose-math';
import type { PoseLandmarks } from '@pose-match/shared-types';

export type BodyCue = {
  /** Stable id per body target — used to trigger a haptic only when it changes. */
  id: string;
  text: string;
  /** 0..1+, higher = more off. Used to pick the single most important cue. */
  severity: number;
};

type Action = 'bend' | 'straighten' | 'raise' | 'lower';
type JointSpec = {
  part: 'arm' | 'leg';
  side: 'left' | 'right';
  targetLarger: Action;
  targetSmaller: Action;
  /** Arms matter more than hips for matching aesthetic poses. */
  weight: number;
};

const JOINT_SPECS: Record<JointName, JointSpec> = {
  left_elbow: { part: 'arm', side: 'left', targetLarger: 'straighten', targetSmaller: 'bend', weight: 1.15 },
  right_elbow: { part: 'arm', side: 'right', targetLarger: 'straighten', targetSmaller: 'bend', weight: 1.15 },
  left_knee: { part: 'leg', side: 'left', targetLarger: 'straighten', targetSmaller: 'bend', weight: 1.0 },
  right_knee: { part: 'leg', side: 'right', targetLarger: 'straighten', targetSmaller: 'bend', weight: 1.0 },
  left_shoulder: { part: 'arm', side: 'left', targetLarger: 'raise', targetSmaller: 'lower', weight: 1.2 },
  right_shoulder: { part: 'arm', side: 'right', targetLarger: 'raise', targetSmaller: 'lower', weight: 1.2 },
  left_hip: { part: 'leg', side: 'left', targetLarger: 'lower', targetSmaller: 'raise', weight: 0.85 },
  right_hip: { part: 'leg', side: 'right', targetLarger: 'lower', targetSmaller: 'raise', weight: 0.85 },
};

const MIN_JOINT_DEG = 22;
const MIN_HEAD_DEG = 16;
const JOINT_FULL_SCALE_DEG = 55;
const HEAD_FULL_SCALE_DEG = 28;
const HEAD_SEVERITY_SCALE = 0.5;
const MIN_SHOW_SEVERITY = 0.38;
const MIN_JOINT_VISIBILITY = 0.45;

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function wrapDegrees(deg: number): number {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Landmark indices used to check a joint is actually visible. */
const JOINT_VISIBILITY_IDX: Record<JointName, [number, number, number]> = {
  left_elbow: [11, 13, 15],
  right_elbow: [12, 14, 16],
  left_shoulder: [11, 13, 23],
  right_shoulder: [12, 14, 24],
  left_hip: [23, 25, 11],
  right_hip: [24, 26, 12],
  left_knee: [23, 25, 27],
  right_knee: [24, 26, 28],
};

function jointVisible(landmarks: PoseLandmarks, joint: JointName): boolean {
  const idxs = JOINT_VISIBILITY_IDX[joint];
  return idxs.every((i) => (landmarks[i]?.visibility ?? 0) >= MIN_JOINT_VISIBILITY);
}

type BuildOptions = {
  /** True when the preview is horizontally mirrored (selfie view) — affects head tilt wording. */
  mirrored?: boolean;
  /** Kept for callers; L/R cue words are always anatomical (no back-cam flip). */
  facingFront?: boolean;
};

/**
 * Directional corrections for arms, legs, and head tilt, sorted worst-first.
 * Left/right words are always anatomical (poser’s left = “left”), for both
 * front (selfie) and back (photographer) cameras.
 */
export function buildBodyCues(
  target: PoseLandmarks | null,
  live: PoseLandmarks | null,
  options: BuildOptions = {},
): BodyCue[] {
  if (!target || !live || target.length !== 33 || live.length !== 33) return [];

  const targetAngles = getJointAngles(normalize(target));
  const liveAngles = getJointAngles(normalize(live));
  const cues: BodyCue[] = [];

  for (const joint of Object.keys(JOINT_SPECS) as JointName[]) {
    if (!jointVisible(live, joint) || !jointVisible(target, joint)) continue;
    const diff = targetAngles[joint] - liveAngles[joint];
    if (Math.abs(diff) < MIN_JOINT_DEG) continue;
    const spec = JOINT_SPECS[joint];
    const action = diff > 0 ? spec.targetLarger : spec.targetSmaller;
    cues.push({
      id: joint,
      text: `${capitalize(action)} your ${spec.side} ${spec.part}`,
      severity: (Math.abs(diff) / JOINT_FULL_SCALE_DEG) * spec.weight,
    });
  }

  const targetRoll = getHeadRoll(target);
  const liveRoll = getHeadRoll(live);
  if (targetRoll != null && liveRoll != null) {
    const diff = wrapDegrees(targetRoll - liveRoll);
    if (Math.abs(diff) >= MIN_HEAD_DEG) {
      const tiltRight = options.mirrored ? diff < 0 : diff > 0;
      cues.push({
        id: 'head',
        text: `Tilt your head ${tiltRight ? 'right' : 'left'}`,
        severity: (Math.abs(diff) / HEAD_FULL_SCALE_DEG) * HEAD_SEVERITY_SCALE,
      });
    }
  }

  return cues
    .filter((c) => c.severity >= MIN_SHOW_SEVERITY)
    .sort((a, b) => b.severity - a.severity);
}
