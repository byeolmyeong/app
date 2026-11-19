/**
 * 가입 단계 화면의 뼈대(결정 041, 시안 보드 6 · 7 · 8): 위 뒤로 가기 · 진행 막대(세 칸) · 큰 제목과 안내, 가운데 내용, 맨 아래 주 버튼 하나.
 * 내용이 길면 가운데만 굴러간다. 키보드가 올라오면 아래 버튼이 키보드 바로 위로 올라온다(보드 7-1).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Colors, ScreenPaddingX, Sizes, StepLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

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

export function SignupStep({ step, onBack, title, guide, footer, children }: SignupStepProps) {
  const keyboard = useKeyboardShown();
  return (
    <Screen scroll={false} bottomInset={keyboard ? 0 : Sizes.stepBottom}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.backLabel}
            onPress={onBack}
            style={styles.back}>
            <Svg width={L.backIcon} height={L.backIcon} viewBox="0 0 24 24" fill="none">
              <Path d="M15 5l-7 7 7 7" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
        <View accessible accessibilityLabel={`${step}${strings.steps.separator}${SIGNUP_STEPS}`} style={styles.progress}>
          {Array.from({ length: SIGNUP_STEPS }, (_, i) => (
            <View key={i} style={[styles.bar, i < step && styles.barOn]} />
          ))}
        </View>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.titleBlock}>
            <Txt variant="hero" accessibilityRole="header">
              {title}
            </Txt>
            {guide ? (
              <Txt variant="lead" color="gray">
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
  bar: { flex: 1, height: L.progressHeight, borderRadius: L.progressHeight, backgroundColor: Colors.hair },
  barOn: { backgroundColor: Colors.primary },
  content: { flexGrow: 1, paddingHorizontal: ScreenPaddingX },
  titleBlock: { gap: L.titleGap, marginTop: L.titleTop },
  footer: { paddingHorizontal: ScreenPaddingX },
  footerKeyboard: { paddingBottom: L.keyboardGap },
});
