import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ReasonLine, ReasonLineSkeleton } from '@/features/reason/reason-line';
import type { Reason } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const R = strings.reason;
const G = strings.glossary;
const S = strings.skyMap;
const sun: Reason = { when: 'BIRTH', items: [{ kind: 'PLACEMENT', body: 'SUN', sign: 'GEMINI', house: 6 }] };
const TEXT = '태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리, 일상의 자리(6하우스)에 있었어요';

beforeEach(() => jest.clearAllMocks());
// 단언이 실패해도 가짜 시계가 다음 시험으로 넘어가지 않게
afterEach(() => jest.useRealTimers());

describe('ReasonLine: 접힌 이유 줄 → 그 자리에서 펼침(보드 12 · 12-1~12-3, 결정 054 의 4)', () => {
  it('접혀 있으면 "이렇게 풀이한 이유" 와 한 문장만 보이고, 화면 읽기는 펼칠 수 있는 단추로 읽는다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    expect(screen.getByText(R.label)).toBeTruthy();
    expect(screen.getByText(TEXT)).toBeTruthy();
    const toggle = screen.getByRole('button', { name: `${R.label}, ${TEXT}` });
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
    expect(screen.queryByText(R.seeOnMap)).toBeNull();
  });

  it('누르면 펼쳐진다: 작은 지도(그 별 · 칸만 빛남) · 용어 줄 셋 · "하늘 지도에서 보기". 다시 누르면 접힌다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    expect(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }).props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('reason-wheel')).toBeTruthy();
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(1);
    expect(screen.getAllByTestId('mini-wheel-sector')).toHaveLength(1);
    // 용어 줄: 나의 중심 · 해 / 호기심 · 쌍둥이자리 / 일상의 자리 · 6하우스 — 별명 아래 한 줄 뜻
    expect(screen.getAllByTestId('reason-term')).toHaveLength(3);
    expect(screen.getByText(G.bodies.SUN.meaning)).toBeTruthy();
    expect(screen.getByText(G.signs.GEMINI.meaning)).toBeTruthy();
    expect(screen.getByText(G.houses[6].meaning)).toBeTruthy();
    expect(screen.getByText(R.seeOnMap)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
  });

  /** 꺾쇠의 회전(도) · 칸의 높이 · 보임 — Reanimated 가 지금 그리는 값 */
  // getAnimatedStyle 의 타입은 인자가 없다고 적혀 있지만 시험에서는 그 요소를 받는다(react-native-reanimated/jestUtils)
  const animated = getAnimatedStyle as unknown as (element: unknown) => unknown;
  const now = () => {
    const turn = animated(screen.getByTestId('reason-chevron', { includeHiddenElements: true })) as { transform: { rotate: string }[] };
    const body = animated(screen.getByTestId('reason-body', { includeHiddenElements: true })) as { height: number; opacity: number };
    return { deg: parseFloat(turn.transform[0].rotate), height: body.height, opacity: body.opacity };
  };

  it('펼침 꺾쇠는 22 이고 꺾쇠 자리(뼈대)도 같은 폭(소유자 2026-11-23, 빌드 13)', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    expect(screen.getByTestId('reason-chevron-glyph', { includeHiddenElements: true }).props.width).toBe(22);
    await render(<ReasonLineSkeleton />);
    expect(StyleSheet.flatten(screen.getByTestId('reason-chevron-space').props.style)).toMatchObject({ width: 22 });
  });

  it('꺾쇠 회전 · 높이 · 보임이 진행 값 하나로 같은 길이 · 같은 곡선 — 내용은 절대 위치로 미리 재고, 앞 1/3 에서 나타난다(소유자 2026-11-21 빌드 8)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await act(async () => {});
    // 펼친 내용은 처음부터 그려져 있고(숨김), 칸의 높이와 상관없이 제 높이로 놓여 잰다
    const measure = screen.getByTestId('reason-measure', { includeHiddenElements: true });
    expect(StyleSheet.flatten(measure.props.style)).toMatchObject({ position: 'absolute' });
    await fireEvent(measure, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 240 } } });
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });

    await fireEvent.press(screen.getByRole('button', { name: /이렇게 풀이한 이유/ }));
    await act(async () => jest.advanceTimersByTime(16));
    const early = now();
    // 첫 프레임부터 셋이 같은 진행 값으로 움직인다
    expect(early.deg).toBeGreaterThan(0);
    expect(early.height / 240).toBeCloseTo(early.deg / 180, 5);
    expect(early.opacity).toBeCloseTo(Math.min(1, (early.deg / 180) * 3), 5);
    await act(async () => jest.advanceTimersByTime(Motion.openMs / 3));
    const third = now();
    expect(third.height / 240).toBeCloseTo(third.deg / 180, 5);
    expect(third.opacity).toBe(1);
    await act(async () => jest.advanceTimersByTime(Motion.openMs));
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
    // 다 펼치면 잘라내지 않는다(용어 말풍선이 칸 밖으로)
    expect(StyleSheet.flatten(screen.getByTestId('reason-body').props.style)).toMatchObject({ overflow: 'visible' });
    expect(screen.getByTestId('reason-body').props.accessibilityElementsHidden).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: /이렇게 풀이한 이유/ }));
    await act(async () => jest.advanceTimersByTime(16));
    const closing = now();
    expect(closing.deg).toBeLessThan(180);
    expect(closing.height / 240).toBeCloseTo(closing.deg / 180, 5);
    expect(StyleSheet.flatten(screen.getByTestId('reason-body', { includeHiddenElements: true }).props.style)).toMatchObject({ overflow: 'hidden' });
    await act(async () => jest.advanceTimersByTime(Motion.closeMs));
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });
    expect(screen.getByTestId('reason-body', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    jest.useRealTimers();
  });

  it('기기의 동작 줄이기가 켜져 있으면 바로 바뀐다(움직이지 않는다)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.useFakeTimers();
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await act(async () => {});
    await fireEvent(screen.getByTestId('reason-measure', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 240 } } });
    await fireEvent.press(screen.getByRole('button', { name: /이렇게 풀이한 이유/ }));
    await act(async () => jest.advanceTimersByTime(16));
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
    jest.useRealTimers();
  });

  it('물음표는 말풍선이고 한 번에 하나만 열린다(12-2 해 · 12-3 하우스 — 하늘 지도의 팁과 같은 글)', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${G.bodies.SUN.name}${S.questionSuffix}` }));
    expect(screen.getByText(G.bodies.SUN.tip)).toBeTruthy();
    expect(screen.getByText(`${G.bodies.SUN.name} (${strings.bodies.SUN})`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `6${S.houseSuffix}${S.questionSuffix}` }));
    expect(screen.queryByText(G.bodies.SUN.tip)).toBeNull();
    expect(screen.getByText(`${S.houseTipPrefix}${S.ordinals[5]}${S.houseTipSuffix}`)).toBeTruthy();
    // 다시 누르면 닫힌다
    await fireEvent.press(screen.getByRole('button', { name: strings.help.tipClose }));
    expect(screen.queryByText(`${S.houseTipPrefix}${S.ordinals[5]}${S.houseTipSuffix}`)).toBeNull();
  });

  it('"하늘 지도에서 보기" 는 그 별을 고른 채로 내 하늘 지도를 연다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    await fireEvent.press(screen.getByText(R.seeOnMap));
    expect(router.push).toHaveBeenCalledWith('/chart?selected=SUN');
  });

  it('하우스 모임은 그 칸과 별들이 빛나고, 각도는 두 별이 빛난다', async () => {
    const cluster: Reason = { when: 'BIRTH', items: [{ kind: 'CLUSTER', house: 6, bodies: ['SUN', 'VENUS', 'MARS'] }] };
    const view = await render(<ReasonLine reason={cluster} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(3);
    expect(screen.getAllByTestId('mini-wheel-sector')).toHaveLength(1);
    await view.unmount();
    const aspect: Reason = { when: 'BIRTH', items: [{ kind: 'ASPECT', a: 'URANUS', b: 'SATURN', type: 'SQUARE' }] };
    await render(<ReasonLine reason={aspect} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(2);
    expect(screen.queryAllByTestId('mini-wheel-sector')).toHaveLength(0);
    expect(screen.getByText(G.aspects.SQUARE.meaning)).toBeTruthy();
  });

  it('시각 "모름" 차트에서는 하우스 부분 · 하우스 칸이 없다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chartTimeUnknown} />);
    const text = '태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리에 있었어요';
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${text}` }));
    expect(screen.queryAllByTestId('mini-wheel-sector')).toHaveLength(0);
    expect(screen.queryAllByTestId('mini-wheel-house-line')).toHaveLength(0);
    expect(screen.getAllByTestId('reason-term')).toHaveLength(2);
    expect(screen.queryByText(G.houses[6].meaning)).toBeNull();
  });

  it('시각 "모름" 이면 문장에서 빠진 근거(상승점 · 중천 · 하우스 모임)는 용어 줄 · 작은 지도에도 없다(리뷰)', async () => {
    const mixed: Reason = {
      when: 'BIRTH',
      items: [
        { kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' },
        { kind: 'PLACEMENT', body: 'MOON', sign: 'SAGITTARIUS', house: 11 },
      ],
    };
    await render(<ReasonLine reason={mixed} chart={fixtures.chartTimeUnknown} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.queryByText(G.signs.LIBRA.meaning)).toBeNull();
    expect(screen.queryByText(G.angles.ASC.meaning)).toBeNull();
    expect(screen.getAllByTestId('reason-term')).toHaveLength(2);
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(1);
  });

  it('지나가는 별(TRANSIT)의 펼침에는 작은 지도와 하늘 지도 보기가 없다(태어난 하늘이 아니다)', async () => {
    const transit: Reason = { when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'SATURN', target: 'SUN', type: 'SQUARE' }] };
    await render(<ReasonLine reason={transit} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
    expect(screen.queryByText(R.seeOnMap)).toBeNull();
    expect(screen.getAllByTestId('reason-term')).toHaveLength(3);
  });

  it('펼친 용어 줄 · 작은 지도도 사전의 제 키로만 찾는다(리뷰 #49)', async () => {
    const odd: Reason = {
      when: 'BIRTH',
      items: [{ kind: 'CLUSTER', house: 6, bodies: ['SUN', 'toString', 'MARS'] }],
    };
    await render(<ReasonLine reason={odd} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    // 하우스 모임의 별 이름에 사전 밖의 이름은 빠지고, 작은 지도에도 그 별은 없다
    expect(screen.getByText(`${G.bodies.SUN.name}${R.separator}${G.bodies.MARS.name}`)).toBeTruthy();
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(2);
  });

  it('문장을 만들 수 없는 근거(모르는 kind)면 아무것도 그리지 않는다', async () => {
    const view = await render(<ReasonLine reason={{ when: 'BIRTH', items: [{ kind: 'MIDPOINT' }] }} chart={fixtures.chart} />);
    expect(view.toJSON()).toBeNull();
  });
});
