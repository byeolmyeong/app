import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { GlowOrb } from '@/components/glow';
import { Sheet } from '@/components/sheet';
import { TimeSheet } from '@/components/time-sheet';
import { formatClock } from '@/components/time-wheel';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, PushAskLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { getPushPermission, requestPushPermission } from '@/features/push/push';
import { api } from '@/lib/api';

const A = strings.push.ask;
const BYEOLI = require('@/assets/images/share/byeoli-default.png');
/** 이 기기에서 한 번 물었는가 — 기기에 붙는 값(로그아웃 정리가 지우지 않는다, 결정 042). "나중에" 면 다시 묻지 않는다(066 의 2) */
export const PUSH_ASK_KEY = 'byeolmyeong-device.push-ask.v1';
/** 받는 시간의 기본(결정 057 의 4) · 간격(서버 S10-2) */
const DEFAULT_TIME = '08:00';
const TIME_STEP = 5;

/**
 * 알림 받기 권유(보드 11-10 → 11-11, 결정 066 의 1 · 2): 별명을 받은 뒤 처음 홈에서 한 번, 휴대폰 권한을 아직 묻지 않았을 때만 우리 시트를 띄운다.
 * 별이 · "매일 오늘의 하늘을 보내 드릴까요?" · 설명 · "받는 시간 · 오전 8:00 ›"(누르면 시각 시트) · 맨 아래 "알림 받기", 그 위 "나중에".
 * - 알림 받기 → 휴대폰 권한 창(11-11) → 허용이면 푸시 동의 · 오늘의 하늘을 켜고 고른 시각을 한 번에 저장, 거절이면 시각만 저장.
 * - 나중에(밖을 눌러 닫아도) → 다시 묻지 않는다. 마이 › 알림에서 켤 수 있다.
 * 웹 · 이미 정해진 권한(허용 · 거절)이면 띄우지 않는다. 홈 화면에 한 줄로 붙인다.
 */
export function PushAskSheet() {
  const [step, setStep] = useState<'hidden' | 'ask' | 'time'>('hidden');
  const [time, setTime] = useState(DEFAULT_TIME);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (await AsyncStorage.getItem(PUSH_ASK_KEY)) return;
        if ((await getPushPermission()) !== 'undetermined') return;
        if (alive) setStep('ask');
      } catch {
        // 못 읽으면 묻지 않는다
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const markAsked = () => void AsyncStorage.setItem(PUSH_ASK_KEY, '1').catch(() => {});

  const later = () => {
    setStep('hidden');
    markAsked();
  };

  const accept = async () => {
    setStep('hidden');
    markAsked();
    const permission = await requestPushPermission();
    // 허용이면 받기까지 한 번에(가입 때 [선택] 푸시를 안 켠 사람도 받게 동의도 켠다), 거절이면 고른 시각만(앱 안 설정은 저장)
    await api.updateAccount(permission === 'granted' ? { pushConsent: true, todaySkyPush: true, todaySkyTime: time } : { todaySkyTime: time });
  };

  return (
    <>
      <Sheet visible={step === 'ask'} onClose={later}>
        <View testID="push-ask" style={styles.body}>
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
          <Pressable accessibilityRole="button" accessibilityLabel={`${A.time} ${formatClock(time)}`} onPress={() => setStep('time')} style={styles.row}>
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
      </Sheet>
      <TimeSheet
        visible={step === 'time'}
        value={time}
        minuteStep={TIME_STEP}
        onConfirm={(next) => {
          setTime(next);
          setStep('ask');
        }}
        onClose={() => setStep('ask')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'stretch' },
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
    gap: L.row.paddingV,
  },
  rowLabel: { flex: 1, fontWeight: FontWeight.medium },
  buttons: { marginTop: L.buttonsTop },
  later: { height: L.later, marginBottom: L.laterGap, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontWeight: FontWeight.medium },
});
