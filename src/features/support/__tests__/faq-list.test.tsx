import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { strings } from '@/content/strings';
import { FaqList } from '@/features/support/faq-list';
import type { Faq } from '@/lib/api';

const items: Faq[] = [
  { id: 'faq-1', question: '요금이 있나요?', answer: '지금은 모두 무료예요.' },
  { id: 'faq-2', question: '계정을 지우면 어떻게 되나요?', answer: '모두 지워져요.\n되돌릴 수 없어요.' },
];
/** 펼친 답의 잰 높이(항목마다 다르게) */
const HEIGHTS = [60, 96];
const HIDDEN = { includeHiddenElements: true };

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());
// 단언이 실패해도 가짜 시계가 다음 시험으로 넘어가지 않게
afterEach(() => jest.useRealTimers());

// getAnimatedStyle 의 타입은 인자가 없다고 적혀 있지만 시험에서는 그 요소를 받는다(react-native-reanimated/jestUtils)
const animated = getAnimatedStyle as unknown as (element: unknown) => unknown;
/** i 번째 질문의 꺾쇠 회전(도) · 답 칸의 높이 · 보임 — Reanimated 가 지금 그리는 값 */
const now = (i = 0) => {
  const turn = animated(screen.getAllByTestId('faq-chevron', HIDDEN)[i]) as { transform: { rotate: string }[] };
  const body = animated(screen.getAllByTestId('faq-answer', HIDDEN)[i]) as { height: number; opacity: number };
  return { deg: parseFloat(turn.transform[0].rotate), height: body.height, opacity: body.opacity };
};
const body = (i = 0) => screen.getAllByTestId('faq-answer', HIDDEN)[i];
const press = (i = 0) => fireEvent.press(screen.getByRole('button', { name: items[i].question }));

/** 답은 처음부터 그려 두고(숨김), 칸의 높이와 상관없이 제 높이로 놓여 잰다 */
async function renderMeasured(reduce = false) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
  jest.useFakeTimers();
  await render(<FaqList items={items} />);
  await act(async () => {});
  const measures = screen.getAllByTestId('faq-measure', HIDDEN);
  expect(measures).toHaveLength(items.length);
  for (const [i, measure] of measures.entries()) {
    expect(StyleSheet.flatten(measure.props.style)).toMatchObject({ position: 'absolute' });
    await fireEvent(measure, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: HEIGHTS[i] } } });
  }
}

