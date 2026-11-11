import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { strings } from '@/content/strings';
import { BirthForm } from '@/features/chart/birth-form';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';

/** 출생 정보 바꾸기. 넣어 둔 값으로 칸을 채워 보여 주고, 바꿔서 누르면 새 풀이 글로 간다(결정 019). */
export default function BirthScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  const stored = profile && chart ? { profile, chart } : null;
  return (
    <Screen nav={<NavBar title={strings.birth.title} onBack={goBackOrHome} />}>
      {/* 기기 저장소를 읽고 나면 보관된 값으로 입력 칸을 다시 만든다. */}
      <BirthForm key={loaded ? 'restored' : 'initial'} stored={stored} save={save} />
    </Screen>
  );
}
