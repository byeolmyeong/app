import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { BrandColors, Colors, NicknameCardLayout } from '@/constants/theme';

const L = NicknameCardLayout.art;

/**
 * 별명 카드(홈 보드 11 · 마이 보드 16) 오른쪽 위에 옅게 깔린 별자리 선과 네 갈래 별. 두 카드가 같은 그림을 쓴다(결정 047 · 056).
 * 카드의 오른쪽 위에 떠 있는 장식이라 카드(`overflow: hidden`) 안에 둔다. 화면 읽기에서 숨기고 누르기를 받지 않는다.
 */
export function CardConstellation() {
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.art}>
      <Svg width={L.width} height={L.height} viewBox="0 0 160 140">
        <G fill="none" stroke={BrandColors.constellation} strokeWidth={1}>
          <Path d="M55 15L51 32L39 40" />
          <Path d="M51 32L63 38L83 36L119 60L143 92" />
          <Path d="M83 36L72 75L54 89L30 83L19 110" />
          <Path d="M54 89L48 128" />
        </G>
        <G fill={Colors.ink}>
          {[[55, 15, 2], [51, 32, 2], [39, 40, 2], [63, 38, 2], [83, 36, 2.4], [143, 92, 2], [72, 75, 2], [54, 89, 2.4], [30, 83, 2], [19, 110, 2], [48, 128, 2]].map(
            ([cx, cy, r]) => (
              <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ),
          )}
        </G>
        <Path transform="translate(119 60)" fill={BrandColors.core} d="M0,-8 Q1.4,-1.4 8,0 Q1.4,1.4 0,8 Q-1.4,1.4 -8,0 Q-1.4,-1.4 0,-8Z" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', right: L.right, top: L.top, opacity: L.opacity },
});
