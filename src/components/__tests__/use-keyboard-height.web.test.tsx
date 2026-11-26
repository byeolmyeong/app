import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useKeyboardHeight } from '@/components/use-keyboard-height.web';

/** 휴대폰 브라우저의 보이는 칸(visualViewport). 키패드가 뜨면 높이만 줄고 문서의 창(clientHeight)은 그대로다 */
type FakeViewport = { height: number; pageTop: number; scale: number; listeners: Record<string, (() => void)[]> };
const g = globalThis as unknown as { visualViewport?: unknown; document?: unknown };
const CLIENT = 844;

function fakeViewport(): FakeViewport & { change: (next: Partial<FakeViewport>) => Promise<void> } {
  const vv: FakeViewport = { height: CLIENT, pageTop: 0, scale: 1, listeners: {} };
  g.document = { documentElement: { clientHeight: CLIENT } };
  g.visualViewport = {
    get height() {
      return vv.height;
    },
    get pageTop() {
      return vv.pageTop;
    },
    get scale() {
      return vv.scale;
    },
    addEventListener: (type: string, fn: () => void) => (vv.listeners[type] ??= []).push(fn),
    removeEventListener: (type: string, fn: () => void) => {
      vv.listeners[type] = (vv.listeners[type] ?? []).filter((f) => f !== fn);
    },
  };
  return {
    ...vv,
    get listeners() {
      return vv.listeners;
    },
    change: (next) =>
      act(async () => {
        Object.assign(vv, next);
        for (const fn of vv.listeners.resize ?? []) fn();
      }),
  };
}

function Probe() {
  return <Text testID="height">{String(useKeyboardHeight())}</Text>;
}
const shown = () => screen.getByTestId('height').props.children;

afterEach(() => {
  delete g.visualViewport;
  delete g.document;
});

describe('useKeyboardHeight(웹, 결정 085)', () => {
  it('보이는 칸이 줄면 문서의 창 바닥에서 가려진 높이, 다시 늘면 0', async () => {
    const vv = fakeViewport();
    await render(<Probe />);
    expect(shown()).toBe('0');
    await vv.change({ height: CLIENT - 336 });
    expect(shown()).toBe('336');
    await vv.change({ height: CLIENT });
    expect(shown()).toBe('0');
  });

  it('브라우저가 입력 칸을 보이려고 보이는 칸을 내렸으면(pageTop) 그만큼 덜 가려진다', async () => {
    const vv = fakeViewport();
    await render(<Probe />);
    await vv.change({ height: CLIENT - 336, pageTop: 100 });
    expect(shown()).toBe('236');
  });

  it('손가락으로 확대한 동안(scale ≠ 1)은 키패드가 아니라 0', async () => {
    const vv = fakeViewport();
    await render(<Probe />);
    await vv.change({ height: CLIENT / 2, scale: 2 });
    expect(shown()).toBe('0');
  });

  it('주소 줄이 접혀 보이는 칸이 문서의 창보다 커도 0', async () => {
    const vv = fakeViewport();
    await render(<Probe />);
    await vv.change({ height: CLIENT + 60 });
    expect(shown()).toBe('0');
  });

  it('보이는 칸을 모르는 브라우저(서버 그리기 포함)는 0', async () => {
    await render(<Probe />);
    expect(shown()).toBe('0');
  });

  it('화면이 떠나면 듣기를 그친다', async () => {
    const vv = fakeViewport();
    const view = await render(<Probe />);
    expect(vv.listeners.resize).toHaveLength(1);
    expect(vv.listeners.scroll).toHaveLength(1);
    await view.unmount();
    expect(vv.listeners.resize).toHaveLength(0);
    expect(vv.listeners.scroll).toHaveLength(0);
  });
});
