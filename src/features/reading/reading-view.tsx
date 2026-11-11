import { StyleSheet, View } from 'react-native';

import { Paragraph } from '@/components/paragraph';
import { SectionHead } from '@/components/section-head';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { Reading } from '@/lib/api';

const S = strings.reading;

/**
 * 요약 해석의 글: 한 줄 총평 → 문단들(근거 줄 · 제목 · 본문) → 강점 · 보완점.
 * 서버가 준 글과 근거를 그대로 그린다. 앱은 글을 만들거나 고치지 않는다.
 */
export function ReadingView({ reading }: { reading: Reading }) {
  return (
    <View style={styles.root}>
      <Txt variant="display">{reading.headline}</Txt>
      {reading.sections.map((section, i) => (
        <Paragraph key={i} title={section.title} body={section.body} basis={section.basis} />
      ))}
      <ItemList title={S.strengths} items={reading.strengths} />
      <ItemList title={S.cautions} items={reading.cautions} />
    </View>
  );
}

function ItemList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHead title={title} />
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Txt variant="body" color="gray">
            {S.bullet}
          </Txt>
          <Txt variant="body" style={styles.itemText}>
            {item}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.xl, paddingTop: Spacing.lg },
  section: { gap: Spacing.xs },
  item: { flexDirection: 'row', gap: Spacing.xs },
  itemText: { flex: 1 },
});
