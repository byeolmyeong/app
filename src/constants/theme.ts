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
  /** 본문보다 한 단 옅은 글씨: 말풍선의 설명 · 관계의 각도 말(시안 13-1 · 13-2) */
  inkSoft: '#DADCE3',
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
  /** 시트 위의 칸(검색 칸 · 칩 · 드럼롤의 가운데 띠)과 시트 안 목록의 구분선(결정 042 시안) */
  sheetFill: '#1F2027',
  /** 시트의 손잡이 줄 · 검색 지우기 단추 */
  handle: '#3A3B42',
  /** 고를 수 없게 흐려진 입력칸(시각 "모름")의 바탕 */
  fieldOff: '#121318',
  /** 주색(푸른 보라) 하나. 주 버튼, 고른 것, 포커스 테두리, "지금". 대비 3.6, 그 위 ink 4.8 */
  primary: '#4752FF',
  /** 주색 계열의 글씨: 약관의 [필수], 검색에서 맞은 글자(결정 042 시안). 주색은 바탕 위 글씨로 쓰기엔 어둡다 */
  accentText: '#9AA3FF',
  /** 고른 칩의 옅은 푸른 보라 바탕 */
  primarySoft: '#1D2050',
  /** 오류 · 삭제. 대비 4.9, 그 위 ink 3.5 */
  danger: '#E5484D',
} as const;

export type ColorName = keyof typeof Colors;

/**
 * 브랜드 그림(로고 · 별이 · 홈 아이콘 · 앱 아이콘)의 색. 브랜드 자리에서만 쓰고 버튼 · 입력칸 같은 부품에는 쓰지 않는다(결정 033 · 035).
 * 빛나는 모양은 빛무리(glow) → 번짐(glowMid) → 옅은 보라(glowSoft) → 흰 심(core) 순으로 겹친다.
 */
export const BrandColors = {
  /** 빛: Figma 원본의 불꽃 · 별 · 하트가 빛나는 색 */
  glow: '#3843F4',
  /** 빛무리의 가운데 · 별이의 번짐 */
  haloCenter: '#5B66FF',
  glowMid: '#4F5BFF',
  glowSoft: '#9AA3FF',
  /** 빛의 심. 별이의 몸 */
  core: '#F4F7FF',
  /** 구슬 테두리의 무지갯빛: 옅은 청록 → 주색 → 구슬 청록 → 옅은 보라 */
  rimLight: '#9AE8FF',
  glass: '#00C8E2',
  rimViolet: '#C9B8FF',
  /** 유리 구슬 속 */
  glassDeep: '#1C2A6B',
  glassNight: '#101642',
  /** 별이의 눈과 눈의 빛점 */
  eye: '#161A3E',
  eyeShine: '#FFFFFF',
  /** 쉬는 중 · 머쓱한 별이의 몸과 빛무리 */
  rest: '#DCE2F5',
  dim: '#7A8098',
  dimGlow: '#5A6075',
  /** 브랜드 자리 바탕의 옅은 빛(가운데에서 바탕색으로 사라지는 원): 소개 · 스플래시 · 로그인 · 별명 짓는 중(결정 042) */
  backdrop: '#1A1F6B',
  backdropDim: '#161A45',
  /** 소개의 기울어진 그림 카드와 그 둘레의 빛 */
  card: '#15161C',
  cardShadow: 'rgba(71,82,255,0.22)',
  /** 홈 아이콘 카드 */
  tileTop: '#17181F',
  tileBottom: '#0E0F14',
  tileLine: '#262833',
} as const;

/**
 * 소셜 로그인 버튼(결정 042). 공급자 가이드의 값이라 바꾸지 않는다: 카카오 · 애플(흰 바탕) · 구글(다크).
 * 셋 다 높이 48 · 모서리 12, 로고 20×20 은 왼쪽 16, 글자는 16px · 500(애플 HIG 의 "높이의 43%" 만 소유자 예외).
 * 글자는 공급자 가이드대로 시스템 글꼴이다(Pretendard 를 쓰지 않는다).
 */
