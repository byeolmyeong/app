import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Toast, useToast, type ToastAnchor } from '@/components/toast';

const OK = '닉네임을 바꿨어요';
const FAIL = '바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';

/** 짧은 알림을 쓰는 화면: 입력칸 하나 · 알림을 띄우는 단추 둘 · 아래 탭(또는 주 버튼) 자리와 그 위의 알림 */
function Harness({ above = 'tabs' }: { above?: ToastAnchor }) {
  const { toast, show, hide } = useToast();
  const [name, setName] = useState('');
  return (
    <View>
      <TextInput testID="name" value={name} onChangeText={setName} />
      <Pressable onPress={() => show('success', OK)}>
        <Text>성공</Text>
      </Pressable>
      <Pressable onPress={() => show('error', FAIL)}>
        <Text>실패</Text>
      </Pressable>
      <View>
        <Toast toast={toast} onClose={hide} above={above} />
        <Text>아래 탭</Text>
      </View>
    </View>
  );
}

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

// 짧은 알림(보드 23 · 23-1, 결정 065)
describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('성공은 체크와 글을 보이고 2초 뒤 사라진다', async () => {
    await render(<Harness />);
    expect(screen.queryByTestId('toast')).toBeNull();
    await fireEvent.press(screen.getByText('성공'));
    expect(screen.getByText(OK)).toBeTruthy();
    expect(screen.getByTestId('toast-icon-success', { includeHiddenElements: true })).toBeTruthy();
    await advance(1999);
    expect(screen.getByText(OK)).toBeTruthy();
    await advance(1);
    expect(screen.queryByText(OK)).toBeNull();
  });

  it('실패는 동그라미 느낌표와 글을 보이고 4초 뒤 사라진다', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText('실패'));
    expect(screen.getByText(FAIL)).toBeTruthy();
    expect(screen.getByTestId('toast-icon-error', { includeHiddenElements: true })).toBeTruthy();
    await advance(3999);
    expect(screen.getByText(FAIL)).toBeTruthy();
    await advance(1);
    expect(screen.queryByText(FAIL)).toBeNull();
  });

  it('누르면 바로 닫힌다', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText('실패'));
    await fireEvent.press(screen.getByTestId('toast'));
    expect(screen.queryByText(FAIL)).toBeNull();
  });

  it('한 번에 하나 — 새 알림이 오면 바꾸고, 사라지는 때도 새 알림을 따른다', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText('성공'));
    await advance(1500);
    await fireEvent.press(screen.getByText('실패'));
    expect(screen.queryByText(OK)).toBeNull();
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    // 성공의 2초가 지나도 실패는 남는다(새 알림부터 4초)
    await advance(3999);
    expect(screen.getByText(FAIL)).toBeTruthy();
    await advance(1);
    expect(screen.queryByText(FAIL)).toBeNull();
  });

  it('화면 읽기에 알린다 — 성공은 status · polite, 실패는 alert · assertive, iOS 는 읽어 준다', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(<Harness />);
    await fireEvent.press(screen.getByText('성공'));
    expect(screen.getByTestId('toast').props).toMatchObject({ role: 'status', accessibilityLiveRegion: 'polite' });
    expect(announce).toHaveBeenLastCalledWith(OK);
    await fireEvent.press(screen.getByText('실패'));
    expect(screen.getByTestId('toast').props).toMatchObject({ role: 'alert', accessibilityLiveRegion: 'assertive' });
    expect(announce).toHaveBeenLastCalledWith(FAIL);
    announce.mockRestore();
  });

  it('실패해도 화면의 입력은 그대로다(부품은 입력을 건드리지 않는다)', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByTestId('name'), '새벽별');
    await fireEvent.press(screen.getByText('실패'));
    expect(screen.getByTestId('name').props.value).toBe('새벽별');
    await advance(4000);
    expect(screen.getByTestId('name').props.value).toBe('새벽별');
  });

  it('자리: 감싼 것(아래 탭 · 주 버튼) 바로 위 12 — 탭 위면 화면 좌우 20, 주 버튼 위면 버튼 폭 그대로', async () => {
    const view = await render(<Harness />);
    await fireEvent.press(screen.getByText('성공'));
    expect(StyleSheet.flatten(screen.getByTestId('toast').props.style)).toMatchObject({
      position: 'absolute',
      bottom: '100%',
      marginBottom: 12,
      left: 20,
      right: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
    });
    await view.rerender(<Harness above="button" />);
    expect(StyleSheet.flatten(screen.getByTestId('toast').props.style)).toMatchObject({ left: 0, right: 0 });
  });
});
