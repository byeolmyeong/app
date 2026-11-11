import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paragraph } from '@/components/paragraph';
import { Tabs } from '@/components/tabs';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { Report, ReportArea } from '@/lib/api';

const S = strings.report;

/**
 * 심층 리포트의 글: 영역 탭(성격 · 관계 · 일 · 감정)과 고른 영역의 제목 · 문단들(근거 줄 · 제목 · 본문).
 * 서버가 준 글과 근거를 그대로 그린다. 앱은 글을 만들거나 고치지 않는다.
 */
export function ReportView({ report, initialArea }: { report: Report; initialArea?: ReportArea }) {
  const [area, setArea] = useState<ReportArea>(initialArea ?? report.sections[0].area);
  const section = report.sections.find((s) => s.area === area) ?? report.sections[0];
  return (
    <View>
      <Tabs tabs={report.sections.map((s) => ({ key: s.area, label: S.areas[s.area] }))} value={area} onChange={setArea} />
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
