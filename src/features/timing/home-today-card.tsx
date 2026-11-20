import { useId } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/components/byeoli';
import { CardFail } from '@/components/card-fail';
import { SkeletonGroup, SkeletonText } from '@/components/skeleton';
import { GlowOrb } from '@/components/glow';
import { usePulse } from '@/components/making-view';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, TimingLayout as L, TodayCardLayout as M } from '@/constants/theme';
import { strings } from '@/content/strings';
import { reasonBrief } from '@/features/reason/reason-sentence';
import { formatMonthDay, koreaToday } from '@/features/timing/dates';
import { ChevronRight } from '@/features/timing/timing-parts';
import type { TodaySkyState } from '@/features/timing/use-today-sky';

const T = strings.today;
const H = L.home;
/** 기본 얼굴의 별이(별명 짓는 중과 같은 그림) */
const BYEOLI = require('@/assets/images/share/byeoli-default.png');
const FLOAT_MS = 3200;
const NOT_FOUND = 404;

/** 카드 머리: "오늘의 하늘 · 11월 19일"(주색 글자)과 꺾쇠 */
function Head({ label }: { label: string }) {
  return (
    <View style={styles.head}>
      <Txt variant="captionStrong" color="accentText">
        {label}
      </Txt>
      <ChevronRight size={H.chevron} />
    </View>
  );
}

/** 쓰는 중의 작은 그림(보드 11 쓰는 중): 빛이 숨 쉬고 별이가 둥실 — 궤도의 점은 멈춰 있다. 동작 줄이기면 멈춘 장면 */
function MakingArt() {
  const run = !useReduceMotion();
  const float = usePulse(run, FLOAT_MS);
  const glow = usePulse(run, FLOAT_MS);
  const id = `todayGlow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.art}>
      <Animated.View style={[styles.glow, { opacity: run ? glow.interpolate({ inputRange: [0, 1], outputRange: [M.glowDim, 1] }) : 1 }]}>
        <GlowOrb id={id} />
      </Animated.View>
      <View style={styles.orbit}>
        <View style={styles.orbitDot} />
      </View>
      <Animated.Image
        source={BYEOLI}
        accessible={false}
        style={[styles.byeoli, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -M.float] }) }] }]}
      />
    </View>
  );
}

/**
 * 홈 오늘의 하늘 카드의 뼈대(결정 071): 다 그려진 카드(이름표 · 두 줄 제목 · 짧은 이유)와 같은 자리 · 높이.
 * 홈을 서버에서 되살리는 동안(아무것도 모를 때)의 홈 뼈대만 쓴다 — 카드 자체는 묻는 중에 뼈대를 두지 않는다
 */
export function HomeTodaySkeleton() {
  return (
    <SkeletonGroup testID="sk-home-today-card">
      <View style={styles.card}>
        <SkeletonText variant="captionStrong" widths={['44%']} />
        {/* 제목은 시안 11 처럼 두 줄 */}
        <SkeletonText variant="emphasis" widths={['92%', '24%']} style={styles.title} />
        <SkeletonText variant="desc" widths={['60%']} style={styles.sub} />
      </View>
    </SkeletonGroup>
  );
}

/**
 * 홈의 오늘의 하늘 카드(결정 047 의 1-3 · 051, 보드 11 · 11 쓰는 중): "오늘의 하늘 · 11월 19일" · 제목 · 짧은 이유 한 줄. 누르면 `/today`.
 * - 처음 묻는 중: 비워 두고(처음 들어올 때는 스플래시가 가린다), 1초 넘게 걸리면 그날 처음 쓰는 것으로 보고 쓰는 중 카드(making — 별이 · "몇 초면 돼요").
 *   뼈대는 두지 않는다 — 기기의 오늘 것은 바로 그리고, 없으면 짧게 기다려 글이나 쓰는 중이다(소유자 "접속하자마자 바로")
 * - 못 썼으면 그 자리에 작은 안내와 "다시 쓰기"(19-1). 끊겨서 못 받았거나 서버에 그 경로가 없으면(404 — S④ 전) 칸을 숨긴다
 */
export function HomeTodayCard({
  state,
  making,
  online,
  timeKnown,
  onOpen,
  onRetry,
}: {
  state: TodaySkyState;
  making: boolean;
  online: boolean;
  timeKnown: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    if (making)
      return (
        <View testID="home-today-making" accessible accessibilityLabel={T.making.title} style={styles.card}>
          {/* 쓰는 중에는 서버의 날짜를 아직 모른다 — 기기의 오늘(한국 날짜)을 적는다(보드 11 쓰는 중) */}
          <Head label={`${T.title}${T.separator}${formatMonthDay(koreaToday())}`} />
          <View style={styles.makingRow}>
            <MakingArt />
            <View style={styles.makingText}>
              <Txt variant="stat">{T.making.title}</Txt>
              <Txt variant="caption" color="gray">
                {T.making.card}
              </Txt>
            </View>
          </View>
        </View>
      );
    return null;
  }
  if (state.status === 'failed') {
    if (state.httpStatus === NOT_FOUND || (state.error === 'NETWORK' && !online)) return null;
    return (
      <CardFail
        kicker={T.title}
        title={T.fail}
        body={state.error === 'LIMIT' ? T.limit.replace('\n', ' ') : T.cardFail}
        retry={{ label: strings.states.writeFail.retry, onPress: onRetry }}
      />
    );
  }
  const { sky } = state;
  const brief = reasonBrief(sky.reason, { timeKnown });
  return (
    <Pressable testID="home-today-card" accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <Head label={`${T.title}${T.separator}${formatMonthDay(sky.date)}`} />
      <Txt variant="emphasis" keepAll style={styles.title}>
        {sky.title}
      </Txt>
      {brief ? (
        <Txt variant="desc" color="gray" keepAll style={styles.sub}>
          {brief}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: H.pad,
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: M.titleTop },
  sub: { marginTop: H.subTop },
  makingRow: { flexDirection: 'row', alignItems: 'center', gap: M.rowGap, marginTop: M.rowTop },
  makingText: { flex: 1, gap: M.textGap },
  art: { width: M.art, height: M.art },
  glow: { position: 'absolute', top: M.glowInset, left: M.glowInset, right: M.glowInset, bottom: M.glowInset },
  orbit: { ...StyleSheet.absoluteFill, borderRadius: M.art / 2, borderWidth: LineWidth, borderStyle: 'dashed', borderColor: Colors.hair },
  orbitDot: {
    position: 'absolute',
    left: M.art / 2 - M.dot / 2,
    top: -M.dot / 2,
    width: M.dot,
    height: M.dot,
    borderRadius: M.dot / 2,
    backgroundColor: BrandColors.glowSoft,
    boxShadow: `0 0 10px ${BrandColors.glowMid}`,
  },
  byeoli: { position: 'absolute', left: (M.art - M.byeoli) / 2, top: (M.art - M.byeoli) / 2, width: M.byeoli, height: M.byeoli },
});
