import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useCanGoBack } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { slideUpScreenOptions, useSlideUp } from '@/components/slide-up';
import { TextPage } from '@/components/text-page';
import { Colors, Motion } from '@/constants/theme';
import { terms } from '@/content/legal';
import { strings } from '@/content/strings';

jest.mock('expo-router', () => ({ useCanGoBack: jest.fn(() => true), useIsFocused: () => true }));

// 아래에서 올라오는 창(결정 067 의 1): 약관 글 네 화면을 이 옵션으로 연다
describe('아래에서 올라오는 창: 화면 옵션', () => {
  it('iOS · 안드로이드는 아래에서 올라오고(닫으면 내려가고) 바탕은 처음부터 paper', () => {
    for (const os of ['ios', 'android'] as const) {
      expect(slideUpScreenOptions(os, false)).toEqual({ animation: 'slide_from_bottom', contentStyle: { backgroundColor: Colors.paper } });
    }
  });

  it('동작 줄이기가 켜져 있으면 움직이지 않는다', () => {
    expect(slideUpScreenOptions('ios', true)).toMatchObject({ animation: 'none' });
  });

  it('웹은 앞 화면을 남기고(transparentModal) 바탕은 비운다 — 글 화면이 스스로 paper 로 올라온다', () => {
    expect(slideUpScreenOptions('web', false)).toEqual({ presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } });
  });
});

/** 웹에서 쓰는 hook 을 그대로 그린다: 올라오는 칸 + 닫기 */
function Probe({ onClosed }: { onClosed: () => void }) {
  const { style, close } = useSlideUp();
  return (
    <Animated.View testID="slide" style={style}>
      <Pressable onPress={() => close(onClosed)}>
        <Text>닫기</Text>
      </Pressable>
    </Animated.View>
  );
}

const translateY = () => {
  const style = StyleSheet.flatten(screen.getByTestId('slide').props.style);
  return style.transform?.[0]?.translateY;
};

/** Animated.timing 을 가짜로 바꿔 끝나는 때를 시험이 정한다 */
function fakeTiming() {
  const runs: { toValue: number; duration: number; finish: (finished?: boolean) => void }[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    const run = { toValue: config.toValue as number, duration: config.duration ?? 0, finish: (_finished?: boolean) => {} };
    runs.push(run);
    return {
      start: (done?: (result: { finished: boolean }) => void) => {
        run.finish = (finished = true) => {
          if (finished) (value as Animated.Value).setValue(config.toValue as number);
          done?.({ finished });
        };
      },
      stop: () => {},
      reset: () => {},
    };
  });
  return runs;
}

describe('아래에서 올라오는 창: 웹', () => {
  const original = Platform.OS;
  const setReduce = (matches: boolean) => {
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} });
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    (useCanGoBack as jest.Mock).mockReturnValue(true);
    Platform.OS = 'web';
    setReduce(false);
  });
  afterEach(() => {
    Platform.OS = original;
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  it('앱 안에서 열면 화면 아래(100%)에서 시작해 0.42초 동안 제자리로 올라온다', async () => {
    const runs = fakeTiming();
    await render(<Probe onClosed={jest.fn()} />);
    expect(translateY()).toBe('100%');
    expect(runs).toEqual([expect.objectContaining({ toValue: 1, duration: 420 })]);
    await act(async () => runs[0].finish());
    expect(translateY()).toBe('0%');
  });

  it('닫으면 아래로 내려간 다음에야 돌아간다(뒤로 · 동의하기)', async () => {
    const runs = fakeTiming();
    const onClosed = jest.fn();
    await render(<Probe onClosed={onClosed} />);
    await act(async () => runs[0].finish());
    await fireEvent.press(screen.getByText('닫기'));
    expect(runs[1]).toMatchObject({ toValue: 0 });
    expect(onClosed).not.toHaveBeenCalled();
    await act(async () => runs[1].finish());
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('내려가는 중에 화면이 사라져 움직임이 끊기면(브라우저 뒤로 등) 돌아가기를 한 번 더 하지 않는다', async () => {
    const runs = fakeTiming();
    const onClosed = jest.fn();
    await render(<Probe onClosed={onClosed} />);
    await act(async () => runs[0].finish());
    await fireEvent.press(screen.getByText('닫기'));
    await act(async () => runs[1].finish(false));
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('주소로 바로 열어 돌아갈 앞 화면이 없으면 움직이지 않는다', async () => {
    (useCanGoBack as jest.Mock).mockReturnValue(false);
    const runs = fakeTiming();
    const onClosed = jest.fn();
    await render(<Probe onClosed={onClosed} />);
    expect(translateY()).toBeUndefined();
    await fireEvent.press(screen.getByText('닫기'));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(runs).toHaveLength(0);
  });

  it('동작 줄이기가 켜져 있으면 움직이지 않고 바로 닫힌다', async () => {
    setReduce(true);
    const runs = fakeTiming();
    const onClosed = jest.fn();
    await render(<Probe onClosed={onClosed} />);
    expect(translateY()).toBeUndefined();
    await fireEvent.press(screen.getByText('닫기'));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(runs).toHaveLength(0);
  });

  it('약관 글 화면(TextPage)의 뒤로 · 동의하기도 내려간 뒤에 부른다', async () => {
    const runs = fakeTiming();
    const onBack = jest.fn();
    const onAgree = jest.fn();
    await render(<TextPage doc={terms} onBack={onBack} onAgree={onAgree} />);
    await act(async () => runs[0].finish());
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(onBack).not.toHaveBeenCalled();
    await act(async () => runs[1].finish());
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('아래에서 올라오는 창: iOS · 안드로이드', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('화면 쌓기가 움직이므로 글 화면은 그대로 두고, 닫기는 바로 돌아간다', async () => {
    const runs = fakeTiming();
    const onClosed = jest.fn();
    await render(<Probe onClosed={onClosed} />);
    expect(translateY()).toBeUndefined();
    await fireEvent.press(screen.getByText('닫기'));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(runs).toHaveLength(0);
  });
});

// 아래 시트(Sheet)와 아래에서 올라오는 창은 같은 움직임 값을 theme.ts 하나(Motion)에서 쓴다
describe('움직임 값', () => {
  // 빌드 15 에서 300 · 220 은 내 하늘 지도 시트 · 이유 펼침이 너무 빠르다고 함(소유자) — 조금 늘림
  it('열기 420 · 닫기 280 · 여는 곡선 bezier(0.32, 0.72, 0, 1)', () => {
    expect(Motion).toEqual({ openMs: 420, closeMs: 280, openCurve: [0.32, 0.72, 0, 1] });
  });
});
