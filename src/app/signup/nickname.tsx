/**
 * 가입 2단계: 닉네임 · 프로필(결정 042, 시안 보드 7 · 7-1 · 7-2 · 7-3 · 7-4). 위 가운데 고른 프로필(누르면 고르기 시트),
 * 아래 닉네임 칸 · 글자 수 · 규칙 안내. 규칙에 어긋나면 칸 테두리 빨강 + 안내, 다음 꺼짐(판정은 서버, 앱은 먼저 안내만).
 * 중복은 "다음" 을 누를 때 서버에 한 번 묻는다 — 칠 때마다 묻지 않는다(요청이 늘고 남의 닉네임을 떠보기 쉬워진다).
 * 값은 가입 초안(메모리)에만 둔다. 약관 단계를 건너뛰고 들어오면 약관 단계로 돌려보낸다.
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AVATAR_IDS, Avatar, type AvatarId } from '@/components/avatar';
import { Button } from '@/components/button';
import { Field, FieldInput } from '@/components/field';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, Sizes, Spacing, StepLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AvatarSheet } from '@/features/auth/avatar-sheet';
import { NICKNAME_MAX, checkNickname, isComposingOnly, nicknameLength } from '@/features/auth/nickname-rule';
import { getDraft, setDraft, takeNicknameRejection } from '@/features/auth/signup-draft';
import { SignupStep } from '@/features/auth/signup-step';
import { markSignupStep } from '@/features/auth/signup-resume';
import { useAuth } from '@/features/auth/use-session';

const N = strings.nickname;

/** 서버에 물은 결과의 안내. 칸의 글을 바꾸면 지운다 */
type ServerError = 'TAKEN' | 'INVALID' | 'NETWORK' | 'OTHER';
const SERVER_MESSAGE: Record<ServerError, string> = {
  TAKEN: N.taken,
  INVALID: N.invalidChar,
  NETWORK: strings.home.requestErrors.NETWORK,
  OTHER: N.checkFailed,
};

/** 치기를 멈추고 이만큼 지나면 중복을 묻는다 */
const CHECK_AFTER_MS = 500;

const randomAvatar = (): AvatarId => AVATAR_IDS[Math.min(AVATAR_IDS.length - 1, Math.floor(Math.random() * AVATAR_IDS.length))];

/**
 * 웹에서 이 단계 주소로 새로 고치면 세션이 보관한 가입(초안)을 되돌리기 전에 화면이 먼저 뜬다(결정 068) —
 * 확인 중에는 그리지 않고(가드 가림막 · 스플래시가 가린다) 되돌린 초안으로 처음 그린다.
 */
export default function NicknameStep() {
  const { status } = useAuth();
  return status === 'checking' ? null : <NicknameStepScreen />;
}

