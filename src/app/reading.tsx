import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { OfflineBanner } from '@/components/offline-banner';
import { SkeletonGroup } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { strings } from '@/content/strings';
import { clearSignedUp, signedUpNickname } from '@/features/auth/signup-draft';
import { useSoundtrack } from '@/features/audio/use-soundtrack';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { keyThree } from '@/features/chart/chart-rows';
import { SignCard, SignCardSkeleton } from '@/features/chart/sign-card';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { MakingView } from '@/components/making-view';
import { ReadingSkeleton, ReadingView } from '@/features/reading/reading-view';
import { clearPendingReveal, pendingReveal } from '@/features/reading/reveal-once';
import { RevealView } from '@/features/reading/reveal-view';
import { useReading, useStoredReading } from '@/features/reading/use-reading';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy } from '@/features/update/update-gate';

const S = strings.reading;
const ST = strings.states;
const MF = strings.making.fail;

/**
 * 내 별명(결정 048 의 2, 보드 12 받은 뒤 · 12-1~12-3): 요약 해석의 전체 페이지 — 한 줄 별명 · 별자리 카드(셋 · 내 하늘 지도 보기) ·
 * 문단마다 접힌 "이렇게 풀이한 이유" · 강점 · 보완점. 머리는 꺾쇠 뒤로 가기(나 탭 · 홈에서 들어온다)와 오른쪽 공유하기, 아래 탭은 나.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다. 면책 문구는 두지 않는다(결정 064).
 * 가입을 마치고 바로 와서(from=signup) 글이 다 지어지면 별명 공개(보드 10)를 한 번 보이고, "풀이 읽기" 로 이 글을 보인다(결정 044 · 048).
 */
