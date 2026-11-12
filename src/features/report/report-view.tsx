import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paragraph } from '@/components/paragraph';
import { Tabs } from '@/components/tabs';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { TimingView } from '@/features/report/timing-view';
import type { Report, ReportArea } from '@/lib/api';

const S = strings.report;

/** 다섯째 탭 시기. 글 영역(`report.sections`)이 아니라 `report.timing` 을 그린다 */
export const TIMING_TAB = 'TIMING';
export type ReportTab = ReportArea | typeof TIMING_TAB;

/**
 * 심층 리포트의 글: 영역 탭(성격 · 관계 · 일 · 감정 · 시기)과 고른 영역의 제목 · 문단들(근거 줄 · 제목 · 본문).
 * 시기 탭은 `TimingView` 가 그린다. 서버가 준 글과 근거를 그대로 그린다. 앱은 글을 만들거나 고치지 않는다.
 * timingShare 는 시기 탭의 "지금 나의 구간" 아래에 두는 것(다음 변곡점 공유 버튼)이고 화면이 넣는다.
 */
export function ReportView({
  report,
  initialArea,
  timingShare,
}: {
  report: Report;
  initialArea?: ReportTab;
  timingShare?: ReactNode;
}) {
  const [area, setArea] = useState<ReportTab>(initialArea ?? report.sections[0].area);
  const section = report.sections.find((s) => s.area === area) ?? report.sections[0];
  const tabs: { key: ReportTab; label: string }[] = [
    ...report.sections.map((s) => ({ key: s.area, label: S.areas[s.area] })),
    { key: TIMING_TAB, label: S.areas.TIMING },
  ];
  return (
    <View>
      <Tabs tabs={tabs} value={area} onChange={setArea} />
      {area === TIMING_TAB ? (
        <TimingView timing={report.timing} share={timingShare} />
      ) : (
        <View style={styles.section}>
          <Txt variant="title">{section.title}</Txt>
          {section.paragraphs.map((paragraph, i) => (
            <Paragraph key={i} title={paragraph.title} body={paragraph.body} basis={paragraph.basis} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.xl, paddingTop: Spacing.lg },
});
