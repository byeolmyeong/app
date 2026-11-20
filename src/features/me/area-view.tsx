import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, MeLayout as L, ReasonLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AreaArt } from '@/features/me/area-art';
import { starLabels } from '@/features/me/me-stars';
import { ReasonLine } from '@/features/reason/reason-line';
import type { Chart, MeAreaReport } from '@/lib/api';

const S = strings.me;
/** 네 갈래 별(-1~1) — 쓰인 별 앞의 작은 표시 */
const STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';

export type AreaViewProps = {
  area: MeAreaReport;
  /** `GET /account` 의 닉네임. 없으면 "나의 성격" */
  nickname: string | null;
  chart: Chart | null;
};

/** 시각을 아는 차트인가(하우스 · 상승점 · 중천을 그려도 되는가) */
const timeKnownOf = (chart: Chart | null) => chart !== null && chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;

/**
 * 나 탭 칩 하나의 풀이(결정 048 의 3, 보드 12-8~12-12): 영역 카드(○○ 님의 성격 · 제목 · 키워드 셋 · 이 풀이에 쓰인 별) →
 * 영역마다의 칸(서버가 준 칸만: 한눈에 보기 · 연애의 작은 실천 + 이유 · 가까워지는 모습 · 나의 일 방식 막대 · 마음이 흔들릴 때) →
 * 번호 붙은 문단(제목 · 본문 · 접힌 이유). 앱은 글 · 값을 만들거나 다시 셈하지 않는다 — 막대는 서버 값의 자리에 점만 찍고 숫자를 적지 않는다.
 */
export function AreaView({ area, nickname, chart }: AreaViewProps) {
  const timeKnown = timeKnownOf(chart);
  return (
    <View style={styles.root}>
      <Hero area={area} nickname={nickname} timeKnown={timeKnown} />
      {area.glance ? <Glance glance={area.glance} /> : null}
      {area.practices ? <Practices practices={area.practices} area={area} chart={chart} /> : null}
      {area.closer ? <Closer closer={area.closer} /> : null}
      {area.workStyle ? <WorkStyle value={area.workStyle} /> : null}
      {area.shaken ? <Shaken shaken={area.shaken} /> : null}
      {area.paragraphs.map((p, i) => (
        <View key={i} testID="me-paragraph">
          <Txt variant="label" style={styles.number}>
            {String(i + 1).padStart(2, '0')}
          </Txt>
          <Txt variant="paragraphTitle" keepAll style={styles.paragraphTitle}>
            {p.title}
          </Txt>
          <Txt variant="paragraph" color="inkSoft" keepAll style={styles.paragraphBody}>
            {p.body}
          </Txt>
          <ReasonLine reason={p.reason} chart={chart} style={styles.reason} />
        </View>
      ))}
    </View>
  );
}

