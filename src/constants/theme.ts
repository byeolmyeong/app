/**
 * 디자인 값의 단일 출처. 별명 브랜딩(docs/decisions/033-brand-dark-design-system.md):
 * 어두운 바탕, 밝은 글씨, Pretendard, 주색은 푸른 보라 하나. 화면과 부품은 색·글자·간격을 여기서만 가져온다.
 * 부품 모양(크기·모서리)은 결정 018 그대로이고, 웹 넓은 화면의 앱 폭만 480 이다(결정 033). 디자인이 바뀌면 이 파일을 통째로 바꾼다.
 */
import { Platform, type TextStyle } from 'react-native';

const paper = '#0D0E12';

/** 색. 면 세 단(바탕·떠 있는 면·채운 면), 글씨 네 단(본문·보조·안내·비활성), 푸른 보라 하나. 대비는 바탕 위 기준. */
export const Colors = {
  /** 화면·칩·공유 카드의 바탕 */
  paper,
  /** 바탕 위에 떠 있는 면: 하단 시트 */
  raised: '#16171D',
  /**
   * 앱 화면 폭(Sizes.maxContentWidth) 밖의 여백. 웹 넓은 화면은 바탕보다 한 단 어두운 밤색이고(2026-11-18 소유자),
   * 앱(태블릿·폴드 안쪽 화면)은 바탕과 같은 색이다.
   */
  canvas: Platform.OS === 'web' ? '#08090B' : paper,
  /** 본문 글씨, 주색·빨강 위의 글씨. 대비 17.4 */
  ink: '#F2F3F7',
  /** 보조 글씨. 대비 8.5 */
  gray: '#A9ABB7',
  /** 도움말, 입력 전 안내 글씨. 대비 4.8 */
  hint: '#7C7E8A',
  /** 고르지 않은 것, 비활성 아이콘·글씨, 시트 손잡이. 대비 2.4(일부러 흐리게) */
  muted: '#4D4F5A',
  /** 테두리, 구분선, 비활성 버튼 바탕 */
  hair: '#2A2B33',
  /** 입력칸·보조 버튼·카드의 바탕 */
  fill: '#1C1D24',
  /** 주색(푸른 보라) 하나. 주 버튼, 고른 것, 포커스 테두리, "지금". 대비 3.6, 그 위 ink 4.8 */
  primary: '#4752FF',
  /** 고른 칩의 옅은 푸른 보라 바탕 */
  primarySoft: '#1D2050',
  /** 오류 · 삭제. 대비 4.9, 그 위 ink 3.5 */
  danger: '#E5484D',
} as const;

export type ColorName = keyof typeof Colors;

/** 시트 뒤를 가리는 막. 검정 60%(어두운 바탕에서는 40% 로는 어두워진 게 보이지 않는다). */
export const DimColor = 'rgba(0,0,0,0.6)';

/** 글꼴은 Pretendard 하나(src/app/_layout.tsx 에서 적재). */
export const FontFamily = 'Pretendard';

/**
 * 굵기는 세 가지만(결정 033). 어두운 바탕의 밝은 글씨는 번져 보여 700 이상은 쓰지 않고, 그 글꼴 파일도 싣지 않는다.
 * 글자 단계에 없는 굵기가 필요한 곳(고른 탭·칩의 글씨 등)도 여기서 가져온다.
 */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const satisfies Record<string, TextStyle['fontWeight']>;

type Weight = (typeof FontWeight)[keyof typeof FontWeight];

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** 자간은 크기에 따라: 20 이상 -2%, 15~18 -1%, 14 이하 0. 작은 글씨까지 좁히면 어두운 바탕에서 뭉쳐 보인다. */
const tracking = (fontSize: number) => (fontSize >= 20 ? fontSize * -0.02 : fontSize >= 15 ? fontSize * -0.01 : 0);

const type = (fontSize: number, lineHeight: number, fontWeight: Weight) =>
  ({ fontFamily: FontFamily, fontSize, lineHeight, fontWeight, letterSpacing: tracking(fontSize) }) as const;

/** 글자 단계. 크기/줄높이 · 굵기. */
export const Typography = {
  /** 홈 제목, 한 줄 총평. 로고처럼 크고 가볍게 */
  display: type(28, 38, FontWeight.medium),
  /** 화면 제목, 구간 제목 */
  title: type(24, 34, FontWeight.semibold),
  /** 시트 제목, 문단 제목 */
  heading: type(18, 26, FontWeight.semibold),
  /** 버튼 글씨 */
  button: type(16, 24, FontWeight.semibold),
  /** 본문, 입력칸의 값. 긴 글을 어두운 바탕에서 읽으니 줄 간격 1.6 */
  body: type(15, 24, FontWeight.regular),
  /** 표의 칸, 보조 문장, 입력칸 라벨. 숫자 폭은 고정 */
  table: { ...type(14, 20, FontWeight.medium), fontVariant: tabular },
  /** 도움말, 오류, 작은 라벨 */
  label: type(12, 17, FontWeight.medium),
  /** 숫자만 있는 작은 글자(날짜, 도수) */
  mono: { ...type(12, 17, FontWeight.medium), fontVariant: tabular },
  /** 점수, 순위 */
  number: { ...type(24, 32, FontWeight.medium), fontVariant: tabular },
  /** 드럼롤 선택의 한 줄 */
  picker: { ...type(20, 28, FontWeight.medium), fontVariant: tabular },
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
  /** 여러 줄을 적는 입력칸(문의 내용)의 높이 */
  textArea: 160,
  navHeight: 48,
  /** 화면 머리의 차트 표식 */
  mark: 28,
  /** 화면 머리 양옆 칸의 너비 */
  navSide: 48,
  checkbox: 24,
  /** 그 사람의 하늘 그림: 풀이 글 머리 · 홈 카드 */
  readingPicture: 200,
  homePicture: 64,
  /** 차트 휠의 최대 지름 */
  wheel: 300,
  /** 웹 넓은 화면에서 가운데에 보이는 앱 화면의 폭. 휴대폰보다 넓게 두어 모니터에서도 시원하게 보인다(2026-11-18 소유자) */
  maxContentWidth: 480,
  /** 홈 카테고리 타일의 아이콘 */
  categoryIcon: 40,
  /** 아래 탭 줄의 높이 · 탭 아이콘 */
  tabBarHeight: 60,
  tabIcon: 24,
  /** 목록 한 줄의 높이 */
  listRow: 48,
  /** 고르는 칩(궁합의 관계 유형)의 높이 */
  chipHeight: 48,
  /** 태어난 곳 고르기: 왼쪽 시·도 칸의 너비 */
  regionPaneWidth: 112,
  /** 설명(물음표) 버튼의 지름 · 설명 시트에서 글이 굴러가는 영역의 최대 높이 */
  infoButton: 20,
  infoSheetHeight: 360,
  /** 공유 카드(9:16)의 너비: 공유 시트의 미리보기 · 공유 페이지 */
  shareCardWidth: 220,
  sharePageCardWidth: 280,
  /** 공유 카드 머리의 주색 줄 */
  shareCardBarWidth: 24,
  shareCardBarHeight: 4,
  /** 시트 위의 손잡이 줄 */
  handleWidth: 50,
  handleHeight: 4,
  /** 드럼롤 선택: 한 줄 높이 · 보이는 줄 수 · 한 열의 너비 */
  pickerRow: 36,
  pickerRows: 5,
  pickerWidth: 72,
} as const;
