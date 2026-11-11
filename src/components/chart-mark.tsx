import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Colors, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 눈금 12개의 각도 */
const TICKS = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);

/** 서버 렌더링과 브라우저의 소수점 차이로 하이드레이션이 어긋나지 않게 둘째 자리에서 자른다 */
const round = (n: number) => Math.round(n * 100) / 100;

/** 화면 머리의 표식. 눈금 원과 금색 점 하나. 앱 이름이 정해지기 전까지 도장을 대신한다(결정 016). */
export function ChartMark() {
  const size = Sizes.mark;
  const c = size / 2;
  const r = c - 1;
  return (
    <View testID="chart-mark" accessibilityRole="image" accessibilityLabel={strings.appName} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={Colors.ink} strokeWidth={1} />
        <Circle cx={c} cy={c} r={r * 0.62} fill="none" stroke={Colors.hair} strokeWidth={1} />
        {TICKS.map((a) => (
          <Line
            key={a}
            x1={round(c + Math.sin(a) * r)}
            y1={round(c - Math.cos(a) * r)}
            x2={round(c + Math.sin(a) * (r - 3))}
            y2={round(c - Math.cos(a) * (r - 3))}
            stroke={Colors.ink}
            strokeWidth={0.8}
          />
        ))}
        <Circle testID="chart-mark-dot" cx={round(c - r * 0.42)} cy={round(c - r * 0.46)} r={2.2} fill={Colors.primary} />
      </Svg>
    </View>
  );
}