function NicknameStepScreen() {
  const { status, checkNickname: askServer } = useAuth();
  /** 서버에 묻는 중(두 번 누르기 · 엔터가 겹쳐도 한 번만 묻는다) */
  const asking = useRef(false);
  const [draft] = useState(getDraft);
  const [avatar, setAvatar] = useState<AvatarId>(() => draft?.avatar ?? randomAvatar());
  const [raw, setRaw] = useState(draft?.nickname ?? '');
  const [focused, setFocused] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [checking, setChecking] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  /** 서버가 쓸 수 있다고 답한 닉네임(지금 칸의 값과 같을 때만 안내하고, 다음에서 다시 묻지 않는다) */
  const [available, setAvailable] = useState<string | null>(null);
  /** 지금 칸의 값(늦게 온 답이 바뀐 칸에 쓰이지 않게) */
  const latest = useRef(raw);

  // 처음 들어오면 무작위로 고른 그림을 초안에 둔다
  useEffect(() => {
    if (draft && draft.avatar === undefined) setDraft({ avatar });
    // 들어올 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마지막 단계에서 서버가 닉네임을 거절하고 돌아왔으면(그사이 누가 가져감 등) 그 이유를 보여 준다
  useFocusEffect(
    useCallback(() => {
      const rejected = takeNicknameRejection();
      if (rejected) setServerError(rejected === 'NICKNAME_TAKEN' ? 'TAKEN' : 'INVALID');
    }, []),
  );

  // 이어 하기(결정 068): 이 단계에 있다고 적는다(출생 정보 단계에서 뒤로 돌아와도)
  useFocusEffect(
    useCallback(() => {
      if (status === 'signingUp' && draft) markSignupStep('nickname');
    }, [status, draft]),
  );

  // 중복 안내(결정 068 의 6): 규칙에 맞는 닉네임을 치고 0.5초 멈추면 서버에 한 번 묻는다(칠 때마다는 묻지 않는다)
  const candidate = checkNickname(raw);
  const candidateValue = candidate.ok ? candidate.value : null;
  useEffect(() => {
    latest.current = raw;
  }, [raw]);
  useEffect(() => {
    if (!candidateValue || status !== 'signingUp') return;
    const timer = setTimeout(() => void ask(candidateValue), CHECK_AFTER_MS);
    return () => clearTimeout(timer);
    // ask 는 그리는 때마다 새로 만들어진다 — 값이 바뀔 때만 다시 건다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateValue, status]);

  // 가입을 마친 사람이 뒤로 가기로 돌아오면 홈으로(여기서 누른 "다음" 이 로그아웃시키지 않게)
  if (status === 'signedIn') return <Redirect href="/" />;
  if (!draft) return <Redirect href="/signup/terms" />;

  const check = checkNickname(raw);
  // 한글을 치는 동안 잠깐 생기는 낱자만 어긋나면 칸을 떠날 때까지 기다린다
  const localError =
    !check.ok && check.reason === 'INVALID_CHAR' && !(focused && isComposingOnly(raw))
      ? N.invalidChar
      : !check.ok && check.reason === 'TOO_LONG'
        ? N.rule
        : null;
  const error = serverError ? SERVER_MESSAGE[serverError] : localError;
  const canNext = check.ok && !checking && serverError !== 'TAKEN';
  const confirmed = check.ok && available === check.value;

  function onChange(text: string) {
    setRaw(text);
    setServerError(null);
    setAvailable(null);
  }

  /** 서버에 묻는다. 그사이 칸이 바뀌었으면 답을 버린다. 쓸 수 있으면 true */
  async function ask(value: string): Promise<boolean> {
    if (asking.current) return false;
    asking.current = true;
    setChecking(true);
    const r = await askServer(value);
    asking.current = false;
    setChecking(false);
    const current = checkNickname(latest.current);
    if (!current.ok || current.value !== value) return false;
    if (r.ok && r.data.available) {
      setAvailable(value);
      return true;
    }
    if (r.ok) {
      setServerError('TAKEN');
      return false;
    }
    // 가입권이 없거나 만료면 세션이 로그인 전이 되고 가드가 로그인 화면으로 보낸다
    if (r.code !== 'SIGNUP_EXPIRED') setServerError(r.code === 'INVALID_NICKNAME' ? 'INVALID' : r.error === 'NETWORK' ? 'NETWORK' : 'OTHER');
    return false;
  }

  function pickAvatar(id: AvatarId) {
    setAvatar(id);
    setDraft({ avatar: id });
    setSheet(false);
  }

  async function next() {
    // "이미 있는 닉네임" 이 떠 있거나 묻는 중이면 다시 묻지 않는다(엔터 포함). 쓸 수 있다고 확인한 이름이면 묻지 않고 넘어간다
    if (!check.ok || !canNext || asking.current) return;
    const value = check.value;
    if (confirmed || (await ask(value))) {
      setDraft({ nickname: value, avatar });
      router.push('/signup/birth');
    }
  }

  return (
    <SignupStep
      step={2}
      onBack={() => router.back()}
      title={N.title}
      guide={N.guide}
      footer={<Button label={N.next} onPress={() => void next()} disabled={!canNext} />}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={N.editAvatar}
        onPress={() => setSheet(true)}
        style={styles.avatar}>
        <Avatar id={avatar} size={Sizes.avatarLarge} />
        <View style={styles.edit}>
          <Svg width={Sizes.avatarEditIcon} height={Sizes.avatarEditIcon} viewBox="0 0 24 24" fill="none">
            <Path d="M4 20h4L19 9l-4-4L4 16v4z" stroke={Colors.ink} strokeWidth={2} strokeLinejoin="round" />
            <Path d="M13.5 6.5l4 4" stroke={Colors.ink} strokeWidth={2} />
          </Svg>
        </View>
      </Pressable>
      <View style={styles.field}>
        <Field label={N.label} hint={N.rule} error={error ?? undefined} success={confirmed && !error ? N.available : undefined}>
          <FieldInput
            boxTestID="nickname-box"
            accessibilityLabel={N.label}
            value={raw}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={N.placeholder}
            maxLength={NICKNAME_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="next"
            onSubmitEditing={() => void next()}
            invalid={Boolean(error)}
            trailing={
              <Txt variant="table" color="hint" style={styles.count}>
                {`${nicknameLength(raw)}/${NICKNAME_MAX}`}
              </Txt>
            }
          />
        </Field>
      </View>
      <AvatarSheet visible={sheet} value={avatar} onConfirm={pickAvatar} onClose={() => setSheet(false)} />
    </SignupStep>
  );
}

const styles = StyleSheet.create({
  avatar: { alignSelf: 'center', width: Sizes.avatarLarge, height: Sizes.avatarLarge, marginTop: StepLayout.titleTop },
  edit: {
    position: 'absolute',
    right: -Spacing.hairline,
    bottom: -Spacing.hairline,
    width: Sizes.avatarEdit,
    height: Sizes.avatarEdit,
    borderRadius: Sizes.avatarEdit / 2,
    backgroundColor: Colors.hair,
    borderWidth: Spacing.hairline,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { marginTop: Spacing.lg },
  count: { fontWeight: FontWeight.regular },
});