export const SocialButtonStyle = {
  height: 48,
  radius: 12,
  logo: 20,
  logoInset: 16,
  text: { fontSize: 16, lineHeight: 20, fontWeight: '500' },
  disabledOpacity: 0.4,
  kakao: { background: '#FEE500', symbol: '#000000', text: 'rgba(0,0,0,0.85)' },
  apple: { background: '#FFFFFF', logo: '#000000', text: '#000000', letterSpacing: -0.16, logoWidth: 17 },
  google: {
    background: '#131314',
    border: '#8E918F',
    text: '#E3E3E3',
    /** G 로고의 원래 색 */
    logo: { red: '#EA4335', blue: '#4285F4', yellow: '#FBBC05', green: '#34A853' },
  },
} as const;

/** 로그인 버튼의 "최근 로그인" 배지(결정 044 시안 보드 5-2): 버튼 오른쪽 위에 걸치고, 바깥에 바탕색 고리를 둘러 버튼과 떼어 보인다 */
export const RecentBadgeStyle = {
  top: -10,
  right: 12,
  paddingVertical: 3,
  paddingHorizontal: 9,
  radius: 999,
  ring: 2,
} as const;

/** 약관 글 화면(결정 044 시안 보드 6-2): 조항 제목과 문단 사이 · 동의하기 위의 사라지는 바탕(높이 · 바탕색이 다 차는 자리) */
export const LegalLayout = {
  blockGap: 6,
  agreeFade: 40,
  agreeFadeSolid: 0.32,
} as const;

/** 가입 단계 화면(결정 042 시안): 진행 막대 · 큰 제목 · 내용 사이의 자리, 뒤로 가기 칸 */
export const StepLayout = {
  progressHeight: 3,
  progressGap: 4,
  titleTop: 28,
  titleGap: 10,
  contentTop: 32,
  /** 뒤로 가기: 누르는 칸 40, 화살표 24, 칸이 왼쪽 여백 안으로 10 들어간다 */
  back: 40,
  backIcon: 24,
  backInset: -10,
  /** 키보드가 올라왔을 때 다음 버튼과 키보드 사이 */
  keyboardGap: 12,
  /** 단계가 바뀔 때 진행 막대의 칸이 차오르거나 줄어드는 시간(소유자 2026-11-19) */
  progressMs: 300,
} as const;

/**
 * 프로필 8종의 색(결정 042, 원본 `assets/brand/avatar-1~8.svg` — 한쪽을 바꾸면 다른 쪽도 바꾼다). 브랜드 그림이라 프로필 그림에만 쓴다.
 * 바탕 원은 위(top) → 아래(bottom), 빛무리와 모양의 번짐은 glow 한 색이다.
 */
export const AvatarColors = {
  1: { top: '#262B78', bottom: '#101642', glow: '#5B66FF' },
  2: { top: '#3A2C7A', bottom: '#16123F', glow: '#C9B8FF' },
  3: { top: '#0E4456', bottom: '#08202C', glow: '#00C8E2' },
  4: { top: '#1C2350', bottom: '#0B0F28', glow: '#9AA3FF' },
  5: { top: '#18305A', bottom: '#0A1630', glow: '#9AE8FF' },
  6: { top: '#3B2366', bottom: '#170F33', glow: '#C9B8FF' },
  7: { top: '#202A86', bottom: '#0E1240', glow: '#4F5BFF' },
  8: { top: '#141A44', bottom: '#07091C', glow: '#00C8E2' },
} as const;

/**
 * 브랜드 자리 바탕의 옅은 빛 모양(결정 042 시안의 radial-gradient): 사라지는 자리(가운데에서 가장 먼 모서리까지를 1) · 가운데 높이.
 * 소개는 장마다 가운데 높이가 다르다(셋째 장은 그림이 위로 올라간다).
 */
