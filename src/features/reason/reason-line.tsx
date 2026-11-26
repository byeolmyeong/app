import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/byeoli';
import { InfoTip } from '@/components/info-tip';
import { SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, Motion, ReasonLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { MiniWheel } from '@/features/chart/ChartWheel';
import { isRevealFree, measureReveal, releaseReveal, RevealBody, RevealTurn, runReveal, useReveal, type Reveal } from '@/features/reason/reason-reveal';
import { josa, lookup, reasonSentence, type ReasonSentence } from '@/features/reason/reason-sentence';
import { reasonFocus, reasonTerms, type ReasonTerm } from '@/features/reason/reason-terms';
import type { Chart, Reason } from '@/lib/api';

const R = strings.reason;
const G = strings.glossary;

export type ReasonLineProps = {
  reason: Reason;
  /** 그 사람의 차트(기기에 받아 둔 것). 없으면 시각 모름처럼 하우스 부분을 빼고, 작은 지도를 그리지 않는다 */
  chart: Chart | null;
  /** DAY 근거가 오늘의 것인가 */
  today?: boolean;
  /** 처음부터 펼친 채로 연다 — 화면에서 첫 번째 이유(결정 083). 처음 그릴 때만 본다 */
  defaultOpen?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 문장을 굵은 자리대로 나눠 그린다 */
function SentenceText({ sentence }: { sentence: ReasonSentence }) {
  const parts: { t: string; b: boolean }[] = [];
  let at = 0;
  for (const [start, end] of sentence.bold) {
    if (start > at) parts.push({ t: sentence.text.slice(at, start), b: false });
    parts.push({ t: sentence.text.slice(start, end), b: true });
    at = end;
  }
  if (at < sentence.text.length) parts.push({ t: sentence.text.slice(at), b: false });
  return (
    <Txt variant="small" color="gray" keepAll>
      {parts.map((p, i) =>
        p.b ? (
          <Txt key={i} variant="small" style={styles.bold}>
            {p.t}
          </Txt>
        ) : (
          p.t
        ),
      )}
    </Txt>
  );
}

/** 펼침 상자의 꺾쇠: 닫힘 ⌃ · 펼침 ⌄(결정 061 의 7) — 같은 꺾쇠를 펼침과 같은 진행 값으로 반 바퀴 돌린다 */
function Chevron({ reveal }: { reveal: Reveal }) {
  return (
    <RevealTurn reveal={reveal} testID="reason-chevron">
      <Svg testID="reason-chevron-glyph" width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
        <Path d="M6 15l6-6 6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </RevealTurn>
  );
}

/** 용어 한 줄: "나의 중심 · 해 ?" 와 그 아래 한 줄 뜻 */
function TermRow({ term, open, onToggle }: { term: ReasonTerm; open: boolean; onToggle: () => void }) {
  return (
    <View testID="reason-term" style={[styles.term, open && styles.raised]}>
      <InfoTip
        label={`${term.name}${josa(term.name, R.josa.subject)}${R.question}`}
        title={term.tip.title}
        text={term.tip.text}
        open={open}
        onToggle={onToggle}>
        <Txt variant="term">
          {term.nickname}
          <Txt variant="term" color="hint" style={styles.regular}>
            {`${R.separator}${term.name}`}
          </Txt>
        </Txt>
      </InfoTip>
      <Txt variant="caption" color="gray">
        {term.meaning}
      </Txt>
    </View>
  );
}

/** 작은 지도의 읽기 이름에 적는 별 · 칸의 이름 */
const focusName = (key: string) =>
  key === 'ASC' || key === 'MC' ? G.angles[key].nickname : (lookup<{ name: string }>(G.bodies, key)?.name ?? key);

/** 시각을 알아야 하우스 · 상승점 · 중천을 그린다(차트의 timeKnown — 이중 안전, 결정 054 의 6) */
function reasonTimeKnown(chart: Chart | null): boolean {
  return chart !== null && chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;
}

/**
 * 이 이유가 화면에 그려지는가(문장을 만들 수 있는가, 결정 054 의 7) — ReasonLine 이 그리는 기준과 같다.
 * 화면은 그려지는 이유가 둘 이상일 때만 첫 이유를 펼친 채로 연다(결정 091)
 */
export function isReasonShown(reason: Reason, chart: Chart | null, today = false): boolean {
  return reasonSentence(reason, { timeKnown: reasonTimeKnown(chart), today }) !== null;
}

/**
 * "이렇게 풀이한 이유" 줄(보드 12 · 12-1~12-3 · 11-5, 결정 054 의 4): 접힌 상자에 한 문장, 누르면 그 자리에서 펼친다 —
 * 작은 지도(그 근거의 별 · 칸만 빛남, 지나가는 별은 없음) · 용어 줄 1~3(물음표는 말풍선, 한 번에 하나) · "하늘 지도에서 보기"
 * (그 별을 고른 채로 `/chart`). 문장을 만들 수 없는 근거(모르는 kind · 사전에 없는 값)면 아무것도 그리지 않는다(결정 054 의 7).
 * 펼치고 접을 때 높이가 부드럽게 늘고 줄며 내용이 흐려졌다 나타나고 꺾쇠가 반 바퀴 돈다(소유자 2026-11-21, 시트와 같은 Motion 값).
 * 꺾쇠 회전 · 높이 · 보임을 진행 값 하나(0→1)로 같은 길이 · 같은 곡선에 묶는다 — 앱은 Reanimated(화면 스레드), 웹은 RN Animated
 * (reason-reveal.tsx · .web.tsx, 모양은 reason-reveal-shape.ts — 웹 번들에 Reanimated 를 싣지 않는다). 펼친 내용은 처음부터 그려 두고
 * (접힌 동안 높이 0 · 투명 · 누를 수 없음 · 화면 읽기에서 숨김) 절대 위치로 재 둔다 — 높이 0 칸 안에서도 제 높이를 잰다(iOS 에서 높이를 못 재
 * 회전이 끝난 뒤 내용이 툭 나타나던 것, 소유자 2026-11-21 빌드 8). 내용은 진행의 앞 1/3 에서 나타난다. 동작 줄이기면 바로 바뀐다.
 * 화면의 첫 이유는 처음부터 펼친 채로 연다(`defaultOpen`, 결정 083) — 내용을 흐름 안에 두고 첫 누름 전까지 높이를 묶지 않아,
 * 잰 값을 기다리지 않고 첫 그림부터 펼친 높이다. 첫 누름에 높이를 묶고(진행 1 × 잰 높이 = 지금 높이) 그 뒤는 다른 상자와 같다.
 */
export function ReasonLine({ reason, chart, today = false, defaultOpen = false, style }: ReasonLineProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [tip, setTip] = useState<string | null>(null);
  /** 꺾쇠 회전 · 높이 · 보임을 함께 움직이는 진행 값(접힘 0 → 펼침 1)과 펼친 내용의 실제 높이(처음부터 그려 두고 절대 위치로 잰다) */
  const reveal = useReveal(defaultOpen);
  /** 다 펼쳐졌다 — 잘라내지 않는다(용어 말풍선이 칸 밖으로 나오고, 말풍선으로 줄이 길어지면 잰 높이도 따라간다) */
  const [settled, setSettled] = useState(defaultOpen);
  /** 누를 때마다 올리는 번호 — 끝난 펼침의 알림이 그 뒤에 시작한 접기를 "다 펼침" 으로 덮지 않게(화면 스레드의 알림은 늦게 온다) */
  const turn = useRef(0);
  const settle = (mine: number) => {
    if (mine !== turn.current) return;
    setSettled(true);
    // 처음부터 펼친 상자는 다 펼치면 묶음을 푼다 — 내용이 제 높이를 내고 바탕이 덮는다(결정 088)
    if (defaultOpen) releaseReveal(reveal);
  };
  const reduce = useReduceMotion();
  const toggle = () => {
    const next = !open;
    setOpen(next);
    setTip(null);
    setSettled(false);
    const duration = reduce ? 0 : next ? Motion.openMs : Motion.closeMs;
    const mine = ++turn.current;
    runReveal(reveal, next ? 1 : 0, duration, next ? () => settle(mine) : undefined);
  };
  const timeKnown = reasonTimeKnown(chart);
  const sentence = reasonSentence(reason, { timeKnown, today });
  if (!sentence) return null;
  const focus = reasonFocus(reason, timeKnown);
  const map = chart !== null && focus.bodies.length + focus.houses.length > 0 ? chart : null;
  const first = focus.bodies[0] ?? null;
  return (
    <View testID="reason-line" style={[styles.box, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${R.label}, ${sentence.text}`}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.head}>
        <View style={styles.texts}>
          <Txt variant="label" color="hint">
            {R.label}
          </Txt>
          <SentenceText sentence={sentence} />
        </View>
        <Chevron reveal={reveal} />
      </Pressable>
      <RevealBody
          reveal={reveal}
          flow={defaultOpen}
          testID="reason-body"
          pointerEvents={open ? 'auto' : 'none'}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          style={settled ? styles.revealOpen : styles.reveal}>
          <View
            testID="reason-measure"
            // 처음부터 펼친 상자는 흐름 안에 둔다 — 묶지 않은 칸이 내용의 높이를 낸다(절대 위치면 0)
            style={defaultOpen ? null : styles.measure}
            onLayout={(e) => {
              // 흐름 안 상자는 묶지 않았을 때(제 높이)만 잰다 — 접고 펴는 동안 눌린 높이를 잰 값으로 삼지 않게(결정 088)
              if (!defaultOpen || isRevealFree(reveal)) measureReveal(reveal, e.nativeEvent.layout.height);
            }}>
          {map ? (
            <MiniWheel
              chart={map}
              bodies={focus.bodies}
              houses={focus.houses}
              label={R.wheelLabel + [...focus.bodies.map(focusName), ...focus.houses.map((n) => `${n}${R.houseSuffix}`)].join(R.separator)}
            />
          ) : null}
          <View style={styles.terms}>
            {reasonTerms(reason, timeKnown).map((t) => (
              <TermRow key={t.key} term={t} open={tip === t.key} onToggle={() => setTip((k) => (k === t.key ? null : t.key))} />
            ))}
          </View>
          {map && first ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/chart?selected=${first}`)} style={styles.button}>
              <Txt variant="term">{R.seeOnMap}</Txt>
            </Pressable>
          ) : null}
            {/* 펼치면 상자 아래 여백이 늘어나는 만큼 — 높이와 함께 늘고 준다 */}
            <View style={styles.openSpace} />
          </View>
        </RevealBody>
    </View>
  );
}

