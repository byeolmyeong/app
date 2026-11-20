import { render, waitFor } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { GoogleLoginButton } from '@/features/auth/providers/google.web';
import { loadScript } from '@/features/auth/providers/load-script';

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

// 리뷰 1: 구글 버튼이 그려지지 않았으면(스크립트 실패 · GIS 없음) 배지도 없다 — 결정 044 의 2 "버튼이 보이지 않으면 배지도 없다"
describe('구글(웹): 버튼이 없으면 배지도 없다', () => {
  it('GIS 스크립트를 불러오지 못하면 실패를 알리고 배지를 두지 않는다', async () => {
    (loadScript as jest.Mock).mockRejectedValueOnce(new Error('blocked'));
    const onError = jest.fn();
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={onError} recent />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(view.queryByTestId('recent-badge')).toBeNull();
  });

  it('스크립트는 왔는데 GIS 가 없으면(그리지 못함) 배지를 두지 않는다', async () => {
    delete (globalThis as { google?: unknown }).google;
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} recent />);
    await waitFor(() => expect(loadScript).toHaveBeenCalled());
    expect(renderButton).not.toHaveBeenCalled();
    expect(view.queryByTestId('recent-badge')).toBeNull();
  });
});
