import { createApi, isMeReport, isMeReportState, isReading, isReason, type MeReport } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const report = fixtures.meReport;
/** 영역 하나를 바꾼 풀이 */
const withArea = (i: number, patch: Record<string, unknown>, drop: string[] = []): unknown => ({
  areas: report.areas.map((a, j) => {
    if (j !== i) return a;
    const next: Record<string, unknown> = { ...a, ...patch };
    for (const key of drop) delete next[key];
    return next;
  }),
});

describe('근거 구조(Reason · BasisItem, 서버 결정 031)', () => {
  it('계약 표의 다섯 종류와 세 때를 받는다', () => {
    const items = [
      { kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS', house: 5 },
      { kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' },
      { kind: 'CLUSTER', house: 5, bodies: ['SUN', 'MERCURY', 'VENUS'] },
      { kind: 'ASPECT', a: 'SATURN', b: 'SUN', type: 'SQUARE' },
      { kind: 'RULER', body: 'MOON', ruler: 'SATURN' },
      { kind: 'TRANSIT', mover: 'SATURN', target: 'SUN', type: 'SQUARE' },
      { kind: 'TRANSIT', mover: 'JUPITER', house: 10 },
    ];
    for (const item of items) expect(isReason({ when: 'BIRTH', items: [item] })).toBe(true);
    for (const when of ['BIRTH', 'NOW', 'DAY']) expect(isReason({ when, items: [items[0]] })).toBe(true);
    expect(isReason({ when: 'BIRTH', items: [items[0], items[1]] })).toBe(true);
  });

  it('모르는 kind · 모르는 때(when)는 그 줄만 숨기도록 받는다(풀이 전체를 거절하지 않는다, 결정 054 의 7 · 리뷰 #49)', () => {
    expect(isReason({ when: 'BIRTH', items: [{ kind: 'MIDPOINT', a: 'SUN' }] })).toBe(true);
    expect(isReason({ when: 'LATER', items: [{ kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS' }] })).toBe(true);
  });

  it('필드가 빠지거나 타입이 틀리면 거절한다', () => {
    const p = { kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS' };
    const broken: unknown[] = [
      null,
      { items: [p] },
      { when: '', items: [p] },
      { when: 1, items: [p] },
      { when: 'BIRTH', items: [] },
      { when: 'BIRTH', items: [p, p, p] },
      { when: 'BIRTH', items: [{ ...p, sign: undefined }] },
      { when: 'BIRTH', items: [{ ...p, house: '5' }] },
      { when: 'BIRTH', items: [{ ...p, house: 13 }] },
      { when: 'BIRTH', items: [{ kind: 'CLUSTER', house: 5 }] },
      { when: 'BIRTH', items: [{ kind: 'CLUSTER', house: 5, bodies: [] }] },
      { when: 'BIRTH', items: [{ kind: 'ASPECT', a: 'SATURN', b: 'SUN' }] },
      { when: 'BIRTH', items: [{ kind: 'RULER', body: 'MOON' }] },
      { when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'SATURN' }] },
      { when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'SATURN', target: 'SUN' }] },
      { when: 'BIRTH', items: [{ kind: 1 }] },
    ];
    for (const v of broken) expect(isReason(v)).toBe(false);
  });
});

describe('요약 해석 v2(문단의 reason · 보완점 2, 결정 048 의 8)', () => {
  it('문단마다 reason 이 있어야 받는다. 옛 모양(근거 낱말만)은 다시 받게 거절한다', () => {
    const r = fixtures.reading;
    expect(isReading(r)).toBe(true);
    const old = { ...r, sections: r.sections.map(({ title, body, basis }) => ({ title, body, basis })) };
    expect(isReading(old)).toBe(false);
    expect(isReading({ ...r, sections: [{ ...r.sections[0], reason: { when: 'BIRTH', items: [] } }] })).toBe(false);
  });

  it('옛 근거 낱말(basis)은 옮기는 동안 함께 와도, S⑦ 뒤에 빠져도 받는다', () => {
    const r = fixtures.reading;
    const without = { ...r, sections: r.sections.map(({ title, body, reason }) => ({ title, body, reason })) };
    expect(isReading(without)).toBe(true);
    expect(isReading({ ...r, sections: [{ ...r.sections[0], basis: [1] }] })).toBe(false);
  });

  it('보완점은 2개다(옛 3개짜리는 다시 받는다)', () => {
    const r = fixtures.reading;
    expect(r.cautions).toHaveLength(2);
    expect(isReading({ ...r, cautions: [...r.cautions, '셋째'] })).toBe(false);
  });
});

describe('나 탭 풀이(MeReport, 결정 048 · 서버 결정 030)', () => {
  it('예시는 다섯 영역이 계약의 순서로 있고 검사를 통과한다', () => {
    expect(report.areas.map((a) => a.area)).toEqual(['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION']);
    expect(isMeReport(report)).toBe(true);
  });

  it('영역마다 제 칸이 있어야 하고 다른 영역의 칸이 있으면 거절한다', () => {
    const glance = report.areas[0].glance;
    const closer = report.areas[2].closer;
    const broken: unknown[] = [
      withArea(0, {}, ['glance']),
      withArea(1, {}, ['practices']),
      withArea(1, {}, ['reason']),
      withArea(2, {}, ['closer']),
      withArea(3, {}, ['workStyle']),
      withArea(4, {}, ['shaken']),
      withArea(0, { closer }),
      withArea(2, { glance }),
      withArea(3, { reason: report.areas[1].reason }),
    ];
    for (const v of broken) expect(isMeReport(v)).toBe(false);
  });

  it('개수와 순서가 계약과 다르면 거절한다', () => {
    const [p, l, r, w, e] = report.areas;
    const broken: unknown[] = [
      { areas: [l, p, r, w, e] },
      { areas: [p, l, r, w] },
      withArea(0, { keywords: ['하나', '둘'] }),
      withArea(0, { stars: [] }),
      withArea(0, { stars: [...p.stars, { body: 'MOON' }] }),
      withArea(0, { paragraphs: p.paragraphs.slice(0, 3) }),
      withArea(1, { paragraphs: p.paragraphs }),
      withArea(0, { glance: { shining: ['하나'], tiring: ['하나', '둘'] } }),
      withArea(1, { practices: l.practices?.slice(0, 2) }),
      withArea(0, { title: '' }),
    ];
    for (const v of broken) expect(isMeReport(v)).toBe(false);
  });

  it('일 방식 막대는 정수 셋이다(값은 서버가 셈한 그대로 — 앱은 다시 셈하지 않는다)', () => {
    expect(isMeReport(withArea(3, { workStyle: { together: 32, flexible: 30, fast: 38.5 } }))).toBe(false);
    expect(isMeReport(withArea(3, { workStyle: { together: 32, flexible: 30 } }))).toBe(false);
    expect(isMeReport(withArea(3, { workStyle: { together: 32, flexible: 30, fast: 120 } }))).toBe(false);
  });

  it('쓰인 별(Star)은 값이 있는 키만 오고, 하우스는 1~12 · 별 수는 정수다', () => {
    expect(isMeReport(withArea(0, { stars: [{ body: 'SUN', sign: 'GEMINI' }, { house: 6, count: 3 }, { body: 'URANUS' }] }))).toBe(true);
    expect(isMeReport(withArea(0, { stars: [{ house: 0, count: 3 }] }))).toBe(false);
    expect(isMeReport(withArea(0, { stars: [{ body: 1 }] }))).toBe(false);
    expect(isMeReport(withArea(0, { stars: [{ house: 6, count: 2.5 }] }))).toBe(false);
  });

  it('상태: DONE 일 때만 풀이가 있고 그 풀이가 계약의 모양이어야 한다', () => {
    expect(isMeReportState({ status: 'NONE' })).toBe(true);
    expect(isMeReportState({ status: 'WRITING' })).toBe(true);
    expect(isMeReportState({ status: 'FAILED' })).toBe(true);
    expect(isMeReportState({ status: 'DONE', report })).toBe(true);
    expect(isMeReportState({ status: 'DONE' })).toBe(false);
    expect(isMeReportState({ status: 'DONE', report: { areas: [] } })).toBe(false);
    expect(isMeReportState({ status: 'LATER' })).toBe(false);
  });
});

describe('api: 나 탭 풀이 요청 · 확인', () => {
  it('POST /me-report 를 본문 없이 부르고 202 의 상태를 받는다', async () => {
    const fetchFn = fakeFetch(202, { status: 'WRITING' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.requestMeReport()).toEqual({ ok: true, data: { status: 'WRITING' } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/me-report`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    for (const status of ['DONE', 'FAILED']) {
      const ok = createApi({ baseUrl: BASE, fetchFn: fakeFetch(202, { status }), getToken: () => null });
      expect(await ok.requestMeReport()).toEqual({ ok: true, data: { status } });
    }
    const bad = createApi({ baseUrl: BASE, fetchFn: fakeFetch(202, { status: 'NONE' }), getToken: () => null });
    expect(await bad.requestMeReport()).toEqual({ ok: false, error: 'INVALID', status: 202 });
  });

  it('출생 정보 없음(404) · 한도(429) · 받을 수 없음(402 예약)을 가른다', async () => {
    const call = (status: number, error: string) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(status, { error }), getToken: () => null }).requestMeReport();
    expect(await call(404, 'NO_PROFILE')).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    expect(await call(429, 'RATE_LIMITED')).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    expect(await call(402, 'PURCHASE_REQUIRED')).toEqual({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
  });

  it('GET /me-report 는 상태와 (DONE 이면) 풀이를 받고, 모양이 다르면 INVALID 다', async () => {
    const fetchFn = fakeFetch(200, { status: 'DONE', report });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.getMeReport()).toEqual({ ok: true, data: { status: 'DONE', report } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/me-report`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    const broken = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { status: 'DONE' }), getToken: () => null });
    expect(await broken.getMeReport()).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('가짜 서버를 켜면 fetch 없이 다 쓴 예시 풀이를 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.requestMeReport()).toEqual({ ok: true, data: { status: 'DONE' } });
    const got = await api.getMeReport();
    expect(got.ok && got.data.status === 'DONE' && (got.data.report as MeReport).areas).toHaveLength(5);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
