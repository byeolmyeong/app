import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import SynastryLayout from '@/app/synastry/_layout';
import { Colors, SynastrySkyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { api } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  // 궁합 레이아웃은 탭 첫 화면(조각 하나)일 때만 그린다
  useSegments: () => ['synastry'],
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMyAccount: jest.fn() },
}));

const S = strings.synastryTab;

beforeEach(() => {
  jest.clearAllMocks();
  (api.getMyAccount as jest.Mock).mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
});

// 시안 "궁합 (결정 104)" 1-2 의 0명 화면 — A④ 전에는 별 지도 카드만(결정 113 의 3)
describe('궁합 탭 — 빈 하늘(0명)', () => {
  it('머리 가운데 "궁합", 별 지도 카드에 "내 궁합" · 나 · 점선 별 넷 · "아직 내 하늘이 비어 있어요"', async () => {
    await render(<SynastryLayout />);
    const sky = within(await screen.findByTestId('synastry-empty-sky'));
    expect(within(screen.getByTestId('nav-bar')).getByText(S.title)).toBeTruthy();
    expect(sky.getByText(S.myLabel)).toBeTruthy();
    expect(sky.getByText(S.me)).toBeTruthy();
    expect(sky.getByText(S.empty)).toBeTruthy();
    expect(sky.getAllByTestId('synastry-empty-star', { includeHiddenElements: true })).toHaveLength(SynastrySkyLayout.emptyStars.length);
    expect(StyleSheet.flatten(screen.getByTestId('synastry-empty-sky').props.style)).toMatchObject({
      height: 380,
      borderRadius: 24,
      borderColor: Colors.hair,
    });
  });

  it('입력 · 링크 화면이 생기기 전이라 "첫 궁합을 볼 사람이 있나요?" 와 두 줄은 없다 — 누를 곳 없는 줄을 두지 않는다', async () => {
    await render(<SynastryLayout />);
    await screen.findByTestId('synastry-empty-sky');
    expect(screen.queryByText('첫 궁합을 볼 사람이 있나요?')).toBeNull();
    expect(screen.queryByText('직접 입력')).toBeNull();
    expect(screen.queryByText('내 궁합 링크 보내기')).toBeNull();
  });

  it('아래 탭 다섯 중 궁합이 골라져 있고, 다른 탭을 누르면 그 탭으로 바꾼다', async () => {
    await render(<SynastryLayout />);
    await screen.findByTestId('synastry-empty-sky');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '궁합', '마이']);
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([false, false, false, true, false]);
    await fireEvent.press(tabs[0]);
    expect(router.replace).toHaveBeenLastCalledWith('/');
  });
});
