import { createApi, isShareCard, type ShareCard, type ShareRequest } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const C = fixtures.shareCards;
const bodyOf = (fetchFn: jest.MockedFunction<typeof fetch>) => JSON.parse(fetchFn.mock.calls[0][1]?.body as string);
const headersOf = (fetchFn: jest.MockedFunction<typeof fetch>) =>
  (fetchFn.mock.calls[0][1]?.headers ?? {}) as Record<string, string>;

describe('api: 공유 만들기(POST /shares)', () => {
  const cases: [ShareRequest, unknown, ShareCard][] = [
    [
      { kind: 'SCORE', synastryId: 'syn-1', myName: '동환' },
      { kind: 'SCORE', synastryId: 'syn-1', myName: '동환' },
      C.score,
    ],
    [{ kind: 'RANKING', relation: 'FRIEND' }, { kind: 'RANKING', relation: 'FRIEND', showNames: false }, C.ranking],
    [
      { kind: 'RANKING', relation: 'FRIEND', showNames: true },
      { kind: 'RANKING', relation: 'FRIEND', showNames: true },
      C.rankingNames,
    ],
    // 공유 v2(서버 결정 036, S⑥)
    [{ kind: 'NICKNAME' }, { kind: 'NICKNAME' }, C.nickname],
    [{ kind: 'ME_AREA', area: 'LOVE' }, { kind: 'ME_AREA', area: 'LOVE' }, C.meArea],
    [{ kind: 'DAY_SKY', date: '2026-11-19' }, { kind: 'DAY_SKY', date: '2026-11-19' }, C.daySky],
    [{ kind: 'NEXT_BIG' }, { kind: 'NEXT_BIG' }, C.nextBig],
  ];

  it.each(cases)('%j 는 계약의 본문만 세션 헤더와 함께 보낸다', async (input, body, card) => {
    const fetchFn = fakeFetch(200, { shareId: 'AbCdEfGhIjKlMnOpQrStUv', card });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'tok' });
    expect(await api.createShare(input)).toEqual({ ok: true, data: { shareId: 'AbCdEfGhIjKlMnOpQrStUv', card } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/shares`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');
    expect(bodyOf(fetchFn)).toEqual(body);
    expect(headersOf(fetchFn).Authorization).toBe('Bearer tok');
  });

  it('그 종류가 쓰지 않는 값은 보내지 않는다(더 쓰지 않는 shareId 도)', async () => {
    const fetchFn = fakeFetch(200, { shareId: 's', card: C.nickname });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'tok' });
    await api.createShare({ kind: 'NICKNAME', synastryId: 'x', myName: 'y', shareId: 'z' } as unknown as ShareRequest);
    expect(bodyOf(fetchFn)).toEqual({ kind: 'NICKNAME' });
  });

  it('공유 v2: 영역 · 날짜 말고는 싣지 않는다(출생 정보 · 닉네임은 보내지 않는다)', async () => {
    const send = async (input: unknown, card: ShareCard) => {
      const fetchFn = fakeFetch(200, { shareId: 's', card });
      await createApi({ baseUrl: BASE, fetchFn, getToken: () => 'tok' }).createShare(input as ShareRequest);
      return bodyOf(fetchFn);
    };
    const extra = { date: '1999-03-08', time: '14:10', placeId: 1, nickname: '새벽별', area: 'WORK' };
    expect(await send({ kind: 'NICKNAME', ...extra }, C.nickname)).toEqual({ kind: 'NICKNAME' });
    expect(await send({ kind: 'NEXT_BIG', ...extra }, C.nextBig)).toEqual({ kind: 'NEXT_BIG' });
    expect(await send({ ...extra, kind: 'ME_AREA', area: 'LOVE' }, C.meArea)).toEqual({ kind: 'ME_AREA', area: 'LOVE' });
    expect(await send({ ...extra, kind: 'DAY_SKY', date: '2026-11-19' }, C.daySky)).toEqual({ kind: 'DAY_SKY', date: '2026-11-19' });
  });

  it('응답의 모양이 다르거나 요청한 종류의 카드가 아니면 INVALID 다', async () => {
    const call = (body: unknown) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, body), getToken: () => 't' }).createShare({ kind: 'NICKNAME' });
    const invalid = { ok: false, error: 'INVALID', status: 200 };
    expect(await call({ card: C.nickname })).toEqual(invalid);
    expect(await call({ shareId: '', card: C.nickname })).toEqual(invalid);
    expect(await call({ shareId: 's', card: { kind: 'NICKNAME' } })).toEqual(invalid);
    expect(await call({ shareId: 's', card: C.reading })).toEqual(invalid);
    expect(await call({ shareId: 's', card: C.nextBig })).toEqual(invalid);
  });

  it('공유할 것이 없으면 404 NOT_FOUND 가 code 로 온다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(404, { error: 'NOT_FOUND' }), getToken: () => 't' });
    expect(await api.createShare({ kind: 'NEXT_BIG' })).toEqual({
      ok: false,
      error: 'SERVER',
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('api: 공유 카드 보기(GET /shared/{shareId}) · 지우기', () => {
  it('세션이 있어도 세션 헤더를 붙이지 않고, 401 에도 세션을 다시 받지 않는다', async () => {
    const fetchFn = fakeFetch(200, C.score);
    const refreshSession = jest.fn(async () => true);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'tok', refreshSession });
    expect(await api.getSharedCard('a b/c')).toEqual({ ok: true, data: C.score });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/shared/a%20b%2Fc`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(headersOf(fetchFn).Authorization).toBeUndefined();

    const denied = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => 'tok', refreshSession });
    expect(await denied.getSharedCard('x')).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('없는 식별자는 404 NOT_FOUND, 한도는 LIMIT, 모양이 다른 카드는 INVALID 다', async () => {
    const call = (status: number, body?: unknown) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(status, body), getToken: () => null }).getSharedCard('x');
    expect(await call(404, { error: 'NOT_FOUND' })).toEqual({
      ok: false,
      error: 'SERVER',
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(await call(429)).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    expect(await call(200, { kind: 'SCORE' })).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('DELETE /shares/{shareId} 는 204 를 성공으로 본다', async () => {
    const fetchFn = fakeFetch(204);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'tok' });
    expect(await api.deleteShare('abc')).toEqual({ ok: true, data: null });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/shares/abc`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('DELETE');
    expect(headersOf(fetchFn).Authorization).toBe('Bearer tok');
  });
});

describe('isShareCard: kind 로 가리는 여덟 모양', () => {
  it('계약의 여덟 카드를 받는다(값이 없는 키는 없어도 된다)', () => {
    for (const card of Object.values(C)) expect(isShareCard(card)).toBe(true);
    // 옛 계정이라 닉네임이 없으면 키가 없다(서버 결정 036)
    for (const card of [C.nickname, C.meArea, C.daySky, C.nextBig]) {
      const { nickname: _, ...rest } = card;
      expect(isShareCard(rest)).toBe(true);
    }
    expect(isShareCard({ ...C.score, scoreLabel: '다른 결의 사이' })).toBe(true);
    expect(isShareCard({ ...C.ranking, entries: [{ name: 'ㅈㅇ', score: 80 }] })).toBe(true);
  });

  it('모양이 어긋난 카드는 받지 않는다', () => {
    const entry = { name: 'ㅈㅇ', score: 80 };
    const broken: unknown[] = [
      null,
      'READING',
      {},
      { ...C.reading, kind: 'OTHER' },
      { ...C.reading, headline: '' },
      { ...C.reading, headline: 1 },
      { ...C.reading, keywords: ['하나', '둘'] },
      { ...C.reading, keywords: ['하나', '둘', '셋', '넷'] },
      { ...C.reading, keywords: ['하나', '둘', 3] },
      { ...C.reading, keywords: undefined },
      { ...C.score, names: ['나'] },
      { ...C.score, names: ['나', '지우', '민서'] },
      { ...C.score, names: ['나', 1] },
      { ...C.score, score: '82' },
      { ...C.score, scoreLabel: 1 },
      { ...C.score, headline: undefined },
      { ...C.ranking, relation: 'ENEMY' },
      { ...C.ranking, entries: [] },
      { ...C.ranking, entries: [entry, entry, entry, entry] },
      { ...C.ranking, entries: [{ name: 'ㅈㅇ' }] },
      { ...C.ranking, entries: [{ name: 1, score: 80 }] },
      { ...C.ranking, entries: 'x' },
      { ...C.nextTurn, year: '2027' },
      { ...C.nextTurn, year: 2027.5 },
      { ...C.nextTurn, season: 'FALL' },
      { ...C.nextTurn, theme: '' },
      // 공유 v2
      { ...C.nickname, nickname: '' },
      { ...C.nickname, nickname: null },
      { ...C.nickname, nickname: 1 },
      { ...C.nickname, sunSign: 'OPHIUCHUS' },
      { ...C.nickname, sunSign: undefined },
      { ...C.nickname, headline: '' },
      { ...C.meArea, area: 'MONEY' },
      { ...C.meArea, title: '' },
      { ...C.meArea, title: undefined },
      { ...C.daySky, date: '2026-1-9' },
      { ...C.daySky, date: '20261119' },
      { ...C.daySky, date: undefined },
      { ...C.daySky, title: '' },
      { ...C.nextBig, year: '2028' },
      { ...C.nextBig, year: 2028.5 },
      { ...C.nextBig, age: '29' },
      { ...C.nextBig, age: 29.5 },
      { ...C.nextBig, age: -1 },
      { ...C.nextBig, title: '' },
      // 다른 종류의 필드를 갖고 있어도 제 종류의 필드가 없으면 받지 않는다
      { ...C.reading, kind: 'SCORE' },
      { ...C.score, kind: 'NEXT_TURN' },
      { ...C.nickname, kind: 'ME_AREA' },
      { ...C.daySky, kind: 'NEXT_BIG' },
    ];
    for (const v of broken) expect([v, isShareCard(v)]).toEqual([v, false]);
  });
});

describe('공유의 개발용 가짜 서버', () => {
  const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(500), getToken: () => null, useFixtures: true });

  it('만들 수 있는 종류의 카드를 만들고, 받은 shareId 로 같은 카드를 다시 볼 수 있다', async () => {
    const requests: ShareRequest[] = [
      { kind: 'SCORE', synastryId: fixtures.synastryList[0].id, myName: '동환' },
      { kind: 'RANKING', relation: 'LOVE' },
      { kind: 'RANKING', relation: 'LOVE', showNames: true },
      { kind: 'NICKNAME' },
      { kind: 'ME_AREA', area: 'PERSONALITY' },
      { kind: 'DAY_SKY', date: '2026-11-21' },
      { kind: 'NEXT_BIG' },
    ];
    for (const request of requests) {
      const made = await api.createShare(request);
      if (!made.ok) throw new Error('fixture share failed');
      expect(isShareCard(made.data.card)).toBe(true);
      expect(made.data.card.kind).toBe(request.kind);
      expect((await api.getSharedCard(made.data.shareId)).ok).toBe(true);
    }
  });

  it('점수 카드에는 받은 내 이름이, 랭킹 카드에는 고른 관계가 들어간다', async () => {
    const score = await api.createShare({ kind: 'SCORE', synastryId: 'x', myName: '동환' });
    expect(score.ok && score.data.card.kind === 'SCORE' && score.data.card.names[0]).toBe('동환');
    const ranking = await api.createShare({ kind: 'RANKING', relation: 'WORK' });
    expect(ranking.ok && ranking.data.card.kind === 'RANKING' && ranking.data.card.relation).toBe('WORK');
  });

  it('나 탭 영역 카드는 고른 영역 · 그 영역의 제목(연애는 영역 제목, 나머지는 첫 문단 제목), 그날의 하늘은 고른 날이다', async () => {
    for (const area of ['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION'] as const) {
      const made = await api.createShare({ kind: 'ME_AREA', area });
      const report = fixtures.meReport.areas.find((a) => a.area === area)!;
      const title = area === 'LOVE' ? report.title : report.paragraphs[0].title;
      expect(made.ok && made.data.card).toMatchObject({ kind: 'ME_AREA', area, title });
    }
    const day = await api.createShare({ kind: 'DAY_SKY', date: '2026-11-21' });
    expect(day.ok && day.data.card).toMatchObject({ kind: 'DAY_SKY', date: '2026-11-21' });
  });

  it('모르는 식별자는 404 NOT_FOUND 다', async () => {
    expect(await api.getSharedCard('nope')).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
  });
});
