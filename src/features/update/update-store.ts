/**
 * 강제 업데이트의 판정(결정 027). 내 버전이 내 플랫폼의 최소 버전보다 낮으면 막는다.
 * 하던 일은 끊지 않는다: "바쁜" 화면이 있는 동안에는 막는 것을 미룬다. 서버의 426 알림(force)만 바로 막는다.
 * 확인하지 못하면 막지 않는다. 판정은 메모리에만 있다(앱을 새로 켜면 처음부터 다시 묻는다).
 *
 * 점검(결정 030)도 같은 설정으로 함께 판정한다. 웹에서도 보고, 바쁜 화면이 있으면 미루며, 서버의 503 알림(maintain)은 바로 알린다.
 * 업데이트와 달리 붙박이가 아니다: 그 뒤 성공한 확인이 점검이 끝났다고 하면 풀린다.
 *
 * 업데이트 권유(결정 059)도 여기서 정한다: 최신 버전보다 낮고 최소 이상이면 그 최신 버전을 한 번 권한다(getSuggestion).
 * 막거나 점검 중이거나 바쁜 화면이 있으면 권하지 않는다. 같은 최신 버전은 한 번만 — 물은 버전은 기기에 적어 둔다.
 */
import { isBelowVersion, shouldSuggestUpdate } from '@/features/update/version';
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
  /** 기기에 적어 둔 "업데이트를 권한 최신 버전"(없으면 null). 권할 수 있게 됐을 때 처음 한 번만 읽는다 */
  loadAsked: () => Promise<string | null>;
  /** 권유 창을 닫았을 때 그 최신 버전을 기기에 적는다 */
  saveAsked: (version: string) => Promise<void>;
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
  /** 서버가 503 으로 거절했는가. 그 뒤 성공한 확인(점검 화면의 1분마다 · 앞으로 돌아올 때)이 점검이 끝났다고 하면 풀린다 */
  let maintenanceForced = false;
  /** 503 알림이 온 횟수. 확인이 도는 동안 알림이 왔는지(그 확인의 답이 알림보다 옛것인지) 가린다 */
  let maintenanceSignals = 0;
  let maintenanceMessage: string | null = null;
  /** 내 플랫폼의 최신 · 최소 버전(결정 059). 웹은 null 이다 */
  let latest: string | null = null;
  let min: string | null = null;
  /** 기기에 적어 둔 "권한 최신 버전". undefined 는 아직 읽지 않았거나 읽지 못한 것(그동안 권하지 않는다) */
  let asked: string | null | undefined;
  let askedLoading = false;
  let state: UpdateState = { blocked: false, message, storeUrl, maintenance: null };
  /** 권할 최신 버전. 권하지 않으면 null */
  let suggestion: string | null = null;
  /** lifts: 이 확인의 답으로 503 표시를 풀어도 되는가(503 알림이 스스로 부른 확인은 풀지 않는다) */
  let checking: { promise: Promise<void>; lifts: boolean } | null = null;
  const listeners = new Set<() => void>();
  /**
   * 첫 확인으로 권할지가 정해졌는가(받지 못했어도 정해진 것으로 본다). 홈의 다른 권유(알림 받기, 결정 066)가 업데이트 권유와 같이 뜨지 않게
   * 이것을 기다린다. 기기에 적어 둔 "권한 최신 버전" 을 읽어야 하면 그것까지
   */
  let settled = false;
  /** 정해짐은 따로 알린다(화면 판정의 구독자에게 한 번 더 알리지 않게) */
  const settledListeners = new Set<() => void>();
  function settle() {
    if (settled) return;
    settled = true;
    settledListeners.forEach((listener) => listener());
  }

  /** 한 번 막으면 바쁨이 새로 등록돼도 풀지 않는다(막는 화면이 떠 있으면 다른 화면은 없다) */
  function emit() {
    const blocked = forced || (required && (busy === 0 || state.blocked));
    const inMaintenance = maintenanceForced || (maintenanceActive && (busy === 0 || state.maintenance !== null));
    // 권유는 막지 않고 점검도 아니며 바쁜 화면이 없을 때만, 물은 버전을 읽은 뒤에만 한다
    const nextSuggestion =
      deps.client &&
      !blocked &&
      !inMaintenance &&
      busy === 0 &&
      asked !== undefined &&
      shouldSuggestUpdate(deps.client.version, latest, min, asked)
        ? latest
        : null;
    const same =
      blocked === state.blocked &&
      message === state.message &&
      storeUrl === state.storeUrl &&
      inMaintenance === (state.maintenance !== null) &&
      (!inMaintenance || maintenanceMessage === state.maintenance?.message);
    if (same && nextSuggestion === suggestion) return;
    if (!same) state = { blocked, message, storeUrl, maintenance: inMaintenance ? { message: maintenanceMessage } : null };
    suggestion = nextSuggestion;
    listeners.forEach((listener) => listener());
  }

  /** 권할 수 있게 되면 그때 한 번 기기에 적어 둔 "권한 최신 버전" 을 읽는다. 읽지 못하면 이번 실행에서는 권하지 않는다 */
  function loadAsked() {
    if (askedLoading || !deps.client || !shouldSuggestUpdate(deps.client.version, latest, min, null)) return;
    askedLoading = true;
    deps.loadAsked().then(
      (value) => {
        asked = value;
        emit();
        settle();
      },
      () => settle(),
    );
  }

  /** 설정을 받아 판정한다. 받지 못하면 앞의 판정을 그대로 둔다. 겹쳐 불려도 서버는 한 번만 부른다 */
  function check(lifts = true): Promise<void> {
    if (checking) {
      // 503 알림이 부른 확인이 도는 중에 다른 확인(1분마다 · 앞으로 돌아올 때)이 오면, 그것이 끝난 뒤 풀 수 있는 확인을 새로 한다.
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
        latest = config.latestVersion;
        min = config.minVersion;
        loadAsked();
      }
      emit();
    })().finally(() => {
      checking = null;
      // 읽을 "권한 최신 버전" 이 없으면(권할 일이 없거나 받지 못함) 여기서 정해진다
      if (!askedLoading) settle();
    });
    checking = { promise, lifts };
    return promise;
  }

  return {
    getSnapshot: () => state,

    /** 권할 최신 버전(결정 059). 권하지 않으면 null. 같은 subscribe 로 바뀜을 알린다 */
    getSuggestion: () => suggestion,

    /** 첫 확인으로 권할지가 정해졌는가(subscribeSettled 로 바뀜을 알린다) */
    getSettled: () => settled,
    subscribeSettled(listener: () => void) {
      settledListeners.add(listener);
      return () => {
        settledListeners.delete(listener);
      };
    },

    /** 권유 창을 닫았다("나중에" · "업데이트"). 이 최신 버전은 다시 권하지 않고, 기기에 적는다(적지 못해도 이번 실행에서는 권하지 않는다) */
    dismissSuggestion() {
      if (suggestion === null) return;
      asked = suggestion;
      deps.saveAsked(suggestion).catch(() => {});
      emit();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** 설정을 다시 받아 판정한다(켜질 때 · 앞으로 돌아올 때 · 점검 화면이 떠 있는 동안 1분마다) */
    check: () => check(),

    /** 하던 일이 있는 화면이 떠 있는 동안 부른다. 돌려준 함수를 화면에서 나올 때 부른다 */
    enterBusy(): () => void {
      busy += 1;
      // 권유는 바쁘면 내지 않는다 — 들어갈 때도 알려 권유를 거둔다(리뷰 PR #44)
      emit();
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
