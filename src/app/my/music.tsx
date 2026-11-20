import { Redirect } from 'expo-router';

import { MusicSettingsScreen } from '@/features/audio/music-screen';
import { MUSIC_IN_APP } from '@/features/audio/tracks';

/** 마이 › 음악(결정 062). 1.0.0 에서는 음악을 꺼 두어(결정 069) 주소로 바로 들어와도 마이로 보낸다 */
export default function MusicRoute() {
  if (!MUSIC_IN_APP) return <Redirect href="/my" />;
  return <MusicSettingsScreen />;
}
