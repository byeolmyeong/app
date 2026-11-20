import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListCard, ListCardRow } from '@/components/list-card';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { MyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { setMusicSetting, useMusicSettings } from '@/features/audio/music-settings';

const MU = strings.my.music;

/**
 * 음악(결정 062 의 3, 보드 16-11): 배경 음악 · 앱 열 때 음악 · 기다릴 때 음악 세 스위치. 처음엔 모두 켬이고 기기에만 둔다.
 * 바꾸면 지금 울리는 곡이 바로 따라 바뀐다. 기기에서 읽기 전에는 카드를 그리지 않는다(스위치가 깜빡이지 않게).
 */
export default function MusicScreen() {
  const settings = useMusicSettings();
  return (
    <Screen nav={<NavBar chevron title={MU.title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/my'))} />}>
      <View style={styles.column}>
        {settings ? (
          <ListCard>
            {(['background', 'opening', 'waiting'] as const).map((track) => (
              <ListCardRow
                key={track}
                label={MU[track]}
                toggle={{ value: settings[track], onChange: (on) => void setMusicSetting(track, on) }}
              />
            ))}
          </ListCard>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 머리 아래 12(보드 16-11) */
  column: { paddingTop: MyLayout.gap },
});
