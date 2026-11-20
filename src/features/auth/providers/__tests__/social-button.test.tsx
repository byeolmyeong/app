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
