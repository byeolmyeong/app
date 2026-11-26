/**
 * 가입 단계 화면의 뼈대(결정 042, 시안 보드 6 · 7 · 8): 위 뒤로 가기 · 진행 막대(세 칸) · 큰 제목과 안내, 가운데 내용, 맨 아래 주 버튼 하나.
 * 내용이 길면 가운데만 굴러간다. 키보드가 올라오면 아래 버튼이 키보드 바로 위로 올라온다(보드 7-1).
 * 진행 막대는 단계가 바뀔 때 다음 칸이 왼쪽에서 오른쪽으로 차오르고(뒤로 가면 줄어들고) 동작 줄이기면 바로 바뀐다(소유자 2026-11-19).
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackChevron } from '@/components/back-chevron';
import { useSlideUp } from '@/components/slide-up';
import { reduceMotionNow } from '@/components/byeoli';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { useOnline } from '@/components/use-online';
import { Txt } from '@/components/txt';
import { Colors, ScreenPaddingX, Sizes, StepLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { recheckSession } from '@/features/auth/use-session';

/** 가입 단계 수: 약관 · 닉네임 · 출생 정보 */
export const SIGNUP_STEPS = 3;

export type SignupStepProps = {
  /** 1 약관 · 2 닉네임 · 3 출생 정보 */
  step: 1 | 2 | 3;
  onBack: () => void;
  title: string;
  /** 제목 아래 안내 한 줄(없으면 두지 않는다) */
  guide?: string;
  /** 맨 아래 주 버튼 */
  footer: ReactNode;
  children: ReactNode;
};

/** 마지막으로 보인 단계. 단계마다 화면이 따로라 막대가 이어져 움직이도록 여기에 둔다(0 은 아직 없음) */
let shownStep = 0;

const filledAt = (count: number) => (i: number) => (i < count ? 1 : 0);

/** 차오르기 · 줄기는 네이티브 드라이버로(웹은 없다) */
const useNativeDriver = Platform.OS !== 'web';

/** 칸 하나의 채움(scaleX 0~1): 보통은 단계 값 그대로의 숫자, 움직이는 동안만 Animated 값 */
type Fill = number | Animated.Value;

/** 지난 단계 모양 → 이 단계 모양으로 움직이는 동안의 칸들. 같은 단계면 움직이지 않는다(null) */
type Move = { from: number; fills: Fill[]; moving: [Animated.Value, number][] };

function moveBetween(from: number, step: number): Move | null {
  if (from === step) return null;
  const was = filledAt(from);
  const to = filledAt(step);
  const moving: [Animated.Value, number][] = [];
  const fills = Array.from({ length: SIGNUP_STEPS }, (_, i): Fill => {
    if (was(i) === to(i)) return to(i);
    const value = new Animated.Value(was(i));
    moving.push([value, to(i)]);
    return value;
  });
  return { from, fills, moving };
}

/**
 * 진행 막대 칸마다의 채움. 화면에 들어올 때(뒤로 돌아올 때 포함) 지난 단계의 모양에서 이 단계의 모양으로 바뀐다.
 * 움직임이 끝나면 단계 값에서 바로 계산한 숫자로 그린다 — 키보드 · 시트 · 화면 크기 변화로 다시 그리거나 레이아웃이 바뀌어도
 * 움직임 값(기기 쪽에서 따로 돌던 값)에 기대지 않아 단계 값대로 남는다(소유자 빌드 7: 키보드가 올라오면 채운 칸이 사라졌다).
 * 동작 줄이기면 움직이지 않고 바로 바꾼다.
 */
function useProgressFills(step: number): Fill[] {
  // 처음 그릴 때부터 지난 단계의 모양(들어오며 이 단계로 움직인다) — 한 번 이 단계 모양으로 그렸다가 되돌아가 깜빡이지 않게
  const [move, setMove] = useState(() => moveBetween(shownStep || step, step));
  const prepared = useRef(move);
  useFocusEffect(
    useCallback(() => {
      const from = shownStep || step;
      shownStep = step;
      // 처음 들어올 때는 그릴 때 만든 움직임을 그대로 쓰고, 뒤로 돌아올 때는 새로 만든다
      const next = prepared.current?.from === from ? prepared.current : moveBetween(from, step);
      prepared.current = null;
      setMove(next);
      if (!next) return;
      let cancelled = false;
      let running: Animated.CompositeAnimation | null = null;
      void reduceMotionNow().then((reduce) => {
        if (cancelled) return;
        if (reduce) return setMove(null);
        running = Animated.parallel(
          next.moving.map(([value, toValue]) =>
            Animated.timing(value, { toValue, duration: L.progressMs, easing: Easing.out(Easing.ease), useNativeDriver }),
          ),
        );
        running.start(({ finished }) => {
          if (finished && !cancelled) setMove(null);
        });
      });
      return () => {
        cancelled = true;
        running?.stop();
        setMove(null);
      };
    }, [step]),
  );
  return move?.fills ?? Array.from({ length: SIGNUP_STEPS }, (_, i) => filledAt(step)(i));
}

