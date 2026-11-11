import { StyleSheet, View } from 'react-native';

import { ChartMark } from '@/components/chart-mark';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { BirthForm } from '@/features/chart/birth-form';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

/** 홈이 곧 출생 정보 입력 화면이다. 로그인 없이 쓴다. */
export default function HomeScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  const stored = profile && chart ? { profile, chart } : null;
  return (
    <Screen nav={<NavBar left={<ChartMark />} />}>
      <View style={styles.intro}>
        <Txt variant="display">{strings.home.title}</Txt>
        <Txt variant="table" color="gray">
          {strings.home.subtitle}
        </Txt>
      </View>
      {/* 기기 저장소를 읽고 나면 보관된 값으로 입력 칸을 다시 만든다. 읽기 전에도 빈 칸으로 쓸 수 있다. */}
      <BirthForm key={loaded ? 'restored' : 'initial'} stored={stored} save={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
});
