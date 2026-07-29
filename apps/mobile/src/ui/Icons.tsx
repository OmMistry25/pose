import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

type IconProps = {
  color?: string;
  size?: number;
  active?: boolean;
};

export function HomeIcon({ active, color, size = 22 }: IconProps) {
  const c = color ?? (active ? colors.ink : colors.warm);
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9 22 9 12 15 12 15 22"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ListIcon({ active, color, size = 22 }: IconProps) {
  const c = color ?? (active ? colors.ink : colors.warm);
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="8" y1="6" x2="21" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="21" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="8" y1="18" x2="21" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="3" y1="6" x2="3.01" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="3.01" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="3.01" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

export function GridIcon({ active, color, size = 22 }: IconProps) {
  const c = color ?? (active ? colors.ink : colors.warm);
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" stroke={c} strokeWidth={sw} />
      <Rect x="14" y="3" width="7" height="7" stroke={c} strokeWidth={sw} />
      <Rect x="14" y="14" width="7" height="7" stroke={c} strokeWidth={sw} />
      <Rect x="3" y="14" width="7" height="7" stroke={c} strokeWidth={sw} />
    </Svg>
  );
}

export function ChevLeft({ color = colors.ink, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 18 9 12 15 6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevRight({ color = colors.warm, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 18 15 12 9 6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ color = colors.ink, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function TickIcon({ color = colors.bg, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CamIcon({ color = colors.ink, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function UploadIcon({ color = colors.bg, size = 17 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="16 16 12 12 8 16"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="12" x2="12" y2="21" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path
        d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SignOutIcon({ color = colors.dangerText, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="16 17 21 12 16 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function EditIcon({ color = colors.warm, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
