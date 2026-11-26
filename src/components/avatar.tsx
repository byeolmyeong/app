/**
 * 프로필 그림 8종(결정 042). 브랜드 그림(별이 · 달 · 하트 · 불꽃 · 구슬, 결정 035)으로 만든 원형 그림이고, 원본은 `assets/brand/avatar-1~8.svg` 다
 * (같은 그림이 두 벌 — 모양이나 색을 바꾸면 양쪽을 같이 고친다). 화면에는 이름을 보이지 않고 화면 읽기 이름만 준다.
 */
import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { AvatarColors, BrandColors, Colors, FontFamily, FontWeight } from '@/constants/theme';
import { strings } from '@/content/strings';

export const AVATAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const isAvatarId = (v: unknown): v is AvatarId => AVATAR_IDS.some((id) => id === v);

const STAR = 'M0,-27 Q9.18,-9.18 27,0 Q9.18,9.18 0,27 Q-9.18,9.18 -27,0 Q-9.18,-9.18 0,-27Z';
const MOON = 'M9.2,-27.6 A28.75,28.75 0 1 0 9.2,27.6 A21.85,21.85 0 1 1 9.2,-27.6Z';
const HEART = 'M0.0,26.4 C-29.7,7.7 -33.0,-11.0 -18.7,-20.9 C-9.9,-26.4 -2.2,-22.0 0.0,-13.2 C2.2,-22.0 9.9,-26.4 18.7,-20.9 C33.0,-11.0 29.7,7.7 0.0,26.4Z';
const FLAME =
  'M2.0,-30.0 C12.0,-16.0 22.0,-6.0 20.0,9.0 C18.0,22.0 9.0,28.0 0.0,28.0 C-10.0,28.0 -19.0,21.0 -19.0,8.0 C-19.0,-3.0 -11.0,-10.0 -7.0,-17.0 C-5.0,-9.0 -2.0,-5.0 3.0,-7.0 C7.0,-13.0 6.0,-21.0 2.0,-30.0Z';
const ORB_STAR = 'M0,-13 Q2.6,-2.6 13,0 Q2.6,2.6 0,13 Q-2.6,2.6 -13,0 Q-2.6,-2.6 0,-13Z';
const ORB_CORE = 'M0,-12 Q2.4,-2.4 12,0 Q2.4,2.4 0,12 Q-2.4,2.4 -12,0 Q-2.4,-2.4 0,-12Z';

const C = BrandColors;

/** 점 눈(빛점 하나) */
function DotEyes({ x = 6.6, y = 2, dx = 0 }: { x?: number; y?: number; dx?: number }) {
  return (
    <G>
      {[-x + dx, x + dx].map((cx) => (
        <G key={cx}>
          <Ellipse cx={cx} cy={y} rx={1.9} ry={2.8} fill={C.eye} />
          <Circle cx={cx + 0.7} cy={y - 1} r={0.7} fill={C.eyeShine} />
        </G>
      ))}
    </G>
  );
}

const arc = { fill: 'none', stroke: C.eye, strokeWidth: 1.7, strokeLinecap: 'round' as const };

function Face({ id }: { id: AvatarId }) {
  switch (id) {
    case 1:
      return <DotEyes />;
    case 2:
      return (
        <G>
          <Path d="M-9.2,3.0 Q-6.6,-0.6 -4.0,3.0" {...arc} />
          <Path d="M4.0,3.0 Q6.6,-0.6 9.2,3.0" {...arc} />
        </G>
      );
    case 3:
      return (
        <G>
          <Ellipse cx={-6.6} cy={2} rx={1.9} ry={2.8} fill={C.eye} />
          <Circle cx={-5.9} cy={1} r={0.7} fill={C.eyeShine} />
          <Path d="M4.0,3.0 Q6.6,-0.6 9.2,3.0" {...arc} />
        </G>
      );
    case 4:
      return (
        <G>
          <Path d="M-9.2,2 Q-6.6,4.2 -4.0,2" {...arc} strokeWidth={1.6} />
          <Path d="M4.0,2 Q6.6,4.2 9.2,2" {...arc} strokeWidth={1.6} />
          <SvgText x={17} y={-10} fontFamily={FontFamily} fontSize={8} fontWeight={FontWeight.semibold} fill={C.core} opacity={0.8}>
            z
          </SvgText>
        </G>
      );
    case 5:
      return <DotEyes x={6.6} y={1} dx={-7} />;
    case 6:
      return (
        <G>
          <Path d="M-9.2,-1.0 Q-6.6,-4.6 -4.0,-1.0" {...arc} />
          <Path d="M4.0,-1.0 Q6.6,-4.6 9.2,-1.0" {...arc} />
        </G>
      );
    case 7:
      return <DotEyes y={9} />;
    case 8:
      return null;
  }
}

