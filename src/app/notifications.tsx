import { router } from 'expo-router';
import { useState } from 'react';

import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { strings } from '@/content/strings';
import { MainTabs } from '@/features/home/main-tabs';
import { useAccount } from '@/features/home/use-account';
import { NotificationGroups, NotificationsEmpty, NotificationsSkeleton } from '@/features/notifications/notification-list';
import { notificationTarget, visibleNotifications } from '@/features/notifications/notification-rows';
import { useNotifications } from '@/features/notifications/use-notifications';
import type { NotificationItem } from '@/lib/api';

const N = strings.notifications;
const ST = strings.states;

/** 뒤로: 홈에서 왔으면 그리로, 주소로 바로 열었으면 홈으로 */
const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * 알림함 `/notifications`(결정 052 · 058 · 065, 보드 11-3 · 11-3-1): 홈의 종을 누르면. 최근 30일의 알림을 받은 날(한국 날짜)로 묶어 —
 * 오늘 · 최근 7일 · 최근 30일 — 줄마다 아이콘 · 제목 · 본문 · 때 · 안 읽음 점. 누르면 읽음으로 하고(실패해도) 그 화면으로 간다.
 * 비었으면 "아직 알림이 없어요". 처음 불러올 때 0.3초가 넘으면 뼈대, 10초가 넘거나 못 받으면 실패 화면(19), 볼 게 없는데 끊겼으면 20-1.
 * 홈 탭 안의 화면이라 아래 탭(홈)이 있다.
 */
export default function NotificationsScreen() {
  const { state, retry, markRead } = useNotifications();
  const online = useOnline();
  // 별명 지음의 "새벽별 님의 …" — 받지 못하면 닉네임 없이
  const account = useAccount(online);
  // 묶음 · 때의 "지금" — 화면이 뜬 때로 한 번 정한다(그리는 동안 시계를 읽지 않는다)
  const [now] = useState(Date.now);
  const phase = useLoadingPhase(state.status === 'loading');
  useOnReconnect(online, () => {
    if (state.status === 'failed') retry();
  });
  const nav = <NavBar chevron title={N.title} onBack={back} />;
  const tabs = <MainTabs active="home" nested />;

  const open = (item: NotificationItem) => {
    const target = notificationTarget(item);
    if (!target) return;
    if (!item.read) markRead(item.id);
    router.push(target);
  };

  if (state.status === 'failed' && state.error === 'NETWORK' && !online)
    return <StateScreen nav={nav} tabs={tabs} title={ST.offlineEmpty.title} body={ST.offlineEmpty.body} primary={{ label: ST.offlineEmpty.retry, onPress: retry }} />;
  if (state.status === 'failed' || phase === 'timeout')
    return <StateScreen nav={nav} tabs={tabs} title={N.loadFail.title} body={ST.loadFail.body} primary={{ label: ST.loadFail.retry, onPress: retry }} />;

  const items = state.status === 'ready' ? visibleNotifications(state.list.items) : null;
  return (
    <Screen nav={nav} footer={tabs}>
      {online ? null : <OfflineBanner />}
      {state.status === 'loading' && phase === 'skeleton' ? <NotificationsSkeleton /> : null}
      {items && items.length > 0 ? <NotificationGroups items={items} nickname={account?.nickname ?? null} now={now} onOpen={open} /> : null}
      {items && items.length === 0 ? <NotificationsEmpty /> : null}
    </Screen>
  );
}
