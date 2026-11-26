import { Platform } from 'react-native';

import { inputText } from '@/components/input-text';
import { Typography } from '@/constants/theme';

/**
 * 치는 칸의 글자 모양(소유자 지적: iOS 에서 숫자 · 글자가 칸의 세로 가운데가 아니다).
 * iOS TextInput 에 lineHeight 를 주면 글자가 위아래로 밀린다 — 그 단계의 lineHeight 를 치는 칸에만 뺀다(다른 글자는 그대로).
 */
describe('inputText — 치는 칸의 글자 모양', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it('iOS 한 줄: 그 단계의 크기 · 굵기는 그대로, lineHeight 는 빼고 위아래 여백 0 — 세로 가운데는 감싼 칸이 맡는다', () => {
    Platform.OS = 'ios';
    const style = inputText('input');
    expect(style.lineHeight).toBeUndefined();
    expect(style).toMatchObject({ fontSize: Typography.input.fontSize, fontWeight: Typography.input.fontWeight, fontFamily: Typography.input.fontFamily, paddingVertical: 0 });
    expect(style.textAlignVertical).toBeUndefined();
    expect(style.includeFontPadding).toBeUndefined();
  });

  it('안드로이드 한 줄: 글꼴 위아래 여백을 빼고(includeFontPadding false) 세로 가운데(textAlignVertical center)', () => {
    Platform.OS = 'android';
    expect(inputText('input')).toMatchObject({ fontSize: Typography.input.fontSize, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' });
  });

  it('여러 줄(문의 글 같은): 줄 간격(lineHeight)은 그대로 두고 위에서부터 — iOS 도 빼지 않는다', () => {
    Platform.OS = 'ios';
    expect(inputText('body', { multiline: true }).lineHeight).toBe(Typography.body.lineHeight);
    Platform.OS = 'android';
    expect(inputText('body', { multiline: true })).toMatchObject({ lineHeight: Typography.body.lineHeight, textAlignVertical: 'top', includeFontPadding: false });
  });

  it('웹은 그 단계 그대로(lineHeight 가 줄 높이라 가운데에 온다) — 플랫폼 전용 값을 붙이지 않는다', () => {
    Platform.OS = 'web';
    const style = inputText('body');
    expect(style).toMatchObject({ fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, paddingVertical: 0 });
    expect(style.includeFontPadding).toBeUndefined();
    expect(style.textAlignVertical).toBeUndefined();
  });
});
