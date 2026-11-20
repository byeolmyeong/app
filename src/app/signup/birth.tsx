/**
 * 가입 3단계: 출생 정보(결정 009 · 034 · 042, 시안 보드 8 · 8-1 · 8-2 · 8-3 · 8-4). 진행 막대 3/3, 위 안내 문구 없음.
 * 세 칸을 채우면 "내 별명 읽기" 가 켜진다. 누르면 앞 단계의 초안(약관 버전 · 동의 · 닉네임 · 프로필)과 출생 정보를
 * `POST /auth/signup` 한 번으로 보낸다 — 단계마다 서버를 부르지 않는다(가입권은 한 번 쓰면 끝, 중간에 나가면 계정이 반쯤 생긴다).
 * 성공하면 초안을 지우고(닉네임만 별명 공개를 위해 메모리에) 차트를 받아 기기에 둔 뒤 풀이 글(짓는 동안은 "별명 짓는 중", 다 지으면 별명 공개)로 간다. 차트를 받지 못하면 홈으로 —
 * 홈이 서버에 저장된 출생 정보로 되살린다(결정 029). 오류마다 돌아갈 곳: 닉네임(`INVALID_NICKNAME` · `NICKNAME_TAKEN`) ·
 * 약관(`TERMS_REQUIRED`) · 생년월일 칸 아래 빨강(`UNDER_AGE`) · 로그인(`SIGNUP_EXPIRED`, 가드가 보낸다) · 그 밖은 버튼 위 안내.
 * 닉네임 단계를 건너뛰고 들어오면 닉네임 단계로 돌려보낸다. 보내는 동안은 뒤로 가지 않고(두 번 누르기도 막는다),
 * 가입을 마치면 스택을 비우고 간다 — 남은 약관 · 닉네임 단계로 뒤로 가 가입 단계를 다시 밟지 않게.
 */
import { Redirect, router, useFocusEffect, usePreventRemove, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Spacing, StepLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { finishDraft, getDraft, rejectNickname, rejectTerms } from '@/features/auth/signup-draft';
import { SignupStep } from '@/features/auth/signup-step';
import { markSignupStep } from '@/features/auth/signup-resume';
import { useAuth } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';

const S = strings.login;
const H = strings.home;

/** 다 끝나 떠날 곳. clear 면 스택을 비우고 간다(가입을 마침) */
type Leave = { href: Href; clear: boolean };

export default function BirthStep() {
  const { status, completeSignup } = useAuth();
  const [draft] = useState(getDraft);
  const fields = useBirthFields();
  /** 보내는 중(가입 요청 · 차트 받기). 두 번 누르기를 막고 뒤로 가기를 막는다 */
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [leave, setLeave] = useState<Leave | null>(null);

  // 보내는 동안은 뒤로(손짓 · 기기 뒤로 단추)를 막는다
  usePreventRemove(busy, () => {});

  // 막기가 풀린 뒤에 떠난다(막힌 채로 떠나면 막기에 걸린다)
  useEffect(() => {
    if (!leave) return;
    if (!leave.clear) return router.dismissTo(leave.href);
    if (router.canDismiss()) router.dismissAll();
    router.replace(leave.href);
  }, [leave]);

  // 이어 하기(결정 068): 이 단계에 있다고 적는다. 출생 정보는 적지 않는다 — 다시 오면 빈 칸부터
  useFocusEffect(
    useCallback(() => {
      if (status === 'signingUp' && draft?.nickname) markSignupStep('birth');
    }, [status, draft]),
  );

  // 가입을 마치는 순간 로그인 상태가 되지만, 이 화면은 차트를 받아 풀이 글로 갈 때까지 머문다.
  if (status === 'signedIn' && !busy && !leave) return <Redirect href="/" />;
  if (!draft?.nickname || draft.avatar === undefined) return <Redirect href="/signup/nickname" />;
  const { nickname, avatar, termsVersion, privacyVersion, pushConsent, marketingConsent } = draft;

  function stop() {
    sending.current = false;
    setBusy(false);
  }

  async function submit() {
    if (sending.current) return;
    const v = fields.validate();
    if (!v) return;
    sending.current = true;
    setBusy(true);
    setRequestError(null);
    const r = await completeSignup({ birth: v.input, nickname, avatar, termsVersion, privacyVersion, pushConsent, marketingConsent });
    if (!r.ok) {
      stop();
      switch (r.code) {
        case 'INVALID_NICKNAME':
        case 'NICKNAME_TAKEN':
          rejectNickname(r.code);
          return setLeave({ href: '/signup/nickname', clear: false });
        case 'TERMS_REQUIRED':
          rejectTerms();
          return setLeave({ href: '/signup/terms', clear: false });
        case 'UNDER_AGE':
          return fields.setDateError(H.errors.underAge);
        case 'SIGNUP_EXPIRED':
          // 세션이 로그인 전이 되어 가드가 로그인 화면으로 보낸다(그 화면이 이유를 보여 준다)
          return;
      }
      return setRequestError(r.error === 'NETWORK' ? H.requestErrors.NETWORK : H.requestErrors.OTHER);
    }
    // 초안을 비우고 닉네임만 별명 공개(결정 044)를 위해 메모리에 남긴다
    finishDraft();
    const chart = await api.createChart(v.input);
    if (chart.ok) await saveBirth({ profile: v.profile, chart: chart.data });
    stop();
    setLeave({ href: chart.ok ? { pathname: '/reading', params: { from: 'signup' } } : '/', clear: true });
  }

  return (
    <SignupStep
      step={3}
      onBack={() => {
        if (!sending.current) router.back();
      }}
      title={S.signupTitle}
      footer={
        <View style={styles.footer}>
          {requestError ? (
            <Txt variant="caption" color="danger">
              {requestError}
            </Txt>
          ) : null}
          <Button label={H.submit} onPress={() => void submit()} disabled={!fields.complete || busy} />
        </View>
      }>
      <View style={styles.fields}>
        <BirthFields control={fields} />
      </View>
    </SignupStep>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: StepLayout.contentTop },
  footer: { gap: Spacing.sm },
});
