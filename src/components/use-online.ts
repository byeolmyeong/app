import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * 인터넷에 연결돼 있는가(결정 061 의 4 — 연결 끊김 띠 · 볼 게 없을 때의 화면).
 * 모르면(처음 · 인터넷에 닿는지 아직 모름) 연결된 것으로 본다. 끊겼다는 알림이 왔을 때만 false.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(
    () => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
    [],
  );
  return online;
}
