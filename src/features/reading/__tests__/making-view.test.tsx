import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { strings } from '@/content/strings';
import { MakingView } from '@/features/reading/making-view';

const M = strings.making;

/** 지금 보이는 안내 문구(셋 중 하나만 화면에 있다) */
const shownLines = () => M.lines.filter((line) => screen.queryByText(line) !== null);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// 별명 짓는 중(결정 041, 보드 9): 별이 둥실 · 뒤 빛 · 궤도 · 반짝임 · 안내 문구 셋이 2.5초마다
describe('MakingView', () => {
  it('제목과 첫 문구를 보여 주고, "길면 1분쯤 걸려요" 는 없다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<MakingView />);
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(shownLines()).toEqual([M.lines[0]]);
    expect(screen.queryByText(/1분/)).toBeNull();
  });

  it('동작 줄이기가 꺼져 있으면 문구 셋이 2.5초마다 순서대로 바뀌고 처음으로 돌아온다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<MakingView />);
    await act(async () => {});
    expect(shownLines()).toEqual([M.lines[0]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[1]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[2]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[0]]);
  });

  it('동작 줄이기가 켜져 있으면 멈춘 첫 장면 — 첫 문구만 계속 보인다(1분이 넘어도, 리뷰 초점 3)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<MakingView />);
    await act(async () => {});
    await act(async () => jest.advanceTimersByTime(70_000));
    expect(shownLines()).toEqual([M.lines[0]]);
    expect(screen.getByText(M.title)).toBeTruthy();
  });
});
