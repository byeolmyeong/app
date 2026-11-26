/**
 * 앱 버전 비교(결정 027)와 업데이트 권유 판정(결정 059). 점으로 나눈 숫자 1~3 마디만 읽는다("1.2.0" · "1.2" · "1"). 없는 마디는 0 이다.
 */

/** 읽을 수 없으면 null */
function parse(v: unknown): [number, number, number] | null {
  if (typeof v !== 'string' || !/^\d{1,9}(\.\d{1,9}){0,2}$/.test(v)) return null;
  const [major, minor = 0, patch = 0] = v.split('.').map(Number);
  return [major, minor, patch];
}

/** 내 버전이 최소 버전보다 낮은가. 어느 한쪽이라도 읽을 수 없으면 false 다(막지 않는다) */
export function isBelowVersion(mine: unknown, min: unknown): boolean {
  const a = parse(mine);
  const b = parse(min);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * 업데이트를 권할까(결정 059): 내 버전이 최신보다 낮고 최소 이상이며, 이 최신 버전을 아직 묻지 않았을 때만.
 * 최소보다 낮으면 권하지 않는다(막는 화면이 대신한다). 내 버전 · 최신을 읽을 수 없으면 권하지 않는다.
 */
export function shouldSuggestUpdate(current: unknown, latest: unknown, min: unknown, lastAsked: string | null): boolean {
  return isBelowVersion(current, latest) && !isBelowVersion(current, min) && latest !== lastAsked;
}
