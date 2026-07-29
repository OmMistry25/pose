import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { ensureTrendingFillerReference } from '../supabase/uploadReference';
import { colors, fonts } from '../theme/tokens';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const RADIUS = 16;
const GLOW_PAD = 8;
const STROKE = 5.5;
/** Max height as a fraction of window height — keeps a tall portrait card. */
const MAX_HEIGHT_FRAC = 0.52;

type Props = {
  imageSource: ImageSourcePropType;
};

export function TrendingPoseCard({ imageSource }: Props) {
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const [busy, setBusy] = useState(false);

  const { imageW, imageH } = useMemo(() => {
    const resolved = Image.resolveAssetSource(imageSource as number);
    const aspect =
      resolved?.width && resolved?.height
        ? resolved.height / resolved.width
        : 981 / 736;
    const maxH = Math.round(winH * MAX_HEIGHT_FRAC);
    const maxW = winW - 48;
    let h = maxH;
    let w = Math.round(h / aspect);
    if (w > maxW) {
      w = maxW;
      h = Math.round(w * aspect);
    }
    return { imageW: w, imageH: h };
  }, [imageSource, winW, winH]);

  const svgW = imageW + GLOW_PAD * 2;
  const svgH = imageH + GLOW_PAD * 2;
  const perimeter = 2 * (imageW + imageH) * 0.92;
  const dash = perimeter * 0.28;

  const progress = useSharedValue(0);
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * perimeter,
    strokeOpacity: 0.45 + pulse.value * 0.55,
  }));

  const handleTryItOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const resolved = Image.resolveAssetSource(imageSource as number);
      const localUri = resolved?.uri;
      if (!localUri) {
        throw new Error('Could not resolve trending image');
      }
      const id = await ensureTrendingFillerReference(localUri);
      router.push(`/reference/${id}`);
    } catch (e) {
      console.log('trending try it out failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Trending this week</Text>
        <Text style={styles.arrow}>↗</Text>
      </View>

      <View style={[styles.frameOuter, { width: svgW, height: svgH }]}>
        <View
          style={[
            styles.shadowBox,
            {
              width: imageW,
              height: imageH,
              marginTop: GLOW_PAD,
              marginLeft: GLOW_PAD,
            },
          ]}
        >
          <View style={styles.imageClip}>
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          </View>
        </View>

        <Svg
          width={svgW}
          height={svgH}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <AnimatedRect
            x={GLOW_PAD + STROKE / 2}
            y={GLOW_PAD + STROKE / 2}
            width={imageW - STROKE}
            height={imageH - STROKE}
            rx={RADIUS}
            ry={RADIUS}
            fill="none"
            stroke={colors.warm}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${perimeter - dash}`}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Featured pose · Ready to try</Text>
        <Pressable
          onPress={() => void handleTryItOut()}
          style={[styles.cta, busy && styles.ctaBusy]}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Try it out"
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <>
              <Text style={styles.ctaText}>Try it out</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  arrow: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    marginTop: 2,
  },
  frameOuter: {
    alignSelf: 'center',
  },
  shadowBox: {
    borderRadius: RADIUS,
    backgroundColor: colors.card2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  imageClip: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  meta: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 110,
    justifyContent: 'center',
  },
  ctaBusy: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.bg,
  },
  ctaArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.bg,
  },
  divider: {
    marginTop: 22,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
