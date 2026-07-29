import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme/tokens';

type Props = {
  label: string;
  count?: number;
  active?: boolean;
  dotColor?: string;
  onPress: () => void;
};

export function Chip({ label, count, active, dotColor, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      {dotColor && !active ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {dotColor && active ? <View style={[styles.dot, { backgroundColor: colors.bg }]} /> : null}
      <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>{label}</Text>
      {count != null ? (
        <Text style={[styles.count, active ? styles.labelActive : styles.labelIdle]}>
          ({count})
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipIdle: {
    backgroundColor: colors.card2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  count: {
    fontFamily: fonts.sans,
    fontSize: 11,
    opacity: 0.65,
  },
  labelActive: {
    color: colors.bg,
  },
  labelIdle: {
    color: colors.inkLight,
  },
});