export const BackdropShape = {
  intro: { extent: 0.62, centerY: [0.5, 0.5, 0.44] },
  login: { extent: 0.6, centerY: 0.46 },
  making: { extent: 0.56, centerY: 0.42 },
} as const;

/** 소개 둘째 · 셋째 장 그림의 자리(결정 042 시안 보드 3 · 4) */
export const IntroArtLayout = {
  card: { width: 136, height: 172, radius: 22, art: 120, heart: 96 },
  moonCard: { width: 148, height: 184, moon: 100 },
  pair: { width: 300, height: 240, top: 30, left: 22, right: 142 },
  /** 달 카드와 시기 줄 사이 · 시기 줄(선 · 점 · 글자 사이) */
  artGap: 36,
  timeline: { width: 300, height: 14, line: 2, dot: 10, now: 14, gap: 10 },
} as const;

/** 별명 짓는 중의 반짝임 셋의 자리(그림 칸 260 기준, 결정 042 시안 보드 9) */
export const MakingTwinkles = [
  { left: 14, top: 40 },
  { right: 8, top: 170 },
  { left: 60, bottom: 6 },
] as const;

/** 내 하늘 지도(시안 13 · 13-1): 목록 줄 · 별 점 · 시트 안의 자리, 고른 별을 빛내는 주색의 진하기 */
export const SkyMapLayout = {
  /** 목록 한 줄의 최소 높이 · 별 점 · 빈 점(상승점 · 중천)의 테두리 */
  row: 60,
  dot: 8,
  dotBorder: 1.5,
  /** 시트: 이름 줄에서 별자리까지 · 별자리와 하우스 사이 · 관계 제목까지 · 관계 한 줄의 최소 높이 */
  termsTop: 20,
  termsGap: 14,
  relationsTop: 28,
  relationRow: 52,
  /** 고른 별의 빛무리(휠 · 목록의 점) · 고른 별의 하우스 칸에 쓰는 주색의 진하기 */
  haloOpacity: 0.25,
  sectorOpacity: 0.16,
} as const;

/**
 * 이름 옆의 작은 물음표와 그 위에 뜨는 말풍선(시안 13-2, 내 하늘 지도 · 나 탭): 물음표의 지름 · 테두리 · 이름과의 틈,
 * 말풍선의 최대 폭 · 안쪽 여백(가로 · 세로) · 줄 사이 · 꼬리 · 물음표와 말풍선 사이
 */
export const TipLayout = {
  button: 20,
  border: 1.5,
  gap: 6,
  maxWidth: 240,
  padX: 14,
  padY: 12,
  lineGap: 4,
  arrow: 7,
  offset: 11,
} as const;

