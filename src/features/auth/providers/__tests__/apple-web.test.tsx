import { render } from '@testing-library/react-native';

import { AppleLoginButton } from '@/features/auth/providers/apple.web';

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
