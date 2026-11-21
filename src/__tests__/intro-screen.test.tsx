import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet } from 'react-native';

import IntroScreen from '@/app/intro';
import { strings } from '@/content/strings';
import { signOut } from '@/features/auth/sign-out';
import { guardRedirect } from '@/features/auth/guard';
import { INTRO_SEEN_KEY, hasSeenIntro, markIntroSeen } from '@/features/onboarding/intro-seen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ signOutSession: jest.fn(async () => {}) }));

const S = strings.intro;
const WIDTH = 390;
const pager = () => screen.getByTestId('intro-pager');
const layoutPager = () => fireEvent(pager(), 'layout', { nativeEvent: { layout: { width: WIDTH, height: 600, x: 0, y: 0 } } });
const scrollTo = (x: number) => fireEvent.scroll(pager(), { nativeEvent: { contentOffset: { x, y: 0 } } });
const label = (n: number) => `${n}${strings.steps.separator}2`;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// 소개(두 장, 결정 055 의 5)는 앱을 처음 받아 처음 켰을 때 한 번만(결정 042, 소유자 2026-11-19)
describe('소개를 봤는지', () => {
  it('처음에는 안 봤고, 적으면 봤다', async () => {
    expect(await hasSeenIntro()).toBe(false);
    await markIntroSeen();
    expect(await hasSeenIntro()).toBe(true);
    expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).not.toBeNull();
  });

  it('기기 저장소를 읽지 못하면 본 것으로 친다 — 소개를 건너뛰고 로그인으로', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    const seen = await hasSeenIntro();
    expect(seen).toBe(true);
    expect(guardRedirect('signedOut', undefined, seen)).toBe('/login');
  });

  it('로그아웃해도 지워지지 않는다(다음 로그인 전 상태는 로그인 화면부터)', async () => {
    await markIntroSeen();
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await signOut();
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    const seen = await hasSeenIntro();
    expect(seen).toBe(true);
    expect(guardRedirect('signedOut', undefined, seen)).toBe('/login');
  });
});

describe('소개 화면', () => {
  it('소개는 두 장 — 나 → 시기, 궁합 장은 없다(결정 055 의 5, 보드 1 · 3)', async () => {
    expect(S.slides.map((slide) => slide.title)).toEqual(['별이 지어 주는 나의 별명', '지금 나는 어떤 시기일까']);
    await render(<IntroScreen />);
    expect(screen.queryByText(/궁합/)).toBeNull();
    expect(screen.queryByTestId('intro-heart', { includeHiddenElements: true })).toBeNull();
  });

  it('제목은 피그마 보드처럼 한 줄 — 줄을 억지로 나누지 않는다(비교 B1)', () => {
    expect(S.slides.map((slide) => slide.title.includes('\n'))).toEqual([false, false]);
  });

  it('달은 보드의 그림(0~100 칸) 비율대로 — 카드 안에서 100 칸을 꽉 채운다(비교 B2)', async () => {
    await render(<IntroScreen />);
    const art = screen.getByTestId('intro-moon', { includeHiddenElements: true });
    expect(art.props.width).toBe(100);
    expect(art.props.viewBox ?? art.props.vbWidth).toBeTruthy();
  });

  it('시기 줄의 글자 줄높이는 16(비교 B11)', async () => {
    await render(<IntroScreen />);
    const label = screen.getByText(S.timeline.now);
    expect(StyleSheet.flatten(label.props.style).lineHeight).toBe(16);
  });

  it('처음 뜨는 순간 본 것으로 적는다(건너뛰기 · 시작하기를 기다리지 않는다)', async () => {
    await render(<IntroScreen />);
    await waitFor(async () => expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).not.toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText(S.slides[0].title)).toBeTruthy();
  });

  it('건너뛰기를 누르면 로그인 화면으로', async () => {
    await render(<IntroScreen />);
    await fireEvent.press(screen.getByText(S.skip));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('다음으로 둘째 장까지 넘기고 시작하기를 누르면 로그인 화면으로(점 1/2 · 2/2)', async () => {
    await render(<IntroScreen />);
    await layoutPager();
    expect(screen.getByLabelText(`1${strings.steps.separator}2`)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.next));
    // 장 번호는 스크롤이 그 장에 닿은 뒤에 바뀐다
    await scrollTo(WIDTH);
    expect(screen.getByLabelText(`2${strings.steps.separator}2`)).toBeTruthy();
    expect(screen.queryByText(S.next)).toBeNull();
    await fireEvent.press(screen.getByText(S.start));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});

// 소유자: "다음" 을 눌러 넘길 때 막대가 버벅인다(손으로 밀 때는 괜찮다). 버튼도 손으로 밀 때와 같은 한 줄기 — 막대는 스크롤 위치 하나만 따라간다
describe('소개 화면: 다음으로 넘길 때', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    (ScrollView.prototype.scrollTo as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('다음은 scrollTo 한 번(다음 장 · 움직임)만 부르고 막대에 따로 움직임을 걸지 않는다. 장 번호는 스크롤이 그 장에 닿은 뒤 한 번 바뀐다', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const spring = jest.spyOn(Animated, 'spring');
    await render(<IntroScreen />);
    await layoutPager();
    await act(async () => {});
    await fireEvent.press(screen.getByText(S.next));
    expect(ScrollView.prototype.scrollTo).toHaveBeenCalledTimes(1);
    expect(ScrollView.prototype.scrollTo).toHaveBeenCalledWith({ x: WIDTH, animated: true });
    expect(timing).not.toHaveBeenCalled();
    expect(spring).not.toHaveBeenCalled();
    // 누른 순간 장 번호를 바꾸지 않는다 — 스크롤이 처음(0) · 가운데를 지나는 동안 앞 장으로 되돌아가며 다시 그려지지 않게
    expect(screen.getByLabelText(label(1))).toBeTruthy();
    await scrollTo(0);
    await scrollTo(WIDTH / 2);
    expect(screen.getByLabelText(label(1))).toBeTruthy();
    await scrollTo(WIDTH);
    expect(screen.getByLabelText(label(2))).toBeTruthy();
    expect(screen.getByText(S.start)).toBeTruthy();
  });

  it('막대는 스크롤 위치를 네이티브 드라이버로 따라간다(폭이 아니라 transform 으로)', async () => {
    const event = jest.spyOn(Animated, 'event');
    await render(<IntroScreen />);
    expect(event).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ useNativeDriver: true }));
    for (const node of screen.getAllByTestId(/^intro-dot-/, { includeHiddenElements: true })) {
      const style = StyleSheet.flatten(node.props.style);
      expect(style.width).not.toEqual(expect.objectContaining({ interpolate: expect.anything() }));
      expect(style.transform).toBeDefined();
    }
  });

  it('동작 줄이기면 움직임 없이 바로 넘긴다', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
    await render(<IntroScreen />);
    await layoutPager();
    await act(async () => {});
    await fireEvent.press(screen.getByText(S.next));
    expect(ScrollView.prototype.scrollTo).toHaveBeenCalledWith({ x: WIDTH, animated: false });
  });
});
