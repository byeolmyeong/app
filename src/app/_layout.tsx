import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useSlideUpScreenOptions } from '@/components/slide-up';
import { SplashView, useSplashDone } from '@/components/splash-view';
import { Colors, FontFamily } from '@/constants/theme';
import { guardCovers, guardRedirect } from '@/features/auth/guard';
import { useSession } from '@/features/auth/use-session';
import { useIntroSeen } from '@/features/onboarding/intro-seen';
import { UpdateGate } from '@/features/update/update-gate';

SplashScreen.preventAutoHideAsync();

/** 아래에서 올라오는 창으로 여는 약관 글(결정 067 의 1). 가입 약관 단계의 "보기" 와 마이가 같은 화면을 연다 */
const SLIDE_UP_ROUTES = ['settings/terms', 'settings/privacy', 'settings/privacy-consent', 'settings/marketing'];

export default function RootLayout() {
  // 앱이 켜질 때 세션을 시작한다(개발용 세션이 켜져 있을 때만 서버를 부른다).
  // 공유 페이지(/s/…)는 로그인 없이 열리는 화면이라 그 안에서는 시작하지 않는다(결정 025).
  const segments: string[] = useSegments();
  const [first, second] = segments;
  const session = useSession(first !== 's');
  // 소개 2장은 이 기기에서 처음 한 번만(결정 042 · 055). 기기 저장소에서 읽는다.
  const introSeen = useIntroSeen(first !== 's');
  // 로그인 전 가드(결정 034): 로그인 · 가입 · 공유 페이지 말고는 로그인해야 들어온다. 보내는 동안과 확인 중에는 화면을 가린다.
  const target = guardRedirect(session.status, first, introSeen, second);
  const covered = guardCovers(session.status, first, introSeen, second);
  const slideUp = useSlideUpScreenOptions();
  useEffect(() => {
    if (target) router.replace(target);
  }, [target]);
  // 한 가족 이름 아래 굵기별 파일을 올린다. 굵기는 400 · 500 · 600 세 가지만 쓴다(theme.ts FontWeight, 결정 033).
  const [loaded, error] = useFonts([
    {
      fontFamily: FontFamily,
      fontDefinitions: [
        { path: require('@/assets/fonts/Pretendard-Regular.otf'), weight: 400, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-Medium.otf'), weight: 500, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-SemiBold.otf'), weight: 600, style: 'normal' },
      ],
    },
  ]);

  // 스플래시(결정 067 의 3): 처음 열 때 글꼴 · 세션 확인 · (로그인 전이면) 소개 기록 확인이 끝나 보낼 곳에 간 뒤에 걷는다.
  // 공유 페이지는 세션을 확인하지 않는다. 문이 막는 화면을 띄우면 화면들이 빠져 보낼 수 없으니 바로 걷는다.
  // 웹은 앱이 그리고(최소 0.8초), 앱은 네이티브 스플래시를 그때까지(최대 5초) 둔다.
  const [gateBlocked, setGateBlocked] = useState(false);
  const fontsDone = loaded || !!error;
  const splashDone = useSplashDone(fontsDone && (gateBlocked || (!covered && (first === 's' || session.ready))));
  useEffect(() => {
    if (splashDone) SplashScreen.hideAsync();
  }, [splashDone]);

  // 최소 버전보다 낮은 앱은 화면들 대신 막는 화면만 본다(결정 027). 세션과 상관없다.
  // 최신 버전보다 낮으면 로그인한 홈에서만 한 번 권한다 — 로그인 전 · 가입 중에는 묻지 않는다(결정 059).
  // 웹 스플래시는 글꼴을 받는 동안과 받은 뒤 같은 자리(맨 위)에 둬 다시 그려지지 않게 한다.
  return (
    <>
      {fontsDone ? (
        <UpdateGate canSuggest={session.status === 'signedIn' && first === undefined} onBlockedChange={setGateBlocked}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.paper } }}>
            {SLIDE_UP_ROUTES.map((name) => (
              <Stack.Screen key={name} name={name} options={slideUp} />
            ))}
          </Stack>
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
});
