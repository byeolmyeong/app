import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DataTable } from '@/components/data-table';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { planetRows, showsHouses } from '@/features/chart/chart-rows';
import { ChartWheel } from '@/features/chart/ChartWheel';
import { KeyThree } from '@/features/chart/key-three';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

const S = strings.chart;

/** 차트: 휠, 핵심 3요소, 태양·달 두 줄, 다음으로 가는 버튼. 로그인 없이 본다. */
export default function ChartScreen() {
  const { loaded, chart } = useBirthProfile();
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!chart)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  const withHouses = showsHouses(chart);
  const columns = [
    { key: 'body', bold: true },
    { key: 'sign' },
    { key: 'degree', align: 'right' as const },
    ...(withHouses ? [{ key: 'house', align: 'right' as const, flex: 0.5 }] : []),
  ];
  const rows = planetRows(chart).filter((r) => r.key === 'SUN' || r.key === 'MOON');

  return (
    <Screen nav={nav}>
      <ChartWheel chart={chart} />
      <KeyThree chart={chart} />
      <DataTable header={false} columns={columns} rows={rows} />
      {withHouses ? null : (
        <Txt variant="label" color="gray">
          {S.timeUnknownNote}
        </Txt>
      )}
      <TextLink label={S.seeAll} onPress={() => router.push('/chart/detail')} />
      {/* 내 별명(태스크 5)·궁합(태스크 7) 화면이 생기면 연결한다. 그때까지 누를 수 없다. */}
      <View style={styles.actions}>
        <Button label={S.readReading} disabled onPress={() => {}} />
        <Button label={S.seeSynastry} variant="line" disabled onPress={() => {}} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 'auto', gap: Spacing.xs, paddingTop: Spacing.xs },
});