export default function ReadingScreen() {
  const { ready } = useSession();
  // 가입을 마치고 바로 온 것인가(별명 짓는 중을 머리 없이, 보드 9). 홈 · 출생 정보 바꾸기에서 오면 뒤로 가기가 있다
  const { from } = useLocalSearchParams<{ from?: string }>();
  // 별명 공개에 쓸 닉네임: 가입 직후(가입이 받은 값, 결정 044)와 출생 정보를 바꾼 직후(소유자 2026-11-20)에만 메모리에 있다.
  // 앱을 다시 켜거나 웹을 새로 고치면 없다
  const [revealFor, setRevealFor] = useState(() => (from === 'signup' ? signedUpNickname() : from === 'birth' ? pendingReveal() : null));
  const { loaded, profile, chart } = useBirthProfile();
  const birth = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 먼저 기기에 받아 둔 글을 찾는다. 있으면 세션을 기다리지 않고 바로 보여 준다.
  const stored = useStoredReading(birth);
  // 받아 둔 글이 없을 때만, 세션이 준비된 뒤에 서버에 요청한다.
  const { state, retry } = useReading(ready && stored.checked && !stored.reading ? birth : null);
  // 짓는 중이거나 방금 받은 글이 떠 있는 동안에는 강제 업데이트를 미룬다(결정 027). 받아 둔 글을 다시 연 것은 아니다.
  const generating = profile !== null && stored.checked && !stored.reading && state.status === 'loading';
  useGenerationBusy(generating, !stored.reading && state.status === 'done');
  // 가입 직후 · 출생 정보를 바꾼 직후는 서버가 새로 짓는 중이라 바로 별명 짓는 중(보드 9). 그 밖(홈 · 나 탭에서 들어옴)은 대개 지어 둔 글을
  // 받아 오므로 0.3초 뒤 뼈대, 10초가 넘으면 새로 짓는 것으로 보고 별명 짓는 중(결정 071 · 065 의 2 — 나 탭과 같다, 리뷰 #49)
  const fresh = from === 'signup' || from === 'birth';
  const phase = useLoadingPhase(!fresh && profile !== null && !stored.reading && state.status === 'loading');
  const making = generating && (fresh || phase === 'timeout');
  // 짓는 동안(별명 짓는 중 화면)만 기다릴 때 음악(결정 062 의 1). 글이 오거나 못 지으면 배경으로
  useSoundtrack('waiting', making);
  const nav = <NavBar title={S.title} onBack={goBackOrHome} chevron />;
  // 글이 보일 때만 머리 오른쪽에 공유하기(지금의 요약 해석 카드 — 공유 v2 는 계획 A⑤)
  const readNav = <NavBar title={S.title} onBack={goBackOrHome} chevron right={<ShareEntry target={{ kind: 'READING' }} trigger="icon" />} />;
  // 나 탭 안에서 들어온 화면이라 아래 탭은 나(결정 046 의 2 — 시안 12 에 탭이 있다)
  const tabs = <MainTabs active="me" nested />;
  // 연결 끊김(결정 061 의 4): 받아 둔 글은 그대로 두고 위에 띠, 끊겨서 못 받았으면 연결이 돌아올 때 다시 부른다
  const online = useOnline();
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });
  const banner = online ? null : <OfflineBanner />;

  if (loaded && !profile)
    return (
      <Screen nav={nav} footer={tabs}>
        <ChartEmpty />
      </Screen>
    );

  const written = stored.reading ?? (state.status === 'done' ? state.reading : null);
  if (revealFor && written)
    return (
      <RevealView
        nickname={revealFor}
        headline={written.headline}
        // 해 · 달 · (시각을 알 때만) 상승궁 — 차트 요약(KeyThree)과 같은 값
        signs={chart ? keyThree(chart).map((k) => ({ label: k.label, value: k.value + strings.chart.signSuffix })) : []}
        onRead={() => {
          clearSignedUp();
          clearPendingReveal();
          setRevealFor(null);
        }}
      />
    );

  if (stored.reading)
    return (
      <Screen nav={readNav} footer={tabs}>
        {banner}
        <ReadingView reading={stored.reading} chart={chart} card={chart ? <SignCard chart={chart} /> : null} />
      </Screen>
    );

  // 기기를 찾아보는 동안에는 아무것도 그리지 않는다("짓는 중" 이 잠깐 비치지 않게).
  if (!stored.checked) return <Screen nav={nav}>{null}</Screen>;

  // 짓는 동안은 "별명 짓는 중"(결정 042 보드 9) — 가입을 마치고 처음 오는 곳이기도 하다
  if (making) return <MakingView nav={from === 'signup' ? undefined : nav} />;
  // 받아 오는 동안은 글과 같은 배치의 뼈대(결정 071) — 머리 · 아래 탭은 진짜
  if (state.status === 'loading')
    return (
      <Screen nav={nav} footer={tabs}>
        {phase === 'skeleton' ? (
          <SkeletonGroup testID="reading-skeleton">
            <ReadingSkeleton card={chart ? <SignCardSkeleton chart={chart} /> : null} />
          </SkeletonGroup>
        ) : null}
      </Screen>
    );

  // 못 받았을 때(결정 061 의 1 · 3 · 4): 끊겼으면 보드 20-1, 가입 직후면 보드 9-1(머리 · 탭 없이 다시 짓기만),
  // 그 밖에는 보드 19 — 요청이 많을 때만 그 안내로
  if (state.status === 'failed')
    return state.error === 'NETWORK' && !online ? (
      <StateScreen
        // 가입 직후면 머리 · 아래 탭 없이 — 갈 곳이 없고 별명 공개(결정 044)를 놓치지 않게(결정 065 의 4)
        nav={from === 'signup' ? undefined : nav}
        tabs={from === 'signup' ? undefined : tabs}
        title={ST.offlineEmpty.title}
        body={ST.offlineEmpty.body}
        primary={{ label: ST.offlineEmpty.retry, onPress: retry }}
      />
    ) : from === 'signup' ? (
      <StateScreen
        title={MF.title}
        body={state.error === 'LIMIT' ? S.failed.LIMIT : MF.body}
        primary={{ label: MF.retry, onPress: retry }}
      />
    ) : (
      <StateScreen
        nav={nav}
        tabs={tabs}
        title={ST.loadFail.title.reading}
        body={state.error === 'LIMIT' ? S.failed.LIMIT : ST.loadFail.body}
        primary={{ label: ST.loadFail.retry, onPress: retry }}
      />
    );

  return (
    <Screen nav={readNav} footer={tabs}>
      {banner}
      <ReadingView reading={state.reading} chart={chart} card={chart ? <SignCard chart={chart} /> : null} />
    </Screen>
  );
}
