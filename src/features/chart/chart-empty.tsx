import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 보관된 차트가 없을 때(주소로 바로 들어온 경우). 입력 화면으로 보낸다. */
export function ChartEmpty() {
  return (
    <View style={styles.box}>
      <Txt variant="body">{strings.chart.empty}</Txt>
      <Button label={strings.chart.goHome} onPress={() => router.replace('/')} />
    </View>
  );
}

/** 뒤로 갈 곳이 없으면(웹에서 주소로 바로 연 경우) 홈으로 간다. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  box: { gap: Spacing.md, paddingTop: Spacing.lg },
});
