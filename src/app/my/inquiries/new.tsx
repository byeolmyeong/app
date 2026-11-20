import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { Colors, InquiryLayout as L, LineWidth, MyLayout, Radius, ScreenPaddingX, Sizes, Spacing, StateLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { CategoryChips } from '@/features/support/category-chips';
import { checkInquiry, INQUIRY_BODY_MAX, inquiryLength } from '@/features/support/inquiry';
import { useInquiry } from '@/features/support/use-inquiry';
import { useUpdateBusy } from '@/features/update/update-gate';
import type { InquiryCategory } from '@/lib/api';

const I = strings.inquiry;
const F = I.form;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my/inquiries'));

/**
 * 새 문의(결정 058 의 2, 보드 16-8): 종류 칩 넷 · 내용(10~1000자, 글자 수) · 안내 한 줄 · 맨 아래 "보내기". 이메일 칸은 없다.
 * 종류를 고르고 10자 이상 적어야 보낼 수 있다. 보내면 "문의를 보냈어요" → "문의 내역 보기"(내역이 쌓여 있으면 그리로 돌아가고, 없으면 내역으로 바꾼다).
 * 보내지 못하면 이 화면에 머물며 짧은 알림(적은 글은 그대로, 결정 065 의 1). 적은 내용은 이 화면의 메모리에만 있다.
 */
export default function NewInquiryScreen() {
  const [category, setCategory] = useState<InquiryCategory | null>(null);
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const { state, send } = useInquiry();
  const { toast, show, hide } = useToast();
  const sent = state.status === 'sent';
  // 적어 둔 글이 있으면(아직 보내지 않았다) 강제 업데이트를 미룬다(결정 027)
  useUpdateBusy(!sent && body !== '');

  if (sent)
    return (
      <Screen scroll={false} nav={<View style={styles.blankNav} />}>
        <View style={styles.sentBody}>
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.sentIcon}>
            <Svg width={L.sent.glyph} height={L.sent.glyph} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12.5L10 17L19 7.5" stroke={Colors.accentText} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Txt variant="headline" accessibilityRole="header" style={styles.sentTitle}>
            {I.sent.title}
          </Txt>
          <Txt color="gray" keepAll style={styles.sentText}>
            {I.sent.body}
          </Txt>
        </View>
        <View style={styles.footer}>
          <Button label={I.sent.toList} onPress={() => router.dismissTo('/my/inquiries')} />
        </View>
      </Screen>
    );

  const check = checkInquiry({ category, body });
  const sending = state.status === 'sending';
  const length = inquiryLength(body);

  async function submit() {
    if (!check.ok || sending) return;
    const res = await send(check.input);
    if (res === null || res.ok) return;
    const message =
      res.error === 'NETWORK' || res.error === 'LIMIT' ? I.failed[res.error] : res.code === 'INVALID_BODY' ? I.failed.INVALID_BODY : I.failed.OTHER;
    show('error', message);
  }

  return (
    <Screen scroll={false} nav={<NavBar chevron title={F.title} onBack={back} />}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.group}>
            <Txt variant="captionStrong" color="gray">
              {F.categoryLabel}
            </Txt>
            <CategoryChips value={category} onChange={setCategory} />
          </View>
          <View style={styles.group}>
            <Txt variant="captionStrong" color="gray">
              {F.bodyLabel}
            </Txt>
            <View style={[styles.box, focused && styles.boxFocused]}>
              <TextInput
                accessibilityLabel={F.bodyLabel}
                multiline
                value={body}
                onChangeText={setBody}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={F.placeholder}
                placeholderTextColor={Colors.hint}
                textAlignVertical="top"
                style={styles.input}
              />
              <Txt variant="caption" color={length > INQUIRY_BODY_MAX ? 'danger' : 'hint'} style={styles.count}>
                {`${length}${F.countSeparator}${INQUIRY_BODY_MAX}`}
              </Txt>
            </View>
            <Txt variant="caption" color="hint" keepAll>
              {F.hint}
            </Txt>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {/* 알림이 버튼 폭 그대로 뜨게 여백 없는 칸으로 감싼다 */}
          <View>
            <Toast toast={toast} onClose={hide} above="button" />
            <Button label={F.submit} disabled={!check.ok || sending} onPress={() => void submit()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** 머리 아래 12, 묶음 사이 22, 이름표 · 칸 · 안내 사이 8(보드 16-8) */
  content: { gap: MyLayout.delete.gap, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX, paddingBottom: Spacing.md },
  group: { gap: Spacing.xs },
  box: {
    height: L.body.height,
    paddingVertical: L.body.paddingV,
    paddingHorizontal: L.body.paddingH,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  boxFocused: { borderColor: Colors.primary },
  input: { ...Typography.input, flex: 1, padding: 0, color: Colors.ink },
  count: { alignSelf: 'flex-end' },
  footer: { paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
  /** 보냈어요: 머리 자리(56)는 비워 두고, 그림 · 제목 · 설명을 가운데에서 조금 위로(보드 16-8) */
  blankNav: { height: Sizes.stepHeader },
  sentBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ScreenPaddingX, paddingBottom: L.sent.lift },
  sentIcon: {
    width: L.sent.icon,
    height: L.sent.icon,
    borderRadius: L.sent.icon / 2,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { marginTop: L.sent.titleTop, textAlign: 'center' },
  sentText: { marginTop: L.sent.bodyTop, textAlign: 'center' },
});
