/**
 * 강제 업데이트의 판정(결정 027). 내 버전이 내 플랫폼의 최소 버전보다 낮으면 막는다.
 * 하던 일은 끊지 않는다: "바쁜" 화면이 있는 동안에는 막는 것을 미룬다. 서버의 426 알림(force)만 바로 막는다.
 * 확인하지 못하면 막지 않는다. 판정은 메모리에만 있다(앱을 새로 켜면 처음부터 다시 묻는다).
 */
import { isBelowVersion } from '@/features/update/version';
import type { ApiResult, AppConfig } from '@/lib/api';
import type { AppClient } from '@/lib/app-client';

export type UpdateState = {
  /** 막는 화면을 보여야 하는가 */
  blocked: boolean;
  /** 관리자가 적은 안내. 없으면 null */
  message: string | null;
  /** 스토어 주소. 없으면 null */
  storeUrl: string | null;
};

export type UpdateStoreDeps = {
  /** 이 앱의 플랫폼과 버전. 웹은 null 이고, 그러면 확인하지도 막지도 않는다 */
  client: AppClient | null;
  getAppConfig: () => Promise<ApiResult<AppConfig>>;
};

export function createUpdateStore(deps: UpdateStoreDeps) {
  /** 설정이 "최소 버전보다 낮다" 고 했는가 */
  let required = false;
  /** 서버가 426 으로 거절했는가. 앱을 끌 때까지 풀리지 않는다 */
  let forced = false;
  /** 바쁨을 등록한 화면의 수 */
  let busy = 0;
  let message: string | null = null;
  let storeUrl: string | null = null;
  let state: UpdateState = { blocked: false, message, storeUrl };
  let checking: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  /** 한 번 막으면 바쁨이 새로 등록돼도 풀지 않는다(막는 화면이 떠 있으면 다른 화면은 없다) */
  function emit() {
    const blocked = forced || (required && (busy === 0 || state.blocked));
    if (blocked === state.blocked && message === state.message && storeUrl === state.storeUrl) return;
    state = { blocked, message, storeUrl };
    listeners.forEach((listener) => listener());
  }

  /** 설정을 받아 판정한다. 받지 못하면 앞의 판정을 그대로 둔다. 겹쳐 불려도 서버는 한 번만 부른다 */
  function check(): Promise<void> {
    if (!deps.client) return Promise.resolve();
    const { platform, version } = deps.client;
    checking ??= (async () => {
      const r = await deps.getAppConfig();
      if (!r.ok) return;
      const config = r.data[platform];
      required = isBelowVersion(version, config.minVersion);
      message = config.message;
      storeUrl = config.storeUrl;
      emit();
    })().finally(() => {
      checking = null;
    });
    return checking;
  }

  return {
    getSnapshot: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    check,

    /** 하던 일이 있는 화면이 떠 있는 동안 부른다. 돌려준 함수를 화면에서 나올 때 부른다 */
    enterBusy(): () => void {
      busy += 1;
      let left = false;
      return () => {
        if (left) return;
        left = true;
        busy -= 1;
        emit();
      };
    },

    /** 서버가 426 `UPDATE_REQUIRED` 로 거절했다. 바쁨과 상관없이 바로 막고, 안내와 스토어 주소를 받으러 설정을 묻는다 */
    force() {
      if (!deps.client) return;
      const first = !forced;
      forced = true;
      emit();
      if (first) void check();
    },
  };
}

export type UpdateStore = ReturnType<typeof createUpdateStore>;
