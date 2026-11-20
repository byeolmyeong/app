import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { CheckBox } from '@/components/checkbox';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, MyLayout, ScreenPaddingX, Sizes, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { deleteAccount } from '@/features/auth/delete-account';
import { clearSession } from '@/features/auth/use-session';

const D = strings.my.delete;
const L = MyLayout.delete;
const DONE = MyLayout.done;

/** 지운 뒤 "확인": 세션을 비우고, 쌓인 화면(마이 · 계정)을 걷어 내고 로그인 화면만 남긴다(결정 034) */
async function finish() {
  await clearSession();
  if (router.canDismiss()) router.dismissAll();
  router.replace('/login');
}

/**
 * 계정 삭제(결정 056 의 8, 보드 16-10): 지워지는 것 넷 · "위 내용을 모두 확인했어요" 체크 · 맨 아래 위험 버튼(결정 065 의 6, 체크 전엔 꺼짐).
 * 서버가 지우면 "계정을 지웠어요" 로 바뀌고, "확인" 을 누를 때 세션을 비우고 로그인으로 간다(쌓인 화면은 걷어 낸다).
 * 지우지 못하면 이 화면에 머물며 짧은 알림으로 알린다(결정 065 의 1). 스스로 다시 요청하지 않고, 다시 누를 때만 한다.
 */
export default function DeleteAccountScreen() {
  const { toast, show, hide } = useToast();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  /** 지우는 중(두 번 눌러도 한 번만) */
  const sending = useRef(false);

  async function confirm() {
    if (!checked || sending.current) return;
    sending.current = true;
    setBusy(true);
    const res = await deleteAccount();
    sending.current = false;
    setBusy(false);
    if (res.ok) setDone(true);
    else show('error', res.error === 'NETWORK' ? D.failed.NETWORK : D.failed.OTHER);
  }

  // 지운 뒤에는 뒤로 가기(안드로이드)도 "확인" 과 같다 — 지운 계정의 화면으로 돌아가지 않는다
  useEffect(() => {
    if (!done) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      void finish();
      return true;
    });
    return () => sub.remove();
  }, [done]);

  if (done)
    return (
      <Screen scroll={false} nav={<View style={styles.blankNav} />}>
        <View style={styles.doneBody}>
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.doneIcon}>
            <Svg width={DONE.iconGlyph} height={DONE.iconGlyph} viewBox="0 0 24 24" fill="none">
              <Path d="M15.5 4.2A8.5 8.5 0 1 0 19.8 15.5A7 7 0 0 1 15.5 4.2Z" stroke={Colors.accentText} strokeWidth={1.8} strokeLinejoin="round" />
            </Svg>
          </View>
          <Txt variant="headline" accessibilityRole="header" style={styles.doneTitle}>
            {D.doneTitle}
          </Txt>
          <Txt color="gray" keepAll style={styles.doneText}>
            {D.doneBody}
          </Txt>
        </View>
        <View style={styles.footer}>
          <Button label={D.doneConfirm} onPress={() => void finish()} />
        </View>
      </Screen>
    );

  return (
    <Screen scroll={false} nav={<NavBar chevron title={D.title} onBack={() => router.back()} />}>
      <View style={styles.body}>
        <Txt variant="headline" keepAll style={styles.heading}>
          {D.heading}
        </Txt>
        <View style={styles.note}>
          {D.items.map((item) => (
            <View key={item} style={styles.item}>
              <View style={styles.dot} />
              <Txt variant="lead" color="inkSoft" keepAll style={styles.itemText}>
                {item}
              </Txt>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={() => setChecked((on) => !on)}
          style={styles.check}>
          <CheckBox checked={checked} size={Sizes.checkSquare} />
          <Txt variant="item" style={styles.checkText}>
            {D.check}
          </Txt>
        </Pressable>
      </View>
      <View style={styles.footer}>
        <Toast toast={toast} onClose={hide} above="button" />
        <Button variant="danger" label={D.confirm} disabled={!checked || busy} onPress={() => void confirm()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 머리 아래 12, 묶음 사이 22(보드 16-10) */
  body: { flex: 1, gap: L.gap, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX },
  heading: { marginTop: L.headingTop },
  note: {
    gap: L.noteGap,
    padding: L.notePadding,
    borderRadius: MyLayout.list.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  item: { flexDirection: 'row', gap: L.dotGap },
  dot: { width: L.dot, height: L.dot, marginTop: L.dotTop, borderRadius: L.dot / 2, backgroundColor: Colors.hint },
  itemText: { flex: 1 },
  check: { flexDirection: 'row', alignItems: 'center', gap: L.checkGap, paddingVertical: L.checkPadV, paddingHorizontal: L.checkPadH },
  checkText: { fontWeight: FontWeight.medium },
  footer: { paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
  /** 지웠어요: 머리 자리(56)는 비워 두고, 그림 · 제목 · 설명을 가운데에서 조금 위로 */
  blankNav: { height: Sizes.stepHeader },
  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ScreenPaddingX, paddingBottom: DONE.lift },
  doneIcon: {
    width: DONE.icon,
    height: DONE.icon,
    borderRadius: DONE.icon / 2,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { marginTop: DONE.titleTop, textAlign: 'center' },
  doneText: { marginTop: DONE.bodyTop, textAlign: 'center' },
});
