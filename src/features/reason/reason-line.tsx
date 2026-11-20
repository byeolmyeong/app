import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/byeoli';
import { InfoTip } from '@/components/info-tip';
import { SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, Motion, ReasonLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { MiniWheel } from '@/features/chart/ChartWheel';
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
    <Txt variant="reason" color="gray" keepAll>
      {parts.map((p, i) =>
        p.b ? (
          <Txt key={i} variant="reason" style={styles.bold}>
            {p.t}
          </Txt>
        ) : (
          p.t
        ),
      )}
    </Txt>
  );
}

/** 펼침 상자의 꺾쇠: 닫힘 ⌃ · 펼침 ⌄(결정 061 의 7) — 같은 꺾쇠를 펼침과 함께 반 바퀴 돌린다 */
function Chevron({ progress }: { progress: Animated.Value }) {
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View testID="reason-chevron" style={{ transform: [{ rotate }] }}>
      <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
        <Path d="M6 15l6-6 6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
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
      <Txt variant="note" color="gray">
        {term.meaning}
      </Txt>
    </View>
  );
}

/** 작은 지도의 읽기 이름에 적는 별 · 칸의 이름 */
const focusName = (key: string) =>
  key === 'ASC' || key === 'MC' ? G.angles[key].nickname : (lookup<{ name: string }>(G.bodies, key)?.name ?? key);

/**
 * "이렇게 풀이한 이유" 줄(보드 12 · 12-1~12-3 · 11-5, 결정 054 의 4): 접힌 상자에 한 문장, 누르면 그 자리에서 펼친다 —
 * 작은 지도(그 근거의 별 · 칸만 빛남, 지나가는 별은 없음) · 용어 줄 1~3(물음표는 말풍선, 한 번에 하나) · "하늘 지도에서 보기"
 * (그 별을 고른 채로 `/chart`). 문장을 만들 수 없는 근거(모르는 kind · 사전에 없는 값)면 아무것도 그리지 않는다(결정 054 의 7).
 * 펼치고 접을 때 높이가 부드럽게 늘고 줄며 내용이 흐려졌다 나타나고 꺾쇠가 반 바퀴 돈다(소유자 2026-11-21, 시트와 같은 Motion 값).
 * 기기의 동작 줄이기가 켜져 있으면 바로 바뀐다.
 */
export function ReasonLine({ reason, chart, today = false, style }: ReasonLineProps) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  /** 펼친 내용이 그려져 있는가(접는 움직임이 끝날 때까지 남는다) */
  const [mounted, setMounted] = useState(false);
  /** 펼친 내용의 실제 높이 — 0 에서 이 높이까지 늘인다 */
  const [height, setHeight] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  /** 다 펼쳐졌다 — 높이를 묶지 않고 잘라내지 않는다(용어 말풍선이 칸 밖으로 나오고, 말풍선으로 줄이 길어져도 그대로) */
  const [settled, setSettled] = useState(false);
  const reduce = useReduceMotion();
  const toggle = () => {
    const next = !open;
    setOpen(next);
    setTip(null);
    setSettled(false);
    if (next) setMounted(true);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: reduce ? 0 : next ? Motion.openMs : Motion.closeMs,
      easing: Easing.bezier(...Motion.openCurve),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (next) setSettled(true);
      else setMounted(false);
    });
  };
  // 시각을 알아야 하우스 · 상승점 · 중천을 그린다(차트의 timeKnown — 이중 안전, 결정 054 의 6)
  const timeKnown = chart !== null && chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;
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
        <Chevron progress={progress} />
      </Pressable>
      {mounted ? (
        <Animated.View
          testID="reason-body"
          style={settled ? null : [styles.reveal, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }), opacity: progress }]}>
          <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
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
        </Animated.View>
      ) : null}
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
          <SkeletonText variant="reason" widths={L.skeleton.sentence} />
        </View>
        <View style={styles.chevronSpace} />
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
  /** 펼친 내용은 높이 0 에서 늘어나는 칸 안에 둔다 */
  reveal: { overflow: 'hidden' },
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
