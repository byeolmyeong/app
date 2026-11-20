import { clockToWheel, formatClock, wheelToClock } from '@/components/time-wheel';

describe('시각 드럼의 값 바꾸기(시안 8-1 · 받는 시간)', () => {
  it.each([
    ['00:00', { period: 'AM', hour: 12, minute: 0 }, '오전 12:00'],
    ['08:05', { period: 'AM', hour: 8, minute: 5 }, '오전 8:05'],
    ['12:30', { period: 'PM', hour: 12, minute: 30 }, '오후 12:30'],
    ['23:55', { period: 'PM', hour: 11, minute: 55 }, '오후 11:55'],
  ] as const)('"%s" ↔ 고르기 값, 글자는 "%s"', (clock, wheel, text) => {
    expect(clockToWheel(clock)).toEqual(wheel);
    expect(wheelToClock(wheel)).toBe(clock);
    expect(formatClock(clock)).toBe(text);
  });

  it.each(['8:00', '24:00', '08:60', '', '0800'])('꼴이 틀린 "%s" 는 null · 빈 글자', (clock) => {
    expect(clockToWheel(clock)).toBeNull();
    expect(formatClock(clock)).toBe('');
  });
});
