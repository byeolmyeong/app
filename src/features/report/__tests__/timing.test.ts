import {
  formatMonth,
  formatPeriod,
  groupByYear,
  nextYearLabel,
  splitByNow,
  splitByWindow,
} from '@/features/report/timing';
import type { TimingInterval } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const { intervals, current } = fixtures.report.timing;
const ids = (list: TimingInterval[]) => list.map((i) => i.id);
const interval = (id: string, from: string, to: string): TimingInterval => ({
  id,
  kind: 'OPPORTUNITY',
  from,
  to,
  area: 'SELF',
  title: id,
  body: id,
});

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

describe('시기: 지금 앞뒤 10년 먼저', () => {
  it('to >= 오늘-10년 && from <= 오늘+10년 인 구간이 먼저 보이는 것이고, 나머지는 그 앞과 뒤다', () => {
    expect(current.date).toBe('2026-11-11');
    const { earlier, around, later } = splitByWindow(intervals, current.date);
    expect(ids(earlier)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
    expect(ids(around)).toEqual([
      'i6',
      'i7',
      'i8',
      'i9',
      'i10',
      'i11',
      'i12',
      'i13',
      'i14',
      'i15',
      'i16',
      'i17',
      'i18',
    ]);
    expect(ids(later)).toEqual(['i19', 'i20', 'i21', 'i22', 'i23']);
  });

  it('경계의 날짜는 먼저 보이는 쪽에 든다(글자 비교)', () => {
    const list = [
      interval('a', '2010-01-01', '2016-11-10'),
      interval('b', '2010-01-01', '2016-11-11'),
      interval('c', '2036-11-11', '2037-01-01'),
      interval('d', '2036-11-12', '2037-01-01'),
    ];
    const { earlier, around, later } = splitByWindow(list, '2026-11-11');
    expect([ids(earlier), ids(around), ids(later)]).toEqual([['a'], ['b', 'c'], ['d']]);
  });

  it('일찍 시작해 지금까지 이어지는 긴 구간은 먼저 보이는 쪽에 든다', () => {
    const list = [interval('long', '2001-01-01', '2030-01-01'), interval('short', '2002-01-01', '2002-03-01')];
    const { earlier, around } = splitByWindow(list, '2026-11-11');
    expect([ids(earlier), ids(around)]).toEqual([['short'], ['long']]);
  });
});

describe('시기: 시작한 해로 묶기', () => {
  it('받은 순서를 지키며 시작한 해마다 한 묶음을 만든다', () => {
    const groups = groupByYear([
      interval('a', '2025-04-18', '2027-02-03'),
      interval('b', '2026-10-02', '2026-12-14'),
      interval('c', '2026-11-30', '2028-01-01'),
      interval('d', '2028-01-27', '2028-11-08'),
    ]);
    expect(groups.map((g) => [g.year, ids(g.intervals)])).toEqual([
      ['2025', ['a']],
      ['2026', ['b', 'c']],
      ['2028', ['d']],
    ]);
  });
});

describe('시기: 다음 해의 이름표', () => {
  it('서버가 준 오늘(current.date)의 해 글자 다음 해를 글자로 준다', () => {
    expect(nextYearLabel('2026-11-11')).toBe('2027');
    expect(nextYearLabel('2026-12-31')).toBe('2027');
    expect(nextYearLabel('2099-01-01')).toBe('2100');
    expect(nextYearLabel('1999-06-15')).toBe('2000');
  });
});

describe('시기: 지난 것 · 지금 · 올해 · 내년 · 앞으로 나누기', () => {
  const split = (list: TimingInterval[], today: string) => {
    const s = splitByNow(list, today);
    return [ids(s.past), ids(s.ongoing), ids(s.thisYear), ids(s.nextYear), ids(s.ahead)];
  };

  it('예시 리포트(오늘 2026-11-11)를 다섯으로 나눈다. 하나도 빠지거나 겹치지 않는다', () => {
    const s = splitByNow(intervals, current.date);
    expect(ids(s.past)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10']);
    expect(ids(s.ongoing)).toEqual(['i11', 'i12']);
    expect(ids(s.thisYear)).toEqual([]);
    expect(ids(s.nextYear)).toEqual(['i13']);
    expect(ids(s.ahead)).toEqual(['i14', 'i15', 'i16', 'i17', 'i18', 'i19', 'i20', 'i21', 'i22', 'i23']);
    expect([...s.past, ...s.ongoing, ...s.thisYear, ...s.nextYear, ...s.ahead]).toEqual(intervals);
    // 지금 걸친 것은 서버가 준 current.intervals 와 같다
    expect(ids(s.ongoing)).toEqual(ids(current.intervals));
  });

  it('경계의 날짜는 글자 비교로 가른다: 오늘 끝나는 것 · 오늘 시작하는 것은 지금, 내년 마지막 날에 시작하면 내년', () => {
    const list = [
      interval('어제 끝남', '2026-01-01', '2026-11-10'),
      interval('오늘 끝남', '2026-01-01', '2026-11-11'),
      interval('오늘 시작', '2026-11-11', '2029-01-01'),
      interval('내일 시작', '2026-11-12', '2026-11-20'),
      interval('올해 마지막 날 시작', '2026-12-31', '2030-01-01'),
      interval('내년 첫날 시작', '2027-01-01', '2027-01-02'),
      interval('내년 마지막 날 시작', '2027-12-31', '2040-01-01'),
      interval('내후년 첫날 시작', '2028-01-01', '2028-02-01'),
    ];
    expect(split(list, '2026-11-11')).toEqual([
      ['어제 끝남'],
      ['오늘 끝남', '오늘 시작'],
      ['내일 시작', '올해 마지막 날 시작'],
      ['내년 첫날 시작', '내년 마지막 날 시작'],
      ['내후년 첫날 시작'],
    ]);
  });

  it('오늘이 그해의 마지막 날이어도 내년은 다음 해 글자다', () => {
    const list = [interval('a', '2027-01-01', '2027-02-01'), interval('b', '2028-01-01', '2028-02-01')];
    expect(split(list, '2026-12-31')).toEqual([[], [], [], ['a'], ['b']]);
  });

  it('변곡점도 같은 방법으로 나눈다(from · to 만 본다)', () => {
    const s = splitByNow(fixtures.report.timing.milestones, current.date);
    expect(s.past.map((m) => m.kind)).toEqual(['SATURN_SQUARE']);
    expect(s.ahead.map((m) => m.kind)).toEqual(['SATURN_RETURN', 'URANUS_OPPOSITION', 'SECOND_SATURN_RETURN']);
    expect([...s.ongoing, ...s.thisYear, ...s.nextYear]).toEqual([]);
  });
});
