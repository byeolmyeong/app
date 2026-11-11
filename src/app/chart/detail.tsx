import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/data-table';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
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
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;
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

  let columns: DataTableColumn[];
  let rows;
  if (tab === 'houses' && withHouses) {
    columns = [
      { key: 'house', title: C.house, bold: true },
      { key: 'sign', title: C.sign },
      { key: 'degree', title: C.degree, align: right },
    ];
    rows = houseRows(chart);
  } else if (tab === 'aspects') {
    columns = [
      { key: 'pair', title: C.pair, bold: true, flex: 1.6 },
      { key: 'aspect', title: C.aspect, flex: 0.7 },
      { key: 'orb', title: C.orb, align: right, flex: 0.8 },
      { key: 'motion', title: C.motion, align: right, flex: 1.3 },
    ];
    rows = aspectRows(chart);
  } else {
    columns = [
      { key: 'bodyCell', title: C.body, flex: 1.5 },
      { key: 'sign', title: C.sign },
      { key: 'degree', title: C.degree, align: right },
      ...(withHouses ? [{ key: 'house', title: C.house, align: right, flex: 0.7 }] : []),
    ];
    rows = planetRows(chart).map((r) => ({
      ...r,
      bodyCell: <BodyCell name={String(r.body)} retrograde={r.retrograde === true} />,
    }));
  }

  return (
    <Screen nav={nav}>
      <Tabs tabs={tabKeys.map((key) => ({ key, label: S.tabs[key] }))} value={tab} onChange={setTab} />
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
