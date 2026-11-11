/**
 * 디자인 값의 단일 출처. 방향은 "천문도"(docs/decisions/016-design-direction-observatory.md,
 * 보드 docs/design/design-system-v2.png). 화면과 부품은 색·글자·간격을 여기서만 가져온다.
 * 디자인이 바뀌면 이 파일을 통째로 바꾼다.
 */
import type { TextStyle } from 'react-native';

/** 색. 화면은 종이·먹·금 하나, 공유 카드는 밤·밤 위의 금. */
export const Colors = {
  /** 종이 · 화면 바탕 */
  paper: '#F4F1EA',
  /** 바탕 · 화면 밖, 넓은 웹 화면의 여백 */
  canvas: '#E9E6DE',
  /** 먹 · 글씨, 굵은 선, 주 버튼 */
  ink: '#15161A',
  /** 흐린 먹 · 라벨, 보조 글씨, 근거 줄 */
  gray: '#77736A',
  /** 옅은 선 · 문단·표의 줄(종이 위 먹 15%) */
  hair: '#D6D2C8',
  /** 금 · 포인트 하나. "지금"과 "큰 변화"에만 쓴다 */
  gold: '#C8822E',
  /** 밤 · 공유 카드 바탕 */
  night: '#0F1220',
  /** 밤 위의 금 · 공유 카드의 점·선 */
  nightGold: '#E0A45A',
  /** 오류 · 삭제 */
  danger: '#B3402F',
} as const;

export type ColorName = keyof typeof Colors;

/** 시트 뒤를 가리는 막. 먹 50%. */
export const DimColor = 'rgba(21,22,26,0.5)';

/** 본문·버튼·라벨 글꼴. 굵기는 fontWeight 로 고른다(src/app/_layout.tsx 에서 적재). */
export const FontFamily = 'Pretendard';
/** 한 줄 총평·화면 제목·구간 제목 글꼴(400·700) */
export const SerifFamily = 'GowunBatang';
/** 숫자만 있는 곳(점수·도수·날짜·순위)의 글꼴(400·500). 한글이 섞이면 쓰지 않는다 */
export const MonoFamily = 'IBMPlexMono';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** 글자 단계 8개. 크기/줄높이 · 굵기. */
export const Typography = {
  /** 한 줄 총평, 홈 제목 */
  display: { fontFamily: SerifFamily, fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  /** 화면 제목, 구간 제목 */
  title: { fontFamily: SerifFamily, fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  /** 문단 제목, 버튼 */
  heading: { fontFamily: FontFamily, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  /** 해석 본문 */
  body: { fontFamily: FontFamily, fontSize: 15, lineHeight: 24, fontWeight: '400' },
  /** 표의 칸, 보조 문장(한글이 섞인 곳). 숫자 폭은 고정 */
  table: { fontFamily: FontFamily, fontSize: 13, lineHeight: 20, fontWeight: '500', fontVariant: tabular },
  /** 숫자만 있는 작은 글자(날짜, 도수, 근거 줄의 숫자) */
  mono: { fontFamily: MonoFamily, fontSize: 12, lineHeight: 18, fontWeight: '400', fontVariant: tabular },
  /** 점수, 순위 */
  number: { fontFamily: MonoFamily, fontSize: 26, lineHeight: 32, fontWeight: '500', fontVariant: tabular },
  /** 작은 라벨(한글) */
  label: { fontFamily: FontFamily, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4 },
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

/** 모서리. 버튼 4, 거의 각지게. 시트도 둥글리지 않는다. */
export const Radius = 4;

/** 선 굵기. 굵은 선(먹)과 옅은 선 모두 1px 이고 색으로 구분한다. */
export const LineWidth = 1;

/** 부품 크기 */
export const Sizes = {
  buttonHeight: 48,
  navHeight: 44,
  fieldLabelWidth: 88,
  /** 화면 머리의 차트 표식 */
  mark: 28,
  checkbox: 16,
  /** 차트 휠의 최대 지름 */
  wheel: 300,
  /** 웹 넓은 화면에서 본문이 퍼지지 않게 하는 최대 폭 */
  maxContentWidth: 480,
} as const;
