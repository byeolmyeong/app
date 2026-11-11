import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatBirthSummary } from '@/features/chart/birth-input';
import { ChartEmpty } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';

const S = strings.my;

/** 마이: 넣어 둔 출생 정보를 확인하고 바꾸러 가는 곳. 설정·계정은 뒤에 여기에 더한다(결정 019). */
export default function MyScreen() {
  const { loaded, profile } = useBirthProfile();
  const nav = <NavBar title={S.title} />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );
  return (
    <Screen nav={nav} footer={<MainTabs active="my" />}>
      <View style={styles.card}>
        <View style={styles.text}>
          <Txt variant="label" color="gray">
            {S.birthLabel}
          </Txt>
          <Txt variant="body">{formatBirthSummary(profile)}</Txt>
        </View>
        <TextLink label={S.editBirth} onPress={() => router.push('/birth')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.fill,
    borderRadius: CardRadius,
  },
  text: { flex: 1, gap: Spacing.xxs },
});