function Hero({ area, nickname, timeKnown }: { area: MeAreaReport; nickname: string | null; timeKnown: boolean }) {
  const H = L.hero;
  const stars = starLabels(area.stars, timeKnown);
  return (
    <View style={styles.hero}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={H.glow.extent} centerX={H.glow.x} centerY={H.glow.y} />
      <View style={styles.art}>
        <AreaArt area={area.area} size={H.art} variant="hero" />
      </View>
      <Txt variant="captionStrong" color="accentText">
        {nickname ? `${nickname}${S.areaOf}${S.areas[area.area]}` : `${S.areaOfMine}${S.areas[area.area]}`}
      </Txt>
      <Txt variant="title" keepAll accessibilityRole="header" style={styles.heroTitle}>
        {area.title}
      </Txt>
      <View style={styles.keywords}>
        {area.keywords.map((k, i) => (
          <View key={i} testID="me-keyword" style={styles.keyword}>
            <Txt variant="captionStrong" color="keywordText">
              {k}
            </Txt>
          </View>
        ))}
      </View>
      {stars.length > 0 ? (
        <View style={styles.stars}>
          <Txt variant="statLabel" color="hint">
            {S.stars}
          </Txt>
          <View style={styles.starList}>
            {stars.map((s, i) => (
              <View key={`${s.key}-${i}`} testID="me-star" style={styles.star}>
                <Svg width={H.starIcon} height={H.starIcon} viewBox="-1 -1 2 2">
                  <Path d={STAR} fill={Colors.accentText} />
                </Svg>
                <Txt variant="statLabel" color="gray">
                  <Txt variant="statLabel" style={styles.strong}>
                    {s.strong}
                  </Txt>
                  {`${strings.reason.separator}${s.rest}`}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Txt variant="emphasis">{title}</Txt>;
}

function Glance({ glance }: { glance: NonNullable<MeAreaReport['glance']> }) {
  const column = (title: string, items: readonly string[], accent: boolean) => (
    <View style={[styles.block, styles.flex]}>
      <Txt variant="captionStrong" color={accent ? 'accentText' : 'gray'} style={styles.strongOnly}>
        {title}
      </Txt>
      {items.map((t, i) => (
        <Txt key={i} variant="desc" color="inkSoft" keepAll>
          {t}
        </Txt>
      ))}
    </View>
  );
  return (
    <View>
      <SectionTitle title={S.glance.title} />
      <View style={styles.pair}>
        {column(S.glance.shining, glance.shining, true)}
        {column(S.glance.tiring, glance.tiring, false)}
      </View>
    </View>
  );
}

function Practices({ practices, area, chart }: { practices: NonNullable<MeAreaReport['practices']>; area: MeAreaReport; chart: Chart | null }) {
  return (
    <View>
      <SectionTitle title={S.practices} />
      <View style={styles.practices}>
        {practices.map((p, i) => (
          <View key={i} testID="me-practice" style={styles.practice}>
            <View style={styles.badge}>
              <Txt variant="label" color="accentText" style={styles.strongOnly}>
                {String(i + 1)}
              </Txt>
            </View>
            <View style={styles.practiceText}>
              <Txt variant="stat" keepAll>
                {p.title}
              </Txt>
              <Txt variant="desc" color="gray" keepAll>
                {p.body}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      {area.reason ? <ReasonLine reason={area.reason} chart={chart} style={styles.reason} /> : null}
    </View>
  );
}

function Closer({ closer }: { closer: NonNullable<MeAreaReport['closer']> }) {
  const C = L.closer;
  const steps = [
    { label: S.closer.first, text: closer.first, color: Colors.muted },
    { label: S.closer.close, text: closer.close, color: Colors.primaryBright },
    { label: S.closer.longtime, text: closer.longtime, color: BrandColors.core },
  ];
  return (
    <View>
      <SectionTitle title={S.closer.title} />
      <View style={styles.closer}>
        {/* 첫 칸 가운데에서 끝 칸 가운데까지 옅은 색에서 주색으로 이어지는 선(점점 가까워짐) */}
        <View aria-hidden style={styles.closerTrack}>
          <View style={styles.closerLine}>
            <Svg width="100%" height={C.line}>
              <Defs>
                <LinearGradient id="meCloser" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={Colors.muted} />
                  <Stop offset="1" stopColor={Colors.primary} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height={C.line} fill="url(#meCloser)" />
            </Svg>
          </View>
        </View>
        {steps.map((s, i) => (
          <View key={s.label} testID="me-closer" style={styles.closerStep}>
            <View style={styles.dotBox}>
              <View
                style={{
                  width: C.dots[i],
                  height: C.dots[i],
                  borderRadius: C.dots[i] / 2,
                  backgroundColor: s.color,
                  boxShadow: C.glow[i] ? `0 0 ${C.glow[i]}px ${BrandColors.glowMid}` : undefined,
                }}
              />
            </View>
            <Txt variant="captionStrong" style={styles.strongOnly}>
              {s.label}
            </Txt>
            <Txt variant="statLabel" color="gray" keepAll style={styles.center}>
              {s.text}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function WorkStyle({ value }: { value: NonNullable<MeAreaReport['workStyle']> }) {
  const W = S.workStyle;
  const rows = [
    { key: 'together', ends: W.together, v: value.together },
    { key: 'flexible', ends: W.flexible, v: value.flexible },
    { key: 'fast', ends: W.fast, v: value.fast },
  ];
  return (
    <View>
      <SectionTitle title={W.title} />
      <View style={styles.work}>
        {rows.map((r) => (
          // 숫자는 적지 않는다 — 서버가 준 값의 자리에 점만(결정 048 의 3). 화면 읽기는 양 끝의 말만 읽는다
          <View
            key={r.key}
            testID="me-work-row"
            accessible
            accessibilityLabel={`${r.ends[0]}${W.between}${r.ends[1]}${W.betweenSuffix}`}
            style={styles.workRow}>
            <Txt variant="caption" color="gray" style={[styles.workLabel, styles.right]}>
              {r.ends[0]}
            </Txt>
            <View style={styles.bar}>
              <View testID="me-work-fill" style={[styles.fill, { width: `${r.v}%` }]}>
                <Svg width="100%" height={L.work.bar}>
                  <Defs>
                    <LinearGradient id={`meWork${r.key}`} x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={BrandColors.glow} />
                      <Stop offset="1" stopColor={Colors.primaryBright} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height={L.work.bar} rx={L.work.bar / 2} fill={`url(#meWork${r.key})`} />
                </Svg>
              </View>
              <View testID="me-work-dot" style={[styles.dot, { left: `${r.v}%` }]} />
            </View>
            <Txt variant="caption" color="gray" style={styles.workLabel}>
              {r.ends[1]}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function Shaken({ shaken }: { shaken: NonNullable<MeAreaReport['shaken']> }) {
  const card = (title: string, text: string) => (
    <View style={[styles.block, styles.flex, styles.shakenCard]}>
      <Txt variant="captionStrong" color="accentText" style={styles.strongOnly}>
        {title}
      </Txt>
      <Txt variant="desc" color="inkSoft" keepAll>
        {text}
      </Txt>
    </View>
  );
  return (
    <View>
      <SectionTitle title={S.shaken.title} />
      <View style={[styles.pair, styles.shakenRow]}>
        {card(S.shaken.when, shaken.when)}
        <Svg width={L.shaken.arrow} height={L.shaken.arrow} viewBox="0 0 24 24" fill="none" style={styles.arrow}>
          <Path d="M5 12h14M13 6l6 6-6 6" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {card(S.shaken.comfort, shaken.comfort)}
      </View>
    </View>
  );
}

const H = L.hero;
const C = L.closer;
const W = L.work;

const styles = StyleSheet.create({
  root: { gap: L.sectionGap, paddingTop: L.contentTop },
  hero: {
    overflow: 'hidden',
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    paddingTop: H.padTop,
    paddingHorizontal: H.padX,
    paddingBottom: H.padBottom,
  },
  art: { position: 'absolute', right: H.artInset, top: H.artInset },
  heroTitle: { marginTop: H.titleTop, marginRight: H.titleRight },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: H.keywordGap, marginTop: H.keywordsTop },
  keyword: {
    height: H.keyword,
    paddingHorizontal: H.keywordPadX,
    borderRadius: H.keyword / 2,
    borderWidth: LineWidth,
    borderColor: Colors.keywordLine,
    backgroundColor: Colors.keyword,
    justifyContent: 'center',
  },
  stars: { marginTop: H.starsTop, paddingTop: H.starsPadTop, borderTopWidth: LineWidth, borderTopColor: Colors.hair, gap: H.starsGap },
  starList: { flexDirection: 'row', flexWrap: 'wrap', rowGap: H.starsGap, columnGap: H.starGapX },
  star: { flexDirection: 'row', alignItems: 'center', gap: H.starsGap },
  strong: { color: Colors.ink, fontWeight: FontWeight.semibold },
  strongOnly: { fontWeight: FontWeight.semibold },
  pair: { flexDirection: 'row', gap: L.block.gap, marginTop: L.block.top },
  flex: { flex: 1 },
  block: {
    padding: L.block.pad,
    gap: L.block.innerGap,
    borderRadius: L.block.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  practices: { marginTop: L.block.top, gap: L.practice.listGap },
  practice: {
    flexDirection: 'row',
    gap: L.practice.gap,
    padding: L.practice.pad,
    borderRadius: L.block.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  badge: {
    width: L.practice.badge,
    height: L.practice.badge,
    borderRadius: L.practice.badge / 2,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceText: { flex: 1, gap: L.practice.textGap },
  closer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: L.block.top,
    paddingVertical: C.padV,
    paddingHorizontal: C.padH,
    borderRadius: L.block.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  // 세 칸의 가운데를 잇는다: 안쪽 여백을 뺀 폭의 1/6 씩 안으로, 점 칸(24)의 가운데 높이
  closerTrack: { position: 'absolute', left: C.padH, right: C.padH, top: C.padV + (C.dotBox - C.line) / 2 },
  closerLine: { marginHorizontal: `${100 / 6}%` },
  closerStep: { flex: 1, alignItems: 'center', gap: C.gap },
  dotBox: { height: C.dotBox, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  work: {
    marginTop: L.block.top,
    paddingVertical: W.padV,
    paddingHorizontal: W.padH,
    gap: W.gap,
    borderRadius: L.block.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  workRow: { flexDirection: 'row', alignItems: 'center', gap: W.rowGap },
  workLabel: { width: W.label },
  right: { textAlign: 'right' },
  bar: { flex: 1, height: W.bar, borderRadius: W.bar / 2, backgroundColor: Colors.hair },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', borderRadius: W.bar / 2 },
  dot: {
    position: 'absolute',
    top: (W.bar - W.dot) / 2,
    marginLeft: -W.dot / 2,
    width: W.dot,
    height: W.dot,
    borderRadius: W.dot / 2,
    backgroundColor: BrandColors.core,
    boxShadow: `0 0 8px ${BrandColors.glowMid}`,
  },
  shakenRow: { gap: L.shaken.gap },
  shakenCard: { gap: L.shaken.innerGap },
  arrow: { alignSelf: 'center' },
  number: { color: Colors.primaryBright, fontWeight: FontWeight.semibold, letterSpacing: L.paragraph.numberTracking },
  paragraphTitle: { marginTop: L.paragraph.titleTop },
  paragraphBody: { marginTop: L.paragraph.bodyTop },
  reason: { marginTop: ReasonLayout.top },
});
