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
  /** 주색보다 한 단 밝은 푸른 보라: 풀이 문단 번호 · 가까워지는 모습의 가운데 점 · 일 방식 막대의 끝(보드 12-8~12-11) */
  primaryBright: '#6E78FF',
  /** 나 탭 영역 카드의 키워드 칩(보드 12-8): 옅은 푸른 보라 바탕 · 테두리 · 글씨 */
  keyword: 'rgba(154,163,255,0.12)',
  keywordLine: 'rgba(154,163,255,0.28)',
  keywordText: '#C9CEFF',
  /** 오류 · 삭제. 대비 4.9, 그 위 ink 3.5 */
  danger: '#E5484D',
  /** 연결 끊김 아이콘의 빗금(보드 20) · 짧은 알림의 실패 아이콘(보드 23-1) */
  dangerSoft: '#FF8A8A',
  /** 짧은 알림의 성공 체크(보드 23) */
  success: '#7EE0B5',
  /** 처음 불러올 때 뼈대 막대의 바탕과, 그 위를 지나가는 옅은 빛(보드 24 · 24-1) */
  skeleton: '#1E1F27',
  skeletonShine: '#2A2B35',
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
  /** 홈 별명 카드 오른쪽 위의 빛 · 뒤에 깔린 별자리 선(결정 047, 보드 11) */
  cardGlow: '#232A8A',
  constellation: '#5A5D6B',
  /** 나 탭 영역 그림의 옅은 보라 반짝임 · 일 그림의 계단 면(보드 12 · 12-8~12-12) */
  sparkle: '#C9CEFF',
  stepFill: '#2A2F8F',
  /** 시기 · 인생의 "다음 큰 변화" 카드 위쪽의 옅은 남색(보드 14-2 — 아래로 카드 면에 스민다) */
  lifeCard: '#1B1F5E',
  /** 올해 흐름 띠 · 이번 달 내내 첫 줄의 빛(보드 14 · 14-1): 빛 → 한 단 밝은 보라, 띠의 번짐 · 둘째 줄의 옅은 보라 */
  bandGlow: 'rgba(79,91,255,0.6)',
  todayGlow: 'rgba(71,82,255,0.6)',
  themeSoft: 'rgba(201,206,255,0.55)',
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

/**
 * 약관 글 화면(결정 044 시안 보드 6-2): 조항 제목과 문단 사이 · 동의하기 위의 사라지는 바탕(버튼 위 높이 ·
 * 바탕색이 다 차는 자리 — 시안의 가림막 전체(위 40 · 버튼 56 · 아래 34) 높이에 대한 비율)
 */
export const LegalLayout = {
  blockGap: 6,
  agreeFade: 40,
  agreeFadeSolid: 0.32,
} as const;

/** 아래 시트(Sheet)와 아래 · 오른쪽에서 들어오는 화면(slide-up.ts)의 움직임: 열기 · 닫기 시간(ms)과 여는 곡선(cubic-bezier) */
export const Motion = { openMs: 300, closeMs: 220, openCurve: [0.32, 0.72, 0, 1] } as const;

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
 * 소개는 장마다 가운데 높이가 다르다(둘째 장 — 시기 — 은 그림이 위로 올라간다).
 */
export const BackdropShape = {
  /** 스플래시(보드 1, 결정 067 의 3) */
  splash: { extent: 0.58, centerY: 0.44 },
  intro: { extent: 0.62, centerY: [0.5, 0.44] },
  login: { extent: 0.6, centerY: 0.46 },
  making: { extent: 0.56, centerY: 0.42 },
  reveal: { extent: 0.58, centerY: 0.26 },
} as const;

/** 별명 공개의 자리(결정 044 시안 보드 10): 그림 칸(240×220) 안의 뒤 빛 · 별이 · 반짝임 넷, 글 · 칸의 사이 */
export const RevealLayout = {
  art: { width: 240, height: 220, top: 8 },
  glow: { size: 180, left: 30, top: 20 },
  byeoli: { size: 140, left: 50, top: 40 },
  twinkles: [
    { left: 18, top: 46, size: 4 },
    { right: 16, top: 150, size: 3 },
    { right: 40, top: 18, size: 3 },
    { left: 52, bottom: 8, size: 3 },
  ],
  textTop: 20,
  headlineTop: 12,
  headlineInset: 8,
  cellsTop: 28,
  cell: 104,
  cellGap: 12,
  cellInnerGap: 2,
} as const;

/** 소개 둘째 장(시기) 그림의 자리(시안 온보딩 보드 3) */
export const IntroArtLayout = {
  moonCard: { width: 148, height: 184, radius: 22, moon: 100 },
  /** 달 카드와 시기 줄 사이 · 시기 줄(선 · 점 · 글자 사이) */
  artGap: 36,
  timeline: { width: 300, height: 14, line: 2, dot: 10, now: 14, gap: 10 },
} as const;

