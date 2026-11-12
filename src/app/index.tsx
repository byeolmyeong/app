import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChartMark } from '@/components/chart-mark';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionHead } from '@/components/section-head';
import { Txt } from '@/components/txt';
import { Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { BirthForm } from '@/features/chart/birth-form';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartPicture } from '@/features/chart/ChartWheel';
import { KeyThree } from '@/features/chart/key-three';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { HomeCategories } from '@/features/home/home-categories';
import { HomeReadingCard } from '@/features/home/home-reading-card';
import { MainTabs } from '@/features/home/main-tabs';
import { useStoredReading } from '@/features/reading/use-reading';

/**
 * 홈. 출생 정보가 있으면 카테고리(나 · 관계 · 궁합 · 시기), 나의 한 줄 총평, 나를 이루는 세 가지와 아래 탭을 보여 주고,
 * 없으면 출생 정보 입력부터 받는다(결정 019).
 * 기기 저장소를 읽기 전에는 아무것도 그리지 않는다(입력 화면이 잠깐 비쳤다가 바뀌지 않게).
 */
export default function HomeScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  // 받아 둔 풀이가 있으면 한 줄 총평을 홈에 올린다(서버를 부르지 않는다).
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  const { reading } = useStoredReading(input);
  const nav = <NavBar left={<ChartMark />} />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (profile && chart)
    return (
      <Screen nav={nav} footer={<MainTabs active="home" />}>
        <HomeCategories onOpen={(path) => router.push(path)} />
        <HomeReadingCard
          headline={reading?.headline ?? null}
          picture={<ChartPicture chart={chart} size={Sizes.homePicture} named={false} />}
          onOpen={() => router.push('/reading')}
        />
        <SectionHead title={strings.chart.keyThreeHeading} />
        <KeyThree chart={chart} />
      </Screen>
    );
  return (
    <Screen nav={nav}>
      <View style={styles.intro}>
        <Txt variant="display">{strings.home.title}</Txt>
        <Txt variant="table" color="gray">
          {strings.home.subtitle}
        </Txt>
      </View>
      <BirthForm stored={null} save={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
});
