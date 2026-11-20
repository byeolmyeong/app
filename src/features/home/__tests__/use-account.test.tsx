import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSession } from '@/features/auth/use-session';
import { useAccount } from '@/features/home/use-account';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { getMyAccount: jest.fn() } }));
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn() }));

const mockSession = useSession as jest.Mock;
const mockGetAccount = api.getMyAccount as jest.Mock;

function Probe() {
  const account = useAccount();
  return <Text>{account?.nickname ?? '없음'}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false } });
});

// 리뷰(PR #41): 세션을 확인하기 전에 부르면 앱은 토큰 없이 나가 401 을 받고, 세션 다시 받기가 보관 토큰을 지운다
describe('useAccount', () => {
  it('세션을 확인하는 동안에는 부르지 않고, 로그인이 확인되면 한 번 부른다', async () => {
    mockSession.mockReturnValue({ status: 'checking', token: null, ready: false, lastError: null });
    const view = await render(<Probe />);
    expect(mockGetAccount).not.toHaveBeenCalled();
    mockSession.mockReturnValue({ status: 'signedIn', token: 't', ready: true, lastError: null });
    await view.rerender(<Probe />);
    expect(await screen.findByText('새벽별')).toBeTruthy();
    expect(mockGetAccount).toHaveBeenCalledTimes(1);
  });

  it('로그인하지 않았으면 부르지 않는다', async () => {
    mockSession.mockReturnValue({ status: 'signedOut', token: null, ready: true, lastError: null });
    await render(<Probe />);
    expect(mockGetAccount).not.toHaveBeenCalled();
    expect(screen.getByText('없음')).toBeTruthy();
  });
});
