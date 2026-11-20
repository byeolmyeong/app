import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FieldInput } from '@/components/field';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { FontWeight, MyLayout, ScreenPaddingX, Spacing, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { NICKNAME_MAX, checkNickname, isComposingOnly, nicknameLength } from '@/features/auth/nickname-rule';
import { useMyAccount } from '@/features/my/use-my-account';
import { api } from '@/lib/api';

const N = strings.nickname;
const MN = strings.my.nickname;

/** 서버가 거절한 이유. 칸의 글을 바꾸면 지운다 */
type Rejected = 'TAKEN' | 'INVALID';

/**
 * 닉네임 바꾸기(결정 056 의 7, 보드 16-5): 칸 하나 + 글자 수 + "한글 · 영문으로 2~10자", 칸 위 이름표는 없다(화면 제목과 겹친다).
 * 규칙은 가입 단계와 같다(판정은 서버, 앱은 먼저 안내만). "저장" 을 누를 때 서버에 한 번 보낸다 — 이미 있으면(409) 칸 아래 안내,
 * 그 밖의 실패는 짧은 알림(적은 글은 그대로, 결정 065 의 1). 저장하면 이 화면에 머물며 "닉네임을 바꿨어요" 를 알린다.
 */
export default function NicknameScreen() {
  const { account, setAccount } = useMyAccount();
  const { toast, show, hide } = useToast();
  const [typed, setTyped] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejected, setRejected] = useState<Rejected | null>(null);
  /** 보내는 중(두 번 누르기 · 엔터가 겹쳐도 한 번만) */
  const sending = useRef(false);
  const current = account?.nickname ?? '';
  // 사람이 치기 전에는 받은 닉네임을 칸에 둔다(계정을 받기 전이면 빈 칸)
  const raw = typed ?? current;

  const check = checkNickname(raw);
  const localError =
    !check.ok && check.reason === 'INVALID_CHAR' && !(focused && isComposingOnly(raw))
      ? N.invalidChar
      : !check.ok && check.reason === 'TOO_LONG'
        ? N.rule
        : null;
  const error = rejected === 'TAKEN' ? N.taken : rejected === 'INVALID' ? N.invalidChar : localError;
  const canSave = check.ok && check.value !== current && !saving && rejected === null;

  function onChange(text: string) {
    setTyped(text);
    setRejected(null);
  }

  async function save() {
    if (!check.ok || !canSave || sending.current) return;
    sending.current = true;
    setSaving(true);
    const res = await api.updateAccount({ nickname: check.value });
    sending.current = false;
    setSaving(false);
    if (res.ok) {
      setAccount(res.data);
      setTyped(null);
      show('success', MN.saved);
      return;
    }
    if (res.code === 'NICKNAME_TAKEN') return setRejected('TAKEN');
    if (res.code === 'INVALID_NICKNAME') return setRejected('INVALID');
    show('error', strings.my.account.saveFailed);
  }

  return (
    <Screen scroll={false} nav={<NavBar chevron title={MN.title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/my/account'))} />}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <FieldInput
            boxTestID="nickname-box"
            accessibilityLabel={MN.title}
            value={raw}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={NICKNAME_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
            invalid={Boolean(error)}
            trailing={
              <Txt variant="table" color="hint" style={styles.count}>
                {`${nicknameLength(raw)}/${NICKNAME_MAX}`}
              </Txt>
            }
          />
          <Txt variant="caption" color={error ? 'danger' : 'hint'}>
            {error ?? N.rule}
          </Txt>
        </View>
        <View style={styles.footer}>
          {/* 알림이 버튼 폭 그대로 뜨게 여백 없는 칸으로 감싼다(absolute 는 바깥 여백을 무시한다) */}
          <View>
            <Toast toast={toast} onClose={hide} above="button" />
            <Button label={MN.save} onPress={() => void save()} disabled={!canSave} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** 머리 아래 12, 칸과 안내 사이 8(보드 16-5) */
  body: { flex: 1, gap: Spacing.xs, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX },
  footer: { paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
  count: { fontWeight: FontWeight.regular },
});
