import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

/** 치기를 멈추고 이만큼 지나면 쓸 수 있는지 묻는다(가입 단계와 같다) */
const CHECK_AFTER_MS = 500;

/**
 * 닉네임 바꾸기(결정 056 의 7, 보드 16-5): 칸 하나 + 글자 수 + "한글 · 영문으로 2~10자", 칸 위 이름표는 없다(화면 제목과 겹친다).
 * 규칙은 가입 단계와 같다(판정은 서버, 앱은 먼저 안내만). 가입처럼 규칙에 맞는 새 닉네임을 치고 0.5초 멈추면 쓸 수 있는지 한 번 묻는다 —
 * 쓸 수 있으면 칸 아래 초록 "사용할 수 있는 닉네임이에요", 이미 있으면 빨강(소유자 2026-11-21). 묻지 못하면(끊김 · 옛 서버) 아무것도 적지 않는다.
 * "저장" 을 누를 때 서버에 한 번 보낸다 — 이미 있으면(409) 칸 아래 안내,
 * 그 밖의 실패는 짧은 알림(적은 글은 그대로, 결정 065 의 1). 저장하면 이 화면에 머물며 "닉네임을 바꿨어요" 를 알린다.
 */
export default function NicknameScreen() {
  const { account, setAccount } = useMyAccount();
  const { toast, show, hide } = useToast();
  const [typed, setTyped] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejected, setRejected] = useState<Rejected | null>(null);
  /** 서버가 쓸 수 있다고 답한 닉네임(지금 칸의 값과 같을 때만 초록) */
  const [available, setAvailable] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  /** 보내는 중(두 번 누르기 · 엔터가 겹쳐도 한 번만) */
  const sending = useRef(false);
  const current = account?.nickname ?? '';
  // 사람이 치기 전에는 받은 닉네임을 칸에 둔다(계정을 받기 전이면 빈 칸)
  const raw = typed ?? current;

  const check = checkNickname(raw);
  // 규칙에 맞고 지금 닉네임과 다른 값만 묻는다
  const candidate = check.ok && check.value !== current ? check.value : null;
  useEffect(() => {
    if (!candidate) return;
    /** 칸이 바뀌면(다음 값으로 다시 묻거나 떠나면) 이 물음의 답을 버린다 */
    let alive = true;
    const timer = setTimeout(() => {
      setChecking(true);
      void api.checkMyNickname(candidate).then((r) => {
        if (!alive) return;
        setChecking(false);
        if (r.ok) {
          if (r.data.available) setAvailable(candidate);
          else setRejected('TAKEN');
        } else if (r.code === 'INVALID_NICKNAME') setRejected('INVALID');
      });
    }, CHECK_AFTER_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      setChecking(false);
    };
  }, [candidate]);
  const confirmed = candidate !== null && available === candidate;
  const localError =
    !check.ok && check.reason === 'INVALID_CHAR' && !(focused && isComposingOnly(raw))
      ? N.invalidChar
      : !check.ok && check.reason === 'TOO_LONG'
        ? N.rule
        : null;
  const error = rejected === 'TAKEN' ? N.taken : rejected === 'INVALID' ? N.invalidChar : localError;
  const canSave = check.ok && check.value !== current && !saving && !checking && rejected === null;

  function onChange(text: string) {
    // 다듬은 값이 같으면(앞뒤 공백만 더함) 받은 안내(초록 · 빨강)를 그대로 둔다 — 다시 묻지 않으니(가입 단계와 같게, #77 리뷰)
    const before = checkNickname(raw);
    const after = checkNickname(text);
    const same = before.ok && after.ok && before.value === after.value;
    setTyped(text);
    if (same) return;
    setRejected(null);
    // 앞서 받은 초록은 그 값으로 다시 물을 때까지 보이지 않게
    setAvailable(null);
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
          <Txt variant="caption" color={error ? 'danger' : confirmed ? 'success' : 'hint'}>
            {error ?? (confirmed ? N.available : N.rule)}
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
