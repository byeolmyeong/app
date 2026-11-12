/**
 * 강제 업데이트의 문(결정 027). 루트 레이아웃이 화면 전체를 이것으로 감싼다.
 * 앱이 켜질 때와 앞으로 돌아올 때 설정을 묻고, 막아야 하면 화면들 대신 "업데이트가 필요해요" 만 보여 준다.
 * 세션이 필요 없다. 웹과 가짜 서버에서는 막지 않는다(판정은 update-store.ts).
 */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { UpdateRequired } from '@/features/update/update-required';
import { createUpdateStore, type UpdateStore } from '@/features/update/update-store';
import { api, setUpdateRequiredHandler } from '@/lib/api';
import { appClient } from '@/lib/app-client';

const UpdateContext = createContext<UpdateStore | null>(null);

export function UpdateGate({ children }: { children: ReactNode }) {
  const [store] = useState(() => createUpdateStore({ client: appClient, getAppConfig: () => api.getAppConfig() }));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    // 어느 호출이든 426 UPDATE_REQUIRED 를 받으면 바로 막는다.
    setUpdateRequiredHandler(store.force);
    void store.check();
    // 쓰는 동안 시간 간격으로 묻지 않는다. 앞으로 돌아올 때만 다시 묻는다.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void store.check();
    });
    return () => {
      subscription.remove();
      setUpdateRequiredHandler(null);
    };
  }, [store]);

  return (
    <UpdateContext value={store}>
      {state.blocked ? <UpdateRequired message={state.message} storeUrl={state.storeUrl} /> : children}
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
