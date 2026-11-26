/** 한국 시각(UTC+9) — 날짜를 한국 날짜로 센다 */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const koreanDay = (ms: number) => Math.floor((ms + KOREA_OFFSET_MS) / DAY_MS);

/**
 * "별명을 받은 지 N일"(결정 047 의 1-2): 받은 때(`createdAt`, UTC ISO-8601)의 한국 날짜부터 지금의 한국 날짜까지, 받은 날이 1일.
 * 읽을 수 없는 시각이거나 기기 시계가 받은 때보다 앞이면 null — 그때는 칸을 적지 않는다.
 */
export function daysSince(createdAt: string, now: number): number | null {
  const at = Date.parse(createdAt);
  if (Number.isNaN(at)) return null;
  const days = koreanDay(now) - koreanDay(at) + 1;
  return days >= 1 ? days : null;
}
