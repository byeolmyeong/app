import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

// 로그인 버튼 문구(결정 044, 보드 5 · 5-1): 영문 이름 + "로 로그인" 으로 셋 통일 — 카카오 · 구글은 공급자 가이드 문구와 다르다
describe('로그인 버튼 문구', () => {
  it('셋 다 "○○로 로그인"', () => {
    expect([strings.login.kakao, strings.login.apple, strings.login.google]).toEqual(['Kakao로 로그인', 'Apple로 로그인', 'Google로 로그인']);
  });
});

// 공급자 버튼 한 모양(결정 042): 높이 48 · 모서리 12 · 로고 20×20 은 왼쪽 16 · 문구는 가운데 16px(애플만 HIG 43% 에서 벗어남)
describe('공급자 버튼', () => {
  const cases = [
    { provider: 'KAKAO', label: 'Kakao로 로그인', background: '#FEE500', text: 'rgba(0,0,0,0.85)', border: 0 },
    { provider: 'APPLE', label: 'Apple로 로그인', background: '#FFFFFF', text: '#000000', border: 0 },
    { provider: 'GOOGLE', label: 'Google로 로그인', background: '#131314', text: '#E3E3E3', border: 1 },
  ] as const;

  it.each(cases)('$provider: 공급자 가이드의 바탕 · 문구 · 글자색, 로고는 바깥 왼쪽 16 에 20×20', async (c) => {
    await render(<SocialButton provider={c.provider} label={c.label} onPress={jest.fn()} />);
    const box = flat(`social-button-${c.provider}`);
    expect(box).toMatchObject({ height: 48, borderRadius: 12, backgroundColor: c.background });
    expect(box.borderWidth ?? 0).toBe(c.border);
    if (c.provider === 'GOOGLE') expect(box.borderColor).toBe('#8E918F');

    const logo = flat(`social-logo-${c.provider}`);
    expect(logo).toMatchObject({ position: 'absolute', width: 20, height: 20 });
    // 테두리 안쪽에서 잰 left 에 테두리 굵기를 더한 것이 바깥 기준 16 이다(구글은 테두리 1)
    expect(Number(logo.left) + c.border).toBe(16);

    const label = screen.getByText(c.label);
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontSize: 16, fontWeight: '500', color: c.text });
  });

  it('문구는 로고와 상관없이 버튼 전체 폭의 가운데에 놓인다', async () => {
    await render(<SocialButton provider="KAKAO" label="Kakao로 로그인" onPress={jest.fn()} />);
    expect(flat('social-button-KAKAO')).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
  });

  it('누르면 onPress, 막혀 있으면 부르지 않는다', async () => {
    const onPress = jest.fn();
    await render(<SocialButton provider="APPLE" label="Apple로 로그인" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Apple로 로그인'));
    expect(onPress).toHaveBeenCalledTimes(1);

    onPress.mockClear();
    await render(<SocialButton provider="APPLE" label="Apple로 로그인" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Apple로 로그인'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

// 최근 로그인 배지(결정 044, 보드 5-2): 위 −10 · 오른쪽 12, 안쪽 3/9, 모서리 999, 주색 바탕, 바깥 2px 바탕색 고리, 글자 11/15 · 600
describe('최근 로그인 배지', () => {
  it('recent 면 버튼 오른쪽 위에 배지를 얹고 화면 읽기 이름에 "최근 로그인" 을 덧붙인다', async () => {
    await render(<SocialButton provider="KAKAO" label="Kakao로 로그인" onPress={jest.fn()} recent />);
    const badge = flat('recent-badge');
    expect(badge).toMatchObject({
      position: 'absolute',
      top: -10,
      right: 12,
      paddingVertical: 3,
      paddingHorizontal: 9,
      borderRadius: 999,
      backgroundColor: '#4752FF',
      boxShadow: '0 0 0 2px #0D0E12',
    });
    const text = screen.getByText(strings.login.recent);
    expect(strings.login.recent).toBe('최근 로그인');
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontSize: 11, lineHeight: 15, fontWeight: '600', color: '#F2F3F7' });
    expect(screen.getByRole('button').props.accessibilityLabel).toBe(`Kakao로 로그인, ${strings.login.recent}`);
  });

  it('recent 가 아니면 배지가 없고 화면 읽기 이름은 문구 그대로', async () => {
    await render(<SocialButton provider="GOOGLE" label="Google로 로그인" onPress={jest.fn()} />);
    expect(screen.queryByTestId('recent-badge')).toBeNull();
    expect(screen.queryByText(strings.login.recent)).toBeNull();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Google로 로그인');
  });
});

// 로그인을 기다리는 동안(결정 067 의 2): 누른 버튼은 문구 자리에 작은 돌기, 나머지는 흐리게 · 누를 수 없게
describe('공급자 버튼: 기다리는 중', () => {
  it('loading 이면 문구 대신 공급자 글자색의 돌기를 두고, 흐리지 않되 누를 수 없다', async () => {
    const onPress = jest.fn();
    await render(<SocialButton provider="GOOGLE" label="Google로 로그인" onPress={onPress} loading />);
    const spinner = screen.getByTestId('social-spinner-GOOGLE');
    expect(spinner.props.color).toBe('#E3E3E3');
    expect(screen.queryByText('Google로 로그인')).toBeNull();
    expect(flat('social-button-GOOGLE').opacity).toBeUndefined();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Google로 로그인');
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('막혀 있으면(다른 버튼이 기다리는 중) 흐리고 돌기는 없다', async () => {
    await render(<SocialButton provider="KAKAO" label="Kakao로 로그인" onPress={jest.fn()} disabled />);
    expect(flat('social-button-KAKAO').opacity).toBe(0.4);
    expect(screen.queryByTestId('social-spinner-KAKAO')).toBeNull();
    expect(screen.getByText('Kakao로 로그인')).toBeTruthy();
  });
});

// 웹 커서(소유자: 버튼 위 손가락, 글자 위 I 커서 없음): 버튼 전체가 누름 대상이고 글자는 고를 수 없다
describe('공급자 버튼: 커서 · 글자 선택', () => {
  it('버튼은 손가락 커서 · 글자 선택 없음, 글자는 선택 없음 · 누름을 버튼에 넘긴다', async () => {
    await render(<SocialButton provider="KAKAO" label="Kakao로 로그인" onPress={jest.fn()} />);
    expect(flat('social-button-KAKAO')).toMatchObject({ cursor: 'pointer', userSelect: 'none' });
    expect(StyleSheet.flatten(screen.getByText('Kakao로 로그인').props.style)).toMatchObject({ userSelect: 'none', pointerEvents: 'none' });
  });

  it('누를 수 없으면(흐림 · 기다리는 중) 손가락이 아니다', async () => {
    await render(<SocialButton provider="APPLE" label="Apple로 로그인" onPress={jest.fn()} disabled />);
    expect(flat('social-button-APPLE').cursor).toBe('default');
  });
});
