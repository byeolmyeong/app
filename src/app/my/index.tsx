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
import { CONSTELLATIONS } from '@/features/chart/constellations';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { daysSince } from '@/features/home/days-since';
import { MainTabs } from '@/features/home/main-tabs';
import { MyCard } from '@/features/my/my-card';
import { todaySkyTimeLabel } from '@/features/my/notification-settings';
import { useMyAccount } from '@/features/my/use-my-account';
import { useStoredHeadline } from '@/features/reading/use-reading';

const M = strings.my;
const R = M.rows;

/**
 * 마이 v2(결정 056, 보드 16): 위 별명 카드(계정 · 프로필 / 출생 정보 바꾸기) · 아래 묶음 제목 없는 카드 둘.
 * 로그아웃 · 계정 삭제는 계정 화면에 있다(056 의 3). 첫 카드 맨 위는 알림(16-2), 음악 줄은 1.1.0 에서 더한다(결정 069).
 * 출생 정보가 없어도(기기 저장소가 비었다) 카드는 닉네임과 버튼만으로 그리고, 줄들과 아래 탭은 그대로 보인다.
 * 서버를 부르는 것은 계정(`GET /account`)뿐이다 — 별자리 · 한 줄 별명 · 받은 날은 기기에 받아 둔 것을 쓴다.
 */
export default function MyScreen() {
  const { loaded, profile, chart } = useBirthProfile();
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 옛 모양으로 받아 둔 풀이도 한 줄 별명은 그대로(업데이트 직후 — 마이는 풀이를 부르지 않는다, 리뷰 #49)
  const { stored: reading } = useStoredHeadline(input);
  const { account, pending } = useMyAccount();
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
          accountPending={pending}
          sunSign={sun ? signFullName(sun.sign) : null}
          // 오른쪽 위 그림도 해 별자리(서버 값)로 고른다 — 홈 카드와 같다
          art={sun && CONSTELLATIONS[sun.sign] ? { sign: sun.sign, ...CONSTELLATIONS[sun.sign] } : null}
          days={reading?.createdAt ? daysSince(reading.createdAt, now) : null}
          headline={reading?.headline ?? null}
          birthLine={profile ? formatBirthLine(profile) : null}
          onAccount={() => router.push('/my/account')}
          onBirth={() => router.push('/my/birth')}
        />
        <View style={styles.listTop} />
        <ListCard>
          {/* 오른쪽 받는 시간은 푸시 · 오늘의 하늘이 둘 다 켜졌을 때만(보드 16). 음악 줄(/my/music)은 1.1.0 에서 이 아래에 더한다(결정 069) */}
          <ListCardRow label={R.notifications} value={todaySkyTimeLabel(account) ?? undefined} onPress={() => router.push('/my/notifications')} />
          <ListCardRow label={R.faq} onPress={() => router.push('/settings/faq')} />
          <ListCardRow label={R.inquiry} onPress={() => router.push('/my/inquiries')} />
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
