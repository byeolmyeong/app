/**
 * 화면 이름으로 보내는 경로 패턴(결정 040). `src/app` 의 화면 파일과 같아야 한다(테스트가 확인한다).
 * 실제 주소를 보내지 않는다: 공유 id 는 그 자체로 열쇠고, 카카오 웹 로그인이 돌아오는 주소에는 인증 코드가 있다.
 */
export const ROUTE_PATTERNS = [
  '/',
  '/auth/google',
  '/auth/kakao',
  '/birth',
  '/chart',
  '/chart/detail',
  '/intro',
  '/login',
  '/me',
  '/my',
  '/my/account',
  '/my/birth',
  '/my/delete',
  '/my/inquiries',
  '/my/inquiries/[id]',
  '/my/inquiries/new',
  '/my/music',
  '/my/nickname',
  '/my/notifications',
  '/notifications',
  '/reading',
  '/s/[shareId]',
  '/settings/faq',
  '/settings/inquiry',
  '/settings/marketing',
  '/settings/privacy',
  '/settings/privacy-consent',
  '/settings/terms',
  '/signup/birth',
  '/signup/nickname',
  '/signup/terms',
  '/suspended',
  '/synastry',
  '/synastry/[id]',
  '/synastry/[id]/direction',
  '/synastry/[id]/report',
  '/synastry/ranking',
  '/timing',
  '/timing/day',
  '/timing/period',
  '/today',
] as const;

export type RoutePattern = (typeof ROUTE_PATTERNS)[number] | '(unknown)';

const isDynamic = (segment: string) => segment.startsWith('[') && segment.endsWith(']');
const segmentsOf = (path: string) => path.split('/').filter(Boolean);

/** 정적 조각이 많은 패턴이 먼저다(`/synastry/ranking` 이 `/synastry/[id]` 보다 먼저) */
const ORDERED = [...ROUTE_PATTERNS].sort(
  (a, b) => segmentsOf(b).filter((s) => !isDynamic(s)).length - segmentsOf(a).filter((s) => !isDynamic(s)).length,
);

/** 주소를 경로 패턴으로 바꾼다. 쿼리·조각은 버리고, 모르는 주소는 옮기지 않고 `(unknown)` 이다 */
export function screenNameOf(pathname: string): RoutePattern {
  const segments = segmentsOf(pathname.split(/[?#]/)[0] ?? '');
  for (const pattern of ORDERED) {
    const parts = segmentsOf(pattern);
    if (parts.length === segments.length && parts.every((p, i) => isDynamic(p) || p === segments[i])) return pattern;
  }
  return '(unknown)';
}
