import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { RevealView } from '@/features/reading/reveal-view';

const R = strings.reveal;
const headline = '자유로운 상상력과 단단한 책임감을 함께 지닌, 따뜻하고 독창적인 사람';
const three = [
  { label: '나의 중심', value: '물병자리' },
  { label: '나의 마음', value: '염소자리' },
  { label: '나의 첫인상', value: '천칭자리' },
];
const flat = (node: { props: Record<string, any> }) => StyleSheet.flatten(node.props.style);
const hidden = { includeHiddenElements: true };

afterEach(() => {
  jest.restoreAllMocks();
});

async function show(signs = three, onRead = jest.fn()) {
  await render(<RevealView nickname="새벽별" headline={headline} signs={signs} onRead={onRead} />);
  await act(async () => {});
  return onRead;
}

// 별명 공개(결정 044, 보드 10): 별이 · "○○ 님의 별명은" · 별명 한 줄 · 세 칸 · 풀이 읽기
describe('RevealView', () => {
  it('"○○ 님의 별명은"(15/22 · 500 회색) · 별명(26/36 · 600 가운데, 제목) · 풀이 읽기(56 · 주색)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onRead = await show();
    expect(`새벽별 ${R.nicknameSuffix}`).toBe('새벽별 님의 별명은');
    expect(flat(screen.getByText('새벽별 님의 별명은'))).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: '500', color: '#A9ABB7' });
    expect(flat(screen.getByRole('header', { name: headline }))).toMatchObject({ fontSize: 26, lineHeight: 36, fontWeight: '600', textAlign: 'center' });
    const read = screen.getByRole('button', { name: R.read });
    expect(R.read).toBe('풀이 읽기');
    expect(flat(read)).toMatchObject({ height: 56, backgroundColor: '#4752FF' });
    await fireEvent.press(read);
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('세 칸: 이름 12/17 안내색 · 값 16/24 · 600, 칸 폭 104 · 사이 12, 가운데', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await show();
    const cells = screen.getAllByTestId('reveal-cell');
    expect(cells).toHaveLength(3);
    expect(flat(cells[0])).toMatchObject({ width: 104 });
    expect(flat(screen.getByTestId('reveal-cells'))).toMatchObject({ flexDirection: 'row', justifyContent: 'center', gap: 12 });
    expect(flat(screen.getByText('나의 첫인상'))).toMatchObject({ fontSize: 12, lineHeight: 17, fontWeight: '400', color: '#7C7E8A' });
    expect(flat(screen.getByText('천칭자리'))).toMatchObject({ fontSize: 16, lineHeight: 24, fontWeight: '600' });
  });

  it('시각 "모름" 처럼 둘만 오면 두 칸만 가운데에(첫인상 없음)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await show(three.slice(0, 2));
    expect(screen.getAllByTestId('reveal-cell')).toHaveLength(2);
    expect(screen.queryByText('나의 첫인상')).toBeNull();
  });

  it('움직임: 그림이 아래에서 떠오르고(0.9초, 150 아래 · 1.15배에서) 글 · 별명 · 칸 · 버튼이 0.7 · 1.0 · 1.4 · 1.7초에 0.6초씩 떠오른다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    const loop = jest.spyOn(Animated, 'loop');
    await show();
    const configs = timing.mock.calls.map(([, config]) => config as Animated.TimingAnimationConfig);
    expect(configs.filter((c) => c.duration === 900)).toHaveLength(1);
    expect(configs.filter((c) => c.duration === 600).map((c) => c.delay)).toEqual([700, 1000, 1400, 1700]);
    // 별이 둥실 · 뒤 빛 · 반짝임 넷은 끝없이 돈다
    expect(loop.mock.calls.length).toBeGreaterThanOrEqual(6);
    // jest 에서는 움직임이 바로 끝난다 — 마지막 장면: 다 보이고 제자리
    expect(flat(screen.getByTestId('reveal-art', hidden))).toMatchObject({ transform: [{ translateY: 0 }, { scale: 1 }] });
    expect(flat(screen.getByTestId('reveal-up-3'))).toMatchObject({ opacity: 1 });
  });

  it('동작 줄이기면 움직이지 않고 멈춘 마지막 장면 — 다 보이고 뒤 빛 · 반짝임은 투명도 1', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    const loop = jest.spyOn(Animated, 'loop');
    await show();
    expect(timing).not.toHaveBeenCalled();
    expect(loop).not.toHaveBeenCalled();
    expect(flat(screen.getByTestId('reveal-art', hidden))).toMatchObject({ transform: [{ translateY: 0 }, { scale: 1 }] });
    for (const i of [0, 1, 2, 3]) expect(flat(screen.getByTestId(`reveal-up-${i}`))).toMatchObject({ opacity: 1 });
    for (const id of ['reveal-glow', 'reveal-twinkle-0', 'reveal-twinkle-1', 'reveal-twinkle-2', 'reveal-twinkle-3'])
      expect(flat(screen.getByTestId(id, hidden)).opacity).toBe(1);
  });
});
