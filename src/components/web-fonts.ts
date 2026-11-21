import { FontFamily } from '@/constants/theme';

/**
 * 웹 글꼴(성능 계획 docs/plans/2026-11-21-app-perf.md 의 1). Pretendard 공식 배포의 woff2 를 고치지 않고 `public/` 에 둔다
 * (OFL 의 Reserved Font Name 때문에 직접 자른 글꼴은 그 이름을 쓸 수 없다 — 저작자가 낸 부분 글꼴만, scripts/pretendard-web.py).
 * - 핵심 묶음: 정적 부분 글꼴(영문 · 숫자 · 기호 + 한글 2,780자 — KS X 1001 2,350자와 자주 쓰는 글자). 루트 HTML 이 미리 받고 스플래시가 기다린다.
 * - 드문 글자: 동적 조각(`dynamic.css`, 핵심에 없는 글자만 unicode-range) — 그 글자가 화면에 있을 때만 받는다.
 * 앱(iOS · 안드로이드)은 기기에 실린 OTF 를 쓴다(use-app-fonts.ts).
 */
export const WEB_FONT_DIR = '/fonts/pretendard/1.3.9';

/** 앱이 쓰는 굵기 셋(theme.ts FontWeight)의 핵심 묶음 */
export const WEB_FONTS = [
  { weight: 400, file: 'Pretendard-Regular.subset.woff2' },
  { weight: 500, file: 'Pretendard-Medium.subset.woff2' },
  { weight: 600, file: 'Pretendard-SemiBold.subset.woff2' },
] as const;

/**
 * 핵심 묶음의 @font-face — unicode-range 없이 적어 dynamic.css 의 조각보다 앞에 둔다. 같은 이름 · 굵기의 규칙은 뒤에 적힌 것부터 보므로
 * 조각(핵심에 없는 글자만)이 그 글자를 맡고, 나머지는 모두 핵심 묶음이 맡는다.
 */
export function webCoreFontCss(): string {
  return WEB_FONTS.map(
    (f) => `@font-face{font-family:'${FontFamily}';font-weight:${f.weight};font-display:swap;src:url(${WEB_FONT_DIR}/${f.file}) format('woff2')}`,
  ).join('\n');
}
