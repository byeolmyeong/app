import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListCard, ListCardRow } from '@/components/list-card';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { MyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { birthInputOf, formatBirthLine } from '@/features/chart/birth-input';
import { signFullName } from '@/features/chart/chart-rows';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { daysSince } from '@/features/home/days-since';
import { MainTabs } from '@/features/home/main-tabs';
import { MyCard } from '@/features/my/my-card';
import { useMyAccount } from '@/features/my/use-my-account';
import { useStoredReading } from '@/features/reading/use-reading';

const M = strings.my;
const R = M.rows;

/**
 * 마이 v2(결정 056, 보드 16): 위 별명 카드(계정 · 프로필 / 출생 정보 바꾸기) · 아래 묶음 제목 없는 카드 둘.
 * 로그아웃 · 계정 삭제는 계정 화면에 있다(056 의 3). 알림 · 음악 줄은 그 화면이 생길 때 더한다(계획 A8-2 · A9-2).
 * 출생 정보가 없어도(기기 저장소가 비었다) 카드는 닉네임과 버튼만으로 그리고, 줄들과 아래 탭은 그대로 보인다.
 * 서버를 부르는 것은 계정(`GET /account`)뿐이다 — 별자리 · 한 줄 별명 · 받은 날은 기기에 받아 둔 것을 쓴다.
 */
export default function MyScreen() {
  const { loaded, profile, chart } = useBirthProfile();
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  const { reading } = useStoredReading(input);
  const { account } = useMyAccount();
  // "별명을 받은 지 N일" 의 오늘 — 화면이 뜬 때로 한 번 정한다(그리는 동안 시계를 읽지 않는다)
  const [now] = useState(Date.now);
  const nav = <NavBar chevron title={M.title} />;
  const tabs = <MainTabs active="my" />;
  // 기기 저장소를 읽는 동안에도 아래 탭은 그대로 둔다
  if (!loaded) return <Screen nav={nav} footer={tabs}>{null}</Screen>;
  // 해 별자리는 서버 차트의 SUN 그대로(날짜로 셈하지 않는다, 결정 006)
  const sun = chart?.positions.find((p) => p.body === 'SUN');
  return (
    <Screen nav={nav} footer={tabs}>
      <View testID="my-column" style={styles.column}>
        <MyCard
          nickname={account?.nickname ?? null}
          avatar={account?.avatar ?? null}
          sunSign={sun ? signFullName(sun.sign) : null}
          days={reading?.createdAt ? daysSince(reading.createdAt, now) : null}
          headline={reading?.headline ?? null}
          birthLine={profile ? formatBirthLine(profile) : null}
          onAccount={() => router.push('/my/account')}
          // 새 출생 정보 바꾸기(`/my/birth`, 결정 056 의 6)는 서버 S⑨ 뒤 계획 A7-3 — 그 전에는 지금의 출생 정보 화면으로 간다
          onBirth={() => router.push('/birth')}
        />
        <View style={styles.listTop} />
        <ListCard>
          <ListCardRow label={R.faq} onPress={() => router.push('/settings/faq')} />
          {/* 앱 안 문의(`/my/inquiries`, 결정 058)는 서버 S⑧ 뒤 계획 A7-4 */}
          <ListCardRow label={R.inquiry} onPress={() => router.push('/settings/inquiry')} />
        </ListCard>
        <ListCard>
          <ListCardRow label={R.terms} onPress={() => router.push('/settings/terms')} />
          <ListCardRow label={R.privacy} onPress={() => router.push('/settings/privacy')} />
          <ListCardRow label={R.version} value={Constants.expoConfig?.version ?? strings.common.none} />
        </ListCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 머리 아래 8, 카드끼리 12, 별명 카드와 첫 목록 사이는 8 을 더 띄운다(12 + 8 + 12, 보드 16) */
  column: { gap: MyLayout.gap, paddingTop: MyLayout.top },
  listTop: { height: MyLayout.listTop },
});
