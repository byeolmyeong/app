/**
 * 강제 업데이트의 판정(결정 027). 내 버전이 내 플랫폼의 최소 버전보다 낮으면 막는다.
 * 하던 일은 끊지 않는다: "바쁜" 화면이 있는 동안에는 막는 것을 미룬다. 서버의 426 알림(force)만 바로 막는다.
 * 확인하지 못하면 막지 않는다. 판정은 메모리에만 있다(앱을 새로 켜면 처음부터 다시 묻는다).
 *
 * 점검(결정 030)도 같은 설정으로 함께 판정한다. 웹에서도 보고, 바쁜 화면이 있으면 미루며, 서버의 503 알림(maintain)은 바로 알린다.
 * 업데이트와 달리 붙박이가 아니다: 그 뒤 성공한 확인이 점검이 끝났다고 하면 풀린다.
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
  /** 점검 화면을 보여야 하면 관리자의 안내(없으면 message 가 null)가 담긴다. 점검이 아니면 null. 업데이트보다 먼저다 */
  maintenance: { message: string | null } | null;
};

export type UpdateStoreDeps = {
  /** 이 앱의 플랫폼과 버전. 웹은 null 이고, 그러면 버전으로는 막지 않는다(점검은 웹에서도 본다) */
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
  /** 설정이 "점검 중" 이라고 했는가 */
  let maintenanceActive = false;
  /** 서버가 503 으로 거절했는가. 그 뒤 성공한 확인(사용자가 누르거나 앞으로 돌아올 때)이 점검이 끝났다고 하면 풀린다 */
  let maintenanceForced = false;
  /** 503 알림이 온 횟수. 확인이 도는 동안 알림이 왔는지(그 확인의 답이 알림보다 옛것인지) 가린다 */
  let maintenanceSignals = 0;
  let maintenanceMessage: string | null = null;
  let state: UpdateState = { blocked: false, message, storeUrl, maintenance: null };
  /** lifts: 이 확인의 답으로 503 표시를 풀어도 되는가(503 알림이 스스로 부른 확인은 풀지 않는다) */
  let checking: { promise: Promise<void>; lifts: boolean } | null = null;
  const listeners = new Set<() => void>();

  /** 한 번 막으면 바쁨이 새로 등록돼도 풀지 않는다(막는 화면이 떠 있으면 다른 화면은 없다) */
  function emit() {
    const blocked = forced || (required && (busy === 0 || state.blocked));
    const inMaintenance = maintenanceForced || (maintenanceActive && (busy === 0 || state.maintenance !== null));
    if (
      blocked === state.blocked &&
      message === state.message &&
      storeUrl === state.storeUrl &&
      inMaintenance === (state.maintenance !== null) &&
      (!inMaintenance || maintenanceMessage === state.maintenance?.message)
    )
      return;
    state = { blocked, message, storeUrl, maintenance: inMaintenance ? { message: maintenanceMessage } : null };
    listeners.forEach((listener) => listener());
  }

  /** 설정을 받아 판정한다. 받지 못하면 앞의 판정을 그대로 둔다. 겹쳐 불려도 서버는 한 번만 부른다 */
  function check(lifts = true): Promise<void> {
    if (checking) {
      // 503 알림이 부른 확인이 도는 중에 사용자가 다시 확인하면, 그것이 끝난 뒤 풀 수 있는 확인을 새로 한다.
      return lifts && !checking.lifts ? checking.promise.then(() => check()) : checking.promise;
    }
    const signals = maintenanceSignals;
    const promise = (async () => {
      const r = await deps.getAppConfig();
      if (!r.ok) return;
      // maintenance 키가 없는 옛 서버의 응답은 점검 중이 아닌 것으로 읽는다.
      maintenanceActive = r.data.maintenance?.active ?? false;
      maintenanceMessage = r.data.maintenance?.message ?? null;
      if (lifts && signals === maintenanceSignals) maintenanceForced = false;
      if (deps.client) {
        const config = r.data[deps.client.platform];
        required = isBelowVersion(deps.client.version, config.minVersion);
        message = config.message;
        storeUrl = config.storeUrl;
      }
      emit();
    })().finally(() => {
      checking = null;
    });
    checking = { promise, lifts };
    return promise;
  }

  return {
    getSnapshot: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** 설정을 다시 받아 판정한다(켜질 때 · 앞으로 돌아올 때 · 점검 화면의 "다시 확인") */
    check: () => check(),

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

    /**
     * 서버가 503 `MAINTENANCE` 로 거절했다. 바쁨과 상관없이 바로 점검을 알리고, 안내를 받으러 설정을 묻는다.
     * 이 확인의 답으로는 풀지 않는다(설정이 아직 점검 전이라고 하면 풀렸다 막혔다를 되풀이한다).
     */
    maintain() {
      const first = !maintenanceForced;
      maintenanceForced = true;
      maintenanceSignals += 1;
      emit();
      if (first) void check(false);
    },
  };
}

export type UpdateStore = ReturnType<typeof createUpdateStore>;
