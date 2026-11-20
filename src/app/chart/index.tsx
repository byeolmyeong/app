import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { showsHouses } from '@/features/chart/chart-rows';
import { ChartWheel } from '@/features/chart/ChartWheel';
import { SkyList } from '@/features/chart/sky-list';
import { SkySheet } from '@/features/chart/sky-sheet';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

const S = strings.skyMap;
/** 처음 들어오면 해를 고른 채로 보여 준다(시안 13) */
const FIRST_SELECTED = 'SUN';

/**
 * 내 하늘 지도(시안 13 · 13-1 · 13-2): 휠 + "별마다 있던 자리". 줄을 누르면 그 별이 휠에서 빛나고 시트가 열린다.
 * 시각 "모름" 이면 하우스 · 첫인상 · 꿈의 자리를 보여 주지 않는다. 숫자 표는 맨 아래 "차트 자세히" 에 있다.
 */
export default function ChartScreen() {
  const { loaded, chart } = useBirthProfile();
  const [selected, setSelected] = useState(FIRST_SELECTED);
  const [sheetOpen, setSheetOpen] = useState(false);
  const nav = <NavBar title={S.title} onBack={goBackOrHome} chevron />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!chart)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  const select = (key: string) => {
    setSelected(key);
    setSheetOpen(true);
  };

  return (
    <Screen nav={nav}>
      <View>
        <View style={styles.wheel}>
          <ChartWheel chart={chart} selected={selected} />
        </View>
        <Txt variant="note" color="hint" style={styles.hint}>
          {S.hint}
        </Txt>
        <View style={styles.list}>
          <SkyList chart={chart} selected={selected} onSelect={select} />
        </View>
        {showsHouses(chart) ? null : (
          <Txt variant="label" color="gray" style={styles.note}>
            {S.timeUnknownNote}
          </Txt>
        )}
        <View style={styles.detail}>
          <ListRow label={S.detail} onPress={() => router.push('/chart/detail')} />
        </View>
      </View>
      <SkySheet chart={chart} selected={selected} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wheel: { marginTop: Spacing.md },
  hint: { marginTop: Spacing.sm, textAlign: 'center' },
  list: { marginTop: Spacing.xl },
  note: { marginTop: Spacing.md },
  detail: { marginTop: Spacing.lg },
});
