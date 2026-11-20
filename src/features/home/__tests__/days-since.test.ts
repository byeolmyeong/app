import { daysSince } from '@/features/home/days-since';

// "별명을 받은 지 N일": 받은 날(한국 날짜)이 1일이다(결정 047 의 1-2)
describe('별명을 받은 지 며칠', () => {
  const at = (iso: string) => new Date(iso).getTime();

  it('받은 날은 1일, 다음 날은 2일', () => {
    expect(daysSince('2026-11-20T01:00:00Z', at('2026-11-20T10:00:00Z'))).toBe(1);
    expect(daysSince('2026-11-20T01:00:00Z', at('2026-11-21T01:00:00Z'))).toBe(2);
    expect(daysSince('2026-11-09T01:00:00Z', at('2026-11-20T01:00:00Z'))).toBe(12);
  });

  it('날짜는 한국 시각으로 센다 — UTC 로는 전날이어도 한국에서 같은 날이면 1일', () => {
    // 한국 11월 20일 00:30 에 받고, 한국 11월 20일 23:00 에 본다
    expect(daysSince('2026-11-19T15:30:00Z', at('2026-11-20T14:00:00Z'))).toBe(1);
    // 한국 11월 19일 23:50 에 받고, 한국 11월 20일 00:10 에 본다
    expect(daysSince('2026-11-19T14:50:00Z', at('2026-11-19T15:10:00Z'))).toBe(2);
  });

  it('읽을 수 없는 시각이거나 기기 시계가 받은 때보다 앞이면 null(칸을 적지 않는다)', () => {
    expect(daysSince('어제', at('2026-11-20T00:00:00Z'))).toBeNull();
    expect(daysSince('2026-11-21T00:00:00Z', at('2026-11-20T00:00:00Z'))).toBeNull();
  });
});