describe('FaqList: 질문을 누르면 답이 높이로 펼쳐지고 꺾쇠가 반 바퀴 돈다(이유 상자와 같은 움직임 — reason-reveal)', () => {
  it('접힌 답도 처음부터 그려 두지만 화면 읽기에서 숨기고 누를 수 없다. 펼치면 읽히고, 접으면 다시 숨는다', async () => {
    await render(<FaqList items={items} />);
    const [first] = items;
    // 접힘: 트리에는 있지만 숨김 — 화면 읽기는 읽지 않고, 누르는 것도 받지 않는다
    expect(screen.queryByText(first.answer)).toBeNull();
    expect(screen.getByText(first.answer, HIDDEN)).toBeTruthy();
    expect(body().props).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', pointerEvents: 'none' });
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({ expanded: false });

    await press();
    expect(screen.getByText(first.answer)).toBeTruthy();
    expect(body().props).toMatchObject({ accessibilityElementsHidden: false, importantForAccessibility: 'auto', pointerEvents: 'auto' });
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({ expanded: true });

    await press();
    expect(screen.queryByText(first.answer)).toBeNull();
    expect(body().props).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', pointerEvents: 'none' });
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({ expanded: false });
  });

  it('꺾쇠 회전 · 높이 · 보임이 진행 값 하나로 같은 길이 · 같은 곡선(Motion.openMs · closeMs) — 다른 질문은 그대로 있다', async () => {
    await renderMeasured();
    expect(now(0)).toEqual({ deg: 0, height: 0, opacity: 0 });

    await press(0);
    await act(async () => jest.advanceTimersByTime(16));
    const early = now(0);
    // 첫 프레임부터 셋이 같은 진행 값으로 움직인다
    expect(early.deg).toBeGreaterThan(0);
    expect(early.deg).toBeLessThan(180);
    expect(early.height / HEIGHTS[0]).toBeCloseTo(early.deg / 180, 5);
    expect(early.opacity).toBeCloseTo(Math.min(1, (early.deg / 180) * 3), 5);
    // 다 펼치기 전에는 잘라낸다
    expect(StyleSheet.flatten(body(0).props.style)).toMatchObject({ overflow: 'hidden' });
    await act(async () => jest.advanceTimersByTime(Motion.openMs));
    expect(now(0)).toEqual({ deg: 180, height: HEIGHTS[0], opacity: 1 });
    expect(StyleSheet.flatten(body(0).props.style)).toMatchObject({ overflow: 'visible' });
    // 질문마다 따로 움직인다
    expect(now(1)).toEqual({ deg: 0, height: 0, opacity: 0 });

    await press(1);
    await act(async () => jest.advanceTimersByTime(Motion.openMs + 16));
    expect(now(1)).toEqual({ deg: 180, height: HEIGHTS[1], opacity: 1 });
    expect(now(0)).toEqual({ deg: 180, height: HEIGHTS[0], opacity: 1 });

    await press(0);
    await act(async () => jest.advanceTimersByTime(16));
    const closing = now(0);
    expect(closing.deg).toBeLessThan(180);
    expect(closing.deg).toBeGreaterThan(0);
    expect(closing.height / HEIGHTS[0]).toBeCloseTo(closing.deg / 180, 5);
    expect(StyleSheet.flatten(body(0).props.style)).toMatchObject({ overflow: 'hidden' });
    await act(async () => jest.advanceTimersByTime(Motion.closeMs));
    expect(now(0)).toEqual({ deg: 0, height: 0, opacity: 0 });
    expect(now(1)).toEqual({ deg: 180, height: HEIGHTS[1], opacity: 1 });
  });

  it('꺾쇠는 그림을 바꾸지 않고 같은 그림을 돌린다(접힘 ⌄ → 펼침 ⌃)', async () => {
    await render(<FaqList items={items} />);
    const count = (d: string) => JSON.stringify(screen.toJSON()).split(d).length - 1;
    expect({ down: count('M6 9l6 6 6-6'), up: count('M6 15l6-6 6 6') }).toEqual({ down: items.length, up: 0 });
    await press();
    expect({ down: count('M6 9l6 6 6-6'), up: count('M6 15l6-6 6 6') }).toEqual({ down: items.length, up: 0 });
  });

  it('기기의 동작 줄이기가 켜져 있으면 바로 바뀐다(움직이지 않는다)', async () => {
    await renderMeasured(true);
    await press();
    await act(async () => jest.advanceTimersByTime(16));
    expect(now(0)).toEqual({ deg: 180, height: HEIGHTS[0], opacity: 1 });
    await press();
    await act(async () => jest.advanceTimersByTime(16));
    expect(now(0)).toEqual({ deg: 0, height: 0, opacity: 0 });
  });

  describe('답에 "문의하기" 가 있으면 펼친 답 아래에 문의하기로 가는 링크(결정 089, 소유자 빌드 15)', () => {
    const withInquiry: Faq[] = [
      { id: 'faq-place', question: '태어난 곳이 목록에 없어요', answer: '지금은 국내 시 · 군 · 구만 고를 수 있어요. 찾는 곳이 없거나 해외에서 태어났다면 아래 문의하기로 알려 주세요.' },
      { id: 'faq-free', question: '요금이 있나요?', answer: '지금은 모두 무료예요.' },
    ];

    it('그 답에만 링크가 있고, 누르면 새 문의로 간다', async () => {
      await render(<FaqList items={withInquiry} />);
      const [place, free] = screen.getAllByTestId('faq-answer', HIDDEN);
      expect(within(place).getByRole('link', { name: strings.faq.toInquiry, hidden: true })).toBeTruthy();
      expect(within(free).queryByRole('link', { hidden: true })).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: withInquiry[0].question }));
      await fireEvent.press(within(place).getByRole('link', { name: strings.faq.toInquiry }));
      expect(router.push).toHaveBeenCalledWith('/my/inquiries/new');
    });

    it('링크는 잰 답 칸 안에 있어 펼친 높이에 함께 들어간다', async () => {
      await render(<FaqList items={withInquiry} />);
      const measure = screen.getAllByTestId('faq-measure', HIDDEN)[0];
      expect(within(measure).getByRole('link', { name: strings.faq.toInquiry, hidden: true })).toBeTruthy();
    });
  });
});
