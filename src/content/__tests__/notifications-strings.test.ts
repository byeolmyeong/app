import { strings } from '@/content/strings';

const N = strings.notifications;
const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

// 알림함(결정 052 · 058 · 065 의 3, 보드 11-3 · 11-3-1)의 문구
describe('알림함 문구', () => {
  it('보이는 종류는 넷(별명 · 나 탭 풀이 · 시기 풀이 · 문의 답변) — 궁합 리포트는 1.0.0 에 없다(결정 055)', () => {
    expect(Object.keys(N.kinds)).toEqual(['READING_DONE', 'ME_REPORT_DONE', 'TIMING_REPORT_DONE', 'INQUIRY_ANSWERED']);
    for (const kind of Object.values(N.kinds)) {
      expect(filled(kind.title)).toBe(true);
      expect(filled(kind.body)).toBe(true);
    }
  });

  it('보드 11-3 의 문구', () => {
    expect(N.title).toBe('알림');
    expect(N.kinds.INQUIRY_ANSWERED.title).toBe('문의에 답변이 왔어요');
    expect(N.kinds.TIMING_REPORT_DONE).toEqual({ title: '시기 풀이가 다 됐어요', body: '지금 나의 시기와 올해의 흐름을 볼 수 있어요.' });
    expect(N.kinds.ME_REPORT_DONE).toEqual({ title: '자세한 풀이가 다 됐어요', body: '성격 · 연애 · 관계 · 일 · 감정을 읽어 보세요.' });
    expect(`새벽별${N.namedPrefix}${N.kinds.READING_DONE.body}`).toBe('새벽별 님의 별명과 풀이를 확인해 보세요.');
    expect(Object.values(N.groups)).toEqual(['오늘', '최근 7일', '최근 30일']);
  });

  it('비었을 때(11-3-1) · 못 불러왔을 때 · 종 · 때 문구가 비어 있지 않다', () => {
    expect(N.empty).toEqual({ title: '아직 알림이 없어요', body: '풀이가 다 되거나 문의에 답이 오면\n여기에 모여요.' });
    for (const v of [N.loadFail.title, N.bell, N.bellUnread, N.unread, N.justNow, N.time.am, N.time.pm, N.date.month, N.date.day]) expect(filled(v)).toBe(true);
  });
});