/** 공통 상태 화면(결정 061, 보드 19 · 20-1 · 17-1 · 점검): 그림 아래 제목 · 그 아래 설명 · 가운데 덩이를 위로 올림 · 주 버튼 아래(탭 없음 · 탭 위) */
export const StateLayout = { titleTop: 32, bodyTop: 10, lift: 32, bottom: 34, aboveTabs: 16, laterGap: 8, later: 48 } as const;

/** 가운데 창(결정 061 의 6, 보드 17): 화면 양옆에서 · 안 여백(위 · 나머지) · 모서리 · 제목과 설명 사이 · 설명과 버튼 사이 · 버튼 사이 · 버튼 높이 */
export const DialogLayout = { inset: 28, paddingTop: 26, padding: 20, radius: 20, bodyTop: 8, actionsTop: 22, actionGap: 8, button: 50 } as const;

/**
 * 짧은 알림(보드 23 · 23-1, 결정 065): 화면 좌우 · 감싼 것(아래 탭 · 주 버튼)과의 사이 · 안 여백(세로 · 가로) · 모서리 ·
 * 아이콘(크기 · 선 굵기) · 아이콘과 글 사이 · 그림자
 */
export const ToastLayout = {
  inset: 20,
  above: 12,
  paddingV: 14,
  paddingH: 16,
  radius: 14,
  icon: 18,
  iconStroke: 2.2,
  gap: 10,
  shadow: '0 8px 24px rgba(0,0,0,0.45)',
} as const;

/** 처음 불러올 때 뼈대(보드 24 · 24-1): 막대 모서리 · 빛이 한 번 오가는 시간. 카드는 그 부품의 틀을 쓴다(결정 071) */
export const SkeletonLayout = { radius: 8, shimmerMs: 1400 } as const;

/** 연결 끊김 띠(결정 061 의 4, 보드 20) */
export const OfflineBannerLayout = { paddingV: 12, paddingH: 14, radius: 12, icon: 20, gap: 10 } as const;

/** 홈 별명 카드(결정 047, 보드 11 · 11-1): 모서리 · 안 여백 · 프로필 그림 · 그림과 이름 사이 · 위와의 사이 · 빛 · 뒤의 별자리 그림 */
export const NicknameCardLayout = {
  radius: 24,
  padding: 20,
  avatar: 52,
  rowGap: 12,
  headlineTop: 18,
  moreTop: 14,
  /** "풀이 읽기 ›" 의 꺾쇠 22(소유자 2026-11-23, 빌드 13 — 글자와 세로 가운데, 선 굵기는 viewBox 24 의 2 그대로 비율) */
  chevron: 22,
  glow: { x: 0.88, y: 0.08, extent: 0.58 },
  /** 오른쪽 위 해 별자리 그림: 칸 · 자리 · 옅기, 그림 안 좌표(160×140)와 안쪽 여백 · 별 점 반지름 · 가장 밝은 별의 네 갈래 별 크기 */
  art: { width: 150, height: 131, right: -10, top: 6, opacity: 0.55, view: { w: 160, h: 140, pad: 14 }, dot: 2, core: 8 },
  /** 처음 불러올 때 뼈대(결정 071 — 되살리는 동안의 카드: 받아 둔 풀이가 없다): 이름 · 해 별자리 · "아직 별명을 짓지 않았어요." · "내 별명 읽기" 막대 폭 */
  skeleton: { name: 72, meta: 64, empty: 168, more: 72 },
  /** 계정을 아직 모를 때 이름 자리표의 폭(components/placeholder) */
  namePlaceholder: 96,
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
  /** 시각 "모름" 이면 별자리 경계를 가운데 원까지 늘린 선(결정 079): 하우스 선과 같은 hair 색에 낮은 진하기 · 조금 가늘게 */
  signInnerOpacity: 0.5,
  signInnerWidth: 0.8,
} as const;

/**
 * 이름 옆의 작은 물음표와 그 위에 뜨는 말풍선(시안 13-2, 내 하늘 지도 · 나 탭): 물음표의 지름 · 테두리 · 이름과의 틈,
 * 말풍선의 최대 폭 · 안쪽 여백(가로 · 세로) · 줄 사이 · 꼬리 · 물음표와 말풍선 사이
 */
/**
 * 나 탭(보드 12 받기 전 · 12-8~12-12 · 24-1): 받은 뒤 맨 위 별명 카드 · 칩 다섯 · 영역 카드(빛 · 그림 · 키워드 · 쓰인 별) ·
 * 영역마다의 칸(한눈에 보기 · 작은 실천 · 가까워지는 모습 · 일 방식 막대 · 마음이 흔들릴 때) · 번호 붙은 문단, 받기 전의 "자세한 풀이" 카드.
 */
