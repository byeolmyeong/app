import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, Keyboard, LayoutAnimation, Platform, StyleSheet, Text, type KeyboardEvent } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { useKeyboardHeight } from '@/components/use-keyboard-height';

type Handler = (e: KeyboardEvent) => void;

/** 키패드 알림을 흉내 낸다. 종류마다 붙은 손잡이를 모두 부르고, 붙은 수를 센다 */
function fakeKeyboard() {
  const handlers: Record<string, Handler[]> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((type, handler) => {
    const list = (handlers[type] ??= []);
    list.push(handler as Handler);
    return {
      remove: () => {
        handlers[type] = handlers[type].filter((h) => h !== handler);
      },
    } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  const emit = (types: string[], e: KeyboardEvent) =>
    act(async () => {
      for (const type of types) for (const h of handlers[type] ?? []) h(e);
    });
  return { handlers, emit };
}

const WINDOW = Dimensions.get('window').height;
/** iOS 의 키패드 알림: 위 끝(screenY)이 창 바닥에서 height 만큼 위. 내려갈 때는 창 바닥(높이는 그대로 실려 온다) */
const iosEvent = (height: number): KeyboardEvent => ({
  duration: 250,
  easing: 'keyboard',
  startCoordinates: { screenX: 0, screenY: WINDOW, width: 390, height: 336 },
  endCoordinates: { screenX: 0, screenY: WINDOW - height, width: 390, height: height || 336 },
  isEventFromThisApp: true,
});
/** iOS 는 올라올 때 · 내려갈 때 알림 둘이 함께 온다 */
const SHOW = ['keyboardWillShow', 'keyboardWillChangeFrame'];
const HIDE = ['keyboardWillHide', 'keyboardWillChangeFrame'];

function Probe({ enabled }: { enabled?: boolean }) {
  return <Text testID="height">{String(useKeyboardHeight(enabled))}</Text>;
}
const shown = () => screen.getByTestId('height').props.children;

const os = Platform.OS;
beforeEach(() => {
  jest.restoreAllMocks();
});
afterEach(() => {
  Platform.OS = os;
});

describe('useKeyboardHeight(앱, 결정 085)', () => {
  it('iOS: 키패드가 움직이기 시작할 때 창 바닥에서 덮은 높이, 내려가면 0', async () => {
    const kb = fakeKeyboard();
    await render(<Probe />);
    expect(shown()).toBe('0');
    await kb.emit(SHOW, iosEvent(336));
    expect(shown()).toBe('336');
    // 다른 키패드로 바꿔 높이가 달라지면 따라간다
    await kb.emit(['keyboardWillChangeFrame'], iosEvent(380));
    expect(shown()).toBe('380');
    await kb.emit(HIDE, iosEvent(0));
    expect(shown()).toBe('0');
  });

  // 소유자 2026-11-27: "키패드 위로 올라오는 거 애니메이션 없애"(내려갈 때도 #154 로 없앰) — 올라올 때도 · 내려갈 때도 바로
  it('iOS: 키패드가 올라올 때도 · 높이가 바뀔 때도 · 내려갈 때도 움직임을 걸지 않고 바로 그 높이로', async () => {
    const kb = fakeKeyboard();
    const configure = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});
    await render(<Probe />);
    await kb.emit(SHOW, iosEvent(336));
    expect(shown()).toBe('336');
    await kb.emit(['keyboardWillChangeFrame'], iosEvent(380));
    await kb.emit(HIDE, iosEvent(0));
    expect(shown()).toBe('0');
    expect(configure).not.toHaveBeenCalled();
  });

  it('끄면(enabled=false) 알림을 듣지 않고 늘 0', async () => {
    const kb = fakeKeyboard();
    await render(<Probe enabled={false} />);
    expect(Keyboard.addListener).not.toHaveBeenCalled();
    await kb.emit(SHOW, iosEvent(336));
    expect(shown()).toBe('0');
  });

  it('여러 화면이 들어도 알림은 하나만 듣고, 모두 떠나면 끊는다', async () => {
    const kb = fakeKeyboard();
    const view = await render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(kb.handlers.keyboardWillChangeFrame).toHaveLength(1);
    await view.unmount();
    expect(kb.handlers.keyboardWillChangeFrame).toHaveLength(0);
  });

  it('키패드가 떠 있을 때 처음 들으면 떠 있는 높이에서 시작한다', async () => {
    fakeKeyboard();
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    jest.spyOn(Keyboard, 'metrics').mockReturnValue({ screenX: 0, screenY: WINDOW - 336, width: 390, height: 336 });
    await render(<Probe />);
    expect(shown()).toBe('336');
  });

  it('안드로이드: 다 올라온 뒤의 높이에 아래 안전 영역(시스템 막대)을 더한다 — RN 이 막대를 빼고 준다', async () => {
    Platform.OS = 'android';
    const kb = fakeKeyboard();
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 24 }}>
        <Probe />
      </SafeAreaInsetsContext.Provider>,
    );
    await kb.emit(['keyboardDidShow'], { ...iosEvent(300), endCoordinates: { screenX: 0, screenY: 0, width: 390, height: 300 } });
    expect(shown()).toBe('324');
    await kb.emit(['keyboardDidHide'], { ...iosEvent(0), endCoordinates: { screenX: 0, screenY: 0, width: 390, height: 0 } });
    expect(shown()).toBe('0');
  });
});

/** 이 요소의 아래 끝에서 화면 바닥까지: 감싼 칸들의 아래 여백(padding · margin)을 더한다 */
function spaceBelow(text: string) {
  let sum = 0;
  for (let node = screen.getByText(text).parent; node; node = node.parent) {
    const s = StyleSheet.flatten(node.props.style) ?? {};
    sum += Number(s.paddingBottom ?? s.paddingVertical ?? s.padding ?? 0) + Number(s.marginBottom ?? s.marginVertical ?? s.margin ?? 0);
  }
  return sum;
}

describe('Screen 의 avoidKeyboard(결정 085)', () => {
  it('켜면 키패드가 떠 있는 동안 아래 안전 영역 · bottomInset 대신 키패드가 덮은 높이만큼 띄우고, 내려가면 되돌린다', async () => {
    const kb = fakeKeyboard();
    await render(
      <Screen scroll={false} avoidKeyboard bottomInset={34}>
        <Text>내용</Text>
      </Screen>,
    );
    expect(spaceBelow('내용')).toBe(34);
    await kb.emit(SHOW, iosEvent(336));
    expect(spaceBelow('내용')).toBe(336);
    await kb.emit(HIDE, iosEvent(0));
    expect(spaceBelow('내용')).toBe(34);
  });

  it('켜지 않으면 키패드와 상관없다', async () => {
    const kb = fakeKeyboard();
    await render(
      <Screen scroll={false} bottomInset={34}>
        <Text>내용</Text>
      </Screen>,
    );
    await kb.emit(SHOW, iosEvent(336));
    expect(spaceBelow('내용')).toBe(34);
  });
});
