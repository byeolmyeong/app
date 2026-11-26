import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { skyDetail } from '@/features/chart/chart-rows';
import { ChartWheel } from '@/features/chart/ChartWheel';
import { SkyList } from '@/features/chart/sky-list';
import { SkySheet } from '@/features/chart/sky-sheet';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { useTrackOnce } from '@/lib/analytics';

const S = strings.skyMap;
/** 처음 들어오면 해를 고른 채로 보여 준다(시안 13) */
const FIRST_SELECTED = 'SUN';

/**
 * 내 하늘 지도(시안 13 · 13-1 · 13-2): 휠 + "별마다 있던 자리". 줄을 누르면 그 별이 휠에서 빛나고 시트가 열린다 — 지도 아래의 안내 글
 * ("별을 누르면 …")은 뺐다(소유자, 빌드 11 · 결정 078). 휠 바로 아래에 목록이 온다(사이 32).
 * 이유 줄의 "하늘 지도에서 보기"(결정 054 의 4)는 `/chart?selected=MOON` 처럼 고른 별을 실어 온다 — 고를 수 없는 값이면 해를 고른다.
 * 시각 "모름" 이면 하우스 · 첫인상 · 꿈의 자리를 보여 주지 않는다. 맨 아래 "차트 자세히" 줄은 뺐다 — 목록으로 끝난다(소유자, 빌드 11 · 결정 078).
 * 숫자 표 화면(`/chart/detail`)은 남아 있지만 앱 안에서 가는 길은 없다.
 */
export default function ChartScreen() {
  const { loaded, chart } = useBirthProfile();
  useTrackOnce('chart_viewed', { time_known: chart?.timeKnown ?? false }, chart !== null);
  const { selected: asked } = useLocalSearchParams<{ selected?: string }>();
  // 실어 온 별은 차트를 읽은 뒤에 가린다(시각 "모름" 이면 상승점 · 중천은 고를 수 없다). 줄을 누르기 전까지만 쓴다
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? (asked && chart && skyDetail(chart, asked) ? asked : FIRST_SELECTED);
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
    setPicked(key);
    setSheetOpen(true);
  };

  return (
    <Screen nav={nav}>
      <View>
        <View style={styles.wheel}>
          {/* 휠은 미루지 않는다 — 화면이 열릴 때 원과 글자를 한 번에(소유자 빌드 14, 결정 090 — 빌드 10 의 "밀기 뒤에" 대체) */}
          <ChartWheel chart={chart} selected={selected} />
        </View>
        <View style={styles.list}>
          <SkyList chart={chart} selected={selected} onSelect={select} />
        </View>
      </View>
      <SkySheet chart={chart} selected={selected} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wheel: { marginTop: Spacing.md },
  list: { marginTop: Spacing.xl },
});