export const MeLayout = {
  cardTop: 4,
  cardBottom: 14,
  /** chevron: 꺾쇠 › 22(소유자 2026-11-23, 빌드 13 — 선 굵기는 viewBox 24 의 2 그대로 비율) */
  card: { padV: 12, padH: 14, radius: 16, avatar: 44, gap: 12, textGap: 2, chevron: 22 },
  chips: { top: 4, bottom: 8, gap: 6, height: 36 },
  contentTop: 20,
  sectionGap: 36,
  hero: {
    radius: 24,
    padTop: 22,
    padX: 20,
    padBottom: 20,
    art: 92,
    artInset: 14,
    titleTop: 10,
    titleRight: 100,
    keywordsTop: 16,
    keywordGap: 6,
    keyword: 30,
    keywordPadX: 12,
    starsTop: 18,
    starsPadTop: 14,
    starsGap: 6,
    starGapX: 14,
    starIcon: 11,
    glow: { x: 0.85, y: 0.14, extent: 0.58 },
  },
  block: { top: 12, radius: 16, pad: 14, gap: 10, innerGap: 8 },
  practice: { pad: 16, gap: 12, badge: 24, textGap: 4, listGap: 10 },
  closer: { padV: 18, padH: 8, dotBox: 24, dots: [14, 18, 22], line: 2, gap: 6, glow: [0, 8, 16] },
  work: { padV: 18, padH: 14, gap: 16, label: 56, rowGap: 10, bar: 6, dot: 14 },
  shaken: { gap: 8, arrow: 18, innerGap: 6 },
  paragraph: { titleTop: 4, bodyTop: 10, numberTracking: 0.48 },
  detail: {
    top: 48,
    radius: 24,
    padTop: 22,
    padX: 18,
    padBottom: 18,
    titleTop: 6,
    bodyTop: 6,
    iconsTop: 18,
    icon: 44,
    iconGap: 4,
    buttonTop: 18,
    glow: { x: 0.85, y: 0.1, extent: 0.58 },
  },
  /**
   * 처음 불러올 때 뼈대(결정 071 — 모양은 보드 24-1, 자리 · 줄 수는 12 · 12-8): 받은 뒤 별명 카드(이름 · 한 줄 별명 — 꺾쇠 자리는 비움) ·
   * 영역 카드(이름표 · 제목 세 줄 · 키워드 셋 · 쓰인 별 이름과 셋) · 받기 전 자세한 풀이 카드(이름표 · 제목 · 설명 · 영역 이름)의 막대 폭
   */
  skeleton: {
    card: { label: 84, headline: '86%' },
    hero: { kicker: 91, title: ['100%', '96%', '30%'], keywords: [74, 78, 78], stars: 88, star: [122, 108, 126] },
    detail: { kicker: 64, title: ['74%'], body: ['96%'], icon: 23 },
  },
} as const;

/**
 * 시기 탭(결정 049, 캔버스 14 · 14-1 ~ 14-4 · 14-7 · 14-8 · 14 잠긴 칩) · 홈의 시기 칸(보드 11 · 11-1).
 * 맨 위 "지금 나의 시기" 카드 · 칩 셋 · 칸 사이 · 이번 달 달력 · 눈여겨볼 날 · 올해 띠 · 인생의 길 · 시기 자세히 · 그날의 하늘 · 작은 실천.
 */
