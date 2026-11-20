import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { GlowBackdrop, GlowOrb } from '@/components/glow';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { BackdropShape, BrandColors, Colors, LineWidth, MakingTwinkles, ScreenPaddingX, Sizes, Spacing, StateLayout } from '@/constants/theme';

/** 기본 얼굴의 별이(별명 짓는 중 · 스플래시 · 공유 카드와 같은 그림) */
const BYEOLI = require('@/assets/images/share/byeoli-default.png');

type Action = { label: string; onPress: () => void };

export type StateScreenProps = {
  title: string;
  /** 두 줄 설명 — 줄은 `\n` 으로 나눠 쓴다(결정 061 의 1) */
  body: string;
  /** 맨 아래 꽉 찬 주 버튼(다시 쓰기 · 다시 보기 · 다시 시도 · 업데이트). 갈 곳이 없는 화면(점검)은 없다 */
  primary?: Action;
  /** 주 버튼 위 글자 버튼 "나중에 하기"(받기 전 화면으로). 업데이트 필요 · 점검은 없다 */
  later?: Action;
  /** 화면 머리(그날의 하늘 실패 등 뒤로 가기만 있는 화면) */
  nav?: ReactNode;
  /** 아래 탭(화면 전체를 못 불러온 탭 자리 — 보드 19). 공용 부품이라 화면이 넘긴다. 있으면 주 버튼은 탭 바로 위 */
  tabs?: ReactNode;
};

/**
 * 실패 화면 한 틀(결정 061, 보드 19 · 20-1 · 17-1 · 점검): 별명 짓는 중(9)과 같은 별이 그림(움직이지 않음) · 제목 · 두 줄 설명 ·
 * 맨 아래 주 버튼(아래 34, 탭이 있으면 탭 바로 위 16) · 그 위 "나중에 하기". 주 버튼 아래에는 아무것도 두지 않는다(결정 061 의 5).
 */
export function StateScreen({ title, body, primary, later, nav, tabs }: StateScreenProps) {
  return (
    <Screen scroll={false} nav={nav} footer={tabs}>
      <View style={styles.body}>
        <GlowBackdrop color={BrandColors.backdropDim} extent={BackdropShape.making.extent} centerY={BackdropShape.making.centerY} />
        <View testID="state-art" aria-hidden importantForAccessibility="no-hide-descendants" style={styles.art}>
          <View style={styles.glow}>
            <GlowOrb id="stateGlow" />
          </View>
          <View style={styles.orbit}>
            <View style={styles.orbitDot} />
          </View>
          <View style={styles.innerOrbit}>
            <View style={styles.innerDot} />
          </View>
          <View style={[styles.twinkle, styles.twinkleA]} />
          <View style={[styles.twinkle, styles.twinkleSmall, styles.twinkleB]} />
          <View style={[styles.twinkle, styles.twinkleSmall, styles.twinkleC]} />
          <Image source={BYEOLI} accessible={false} style={styles.byeoli} />
        </View>
        <Txt variant="headline" accessibilityRole="header" style={styles.title}>
          {title}
        </Txt>
        <Txt color="gray" keepAll style={styles.text}>
          {body}
        </Txt>
      </View>
      <View testID="state-actions" style={[styles.actions, { paddingBottom: tabs ? StateLayout.aboveTabs : StateLayout.bottom }]}>
        {later ? <TextLink label={later.label} onPress={later.onPress} /> : null}
        {primary ? <Button label={primary.label} onPress={primary.onPress} /> : null}
      </View>
    </Screen>
  );
}

const ART = Sizes.makingArt;
const INNER = ART - Sizes.makingInnerOrbit * 2;

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: StateLayout.lift },
  art: { width: ART, height: ART },
  glow: { position: 'absolute', top: Sizes.makingGlowInset, left: Sizes.makingGlowInset, right: Sizes.makingGlowInset, bottom: Sizes.makingGlowInset },
  orbit: { ...StyleSheet.absoluteFill, borderRadius: ART / 2, borderWidth: LineWidth, borderStyle: 'dashed', borderColor: Colors.hair },
  orbitDot: {
    position: 'absolute',
    left: ART / 2 - Sizes.makingOrbitDot / 2,
    top: -Sizes.makingOrbitDot / 2,
    width: Sizes.makingOrbitDot,
    height: Sizes.makingOrbitDot,
    borderRadius: Sizes.makingOrbitDot / 2,
    backgroundColor: BrandColors.glowSoft,
    boxShadow: `0 0 12px ${BrandColors.glowMid}`,
  },
  innerOrbit: {
    position: 'absolute',
    top: Sizes.makingInnerOrbit,
    left: Sizes.makingInnerOrbit,
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    borderWidth: LineWidth,
    borderColor: Colors.primarySoft,
  },
  innerDot: {
    position: 'absolute',
    left: -Sizes.makingInnerDot / 2 - LineWidth,
    top: INNER / 2 - Sizes.makingInnerDot / 2,
    width: Sizes.makingInnerDot,
    height: Sizes.makingInnerDot,
    borderRadius: Sizes.makingInnerDot / 2,
    backgroundColor: BrandColors.rimViolet,
  },
  twinkle: {
    position: 'absolute',
    width: Sizes.makingTwinkle,
    height: Sizes.makingTwinkle,
    borderRadius: Sizes.makingTwinkle / 2,
    backgroundColor: BrandColors.core,
  },
  twinkleSmall: { width: Sizes.makingTwinkleSmall, height: Sizes.makingTwinkleSmall },
  twinkleA: MakingTwinkles[0],
  twinkleB: MakingTwinkles[1],
  twinkleC: MakingTwinkles[2],
  byeoli: { position: 'absolute', left: (ART - Sizes.byeoli) / 2, top: (ART - Sizes.byeoli) / 2, width: Sizes.byeoli, height: Sizes.byeoli },
  title: { marginTop: StateLayout.titleTop, textAlign: 'center' },
  text: { marginTop: StateLayout.bodyTop, textAlign: 'center' },
  actions: { paddingHorizontal: ScreenPaddingX, gap: StateLayout.laterGap },
});
