import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChartMark } from '@/components/chart-mark';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { BirthForm } from '@/features/chart/birth-form';
import { formatBirthSummary } from '@/features/chart/birth-input';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { HomeCategories } from '@/features/home/home-categories';

/**
 * 홈. 출생 정보가 있으면 카테고리 화면(나 · 관계 · 궁합 · 시기), 없으면 출생 정보 입력부터 받는다(결정 019).
 * 기기 저장소를 읽기 전에는 아무것도 그리지 않는다(입력 화면이 잠깐 비쳤다가 바뀌지 않게).
 */
export default function HomeScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  const nav = <NavBar left={<ChartMark />} />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (profile && chart)
    return (
      <Screen nav={nav}>
        <HomeCategories
          birthSummary={formatBirthSummary(profile)}
          onOpen={(path) => router.push(path)}
          onEditBirth={() => router.push('/birth')}
        />
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