export const TimingLayout = {
  heroTop: 8,
  hero: {
    radius: 24,
    padTop: 22,
    padX: 20,
    padBottom: 20,
    art: 96,
    artInset: 12,
    titleTop: 10,
    titleRight: 100,
    metaTop: 12,
    metaGap: 8,
    summaryTop: 14,
    glow: { x: 0.85, y: 0.14, extent: 0.58 },
  },
  /** 영역 · 칩 딱지(보드 14 — 키워드 칩과 같은 옅은 보라) */
  tag: { height: 24, padX: 9, radius: 12 },
  /** 칩 셋: 맨 위 카드 아래 · 카드가 없을 때 머리 아래(받기 전 — 세 칩 모두 같은 자리) · 높이 · 사이 */
  chips: { top: 20, topBare: 4, height: 36, gap: 6 },
  contentTop: 24,
  contentBottom: 34,
  sectionGap: 32,
  listGap: 10,
  practicesTop: 12,
  practiceGap: 8,
  card: { radius: 16, pad: 16, padV: 14, gap: 12, chevron: 18 },
  badge: 24,
  month: {
    arrow: 32,
    arrowIcon: 16,
    /**
     * ‹ › 꺾쇠를 가리키는 쪽으로 옮기는 눈 보정(px, 소유자 지적 — 빌드 10). 꺾쇠의 테두리 상자는 동그라미 한가운데지만(웹 390 실측 0px),
     * 무게가 열린 쪽에 실려(꺾쇠가 그리는 삼각형의 무게중심이 열린 쪽으로 0.9px · 진하기 무게중심 0.17px) 가리키는 반대쪽으로 치우쳐 보인다.
     * 재생 단추(▶)를 오른쪽으로 옮기는 것과 같은 보정이다
     */
    arrowNudge: 1,
    arrowGap: 6,
    /** 끝에 닿아 누를 수 없는 ‹ › */
    disabledOpacity: 0.4,
    cardTop: 12,
    padTop: 14,
    padX: 10,
    padBottom: 10,
    radius: 20,
    weekBottom: 8,
    cell: 46,
    day: 32,
    dot: 5,
    dotGap: 3,
    legendInset: 6,
    legendTop: 10,
    legendGap: 6,
    swatch: { width: 36, height: 6 },
    swatchGap: 8,
    dayGap: 14,
    dateWidth: 40,
    dateLine: 22,
    /** 뼈대: 날 숫자 · 요일 막대의 폭 */
    dateBar: 22,
    weekBar: 12,
    dayTextGap: 4,
    quietPadV: 20,
    quietGap: 6,
  },
  year: {
    cardTop: 14,
    padTop: 16,
    padX: 14,
    padBottom: 14,
    radius: 20,
    row: 34,
    label: 64,
    track: 26,
    line: 2,
    lineTop: 12,
    band: 14,
    bandTop: 6,
    nowWidth: 2,
    nowTop: -6,
    nowBottom: -4,
    nowLabelTop: -22,
    ticksTop: 8,
    itemGap: 6,
    /** 뼈대: 영역 이름 · 달 눈금 막대 */
    labelBar: 40,
    tickBar: 20,
  },
  life: {
    noteGap: 4,
    cardTop: 14,
    radius: 20,
    pad: 20,
    shareSpot: 40,
    shareInset: 8,
    yearTop: 8,
    yearGap: 10,
    titleTop: 8,
    bodyTop: 6,
    pathPad: 18,
    rail: 20,
    dot: 12,
    dotNext: 16,
    railLine: 2,
    stepBottom: 22,
    stepGap: 14,
    textGap: 2,
    pastOpacity: 0.55,
    /** 뼈대: 다음 큰 변화의 해 막대 */
    yearBar: 96,
  },
  period: {
    top: 8,
    reasonGap: 12,
    badgePadX: 10,
    titleTop: 12,
    trackTop: 18,
    track: 14,
    trackInset: 5,
    dot: 10,
    now: 14,
    labelsTop: 6,
    labels: 15,
    sectionTitleTop: 4,
    sectionBodyTop: 10,
    /** 01 · 02 · 03 의 자간(0.04em) */
    numberTracking: 0.48,
    /** 뼈대: 딱지 · 번호 막대 */
    badgeBar: 92,
    numberBar: 18,
  },
  day: {
    heroTop: 16,
    padV: 24,
    padX: 20,
    moon: 64,
    moonInset: 20,
    titleRight: 80,
    glow: { x: 0.8, y: 0.18, extent: 0.6 },
    sectionTop: 36,
    flowTop: 6,
    rowPadV: 14,
    rowGap: 12,
    rowLabel: 44,
    rowLabelLine: 24,
    /** 뼈대: 흐름 이름 막대 */
    labelBar: 30,
    reasonTop: 20,
    todosTop: 8,
    todo: 44,
  },
  /** 홈의 시기 칸(보드 11): 카드 · 이름표 줄 · 지나온 — 지금 — 큰 변화 줄(지금 점의 자리는 시안의 그림 그대로) · 제목 */
  /** chevron: 홈 오늘의 하늘 · 시기 칸 카드의 꺾쇠(머리 · "자세한 풀이 받기 ›") 22(소유자 2026-11-23, 빌드 13 — 선 굵기는 같은 비율) */
  home: { radius: 20, pad: 20, cardGap: 12, chevron: 22, lineTop: 16, nowAt: 0.42, litAt: 0.45, titleTop: 14, emptyTitleTop: 10, subTop: 2, linkTop: 14, todosTop: 6 },
  /** 받기 전 이번 달 아래의 자세한 풀이 카드(14 받기 전) · 잠긴 칩의 카드(14 잠긴 칩) */
  detail: { radius: 24, padTop: 22, padX: 18, padBottom: 18, art: 76, artInset: 12, titleTop: 6, titleRight: 80, bodyTop: 6, buttonTop: 18, glow: { x: 0.85, y: 0.1, extent: 0.58 } },
  /** 처음 불러올 때 뼈대 · 잠긴 자리의 흐린 모양: 달 머리 · 제목 · 줄 · 작은 줄 · 달력 칸 */
  /** 뼈대(결정 065 의 2 · 071 — 다 그려진 화면의 배치를 본뜬다): 글자 막대는 글자 크기보다 이만큼 낮게 · 딱지 폭 */
  skeleton: { barInset: 2, tag: 44 },
  /** 잠긴 칩의 자물쇠 카드 — 위아래 안 여백은 같게(묶음이 카드의 세로 가운데, 소유자 빌드 13) */
  locked: { cardPadY: 24, cardPadX: 20, icon: 48, glyph: 22, titleTop: 14, bodyTop: 6, buttonTop: 18 },
} as const;

