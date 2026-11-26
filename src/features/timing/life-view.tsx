import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { PracticeCards, PracticeCardsSkeleton, SectionTitle, SectionTitleSkeleton, SkBlock } from '@/features/timing/timing-parts';
import { shownTiming } from '@/features/timing/time-known';
import { mainInterval } from '@/features/timing/year-view';
import type { TimingMilestone, TimingReport } from '@/lib/api';

const T = strings.timing;
const D = T.date;
const F = L.life;

/** 서버가 준 만 나이를 그대로: "만 29세 무렵" */
const ageText = (m: TimingMilestone) => `${D.agePrefix}${m.age}${D.ageSuffix}${T.life.around}`;

/** "다음 큰 변화" 카드의 바탕: 위쪽 옅은 남색에서 카드 면으로(보드 14-2 — 160도 그라데이션) */
function CardFill() {
  const id = `lifeCard${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0.33" y1="0" x2="0.67" y2="1">
          <Stop offset="0" stopColor={BrandColors.lifeCard} />
          <Stop offset="0.7" stopColor={Colors.raised} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * 인생(결정 049 의 4, 캔버스 14-2): "인생의 큰 변화" 안내 · 다음 큰 변화 카드(서버의 해 · 만 나이 · 제목 · 본문 — 오른쪽 위 공유 아이콘은 share 로 화면이 넣는다) ·
 * 큰 변화 네 줄의 길(지난 것은 흐리게, 다음 큰 변화는 빛나는 점) · 이 시기의 작은 실천. 해 · 나이는 서버 값 그대로 — 셈하지 않는다.
 */
export function LifeView({ report: received, share }: { report: TimingReport; share?: ReactNode }) {
  const report = shownTiming(received);
  const next = report.current.nextMilestone ?? null;
  const nextIndex = next ? report.milestones.findIndex((m) => m.kind === next.kind) : report.milestones.length;
  const main = mainInterval(report);
  const last = report.milestones.length - 1;
  return (
    <View style={styles.root}>
      <View>
        <SectionTitle title={T.life.title} note={T.life.note} />
        {next ? (
          <View testID="life-next" style={styles.next}>
            <CardFill />
            {/* 공유 아이콘 자리(보드 14-2 오른쪽 위) — 화면이 공유 아이콘을 넣는다(기능끼리는 import 하지 않는다) */}
            <View testID="life-share-spot" style={styles.shareSpot}>
              {share}
            </View>
            <Txt variant="kicker" color="accentText">
              {T.life.next}
            </Txt>
            <View style={styles.yearRow}>
              <Txt variant="yearBig">{String(next.year)}</Txt>
              <Txt variant="bodyStrong" color="gray" style={styles.regular}>
                {ageText(next)}
              </Txt>
            </View>
            <Txt variant="subhead" keepAll style={styles.nextTitle}>
              {next.title}
            </Txt>
            <Txt variant="small" color="gray" keepAll style={styles.nextBody}>
              {next.body}
            </Txt>
          </View>
        ) : (
          <Txt variant="small" color="gray" style={styles.done}>
            {T.life.done}
          </Txt>
        )}
        <View testID="life-path" style={styles.path}>
          {report.milestones.map((m, i) => {
            const past = i < nextIndex;
            const isNext = i === nextIndex;
            return (
              <View key={m.kind} testID={isNext ? 'life-step-next' : past ? 'life-step-past' : 'life-step'} style={styles.step}>
                <View style={styles.rail}>
                  {i < last ? <View style={styles.railLine} /> : null}
                  <View style={styles.dotBox}>
                    <View style={isNext ? styles.dotNext : [styles.dot, { backgroundColor: past ? Colors.muted : Colors.hair }]} />
                  </View>
                </View>
                <View style={[styles.stepText, i < last && styles.stepGap, past && styles.past]}>
                  <Txt variant="captionStrong" color={isNext ? 'accentText' : 'hint'} style={styles.stepYear}>
                    {`${m.year}${D.separator}${ageText(m)}`}
                  </Txt>
                  <Txt variant="bodyStrong" keepAll>
                    {isNext ? `${m.title}${T.life.nextMark}` : m.title}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {main?.practices ? <PracticeCards practices={main.practices} /> : null}
    </View>
  );
}

/** 인생의 뼈대(결정 071): 제목 · 안내 · 다음 큰 변화 카드 · 네 줄의 길 · 작은 실천 셋 — 다 그려진 인생과 같은 배치 */
export function LifeSkeleton() {
  return (
    <View style={styles.root}>
      <View>
        <SectionTitleSkeleton width="40%" note />
        <SkBlock of="life-next" style={styles.next}>
          <SkeletonText widths={['24%']} variant="kicker" />
          <View style={styles.yearRow}>
            <SkeletonText widths={[F.yearBar]} variant="yearBig" />
            <SkeletonText widths={['24%']} variant="bodyStrong" />
          </View>
          <SkeletonText widths={['64%']} variant="subhead" style={styles.nextTitle} />
          <View style={styles.nextBody}>
            <SkeletonText widths={['100%']} variant="small" />
            <SkeletonText widths={['56%']} variant="small" />
          </View>
        </SkBlock>
        <SkBlock of="life-path" style={styles.path}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} testID="sk-life-step" style={styles.step}>
              <View style={styles.rail}>
                <View style={styles.dotBox}>
                  <Skeleton width={F.dot} height={F.dot} pill />
                </View>
              </View>
              <View style={[styles.stepText, i < 3 && styles.stepGap]}>
                <SkeletonText widths={['36%']} variant="captionStrong" style={styles.stepYearBox} />
                <SkeletonText widths={[i === 1 ? '76%' : '58%']} variant="bodyStrong" />
              </View>
            </View>
          ))}
        </SkBlock>
      </View>
      <PracticeCardsSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: L.sectionGap },
  regular: { fontWeight: FontWeight.regular },
  next: {
    overflow: 'hidden',
    marginTop: F.cardTop,
    padding: F.pad,
    borderRadius: F.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  shareSpot: { position: 'absolute', right: F.shareInset, top: F.shareInset, width: F.shareSpot, height: F.shareSpot },
  yearRow: { flexDirection: 'row', alignItems: 'baseline', gap: F.yearGap, marginTop: F.yearTop },
  nextTitle: { marginTop: F.titleTop },
  nextBody: { marginTop: F.bodyTop },
  done: { marginTop: F.cardTop },
  path: {
    marginTop: F.cardTop,
    padding: F.pathPad,
    borderRadius: F.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  step: { flexDirection: 'row', gap: F.stepGap },
  rail: { width: F.rail },
  railLine: {
    position: 'absolute',
    left: (F.rail - F.railLine) / 2,
    top: F.rail / 2,
    bottom: -F.rail / 2,
    width: F.railLine,
    backgroundColor: Colors.hair,
  },
  dotBox: { width: F.rail, height: F.rail, alignItems: 'center', justifyContent: 'center' },
  dot: { width: F.dot, height: F.dot, borderRadius: F.dot / 2 },
  dotNext: { width: F.dotNext, height: F.dotNext, borderRadius: F.dotNext / 2, backgroundColor: Colors.primary, boxShadow: `0 0 12px ${Colors.primary}` },
  stepText: { flex: 1, gap: F.textGap },
  stepGap: { paddingBottom: F.stepBottom },
  stepYear: { fontWeight: FontWeight.semibold, lineHeight: F.rail },
  stepYearBox: { height: F.rail },
  past: { opacity: F.pastOpacity },
});
