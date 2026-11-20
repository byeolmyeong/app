import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomTabs, type BottomTab } from '@/components/bottom-tabs';
import { Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

export type MainTab = 'home' | 'me' | 'timing' | 'my';

/** 탭마다 가는 곳(결정 055 의 2). 나는 나 탭(`/me`, 결정 048 의 1), 시기는 시기 탭(`/timing`, 결정 049 의 1) */
const PATHS = { home: '/', me: '/me', timing: '/timing', my: '/my' } as const;

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
    key: 'me',
    label: strings.tabs.me,
    icon: icon((s) => <Path d="M12 3.5Q13.4 10.6 20.5 12Q13.4 13.4 12 20.5Q10.6 13.4 3.5 12Q10.6 10.6 12 3.5Z" {...s} />),
  },
  {
    key: 'timing',
    label: strings.tabs.timing,
    icon: icon((s) => <Path d="M15.5 4.2A8.5 8.5 0 1 0 19.8 15.5A7 7 0 0 1 15.5 4.2Z" {...s} />),
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

/** 그 탭의 첫 화면으로 바꾼다. push 로 들어온 화면(홈 카드 → 글 등)에서 눌러도 밑의 화면이 남지 않게 먼저 치운다(리뷰 PR #41) */
function go(key: MainTab) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(PATHS[key]);
}

/**
 * 앱의 아래 탭: 홈 · 나 · 시기 · 마이(결정 055 의 2, 아이콘은 시안 11). 다른 탭을 누르면 그 화면으로 바꾼다(뒤로 가기에 쌓지 않는다, 결정 046 의 2).
 * nested 는 탭 안에서 들어간 화면(나 → 내 별명): 지금 탭을 다시 누르면 그 탭의 첫 화면으로 간다.
 */
export function MainTabs({ active, nested = false }: { active: MainTab; nested?: boolean }) {
  return <BottomTabs tabs={TABS} value={active} onChange={go} onReselect={nested ? go : undefined} />;
}
