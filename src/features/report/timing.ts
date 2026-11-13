/**
 * 시기 탭이 서버가 준 날짜 글자(YYYY-MM-DD)를 적고 거르고 묶는 방법.
 * 앱은 천체도 해도 나이도 계산하지 않는다. 받은 글자를 잘라 적고, 글자끼리 비교할 뿐이다.
 * 날짜 일은 둘뿐이다: 계약이 정한 "지금 앞뒤 10년" 거르기(서버 저장소 docs/architecture.md "시기")와,
 * 오늘의 해 글자 다음 해의 이름표로 "올해 · 내년" 을 묶는 것(결정 031). 오늘은 서버의 `current.date` 다.
 */
import { strings } from '@/content/strings';
import type { TimingInterval } from '@/lib/api';

const T = strings.report.timing;

/** 지금 앞뒤로 먼저 보여 주는 햇수(F4) */
const WINDOW_YEARS = 10;

const yearOf = (date: string) => date.slice(0, 4);
/** "03" → "3" */
const monthOf = (date: string) => String(Number(date.slice(5, 7)));
const monthText = (date: string) => `${monthOf(date)}${T.monthSuffix}`;

/** "2027-02-03" → "2027년 2월" */
export const formatMonth = (date: string) => `${yearOf(date)}${T.yearSuffix} ${monthText(date)}`;

/** 기간: "2025년 4월 ~ 2027년 2월". 같은 해면 해를 한 번만, 같은 달이면 달 하나만 적는다 */
export function formatPeriod(from: string, to: string): string {
  if (yearOf(from) !== yearOf(to)) return `${formatMonth(from)}${T.periodSeparator}${formatMonth(to)}`;
  if (monthOf(from) !== monthOf(to)) return `${formatMonth(from)}${T.periodSeparator}${monthText(to)}`;
  return formatMonth(from);
}

/** 서버가 준 해와 만 나이를 그대로 적는다: "2029년 · 만 29세" */
export const formatYearAge = (year: number, age: number) =>
  `${year}${T.yearSuffix}${T.separator}${T.agePrefix}${age}${T.ageSuffix}`;

/** 날짜 글자의 해만 옮긴다. 거르는 기준으로만 쓰고 화면에 적지 않는다 */
const shiftYears = (date: string, years: number) => `${Number(yearOf(date)) + years}${date.slice(4)}`;

/**
 * 오늘(today = 서버의 `current.date`) 앞뒤 10년에 걸친 구간(around)과 그 앞(earlier) · 뒤(later).
 * 계약의 식 그대로다: `to >= 오늘-10년 && from <= 오늘+10년`. 받은 순서(시작 순서)를 지킨다.
 */
export function splitByWindow(intervals: TimingInterval[], today: string) {
  const lo = shiftYears(today, -WINDOW_YEARS);
  const hi = shiftYears(today, WINDOW_YEARS);
  return {
    earlier: intervals.filter((i) => i.to < lo),
    around: intervals.filter((i) => i.to >= lo && i.from <= hi),
    later: intervals.filter((i) => i.from > hi),
  };
}

/** 오늘의 해 글자 다음 해의 이름표: "2026-11-11" → "2027". 묶는 기준과 묶음 제목에만 쓴다(결정 031) */
export const nextYearLabel = (today: string) => String(Number(yearOf(today)) + 1);

/**
 * 오늘(today = 서버의 `current.date`)을 기준으로 다섯으로 나눈다(결정 031). 날짜 글자끼리 비교할 뿐이고 받은 순서를 지킨다.
 * 지난 것(past) · 지금 걸친 것(ongoing) · 올해 남은 기간에 시작(thisYear) · 내년에 시작(nextYear) · 내년 뒤에 시작(ahead).
 * 변곡점과 구간이 함께 쓴다.
 */
export function splitByNow<P extends { from: string; to: string }>(items: P[], today: string) {
  const thisYear = yearOf(today);
  const nextYear = nextYearLabel(today);
  const nextYearEnd = `${nextYear}-12-31`;
  return {
    past: items.filter((i) => i.to < today),
    ongoing: items.filter((i) => i.from <= today && i.to >= today),
    thisYear: items.filter((i) => i.from > today && yearOf(i.from) === thisYear),
    nextYear: items.filter((i) => yearOf(i.from) === nextYear),
    ahead: items.filter((i) => i.from > nextYearEnd),
  };
}

/** 시작한 해마다 한 묶음. 받은 순서(시작 순서)를 지킨다 */
export function groupByYear(intervals: TimingInterval[]): { year: string; intervals: TimingInterval[] }[] {
  const groups: { year: string; intervals: TimingInterval[] }[] = [];
  for (const interval of intervals) {
    const year = yearOf(interval.from);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.intervals.push(interval);
    else groups.push({ year, intervals: [interval] });
  }
  return groups;
}

/** 큰 변화 구간. 크기는 서버가 정해 준다(변화 구간에만 있다) */
export const isBigChange = (interval: TimingInterval) => interval.kind === 'CHANGE' && interval.size === 'BIG';
