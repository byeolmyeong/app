/** 한국 시각(UTC+9). 서버의 날짜(그날의 하늘 · 시기)는 한국 날짜다 */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 날짜의 오늘, YYYY-MM-DD(기기 시계 기준) */
export function koreanToday(now: number = Date.now()): string {
  return new Date(now + KOREA_OFFSET_MS).toISOString().slice(0, 10);
}
