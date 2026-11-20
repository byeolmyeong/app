import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Byeoli } from '@/components/byeoli';
import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AccountDeleteSheet } from '@/features/auth/account-delete-sheet';
import { signOut } from '@/features/auth/sign-out';
import { formatBirthSummary } from '@/features/chart/birth-input';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';

const M = strings.my;
const S = strings.settings;

/**
 * 마이: 출생 정보와 설정의 줄을 한 화면에 둔다(결정 038). 출생 정보 카드 → 도움 → 약관 · 정보 → 로그아웃 → 계정 삭제.
 * 출생 정보가 없어도 줄들과 아래 탭은 보인다. 알림은 푸시가 생길 때 더한다.
 */
export default function MyScreen() {
  const { loaded, profile } = useBirthProfile();
  const [asking, setAsking] = useState(false);
  const nav = <NavBar title={M.title} />;

  /** 지우거나 로그아웃한 뒤에는 쌓인 화면을 걷어 내고 로그인 화면만 남긴다(결정 034) */
  function leave() {
    setAsking(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  }

  const tabs = <MainTabs active="my" />;
  // 기기 저장소를 읽는 동안에도 아래 탭은 그대로 둔다(출생 정보가 있든 없든 탭이 보인다)
  if (!loaded) return <Screen nav={nav} footer={tabs}>{null}</Screen>;
  return (
    <Screen nav={nav} footer={tabs}>
      {profile ? (
        <View style={styles.card}>
          <View style={styles.text}>
            <Txt variant="label" color="gray">
              {M.birthLabel}
            </Txt>
            <Txt variant="body">{formatBirthSummary(profile)}</Txt>
          </View>
          <TextLink label={M.editBirth} onPress={() => router.push('/birth')} />
        </View>
      ) : (
        // 출생 정보가 없으면 카드 자리에 쉬는 중 별이와 넣으러 가는 버튼(결정 038 · 035)
        <View style={styles.emptyCard}>
          <View style={styles.emptyTop}>
            <Txt variant="body" color="gray" style={styles.text}>
              {strings.chart.empty}
            </Txt>
            <Byeoli state="empty" size={Sizes.byeoliSmall} />
          </View>
          <Button label={strings.chart.goHome} onPress={() => router.replace('/')} />
        </View>
      )}
      <View style={styles.group}>
        <SectionLabel>{M.help}</SectionLabel>
        <View>
          <ListRow label={S.faq} onPress={() => router.push('/settings/faq')} />
          <ListRow label={S.inquiry} onPress={() => router.push('/settings/inquiry')} />
        </View>
      </View>
      <View style={styles.group}>
        <SectionLabel>{M.info}</SectionLabel>
        <View>
          <ListRow label={S.privacy} onPress={() => router.push('/settings/privacy')} />
          <ListRow label={S.privacyConsent} onPress={() => router.push('/settings/privacy-consent')} />
          <ListRow label={S.terms} onPress={() => router.push('/settings/terms')} />
          <ListRow label={S.version} value={Constants.expoConfig?.version ?? strings.common.none} />
        </View>
      </View>
      <View>
        <ListRow label={S.logout} onPress={() => void signOut().then(leave)} />
        <ListRow label={S.deleteAccount} color="danger" onPress={() => setAsking(true)} />
      </View>
      <AccountDeleteSheet visible={asking} onClose={() => setAsking(false)} onDeleted={leave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.fill,
    borderRadius: CardRadius,
  },
  text: { flex: 1, gap: Spacing.xxs },
  emptyCard: { marginTop: Spacing.md, padding: Spacing.lg, gap: Spacing.sm, backgroundColor: Colors.fill, borderRadius: CardRadius },
  emptyTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  group: { gap: Spacing.xs, marginTop: Spacing.xs },
});
