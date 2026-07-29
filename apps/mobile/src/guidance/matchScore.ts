import type { FramingDiff } from '@pose-match/pose-math';

/**
 * How well the live person matches the reference place/size (0–100).
 * Uses center offset + scale only — not IoU. Scale tolerance is wide so
 * standing a bit farther from the camera still scores well.
 */
export function framingMatchScore(diff: FramingDiff): number {
  const shift = Math.hypot(diff.dx, diff.dy);
  // ~0.08 off → mild; ~0.35 off → major.
  const shiftScore = 100 * (1 - Math.min(1, shift / 0.4));
  const scaleOff = Math.abs(Math.log(Math.max(diff.dScale, 0.01)));
  // Wider than before: half/double size still keeps meaningful score.
  const scaleScore = 100 * (1 - Math.min(1, scaleOff / 1.1));
  const score = Math.min(shiftScore, scaleScore);
  return Number.isFinite(score) ? Math.max(0, score) : 100;
}

/**
 * Pose-dominant blend. Framing is a light nudge so distance doesn't crush
 * a real pose match.
 */
export function combineMatchScore(poseScore: number, framingScore: number): number {
  if (!Number.isFinite(poseScore)) return 0;
  if (!Number.isFinite(framingScore)) return poseScore;
  return 0.85 * poseScore + 0.15 * framingScore;
}
