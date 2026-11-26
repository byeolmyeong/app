import { router, Stack, useSegments, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { slideInScreenOptions, useSlideUpScreenOptions } from '@/components/slide-up';
import { useAppFonts } from '@/components/use-app-fonts';
import { useInert } from '@/components/use-inert';
import { SplashView, useSplashDone } from '@/components/splash-view';
import { Colors } from '@/constants/theme';
import { guardCovers, guardRedirect } from '@/features/auth/guard';
import { resumeStep } from '@/features/auth/signup-resume';
import { useSuspended } from '@/features/auth/suspension';
import { useSuspensionGate } from '@/features/auth/suspension-gate';
import { recheckSession, useSession } from '@/features/auth/use-session';
import { useHomeReady } from '@/features/home/home-ready';
import { TAB_ROOT_SCREENS } from '@/features/home/main-tabs';
import { useIntroSeen } from '@/features/onboarding/intro-seen';
import { usePushDeviceSync, usePushTapRouting } from '@/features/push/push';
import { ChunkErrorBoundary } from '@/features/update/chunk-reload';
import { UpdateGate } from '@/features/update/update-gate';
import { initAnalytics, useRouteAnalytics } from '@/lib/analytics';

SplashScreen.preventAutoHideAsync();
// 제품 분석(결정 040). 키가 없으면(로컬 개발) 아무것도 보내지 않는다.
initAnalytics();

/** 아래에서 올라오는 창으로 여는 약관 글(결정 067 의 1). 가입 약관 단계의 "보기" 와 마이가 같은 화면을 연다 */
const SLIDE_UP_ROUTES = ['settings/terms', 'settings/privacy', 'settings/privacy-consent', 'settings/marketing'];
/** 오른쪽에서 밀려 들어오는 가입 단계(앱은 화면 쌓기 기본, 웹은 화면이 스스로 — 결정 068 의 7) */
const SLIDE_IN_ROUTES = ['signup/nickname', 'signup/birth'];
const SLIDE_IN_OPTIONS = slideInScreenOptions(Platform.OS);
/** 아래 탭의 첫 화면 넷: 탭을 바꾸면(replace) 미끄러짐 없이 바로 — iOS 탭 막대의 관례(소유자 지적) */
const TAB_ROOT_OPTIONS = { animation: 'none' } as const;
/**
 * 화면 쌓기 기본: 탭 안에서 들어가는 화면도 밀려 들어오지 않고 바로 바뀐다(소유자 2026-11-21 · 빌드 15 "오른쪽에서 왼쪽으로 … 안 되게", 결정 094).
 * 아래에서 올라오는 약관 글 · 오른쪽에서 들어오는 가입 단계만 제 옵션으로 덮는다.
 */
const STACK_OPTIONS = { headerShown: false, animation: 'none', contentStyle: { backgroundColor: Colors.paper } } as const;
/** 확인하지 못한 세션을 다시 확인하는 간격 */
const RECHECK_MS = 30_000;

/**
 * 루트의 오류 경계(Expo Router). 웹에서 화면 조각을 불러오지 못하면(배포가 바뀐 뒤 열려 있던 탭) 한 번만 새로 고치고,
 * 그래도 안 되면 20-1. 그 밖의 오류는 위로 넘긴다(features/update/chunk-reload.tsx).
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ChunkErrorBoundary {...props} />;
}

export default function RootLayout() {
  // 화면이 바뀔 때 screen_viewed · 첫 화면 app_opened · 출생 정보 입력 시작(결정 040 · 081 — 경로로 정한다)
  useRouteAnalytics();
  // ── 루트 훅: 세션 · 소개 기록 · 가드 · 글꼴 · 확인하지 못한 세션 다시 확인.
  // 앱이 켜질 때 세션을 시작한다(개발용 세션이 켜져 있을 때만 서버를 부른다).
  // 공유 페이지(/s/…)는 로그인 없이 열리는 화면이라 그 안에서는 시작하지 않는다(결정 025).
  const segments: string[] = useSegments();
  const [first, second] = segments;
  const session = useSession(first !== 's');
  // 소개 2장은 이 기기에서 처음 한 번만(결정 042 · 055). 기기 저장소에서 읽는다.
  const introSeen = useIntroSeen(first !== 's');
  // 로그인 전 가드(결정 034): 로그인 · 가입 · 공유 페이지 말고는 로그인해야 들어온다. 보내는 동안과 확인 중에는 화면을 가린다.
  // 가입 중이면 하던 단계로(결정 068 — 가입 중간에 나갔다 돌아온 사람)
  const target = guardRedirect(session.status, first, introSeen, second, resumeStep());
  const covered = guardCovers(session.status, first, introSeen, second);
  useEffect(() => {
    if (target) router.replace(target);
  }, [target]);
  const slideUp = useSlideUpScreenOptions();
  // 글꼴: 앱은 빌드 때 넣어 기다리지 않고(결정 086), 웹은 공식 부분 글꼴 woff2 의 핵심 묶음 셋을 기다린다(성능 계획 1 — components/use-app-fonts)
  const [loaded, error] = useAppFonts();
  const fontsDone = loaded || !!error;
  // 이용 정지 문(결정 065 의 5): 로그인이 확인되면 정지인지 답이 올 때까지 가리고, 정지면 정지 화면으로. 그동안 스플래시도 둔다
  const [gateBlocked, setGateBlocked] = useState(false);
  const signedIn = session.status === 'signedIn';
  const suspensionCovers = useSuspensionGate(signedIn, fontsDone && !gateBlocked);
  const suspendedNow = useSuspended();
  // 휴대폰 푸시(결정 057 · 066): 로그인하면 이 기기를 등록하고, 알림을 누르면 화면들이 그려진 뒤 그 종류의 화면으로
  usePushDeviceSync(signedIn);
  usePushTapRouting({
    ready: fontsDone && !gateBlocked && signedIn && !suspensionCovers,
    suspended: suspendedNow,
    signedOut: session.status === 'signedOut',
  });
  // 웹이 시작할 때 서버에 닿지 못했으면(결정 068 의 4) 30초마다 다시 확인한다 — 살아 있으면 로그인, 401 이면 로그인 화면
  const unreachable = session.status === 'offline';
  useEffect(() => {
    if (!unreachable) return;
    const timer = setInterval(() => void recheckSession(), RECHECK_MS);
    return () => clearInterval(timer);
  }, [unreachable]);

  // ── 스플래시: 걷는 때는 splashDone 한 곳에서 정한다(결정 067 의 3 · 068).
  // 처음 열 때 글꼴 · 세션 확인 · (로그인 전이면) 소개 기록 확인이 끝나 보낼 곳에 간 뒤에 걷는다.
  // 로그인한 홈이면 홈의 첫 데이터까지(home-ready), 이용 정지 확인이 가리는 동안도 둔다.
  // 문이 막는 화면을 띄우면 화면들이 빠져 보낼 수 없으니 바로 걷는다. 공유 페이지(/s/…)에는 스플래시가 아예 없다.
  // 웹은 앱이 그리고(최소 0.8초), 앱은 네이티브 스플래시를 그때까지(최대 5초) 둔다.
  const homeReady = useHomeReady();
  const waitHome = first === undefined && (session.status === 'signedIn' || session.status === 'offline') && !homeReady;
  const splashDone = useSplashDone(
    fontsDone && (gateBlocked || (!covered && !suspensionCovers && !waitHome && (first === 's' || session.ready))),
    first === 's',
  );
  useEffect(() => {
    if (splashDone) SplashScreen.hideAsync();
  }, [splashDone]);
  // 웹에서 스플래시 · 가드 가림막이 덮은 동안 아래 화면들은 누름 · 포커스 · 화면 읽기를 받지 않는다
  const screensHidden = Platform.OS === 'web' && (covered || suspensionCovers || !splashDone);
  const screensRef = useInert(screensHidden);

  // ── 화면들: 문(UpdateGate) 안에 화면 쌓기(덮인 동안 inert 인 칸) · 이용 정지 확인 가림막(그 칸 뒤, 위에 덮이게) · 가드 가림막.
  // 최소 버전보다 낮은 앱은 화면들 대신 막는 화면만 본다(결정 027). 세션과 상관없다.
  // 최신 버전보다 낮으면 로그인한 홈에서만 한 번 권한다 — 로그인 전 · 가입 중에는 묻지 않는다(결정 059).
  // 웹 스플래시는 글꼴을 받는 동안과 받은 뒤 같은 자리(맨 위)에 둬 다시 그려지지 않게 한다.
  return (
    <>
      {fontsDone ? (
        <UpdateGate canSuggest={signedIn && first === undefined && !suspensionCovers} onBlockedChange={setGateBlocked}>
          <View testID="screens" ref={screensRef} aria-hidden={screensHidden} style={styles.screens}>
            <Stack screenOptions={STACK_OPTIONS}>
              {SLIDE_UP_ROUTES.map((name) => (
                <Stack.Screen key={name} name={name} options={slideUp} />
              ))}
              {SLIDE_IN_ROUTES.map((name) => (
                <Stack.Screen key={name} name={name} options={SLIDE_IN_OPTIONS} />
              ))}
              {TAB_ROOT_SCREENS.map((name) => (
                <Stack.Screen key={name} name={name} options={TAB_ROOT_OPTIONS} />
              ))}
            </Stack>
          </View>
          {suspensionCovers ? <View testID="suspension-cover" style={styles.cover} /> : null}
          {covered ? <View testID="guard-cover" style={styles.cover} /> : null}
        </UpdateGate>
      ) : null}
      {Platform.OS === 'web' && !splashDone ? (
        <View style={styles.cover}>
          <SplashView />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: Colors.paper },
  screens: { flex: 1 },
});
