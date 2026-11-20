import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useOnline } from '@/components/use-online';

type Listener = (state: Partial<NetInfoState>) => void;
let listener: Listener | null = null;
const unsubscribe = jest.fn();

beforeEach(() => {
  listener = null;
  unsubscribe.mockClear();
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: Listener) => {
    listener = cb;
    return unsubscribe;
  });
});

function Probe() {
  return <Text>{useOnline() ? '연결됨' : '끊김'}</Text>;
}

// 연결 끊김(결정 061 의 4): 모르면 연결된 것으로 본다 — 끊겼다는 알림이 왔을 때만 끊김
describe('useOnline', () => {
  it('처음에는 연결된 것으로 보고, 끊기면 끊김 · 돌아오면 연결됨', async () => {
    const view = await render(<Probe />);
    expect(screen.getByText('연결됨')).toBeTruthy();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    expect(screen.getByText('끊김')).toBeTruthy();
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(screen.getByText('연결됨')).toBeTruthy();
    await view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('인터넷에 닿는지 아직 모르면(null) 연결된 것으로 본다', async () => {
    await render(<Probe />);
    await act(async () => listener?.({ isConnected: true, isInternetReachable: null }));
    expect(screen.getByText('연결됨')).toBeTruthy();
    await act(async () => listener?.({ isConnected: true, isInternetReachable: false }));
    expect(screen.getByText('끊김')).toBeTruthy();
  });
});