/** 시트 뒤를 가리는 막. 밤색 66%(결정 042 시안. 어두운 바탕에서는 40% 로는 어두워진 게 보이지 않는다). */
export const DimColor = 'rgba(4,5,8,0.66)';

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
  /** 소개 · 가입 단계의 큰 제목(결정 042 시안) */
  hero: type(26, 36, FontWeight.semibold),
  /** 화면 제목, 구간 제목 */
  title: type(24, 34, FontWeight.semibold),
  /** 별명 짓는 중의 제목(결정 042 시안) */
  headline: type(22, 32, FontWeight.semibold),
  /** 하단 시트의 가운데 제목(결정 042 시안) */
  sheetTitle: type(20, 28, FontWeight.semibold),
  /** 시트 제목(옛 시트), 문단 제목 */
  heading: type(18, 26, FontWeight.semibold),
  /** 버튼 글씨 */
  button: type(16, 24, FontWeight.semibold),
  /** 입력칸의 값 · 자리 글자, 시트 목록의 한 줄(결정 042 시안). 값은 medium 으로 굵힌다 */
  input: type(16, 24, FontWeight.regular),
  /** 본문, 입력칸의 값. 긴 글을 어두운 바탕에서 읽으니 줄 간격 1.6 */
  body: type(15, 24, FontWeight.regular),
  /** 큰 제목 아래 안내 한두 줄(소개 · 가입 단계 · 로그인 한 줄) */
  lead: type(15, 23, FontWeight.regular),
  /** 시트 안의 한 줄 뜻(내 하늘 지도 시트, 시안 13-1) */
  desc: type(14, 21, FontWeight.regular),
  /** 약관의 "모두 동의"(결정 042 시안) · 약관 글 화면의 머리 제목(결정 044 시안) */
  emphasis: type(17, 24, FontWeight.semibold),
  /** 약관 글의 조항 제목(결정 044 시안) */
  clause: type(15, 22, FontWeight.semibold),
  /** 약관 글의 문단 · 목록 · 표(결정 044 시안) */
  legal: type(14, 22, FontWeight.regular),
  /** 약관 항목 한 줄 */
  item: type(15, 22, FontWeight.regular),
  /** 표의 칸, 보조 문장, 입력칸 라벨. 숫자 폭은 고정 */
  table: { ...type(14, 20, FontWeight.medium), fontVariant: tabular },
  /** 입력칸 아래 도움말 · 오류, "보기"(결정 042 시안) */
  caption: type(13, 18, FontWeight.regular),
  /** 로그인 버튼의 "최근 로그인" 배지(결정 044 시안) */
  badge: type(11, 15, FontWeight.semibold),
  /** 입력칸 이름 · "모름"(결정 042 시안) */
  captionStrong: type(13, 18, FontWeight.medium),
  /** 약관의 마케팅 설명처럼 두 줄이 되는 작은 안내 */
  note: type(13, 19, FontWeight.regular),
  /** 도움말, 오류, 작은 라벨 */
  label: type(12, 17, FontWeight.medium),
  /** 소개 셋째 장의 시기 줄 글자(결정 042 시안) */
  micro: type(12, 16, FontWeight.medium),
  /** 숫자만 있는 작은 글자(날짜, 도수) */
  mono: { ...type(12, 17, FontWeight.medium), fontVariant: tabular },
  /** 점수, 순위 */
  number: { ...type(24, 32, FontWeight.medium), fontVariant: tabular },
  /** 드럼롤 선택의 한 줄과 가운데(고른) 줄(결정 042 시안) */
  picker: { ...type(20, 28, FontWeight.regular), fontVariant: tabular },
  pickerOn: { ...type(22, 28, FontWeight.semibold), fontVariant: tabular },
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
  /** 글자와 작은 화살표 사이처럼 붙어 보여야 하는 틈(결정 042 시안) */
  hairline: 2,
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
  /** 입력칸 높이(결정 042 시안 52) · 라벨 줄의 최소 높이(오른쪽에 체크가 붙어도 줄 높이가 같게) */
  inputHeight: 52,
  fieldLabelRow: 20,
  /** 여러 줄을 적는 입력칸(문의 내용)의 높이 */
  textArea: 160,
  navHeight: 48,
  /** 화면 머리 양옆 칸의 너비 */
  navSide: 48,
  checkbox: 24,
  /** 체크 칸(결정 042 시안): 모두 동의(동그라미) · 약관 항목 · 시각 "모름". 네모의 모서리 · 빈 칸 테두리 */
  checkRound: 24,
  checkSquare: 20,
  checkSmall: 18,
  checkRadius: 6,
  checkBorder: 1.5,
  /** 체크 칸보다 체크 표시가 작은 만큼(24 → 18 · 20 → 14 · 18 → 12) */
  checkMarkInset: 6,
  /** 그 사람의 하늘 그림: 풀이 글 머리 · 홈 카드 */
  readingPicture: 200,
  homePicture: 64,
  /** 차트 휠(궁합의 겹친 휠)의 최대 지름 */
  wheel: 300,
  /** 내 하늘 지도 휠의 최대 지름(시안 13) */
  skyWheel: 320,
  /** 웹 넓은 화면에서 가운데에 보이는 앱 화면의 폭. 휴대폰보다 넓게 두어 모니터에서도 시원하게 보인다(2026-11-18 소유자) */
  maxContentWidth: 480,
  /** 아래 탭 줄의 높이 · 탭 아이콘 */
  tabBarHeight: 60,
  tabIcon: 24,
  /** 목록 한 줄의 높이 */
  listRow: 48,
  /** 약관의 "모두 동의" 줄 · "보기" 옆 작은 화살표(결정 042 시안) */
  agreeAllRow: 60,
  chevronSmall: 18,
  /** 약관의 필수 둘과 선택 둘 사이(피그마 17) */
  termsGroupGap: 17,
  /** 고르는 칩(궁합의 관계 유형)의 높이 */
  chipHeight: 48,
  /** 태어난 곳 시트(결정 042 시안): 검색 칸 · 시 · 도 칩 높이 · 목록 한 줄 · 시트가 화면 위에서 떨어진 거리(시 · 도일 때 · 목록일 때) · 아래 흐림 */
  searchHeight: 48,
  placeRow: 56,
  placeSheetTopRegions: 222,
  placeSheetTop: 64,
  placeFade: 64,
  /** 작은 아이콘(검색 · 체크) · 검색 지우기 단추와 그 안의 X */
  icon: 20,
  clearIcon: 10,
  /** 설명(물음표) 버튼의 지름 · 설명 시트에서 글이 굴러가는 영역의 최대 높이 */
  infoButton: 20,
  infoSheetHeight: 360,
  /** 공유 카드(9:16)의 너비: 공유 시트의 미리보기 · 공유 페이지 */
  shareCardWidth: 220,
  sharePageCardWidth: 280,
  /** 시트 위의 손잡이 줄(결정 042 시안) · 제목이 있는 시트의 위 여백(손잡이 위 10 + 4 + 제목까지 22) · 제목 줄의 뒤로 화살표 */
  handleWidth: 40,
  handleHeight: 4,
  sheetTitleTop: 36,
  sheetBackIcon: 22,
  /** 드럼롤 선택(결정 042 시안): 한 줄 높이 · 보이는 줄 수 · 한 열의 너비 · 가운데 띠의 모서리 */
  pickerRow: 44,
  pickerRows: 5,
  pickerWidth: 76,
  pickerBandRadius: 10,
  /** 프로필 그림(결정 042 시안): 닉네임 단계 위 가운데 · 고르기 시트 · 연필 표시 · 고른 표시 */
  avatarLarge: 88,
  avatarPick: 64,
  avatarEdit: 28,
  avatarEditIcon: 14,
  avatarCheck: 22,
  avatarCheckIcon: 12,
  avatarRing: 3,
  /** 로그인 위쪽의 로고 그림(결정 042 시안 보드 5) */
  loginLogo: 260,
  /** 별명 짓는 중(결정 042 시안): 그림 칸 · 뒤 빛 · 안쪽 궤도가 칸에서 들어간 거리 · 궤도의 점 · 반짝임 · 안내 줄 높이 */
  makingArt: 260,
  makingGlowInset: 40,
  makingInnerOrbit: 34,
  makingOrbitDot: 12,
  makingInnerDot: 7,
  makingTwinkle: 4,
  makingTwinkleSmall: 3,
  makingLine: 24,
  /** 브랜드 그림: 홈 머리의 로고 높이 · 별이(화면 가운데 · 카드 안) · 홈 아이콘 카드 */
  brandMarkHeight: 20,
  byeoli: 160,
  byeoliSmall: 72,
  homeTile: 64,
  /** 소개 · 가입 단계 화면의 머리(건너뛰기 · 뒤로) 높이와 바닥 여백(결정 042 시안) */
  stepHeader: 56,
  stepBottom: 34,
  /** 소개의 그림 칸 · 장 표시 점(지금 장은 길게) */
  introArt: 260,
  introDot: 6,
  introDotActive: 20,
} as const;
