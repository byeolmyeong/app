import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { GlowDefs, Sparkle, starPath, useSvgIds, type SvgIds } from '@/components/glow';
import { BrandColors } from '@/constants/theme';

/**
 * 앱 안의 별이 표정(결정 035). 생각 중: 글을 짓는 동안 · 쉬는 중: 아직 없을 때 · 머쓱: 불러오지 못했을 때.
 * "기본" · "반가움" 은 스플래시 · 공유 카드의 그림(assets/brand/*.svg → PNG)에만 있다.
 */
export type ByeoliState = 'think' | 'empty' | 'error';

export type ByeoliProps = { state: ByeoliState; size: number };

const useNativeDriver = Platform.OS !== 'web';
const VIEW = '-90 -90 180 180';
/** 끝이 둥근 통통한 네 갈래 별 */
const BODY = starPath(48, 0.34);
const EYE = BrandColors.eye;

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * 기기의 "동작 줄이기". 알기 전까지는 움직이지 않는다.
 * 웹은 브라우저 설정을 부품마다 직접 듣는다 — react-native-web 의 AccessibilityInfo 는 듣는 함수를 글자로 바꿔 보관해,
 * 별이가 여럿이면 서로의 구독을 지우고 남긴다.
 */
/** 웹의 브라우저 설정. 서버에서 그릴 때와 matchMedia 가 없을 때는 null */
const webQuery = () => (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCE_QUERY) : null);

/** 지금 기기의 "동작 줄이기" 가 켜져 있는가(한 번 묻는다 — 가입 진행 막대처럼 한 번 움직일 때). 알 수 없으면 켜진 것으로 본다 */
export async function reduceMotionNow(): Promise<boolean> {
  if (Platform.OS === 'web') return webQuery()?.matches ?? true;
  return AccessibilityInfo.isReduceMotionEnabled().catch(() => true);
}

/** 기기의 "동작 줄이기"(별이 · 별명 짓는 중이 함께 쓴다, 결정 035 · 041). 알기 전까지는 켜진 것으로 본다 */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(() => webQuery()?.matches ?? true);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const query = webQuery();
      if (!query) return;
      const onChange = (event: { matches: boolean }) => setReduce(event.matches);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setReduce(on));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/** 끝없이 한 바퀴씩 도는 값(0 → 1). 움직이지 않을 때는 0 에 머문다 */
function useSpin(run: boolean, duration: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run) return;
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver }));
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [run, duration, value]);
  return value;
}

/**
 * 별이: 이름을 지어 주는 작은 별. 장식이라 화면 읽기에서 숨기고, 상태는 옆의 제목 글이 말한다.
 * "생각 중" 은 작은 별 셋이 천천히 돈다. 동작 줄이기가 켜져 있으면 멈춘다.
 */
export function Byeoli({ state, size }: ByeoliProps) {
  const ids = useSvgIds();
  // 도는 반짝이는 따로 그린 Svg 라 정의의 id 도 따로 둔다(한 문서에 같은 id 가 둘 생기지 않게)
  const sparkleIds = useSvgIds();
  const reduce = useReduceMotion();
  const spin = useSpin(!reduce && state === 'think', 6000);
  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View testID="byeoli" aria-hidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={VIEW}>
        <GlowDefs ids={ids} />
        <Body state={state} ids={ids} />
      </Svg>
      {state === 'think' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: turn }] }]}>
          <Svg width={size} height={size} viewBox={VIEW}>
            <GlowDefs ids={sparkleIds} />
            <Sparkle x={0} y={-68} r={6} ids={sparkleIds} />
            <Sparkle x={59} y={34} r={4.5} ids={sparkleIds} opacity={0.8} />
            <Sparkle x={-59} y={34} r={4} ids={sparkleIds} opacity={0.6} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Body({ state, ids }: { state: ByeoliState; ids: SvgIds }) {
  const round = { strokeWidth: 10, strokeLinejoin: 'round' as const };
  if (state === 'empty')
    return (
      <G>
        <G opacity={0.75}>
          <Circle r={70} fill={`url(#${ids.halo})`} opacity={0.6} />
          <Path d={BODY} fill={BrandColors.rest} stroke={BrandColors.rest} {...round} />
          <Face state="empty" />
        </G>
        {/* 쉬는 중: 오른쪽 위의 작은 달 */}
        <Path d="M49.4,-56.1 A10.5,10.5 0 1 0 49.4,-35.9 A8,8 0 1 1 49.4,-56.1Z" fill={BrandColors.glowSoft} opacity={0.8} />
      </G>
    );
  if (state === 'error')
    return (
      <G transform="rotate(-14)">
        <Circle r={70} fill={`url(#${ids.haloDim})`} />
        <Path d={BODY} fill={BrandColors.dim} stroke={BrandColors.dim} {...round} />
        <Face state="error" />
      </G>
    );
  return (
    <G>
      <Circle r={78} fill={`url(#${ids.halo})`} />
      <Path d={starPath(52, 0.34)} fill={BrandColors.glow} filter={`url(#${ids.blurXL})`} />
      <Path d={starPath(50, 0.34)} fill={BrandColors.haloCenter} stroke={BrandColors.haloCenter} {...round} filter={`url(#${ids.blurL})`} />
      <Path d={BODY} fill={BrandColors.core} stroke={BrandColors.core} {...round} />
      <Face state={state} />
    </G>
  );
}

/** 얼굴. 눈 사이 20.7, 눈높이 2.3(별 몸 좌표) */
function Face({ state }: { state: ByeoliState }) {
  const x = 10.35;
  const y = 2.3;
  const line = { stroke: EYE, strokeWidth: 2.3, strokeLinecap: 'round' as const, fill: 'none' };
  switch (state) {
    case 'think':
      return (
        <G testID="byeoli-face-think">
          <Path d={`M${-x - 3.7},${y} Q${-x},${y + 3} ${-x + 3.7},${y}`} {...line} />
          <Path d={`M${x - 3.7},${y} Q${x},${y + 3} ${x + 3.7},${y}`} {...line} />
        </G>
      );
    case 'empty':
      return (
        <G testID="byeoli-face-empty">
          <Path d={`M${-x - 3.4},${y} H${-x + 3.4}`} {...line} />
          <Path d={`M${x - 3.4},${y} H${x + 3.4}`} {...line} />
        </G>
      );
    case 'error':
      return (
        <G testID="byeoli-face-error">
          <Circle cx={-x} cy={y} r={2.2} fill={EYE} />
          <Circle cx={x} cy={y} r={2.2} fill={EYE} />
          <Path d={`M-3,${y + 7.5} Q0,${y + 5.3} 3,${y + 7.5}`} {...line} strokeWidth={1.8} />
        </G>
      );
  }
}
