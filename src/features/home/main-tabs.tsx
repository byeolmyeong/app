import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomTabs, type BottomTab } from '@/components/bottom-tabs';
import { Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

export type MainTab = 'home' | 'me' | 'timing' | 'synastry' | 'my';

/** 탭마다 가는 곳(결정 102 의 3). 나는 나 탭(`/me`, 결정 048 의 1), 시기는 시기 탭(`/timing`, 결정 049 의 1), 궁합은 궁합 탭(`/synastry`, 결정 104) */
const PATHS = { home: '/', me: '/me', timing: '/timing', synastry: '/synastry', my: '/my' } as const;

/**
 * 탭마다의 첫 화면 — 루트 화면 쌓기의 이름(`PATHS` 와 짝, 궁합은 레이아웃이 있는 폴더라 그 이름). 루트 레이아웃이 이 다섯을 미끄러짐 없이 바로 바꾼다(animation none):
 * 탭은 화면 쌓기 위의 replace 라 기본이면 오른쪽에서 미끄러져 들어온다(iOS 탭 막대의 관례와 다름 — 소유자 지적). 탭 안에서 들어가는 화면은 그대로.
 */
const TAB_SCREENS: Record<MainTab, string> = { home: 'index', me: 'me', timing: 'timing/index', synastry: 'synastry', my: 'my/index' };
export const TAB_ROOT_SCREENS = Object.values(TAB_SCREENS);

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
    key: 'synastry',
    label: strings.tabs.synastry,
    icon: icon((s) => <Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" {...s} />),
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

/**
 * 그 탭의 첫 화면으로 바꾼다. push 로 들어온 화면(홈 카드 → 글 등)에서 눌러도 밑의 화면이 남지 않게 먼저 치운다(리뷰 PR #41).
 * params 는 그 탭이 열 칸(홈 메뉴판 — 나 탭의 칩 `area` · 시기 탭의 칩 `tab` · 궁합의 사이 `relation`, 결정 102 의 3) — 탭을 바꾸는 것과 같이 쌓지 않는다
 */
export function openTab(key: MainTab, params?: Record<string, string>) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(params ? { pathname: PATHS[key], params } : PATHS[key]);
}

const go = (key: MainTab) => openTab(key);

/**
 * 앱의 아래 탭: 홈 · 나 · 시기 · 궁합 · 마이(결정 102 의 3, 아이콘은 시안 11 · 궁합은 하트 — 시안 "홈 (1.1.0)" A). 다른 탭을 누르면 그 화면으로 바꾼다(뒤로 가기에 쌓지 않는다, 결정 046 의 2).
 * nested 는 탭 안에서 들어간 화면(나 → 내 별명): 지금 탭을 다시 누르면 그 탭의 첫 화면으로 간다.
 */
export function MainTabs({ active, nested = false }: { active: MainTab; nested?: boolean }) {
  return <BottomTabs tabs={TABS} value={active} onChange={go} onReselect={nested ? go : undefined} />;
}
