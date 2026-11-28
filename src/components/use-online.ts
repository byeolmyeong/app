import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getServerReach, subscribeServerReach } from '@/lib/api';

/**
 * 인터넷에 연결돼 있는가(결정 061 의 4 — 연결 끊김 띠 · 볼 게 없을 때의 화면).
 * 모르면(처음 · 인터넷에 닿는지 아직 모름) 연결된 것으로 본다. 끊겼다는 알림이 왔을 때만 false.
 * 끊겼다는 알림 뒤에 우리 서버가 답했으면 연결된 것으로 본다(다음 서버 호출이 실패하면 다시 끊김) — 휴대폰은 앱이 멈춰 있는 동안
 * 연결이 돌아와도 알리지 않을 수 있고(iOS 는 마지막으로 알던 값을 그대로 돌려준다), 그러면 띠가 남는다(1.0.1).
 */
export function useOnline(): boolean {
  // since: 끊겼다는 알림을 받았을 때의 서버 호출 차례 — 그 뒤에 닿은 호출만 연결의 증거로 센다
  const [net, setNet] = useState({ online: true, since: 0 });
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const online = state.isConnected !== false && state.isInternetReachable !== false;
        const since = getServerReach().seq;
        setNet((prev) => (prev.online === online ? prev : { online, since }));
      }),
    [],
  );
  const reachedSince = () => {
    const reach = getServerReach();
    return reach.reached && reach.seq > net.since;
  };
  const reached = useSyncExternalStore(subscribeServerReach, reachedSince, reachedSince);
  return net.online || reached;
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