/** 접힌 이유 상자의 뼈대(결정 071): 같은 상자 · 이름 한 줄 · 문장 두 줄(꺾쇠 자리는 비운다) */
export function ReasonLineSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View testID="reason-line-skeleton" style={[styles.box, style]}>
      <View style={styles.head}>
        <View style={styles.texts}>
          <SkeletonText variant="label" widths={[L.skeleton.label]} />
          <SkeletonText variant="small" widths={L.skeleton.sentence} />
        </View>
        <View testID="reason-chevron-space" style={styles.chevronSpace} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingTop: L.padTop,
    paddingRight: L.padRight,
    paddingBottom: L.padBottom,
    paddingLeft: L.padLeft,
    borderRadius: L.radius,
    backgroundColor: Colors.raised,
  },
  /** 펼친 내용은 높이 0 에서 늘어나는 칸 안에 둔다(다 펼치면 잘라내지 않아 용어 말풍선이 칸 밖으로 나온다) */
  reveal: { overflow: 'hidden' },
  revealOpen: { overflow: 'visible' },
  /** 내용은 칸의 높이와 상관없이 제 높이로 놓여 잰다 */
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
  openSpace: { height: L.padBottomOpen - L.padBottom },
  head: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  chevronSpace: { width: L.chevron },
  texts: { flex: 1, gap: L.textGap },
  bold: { color: Colors.ink, fontWeight: FontWeight.semibold },
  regular: { fontWeight: FontWeight.regular },
  terms: { marginTop: L.termsTop, gap: L.termsGap },
  term: { gap: L.termGap },
  raised: { zIndex: 1 },
  button: {
    marginTop: L.buttonTop,
    height: L.button,
    borderRadius: L.buttonRadius,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
