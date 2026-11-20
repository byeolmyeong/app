import {
  calendarCells,
  formatDayLong,
  formatMonth,
  formatMonthDay,
  formatPeriod,
  inCalendarRange,
  koreaToday,
  monthOf,
  periodNow,
  shiftMonth,
  upcoming,
  weekdayOf,
  yearNow,
  yearSpan,
} from '@/features/timing/dates';
import type { TimingInterval } from '@/lib/api';

const interval = (id: string, from: string, to: string): TimingInterval => ({
  id,
  kind: 'OPPORTUNITY',
  from,
  to,
  area: 'SELF',
  title: id,
  body: id,
});
const ids = (list: TimingInterval[]) => list.map((i) => i.id);

// 옛 features/report/timing.ts 에서 옮긴 시험(그대로)
describe('시기: 날짜를 읽기 쉬운 글자로', () => {
  it('날짜는 해와 달까지만 적는다', () => {
    expect(formatMonth('2027-02-03')).toBe('2027년 2월');
    expect(formatMonth('2026-12-14')).toBe('2026년 12월');
  });

  it('기간은 시작 ~ 끝으로 적고, 같은 해면 해를 한 번만, 같은 달이면 달 하나만 적는다', () => {
    expect(formatPeriod('2025-04-18', '2027-02-03')).toBe('2025년 4월 ~ 2027년 2월');
    expect(formatPeriod('2026-10-02', '2026-12-14')).toBe('2026년 10월 ~ 12월');
    expect(formatPeriod('2026-10-02', '2026-10-02')).toBe('2026년 10월');
    expect(formatPeriod('2026-10-02', '2026-10-30')).toBe('2026년 10월');
  });
});

describe('시기: 그날의 이름(보드 14-4)', () => {
  it('달 · 날 · 요일을 날짜 글자에서 읽는다(달력의 요일 — 점성 계산이 아니다)', () => {
    expect(formatMonthDay('2026-11-21')).toBe('11월 21일');
    expect(formatDayLong('2026-11-21')).toBe('11월 21일 토요일');
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-25')).toBe(3);
    expect(weekdayOf('2024-02-29')).toBe(4);
  });

  it('기기의 오늘은 한국 날짜다(UTC 15시 = 한국 다음 날 0시)', () => {
    expect(koreaToday(Date.UTC(2026, 10, 19, 14, 59))).toBe('2026-11-19');
    expect(koreaToday(Date.UTC(2026, 10, 19, 15, 0))).toBe('2026-11-20');
    expect(monthOf('2026-11-20')).toBe('2026-11');
  });
});

describe('이번 달 달력(결정 049 의 2, 보드 14-1)', () => {
  it('달을 앞뒤로 옮긴다(해가 넘어가도)', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('칸: 1일의 요일만큼 앞을 비우고 그달의 날 수만큼, 끝은 일곱 칸을 채운다', () => {
    const nov = calendarCells('2026-11');
    expect(nov.slice(0, 1)).toEqual(['2026-11-01']);
    expect(nov.filter(Boolean)).toHaveLength(30);
    expect(nov).toHaveLength(35);
    expect(nov.slice(30)).toEqual([null, null, null, null, null]);
    const feb = calendarCells('2027-02');
    expect(feb.slice(0, 2)).toEqual([null, '2027-02-01']);
    expect(feb.filter(Boolean)).toHaveLength(28);
    expect(feb.length % 7).toBe(0);
    expect(calendarCells('2028-02').filter(Boolean)).toHaveLength(29);
  });

  it('누를 수 있는 날: 처음 받은 달의 지난달 1일 ~ 다음 달 말일(글자 비교)', () => {
    expect(inCalendarRange('2026-10-01', '2026-11')).toBe(true);
    expect(inCalendarRange('2026-09-30', '2026-11')).toBe(false);
    expect(inCalendarRange('2026-12-31', '2026-11')).toBe(true);
    expect(inCalendarRange('2027-01-01', '2026-11')).toBe(false);
    expect(inCalendarRange('2027-01-31', '2026-12')).toBe(true);
    expect(inCalendarRange('2025-12-01', '2026-01')).toBe(true);
  });
});

describe('올해의 흐름 띠(결정 049 의 3, 보드 14)', () => {
  it('띠는 그해에 걸친 달까지만: 시작 달의 앞 · 끝 달의 뒤(그해 밖이면 끝까지)', () => {
    expect(yearSpan(interval('a', '2026-09-03', '2027-01-28'), '2026')).toEqual({ left: 8 / 12, right: 1 });
    expect(yearSpan(interval('b', '2026-06-08', '2026-12-14'), '2026')).toEqual({ left: 5 / 12, right: 1 });
    expect(yearSpan(interval('c', '2026-02-09', '2026-04-21'), '2026')).toEqual({ left: 1 / 12, right: 4 / 12 });
    expect(yearSpan(interval('d', '2025-04-18', '2027-02-03'), '2026')).toEqual({ left: 0, right: 1 });
    expect(yearSpan(interval('e', '2025-01-01', '2025-12-31'), '2026')).toBeNull();
    expect(yearSpan(interval('f', '2027-01-01', '2027-02-01'), '2026')).toBeNull();
  });

  it('"지금" 표시는 그달 안의 날까지 비율로(11월 19일 = 10.6 / 12)', () => {
    expect(yearNow('2026-11-19')).toBeCloseTo(10.6 / 12, 5);
    expect(yearNow('2026-01-01')).toBe(0);
  });

  it('다가오는 시기: 오늘 뒤 1년 안에 시작하는 구간 앞에서 셋(받은 순서)', () => {
    const list = [
      interval('지금', '2026-09-03', '2027-01-28'),
      interval('오늘 시작', '2026-11-19', '2027-01-01'),
      interval('내일', '2026-11-20', '2026-12-01'),
      interval('봄', '2027-03-15', '2027-08-20'),
      interval('여름', '2027-06-01', '2027-07-01'),
      interval('1년째', '2027-11-19', '2028-01-01'),
      interval('1년 뒤', '2027-11-20', '2028-01-01'),
    ];
    expect(ids(upcoming(list, '2026-11-19'))).toEqual(['내일', '봄', '여름']);
    expect(ids(upcoming(list.slice(4), '2026-11-19'))).toEqual(['여름', '1년째']);
  });
});

describe('시기 자세히의 "지금" 자리(결정 049 의 5 — 점만, 숫자 없음)', () => {
  it('시작 ~ 끝 사이의 날 수 비율. 시작 전 · 끝난 뒤는 없다', () => {
    expect(periodNow('2026-09-01', '2026-12-31', '2026-09-01')).toBe(0);
    expect(periodNow('2026-09-01', '2026-12-31', '2026-12-31')).toBe(1);
    expect(periodNow('2026-11-01', '2026-11-03', '2026-11-02')).toBe(0.5);
    expect(periodNow('2026-11-01', '2026-11-03', '2026-10-31')).toBeNull();
    expect(periodNow('2026-11-01', '2026-11-03', '2026-11-04')).toBeNull();
    expect(periodNow('2026-11-01', '2026-11-01', '2026-11-01')).toBe(0.5);
  });
});
