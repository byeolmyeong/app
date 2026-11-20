import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, NotificationLayout } from '@/constants/theme';
import { strings } from '@/content/strings';

const B = NotificationLayout.bell;

/**
 * 홈 머리 오른쪽의 종(결정 047 의 1-1 · 052 의 4, 보드 11): 안 읽은 알림이 있으면 주색 점(숫자는 적지 않는다). 누르면 알림함.
 */
export function HomeBell({ unread, onPress }: { unread: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID="home-bell"
      accessibilityRole="button"
      accessibilityLabel={unread ? strings.notifications.bellUnread : strings.notifications.bell}
      onPress={onPress}
      style={styles.box}>
      <Svg width={B.icon} height={B.icon} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.8}>
        <Path d="M18 16v-5a6 6 0 0 0-12 0v5l-1.5 2h15z" strokeLinejoin="round" />
        <Path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
      </Svg>
      {unread ? <View testID="home-bell-dot" style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: B.box, height: B.box, marginRight: B.inset, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: B.dotTop,
    right: B.dotRight,
    width: B.dot,
    height: B.dot,
    borderRadius: B.dot / 2,
    borderWidth: B.dotBorder,
    borderColor: Colors.paper,
    backgroundColor: Colors.primary,
  },
});
