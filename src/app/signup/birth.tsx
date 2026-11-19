/**
 * 가입 3단계: 출생 정보(결정 009 · 034 · 041, 시안 보드 8 · 8-1 · 8-2 · 8-3 · 8-4). 진행 막대 3/3, 위 안내 문구 없음.
 * 세 칸을 채우면 "내 별명 읽기" 가 켜진다. 출생 정보로 가입을 마친 뒤(만 14세 판정은 서버) 차트를 받아 기기에 두고 풀이 글로 간다.
 * 차트를 받지 못하면 홈으로 — 홈이 서버에 저장된 출생 정보로 되살린다(결정 029). 만 14세 미만이면 생년월일 칸 아래에 빨강 안내.
 * 닉네임 단계를 건너뛰고 들어오면 닉네임 단계로 돌려보낸다.
 */
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Spacing, StepLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { getDraft } from '@/features/auth/signup-draft';
import { SignupStep } from '@/features/auth/signup-step';
import { useAuth } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';

const S = strings.login;
const H = strings.home;

export default function BirthStep() {
  const { status, completeSignup } = useAuth();
  const [draft] = useState(getDraft);
  const fields = useBirthFields();
  // 가입을 마치는 순간 로그인 상태가 되지만, 이 화면은 차트를 받아 풀이 글로 갈 때까지 머문다.
  const [finishing, setFinishing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  if (status === 'signedIn' && !finishing) return <Redirect href="/" />;
  if (!draft?.nickname) return <Redirect href="/signup/nickname" />;

  async function submit() {
    if (finishing) return;
    const v = fields.validate();
    if (!v) return;
    setRequestError(null);
    setFinishing(true);
    const r = await completeSignup(v.input);
    if (!r.ok) {
      setFinishing(false);
      if (r.code === 'UNDER_AGE') return fields.setDateError(H.errors.underAge);
      return setRequestError(r.error === 'NETWORK' ? H.requestErrors.NETWORK : H.requestErrors.OTHER);
    }
    const chart = await api.createChart(v.input);
    if (chart.ok) await saveBirth({ profile: v.profile, chart: chart.data });
    router.replace(chart.ok ? '/reading' : '/');
  }

  return (
    <SignupStep
      step={3}
      onBack={() => router.back()}
      title={S.signupTitle}
      footer={
        <View style={styles.footer}>
          {requestError ? (
            <Txt variant="caption" color="danger">
              {requestError}
            </Txt>
          ) : null}
          <Button label={H.submit} onPress={() => void submit()} disabled={!fields.complete || finishing} />
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
