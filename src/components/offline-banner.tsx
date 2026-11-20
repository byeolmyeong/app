import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, OfflineBannerLayout as L, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const S = strings.states.offline;

/**
 * 연결 끊김 띠(결정 061 의 4, 보드 20): 받아 둔 내용은 그대로 보이고 머리 아래에 "인터넷 연결이 끊겼어요 · 연결되면 새로 불러올게요".
 * 연결이 돌아오면 화면이 띠를 치우고 새로 부른다. 화면 읽기는 한 덩이로 한 번 알린다.
 */
export function OfflineBanner() {
  return (
    <View testID="offline-banner" accessible accessibilityLabel={`${S.title}. ${S.body}`} accessibilityLiveRegion="polite" style={styles.band}>
      <Svg width={L.icon} height={L.icon} viewBox="0 0 24 24" fill="none">
        <Path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" stroke={Colors.gray} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={12} cy={19} r={1.3} fill={Colors.gray} />
        <Path d="M3 3l18 18" stroke={Colors.dangerSoft} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
      <View style={styles.text}>
        <Txt variant="table" style={styles.title}>
          {S.title}
        </Txt>
        <Txt variant="caption" color="gray">
          {S.body}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.fill,
  },
  text: { flex: 1, gap: Spacing.hairline },
  title: { fontWeight: FontWeight.semibold },
});
