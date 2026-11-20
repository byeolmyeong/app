import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { GoogleLoginButton } from '@/features/auth/providers/google.web';
import { loadScript } from '@/features/auth/providers/load-script';
import { newGoogleRequest } from '@/features/auth/providers/web-redirect';

jest.mock('@/features/auth/providers/load-script', () => ({ loadScript: jest.fn(async () => {}) }));
jest.mock('@/features/auth/providers/web-redirect', () => ({
  ...jest.requireActual('@/features/auth/providers/web-redirect'),
  newGoogleRequest: jest.fn(() => ({ state: 'st-1', nonce: 'n-1' })),
  webOrigin: jest.fn(() => 'https://byeolmyeong.com'),
}));

const saved = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const savedLocation = Object.getOwnPropertyDescriptor(window, 'location');
const assign = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
  Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
});

afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = saved;
  if (savedLocation) Object.defineProperty(window, 'location', savedLocation);
  else delete (window as { location?: unknown }).location;
});

const flat = () => StyleSheet.flatten(screen.getByTestId('social-button-GOOGLE').props.style);
const press = () => fireEvent.press(screen.getByRole('button'));

// 웹 구글 버튼은 다른 공급자와 같은 우리 버튼(결정 067 의 4 모양 · 070): 높이 48 · 모서리 12 · #131314 · 테두리 #8E918F · G 로고 · "Google로 로그인"
describe('구글(웹): 우리 버튼', () => {
  it('공급자 버튼 모양 그대로이고, 화면 읽기에는 버튼 "Google로 로그인" 이다(구글 문구 · 계정 이메일이 아니다)', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(flat()).toMatchObject({ height: 48, borderRadius: 12, backgroundColor: '#131314', borderWidth: 1, borderColor: '#8E918F' });
    expect(screen.getByTestId('social-logo-GOOGLE')).toBeTruthy();
    expect(screen.getByText(strings.login.google)).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Google로 로그인');
  });

  it('누를 수 있으면 손가락 커서, 다른 버튼이 기다리는 중이면(막힘) 손가락이 아니다', async () => {
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(flat().cursor).toBe('pointer');
    await view.unmount();

    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} disabled />);
    expect(flat().cursor).toBe('default');
  });

  it('구글 스크립트(GIS)를 싣지 않고 처음부터 누를 수 있다(흐린 준비 상태가 없다)', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(loadScript).not.toHaveBeenCalled();
    expect(flat().opacity).toBeUndefined();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('클라이언트 ID 가 없으면 그리지 않는다', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = ' ';
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(screen.queryByTestId('social-button-GOOGLE')).toBeNull();
  });
});

// 누르면 구글 OpenID Connect 인가 주소로 이동한다 — 돌아오는 화면(/auth/google)이 ID 토큰을 받는다(결정 070)
describe('구글(웹): 누르면 구글로 이동', () => {
  it('새 state · nonce 로 만든 인가 주소(돌아올 곳 <출처>/auth/google)로 이동한다', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await press();
    expect(newGoogleRequest).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
    const url = new URL(assign.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'web-client',
      redirect_uri: 'https://byeolmyeong.com/auth/google',
      response_type: 'id_token',
      state: 'st-1',
      nonce: 'n-1',
    });
  });

  it('막혀 있거나 기다리는 중이면 이동하지 않는다', async () => {
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} disabled />);
    await press();
    await view.unmount();
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} loading />);
    await press();
    expect(assign).not.toHaveBeenCalled();
    expect(newGoogleRequest).not.toHaveBeenCalled();
  });
});

// 기다리는 중 · 최근 로그인은 다른 공급자와 똑같다(결정 067 의 2 · 044 의 2)
describe('구글(웹): 기다리는 중 · 최근 로그인', () => {
  it('loading 이면 문구 자리에 돌기, 화면 읽기에는 기다리는 중(busy)', async () => {
    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} loading />);
    expect(screen.getByTestId('social-spinner-GOOGLE')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('recent 면 오른쪽 위에 배지를 얹고 화면 읽기 이름에 덧붙인다(화면 읽기가 배지를 읽는다)', async () => {
    const view = await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} recent />);
    expect(screen.getByTestId('recent-badge')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe(`Google로 로그인, ${strings.login.recent}`);
    await view.unmount();

    await render(<GoogleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(screen.queryByTestId('recent-badge')).toBeNull();
  });
});