/** 가운데 모양: 번짐(흐림) 한 겹 위에 흰 모양 */
function Shape({ id, glow, blur }: { id: AvatarId; glow: string; blur: string }) {
  const haze = { fill: glow, filter: `url(#${blur})`, opacity: 0.9 };
  switch (id) {
    case 5:
      return (
        <G>
          <Path d={MOON} {...haze} />
          <Path d={MOON} fill={C.core} />
        </G>
      );
    case 6:
      return (
        <G>
          <Path d={HEART} {...haze} />
          <Path d={HEART} fill={C.core} stroke={C.core} strokeWidth={2} strokeLinejoin="round" />
        </G>
      );
    case 7:
      return (
        <G>
          <Path d={FLAME} {...haze} />
          <Path d={FLAME} fill={C.core} stroke={C.core} strokeWidth={2} strokeLinejoin="round" />
        </G>
      );
    case 8:
      return null;
    default:
      return (
        <G>
          <Path d={STAR} {...haze} />
          <Path d={STAR} fill={C.core} stroke={C.core} strokeWidth={7} strokeLinejoin="round" />
        </G>
      );
  }
}

export type AvatarProps = { id: AvatarId; size: number };

export function Avatar({ id, size }: AvatarProps) {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = { bg: `avbg${base}`, halo: `avhalo${base}`, blur: `avbl${base}`, clip: `avclip${base}`, rim: `avrim${base}`, glass: `avglass${base}` };
  const color = AvatarColors[id];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={strings.nickname.avatars[id - 1]} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <Defs>
          <LinearGradient id={ids.bg} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.top} />
            <Stop offset="1" stopColor={color.bottom} />
          </LinearGradient>
          <RadialGradient id={ids.halo}>
            <Stop offset="0" stopColor={color.glow} stopOpacity={0.55} />
            <Stop offset="0.55" stopColor={color.glow} stopOpacity={0.12} />
            <Stop offset="1" stopColor={color.glow} stopOpacity={0} />
          </RadialGradient>
          <Filter id={ids.blur} x="-80%" y="-80%" width="260%" height="260%">
            <FeGaussianBlur stdDeviation={5} />
          </Filter>
          <ClipPath id={ids.clip}>
            <Circle r={60} />
          </ClipPath>
          <LinearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.rimLight} />
            <Stop offset="0.35" stopColor={Colors.primary} />
            <Stop offset="0.7" stopColor={C.glass} />
            <Stop offset="1" stopColor={C.rimViolet} />
          </LinearGradient>
          <RadialGradient id={ids.glass} cx="0.42" cy="0.38" r="0.75">
            <Stop offset="0" stopColor={C.glassDeep} stopOpacity={0.7} />
            <Stop offset="0.6" stopColor={C.glassNight} stopOpacity={0.5} />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity={0.45} />
          </RadialGradient>
        </Defs>
        <G clipPath={`url(#${ids.clip})`}>
          <Circle r={60} fill={`url(#${ids.bg})`} />
          <Circle r={48} fill={`url(#${ids.halo})`} />
          <Circle cx={-38} cy={-30} r={1.4} fill={C.core} opacity={0.8} />
          <Circle cx={36} cy={-22} r={1.1} fill={C.core} opacity={0.6} />
          <Circle cx={30} cy={38} r={1.2} fill={C.core} opacity={0.5} />
          {id === 8 ? (
            <G>
              <Circle r={30} fill={color.glow} opacity={0.35} filter={`url(#${ids.blur})`} />
              <Circle r={27} fill={`url(#${ids.glass})`} stroke={`url(#${ids.rim})`} strokeWidth={3.2} />
              <Path d={ORB_STAR} fill={C.haloCenter} filter={`url(#${ids.blur})`} />
              <Path d={ORB_CORE} fill={C.core} />
              <Ellipse cx={-11} cy={-14} rx={7} ry={3.2} fill={C.eyeShine} opacity={0.22} transform="rotate(-30 -11 -14)" />
            </G>
          ) : (
            <Shape id={id} glow={color.glow} blur={ids.blur} />
          )}
          <Face id={id} />
        </G>
      </Svg>
    </View>
  );
}