/**
 * 홈의 오늘의 하늘 카드(보드 11 · 11 쓰는 중): 이름표 아래 제목 · 쓰는 중 줄(위 · 그림과 글 사이 · 글 줄 사이) · 작은 그림(칸 · 빛이 칸에서 들어간 거리 ·
 * 궤도의 점 · 별이 · 둥실 높이 · 빛이 가장 흐릴 때). 카드 모양 · 꺾쇠 · 짧은 이유 위는 홈의 시기 칸(TimingLayout.home)과 같다.
 */
export const TodayCardLayout = { titleTop: 10, rowTop: 14, rowGap: 14, textGap: 4, art: 56, glowInset: 9, dot: 8, byeoli: 33, float: 8, glowDim: 0.55 } as const;

/**
 * 알림함(결정 052, 보드 11-3 · 11-3-1): 묶음 이름(위 · 아래) · 한 줄(안 여백 · 사이 · 아래 · 모서리 — 안 읽은 줄만 떠 있는 면) · 둥근 아이콘 칸 ·
 * 글 줄 사이 · 때 위 · 안 읽음 점(자리 · 글이 점을 비켜 가는 폭) · 비었을 때(머리 아래 높이 640 칸의 가운데) · 처음 불러올 때 뼈대의 줄 수.
 * 홈 머리의 종(보드 11): 누르는 칸 · 아이콘 · 점(바탕색 테두리) · 머리 오른쪽 끝에서 더 나간 거리.
 */
export const NotificationLayout = {
  groupTop: 24,
  groupBottom: 4,
  row: { padV: 14, padX: 12, gap: 12, bottom: 8, radius: 14, textGap: 2, timeTop: 2, unreadRight: 14 },
  icon: 40,
  glyph: 20,
  dot: { size: 8, top: 18, right: 12 },
  empty: { height: 640, icon: 72, glyph: 34, titleTop: 20, bodyTop: 8 },
  skeleton: { rows: 3 },
  bell: { box: 40, icon: 24, inset: -8, dot: 8, dotBorder: 1.5, dotTop: 8, dotRight: 9 },
} as const;

/** 카드 하나만 못 불러왔을 때 그 카드 자리(보드 19-1, 결정 061 의 3): 카드 · 이름표 아래 제목 · 설명 · 작은 "다시 보기" 단추 */
export const CardFailLayout = { padding: 20, radius: 20, titleTop: 10, bodyTop: 4, buttonTop: 14, button: 40, buttonPadX: 16, buttonRadius: 10 } as const;

/**
 * 내 별명(보드 12): 머리 아래 한 줄 별명 · 별자리 카드 · 문단들 · 강점과 보완점의 간격.
 * 별자리 카드는 내 별자리 그림 · 이름 · 셋(나의 중심 · 나의 마음 · 나의 첫인상) · "내 하늘 지도 보기" 줄.
 */
export const ReadingLayout = {
  headlineTop: 20,
  cardTop: 28,
  sectionsTop: 48,
  sectionsGap: 44,
  bodyTop: 10,
  listsTop: 48,
  listsGap: 32,
  listGap: 12,
  itemGap: 8,
  card: { radius: 20, padTop: 24, padX: 16, padBottom: 20, picture: 154, nameTop: 12, gridTop: 20, gridPadV: 20, gridGap: 8, cellGap: 4, mapRow: 52, chevron: 18 },
  /**
   * 처음 불러올 때 뼈대(결정 071 — 보드 12 의 줄 수): 한 줄 별명 두 줄 · 문단 다섯(제목 한 줄 · 본문 다섯 줄) · 강점 셋 · 보완점 둘의 막대 폭,
   * 별자리 카드의 이름 · 셋 칸(이름 · 별자리 · 뜻) · "내 하늘 지도 보기" 막대 폭
   */
  skeleton: {
    headline: ['100%', '58%'],
    sections: 5,
    title: ['46%'],
    body: ['100%', '100%', '100%', '100%', '62%'],
    strengthsTitle: 34,
    strengths: ['46%', '52%', '60%'],
    cautionsTitle: 48,
    cautions: ['56%', '44%'],
    card: { name: 76, label: 52, value: 64, caption: 72, map: 102 },
  },
} as const;

