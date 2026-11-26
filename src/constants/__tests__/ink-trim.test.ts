import { inkTrim, Typography } from '@/constants/theme';

// Pretendard 의 기본 줄높이 비율(hhea (1950 + 494) / 2048, assets/fonts 의 OTF)
const NATURAL = (1950 + 494) / 2048;

describe('inkTrim — 줄 상자 끝에서 보이는 한글 글자까지의 여백(결정 080 덧붙임)', () => {
  it('웹: 줄높이 여백을 위아래 반씩 + 글자 안쪽 여백(지금 값 그대로)', () => {
    expect(inkTrim(Typography.section, 'top', 'web')).toBeCloseTo((28 - 20) / 2 + 20 * 0.05, 5);
    expect(inkTrim(Typography.caption, 'bottom', 'web')).toBeCloseTo((18 - 13) / 2 + 13 * 0.07, 5);
  });

  it('iOS(임시 보정): 남는 행간이 글자 위에 다 붙어 글자가 (줄높이 − 기본 줄높이) / 2 만큼 아래에 있다 — 위는 그만큼 더, 아래는 그만큼 덜', () => {
    const shift = (t: { fontSize: number; lineHeight: number }) => (t.lineHeight - t.fontSize * NATURAL) / 2;
    expect(inkTrim(Typography.section, 'top', 'ios')).toBeCloseTo(inkTrim(Typography.section, 'top', 'web') + shift(Typography.section), 5);
    expect(inkTrim(Typography.caption, 'bottom', 'ios')).toBeCloseTo(inkTrim(Typography.caption, 'bottom', 'web') - shift(Typography.caption), 5);
    // 닉네임(20/28) 2.07 위로 · 별자리 줄(13/18) 1.24 위로
    expect(shift(Typography.section)).toBeCloseTo(2.07, 2);
    expect(shift(Typography.caption)).toBeCloseTo(1.24, 2);
  });

  it('안드로이드는 웹과 같다(행간을 위아래 반씩)', () => {
    expect(inkTrim(Typography.section, 'top', 'android')).toBeCloseTo(inkTrim(Typography.section, 'top', 'web'), 5);
  });
});
