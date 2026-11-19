/**
 * 가입 마지막 단계: 출생 정보(결정 009 · 034, release F1). 처음 온 사람이 로그인한 뒤 온다.
 * 출생 정보로 가입을 마친 뒤(만 14세 판정은 서버) 차트를 받아 기기에 두고 풀이 글로 간다. 차트를 받지 못하면 홈으로 —
 * 홈이 서버에 저장된 출생 정보로 되살린다(결정 029). 만 14세 미만이면 세션이 로그인 전이 되어 가드가 로그인 화면으로 보낸다.
 */
import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { strings } from '@/content/strings';
import { useAuth } from '@/features/auth/use-session';
import { BirthForm } from '@/features/chart/birth-form';
import type { BirthProfile } from '@/features/chart/birth-input';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type BirthInput } from '@/lib/api';

const S = strings.login;
const H = strings.home;

export default function SignupScreen() {
  const { status, completeSignup } = useAuth();
  // 가입을 마치는 순간 로그인 상태가 되지만, 이 화면은 차트를 받아 풀이 글로 갈 때까지 머문다.
  const [finishing, setFinishing] = useState(false);
  if (status === 'signedIn' && !finishing) return <Redirect href="/" />;

  async function submit({ input, profile }: { input: BirthInput; profile: BirthProfile }): Promise<string | null> {
    setFinishing(true);
    const r = await completeSignup(input);
    if (!r.ok) {
      setFinishing(false);
      if (r.code === 'UNDER_AGE') return S.underAge;
      return r.error === 'NETWORK' ? H.requestErrors.NETWORK : H.requestErrors.OTHER;
    }
    const chart = await api.createChart(input);
    if (chart.ok) await saveBirth({ profile, chart: chart.data });
    router.replace(chart.ok ? '/reading' : '/');
    return null;
  }

  return (
    <Screen nav={<NavBar title={S.signupTitle} />}>
      <Txt color="gray">{S.signupGuide}</Txt>
      <BirthForm stored={null} save={saveBirth} submit={submit} />
    </Screen>
  );
}
