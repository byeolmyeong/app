import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style);

/** 그린 뒤 칸 폭을 알려 준다(웹은 onLayout 으로 잰다) */
async function layout(width: number) {
  await fireEvent(screen.getByTestId('google-login', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { width, height: 48 } } });
}

// 웹 구글 버튼은 우리 모양(결정 067 의 4, 시안 5): 카카오 · 애플과 같은 공급자 버튼 모양에 "Google로 로그인"
describe('구글(웹): 우리 모양', () => {
  it('높이 48 · 모서리 12 · 바탕 #131314 · 테두리 1px #8E918F · 왼쪽 G 로고 · 가운데 "Google로 로그인"', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(flat('social-button-GOOGLE')).toMatchObject({ height: 48, borderRadius: 12, backgroundColor: '#131314', borderWidth: 1, borderColor: '#8E918F' });
    expect(screen.getByTestId('social-logo-GOOGLE', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(strings.login.google, { includeHiddenElements: true })).toBeTruthy();
    expect(strings.login.google).toBe('Google로 로그인');
  });

  it('클라이언트 ID 가 없으면 그리지 않는다', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '';
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(screen.queryByTestId('social-button-GOOGLE', { includeHiddenElements: true })).toBeNull();
  });
});

// 로그인은 여전히 GIS: 우리 버튼 위에 GIS 버튼을 투명하게 겹쳐 누름을 GIS 가 받는다 — 서버 계약(구글 ID 토큰)은 그대로
describe('구글(웹): GIS 를 투명하게 겹친다', () => {
  it('칸 폭을 잰 뒤 GIS 버튼을 그 폭(200~400)으로 겹칸에 그리고, 겹칸은 보이지 않는다(개인 맞춤의 프로필 · 이메일이 보이지 않게)', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(renderButton).not.toHaveBeenCalled();
    await layout(350);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(renderButton.mock.calls[0][1]).toMatchObject({ type: 'standard', size: 'large', width: 350 });
    expect(flat('google-gis-overlay')).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 });
  });

  it('GIS 버튼(높이 40 · 폭 최대 400)을 늘려 우리 버튼(48 · 꽉 찬 폭)을 빈틈 없이 덮는다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await layout(440);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ width: 400 });
    const gis = flat('google-gis');
    expect(gis).toMatchObject({ position: 'absolute', width: 400, height: 40, left: 20, top: 4 });
    expect(gis.transform).toEqual([{ scaleX: 1.1 }, { scaleY: 1.2 }]);
  });

  it('GIS 가 준 ID 토큰을 그대로 넘긴다. 토큰이 없으면 실패를 알린다', async () => {
    const onCredential = jest.fn();
    const onError = jest.fn();
    await render(<GoogleLoginButton onCredential={onCredential} onError={onError} />);
    await layout(350);
    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const { client_id, callback } = initialize.mock.calls[0][0];
    expect(client_id).toBe('web-client');
    await act(async () => callback({ credential: 'id-token' }));
    expect(onCredential).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: 'id-token' });
    await act(async () => callback({}));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('우리 모양은 화면 읽기에서 숨긴다 — 키보드 · 화면 읽기는 겹친 GIS 버튼이 받는다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(screen.getByTestId('social-button-GOOGLE', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

// 기다리는 중 · 막힘(결정 067 의 2): 우리 버튼이 돌기 · 흐림을 보이고, 겹친 GIS 는 누름을 받지 않는다
describe('구글(웹): 기다리는 중 · 막힘', () => {
  it('loading 이면 우리 버튼에 돌기, GIS 는 누를 수 없다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} loading />);
    expect(screen.getByTestId('social-spinner-GOOGLE', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('google-gis-overlay', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });

  it('disabled 면 우리 버튼이 흐리고 GIS 는 누를 수 없다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} disabled />);
    expect(flat('social-button-GOOGLE').opacity).toBe(0.4);
    expect(screen.getByTestId('google-gis-overlay', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });

  it('GIS 버튼이 그려지면 GIS 가 누름을 받고 우리 버튼은 흐리지 않다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await layout(350);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(screen.getByTestId('google-gis-overlay', { includeHiddenElements: true }).props.pointerEvents).toBe('auto');
    expect(flat('social-button-GOOGLE').opacity).toBeUndefined();
  });
});

// 준비 전(리뷰 PR #46 의 2): GIS 버튼이 그려지기 전에 누르면 아무 일도 없으므로 막힌 모양으로 보이고, 스크립트가 오지 않으면 거두고 알린다
describe('구글(웹): 준비 전', () => {
  it('스크립트를 받는 중 · GIS 버튼이 그려지기 전에는 우리 버튼이 흐리고 누름을 받지 않는다', async () => {
    (loadScript as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await layout(350);
    expect(flat('social-button-GOOGLE').opacity).toBe(0.4);
    expect(screen.getByTestId('google-gis-overlay', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
    expect(flat('google-gis-overlay').cursor).toBe('default');
  });

  it('준비되면 겹친 칸이 손가락 커서다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await layout(350);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(flat('google-gis-overlay').cursor).toBe('pointer');
  });

  it('스크립트가 10초 안에 오지 않으면 버튼을 거두고 실패를 알린다(로그인 화면의 안내)', async () => {
    jest.useFakeTimers();
    try {
      (loadScript as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
      const onError = jest.fn();
      await render(<GoogleLoginButton onCredential={jest.fn()} onError={onError} />);
      await act(async () => jest.advanceTimersByTime(9999));
      expect(onError).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('social-button-GOOGLE', { includeHiddenElements: true })).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('구글(웹): 최근 로그인', () => {
  it('recent 면 우리 버튼 오른쪽 위에 배지를 얹는다, 아니면 없다', async () => {
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} recent />);
    expect(screen.getByTestId('recent-badge', { includeHiddenElements: true })).toBeTruthy();
    await view.unmount();

    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(screen.queryByTestId('recent-badge', { includeHiddenElements: true })).toBeNull();
  });
});

// GIS 를 불러오지 못하면 로그인할 수 없으므로 버튼(과 배지)을 거둔다 — 결정 044 의 2 "버튼이 보이지 않으면 배지도 없다"
describe('구글(웹): GIS 가 없으면 버튼도 없다', () => {
  it('GIS 스크립트를 불러오지 못하면 실패를 알리고 버튼 · 배지를 거둔다', async () => {
    (loadScript as jest.Mock).mockRejectedValueOnce(new Error('blocked'));
    const onError = jest.fn();
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={onError} recent />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('social-button-GOOGLE', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('recent-badge', { includeHiddenElements: true })).toBeNull();
  });

  it('스크립트는 왔는데 GIS 가 없으면 버튼 · 배지를 거둔다', async () => {
    delete (globalThis as { google?: unknown }).google;
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} recent />);
    await waitFor(() => expect(screen.queryByTestId('social-button-GOOGLE', { includeHiddenElements: true })).toBeNull());
    expect(renderButton).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recent-badge', { includeHiddenElements: true })).toBeNull();
  });
});
