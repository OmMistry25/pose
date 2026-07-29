import { describe, expect, it } from 'vitest';

import { combineMatchScore, framingMatchScore } from './matchScore';

describe('matchScore', () => {
  it('only lightly pulls a high pose score when the person is off to the side', () => {
    const framing = framingMatchScore({
      dx: 0.25,
      dy: 0,
      dScale: 1,
      iou: 0,
    });
    expect(framing).toBeLessThan(50);
    expect(framing).toBeGreaterThan(0);
    const combined = combineMatchScore(95, framing);
    // Pose-dominant (85/15): should stay high even with mediocre framing.
    expect(combined).toBeGreaterThan(80);
    expect(combined).toBeLessThan(95);
  });

  it('keeps a high score when framing is roughly centered', () => {
    const framing = framingMatchScore({
      dx: 0.01,
      dy: 0.01,
      dScale: 1.02,
      iou: 0,
    });
    expect(framing).toBeGreaterThan(85);
    const combined = combineMatchScore(92, framing);
    expect(combined).toBeGreaterThan(85);
  });

  it('stays high when the person is a bit farther (smaller scale)', () => {
    const framing = framingMatchScore({
      dx: 0.02,
      dy: 0.02,
      dScale: 0.55,
      iou: 0,
    });
    expect(framing).toBeGreaterThan(40);
    const combined = combineMatchScore(90, framing);
    expect(combined).toBeGreaterThan(75);
  });
});
