import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { InfoTip } from '@/components/info-tip';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, ReasonLayout as L } from '@/constants/theme';
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

/** 펼침 상자의 꺾쇠: 닫힘 ⌃ · 펼침 ⌄(결정 061 의 7) */
function Chevron({ open }: { open: boolean }) {
  return (
    <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
      <Path d={open ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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
 */
export function ReasonLine({ reason, chart, today = false, style }: ReasonLineProps) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  // 시각을 알아야 하우스 · 상승점 · 중천을 그린다(차트의 timeKnown — 이중 안전, 결정 054 의 6)
  const timeKnown = chart !== null && chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;
  const sentence = reasonSentence(reason, { timeKnown, today });
  if (!sentence) return null;
  const focus = reasonFocus(reason, timeKnown);
  const map = chart !== null && focus.bodies.length + focus.houses.length > 0 ? chart : null;
  const first = focus.bodies[0] ?? null;
  return (
    <View style={[styles.box, open && styles.boxOpen, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${R.label}, ${sentence.text}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setOpen((o) => !o);
          setTip(null);
        }}
        style={styles.head}>
        <View style={styles.texts}>
          <Txt variant="label" color="hint">
            {R.label}
          </Txt>
          <SentenceText sentence={sentence} />
        </View>
        <Chevron open={open} />
      </Pressable>
      {open ? (
        <>
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
        </>
      ) : null}
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
  boxOpen: { paddingBottom: L.padBottomOpen },
  head: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
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
