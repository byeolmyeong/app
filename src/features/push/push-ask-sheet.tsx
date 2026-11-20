import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { GlowOrb } from '@/components/glow';
import { Sheet } from '@/components/sheet';
import { useSplashGone } from '@/components/splash-view';
import { clockToWheel, formatClock, TimeWheel, wheelToClock, type WheelTime } from '@/components/time-wheel';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, PushAskLayout as L, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { getPushPermission, requestPushPermission } from '@/features/push/push';
import { useUpdateSuggestion } from '@/features/update/update-gate';
import { api, type AccountPatch } from '@/lib/api';

const A = strings.push.ask;
const BYEOLI = require('@/assets/images/share/byeoli-default.png');
/** 이 기기에서 한 번 물었는가 — 기기에 붙는 값(로그아웃 정리가 지우지 않는다, 결정 042). "나중에" 면 다시 묻지 않는다(066 의 2) */
export const PUSH_ASK_KEY = 'byeolmyeong-device.push-ask.v1';
/** 고른 것을 서버에 아직 저장하지 못했다 — 다음에 홈에 올 때 시트 없이 다시 보낸다(#67 리뷰) */
export const PUSH_ASK_PENDING_KEY = 'byeolmyeong-device.push-ask-pending.v1';
/** 받는 시간의 기본(결정 057 의 4) · 간격(서버 S10-2) */
const DEFAULT_TIME = '08:00';
const TIME_STEP = 5;
const FALLBACK: WheelTime = { period: 'AM', hour: 8, minute: 0 };
/** 업데이트 확인이 이만큼 지나도 끝나지 않으면 기다리지 않는다(요청이 멈춘 경우, #70 리뷰) */
const UPDATE_WAIT_MS = 5000;

/** 저장을 보낸다. 못 하면 기기에 남겨 다음에 다시 보낸다 */
async function save(patch: AccountPatch): Promise<void> {
  try {
    const res = await api.updateAccount(patch);
    if (res.ok) {
      await AsyncStorage.removeItem(PUSH_ASK_PENDING_KEY);
      return;
    }
  } catch {
    // 아래에서 남긴다
  }
  await AsyncStorage.setItem(PUSH_ASK_PENDING_KEY, JSON.stringify(patch)).catch(() => {});
}

/**
 * 알림 받기 권유(보드 11-10 → 11-11, 결정 066 의 1 · 2): 별명을 받은 뒤 처음 홈에서 한 번 우리 시트를 띄운다 — 스플래시 · 이용 정지 확인이 끝난 뒤에.
 * 별이 · "매일 오늘의 하늘을 보내 드릴까요?" · 설명 · "받는 시간 · 오전 8:00 ›"(누르면 같은 시트 안에서 시각 드럼, 고른 시각이 줄에 바로) ·
 * 맨 아래 "알림 받기", 그 위 "나중에".
 * - 알림 받기 → 휴대폰 권한 창(11-11, 아직 묻지 않았을 때만) → 허용이면 푸시 동의 · 오늘의 하늘을 켜고 시각을 한 번에 저장, 거절이면 시각만(바꿨을 때만).
 * - 나중에(밖을 눌러 닫아도) → 다시 묻지 않는다. 마이 › 알림에서 켤 수 있다.
 * - 휴대폰에서 이미 거절했거나 웹이면 띄우지 않는다(창이 다시 뜨지 않으니 마이 › 알림의 "설정 열기"로). 이미 허용이면 창만 건너뛴다.
 * - 받는 시간은 계정의 값(`time`)에서 시작한다 — 다른 기기에서 정한 시각을 덮지 않게.
 * - 별명 공개를 본 뒤에만(`ready` — 홈에 받아 둔 풀이가 있다, 짓는 중에 닫았다 연 경우는 아직) 띄운다.
 * - 업데이트 권유(결정 059)가 먼저: 첫 확인이 끝날 때까지 기다리고, 이번 홈 방문에 업데이트 권유가 있으면 다음 방문으로 미룬다.
 * 홈 화면에 한 줄로 붙인다.
 */
