import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { AppleLoginButton } from '@/features/auth/providers/apple.web';
import { loadScript } from '@/features/auth/providers/load-script';

jest.mock('@/features/auth/providers/load-script', () => ({ loadScript: jest.fn(async () => {}) }));
const mockLoadScript = loadScript as jest.Mock;

// 웹 정적 출력(`npx expo export -p web`)은 화면을 브라우저 밖에서 미리 그린다 — 그때는 브라우저 주소(window.location)가 없다.
describe('애플(웹): 정적 출력', () => {
  const saved = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID;
  afterEach(() => {
    process.env.EXPO_PUBLIC_APPLE_SERVICES_ID = saved;
  });

  it('Services ID 가 있어도 브라우저 주소가 없으면 오류 없이 아무것도 그리지 않는다', async () => {
    process.env.EXPO_PUBLIC_APPLE_SERVICES_ID = 'com.byeolmyeong.web';
    expect(typeof (globalThis as { location?: unknown }).location).toBe('undefined');
    const { toJSON } = await render(<AppleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });
});

// 팝업은 누름(사용자 동작) 안에서 열어야 브라우저가 막지 않는다(사파리는 특히 짧다) — 누른 뒤에 스크립트를 받으면 signIn 이 그 밖에서 팝업을 연다
describe('애플(웹): 누르기 전에 Apple JS 를 미리 싣는다', () => {
  const saved = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID;
  const g = globalThis as unknown as { location?: unknown; AppleID?: unknown };
  const signIn = jest.fn(() => new Promise(() => {}));
  const init = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_APPLE_SERVICES_ID = 'com.byeolmyeong.web';
    g.location = { protocol: 'https:', origin: 'https://app.byeolmyeong.com' };
    // 받는 데 오래 걸린다(끝나지 않는다) — 기다리면 signIn 에 닿지 못한다
    mockLoadScript.mockReturnValue(new Promise(() => {}));
  });
  afterEach(() => {
    process.env.EXPO_PUBLIC_APPLE_SERVICES_ID = saved;
    delete g.location;
    delete g.AppleID;
  });

  it('버튼이 보이면 누르기 전에 받기 시작한다', async () => {
    await render(<AppleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    expect(mockLoadScript).toHaveBeenCalledWith(expect.stringContaining('appleid.auth.js'));
  });

  it('미리 받아 두었으면 누를 때 기다리지 않고 곧바로 signIn(팝업)을 부른다', async () => {
    g.AppleID = { auth: { init, signIn } };
    await render(<AppleLoginButton onCredential={jest.fn()} onError={jest.fn()} />);
    await fireEvent.press(screen.getByText(strings.login.apple));
    expect(init).toHaveBeenCalledWith({ clientId: 'com.byeolmyeong.web', scope: 'email', redirectURI: 'https://app.byeolmyeong.com/auth/apple', usePopup: true });
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
