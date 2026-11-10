/**
 * 디자인 값의 단일 출처. 시안 docs/design/screens-1.0.0.html "기준" 을 옮겼다.
 * 화면과 부품은 색·글자·간격을 여기서만 가져온다. 디자인이 바뀌면 이 파일을 통째로 바꾼다.
 */
import type { TextStyle } from 'react-native';

/** 색 5개 */
export const Colors = {
  /** 종이 · 바탕 */
  paper: '#FBFAF6',
  /** 먹 · 글씨, 선, 주 버튼 */
  ink: '#121212',
  /** 회색 · 라벨, 보조 글씨 */
  gray: '#85847E',
  /** 옅은 선 · 표의 줄 */
  hair: '#D8D6CE',
  /** 인주 · 도장, 강조 한 곳, 삭제 */
  seal: '#C9342B',
} as const;

export type ColorName = keyof typeof Colors;

/** 시트 뒤를 가리는 막. 먹 50%. */
export const DimColor = 'rgba(18,18,18,0.5)';

/** 글꼴은 Pretendard 하나. 굵기는 fontWeight 로 고른다(src/app/_layout.tsx 에서 적재). */
export const FontFamily = 'Pretendard';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** 글자 단계 6개. 크기/줄높이 · 굵기. 자간은 시안의 em 값을 px 로 바꿨다. */
export const Typography = {
  display: { fontFamily: FontFamily, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -1.12 },
  title: { fontFamily: FontFamily, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontFamily: FontFamily, fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.32 },
  body: { fontFamily: FontFamily, fontSize: 16, lineHeight: 28, fontWeight: '400' },
  table: { fontFamily: FontFamily, fontSize: 14, lineHeight: 20, fontWeight: '500', fontVariant: tabular },
  label: { fontFamily: FontFamily, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.66 },
} as const satisfies Record<string, TextStyle>;

export type TypographyName = keyof typeof Typography;

/** 간격 4 · 8 · 12 · 16 · 24 · 32 · 48 */
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 화면 좌우 여백 */
export const ScreenPaddingX = Spacing.lg;

/** 모서리. 시트도 둥글리지 않는다. */
export const Radius = 2;

/** 선 굵기. 굵은 선(먹)과 옅은 선 모두 1px 이고 색으로 구분한다. */
export const LineWidth = 1;

/** 부품 크기 */
export const Sizes = {
  buttonHeight: 52,
  navHeight: 44,
  fieldLabelWidth: 88,
  seal: 48,
  sealSmall: 36,
  checkbox: 16,
  /** 웹 넓은 화면에서 본문이 퍼지지 않게 하는 최대 폭 */
  maxContentWidth: 480,
} as const;
