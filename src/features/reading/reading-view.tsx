import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { ReadingLayout as L, ReasonLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ReasonLine, ReasonLineSkeleton } from '@/features/reason/reason-line';
import type { Chart, Reading } from '@/lib/api';

const S = strings.reading;
const K = L.skeleton;

export type ReadingViewProps = {
  reading: Reading;
  /** 그 사람의 차트(이유 줄의 하우스 · 작은 지도). 없으면 하우스 부분 없이 */
  chart: Chart | null;
  /** 한 줄 별명 아래의 별자리 카드(화면이 차트 기능으로 만들어 넘긴다) */
  card?: ReactNode;
};

/**
 * 내 별명의 글(보드 12): 한 줄 별명 → 별자리 카드 → 문단들(제목 · 본문 · 접힌 "이렇게 풀이한 이유") → 강점 · 보완점.
 * 서버가 준 글과 근거를 그대로 그린다. 앱은 글을 만들거나 고치지 않는다. 내 별명 화면과 나 탭(받기 전)이 함께 쓴다.
 * 면책 문구는 두지 않는다(결정 064).
 */
export function ReadingView({ reading, chart, card }: ReadingViewProps) {
  return (
    <View>
      <Txt testID="reading-headline" variant="hero" keepAll style={styles.headline}>
        {reading.headline}
      </Txt>
      {card ? <View style={styles.card}>{card}</View> : null}
      <View style={styles.sections}>
        {reading.sections.map((section, i) => (
          <View key={i} testID="reading-section">
            <Txt variant="paragraphTitle" keepAll>
              {section.title}
            </Txt>
            <Txt variant="paragraph" color="inkSoft" keepAll style={styles.body}>
              {section.body}
            </Txt>
            <ReasonLine reason={section.reason} chart={chart} style={styles.reason} />
          </View>
        ))}
      </View>
      <View style={styles.lists}>
        <ItemList title={S.strengths} items={reading.strengths} />
        <ItemList title={S.cautions} items={reading.cautions} />
      </View>
    </View>
  );
}

function ItemList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View testID="reading-list" style={styles.list}>
      <Txt variant="emphasis">{title}</Txt>
      <View style={styles.items}>
        {items.map((item, i) => (
          <View key={i} testID="reading-item" style={styles.item}>
            <Txt variant="paragraph" color="hint" aria-hidden>
              {S.bullet}
            </Txt>
            <Txt variant="paragraph" color="inkSoft" keepAll style={styles.itemText}>
              {item}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * 내 별명 글의 뼈대(결정 071, 보드 12): 글과 같은 틀로 한 줄 별명 두 줄 → 별자리 카드(화면이 넘긴다) →
 * 문단 다섯(제목 한 줄 · 본문 다섯 줄 · 접힌 이유 상자) → 강점 셋 · 보완점 둘. 내 별명 화면과 나 탭(받기 전)이 함께 쓴다.
 */
export function ReadingSkeleton({ card }: { card?: ReactNode }) {
  return (
    <View>
      <View testID="reading-headline-skeleton" style={styles.headline}>
        <SkeletonText variant="hero" widths={K.headline} />
      </View>
      {card ? <View style={styles.card}>{card}</View> : null}
      <View style={styles.sections}>
        {Array.from({ length: K.sections }, (_, i) => (
          <View key={i} testID="reading-section-skeleton">
            <SkeletonText variant="paragraphTitle" widths={K.title} />
            <SkeletonText variant="paragraph" widths={K.body} style={styles.body} />
            <ReasonLineSkeleton style={styles.reason} />
          </View>
        ))}
      </View>
      <View style={styles.lists}>
        <ItemListSkeleton title={K.strengthsTitle} items={K.strengths} />
        <ItemListSkeleton title={K.cautionsTitle} items={K.cautions} />
      </View>
    </View>
  );
}

function ItemListSkeleton({ title, items }: { title: number; items: readonly DimensionValue[] }) {
  return (
    <View testID="reading-list-skeleton" style={styles.list}>
      <SkeletonText variant="emphasis" widths={[title]} />
      <View style={styles.items}>
        {items.map((width, i) => (
          <View key={i} testID="reading-item-skeleton">
            <SkeletonText variant="paragraph" widths={[width]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { marginTop: L.headlineTop },
  card: { marginTop: L.cardTop },
  sections: { marginTop: L.sectionsTop, gap: L.sectionsGap },
  body: { marginTop: L.bodyTop },
  reason: { marginTop: ReasonLayout.top },
  lists: { marginTop: L.listsTop, gap: L.listsGap },
  list: { gap: L.listGap },
  items: { gap: L.itemGap },
  item: { flexDirection: 'row', gap: L.itemGap },
  itemText: { flex: 1 },
});
