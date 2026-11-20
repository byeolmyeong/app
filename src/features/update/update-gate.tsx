/**
 * 강제 업데이트의 문(결정 027). 루트 레이아웃이 화면 전체를 이것으로 감싼다.
 * 앱이 켜질 때와 앞으로 돌아올 때 설정을 묻고, 막아야 하면 화면들 대신 "업데이트가 필요해요" 만 보여 준다.
 * 세션이 필요 없다. 웹과 가짜 서버에서는 막지 않는다(판정은 update-store.ts).
 * 점검(결정 030)도 여기서 본다: 점검 중이면 "점검 중이에요" 만 보여 주고(웹 포함, 업데이트보다 먼저), 끝나면 화면들이 돌아온다.
 * 업데이트 권유(결정 059)도 여기서 띄운다: 권해도 되는 자리(canSuggest — 로그인한 홈)면 화면들 위에 가운데 창을 한 번.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { MaintenanceNotice } from '@/features/update/maintenance-notice';
import { UpdateRequired } from '@/features/update/update-required';
import { createUpdateStore, type UpdateStore } from '@/features/update/update-store';
import { UpdateSuggest } from '@/features/update/update-suggest';
import { api, setMaintenanceHandler, setUpdateRequiredHandler } from '@/lib/api';
import { appClient } from '@/lib/app-client';

const UpdateContext = createContext<UpdateStore | null>(null);

/** 업데이트를 권한 최신 버전(결정 059). 기기 저장소에 둔다 — `byeolmyeong.` 머리라 로그아웃 · 탈퇴 때 함께 지워진다 */
const UPDATE_ASKED_KEY = 'byeolmyeong.updateAsked.v1';

export type UpdateGateProps = {
  children: ReactNode;
  /** 업데이트를 권해도 되는 자리인가(로그인했고 홈이다 — 로그인 전 · 가입 중에는 묻지 않는다). 주지 않으면 권하지 않는다 */
  canSuggest?: boolean;
};

export function UpdateGate({ children, canSuggest = false }: UpdateGateProps) {
  const [store] = useState(() =>
    createUpdateStore({
      client: appClient,
      getAppConfig: () => api.getAppConfig(),
      loadAsked: () => AsyncStorage.getItem(UPDATE_ASKED_KEY),
      saveAsked: (version) => AsyncStorage.setItem(UPDATE_ASKED_KEY, version),
    }),
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const suggestion = useSyncExternalStore(store.subscribe, store.getSuggestion, store.getSuggestion);

  useEffect(() => {
    // 어느 호출이든 426 UPDATE_REQUIRED 를 받으면 바로 막는다.
    setUpdateRequiredHandler(store.force);
    // 어느 호출이든 503 MAINTENANCE 를 받으면 바로 점검 화면을 보여 준다.
    setMaintenanceHandler(store.maintain);
    void store.check();
    // 쓰는 동안 시간 간격으로 묻지 않는다. 앞으로 돌아올 때만 다시 묻는다.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void store.check();
    });
    return () => {
      subscription.remove();
      setUpdateRequiredHandler(null);
      setMaintenanceHandler(null);
    };
  }, [store]);

  return (
    <UpdateContext value={store}>
      {state.maintenance ? (
        <MaintenanceNotice message={state.maintenance.message} onRetry={store.check} />
      ) : state.blocked ? (
        <UpdateRequired message={state.message} storeUrl={state.storeUrl} />
      ) : (
        // 창은 화면들 위에 뜬다. 화면들은 늘 같은 자리에 두어 창이 뜨고 닫혀도 다시 그려지지 않는다. 스토어 주소가 없으면 묻지 않는다
        <>
          {children}
          {canSuggest && suggestion && state.storeUrl ? <UpdateSuggest storeUrl={state.storeUrl} onDone={store.dismissSuggestion} /> : null}
        </>
      )}
    </UpdateContext>
  );
}

/**
 * 하던 일이 있는 화면이 부른다. active 인 동안 "바쁨" 이 등록돼 막는 화면이 미뤄지고,
 * active 가 꺼지거나 화면이 사라지면 풀린다. UpdateGate 밖에서는 아무 일도 하지 않는다.
 */
export function useUpdateBusy(active: boolean) {
  const store = useContext(UpdateContext);
  useEffect(() => {
    if (!store || !active) return;
    return store.enterBusy();
  }, [store, active]);
}

/**
 * 글을 만드는 화면의 바쁨: 만드는 중이거나, 이 화면에서 만들어 방금 받은 결과가 떠 있는 동안.
 * 받아 둔 결과를 다시 연 것(만드는 중을 거치지 않은 결과)은 바쁨이 아니다.
 */
export function useGenerationBusy(generating: boolean, hasResult: boolean) {
  const [generated, setGenerated] = useState(false);
  if (generating && !generated) setGenerated(true);
  useUpdateBusy(generating || (generated && hasResult));
}
