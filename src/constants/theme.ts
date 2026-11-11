/**
 * 디자인 값의 단일 출처. 둥근 중립 디자인 시스템(docs/decisions/018-design-system-from-didit.md):
 * 흰 바탕, 중립 회색, Pretendard, 주색은 초록 하나. 화면과 부품은 색·글자·간격을 여기서만 가져온다.
 * 디자인이 바뀌면 이 파일을 통째로 바꾼다.
 */
import type { TextStyle } from 'react-native';

/** 색. 화면은 흰 바탕·중립 회색·초록 하나, 공유 카드는 밤·밤 위의 금. */
export const Colors = {
  /** 화면·시트·칩의 바탕 */
  paper: '#FFFFFF',
  /** 화면 밖, 넓은 웹 화면의 여백 */
  canvas: '#FFFFFF',
  /** 본문 글씨 */
  ink: '#191919',
  /** 보조 글씨 */
  gray: '#6A6A6A',
  /** 도움말, 입력 전 안내 글씨 */
  hint: '#989898',
  /** 고르지 않은 것, 비활성 아이콘·글씨 */
  muted: '#C6C6C6',
  /** 테두리, 구분선, 비활성 버튼 바탕 */
  hair: '#E6E6E6',
  /** 입력칸 바탕 */
  fill: '#F6F6F6',
  /** 주색(초록) 하나. 주 버튼, 고른 것, 포커스 테두리, "지금" */
  primary: '#3DDB99',
  /** 고른 칩의 옅은 초록 바탕 */
  primaryLight: '#ECFBF5',
  /** 밤 · 공유 카드 바탕 */
  night: '#0F1220',
  /** 밤 위의 금 · 공유 카드의 점·선 */
  nightGold: '#E0A45A',
  /** 오류 · 삭제 */
  danger: '#F73838',
} as const;

export type ColorName = keyof typeof Colors;

/** 시트 뒤를 가리는 막. 검정 40%. */
export const DimColor = 'rgba(0,0,0,0.4)';

/** 글꼴은 Pretendard 하나. 굵기는 fontWeight 로 고른다(src/app/_layout.tsx 에서 적재). */
export const FontFamily = 'Pretendard';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** 글자 사이는 모든 단계에서 글자 크기의 -2% */
const type = (fontSize: number, lineHeight: number, fontWeight: TextStyle['fontWeight']) =>
  ({ fontFamily: FontFamily, fontSize, lineHeight, fontWeight, letterSpacing: fontSize * -0.02 }) as const;

/** 글자 단계. 크기/줄높이 · 굵기. */
export const Typography = {
  /** 홈 제목, 한 줄 총평 */
  display: type(28, 39, '700'),
  /** 화면 제목, 구간 제목 */
  title: type(24, 34, '700'),
  /** 시트 제목, 문단 제목 */
  heading: type(18, 25, '600'),
  /** 버튼 글씨 */
  button: type(16, 24, '600'),
  /** 본문, 입력칸의 값 */
  body: type(15, 23, '400'),
  /** 표의 칸, 보조 문장, 입력칸 라벨. 숫자 폭은 고정 */
  table: { ...type(14, 20, '500'), fontVariant: tabular },
  /** 도움말, 오류, 작은 라벨 */
  label: type(12, 16, '500'),
  /** 숫자만 있는 작은 글자(날짜, 도수) */
  mono: { ...type(12, 16, '500'), fontVariant: tabular },
  /** 점수, 순위 */
  number: { ...type(24, 34, '600'), fontVariant: tabular },
  /** 드럼롤 선택의 한 줄 */
  picker: { ...type(20, 30, '600'), fontVariant: tabular },
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
export const ScreenPaddingX = 20;

/** 모서리. 버튼·입력칸·칩 12. */
export const Radius = 12;
/** 카드(홈의 카테고리 칸)의 모서리 */
export const CardRadius = 16;
/** 하단 시트의 위쪽 모서리 */
export const SheetRadius = 24;

/** 선 굵기 */
export const LineWidth = 1;

/** 부품 크기 */
export const Sizes = {
  buttonHeight: 56,
  inputHeight: 56,
  navHeight: 48,
  /** 화면 머리의 차트 표식 */
  mark: 28,
  /** 화면 머리 양옆 칸의 너비 */
  navSide: 48,
  checkbox: 24,
  /** 차트 휠의 최대 지름 */
  wheel: 300,
  /** 웹 넓은 화면에서 가운데에 보이는 앱 화면의 폭 */
  maxContentWidth: 390,
  /** 홈 카테고리 타일의 아이콘 · 아이콘을 담는 둥근 바탕 */
  categoryIcon: 24,
  categoryIconBox: 44,
  /** 목록 한 줄의 높이 */
  listRow: 48,
  /** 태어난 곳 고르기: 왼쪽 시·도 칸의 너비 */
  regionPaneWidth: 112,
  /** 설명(물음표) 버튼의 지름 · 설명 시트에서 글이 굴러가는 영역의 최대 높이 */
  infoButton: 20,
  infoSheetHeight: 360,
  /** 시트 위의 손잡이 줄 */
  handleWidth: 50,
  handleHeight: 4,
  /** 드럼롤 선택: 한 줄 높이 · 보이는 줄 수 · 한 열의 너비 */
  pickerRow: 36,
  pickerRows: 5,
  pickerWidth: 72,
} as const;
