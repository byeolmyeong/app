/**
 * 앱 버전 비교(결정 027). 점으로 나눈 숫자 1~3 마디만 읽는다("1.2.0" · "1.2" · "1"). 없는 마디는 0 이다.
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
