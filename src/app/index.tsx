import { StyleSheet, View } from 'react-native';

import { Seal } from '@/components/seal';
import { Txt } from '@/components/txt';
import { Colors, ScreenPaddingX, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

// 자리표시. 입력 화면은 계획 태스크 3 에서 만든다.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Seal />
      <Txt variant="display">{strings.appName}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: ScreenPaddingX,
    backgroundColor: Colors.paper,
  },
});
