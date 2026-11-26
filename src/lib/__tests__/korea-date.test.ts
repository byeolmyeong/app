import { koreanToday } from '@/lib/korea-date';

describe('한국 날짜의 오늘(UTC+9)', () => {
  it('YYYY-MM-DD 로, UTC 로는 아직 어제여도 한국 날짜로 센다', () => {
    expect(koreanToday(Date.parse('2026-11-20T15:30:00Z'))).toBe('2026-11-21');
    expect(koreanToday(Date.parse('2026-11-20T14:59:59Z'))).toBe('2026-11-20');
  });
});