/** 키보드가 떠 있는가(iOS · 안드로이드). 웹은 언제나 false */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

export function SignupStep(props: SignupStepProps) {
  // 웹은 다음 단계가 오른쪽에서 밀려 들어오고 뒤로는 오른쪽으로 나간다(앱의 화면 쌓기와 같게). 앱은 화면 쌓기가 움직인다
  const { style, close, ref, hidden } = useSlideUp('right');
  return (
    <Animated.View testID="signup-step-slide" ref={ref} aria-hidden={hidden} style={style}>
      <SignupStepScreen {...props} onBack={() => close(props.onBack)} />
    </Animated.View>
  );
}

function SignupStepScreen({ step, onBack, title, guide, footer, children }: SignupStepProps) {
  const keyboard = useKeyboardShown();
  const fills = useProgressFills(step);
  return (
    <Screen scroll={false} bottomInset={keyboard ? 0 : Sizes.stepBottom}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.backLabel}
            onPress={onBack}
            style={styles.back}>
            <BackChevron size={L.backIcon} />
          </Pressable>
        </View>
        <View accessible accessibilityLabel={`${step}${strings.steps.separator}${SIGNUP_STEPS}`} style={styles.progress}>
          {fills.map((fill, i) => (
            <View key={i} style={styles.bar}>
              <Animated.View testID={`progress-fill-${i}`} style={[styles.barFill, { transform: [{ scaleX: fill }] }]} />
            </View>
          ))}
        </View>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.titleBlock}>
            <Txt variant="title" accessibilityRole="header">
              {title}
            </Txt>
            {guide ? (
              <Txt variant="body" color="gray">
                {guide}
              </Txt>
            ) : null}
          </View>
          {children}
        </ScrollView>
        <View style={[styles.footer, keyboard && styles.footerKeyboard]}>{footer}</View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { height: Sizes.stepHeader, justifyContent: 'center', paddingHorizontal: ScreenPaddingX },
  back: { width: L.back, height: L.back, marginLeft: L.backInset, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: L.progressGap, paddingHorizontal: ScreenPaddingX },
  bar: { flex: 1, height: L.progressHeight, borderRadius: L.progressHeight, backgroundColor: Colors.hair, overflow: 'hidden' },
  /** 켜진 부분: 칸 폭 그대로 두고 왼쪽 기준 scaleX 로 찬다(폭이 바뀌어도 비율 그대로) */
  barFill: {
    width: '100%',
    height: L.progressHeight,
    borderRadius: L.progressHeight,
    backgroundColor: Colors.primary,
    transformOrigin: 'left',
  },
  content: { flexGrow: 1, paddingHorizontal: ScreenPaddingX },
  titleBlock: { gap: L.titleGap, marginTop: L.titleTop },
  footer: { paddingHorizontal: ScreenPaddingX },
  footerKeyboard: { paddingBottom: L.keyboardGap },
});

/**
 * 웹이 시작할 때 서버에 닿지 못해 세션을 확인하지 못했는데(offline, 결정 068 의 4) 가입 주소로 열렸을 때 — 가입 단계는 서버 없이 나아갈 수 없어
 * 볼 게 없는 화면(20-1)을 보이고, 다시 시도는 세션을 다시 확인한다(가입권이 살아 있으면 하던 단계로).
 */
export function SignupOffline() {
  // 인터넷은 되는데 서버만 닿지 않으면 끊김(20-1)이 아니라 "불러오지 못했어요"(19) — 소유자 2026-11-21
  const online = useOnline();
  if (online) {
    const F = strings.states.loadFail;
    return <StateScreen title={F.title.page} body={F.body} primary={{ label: F.retry, onPress: () => void recheckSession() }} />;
  }
  const S = strings.states.offlineEmpty;
  return <StateScreen title={S.title} body={S.body} primary={{ label: S.retry, onPress: () => void recheckSession() }} />;
}
