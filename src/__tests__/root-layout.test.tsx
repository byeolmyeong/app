import { render } from '@testing-library/react-native';
import { useSegments } from 'expo-router';

import RootLayout from '@/app/_layout';
import { useSession } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({ Stack: () => null, useSegments: jest.fn(() => []) }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn(() => ({ status: 'checking' as const, token: null, ready: false, lastError: null })) }));

const mockSegments = useSegments as jest.Mock;

describe('루트 레이아웃의 세션', () => {
  it('공유 페이지(/s/…)에서는 세션을 시작하지 않는다', async () => {
    mockSegments.mockReturnValue(['s', '[shareId]']);
    await render(<RootLayout />);
    expect(useSession).toHaveBeenLastCalledWith(false);
  });

  it('그 밖의 화면에서는 켜질 때 세션을 시작한다', async () => {
    for (const segments of [[], ['reading'], ['synastry', '[id]'], ['settings']]) {
      mockSegments.mockReturnValue(segments);
      const view = await render(<RootLayout />);
      expect(useSession).toHaveBeenLastCalledWith(true);
      await view.unmount();
    }
  });
});
