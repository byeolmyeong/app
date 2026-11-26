import {
  groupNotifications,
  groupOf,
  hasUnread,
  notificationTarget,
  notificationText,
  timeLabel,
  visibleNotifications,
} from '@/features/notifications/notification-rows';
import type { NotificationItem } from '@/lib/api';

const item = (patch: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1',
  kind: 'ME_REPORT_DONE',
  createdAt: '2026-11-20T00:12:00Z',
  read: false,
  ...patch,
});

/** 한국 시각 2026-11-20 15:00 */
const NOW = Date.parse('2026-11-20T06:00:00Z');

describe('누르면 갈 곳 — 휴대폰 푸시의 갈 곳(6a 의 pushTarget)과 같은 표', () => {
  it('별명 → /reading · 나 탭 풀이 → /me · 시기 풀이 → /timing · 문의 답변 → 그 답변 보기', () => {
    expect(notificationTarget(item({ kind: 'READING_DONE' }))).toBe('/reading');
    expect(notificationTarget(item({ kind: 'ME_REPORT_DONE' }))).toBe('/me');
    expect(notificationTarget(item({ kind: 'TIMING_REPORT_DONE' }))).toBe('/timing');
    expect(notificationTarget(item({ kind: 'INQUIRY_ANSWERED', inquiryId: 'q-7' }))).toEqual({ pathname: '/my/inquiries/[id]', params: { id: 'q-7' } });
  });

  it('궁합 리포트(1.0.0 에 없다) · 모르는 종류 · 문의 식별자 없는 문의 답변은 갈 곳이 없어 숨긴다', () => {
    const hidden = [
      item({ kind: 'SYNASTRY_REPORT_DONE', synastryId: 's-1' }),
      item({ kind: 'INVITE_ACCEPTED' }),
      item({ kind: 'INQUIRY_ANSWERED' }),
    ];
    for (const h of hidden) expect(notificationTarget(h)).toBeNull();
    const shown = item({ id: 'ok' });
    expect(visibleNotifications([hidden[0], shown, hidden[1], hidden[2]])).toEqual([shown]);
  });
});

describe('홈 종의 점', () => {
  it('보이는 줄 가운데 안 읽은 것이 있을 때만 — 숨기는 줄(궁합 리포트)만 안 읽었으면 점이 없다', () => {
    expect(hasUnread({ unread: 1, items: [item()] })).toBe(true);
    expect(hasUnread({ unread: 0, items: [item({ read: true })] })).toBe(false);
    expect(hasUnread({ unread: 1, items: [item({ read: true }), item({ kind: 'SYNASTRY_REPORT_DONE', synastryId: 's' })] })).toBe(false);
    expect(hasUnread({ unread: 0, items: [] })).toBe(false);
  });
});

describe('묶음 — 받은 시각을 한국 날짜로 읽어 오늘 · 최근 7일 · 최근 30일', () => {
  it('한국 자정이 경계다(UTC 15시)', () => {
    expect(groupOf('2026-11-19T15:00:00Z', NOW)).toBe('today'); // 11-20 00:00 KST
    expect(groupOf('2026-11-19T14:59:59Z', NOW)).toBe('week'); // 11-19 23:59 KST
  });

  it('오늘 포함 7일(6일 전까지)이 최근 7일, 그 전은 최근 30일', () => {
    expect(groupOf('2026-11-14T15:00:00Z', NOW)).toBe('week'); // 11-15 KST — 5일 전
    expect(groupOf('2026-11-13T15:00:00Z', NOW)).toBe('week'); // 11-14 KST — 6일 전
    expect(groupOf('2026-11-13T14:59:59Z', NOW)).toBe('month'); // 11-13 KST — 7일 전
    expect(groupOf('2026-10-22T00:00:00Z', NOW)).toBe('month');
  });

  it('기기 시계가 받은 때보다 앞이면 오늘로 본다', () => {
    expect(groupOf('2026-11-21T00:00:00Z', NOW)).toBe('today');
  });

  it('묶음 순서대로, 빈 묶음은 빼고 받은 순서를 지킨다', () => {
    const a = item({ id: 'a', createdAt: '2026-11-20T05:00:00Z' });
    const b = item({ id: 'b', createdAt: '2026-11-20T01:00:00Z' });
    const c = item({ id: 'c', createdAt: '2026-11-07T01:00:00Z' });
    expect(groupNotifications([a, b, c], NOW)).toEqual([
      { group: 'today', items: [a, b] },
      { group: 'month', items: [c] },
    ]);
  });
});

describe('때', () => {
  it('1분 안이면 "방금", 오늘이면 오전/오후 시각, 그 전이면 "11월 7일"(보드 11-3)', () => {
    expect(timeLabel('2026-11-20T05:59:30Z', NOW)).toBe('방금');
    expect(timeLabel('2026-11-20T05:10:00Z', NOW)).toBe('오후 2:10');
    expect(timeLabel('2026-11-20T00:12:00Z', NOW)).toBe('오전 9:12');
    expect(timeLabel('2026-11-19T15:05:00Z', NOW)).toBe('오전 12:05');
    expect(timeLabel('2026-11-20T03:30:00Z', NOW)).toBe('오후 12:30');
    expect(timeLabel('2026-11-07T01:00:00Z', NOW)).toBe('11월 7일');
    expect(timeLabel('엉뚱한 값', NOW)).toBe('');
  });
});

describe('줄의 문구', () => {
  it('별명 지음은 닉네임이 있으면 "새벽별 님의 …", 없으면 닉네임 없이', () => {
    expect(notificationText(item({ kind: 'READING_DONE' }), '새벽별')?.body).toBe('새벽별 님의 별명과 풀이를 확인해 보세요.');
    expect(notificationText(item({ kind: 'READING_DONE' }), null)?.body).toBe('별명과 풀이를 확인해 보세요.');
    expect(notificationText(item({ kind: 'INQUIRY_ANSWERED', inquiryId: 'q' }), '새벽별')?.title).toBe('문의에 답변이 왔어요');
    expect(notificationText(item({ kind: 'toString' }), null)).toBeNull();
  });
});