/**
 * "이렇게 풀이한 이유" 줄(보드 12 · 12-1, 결정 054): 접힌 상자(안쪽 여백 · 모서리 · 이름과 문장 사이 · 꺾쇠)와 펼친 안(작은 지도 · 용어 줄 · 하늘 지도 보기 단추).
 * 작은 지도는 하늘 지도의 휠을 지름 120 으로 줄이고 그 근거의 별 · 칸만 빛낸다.
 */
export const ReasonLayout = {
  top: 16,
  padTop: 12,
  padRight: 12,
  padBottom: 12,
  padBottomOpen: 14,
  padLeft: 14,
  radius: 12,
  textGap: 4,
  rowGap: 8,
  /** 펼침 꺾쇠 22(소유자 2026-11-23, 빌드 13 — 선 굵기는 viewBox 24 의 2 그대로 비율) */
  chevron: 22,
  wheel: 120,
  wheelTop: 18,
  wheelDot: 5,
  wheelRing: 9,
  wheelRingWidth: 1.5,
  wheelRingOpacity: 0.45,
  wheelSectorOpacity: 0.22,
  termsTop: 18,
  termsGap: 14,
  termGap: 2,
  button: 44,
  buttonRadius: 10,
  buttonTop: 18,
  /** 처음 불러올 때 뼈대(결정 071): 접힌 상자의 이름 · 문장 두 줄의 막대 폭 */
  skeleton: { label: 95, sentence: ['100%', '72%'] },
} as const;

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
  /** 별명 공개의 "○○ 님의 별명은" · 세 칸의 값 · 세 칸의 이름(결정 044 시안) */
  kicker: type(15, 22, FontWeight.medium),
  stat: type(16, 24, FontWeight.semibold),
  statLabel: type(12, 17, FontWeight.regular),
  /** 시기 · 인생의 "다음 큰 변화" 해(보드 14-2) */
  yearBig: type(40, 46, FontWeight.semibold),
  /** 별명 짓는 중의 제목(결정 042 시안) */
  headline: type(22, 32, FontWeight.semibold),
  /** 하단 시트의 가운데 제목(결정 042 시안) */
  sheetTitle: type(20, 28, FontWeight.semibold),
  /** 시트 제목(옛 시트), 문단 제목 */
  heading: type(18, 26, FontWeight.semibold),
  /** 홈 별명 카드의 한 줄 별명(결정 047, 보드 11) */
  cardTitle: type(21, 30, FontWeight.semibold),
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
  /** 이유 줄의 한 문장(보드 12 — 굵은 자리는 semibold) */
  reason: type(14, 22, FontWeight.regular),
  /** 풀이 문단의 제목과 본문(보드 12 · 12-8~12-12) */
  paragraphTitle: type(19, 27, FontWeight.semibold),
  paragraph: type(16, 26, FontWeight.regular),
  /** 이유 펼침의 용어 이름 · 하늘 지도 보기 단추(보드 12-1) */
  term: type(14, 20, FontWeight.semibold),
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
  /** 알림 줄의 본문(보드 11-3) */
  notice: type(14, 20, FontWeight.regular),
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
  /** 소개 둘째 장(시기)의 시기 줄 글자(결정 042 시안) */
  micro: type(12, 16, FontWeight.medium),
  /** 알림 줄의 때(보드 11-3) */
  meta: type(12, 16, FontWeight.regular),
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
  /** 설명(물음표) 버튼의 지름 */
  infoButton: 20,
  /** 공유 카드(9:16)의 너비: 공유 시트의 미리보기(보드 12-4 의 209 — 360 카드의 0.58) · 공유 페이지 */
  shareCardWidth: 209,
  sharePageCardWidth: 280,
  /** 시트 위의 손잡이 줄(결정 042 시안) · 제목이 있는 시트의 위 여백(손잡이 위 10 + 4 + 제목까지 22) · 제목 줄의 뒤로 화살표 */
  handleWidth: 40,
  handleHeight: 4,
  sheetTitleTop: 36,
  sheetBackIcon: 22,
  /** 머리 오른쪽의 공유하기 아이콘(보드 12 · 12-8) */
  navIcon: 22,
  /** 카드 안 오른쪽 위의 공유 아이콘(시기 · 인생의 다음 큰 변화 카드, 보드 14 인생 — 누르는 칸은 TimingLayout 의 shareSpot) */
  cardShareIcon: 20,
  /** 드럼 시트(태어난 시각 · 받는 시간)의 위 끝에서 드럼 위 끝까지(시안 8-1 · 16-3: 위 10 + 손잡이 4 + 28 + 16) */
  pickerSheetTop: 58,
  /** 내용만큼 늘어나는 시트도 화면 위 끝에서 이만큼은 남긴다(태어난 곳 목록 시트의 위 64 와 같다, 보드 8-2-1). 넘치면 시트 안에서 굴린다 */
  sheetTop: 64,
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
  /** 스플래시의 별이 · 로고 그림(보드 1 — 네이티브 스플래시 app.json imageWidth 와 같다, 결정 067 의 3) */
  splashArt: 300,
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
  /** 소개 · 가입 단계 화면의 머리(건너뛰기 · 뒤로) 높이와 바닥 여백(결정 042 시안) */
  stepHeader: 56,
  stepBottom: 34,
  /** 소개의 그림 칸 · 장 표시 점(지금 장은 길게) */
  introArt: 260,
  introDot: 6,
  introDotActive: 20,
} as const;

