import { StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Spacing } from '@/constants/theme';
import type { LegalBlock, LegalDocument } from '@/content/legal';
import { strings } from '@/content/strings';

const L = strings.legal;

export type TextPageProps = {
  /** 약관 · 처리방침 같은 글 한 편(`src/content/legal.ts`). 머리의 제목은 글의 title 이다 */
  doc: LegalDocument;
  onBack: () => void;
};

/**
 * 글만 있는 화면(약관 · 처리방침 · 마케팅 수신 동의, 결정 043). 랜딩(byeolmyeong.com)의 같은 글과 같은 순서로
 * 머리말 → 조항(제목 · 문단 · 글머리 목록 · 번호 목록 · 표) → 마지막 시행 문구를 그린다.
 * 표는 폰 폭에서 칸이 좁아지지 않게 행마다 카드 한 장으로 쌓고, 카드 안에 "머리 · 값" 을 위아래로 적는다.
 */
export function TextPage({ doc, onBack }: TextPageProps) {
  return (
    <Screen nav={<NavBar title={doc.title} onBack={onBack} />}>
      <View style={styles.body}>
        <Txt variant="body" color="gray">
          {doc.intro}
        </Txt>
        {doc.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Txt variant="heading" accessibilityRole="header">
              {section.title}
            </Txt>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </View>
        ))}
        <Txt variant="caption" color="hint" style={styles.closing}>
          {doc.closing}
        </Txt>
      </View>
    </Screen>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if ('p' in block) {
    return (
      <Txt variant="body" color="gray">
        {block.p}
      </Txt>
    );
  }
  if ('ul' in block || 'ol' in block) {
    const items = 'ul' in block ? block.ul : block.ol;
    return (
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item} style={styles.item}>
            <Txt variant="body" color="hint" style={styles.marker}>
              {'ul' in block ? L.bullet : `${i + 1}${L.numberSuffix}`}
            </Txt>
            <Txt variant="body" color="gray" style={styles.itemText}>
              {item}
            </Txt>
          </View>
        ))}
      </View>
    );
  }
  const { head, rows } = block.table;
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.join('|')} testID="legal-table-card" style={styles.card}>
          {row.map((cell, c) => (
            <View key={c} style={styles.cell}>
              <Txt variant="caption" color="hint">
                {head[c]}
              </Txt>
              <Txt variant="body" color={c === 0 ? 'ink' : 'gray'}>
                {cell}
              </Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.xl, paddingTop: Spacing.md },
  section: { gap: Spacing.sm },
  list: { gap: Spacing.xs },
  item: { flexDirection: 'row', gap: Spacing.xxs },
  /** 글머리 · 번호 칸. 번호가 한 자리라 칸 폭은 고정이다 */
  marker: { width: Spacing.md },
  itemText: { flex: 1 },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.fill,
  },
  cell: { gap: Spacing.xxs },
  closing: { paddingTop: Spacing.md, borderTopWidth: LineWidth, borderTopColor: Colors.hair },
});
