import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
import { Colors, FontWeight, LineWidth, MyLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useNotificationSettings } from '@/features/my/use-notification-settings';
import { openPushSettings, requestPushPermission, usePushPermission } from '@/features/push/push';
import type { AccountPatch } from '@/lib/api';

const N = strings.my.notifications;
const L = MyLayout.list;
const NL = MyLayout.notifications;
/** 받는 시간은 5분 단위만 받는다(서버 S10-2) */
const TIME_STEP = 5;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

/** 뼈대의 한 줄: 다 그려진 줄과 같은 자리(이름 / 오른쪽 스위치 또는 값) */
function SkeletonRow({ trailing }: { trailing: 'switch' | 'value' }) {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonNames}>
        <View style={styles.labelLine}>
          <Skeleton width={NL.skeleton.labelWidth} height={NL.skeleton.label} />
        </View>
      </View>
      {trailing === 'switch' ? (
        <Skeleton width={L.switch.width} height={L.switch.height} pill />
      ) : (
        <Skeleton width={L.switch.width} height={NL.skeleton.desc} />
      )}
    </View>
  );
}

/** 휴대폰 설정에서 이 앱 알림이 꺼져 있을 때 맨 위 줄(16-2-1): 종 끈 그림 · 두 줄 글 · 오른쪽 "설정 열기 ›". 줄 어디를 눌러도 휴대폰 설정으로 */
function OsOffRow() {
  const O = N.osOff;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${O.title}. ${O.action}`}
      accessibilityHint={O.description}
      onPress={() => void openPushSettings().catch(() => {})}
      style={styles.osOff}>
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.osOffIcon}>
        <Svg width={NL.osOff.glyph} height={NL.osOff.glyph} viewBox="0 0 24 24" fill="none" stroke={Colors.accentText} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2h-15" />
          <Path d="M10 20a2 2 0 0 0 4 0" />
          <Path d="M4 4l16 16" />
        </Svg>
      </View>
      <View style={styles.osOffText}>
        <Txt variant="body" style={styles.osOffTitle}>
          {O.title}
        </Txt>
        <Txt variant="caption" color="hint" keepAll>
          {O.description}
        </Txt>
      </View>
      <View style={styles.osOffAction}>
        <Txt variant="term" color="accentText">
          {O.action}
        </Txt>
        <Svg width={NL.osOff.chevron} height={NL.osOff.chevron} viewBox="0 0 24 24" fill="none" stroke={Colors.accentText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 5l7 7-7 7" />
        </Svg>
      </View>
    </Pressable>
  );
}

/**
 * 처음 불러올 때 0.3초가 넘으면: 다 그려진 화면과 같은 카드 셋 · 같은 줄 수 · 같은 높이(결정 065 의 뼈대 규칙) — 막대는 글자 줄 높이 칸 가운데에
 * 둬 줄 높이가 실제 줄과 같다. 설명 줄은 없다(소유자 2026-11-26).
 */
function NotificationsSkeleton() {
  return (
    <View accessible accessibilityLabel={strings.states.loading} style={styles.column}>
      <ListCard>
        <SkeletonRow trailing="switch" />
      </ListCard>
      <ListCard>
        <SkeletonRow trailing="switch" />
        <SkeletonRow trailing="value" />
      </ListCard>
      <ListCard>
        <SkeletonRow trailing="switch" />
      </ListCard>
    </View>
  );
}

/**
 * 마이 › 알림(결정 057 · 066, 보드 16-2 · 16-2-2): 푸시 알림 / 오늘의 하늘 알림 · 받는 시간(5분 단위 시트) / 이벤트 · 혜택 알림.
 * 누르면 바로 바뀌고 그 칸만 저장한다. 못 하면 되돌리고 짧은 알림(결정 065 의 1).
 * 푸시를 끄면 오늘의 하늘 묶음은 흐리게(누를 수 없음, 값은 서버가 준 그대로) — 안내 줄은 두지 않는다(소유자 2026-11-21).
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
  // 휴대폰 설정에서 꺼져 있으면 맨 위에 "설정 열기" 줄, 아래 설정은 흐리게(값은 그대로, 결정 066 의 3). 앱으로 돌아오면 다시 읽는다
  const permission = usePushPermission();
  const osOff = permission === 'denied';
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
          {osOff ? <OsOffRow /> : null}
          <View testID="settings" style={[styles.stack, osOff && styles.dim]}>
          <ListCard>
            <ListCardRow
              label={N.push.label}
              toggle={{
                value: s.pushConsent,
                onChange: (on) =>
                  void change({ pushConsent: on }).then((ok) => {
                    if (!ok) show('error', N.saveFailed);
                    // 홈의 권유에서 "나중에" 를 골라 휴대폰 권한을 아직 묻지 않았으면, 켜서 저장한 뒤에 묻는다(묻지 않으면 켜도 오지 않는다)
                    else if (on && permission === 'undetermined') void requestPushPermission().catch(() => {});
                  }),
              }}
            />
          </ListCard>
          {s.todaySky ? (
            <>
              <View
                testID="today-sky"
                pointerEvents={s.pushConsent ? 'auto' : 'none'}
                accessibilityState={{ disabled: !s.pushConsent }}
                // 휴대폰 설정에서 꺼져 바깥이 이미 흐리면 다시 흐리게 하지 않는다(겹쳐 0.16 이 되지 않게, #65 리뷰)
                style={!s.pushConsent && !osOff && styles.dim}>
                <ListCard>
                  <ListCardRow
                    label={N.todaySky.label}
                    toggle={{ value: s.todaySky.on, onChange: (on) => save({ todaySkyPush: on }) }}
                    disabled={!s.pushConsent}
                  />
                  <ListCardRow label={N.time} value={formatClock(s.todaySky.time)} onPress={() => setTimeOpen(true)} disabled={!s.pushConsent} />
                </ListCard>
              </View>
            </>
          ) : null}
          <ListCard>
            <ListCardRow
              label={N.marketing.label}
              toggle={{ value: s.marketingConsent, onChange: (on) => save({ marketingConsent: on }) }}
            />
          </ListCard>
          </View>
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
  /** 설정 카드들(휴대폰 설정에서 꺼지면 함께 흐리게) — 카드끼리 12 */
  stack: { gap: MyLayout.gap },
  osOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: NL.osOff.padV,
    paddingHorizontal: NL.osOff.padH,
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  osOffIcon: {
    width: NL.osOff.icon,
    height: NL.osOff.icon,
    borderRadius: NL.osOff.icon / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NL.osOff.iconFill,
  },
  osOffText: { flex: 1, gap: L.descGap },
  osOffTitle: { fontWeight: FontWeight.medium },
  osOffAction: { flexDirection: 'row', alignItems: 'center', gap: NL.osOff.actionGap },
  skeletonRow: {
    minHeight: L.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
  },
  skeletonNames: { flex: 1, gap: L.descGap },
  labelLine: { height: Typography.body.lineHeight, justifyContent: 'center' },
});
