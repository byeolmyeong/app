import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { strings } from '@/content/strings';
import { AccountDeleteSheet } from '@/features/auth/account-delete-sheet';
import { signOut } from '@/features/auth/sign-out';
import { goBackOrHome } from '@/features/chart/chart-empty';

const S = strings.settings;

/**
 * 설정: 자주 묻는 질문 · 문의하기 · 처리방침 · 약관 · 앱 버전 · 로그아웃 · 계정 삭제(F7 · F9, 결정 024 · 034). 마이에서 들어온다.
 * 알림은 푸시(태스크 9)가 생길 때 더한다.
 */
export default function SettingsScreen() {
  const [asking, setAsking] = useState(false);

  /** 지우거나 로그아웃한 뒤에는 쌓인 화면(마이 · 설정)을 걷어 내고 로그인 화면만 남긴다 */
  function leave() {
    setAsking(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  }

  return (
    <Screen nav={<NavBar title={S.title} onBack={goBackOrHome} />}>
      <View>
        <ListRow label={S.faq} onPress={() => router.push('/settings/faq')} />
        <ListRow label={S.inquiry} onPress={() => router.push('/settings/inquiry')} />
        <ListRow label={S.privacy} onPress={() => router.push('/settings/privacy')} />
        <ListRow label={S.terms} onPress={() => router.push('/settings/terms')} />
        <ListRow label={S.version} value={Constants.expoConfig?.version ?? strings.common.none} />
        <ListRow label={S.logout} onPress={() => void signOut().then(leave)} />
        <ListRow label={S.deleteAccount} color="danger" onPress={() => setAsking(true)} />
      </View>
      <AccountDeleteSheet visible={asking} onClose={() => setAsking(false)} onDeleted={leave} />
    </Screen>
  );
}
