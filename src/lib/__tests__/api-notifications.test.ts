import { createApi, isNotificationList } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

/** 서버 `GET /notifications` 의 한 줄(서버 결정 035 — 값이 없는 synastryId · inquiryId 는 키가 빠져 온다) */
const item = (patch: Record<string, unknown> = {}) => ({
  id: '0f9c3c1e-6a2b-4f3d-8c11-2d7e5b9a0c41',
  kind: 'ME_REPORT_DONE',
  createdAt: '2026-11-20T00:12:00Z',
  read: false,
  ...patch,
});

describe('알림함 계약(GET /notifications, 결정 052 · 058 · 서버 결정 035)', () => {
  it('예시는 검사를 통과하고, 종류 다섯 · 문의 답변의 inquiryId · 궁합의 synastryId 를 받는다', () => {
    expect(isNotificationList(fixtures.notifications)).toBe(true);
    const items = [
      item({ kind: 'READING_DONE', read: true }),
      item({ kind: 'TIMING_REPORT_DONE' }),
      item({ kind: 'SYNASTRY_REPORT_DONE', synastryId: '7b1e0e52-1c1f-4a6c-9a51-0d2f4b8c9e10' }),
      item({ kind: 'INQUIRY_ANSWERED', inquiryId: '0b5d6c1e-3f0a-4d53-9a51-2f8f1f0f7a10' }),
    ];
    expect(isNotificationList({ unread: 3, items })).toBe(true);
    expect(isNotificationList({ unread: 0, items: [] })).toBe(true);
  });

  it('모르는 종류(kind)도 목록은 받는다 — 알림함이 그 줄만 숨긴다(계획 전역 제약)', () => {
    expect(isNotificationList({ unread: 1, items: [item({ kind: 'INVITE_ACCEPTED' })] })).toBe(true);
  });

  it('칸이 빠지거나 타입이 틀리면 거절한다', () => {
    const broken: unknown[] = [
      null,
      [],
      { items: [] },
      { unread: -1, items: [] },
      { unread: 1.5, items: [] },
      { unread: '1', items: [] },
      { unread: 0 },
      { unread: 0, items: [item({ id: '' })] },
      { unread: 0, items: [item({ kind: '' })] },
      { unread: 0, items: [item({ kind: 3 })] },
      { unread: 0, items: [item({ createdAt: '' })] },
      { unread: 0, items: [item({ read: 'false' })] },
      { unread: 0, items: [item({ inquiryId: 7 })] },
      { unread: 0, items: [item({ synastryId: '' })] },
    ];
    for (const v of broken) expect(isNotificationList(v)).toBe(false);
  });
});

describe('api: 알림함', () => {
  it('GET /notifications 를 세션과 함께 부르고 목록을 받는다. 모양이 다르면 INVALID 다', async () => {
    const body = { unread: 1, items: [item()] };
    const fetchFn = fakeFetch(200, body);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.getNotifications()).toEqual({ ok: true, data: body });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/notifications`);
    expect(init?.method).toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer session-abc');
    const broken = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { items: [] }), getToken: () => null });
    expect(await broken.getNotifications()).toMatchObject({ ok: false, error: 'INVALID' });
  });

  it('POST /notifications/{id}/read 는 본문 없이 부르고 204 를 받는다. 없는 것 · 남의 것은 404 NOT_FOUND', async () => {
    const fetchFn = fakeFetch(204);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.markNotificationRead('a b')).toEqual({ ok: true, data: null });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/notifications/a%20b/read`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    const missing = createApi({ baseUrl: BASE, fetchFn: fakeFetch(404, { error: 'NOT_FOUND' }), getToken: () => null });
    expect(await missing.markNotificationRead('x')).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
  });

  it('가짜 서버를 켜면 fetch 없이 예시 목록을 주고 읽음은 성공으로 답한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.getNotifications()).toEqual({ ok: true, data: fixtures.notifications });
    expect(await api.markNotificationRead(fixtures.notifications.items[0].id)).toEqual({ ok: true, data: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
