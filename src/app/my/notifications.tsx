import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListCard, ListCardRow } from '@/components/list-card';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { TimeSheet } from '@/components/time-sheet';
import { formatClock } from '@/components/time-wheel';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { MyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useNotificationSettings } from '@/features/my/use-notification-settings';
import type { AccountPatch } from '@/lib/api';

const N = strings.my.notifications;
const L = MyLayout.list;
const NL = MyLayout.notifications;
/** 받는 시간은 5분 단위만 받는다(서버 S10-2) */
const TIME_STEP = 5;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

/** 뼈대의 한 줄: 다 그려진 줄과 같은 자리(이름 · 설명 / 오른쪽 스위치 또는 값) */
function SkeletonRow({ description = false, trailing }: { description?: boolean; trailing: 'switch' | 'value' }) {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonNames}>
        <Skeleton width={NL.skeleton.labelWidth} height={NL.skeleton.label} />
        {description ? <Skeleton width={NL.skeleton.descWidth} height={NL.skeleton.desc} /> : null}
      </View>
      {trailing === 'switch' ? (
        <Skeleton width={L.switch.width} height={L.switch.height} pill />
      ) : (
        <Skeleton width={L.switch.width} height={NL.skeleton.desc} />
      )}
    </View>
  );
}

/** 처음 불러올 때 0.3초가 넘으면: 다 그려진 화면과 같은 카드 셋 · 같은 줄 수(결정 065 의 뼈대 규칙) */
function NotificationsSkeleton() {
  return (
    <View accessible accessibilityLabel={strings.states.loading} style={styles.column}>
      <ListCard>
        <SkeletonRow description trailing="switch" />
      </ListCard>
      <ListCard>
        <SkeletonRow description trailing="switch" />
        <SkeletonRow trailing="value" />
      </ListCard>
      <ListCard>
        <SkeletonRow description trailing="switch" />
      </ListCard>
    </View>
  );
}

/**
 * 마이 › 알림(결정 057 · 066, 보드 16-2 · 16-2-2): 푸시 알림 받기 / 오늘의 하늘 알림 · 받는 시간(5분 단위 시트) / 이벤트 · 혜택 알림.
 * 누르면 바로 바뀌고 그 칸만 저장한다. 못 하면 되돌리고 짧은 알림(결정 065 의 1).
 * 푸시를 끄면 오늘의 하늘 묶음은 흐리게(누를 수 없음, 값은 서버가 준 그대로) 두고 그 아래에 "푸시 알림을 켜면 고를 수 있어요".
 * 오늘의 하늘 묶음은 서버가 그 두 칸을 줄 때만 그린다(서버 S10-2 전에는 없음). 처음 불러올 때 0.3초가 넘으면 뼈대, 10초가 넘거나 못 받으면
 * 실패 화면, 끊겨서 못 받았으면 20-1 — 연결이 돌아오면 다시 부른다(결정 061 · 065 의 2).
 */
export default function NotificationsScreen() {
  const { state, retry, change } = useNotificationSettings();
  const { toast, show, hide } = useToast();
  const [timeOpen, setTimeOpen] = useState(false);
  const online = useOnline();
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });
  const phase = useLoadingPhase(state.status === 'loading');
  const nav = <NavBar chevron title={N.title} onBack={back} />;

  if (state.status === 'failed' && state.error === 'NETWORK' && !online)
    return (
      <StateScreen
        nav={nav}
        title={strings.states.offlineEmpty.title}
        body={strings.states.offlineEmpty.body}
        primary={{ label: strings.states.offlineEmpty.retry, onPress: retry }}
      />
    );
  if (state.status === 'failed' || phase === 'timeout')
    return (
      <StateScreen
        nav={nav}
        title={N.loadFail}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: retry }}
      />
    );

  const save = (patch: AccountPatch) =>
    void change(patch).then((ok) => {
      if (!ok) show('error', N.saveFailed);
    });
  const s = state.status === 'ready' ? state.settings : null;
  // 짧은 알림은 화면 아래 끝 바로 위에 뜬다(감싼 View 가 기준)
  const footer = (
    <View>
      <Toast toast={toast} onClose={hide} above="tabs" />
    </View>
  );
  return (
    <Screen nav={nav} footer={footer}>
      {s ? (
        <View style={styles.column}>
          <ListCard>
            <ListCardRow
              label={N.push.label}
              description={N.push.description}
              toggle={{ value: s.pushConsent, onChange: (on) => save({ pushConsent: on }) }}
            />
          </ListCard>
          {s.todaySky ? (
            <>
              <View
                testID="today-sky"
                pointerEvents={s.pushConsent ? 'auto' : 'none'}
                accessibilityState={{ disabled: !s.pushConsent }}
                style={!s.pushConsent && styles.dim}>
                <ListCard>
                  <ListCardRow
                    label={N.todaySky.label}
                    description={N.todaySky.description}
                    toggle={{ value: s.todaySky.on, onChange: (on) => save({ todaySkyPush: on }) }}
                  />
                  <ListCardRow label={N.time} value={formatClock(s.todaySky.time)} onPress={() => setTimeOpen(true)} />
                </ListCard>
              </View>
              {!s.pushConsent ? (
                <Txt variant="caption" color="hint" keepAll style={styles.hint}>
                  {N.pushOff}
                </Txt>
              ) : null}
            </>
          ) : null}
          <ListCard>
            <ListCardRow
              label={N.marketing.label}
              description={N.marketing.description}
              toggle={{ value: s.marketingConsent, onChange: (on) => save({ marketingConsent: on }) }}
            />
          </ListCard>
        </View>
      ) : phase === 'skeleton' ? (
        <NotificationsSkeleton />
      ) : null}
      {s?.todaySky ? (
        <TimeSheet
          visible={timeOpen}
          value={s.todaySky.time}
          minuteStep={TIME_STEP}
          onConfirm={(time) => {
            setTimeOpen(false);
            if (time !== s.todaySky?.time) save({ todaySkyTime: time });
          }}
          onClose={() => setTimeOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 머리 아래 12, 카드끼리 12(보드 16-2) */
  column: { gap: MyLayout.gap, paddingTop: MyLayout.gap },
  dim: { opacity: NL.dim },
  hint: { paddingHorizontal: NL.hintPadH },
  skeletonRow: {
    minHeight: L.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
  },
  skeletonNames: { flex: 1, gap: NL.skeleton.gap },
});
