import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Sizes, SkyMapLayout as L, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { skyDetail, type SkyTerm } from '@/features/chart/chart-rows';
import type { Chart } from '@/lib/api';

const S = strings.skyMap;
type TipKey = 'sign' | 'house' | 'relations';

export type SkySheetProps = {
  chart: Chart;
  /** 고른 별(천체 식별자 · 'ASC' · 'MC') */
  selected: string | null;
  visible: boolean;
  onClose: () => void;
};

/**
 * 별을 누르면 올라오는 시트(시안 13-1): 이름 · 짧은 주제와 한 줄 뜻 · 별자리 · 하우스(시각을 알 때만) · 다른 별과의 관계.
 * 별자리 · 하우스 · 관계 옆의 물음표는 말풍선(시안 13-2)이고 한 번에 하나만 열린다.
 */
export function SkySheet({ chart, selected, visible, onClose }: SkySheetProps) {
  const [tip, setTip] = useState<TipKey | null>(null);
  const detail = selected ? skyDetail(chart, selected) : null;
  const toggle = (key: TipKey) => setTip((open) => (open === key ? null : key));
  const close = () => {
    setTip(null);
    onClose();
  };
  return (
    <Sheet visible={visible && detail !== null} onClose={close} gap={0}>
      {detail ? (
        <>
          <View style={styles.head}>
            <Txt variant="sheetTitle">{detail.title}</Txt>
            <Txt variant="desc" color="gray" style={styles.subtitle}>
              {detail.subtitle}
            </Txt>
          </View>
          <View style={styles.terms}>
            <Term term={detail.sign} open={tip === 'sign'} onToggle={() => toggle('sign')} testID="tip-sign" />
            {detail.house ? (
              <Term term={detail.house} open={tip === 'house'} onToggle={() => toggle('house')} testID="tip-house" />
            ) : null}
          </View>
          <View style={styles.relationsHead}>
            <InfoTip
              testID="tip-relations"
              label={S.relationsQuestion}
              title={S.relations}
              text={S.relationsTip}
              open={tip === 'relations'}
              onToggle={() => toggle('relations')}>
              <Txt variant="item" style={styles.strong}>
                {S.relations}
              </Txt>
            </InfoTip>
          </View>
          {detail.relations.length === 0 ? (
            <Txt variant="desc" color="hint" style={styles.none}>
              {S.noRelations}
            </Txt>
          ) : (
            <ScrollView style={styles.relations} showsVerticalScrollIndicator={false}>
              {detail.relations.map((r) => (
                <View key={`${r.key}-${r.aspect}`} testID="sky-relation" style={styles.relation}>
                  <View style={styles.side}>
                    <Txt variant="item" style={styles.strong}>
                      {r.name}
                    </Txt>
                    <Txt variant="label" color="hint" style={styles.small}>
                      {r.topic}
                    </Txt>
                  </View>
                  <View style={[styles.side, styles.end]}>
                    <Txt variant="item" color="inkSoft" style={styles.phrase}>
                      {r.phrase}
                    </Txt>
                    <Txt variant="label" color="hint" style={styles.small}>
                      {r.aspect}
                    </Txt>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

/** 별자리 · 하우스 한 항목: 이름과 물음표, 그 아래 한 줄 뜻 */
function Term({ term, open, onToggle, testID }: { term: SkyTerm; open: boolean; onToggle: () => void; testID: string }) {
  return (
    <View style={styles.term}>
      <InfoTip
        testID={testID}
        label={`${term.name}${S.questionSuffix}`}
        title={term.name}
        text={term.tip}
        open={open}
        onToggle={onToggle}>
        <Txt variant="item" style={styles.strong}>
          {term.name}
        </Txt>
      </InfoTip>
      <Txt variant="desc" color="gray">
        {term.meaning}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: Spacing.xs },
  subtitle: { flexShrink: 1 },
  terms: { marginTop: L.termsTop, gap: L.termsGap },
  term: { gap: Spacing.hairline },
  relationsHead: { marginTop: L.relationsTop },
  relations: { marginTop: Spacing.xs, maxHeight: Sizes.infoSheetHeight, flexGrow: 0 },
  none: { marginTop: Spacing.xs },
  relation: {
    minHeight: L.relationRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
  side: { gap: Spacing.hairline },
  end: { alignItems: 'flex-end' },
  strong: { fontWeight: FontWeight.semibold },
  phrase: { fontWeight: FontWeight.medium },
  small: { fontWeight: FontWeight.regular },
});
