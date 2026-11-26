import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** 뒤로 가기 꺾쇠(‹): 가입 단계 · 곳 고르기 시트 · 내 하늘 지도 머리가 같이 쓴다(결정 042 시안). 누르는 틀은 부르는 쪽이 둔다 */
export function BackChevron({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
