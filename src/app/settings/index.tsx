import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { strings } from '@/content/strings';
import { goBackOrHome } from '@/features/chart/chart-empty';

const S = strings.settings;

/**
 * 설정: 처리방침 · 약관 · 문의 · 앱 버전(F9). 마이에서 들어온다.
 * 로그아웃은 소셜 로그인(태스크 4), 알림은 푸시(태스크 9)가 생길 때 더한다.
 */
export default function SettingsScreen() {
  return (
    <Screen nav={<NavBar title={S.title} onBack={goBackOrHome} />}>
      <View>
        <ListRow label={S.privacy} onPress={() => router.push('/settings/privacy')} />
        <ListRow label={S.terms} onPress={() => router.push('/settings/terms')} />
        <ListRow
          label={S.contact}
          value={S.contactEmail}
          // 메일 앱이 없으면 열지 못한다. 주소가 줄에 적혀 있으니 따로 알리지 않는다.
          onPress={() => void Linking.openURL(`mailto:${S.contactEmail}`).catch(() => {})}
        />
        <ListRow label={S.version} value={Constants.expoConfig?.version ?? strings.common.none} />
      </View>
    </Screen>
  );
}