/**
 * 마이(결정 056 · 065, 보드 16 ~ 16-10). 별명 카드: 안 여백(위 · 나머지) · 모서리 · 빛 자리 · 프로필 그림 · 그림과 이름 사이 · 이름 줄 사이 ·
 * 한 줄 별명(위 · 줄 높이) · 출생 정보 위 · 이름 줄 끝 꺾쇠(카드 전체가 내 정보로, 결정 084). 목록 카드: 모서리 · 한 줄(최소 높이 · 안 여백) ·
 * 화살표 · 스위치(폭 · 높이 · 손잡이 · 손잡이 여백). 화면: 머리 아래 · 카드끼리 · 별명 카드와 첫 목록 사이에 더 띄움.
 * 내 정보(16-1, 결정 084): 프로필 그림 위 · 아래 · 계정 삭제 글자 줄 높이 · 공급자 표시(동그라미 · 로고 · 이메일과 사이). 계정 삭제(16-10): 제목 위 · 묶음 사이 · 확인 칸 안 여백 · 점 · 점 위.
 * 지웠어요: 그림 칸 · 아이콘 · 제목 위 · 설명 위 · 가운데 덩이를 위로 올림.
 */
export const MyLayout = {
  top: 8,
  gap: 12,
  listTop: 8,
  card: {
    paddingTop: 22,
    padding: 20,
    radius: 24,
    glow: { x: 0.85, y: 0.12, extent: 0.6 },
    avatar: 64,
    rowGap: 14,
    namesGap: 2,
    headlineTop: 16,
    headlineLine: 25,
    birthTop: 12,
    /** 이름 줄 끝 꺾쇠 — 홈 카드들의 꺾쇠와 같은 크기(결정 084) */
    chevron: 22,
    /** 계정을 아직 모를 때 이름 자리표의 폭(components/placeholder) */
    namePlaceholder: 104,
  },
  list: { radius: 16, row: 52, paddingV: 12, paddingH: 16, gap: 12, chevron: 18, descGap: 2, switch: { width: 48, height: 28, knob: 22, inset: 3 } },
  account: { avatarTop: 8, avatarBottom: 16, deleteRow: 44, badge: 18, badgeGlyph: 11, badgeGap: 6 },
  delete: { headingTop: 8, gap: 22, notePadding: 18, noteGap: 12, dot: 4, dotTop: 10, dotGap: 10, checkGap: 10, checkPadV: 4, checkPadH: 2 },
  done: { icon: 72, iconGlyph: 32, titleTop: 24, bodyTop: 10, lift: 40 },
  /** 출생 정보 수정(16-4): 안내 칸(안 여백 · 모서리 · 아이콘 · 아이콘과 글 사이) · 묶음 사이 */
  birth: { noticePadV: 14, noticePadH: 16, noticeRadius: 14, noticeIcon: 20, noticeIconTop: 1, noticeGap: 10, gap: 22 },
  /**
   * 알림 설정(16-2 · 16-2-2): 푸시를 끄면 오늘의 하늘 묶음을 흐리게(불투명도) ·
   * 처음 불러올 때 뼈대(이름 막대의 높이 · 너비, 오른쪽 값 막대의 높이 desc — 막대는 글자 줄 높이 칸 가운데에 둔다. 스위치 크기는 list.switch)
   */
  notifications: {
    dim: 0.4,
    skeleton: { label: 16, desc: 12, labelWidth: '40%' },
    /** 휴대폰 설정에서 꺼짐 줄(16-2-1): 안 여백 · 종 끈 그림 동그라미(옅은 주색 바탕) · 그림 · "설정 열기" 와 화살표 사이 · 화살표 */
    osOff: { padV: 14, padH: 16, icon: 36, glyph: 18, iconFill: 'rgba(71,82,255,0.14)', actionGap: 2, chevron: 16 },
  },
} as const;

