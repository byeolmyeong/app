import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

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

/**
 * 끊겼다가 다시 연결될 때 한 번 부른다(연결되면 띠를 치우고 새로 불러온다 — 결정 061 의 4). 처음 · 계속 연결됨에는 부르지 않는다.
 * 연결 상태는 화면이 useOnline 으로 읽은 값을 넘긴다(한 화면이 두 번 구독하지 않게).
 */
export function useOnReconnect(online: boolean, onBack: () => void) {
  const wasOffline = useRef(false);
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      latest.current();
    }
  }, [online]);
}
