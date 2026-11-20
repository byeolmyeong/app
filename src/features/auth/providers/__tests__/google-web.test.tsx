import { render, waitFor } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { GoogleLoginButton } from '@/features/auth/providers/google.web';

jest.mock('@/features/auth/providers/load-script', () => ({ loadScript: jest.fn(async () => {}) }));

const renderButton = jest.fn();
const initialize = jest.fn();
const saved = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
  (globalThis as { google?: unknown }).google = { accounts: { id: { initialize, renderButton } } };
});

afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = saved;
  delete (globalThis as { google?: unknown }).google;
});

// 웹 구글은 구글이 그리는 버튼(GIS)이라 글자를 바꿀 수 없다 — "로그인" 쪽 문구(signin_with)가 나오게만 한다(결정 044)
describe('구글(웹)', () => {
  it('GIS 버튼을 다크 · 로고 왼쪽 · 한국어 · "로그인" 문구로 그린다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(renderButton.mock.calls[0][1]).toMatchObject({ theme: 'filled_black', logo_alignment: 'left', locale: 'ko', text: 'signin_with' });
  });
});

describe('구글(웹): 최근 로그인', () => {
  it('recent 면 GIS 버튼을 감싼 칸 위에 배지를 얹는다, 아니면 없다', async () => {
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} recent />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(view.getByTestId('recent-badge')).toBeTruthy();
    expect(view.getByText(strings.login.recent)).toBeTruthy();
    await view.unmount();

    const plain = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(plain.queryByTestId('recent-badge')).toBeNull();
  });
});
