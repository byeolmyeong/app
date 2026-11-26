import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/data-table';
import { InfoButton } from '@/components/info-button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionHead } from '@/components/section-head';
import { Tabs } from '@/components/tabs';
import { Txt } from '@/components/txt';
import { strings } from '@/content/strings';
import { formatBirthSummary } from '@/features/chart/birth-input';
import { BodyCell } from '@/features/chart/body-cell';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { aspectRows, houseRows, planetRows, showsHouses } from '@/features/chart/chart-rows';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

const S = strings.detail;
const C = S.columns;
type TabKey = keyof typeof S.tabs;

/** 차트 자세히: 행성·하우스·각도의 전체 수치 표. 시각 "모름" 이면 하우스 탭과 하우스 칸이 없다. */
export default function ChartDetailScreen() {
  const { loaded, chart, profile } = useBirthProfile();
  const [tab, setTab] = useState<TabKey>('planets');
  const nav = <NavBar title={S.title} onBack={goBackOrHome} chevron />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!chart || !profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  const withHouses = showsHouses(chart);
  const tabKeys: TabKey[] = withHouses ? ['planets', 'houses', 'aspects'] : ['planets', 'aspects'];
  const right = 'right' as const;
  // 시각을 모르면 하우스 탭이 없으니 그때 고른 탭이 하우스일 수 없다
  const shownTab = tab === 'houses' && !withHouses ? 'planets' : tab;
  const help = strings.help[shownTab];

  let columns: DataTableColumn[];
  let rows;
  if (tab === 'houses' && withHouses) {
    columns = [
      { key: 'houseCell', title: C.house },
      { key: 'sign', title: C.sign },
      { key: 'degree', title: C.degree, align: right },
    ];
    rows = houseRows(chart).map((r) => ({
      ...r,
      houseCell: <BodyCell name={String(r.house)} meaning={String(r.meaning)} />,
    }));
  } else if (tab === 'aspects') {
    columns = [
      { key: 'pair', title: C.pair, bold: true, flex: 1.5 },
      { key: 'aspectCell', title: C.aspect },
      { key: 'orb', title: C.orb, align: right },
      { key: 'motion', title: C.motion, align: right },
    ];
    rows = aspectRows(chart).map((r) => ({
      ...r,
      aspectCell: <BodyCell name={String(r.aspect)} meaning={String(r.meaning)} />,
    }));
  } else {
    // 행성 표는 머리 줄과 칸 모두 가운데(천체 칸의 쉬운 말 · 역행 포함, 소유자 2026-11-21)
    const center = 'center' as const;
    columns = [
      { key: 'bodyCell', title: C.body, flex: 1.5, align: center },
      { key: 'sign', title: C.sign, align: center },
      { key: 'degree', title: C.degree, align: center },
      ...(withHouses ? [{ key: 'house', title: C.house, align: center }] : []),
    ];
    rows = planetRows(chart).map((r) => ({
      ...r,
      bodyCell: <BodyCell name={String(r.body)} retrograde={r.retrograde === true} meaning={String(r.meaning)} center />,
    }));
  }

  return (
    <Screen nav={nav}>
      <Tabs tabs={tabKeys.map((key) => ({ key, label: S.tabs[key] }))} value={tab} onChange={setTab} />
      <Txt variant="table" color="gray">
        {S.intro[shownTab]}
      </Txt>
      <SectionHead title={S.helpLabel}>
        <InfoButton testID="info-detail" title={help.title} items={help.items} />
      </SectionHead>
      <DataTable columns={columns} rows={rows} />
      {withHouses ? null : (
        <Txt variant="label" color="gray">
          {strings.chart.timeUnknownNote}
        </Txt>
      )}
      <Txt variant="label" color="gray">
        {formatBirthSummary(profile)}
      </Txt>
    </Screen>
  );
}
