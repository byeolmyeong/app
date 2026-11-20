import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { useOnline } from '@/components/use-online';
import { Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { BirthForm } from '@/features/chart/birth-form';
import { birthInputOf } from '@/features/chart/birth-input';
import { signName } from '@/features/chart/chart-rows';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { useBirthRestore } from '@/features/chart/use-birth-restore';
import { daysSince } from '@/features/home/days-since';
import { MainTabs } from '@/features/home/main-tabs';
import { NicknameCard } from '@/features/home/nickname-card';
import { useAccount } from '@/features/home/use-account';
import { useStoredReading } from '@/features/reading/use-reading';

/**
 * 홈 v2(결정 047 · 055, 보드 11 · 11-1). 출생 정보가 있으면 머리(로고) · 별명 카드 · 아래 탭 넷을 보여 주고
 * (오늘의 하늘 · 지금 나의 시기 · 작은 실천 칸은 계획 묶음 A③ · A④ 가 더한다), 없으면 출생 정보 입력부터 받는다.
 * 기기 저장소를 읽기 전에는 아무것도 그리지 않는다(입력 화면이 잠깐 비쳤다가 바뀌지 않게).
 * 기기에 출생 정보가 없고 세션이 있으면 서버에 저장된 것으로 한 번 되살려 본다(결정 029). 그동안에는 불러오는 중만 보여 주고,
 * 되살리지 못하면 입력부터 받는다.
 */
export default function HomeScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  const session = useSession();
  const empty = loaded && !profile;
  const canRestore = empty && session.status === 'signedIn';
  const restoreSettled = useBirthRestore(canRestore, save);
  // 받아 둔 풀이가 있으면 한 줄 총평을 홈에 올린다(서버를 부르지 않는다).
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  const { reading } = useStoredReading(input);
  const account = useAccount();
  // "별명을 받은 지 N일" 의 오늘 — 화면이 뜬 때로 한 번 정한다(그리는 동안 시계를 읽지 않는다)
  const [now] = useState(Date.now);
  // 연결 끊김(결정 061 의 4): 받아 둔 것은 그대로 보이고 머리 아래에 띠(보드 20)
  const online = useOnline();
  const nav = <NavBar tall left={<BrandMark height={Sizes.brandMarkHeight} />} />;
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (empty && (!session.ready || (canRestore && !restoreSettled)))
    return (
      <Screen nav={nav}>
        <View style={styles.intro}>
          <Txt variant="table" color="gray">
            {strings.home.restoring}
          </Txt>
        </View>
      </Screen>
    );
  if (profile && chart) {
    // 해 별자리는 서버 차트의 SUN 그대로(날짜로 셈하지 않는다, 결정 006)
    const sun = chart.positions.find((p) => p.body === 'SUN');
    return (
      <Screen nav={nav} footer={<MainTabs active="home" />}>
        <View testID="home-column" style={styles.column}>
          {online ? null : <OfflineBanner />}
          <NicknameCard
            nickname={account?.nickname ?? null}
            avatar={account?.avatar ?? null}
            sunSign={sun ? signName(sun.sign) + strings.chart.signSuffix : null}
            days={reading?.createdAt ? daysSince(reading.createdAt, now) : null}
            headline={reading?.headline ?? null}
            onOpen={() => router.push('/reading')}
          />
        </View>
      </Screen>
    );
  }
  return (
    <Screen nav={nav}>
      <View style={styles.intro}>
        <Txt variant="display">{strings.home.title}</Txt>
        <Txt variant="table" color="gray">
          {strings.home.subtitle}
        </Txt>
      </View>
      <BirthForm stored={null} save={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  /** 머리 아래 12, 카드끼리 12(보드 11) */
  column: { gap: Spacing.sm, paddingTop: Spacing.sm },
});
