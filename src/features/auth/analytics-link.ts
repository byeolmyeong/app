/**
 * 세션과 제품 분석을 잇는다(결정 040 의 4 · 081 의 4).
 * 앰플리튜드 키가 있을 때(운영)만, 로그인 상태가 되면 서버의 분석용 id 를 한 세션에 한 번 받아 identify 한다.
 * 로그인 상태였다가 로그인 전이 되면(로그아웃 · 계정 삭제 · 세션 만료) 기억한 값을 지우고 초기화한다 — 다음 사람이 앞사람과 합쳐지지 않게.
 * 켰을 때 처음부터 로그인 전이면 초기화하지 않는다(가입 전 기기 id 를 가입 뒤까지 이어 간다).
 */
import type { SessionStatus } from '@/features/auth/session-store';
import type { AnalyticsIdResult, ApiResult } from '@/lib/api';

type StatusStore = { subscribe(listener: () => void): () => void; getSnapshot(): { status: SessionStatus } };

export type AnalyticsLinkDeps = {
  /** 분석이 켜져 있는가(키가 있다). 꺼져 있으면 서버를 부르지 않는다 */
  enabled: () => boolean;
  fetchId: () => Promise<ApiResult<AnalyticsIdResult>>;
  identify: (analyticsId: string) => void;
  reset: () => void;
};

/** 세션 저장소를 지켜본다. 돌려준 함수로 그만 본다 */
export function linkAnalytics(store: StatusStore, deps: AnalyticsLinkDeps): () => void {
  let known: string | null = null;
  let fetching = false;
  /** 로그아웃할 때마다 늘린다 — 받는 중에 로그아웃했으면 늦게 온 값을 버린다 */
  let generation = 0;
  let previous = store.getSnapshot().status;

  const onChange = () => {
    const { status } = store.getSnapshot();
    const was = previous;
    previous = status;
    if (status === 'signedOut' && (was === 'signedIn' || known !== null)) {
      generation += 1;
      known = null;
      fetching = false;
      deps.reset();
      return;
    }
    if (status !== 'signedIn' || known !== null || fetching || !deps.enabled()) return;
    fetching = true;
    const mine = generation;
    deps
      .fetchId()
      .then((r) => {
        if (mine !== generation) return;
        fetching = false;
        if (!r.ok || store.getSnapshot().status !== 'signedIn') return;
        known = r.data.analyticsId;
        deps.identify(known);
      })
      .catch(() => {
        if (mine === generation) fetching = false;
      });
  };

  onChange();
  return store.subscribe(onChange);
}
