import { strings } from '@/content/strings';
import { formatBirthSummary, parseBirthDate, parseBirthTime, validateBirthInput } from '@/features/chart/birth-input';

const today = new Date(2026, 10, 10); // 2026-11-10 (기기 날짜)
const place = { id: 1841277, name: '서울특별시 마포구' };
const E = strings.home.errors;

describe('parseBirthDate', () => {
  it('YYYY-MM-DD 와 점·숫자만 적은 꼴을 받는다', () => {
    expect(parseBirthDate('2000-06-15', today)).toEqual({ ok: true, value: '2000-06-15' });
    expect(parseBirthDate('2000. 6. 15.', today)).toEqual({ ok: true, value: '2000-06-15' });
    expect(parseBirthDate('20000615', today)).toEqual({ ok: true, value: '2000-06-15' });
  });

  it('1900-01-01 이전은 거절하고 1900-01-01 은 받는다', () => {
    expect(parseBirthDate('1899-12-31', today)).toEqual({ ok: false, error: E.dateTooEarly });
    expect(parseBirthDate('1900-01-01', today)).toEqual({ ok: true, value: '1900-01-01' });
  });

  it('오늘 이후는 거절하고 오늘은 받는다', () => {
    expect(parseBirthDate('2026-11-11', today)).toEqual({ ok: false, error: E.dateFuture });
    expect(parseBirthDate('2027-01-01', today)).toEqual({ ok: false, error: E.dateFuture });
    expect(parseBirthDate('2026-11-10', today)).toEqual({ ok: true, value: '2026-11-10' });
  });

  it('없는 날짜와 틀린 꼴을 거절한다', () => {
    for (const text of ['', '2000', '2000-13-01', '2001-02-29', '2000-06-31', 'abcd-ef-gh', '2000-6'])
      expect(parseBirthDate(text, today)).toEqual({ ok: false, error: E.dateFormat });
    expect(parseBirthDate('2000-02-29', today).ok).toBe(true);
  });
});

describe('parseBirthTime', () => {
  it('24시간 HH:mm 을 분 단위로 받는다', () => {
    expect(parseBirthTime('21:00')).toEqual({ ok: true, value: '21:00' });
    expect(parseBirthTime('9:05')).toEqual({ ok: true, value: '09:05' });
    expect(parseBirthTime('0000')).toEqual({ ok: true, value: '00:00' });
    expect(parseBirthTime('2359')).toEqual({ ok: true, value: '23:59' });
  });

  it('범위 밖과 틀린 꼴을 거절한다', () => {
    for (const text of ['', '24:00', '12:60', '9', 'ab:cd', '123456'])
      expect(parseBirthTime(text)).toEqual({ ok: false, error: E.timeFormat });
  });
});

describe('validateBirthInput', () => {
  it('모두 맞으면 서버 요청 모양과 보관할 출생 정보를 준다', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '21:00', timeUnknown: false, place }, today);
    expect(r).toEqual({
      ok: true,
      input: { date: '2000-06-15', time: '21:00', placeId: 1841277 },
      profile: { date: '2000-06-15', time: '21:00', place },
    });
  });

  it('시각 "모름" 이면 시각 칸을 보지 않고 time 을 null 로 보낸다', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '', timeUnknown: true, place }, today);
    expect(r.ok && r.input.time).toBeNull();
  });

  it('틀린 칸마다 오류를 돌려준다', () => {
    const r = validateBirthInput({ dateText: '1800-01-01', timeText: '99', timeUnknown: false, place: null }, today);
    expect(r).toEqual({
      ok: false,
      errors: { date: E.dateTooEarly, time: E.timeFormat, place: E.placeRequired },
    });
  });
});

describe('formatBirthSummary', () => {
  it('날짜·시각·출생지를 한 줄로 적는다', () => {
    expect(formatBirthSummary({ date: '2000-06-15', time: '21:00', place })).toBe('2000. 6. 15. 오후 9:00 · 서울특별시 마포구');
    expect(formatBirthSummary({ date: '1990-01-01', time: '00:05', place })).toBe('1990. 1. 1. 오전 12:05 · 서울특별시 마포구');
    expect(formatBirthSummary({ date: '2000-06-15', time: null, place })).toBe('2000. 6. 15. · 서울특별시 마포구');
  });
});
