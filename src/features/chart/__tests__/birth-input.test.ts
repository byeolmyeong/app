import { strings } from '@/content/strings';
import {
  birthInputOf,
  formatBirthLine,
  formatBirthSummary,
  formatDateTyping,
  formatTimeDisplay,
  fromTimePick,
  toTimePick,
  parseBirthDate,
  parseBirthTime,
  validateBirthInput,
} from '@/features/chart/birth-input';

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

  it('시각 "모름" 이어도 고른 곳은 기기에 둔다. 서버에는 보내지 않는다(placeId null — 서버가 읽지 않는다, 결정 042)', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '', timeUnknown: true, place }, today);
    expect(r).toEqual({
      ok: true,
      input: { date: '2000-06-15', time: null, placeId: null },
      profile: { date: '2000-06-15', time: null, place },
    });
  });

  it('시각 "모름" 이면 태어난 곳이 없어도 되고, placeId 와 보관할 곳은 null 이다(결정 020)', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '', timeUnknown: true, place: null }, today);
    expect(r).toEqual({
      ok: true,
      input: { date: '2000-06-15', time: null, placeId: null },
      profile: { date: '2000-06-15', time: null, place: null },
    });
  });

  it('시각 "모름" 이면 앞서 고른 시각 · 곳을 보내지 않는다(곳은 기기에만 남는다, 결정 042)', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '21:00', timeUnknown: true, place }, today);
    expect(r.ok && r.input).toEqual({ date: '2000-06-15', time: null, placeId: null });
    expect(r.ok && r.profile.place).toEqual(place);
  });

  it('시각을 넣었으면 태어난 곳이 필수다', () => {
    const r = validateBirthInput({ dateText: '2000-06-15', timeText: '21:00', timeUnknown: false, place: null }, today);
    expect(r).toEqual({ ok: false, errors: { place: E.placeRequired } });
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
  });

  it('시각 "모름" 이면 곳 없이 날짜와 "태어난 시각 모름" 을 적는다', () => {
    expect(formatBirthSummary({ date: '2000-06-15', time: null, place: null })).toBe('2000. 6. 15. · 태어난 시각 모름');
    // 예전에 보관된 값(시각 모름 + 곳)도 곳을 적지 않는다
    expect(formatBirthSummary({ date: '2000-06-15', time: null, place })).toBe('2000. 6. 15. · 태어난 시각 모름');
  });
});

describe('formatBirthLine — 마이 별명 카드의 출생 정보 한 줄(결정 056, 보드 16)', () => {
  it('"1999년 3월 8일 · 오후 2:10 · 서울 강남구" 꼴로 적는다(시 · 도는 짧은 이름)', () => {
    expect(formatBirthLine({ date: '1999-03-08', time: '14:10', place: { id: 1, name: '서울특별시 강남구' } })).toBe(
      '1999년 3월 8일 · 오후 2:10 · 서울 강남구',
    );
    expect(formatBirthLine({ date: '2000-12-01', time: '00:05', place: { id: 2, name: '세종특별자치시' } })).toBe(
      '2000년 12월 1일 · 오전 12:05 · 세종',
    );
  });

  it('시각 "모름" 이면 곳 없이 "시각 모름" 을 적는다(예전에 보관된 곳도 적지 않는다)', () => {
    expect(formatBirthLine({ date: '1999-03-08', time: null, place: null })).toBe('1999년 3월 8일 · 시각 모름');
    expect(formatBirthLine({ date: '1999-03-08', time: null, place })).toBe('1999년 3월 8일 · 시각 모름');
  });

  it('곳 이름을 찾지 못해 비어 있으면 곳 칸을 빼고 적는다', () => {
    expect(formatBirthLine({ date: '1999-03-08', time: '14:10', place: { id: 1, name: '' } })).toBe('1999년 3월 8일 · 오후 2:10');
  });
});

describe('birthInputOf', () => {
  it('보관된 출생 정보를 서버 요청 모양으로 바꾼다', () => {
    expect(birthInputOf({ date: '2000-06-15', time: '21:00', place })).toEqual({
      date: '2000-06-15',
      time: '21:00',
      placeId: 1841277,
    });
  });

  it('시각 "모름" 이면 placeId 는 null 이다. 곳이 남아 있어도 보내지 않는다', () => {
    const expected = { date: '2000-06-15', time: null, placeId: null };
    expect(birthInputOf({ date: '2000-06-15', time: null, place: null })).toEqual(expected);
    expect(birthInputOf({ date: '2000-06-15', time: null, place })).toEqual(expected);
  });
});

describe('입력하는 동안 자동으로 꼴을 맞춘다', () => {
  it('날짜: 숫자만 쳐도 YYYY-MM-DD 가 된다', () => {
    expect(formatDateTyping('2')).toBe('2');
    expect(formatDateTyping('2000')).toBe('2000');
    expect(formatDateTyping('20000')).toBe('2000-0');
    expect(formatDateTyping('200006')).toBe('2000-06');
    expect(formatDateTyping('20000615')).toBe('2000-06-15');
    expect(formatDateTyping('2000-06-15')).toBe('2000-06-15');
    expect(formatDateTyping('200006159')).toBe('2000-06-15');
    expect(formatDateTyping('2000년 abc')).toBe('2000');
  });

  it('날짜: 한 자리로 끝날 수밖에 없는 월·일은 앞에 0 을 붙인다', () => {
    expect(formatDateTyping('20006')).toBe('2000-06');
    expect(formatDateTyping('2000069')).toBe('2000-06-09');
    expect(formatDateTyping('20001')).toBe('2000-1');
  });

  it('날짜: 지울 때 붙임표에서 막히지 않는다', () => {
    expect(formatDateTyping('2000-')).toBe('2000');
    expect(formatDateTyping('2000-06-')).toBe('2000-06');
  });

});

describe('시각 고르기(오전/오후 · 시 · 분)', () => {
  it('HH:mm 과 고르기 값을 서로 바꾼다. 자정은 오전 12시, 정오는 오후 12시다', () => {
    expect(toTimePick('00:05')).toEqual({ period: 'AM', hour: 12, minute: 5 });
    expect(toTimePick('09:30')).toEqual({ period: 'AM', hour: 9, minute: 30 });
    expect(toTimePick('12:00')).toEqual({ period: 'PM', hour: 12, minute: 0 });
    expect(toTimePick('21:00')).toEqual({ period: 'PM', hour: 9, minute: 0 });
    expect(toTimePick('')).toBeNull();
    for (const time of ['00:00', '00:59', '11:59', '12:00', '12:01', '23:59'])
      expect(fromTimePick(toTimePick(time)!)).toBe(time);
  });

  it('칸에는 "오후 9:00" 꼴로 적는다', () => {
    expect(formatTimeDisplay('21:00')).toBe('오후 9:00');
    expect(formatTimeDisplay('00:05')).toBe('오전 12:05');
    expect(formatTimeDisplay('')).toBe('');
  });
});