/**
 * 문의(결정 058 · 065, 보드 16-8): 내역 한 줄(안 여백 · 글과 상태 사이 · 상태와 날짜 사이) · 상태 칩(높이 · 가로 여백 · 모서리 · 답변 왔어요의 옅은 보라
 * 바탕과 글자) · 종류 칩(높이 · 모서리 · 사이) · 내용 칸(높이 · 안 여백) · 카드(안 여백 · 사이) · 별명 답변 카드(옅은 주색 바탕 · 테두리 · 이름표 글자) ·
 * 비었을 때 · 보냈어요(둥근 그림 칸 · 아이콘 · 제목 위 · 설명 위)
 */
export const InquiryLayout = {
  row: { paddingV: 14, paddingH: 16, gap: 6, metaGap: 8 },
  /** 새 문의의 묶음(종류 · 내용) 사이 */
  groupGap: 22,
  status: { height: 22, paddingH: 8, radius: 11, answeredFill: 'rgba(154,163,255,0.14)', answeredText: '#C9CEFF' },
  category: { height: 36, radius: 18, gap: 6 },
  body: { height: 180, paddingV: 14, paddingH: 16 },
  card: { padding: 16, gap: 8 },
  answer: { fill: 'rgba(71,82,255,0.10)', border: 'rgba(154,163,255,0.28)', label: '#C9CEFF' },
  /** 비었을 때: 머리 아래 높이 560 칸의 가운데(보드 16-8 비었을 때) */
  empty: { height: 560, icon: 72, glyph: 32, titleTop: 20, bodyTop: 8 },
  /**
   * 처음 불러올 때 뼈대(다 그려진 화면과 같은 카드 · 같은 줄, 결정 065): 내역 줄 수 · 첫 줄 막대 높이 · 날짜 · 머리 막대 높이 · 상태 칩 너비 ·
   * 날짜 너비 · 답변 보기의 본문 줄 수
   */
  skeleton: { rows: 3, line: 16, meta: 12, chip: 56, date: 64, bodyLines: 3 },
  sent: { icon: 72, glyph: 34, titleTop: 24, bodyTop: 10, lift: 40 },
} as const;

/**
 * 공유 카드 v2(결정 053, 보드 12-7 · 12-14 · 11-7 · 14-6)의 값 — 시안의 360×640 카드 기준이다. 미리보기 · 공유 페이지 · 저장 이미지는
 * 이 값에 (카드 너비 / base)를 곱해 같은 모양으로 그린다. 위 · 옆 · 아래 여백, 해 별자리 그림(260×228), 영역 · 달 · 계단 그림(200, 위 14),
 * 칩(위 16 · 안 여백 · 13/18), 이름표(위 28 · 14/20), 제목(위 10 · 23/34), 아래 줄(위 16 · 로고 높이 19 · 한 줄 소개 12/17), 바탕의 작은 별 셋.
 */
export const ShareCardLayout = {
  base: 360,
  padTop: 48,
  padX: 28,
  padBottom: 36,
  sign: { width: 260, height: 228 },
  art: 200,
  artTop: 14,
  chip: { top: 16, padV: 6, padH: 14, text: type(13, 18, FontWeight.medium) },
  label: { top: 28, text: type(14, 20, FontWeight.medium) },
  title: { top: 10, text: type(23, 34, FontWeight.semibold) },
  foot: { padTop: 16, mark: 19, text: type(12, 17, FontWeight.regular) },
  dots: [
    { left: 28, top: 60, size: 2, opacity: 0.5 },
    { right: 40, top: 300, size: 2, opacity: 0.4 },
    { left: 60, top: 330, size: 3, opacity: 0.35 },
  ],
  /** 기다리는 동안의 뼈대(결정 071): 칩 · 이름표 · 제목 두 줄 · 한 줄 소개 막대의 폭(360 기준). 그림 · 로고는 카드와 같은 크기 */
  skeleton: { chip: 90, label: 140, title: [260, 180], tagline: 150 },
} as const;

/**
 * 알림 받기 권유 시트(보드 11-10, 결정 066 의 2): 별이 칸(빛무리 120 안에 그림 80, 시트 위 여백 32 가 보드의 손잡이 위 32 와 같아 더 띄우지 않는다) ·
 * 제목(20/30) 위 · 설명 위 · 받는 시간 줄(모서리 · 최소 높이 · 안 여백 · 사이 · 화살표) 위 · 버튼 묶음 위 · "나중에" 높이와 아래 사이
 */
export const PushAskLayout = {
  artTop: 0,
  glow: 120,
  byeoli: 80,
  titleTop: 16,
  titleLine: 30,
  bodyTop: 10,
  rowTop: 20,
  row: { radius: 14, minHeight: 52, paddingV: 12, paddingH: 16, gap: 12, chevron: 16 },
  buttonsTop: 20,
  later: 48,
  laterGap: 8,
} as const;

