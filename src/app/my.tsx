import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AccountDeleteSheet } from '@/features/auth/account-delete-sheet';
import { formatBirthSummary } from '@/features/chart/birth-input';
import { ChartEmpty } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';

const M = strings.my;
const S = strings.settings;

/**
 * 마이: 출생 정보와 설정의 줄을 한 화면에 둔다(결정 034). 출생 정보 카드 → 도움 → 약관 · 정보 → 계정 삭제.
 * 출생 정보가 없어도 줄들과 아래 탭은 보인다. 로그아웃은 소셜 로그인, 알림은 푸시가 생길 때 더한다.
 */
export default function MyScreen() {
  const { loaded, profile } = useBirthProfile();
  const [asking, setAsking] = useState(false);
  const nav = <NavBar title={M.title} />;

  /** 지운 뒤에는 쌓인 화면을 걷어 내고 첫 화면(출생 정보 입력)만 남긴다 */
  function leave() {
    setAsking(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }

  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  return (
    <Screen nav={nav} footer={<MainTabs active="my" />}>
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
        <ChartEmpty />
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
          <ListRow label={S.terms} onPress={() => router.push('/settings/terms')} />
          <ListRow label={S.version} value={Constants.expoConfig?.version ?? strings.common.none} />
        </View>
      </View>
      <ListRow label={S.deleteAccount} color="danger" onPress={() => setAsking(true)} />
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
  group: { gap: Spacing.xs, marginTop: Spacing.xs },
});
