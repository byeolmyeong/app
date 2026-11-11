import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomTabs, type BottomTab } from '@/components/bottom-tabs';
import { Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

export type MainTab = 'home' | 'my';

const PATHS = { home: '/', my: '/my' } as const;

const icon = (draw: (stroke: object) => React.ReactNode) =>
  function TabIcon(color: string) {
    return (
      <Svg width={Sizes.tabIcon} height={Sizes.tabIcon} viewBox="0 0 24 24" fill="none">
        {draw({ stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' })}
      </Svg>
    );
  };

const TABS: BottomTab<MainTab>[] = [
  {
    key: 'home',
    label: strings.tabs.home,
    icon: icon((s) => <Path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" {...s} />),
  },
  {
    key: 'my',
    label: strings.tabs.my,
    icon: icon((s) => (
      <>
        <Circle cx={12} cy={8} r={3.5} {...s} />
        <Path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" {...s} />
      </>
    )),
  },
];

/** 앱의 아래 탭: 홈 · 마이(결정 019). 다른 탭을 누르면 그 화면으로 바꾼다(뒤로 가기에 쌓지 않는다). */
export function MainTabs({ active }: { active: MainTab }) {
  return <BottomTabs tabs={TABS} value={active} onChange={(key) => router.replace(PATHS[key])} />;
}
