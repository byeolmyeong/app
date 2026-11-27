import { inkTrim, Typography } from '@/constants/theme';

describe('inkTrim — 줄 상자 끝에서 보이는 한글 글자까지의 여백(결정 080 덧붙임)', () => {
  it('웹: 줄높이 여백을 위아래 반씩 + 글자 안쪽 여백(지금 값 그대로)', () => {
    expect(inkTrim(Typography.section, 'top', 'web')).toBeCloseTo((28 - 20) / 2 + 20 * 0.05, 5);
    expect(inkTrim(Typography.caption, 'bottom', 'web')).toBeCloseTo((18 - 13) / 2 + 13 * 0.07, 5);
  });

  // 2026-11-27 빌드 23 실기기(아이폰, 3배 캡처) 실측: 그림 위 447 · 아래 638px, 별자리 줄 글자 아래 633px(1.7pt 위로 뜸),
  // "monkey" 위 448px — 한글은 라틴보다 2pt 높아(웹 실측) 한글 닉네임은 1.7pt 위로 튀어나온다. 임시 보정 없이 웹 식이면 위아래 0.4pt 안(소유자 "1번해줘")
  it('iOS 도 웹과 같은 식 — 실기기에서 행간을 위아래 반씩 그린다(빌드 23 임시 보정을 거둔다)', () => {
    expect(inkTrim(Typography.section, 'top', 'ios')).toBeCloseTo(inkTrim(Typography.section, 'top', 'web'), 5);
    expect(inkTrim(Typography.caption, 'bottom', 'ios')).toBeCloseTo(inkTrim(Typography.caption, 'bottom', 'web'), 5);
  });

  it('안드로이드는 웹과 같다(행간을 위아래 반씩)', () => {
    expect(inkTrim(Typography.section, 'top', 'android')).toBeCloseTo(inkTrim(Typography.section, 'top', 'web'), 5);
  });
});
