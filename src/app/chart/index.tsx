import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { usePushSettled } from '@/components/use-push-settled';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { showsHouses, skyDetail } from '@/features/chart/chart-rows';
import { ChartWheel, ChartWheelPlaceholder } from '@/features/chart/ChartWheel';
import { SkyList } from '@/features/chart/sky-list';
import { SkySheet } from '@/features/chart/sky-sheet';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

const S = strings.skyMap;
/** 처음 들어오면 해를 고른 채로 보여 준다(시안 13) */
const FIRST_SELECTED = 'SUN';

/**
 * 내 하늘 지도(시안 13 · 13-1 · 13-2): 휠 + "별마다 있던 자리". 줄을 누르면 그 별이 휠에서 빛나고 시트가 열린다.
 * 이유 줄의 "하늘 지도에서 보기"(결정 054 의 4)는 `/chart?selected=MOON` 처럼 고른 별을 실어 온다 — 고를 수 없는 값이면 해를 고른다.
 * 시각 "모름" 이면 하우스 · 첫인상 · 꿈의 자리를 보여 주지 않는다. 숫자 표는 맨 아래 "차트 자세히" 에 있다.
 */
export default function ChartScreen() {
  const { loaded, chart } = useBirthProfile();
  const { selected: asked } = useLocalSearchParams<{ selected?: string }>();
  // 실어 온 별은 차트를 읽은 뒤에 가린다(시각 "모름" 이면 상승점 · 중천은 고를 수 없다). 줄을 누르기 전까지만 쓴다
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? (asked && chart && skyDetail(chart, asked) ? asked : FIRST_SELECTED);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 휠 SVG(고리 · 하우스 · 별 점과 이름)는 무겁다 — 미는 동안에는 같은 크기의 자리만, 밀기가 끝난 뒤 그린다(빌드 10)
  const settled = usePushSettled();
  const nav = <NavBar title={S.title} onBack={goBackOrHome} chevron />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!chart)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  const select = (key: string) => {
    setPicked(key);
    setSheetOpen(true);
  };

  return (
    <Screen nav={nav}>
      <View>
        <View style={styles.wheel}>
          {settled ? <ChartWheel chart={chart} selected={selected} /> : <ChartWheelPlaceholder chart={chart} />}
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
