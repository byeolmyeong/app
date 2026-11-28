import { Redirect, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { isAvatarId } from '@/components/avatar';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SynastrySkyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { MainTabs } from '@/features/home/main-tabs';
import { useAccount } from '@/features/home/use-account';
import { SynastryEmptySky } from '@/features/synastry/synastry-empty-sky';

/**
 * 궁합 탭(결정 102 의 3 · 104, 시안 "궁합 (결정 104)" 1-2). A④ 가 별 지도 · 순위 · 입력 화면을 만들기 전까지(결정 113 의 3):
 * - 탭 첫 화면 `/synastry` 는 이 레이아웃이 직접 그린다 — 0명 화면의 별 지도 카드와 아래 탭. 홈 나의 사람들이 붙이는 `?relation=LOVE|FRIEND` 는
 *   아직 읽지 않는다(A④ 가 입력 화면으로 잇는다).
 * - 옛 1.0.0 궁합 화면 파일(직접 입력 `index` · 결과 `[id]` · 랭킹 `ranking`)은 그리지 않는다 — 딥 링크 · 옛 링크로 그 밖의 `/synastry/**` 를 열어도
 *   홈으로 보낸다(결정 055 의 1). A④ 가 옛 화면을 지울 때(A4-6) 화면 쌓기로 바꾼다.
 */
export default function SynastryLayout() {
  const segments: string[] = useSegments();
  const account = useAccount();
  if (segments.length > 1) return <Redirect href="/" />;
  return (
    <Screen nav={<NavBar chevron title={strings.synastryTab.title} />} footer={<MainTabs active="synastry" />}>
      <View testID="synastry-tab" style={styles.column}>
        <SynastryEmptySky avatar={isAvatarId(account?.avatar) ? account.avatar : null} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { paddingTop: SynastrySkyLayout.padTop, paddingBottom: SynastrySkyLayout.padBottom },
});
