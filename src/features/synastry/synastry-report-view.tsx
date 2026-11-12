import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paragraph } from '@/components/paragraph';
import { Tabs } from '@/components/tabs';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { SynastryReport, SynastryReportArea } from '@/lib/api';

const S = strings.synastry.report;

/**
 * 궁합 리포트의 글: 영역 탭(끌림 · 대화 · 갈등 · 오래가기)과 고른 영역의 제목 · 문단들(근거 줄 · 제목 · 본문).
 * 심층 리포트와 같은 탭 · 문단 부품을 쓴다. 서버가 준 글과 근거를 그대로 그린다.
 */
export function SynastryReportView({ report }: { report: SynastryReport }) {
  const [area, setArea] = useState<SynastryReportArea>(report.sections[0].area);
  const section = report.sections.find((s) => s.area === area) ?? report.sections[0];
  return (
    <View>
      <Tabs
        tabs={report.sections.map((s) => ({ key: s.area, label: S.areas[s.area] }))}
        value={area}
        onChange={setArea}
      />
      <View style={styles.section}>
        <Txt variant="title">{section.title}</Txt>
        {section.paragraphs.map((paragraph, i) => (
          <Paragraph key={i} title={paragraph.title} body={paragraph.body} basis={paragraph.basis} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.xl, paddingTop: Spacing.lg },
});