export function PushAskSheet({ time: savedTime, ready = true }: { time?: string; ready?: boolean }) {
  const splashGone = useSplashGone();
  const update = useUpdateSuggestion();
  /** 이번 홈 방문에 업데이트 권유가 있었다 — 이 방문에서는 띄우지 않는다 */
  const [deferred, setDeferred] = useState(false);
  if (update === 'suggesting' && !deferred) setDeferred(true);
  const [updateWaitOver, setUpdateWaitOver] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [step, setStep] = useState<'hidden' | 'ask' | 'time'>('hidden');
  const [time, setTime] = useState(savedTime ?? DEFAULT_TIME);
  const [draft, setDraft] = useState<WheelTime>(FALLBACK);
  /** 사용자가 시각을 고쳤는가 — 아니면 계정 값이 늦게 와도 따라간다 */
  const [touched, setTouched] = useState(false);
  if (!touched && savedTime && savedTime !== time) setTime(savedTime);
  /** 누름은 한 번만(닫히는 움직임 동안 두 번 눌러도) */
  const acted = useRef(false);
  /** 이번에 이미 답했다(다시 띄우지 않는다) */
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        // 못 보낸 고른 것이 있으면 시트 없이 다시 보낸다
        const pending = await AsyncStorage.getItem(PUSH_ASK_PENDING_KEY);
        if (pending) await save(JSON.parse(pending) as AccountPatch);
        if (await AsyncStorage.getItem(PUSH_ASK_KEY)) return;
        const permission = await getPushPermission();
        if (permission === 'denied' || permission === 'unsupported') return;
        if (alive) setEligible(true);
      } catch {
        // 못 읽으면 묻지 않는다
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const waiting = eligible && splashGone && ready && update === 'checking';
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setUpdateWaitOver(true), UPDATE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
  const updateClear = update === 'none' || (update === 'checking' && updateWaitOver);
  // 스플래시가 걷힌 뒤에 띄운다(스플래시 · 정지 확인 위로 올라오지 않게)
  if (eligible && splashGone && ready && updateClear && !deferred && step === 'hidden' && !answered) setStep('ask');
  // 떠 있는 동안 업데이트 권유가 나타나면(앱으로 돌아와 다시 확인한 경우) 접는다 — 답한 것으로 적지 않아 다음 방문에 다시(#70 리뷰)
  if (deferred && step !== 'hidden' && !answered) setStep('hidden');

  const finish = () => {
    acted.current = true;
    setAnswered(true);
    setStep('hidden');
    void AsyncStorage.setItem(PUSH_ASK_KEY, '1').catch(() => {});
  };

  const later = () => {
    if (acted.current) return;
    finish();
  };

  const accept = async () => {
    if (acted.current) return;
    finish();
    try {
      const permission = await requestPushPermission();
      // 허용이면 받기까지 한 번에(가입 때 [선택] 푸시를 안 켠 사람도 받게 동의도 켠다), 거절이면 고친 시각만(앱 안 설정은 저장)
      if (permission === 'granted') await save({ pushConsent: true, todaySkyPush: true, todaySkyTime: time });
      else if (touched) await save({ todaySkyTime: time });
    } catch {
      // 권한을 못 읽어도 홈은 그대로
    }
  };

  const openTime = () => {
    setDraft(clockToWheel(time) ?? FALLBACK);
    setStep('time');
  };
  const confirmTime = () => {
    setTime(wheelToClock(draft));
    setTouched(true);
    setStep('ask');
  };

  return (
    <Sheet visible={step !== 'hidden'} onClose={step === 'time' ? () => setStep('ask') : later}>
      {step === 'time' ? (
        <View testID="time-body" style={styles.timeBody}>
          <TimeWheel value={draft} onChange={setDraft} minuteStep={TIME_STEP} />
          <Button label={strings.home.timeConfirm} onPress={confirmTime} />
        </View>
      ) : (
        <View testID="push-ask">
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.art}>
            <View style={StyleSheet.absoluteFill}>
              <GlowOrb id="pushAskGlow" />
            </View>
            <Image source={BYEOLI} accessible={false} style={styles.byeoli} />
          </View>
          <Txt variant="sheetTitle" accessibilityRole="header" style={styles.title}>
            {A.title}
          </Txt>
          <Txt color="gray" keepAll style={styles.text}>
            {A.body}
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={`${A.time} ${formatClock(time)}`} onPress={openTime} style={styles.row}>
            <Txt variant="item" style={styles.rowLabel}>
              {A.time}
            </Txt>
            <Txt variant="desc" color="gray">
              {formatClock(time)}
            </Txt>
            <Svg width={L.row.chevron} height={L.row.chevron} viewBox="0 0 24 24" fill="none" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 5l7 7-7 7" />
            </Svg>
          </Pressable>
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={later} style={styles.later}>
              <Txt variant="item" color="gray" style={styles.laterText}>
                {A.later}
              </Txt>
            </Pressable>
            <Button label={A.accept} onPress={() => void accept()} />
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  art: { width: L.glow, height: L.glow, alignSelf: 'center', marginTop: L.artTop, alignItems: 'center', justifyContent: 'center' },
  byeoli: { width: L.byeoli, height: L.byeoli },
  title: { marginTop: L.titleTop, lineHeight: L.titleLine, textAlign: 'center' },
  text: { marginTop: L.bodyTop, textAlign: 'center' },
  row: {
    marginTop: L.rowTop,
    minHeight: L.row.minHeight,
    paddingVertical: L.row.paddingV,
    paddingHorizontal: L.row.paddingH,
    borderRadius: L.row.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.fill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.row.gap,
  },
  rowLabel: { flex: 1, fontWeight: FontWeight.medium },
  buttons: { marginTop: L.buttonsTop },
  later: { height: L.later, marginBottom: L.laterGap, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontWeight: FontWeight.medium },
  /** 시각 고르기(시안 8-1 — TimeSheet 와 같은 자리) */
  timeBody: { gap: Spacing.md + Spacing.xxs, marginTop: Sizes.pickerSheetTop - Spacing.xl },
});
