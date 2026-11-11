import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoButton } from '@/components/info-button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionHead } from '@/components/section-head';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { showsHouses } from '@/features/chart/chart-rows';
import { ChartWheel } from '@/features/chart/ChartWheel';
import { KeyThree } from '@/features/chart/key-three';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

const S = strings.chart;
const H = strings.help;

/** 차트: 휠과 핵심 3요소를 쉬운 말 설명과 함께 보여 준다. 숫자 표는 "자세히" 화면에 있다. 로그인 없이 본다. */
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

  return (
    <Screen nav={nav}>
      <SectionHead title={S.wheelHeading}>
        <InfoButton testID="info-wheel" title={H.wheel.title} items={H.wheel.items} />
      </SectionHead>
      <Txt variant="table" color="gray">
        {S.wheelCaption}
      </Txt>
      <ChartWheel chart={chart} />
      <SectionHead title={S.keyThreeHeading}>
        {/* 시각을 모르면 상승점(첫인상)을 보여 주지 않으므로 설명에서도 뺀다 */}
        <InfoButton
          testID="info-key-three"
          title={H.keyThree.title}
          items={withHouses ? [...H.keyThree.items, H.keyThree.asc] : H.keyThree.items}
        />
      </SectionHead>
      <Txt variant="table" color="gray">
        {S.keyThreeCaption}
      </Txt>
      <KeyThree chart={chart} />
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
