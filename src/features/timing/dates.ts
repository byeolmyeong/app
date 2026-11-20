/**
 * 시기 탭이 서버가 준 날짜 글자(YYYY-MM-DD · YYYY-MM)를 적고 거르고 놓는 방법(결정 049, 계획 "전역 제약").
 * 앱은 천체도 해도 나이도 대표 구간도 셈하지 않는다. 하는 일은 셋뿐이다: 받은 글자를 잘라 적기 · 글자끼리 비교해 거르기 ·
 * 달력 칸 배치(1일의 요일 · 그달의 날 수)와 그 위의 자리(띠 · "지금" 점). 날짜는 모두 한국 달력의 날짜다.
 * formatMonth · formatPeriod 는 옛 features/report/timing.ts 에서 옮겼다.
 */
import { strings } from '@/content/strings';
import type { TimingInterval } from '@/lib/api';

const D = strings.timing.date;

/** 한국 시각(UTC+9) */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** "다가오는 시기" 의 앞쪽 한도와 개수(계획의 기본값 — 오늘 뒤 1년 안에 시작하는 구간 앞에서 셋) */
const UPCOMING_YEARS = 1;
const UPCOMING_COUNT = 3;
const MONTHS = 12;

const yearOf = (date: string) => date.slice(0, 4);
const monthNum = (date: string) => Number(date.slice(5, 7));
const dayNum = (date: string) => Number(date.slice(8, 10));
const pad = (n: number) => String(n).padStart(2, '0');
const monthText = (date: string) => `${monthNum(date)}${D.monthSuffix}`;
/** 날짜 글자의 그날 0시(UTC 기준 날 수를 세는 데만 쓴다) */
const utcDay = (date: string) => Date.UTC(Number(yearOf(date)), monthNum(date) - 1, dayNum(date));

/** 기기의 오늘(한국 날짜). 달력의 "오늘" 표시 · 보관본이 오늘 것인지 견주는 데만 쓴다 */
export const koreaToday = (now: number = Date.now()) => new Date(now + KOREA_OFFSET_MS).toISOString().slice(0, 10);

/** "2026-11-20" → "2026-11" */
export const monthOf = (date: string) => date.slice(0, 7);

/** "2027-02-03" → "2027년 2월" */
export const formatMonth = (date: string) => `${yearOf(date)}${D.yearSuffix} ${monthText(date)}`;

/** 기간: "2025년 4월 ~ 2027년 2월". 같은 해면 해를 한 번만, 같은 달이면 달 하나만 적는다 */
export function formatPeriod(from: string, to: string): string {
  if (yearOf(from) !== yearOf(to)) return `${formatMonth(from)}${D.periodSeparator}${formatMonth(to)}`;
  if (monthNum(from) !== monthNum(to)) return `${formatMonth(from)}${D.periodSeparator}${monthText(to)}`;
  return formatMonth(from);
}

/** "2026-11-21" → "9월" 처럼 달만(시기 자세히의 "9월 시작") */
export const formatMonthOnly = monthText;

/** "2026-11-21" → "11월 21일" */
export const formatMonthDay = (date: string) => `${monthText(date)} ${dayNum(date)}${D.daySuffix}`;

/** 요일(0 일요일 ~ 6 토요일) — 달력의 칸 배치 */
export const weekdayOf = (date: string) => new Date(utcDay(date)).getUTCDay();

/** "2026-11-21" → "11월 21일 토요일" */
export const formatDayLong = (date: string) => `${formatMonthDay(date)} ${strings.timing.weekdays[weekdayOf(date)]}${D.weekdaySuffix}`;

/** "2026-11" 을 delta 달만큼 옮긴다 */
export function shiftMonth(month: string, delta: number): string {
  const index = Number(month.slice(0, 4)) * MONTHS + Number(month.slice(5, 7)) - 1 + delta;
  return `${Math.floor(index / MONTHS)}-${pad((index % MONTHS) + 1)}`;
}

/** 그달의 날 수 */
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

/** 달력 칸: 1일의 요일만큼 앞을 비우고(null) 그달의 날짜 글자, 끝은 일곱 칸 줄을 채운다 */
export function calendarCells(month: string): (string | null)[] {
  const lead = weekdayOf(`${month}-01`);
  const days = Array.from({ length: daysIn(month) }, (_, i) => `${month}-${pad(i + 1)}`);
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** 누를 수 있는 날인가: 처음 받은 달(base)의 지난달 1일 ~ 다음 달 말일(서버 결정 034 의 범위와 같다) */
export function inCalendarRange(date: string, base: string): boolean {
  const first = `${shiftMonth(base, -1)}-01`;
  const lastMonth = shiftMonth(base, 1);
  return date >= first && date <= `${lastMonth}-${pad(daysIn(lastMonth))}`;
}

/**
 * 올해의 흐름 띠의 자리(0~1): 그해에 걸친 달까지만 — 시작 달의 앞(그해 전에 시작했으면 0) · 끝 달의 뒤(그해 뒤에 끝나면 1).
 * 그해에 걸치지 않으면 null. 날짜 글자를 잘라 놓을 뿐이다.
 */
export function yearSpan(interval: TimingInterval, year: string): { left: number; right: number } | null {
  if (interval.to < `${year}-01-01` || interval.from > `${year}-12-31`) return null;
  const left = yearOf(interval.from) < year ? 0 : (monthNum(interval.from) - 1) / MONTHS;
  const right = yearOf(interval.to) > year ? 1 : monthNum(interval.to) / MONTHS;
  return { left, right };
}

/** 띠 위의 "지금"(0~1): 그달 안의 날까지 비율로 */
export const yearNow = (today: string) => (monthNum(today) - 1 + (dayNum(today) - 1) / daysIn(monthOf(today))) / MONTHS;

/** 날짜 글자의 해만 옮긴다. 거르는 기준으로만 쓰고 화면에 적지 않는다 */
const shiftYears = (date: string, years: number) => `${Number(yearOf(date)) + years}${date.slice(4)}`;

/** 다가오는 시기: 오늘 뒤 1년 안에 시작하는 구간을 받은 순서(시작 순서)로 앞에서 셋 */
export function upcoming(intervals: TimingInterval[], today: string): TimingInterval[] {
  const until = shiftYears(today, UPCOMING_YEARS);
  return intervals.filter((i) => i.from > today && i.from <= until).slice(0, UPCOMING_COUNT);
}

/** 시기 자세히의 "지금" 자리(0~1): 시작 ~ 끝 사이의 날 수 비율. 시작 전이거나 끝난 뒤면 null. 하루짜리는 가운데 */
export function periodNow(from: string, to: string, today: string): number | null {
  if (today < from || today > to) return null;
  const span = (utcDay(to) - utcDay(from)) / DAY_MS;
  return span === 0 ? 0.5 : (utcDay(today) - utcDay(from)) / DAY_MS / span;
}
