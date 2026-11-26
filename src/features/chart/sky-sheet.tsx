import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, SkyMapLayout as L, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { skyDetail, type SkyRelation, type SkyTerm } from '@/features/chart/chart-rows';
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
            <Txt variant="section">{detail.title}</Txt>
            <Txt variant="small" color="gray" style={styles.subtitle}>
              {detail.subtitle}
            </Txt>
          </View>
          {/* 별자리 말풍선은 시트 위 끝에 막혀 아래로 띄우고, 열린 동안 이 묶음을 관계 칸보다 위에 그린다 */}
          <View style={[styles.terms, tip === 'sign' && styles.raised]}>
            <Term term={detail.sign} open={tip === 'sign'} onToggle={() => toggle('sign')} placement="below" testID="tip-sign" />
            {detail.house ? (
              <Term term={detail.house} open={tip === 'house'} onToggle={() => toggle('house')} testID="tip-house" />
            ) : null}
          </View>
          {detail.relations ? (
            <Relations relations={detail.relations} open={tip === 'relations'} onToggle={() => toggle('relations')} />
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

/** 다른 별과의 관계: 제목과 물음표, 그 아래 관계 줄(없으면 그렇다고 적는다) */
function Relations({ relations, open, onToggle }: { relations: SkyRelation[]; open: boolean; onToggle: () => void }) {
  return (
    <>
      <View style={styles.relationsHead}>
        <InfoTip
          testID="tip-relations"
          label={S.relationsQuestion}
          title={S.relations}
          text={S.relationsTip}
          open={open}
          onToggle={onToggle}>
          <Txt variant="body" style={styles.strong}>
            {S.relations}
          </Txt>
        </InfoTip>
      </View>
      {relations.length === 0 ? (
        <Txt variant="small" color="hint" style={styles.none}>
          {S.noRelations}
        </Txt>
      ) : (
        // 많아도 따로 잘라 굴리지 않는다 — 시트 전체가 화면 위 sheetTop 까지 늘고 그 안에서 굴린다
        <View testID="sky-relations" style={styles.relations}>
          {relations.map((r) => (
            <View key={`${r.key}-${r.aspect}`} testID="sky-relation" style={styles.relation}>
              <View style={styles.side}>
                <Txt variant="body" style={styles.strong}>
                  {r.name}
                </Txt>
                <Txt variant="label" color="hint" style={styles.small}>
                  {r.topic}
                </Txt>
              </View>
              <View style={[styles.side, styles.end]}>
                <Txt variant="body" color="body" style={styles.phrase}>
                  {r.phrase}
                </Txt>
                <Txt variant="label" color="hint" style={styles.small}>
                  {r.aspect}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

/** 별자리 · 하우스 한 항목: 이름과 물음표, 그 아래 한 줄 뜻 */
function Term({
  term,
  open,
  onToggle,
  placement,
  testID,
}: {
  term: SkyTerm;
  open: boolean;
  onToggle: () => void;
  placement?: 'above' | 'below';
  testID: string;
}) {
  return (
    <View style={[styles.term, open && styles.raised]}>
      <InfoTip
        testID={testID}
        placement={placement}
        label={`${term.name}${S.questionSuffix}`}
        title={term.name}
        text={term.tip}
        open={open}
        onToggle={onToggle}>
        <Txt variant="body" style={styles.strong}>
          {term.name}
        </Txt>
      </InfoTip>
      <Txt variant="small" color="gray">
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
  raised: { zIndex: 1 },
  relationsHead: { marginTop: L.relationsTop },
  relations: { marginTop: Spacing.xs },
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
