import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '../theme/tokens';

type Variant = 'solid' | 'outline' | 'danger';

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, variant = 'solid', style, disabled, children, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {children ?? (
        <Text
          style={[
            styles.label,
            variant === 'solid' && styles.labelSolid,
            variant === 'outline' && styles.labelOutline,
            variant === 'danger' && styles.labelDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  solid: {
    backgroundColor: colors.ink,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
  labelSolid: {
    color: colors.bg,
  },
  labelOutline: {
    color: colors.inkMid,
  },
  labelDanger: {
    color: colors.dangerText,
  },
});
