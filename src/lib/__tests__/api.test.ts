import {
  createApi,
  INQUIRY_CATEGORIES,
  isAppConfig,
  isChart,
  isDirection,
  isFaqList,
  isPlaceList,
  isReading,
  isSynastry,
  isSynastryRanking,
  isSynastryReportState,
  isTimingReport,
} from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

function headersOf(fetchFn: jest.MockedFunction<typeof fetch>) {
  return (fetchFn.mock.calls[0][1]?.headers ?? {}) as Record<string, string>;
}

const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };

describe('api: 오류를 구분한 결과', () => {
  it('401 은 로그인 필요 결과다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => null });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
  });

  it('429 는 한도 결과다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(429), getToken: () => null });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'LIMIT', status: 429 });
  });

  it('fetch 가 던지면 네트워크 오류 결과이고 다시 시도하지 않는다', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as jest.MockedFunction<typeof fetch>;
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'NETWORK' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('그 밖의 실패 상태는 서버 오류 결과다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(500), getToken: () => null });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'SERVER', status: 500 });
  });

  it('응답 모양이 계약과 다르면 INVALID 결과다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { timeKnown: true }), getToken: () => null });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'INVALID', status: 200 });
    const api2 = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, [{ id: 'x' }]), getToken: () => null });
    expect(await api2.listPlaces()).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });
});

// 연결 끊김 띠(1.0.1): 서버가 답했다는 것은 연결돼 있다는 증거 — 상태가 실패여도 응답을 받았으면 닿은 것이다
describe('api: 서버에 닿았는지 알림(onReach)', () => {
  it('응답을 받으면 상태가 무엇이든 true, 받지 못하면 false', async () => {
    const onReach = jest.fn();
    await createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { timeKnown: true }), getToken: () => null, onReach }).createChart(input);
    await createApi({ baseUrl: BASE, fetchFn: fakeFetch(500), getToken: () => null, onReach }).createChart(input);
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as jest.MockedFunction<typeof fetch>;
    await createApi({ baseUrl: BASE, fetchFn, getToken: () => null, onReach }).createChart(input);
    expect(onReach.mock.calls).toEqual([[true], [true], [false]]);
  });
});

describe('api: 세션 토큰', () => {
  it('토큰이 있으면 Authorization 헤더에 붙인다', async () => {
    const fetchFn = fakeFetch(200, fixtures.chart);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    await api.createChart(input);
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('토큰이 없으면 Authorization 헤더가 없다', async () => {
    const fetchFn = fakeFetch(200, fixtures.chart);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    await api.createChart(input);
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
  });
});

describe('api: 요청 모양', () => {
  it('POST /charts 에 { date, time, placeId } 를 JSON 으로 보낸다', async () => {
    const fetchFn = fakeFetch(200, fixtures.chart);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    const result = await api.createChart(input);
    expect(result).toEqual({ ok: true, data: fixtures.chart });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/charts`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(input);
    expect(headersOf(fetchFn)['Content-Type']).toBe('application/json');
  });

  it('GET /places 로 전체 목록을 받는다', async () => {
    const fetchFn = fakeFetch(200, fixtures.places);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    const result = await api.listPlaces();
    expect(result.ok && result.data).toHaveLength(229);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/places`);
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });
});

describe('api: 개발용 가짜 서버 스위치', () => {
  it('켜면 fetch 를 부르지 않고 fixtures 로 답한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const places = await api.listPlaces();
    expect(places.ok && places.data).toHaveLength(229);
    const chart = await api.createChart(input);
    expect(chart).toEqual({ ok: true, data: fixtures.chart });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('시각이 null 이면 시각 모름 차트를 준다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(500), getToken: () => null, useFixtures: true });
    const chart = await api.createChart({ ...input, time: null });
    expect(chart.ok && chart.data.timeKnown).toBe(false);
  });
});

describe('fixtures: 서버 계약의 모양', () => {
  it('출생지 목록과 두 차트가 계약 검사를 통과한다', () => {
    expect(isPlaceList(fixtures.places)).toBe(true);
    expect(isChart(fixtures.chart)).toBe(true);
    expect(isChart(fixtures.chartTimeUnknown)).toBe(true);
  });

  it('시각을 아는 차트는 행성 10개·하우스 경계 12개·상승점·중천을 갖는다', () => {
    expect(fixtures.chart.timeKnown).toBe(true);
    expect(fixtures.chart.positions).toHaveLength(10);
    expect(fixtures.chart.houses).toHaveLength(12);
    expect(fixtures.chart.angles).toEqual({ asc: expect.any(Object), mc: expect.any(Object) });
    expect(fixtures.chart.positions.every((p) => typeof p.house === 'number')).toBe(true);
  });

  it('시각 모름 차트에는 하우스·상승점·중천·행운점이 없다', () => {
    const c = fixtures.chartTimeUnknown;
    expect(c.timeKnown).toBe(false);
    expect(c.houses).toBeUndefined();
    expect(c.angles).toBeUndefined();
    expect([...c.positions, ...c.points].every((p) => p.house === undefined)).toBe(true);
    expect(c.points.map((p) => p.point)).toEqual(['NORTH_NODE', 'LILITH']);
  });

  it('요약 해석은 계약의 필드만 갖는다', () => {
    expect(Object.keys(fixtures.reading).sort()).toEqual(['cautions', 'headline', 'sections', 'strengths']);
    // 요약 해석 v2: 근거 구조(reason)와, 옮기는 동안 함께 오는 옛 낱말(basis — 서버 S⑦ 에 빠진다)
    expect(Object.keys(fixtures.reading.sections[0]).sort()).toEqual(['basis', 'body', 'reason', 'title']);
  });
});

/** 부르는 순서대로 다른 응답을 주는 가짜 fetch */
function fakeFetchSeq(...responses: [status: number, body?: unknown][]) {
  let i = 0;
  return jest.fn(async (_url: string, _init?: RequestInit) => {
    const [status, body] = responses[Math.min(i++, responses.length - 1)];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }) as unknown as jest.MockedFunction<typeof fetch>;
}

describe('api: 개발용 세션과 출생 정보 저장', () => {
  const profile = { date: '2000-06-15', time: null, placeId: 1841277 };

  it('POST /auth/dev 는 본문도 세션 헤더도 없이 부르고 토큰을 받는다', async () => {
    const fetchFn = fakeFetch(200, { token: 'new-session' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'old-session' });
    expect(await api.createDevSession()).toEqual({ ok: true, data: { token: 'new-session' } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/dev`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
  });

  it('토큰이 빈 글자이거나 없으면 INVALID, 서버가 개발용 로그인을 꺼 두었으면(404) 서버 오류 결과다', async () => {
    const empty = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { token: '' }), getToken: () => null });
    expect(await empty.createDevSession()).toEqual({ ok: false, error: 'INVALID', status: 200 });
    const off = createApi({ baseUrl: BASE, fetchFn: fakeFetch(404), getToken: () => null });
    expect(await off.createDevSession()).toEqual({ ok: false, error: 'SERVER', status: 404 });
  });

  it('GET /places 에는 세션 헤더를 붙이지 않는다', async () => {
    const fetchFn = fakeFetch(200, fixtures.places);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    await api.listPlaces();
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
  });

  it('PUT /profile 에 { date, time, placeId } 를 세션 헤더와 함께 보낸다', async () => {
    const fetchFn = fakeFetch(200, profile);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.saveProfile(profile)).toEqual({ ok: true, data: profile });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/profile`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual(profile);
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('시각 "모름" 이면 POST /charts · PUT /profile 에 placeId 를 null 로 보낸다(결정 020)', async () => {
    const unknown = { date: '2000-06-15', time: null, placeId: null };
    const chartFetch = fakeFetch(200, fixtures.chartTimeUnknown);
    await createApi({ baseUrl: BASE, fetchFn: chartFetch, getToken: () => null }).createChart(unknown);
    expect(JSON.parse(chartFetch.mock.calls[0][1]?.body as string)).toEqual(unknown);
    const profileFetch = fakeFetch(200, unknown);
    const api = createApi({ baseUrl: BASE, fetchFn: profileFetch, getToken: () => 'session-abc' });
    expect(await api.saveProfile(unknown)).toEqual({ ok: true, data: unknown });
    expect(JSON.parse(profileFetch.mock.calls[0][1]?.body as string)).toEqual(unknown);
  });

  it('PUT /profile 의 응답: 시각이 null 이면 placeId 가 null 이거나 없어도 되고, 시각이 있으면 숫자여야 한다', async () => {
    const unknown = { date: '2000-06-15', time: null, placeId: null };
    const respond = (body: unknown) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, body), getToken: () => null }).saveProfile(unknown);
    expect((await respond({ date: '2000-06-15', time: null })).ok).toBe(true);
    expect((await respond({ date: '2000-06-15', time: null, placeId: null })).ok).toBe(true);
    expect(await respond({ date: '2000-06-15', time: '21:00', placeId: null })).toEqual({
      ok: false,
      error: 'INVALID',
      status: 200,
    });
    expect((await respond({ date: '2000-06-15', time: '21:00' })).ok).toBe(false);
  });

  it('PUT /profile 의 응답 모양이 다르면 INVALID 다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { date: '2000-06-15' }), getToken: () => null });
    expect(await api.saveProfile(profile)).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('가짜 서버를 켜면 fetch 없이 가짜 토큰을 주고 출생 정보 저장도 성공한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const session = await api.createDevSession();
    expect(session.ok && session.data.token?.length).toBeGreaterThan(0);
    expect(await api.saveProfile(profile)).toEqual({ ok: true, data: profile });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 401 이면 세션을 한 번만 다시 받는다', () => {
  it('세션을 다시 받으면 같은 호출을 새 토큰으로 한 번 더 한다', async () => {
    let token = 'expired';
    const fetchFn = fakeFetchSeq([401, { error: 'UNAUTHORIZED' }], [200, fixtures.chart]);
    const refreshSession = jest.fn(async () => {
      token = 'fresh';
      return true;
    });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => token, refreshSession });
    expect(await api.createChart(input)).toEqual({ ok: true, data: fixtures.chart });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const headers = fetchFn.mock.calls.map((c) => (c[1]?.headers as Record<string, string>).Authorization);
    expect(headers).toEqual(['Bearer expired', 'Bearer fresh']);
  });

  it('다시 받은 뒤에도 401 이면 거기서 멈춘다', async () => {
    const fetchFn = fakeFetch(401);
    const refreshSession = jest.fn(async () => true);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'x', refreshSession });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('세션을 다시 받지 못하면 다시 부르지 않는다', async () => {
    const fetchFn = fakeFetch(401);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'x', refreshSession: async () => false });
    expect(await api.createChart(input)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('POST /auth/dev 자체의 401 로는 세션을 다시 받지 않는다', async () => {
    const refreshSession = jest.fn(async () => true);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => null, refreshSession });
    expect(await api.createDevSession()).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

describe('api: 요약 해석', () => {
  it('POST /readings 를 본문 없이 세션 헤더와 함께 부르고 글을 받는다', async () => {
    const fetchFn = fakeFetch(200, fixtures.reading);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.createReading()).toEqual({ ok: true, data: fixtures.reading });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/readings`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('출생 정보가 없으면(404)·생성에 실패하면(502) 서버 오류, 429 는 한도 결과다', async () => {
    const call = (status: number) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(status, { error: 'X' }), getToken: () => null }).createReading();
    expect(await call(404)).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'X' });
    expect(await call(502)).toEqual({ ok: false, error: 'SERVER', status: 502, code: 'X' });
    expect(await call(429)).toEqual({ ok: false, error: 'LIMIT', status: 429 });
  });

  it('글의 모양이 계약과 다르면 INVALID 다', async () => {
    const r = fixtures.reading;
    expect(isReading(r)).toBe(true);
    const broken: unknown[] = [
      null,
      { ...r, headline: 1 },
      { ...r, sections: 'x' },
      { ...r, sections: [{ title: 't', body: 'b' }] },
      { ...r, sections: [{ title: 't', body: 'b', basis: [1] }] },
      { ...r, strengths: [1] },
      { ...r, cautions: undefined },
    ];
    for (const v of broken) expect(isReading(v)).toBe(false);
    // shareId 는 더 쓰지 않는다(서버 결정 012). 없어도, 예전처럼 있어도 받는다
    expect('shareId' in r).toBe(false);
    expect(isReading({ ...r, shareId: 'old' })).toBe(true);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { headline: 'x' }), getToken: () => null });
    expect(await api.createReading()).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('요약 해석 v2 의 만든 때(createdAt, 홈의 "별명을 받은 지 N일")는 있으면 글자여야 하고, 없는 옛 응답도 받는다(서버 결정 030 · 031)', () => {
    const r = fixtures.reading;
    expect(isReading({ ...r, createdAt: '2026-11-08T03:00:00Z' })).toBe(true);
    expect(isReading(r)).toBe(true);
    expect(isReading({ ...r, createdAt: 1 })).toBe(false);
  });

  it('가짜 서버를 켜면 fetch 없이 예시 글을 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.createReading()).toEqual({ ok: true, data: fixtures.reading });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// 이성 · 미래 주제(POST /directions {LOVE|FUTURE})는 앱이 더 부르지 않는다(결정 048 · 049). 글의 모양은 궁합 주제와 같다
describe('api: 방향성 제시의 모양', () => {
  it('항목이 정확히 3개가 아니거나, 빈 글·빈 근거가 있으면 계약과 다른 모양이다', () => {
    const d = fixtures.direction;
    const [a, b, c] = d.items;
    expect(isDirection(d)).toBe(true);
    const broken: unknown[] = [
      null,
      { ...d, topic: 'OTHER' },
      { ...d, topic: undefined },
      { ...d, title: '' },
      { ...d, title: undefined },
      { ...d, items: 'x' },
      { ...d, items: [a, b] },
      { ...d, items: [a, b, c, a] },
      { ...d, items: [a, b, { ...c, basis: [] }] },
      { ...d, items: [a, b, { ...c, basis: [1] }] },
      { ...d, items: [a, b, { ...c, basis: [''] }] },
      { ...d, items: [a, b, { ...c, basis: undefined }] },
      { ...d, items: [a, b, { ...c, title: '' }] },
      { ...d, items: [a, b, { ...c, body: '' }] },
      { ...d, items: [a, b, null] },
    ];
    for (const v of broken) expect(isDirection(v)).toBe(false);
  });
});

describe('api: 방향성 제시(궁합)', () => {
  const future = fixtures.directionFuture;
  const synastry = fixtures.directionSynastry;
  const bodyOf = (fetchFn: jest.MockedFunction<typeof fetch>) => JSON.parse(fetchFn.mock.calls[0][1]?.body as string);

  it('세 주제의 글을 모두 계약의 모양으로 받는다', () => {
    expect(future.topic).toBe('FUTURE');
    expect(synastry.topic).toBe('SYNASTRY');
    for (const d of [fixtures.direction, future, synastry]) {
      expect(isDirection(d)).toBe(true);
      expect(Object.keys(d).sort()).toEqual(['items', 'title', 'topic']);
    }
  });

  it('궁합: 상대의 출생 정보 없이는 { topic, synastryId } 만 보낸다', async () => {
    const fetchFn = fakeFetch(200, synastry);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.createSynastryDirection('syn-1')).toEqual({ ok: true, data: synastry });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/directions`);
    expect(bodyOf(fetchFn)).toEqual({ topic: 'SYNASTRY', synastryId: 'syn-1' });
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('궁합: 상대의 출생 정보를 함께 보내고, 시각을 모르면 placeId 키를 싣지 않는다', async () => {
    const known = fakeFetch(200, synastry);
    await createApi({ baseUrl: BASE, fetchFn: known, getToken: () => null }).createSynastryDirection('syn-1', input);
    expect(bodyOf(known)).toEqual({ topic: 'SYNASTRY', synastryId: 'syn-1', ...input });
    const unknown = fakeFetch(200, synastry);
    await createApi({ baseUrl: BASE, fetchFn: unknown, getToken: () => null }).createSynastryDirection('syn-1', {
      date: '1999-03-02',
      time: null,
      placeId: 1841277,
    });
    expect(bodyOf(unknown)).toEqual({ topic: 'SYNASTRY', synastryId: 'syn-1', date: '1999-03-02', time: null });
    expect('placeId' in bodyOf(unknown)).toBe(false);
  });

  it('요청한 주제와 다른 주제의 글이 오면 쓰지 않는다', async () => {
    const answer = (body: unknown) => createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, body), getToken: () => null });
    const invalid = { ok: false, error: 'INVALID', status: 200 };
    expect(await answer(future).createSynastryDirection('syn-1')).toEqual(invalid);
    expect(await answer(fixtures.direction).createSynastryDirection('syn-1', input)).toEqual(invalid);
  });

  it('궁합의 오류는 code 로 온다(BIRTH_REQUIRED · BIRTH_MISMATCH · PROFILE_CHANGED · NOT_FOUND)', async () => {
    const call = (status: number, error: string) =>
      createApi({
        baseUrl: BASE,
        fetchFn: fakeFetch(status, { error }),
        getToken: () => null,
      }).createSynastryDirection('syn-1');
    for (const [status, code] of [
      [400, 'BIRTH_REQUIRED'],
      [400, 'BIRTH_MISMATCH'],
      [409, 'PROFILE_CHANGED'],
      [404, 'NOT_FOUND'],
    ] as const)
      expect(await call(status, code)).toEqual({ ok: false, error: 'SERVER', status, code });
  });

  it('가짜 서버를 켜면 fetch 없이 예시 글을 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.createSynastryDirection('syn-1')).toEqual({ ok: true, data: synastry });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('예시 글은 조언형이다: 항목 제목이 "보기" 로 끝나고 숫자와 앞일의 단정이 없다', () => {
    for (const d of [future, synastry]) {
      const texts = [d.title, ...d.items.flatMap((i) => [i.title, i.body])];
      for (const item of d.items) expect(item.title).toMatch(/보기$/);
      for (const text of texts)
        expect(text).not.toMatch(/[0-9]|반드시|틀림없이|운명|거예요|겁니다|것입니다|게 됩니다|게 돼요/);
    }
  });
});

describe('api: 시기 풀이의 시기 모양(옛 심층 리포트의 시기와 같은 규칙, 서버 결정 033)', () => {
  const timing = fixtures.timingReport;

  it('마디 넷 · 구간 · 지금이 계약의 모양이 아니면 받지 않는다', () => {
    const [m1, m2, m3, m4] = timing.milestones;
    const [i1] = timing.intervals;
    const change = timing.intervals.find((i) => i.kind === 'CHANGE')!;
    const broken: unknown[] = [
      null,
      [],
      { ...timing, timeKnown: 'yes' },
      { ...timing, milestones: [m1, m2, m3] },
      { ...timing, milestones: [m2, m1, m3, m4] },
      { ...timing, milestones: [{ ...m1, year: '2022' }, m2, m3, m4] },
      { ...timing, milestones: [{ ...m1, age: null }, m2, m3, m4] },
      { ...timing, milestones: [{ ...m1, date: '2022-04' }, m2, m3, m4] },
      { ...timing, milestones: [{ ...m1, size: undefined }, m2, m3, m4] },
      { ...timing, intervals: 'x' },
      { ...timing, intervals: [{ ...i1, id: 1 }] },
      { ...timing, intervals: [{ ...i1, kind: 'OTHER' }] },
      { ...timing, intervals: [{ ...i1, area: 'HEALTH' }] },
      { ...timing, intervals: [{ ...i1, from: '2003' }] },
      { ...timing, intervals: [{ ...i1, to: 20030328 }] },
      { ...timing, intervals: [{ ...i1, title: undefined }] },
      { ...timing, intervals: [{ ...i1, body: 1 }] },
      // 크기는 변화 구간에만 있고, 변화 구간에는 꼭 있다
      { ...timing, intervals: [{ ...change, size: undefined }] },
      { ...timing, intervals: [{ ...change, size: 'HUGE' }] },
      { ...timing, intervals: [{ ...i1, kind: 'OPPORTUNITY', size: 'BIG' }] },
      { ...timing, current: undefined },
      { ...timing, current: { ...timing.current, date: 1 } },
      { ...timing, current: { ...timing.current, intervals: null } },
      { ...timing, current: { ...timing.current, intervals: [{}] } },
      { ...timing, current: { ...timing.current, milestone: null } },
      { ...timing, current: { ...timing.current, nextInterval: null } },
      { ...timing, current: { ...timing.current, nextMilestone: {} } },
      { ...timing, current: { ...timing.current, nearestMilestone: undefined } },
      { ...timing, current: { ...timing.current, nearestMilestone: 'CHIRON_RETURN' } },
    ];
    for (const v of broken) expect(isTimingReport(v)).toBe(false);
  });

  it('없어도 되는 값(지금의 변곡점 · 다음 구간 · 다음 변곡점 · 대표 구간)은 키가 없어도 받는다', () => {
    const { date, nearestMilestone } = timing.current;
    const current = { date, intervals: [], nearestMilestone };
    expect(isTimingReport({ ...timing, current })).toBe(true);
    expect(isTimingReport({ ...timing, intervals: [], current })).toBe(true);
    expect(isTimingReport({ ...timing, current: { ...current, milestone: timing.milestones[0] } })).toBe(true);
  });

  it('예시는 계약의 모양이다: 마디 넷, 시작 순서의 구간, 오늘에 걸친 구간과 다음 구간 · 다음 마디, 대표 구간은 걸친 구간 가운데', () => {
    expect(timing.timeKnown).toBe(true);
    expect(timing.milestones.map((m) => m.kind)).toEqual(['SATURN_SQUARE', 'SATURN_RETURN', 'URANUS_OPPOSITION', 'SECOND_SATURN_RETURN']);
    expect(timing.intervals.map((i) => i.from)).toEqual(timing.intervals.map((i) => i.from).sort());
    for (const i of timing.intervals) expect('size' in i).toBe(i.kind === 'CHANGE');
    const { current } = timing;
    expect(current.intervals).toEqual(timing.intervals.filter((i) => i.from <= current.date && current.date <= i.to));
    expect(current.nextInterval).toEqual(timing.intervals.find((i) => i.from > current.date));
    expect(current.nextMilestone).toEqual(timing.milestones.find((m) => m.date > current.date));
    expect(current.intervals.map((i) => i.id)).toContain(current.mainId);
    expect('milestone' in current).toBe(false);
  });

  it('시각 모름 예시에는 운명적 만남 구간과 돈 영역이 없고, 근거에 상승점 · 중천 · 버텍스 · 하우스가 없다', () => {
    const unknown = fixtures.timingReportTimeUnknown;
    expect(unknown.timeKnown).toBe(false);
    expect(unknown.intervals.filter((i) => i.kind === 'FATED' || i.area === 'MONEY')).toEqual([]);
    const items = unknown.intervals.flatMap((i) => i.reason?.items ?? []) as Record<string, unknown>[];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(['ASC', 'MC', 'VERTEX']).not.toContain(item.target);
      expect(item.house).toBeUndefined();
    }
  });
});

describe('api: 계정 삭제', () => {
  it('DELETE /account 를 본문 없이 세션 헤더와 함께 부르고, 204 는 본문을 읽지 않고 성공이다', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    })) as unknown as jest.MockedFunction<typeof fetch>;
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.deleteAccount()).toEqual({ ok: true, data: null });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/account`);
    expect(init?.method).toBe('DELETE');
    expect(init?.body).toBeUndefined();
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('실패는 종류를 구분해 돌려주고 다시 부르지 않는다', async () => {
    const failed = fakeFetch(500);
    expect(await createApi({ baseUrl: BASE, fetchFn: failed, getToken: () => 't' }).deleteAccount()).toEqual({
      ok: false,
      error: 'SERVER',
      status: 500,
    });
    expect(failed).toHaveBeenCalledTimes(1);
    const noSession = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => null });
    expect(await noSession.deleteAccount()).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
  });

  it('가짜 서버를 켜면 fetch 없이 성공한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.deleteAccount()).toEqual({ ok: true, data: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 궁합(직접 입력)', () => {
  const synastry = fixtures.synastry;
  const { overlay, ...stored } = synastry;
  const direct = { name: '지우', relation: 'LOVE' as const, date: '1999-03-02', time: '08:30', placeId: 1841277 };
  const call = (status: number, body: unknown) =>
    createApi({ baseUrl: BASE, fetchFn: fakeFetch(status, body), getToken: () => null });

  it('POST /synastry/direct 에 { name, relation, date, time, placeId } 를 세션 헤더와 함께 보내고 겹친 휠이 든 궁합을 받는다', async () => {
    const fetchFn = fakeFetch(200, synastry);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.createDirectSynastry(direct)).toEqual({ ok: true, data: synastry });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/synastry/direct`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(direct);
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('시각 "모름" 이면 placeId 키를 보내지 않는다(곳을 들고 있어도)', async () => {
    const fetchFn = fakeFetch(200, synastry);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    await api.createDirectSynastry({ ...direct, time: null, placeId: null });
    expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
      name: '지우',
      relation: 'LOVE',
      date: '1999-03-02',
      time: null,
    });
    await api.requestSynastryReport('abc', { date: '1999-03-02', time: null, placeId: 7 });
    expect(JSON.parse(String(fetchFn.mock.calls[1][1]?.body))).toEqual({ date: '1999-03-02', time: null });
  });

  it('실패하면 서버가 준 오류 이름(code)을 함께 돌려준다', async () => {
    expect(await call(404, { error: 'NO_PROFILE' }).createDirectSynastry(direct)).toEqual({
      ok: false,
      error: 'SERVER',
      status: 404,
      code: 'NO_PROFILE',
    });
    expect(await call(502, { error: 'GENERATION_FAILED' }).createDirectSynastry(direct)).toEqual({
      ok: false,
      error: 'SERVER',
      status: 502,
      code: 'GENERATION_FAILED',
    });
    expect(await call(429, { error: 'RATE_LIMITED' }).createDirectSynastry(direct)).toMatchObject({ error: 'LIMIT' });
    // 오류 본문이 없거나 모양이 달라도 결과는 같고 code 만 없다
    expect(await call(500, 'oops').createDirectSynastry(direct)).toEqual({ ok: false, error: 'SERVER', status: 500 });
  });

  it('궁합의 모양: 값이 없는 키(scoreLabel · overlay)는 없어도 되고, 있으면 모양이 맞아야 한다', () => {
    expect(isSynastry(synastry)).toBe(true);
    expect(isSynastry(stored)).toBe(true);
    expect(isSynastry({ ...stored, scoreLabel: '다른 결의 사이' })).toBe(true);
    const broken: unknown[] = [
      null,
      {},
      { ...stored, id: 1 },
      { ...stored, name: undefined },
      { ...stored, relation: 'ENEMY' },
      { ...stored, score: '82' },
      { ...stored, scoreLabel: null },
      { ...stored, headline: 1 },
      { ...stored, keywords: ['a', 'b'] },
      { ...stored, keywords: ['a', 'b', 3] },
      { ...stored, reportStatus: 'OTHER' },
      { ...stored, createdAt: 1 },
      { ...stored, overlay: null },
      { ...stored, overlay: { ...overlay, mine: 'x' } },
      { ...stored, overlay: { ...overlay, mine: [{ body: 'SUN' }] } },
      { ...stored, overlay: { ...overlay, mineAsc: '1' } },
      { ...stored, overlay: { ...overlay, theirs: [{ body: 1, longitude: 1 }] } },
      { ...stored, overlay: { ...overlay, lines: [{ mine: 'SUN', theirs: 'SUN' }] } },
    ];
    for (const v of broken) expect(isSynastry(v)).toBe(false);
    const { mineAsc, ...noAsc } = overlay!;
    expect(mineAsc).toEqual(expect.any(Number));
    expect(isSynastry({ ...stored, overlay: noAsc })).toBe(true);
  });

  it('GET /synastry 는 목록을, GET /synastry/{id} 는 하나를 받는다', async () => {
    const fetchFn = fakeFetch(200, fixtures.synastryList);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.listSynastries()).toEqual({ ok: true, data: fixtures.synastryList });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/synastry`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    const one = fakeFetch(200, stored);
    const api2 = createApi({ baseUrl: BASE, fetchFn: one, getToken: () => 'session-abc' });
    expect(await api2.getSynastry(stored.id)).toEqual({ ok: true, data: stored });
    expect(one.mock.calls[0][0]).toBe(`${BASE}/synastry/${stored.id}`);
    expect(await call(200, [{ id: 'x' }]).listSynastries()).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await call(404, { error: 'NOT_FOUND' }).getSynastry('nope')).toMatchObject({ error: 'SERVER', status: 404 });
  });

  it('GET /synastry/ranking?relation= 은 서버가 준 순서 그대로 받는다', async () => {
    const ranking = [
      { id: 'b', name: '하준', score: 55, scoreLabel: '다른 결의 사이', keywords: ['a', 'b', 'c'] },
      { id: 'a', name: '지우', score: 82, keywords: ['a', 'b', 'c'] },
    ];
    const fetchFn = fakeFetch(200, ranking);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.getSynastryRanking('LOVE')).toEqual({ ok: true, data: ranking });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/synastry/ranking?relation=LOVE`);
    expect(isSynastryRanking([{ id: 'a', name: 'n', score: 1 }])).toBe(false);
    expect(isSynastryRanking([{ id: 'a', name: 'n', score: 1, keywords: ['a', 'b', 'c'], scoreLabel: 1 }])).toBe(false);
    expect(isSynastryRanking([])).toBe(true);
  });

  it('POST /synastry/{id}/report 에 상대의 출생 정보를 다시 보내고 상태를 받는다', async () => {
    const birth = { date: '1999-03-02', time: '08:30', placeId: 1841277 };
    const fetchFn = fakeFetch(202, { status: 'WRITING' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.requestSynastryReport('abc', birth)).toEqual({ ok: true, data: { status: 'WRITING' } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/synastry/abc/report`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(birth);
    for (const status of ['DONE', 'FAILED'])
      expect(await call(202, { status }).requestSynastryReport('abc', birth)).toEqual({ ok: true, data: { status } });
    expect(await call(202, { status: 'NONE' }).requestSynastryReport('abc', birth)).toMatchObject({ error: 'INVALID' });
    expect(await call(400, { error: 'BIRTH_MISMATCH' }).requestSynastryReport('abc', birth)).toEqual({
      ok: false,
      error: 'SERVER',
      status: 400,
      code: 'BIRTH_MISMATCH',
    });
    expect(await call(409, { error: 'PROFILE_CHANGED' }).requestSynastryReport('abc', birth)).toMatchObject({
      status: 409,
      code: 'PROFILE_CHANGED',
    });
  });

  it('GET /synastry/{id}/report 는 네 가지 상태를 받고, 글은 끌림 · 대화 · 갈등 · 오래가기 순서의 네 영역이어야 한다', async () => {
    const report = fixtures.synastryReport;
    const fetchFn = fakeFetch(200, { status: 'DONE', report });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    expect(await api.getSynastryReport('abc')).toEqual({ ok: true, data: { status: 'DONE', report } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/synastry/abc/report`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    for (const status of ['NONE', 'WRITING', 'FAILED'])
      expect(await call(200, { status }).getSynastryReport('abc')).toEqual({ ok: true, data: { status } });
    expect(report.sections.map((s) => s.area)).toEqual(['ATTRACTION', 'TALK', 'CONFLICT', 'LASTING']);
    const [a, b, c, d] = report.sections;
    for (const v of [
      { status: 'DONE' },
      { status: 'DONE', report: { sections: [a, b, c] } },
      { status: 'DONE', report: { sections: [b, a, c, d] } },
      { status: 'DONE', report: fixtures.timingReport },
      { status: 'DONE', report: { sections: [{ ...a, paragraphs: [] }, b, c, d] } },
      { status: 'OTHER' },
    ])
      expect(isSynastryReportState(v)).toBe(false);
  });

  it('예시 응답은 계약의 모양이다: 목록에는 overlay 가 없고, 60 미만인 것에만 scoreLabel 이 있다', () => {
    expect(isSynastry(synastry) && synastry.overlay !== undefined).toBe(true);
    expect(synastry.overlay?.mine).toHaveLength(10);
    expect(synastry.overlay?.theirs).toHaveLength(10);
    for (const item of fixtures.synastryList) {
      expect(isSynastry(item)).toBe(true);
      expect('overlay' in item).toBe(false);
      expect('scoreLabel' in item).toBe(item.score < 60);
    }
    expect(isSynastryReportState({ status: 'DONE', report: fixtures.synastryReport })).toBe(true);
  });

  it('가짜 서버를 켜면 fetch 없이 답한다: 계산은 넣은 이름 · 관계 그대로, 랭킹은 그 관계만 점수순', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const made = await api.createDirectSynastry({ ...direct, name: '도윤', relation: 'WORK' });
    expect(made).toMatchObject({ ok: true, data: { name: '도윤', relation: 'WORK', overlay: synastry.overlay } });
    expect(await api.listSynastries()).toEqual({ ok: true, data: fixtures.synastryList });
    const one = await api.getSynastry(synastry.id);
    expect(one.ok && 'overlay' in one.data).toBe(false);
    expect(await api.getSynastry('nope')).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    const friends = await api.getSynastryRanking('FRIEND');
    expect(friends.ok && friends.data.map((r) => [r.name, r.score])).toEqual([
      ['민서', 91],
      ['서연', 77],
    ]);
    expect(await api.requestSynastryReport(synastry.id, direct)).toEqual({ ok: true, data: { status: 'DONE' } });
    expect(await api.getSynastryReport(synastry.id)).toEqual({
      ok: true,
      data: { status: 'DONE', report: fixtures.synastryReport },
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 문의하기 · 내 문의(결정 058, 서버 S⑧)', () => {
  const inquiry = { category: 'BUG' as const, body: '리포트 화면이 열리지 않아요.' };
  const call = (status: number, body?: unknown) => {
    const fetchFn = fakeFetch(status, body);
    return { fetchFn, api: createApi({ baseUrl: BASE, fetchFn, getToken: () => 't' }) };
  };
  const item = {
    id: '0b5d6c1e-3f0a-4d53-9a51-2f8f1f0f7a10',
    category: 'BUG',
    body: '아침에 오늘의 하늘 알림이 오지 않아요.',
    status: 'ANSWERED',
    createdAt: '2026-11-18T01:00:00Z',
    answer: { body: '알려 주셔서 고마워요.', answeredAt: '2026-11-19T02:00:00Z' },
  };
  const mine = { id: item.id, category: 'BUG', body: item.body, createdAt: item.createdAt, answer: item.answer, emailed: false };

  it('POST /inquiries 에 종류 · 내용만 보낸다 — replyEmail 키를 보내면 서버가 옛 앱으로 보므로 싣지 않는다', async () => {
    const fetchFn = fakeFetch(201, { id: item.id });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.createInquiry(inquiry)).toEqual({ ok: true, data: { id: item.id } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/inquiries`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ category: 'BUG', body: '리포트 화면이 열리지 않아요.' });
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('replyEmail');
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
  });

  it('새 종류는 오류 · 제안 · 계정 · 기타 넷이다', () => {
    expect(INQUIRY_CATEGORIES).toEqual(['BUG', 'IDEA', 'ACCOUNT', 'ETC']);
  });

  it('400 은 서버가 적은 이름을 code 로, 429 는 한도 결과로 돌려주고 다시 부르지 않는다', async () => {
    const bad = call(400, { error: 'INVALID_BODY' });
    expect(await bad.api.createInquiry(inquiry)).toEqual({ ok: false, error: 'SERVER', status: 400, code: 'INVALID_BODY' });
    expect(bad.fetchFn).toHaveBeenCalledTimes(1);
    expect(await call(429, { error: 'RATE_LIMITED' }).api.createInquiry(inquiry)).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    expect(await call(201, {}).api.createInquiry(inquiry)).toEqual({ ok: false, error: 'INVALID', status: 201 });
  });

  it('GET /inquiries 는 내 문의를 받은 순서 그대로(새것부터) 읽고, 없으면 빈 목록이다', async () => {
    const open = { id: 'b', category: 'IDEA', body: '별명을 다시 받을 수 있나요?', status: 'OPEN', createdAt: '2026-11-20T01:00:00Z' };
    const list = call(200, [open, item]);
    expect(await list.api.getInquiries()).toEqual({
      ok: true,
      data: [{ id: 'b', category: 'IDEA', body: open.body, createdAt: open.createdAt, answer: null, emailed: false }, mine],
    });
    expect(list.fetchFn.mock.calls[0][0]).toBe(`${BASE}/inquiries`);
    expect(list.fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(await call(200, []).api.getInquiries()).toEqual({ ok: true, data: [] });
  });

  it('모르는 종류(옛 READING · SYNASTRY · OTHER 등)는 기타로, 옛 문의의 replyEmail 은 이메일로 답한 문의로 읽는다(이메일 글자는 버린다)', async () => {
    const old = { ...item, category: 'READING', status: 'OPEN', answer: undefined, replyEmail: 'me@example.test' };
    const res = await call(200, [old, { ...item, category: 'SOMETHING_NEW' }]).api.getInquiries();
    expect(res).toEqual({ ok: true, data: [{ ...mine, category: 'ETC', answer: null, emailed: true }, { ...mine, category: 'ETC' }] });
    expect(JSON.stringify(res)).not.toContain('me@example.test');
  });

  it('한 줄이라도 모양이 계약과 다르면 목록 전체가 INVALID 다', async () => {
    for (const bad of [{ ...item, id: 3 }, { ...item, body: null }, { ...item, createdAt: undefined }, { ...item, answer: { body: '답' } }, { ...item, category: 1 }]) {
      expect(await call(200, [item, bad]).api.getInquiries()).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(await call(200, { items: [] }).api.getInquiries()).toMatchObject({ ok: false, error: 'INVALID' });
  });

  it('GET /inquiries/{id} 는 한 건을 같은 모양으로, 남의 것 · 없는 것은 404 NOT_FOUND 를 code 로 준다', async () => {
    const one = call(200, item);
    expect(await one.api.getInquiry(item.id)).toEqual({ ok: true, data: mine });
    expect(one.fetchFn.mock.calls[0][0]).toBe(`${BASE}/inquiries/${item.id}`);
    expect(await call(404, { error: 'NOT_FOUND' }).api.getInquiry('x')).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
  });

  it('식별자는 주소에 넣기 전에 인코딩한다', async () => {
    const one = call(404, { error: 'NOT_FOUND' });
    await one.api.getInquiry('a/b?c');
    expect(one.fetchFn.mock.calls[0][0]).toBe(`${BASE}/inquiries/a%2Fb%3Fc`);
  });

  it('가짜 서버를 켜면 fetch 없이 성공한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.createInquiry(inquiry)).toMatchObject({ ok: true, data: { id: expect.any(String) } });
    expect(await api.getInquiries()).toMatchObject({ ok: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 앱 버전 헤더와 강제 업데이트(결정 027)', () => {
  const platformConfig = {
    minVersion: '1.2.0',
    latestVersion: '1.3.0',
    storeUrl: 'https://store.example.test/app',
    message: null,
    blockNow: false,
  };
  const appConfig = { ios: platformConfig, android: { ...platformConfig, minVersion: null, storeUrl: null } };

  it('네이티브 앱이면 모든 요청에 X-App-Platform · X-App-Version 을 붙인다', async () => {
    const fetchFn = fakeFetch(200, fixtures.chart);
    const api = createApi({
      baseUrl: BASE,
      fetchFn,
      getToken: () => 'token-1',
      client: { platform: 'ios', version: '1.0.0' },
    });
    await api.createChart(input);
    expect(headersOf(fetchFn)).toMatchObject({
      'X-App-Platform': 'ios',
      'X-App-Version': '1.0.0',
      Authorization: 'Bearer token-1',
    });

    // 세션이 필요 없는 요청에도 붙인다.
    const fetchPlaces = fakeFetch(200, []);
    const android = createApi({
      baseUrl: BASE,
      fetchFn: fetchPlaces,
      getToken: () => null,
      client: { platform: 'android', version: '2.3.4' },
    });
    await android.listPlaces();
    expect(headersOf(fetchPlaces)).toMatchObject({ 'X-App-Platform': 'android', 'X-App-Version': '2.3.4' });
  });

  it('웹(client 가 없다)이면 버전 헤더를 보내지 않는다', async () => {
    for (const client of [null, undefined]) {
      const fetchFn = fakeFetch(200, fixtures.chart);
      const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, client });
      await api.createChart(input);
      expect(Object.keys(headersOf(fetchFn)).filter((name) => name.startsWith('X-App-'))).toEqual([]);
    }
  });

  it('GET /app-config 를 세션 헤더 없이 부르고 플랫폼별 설정을 받는다', async () => {
    const fetchFn = fakeFetch(200, appConfig);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1' });
    expect(await api.getAppConfig()).toEqual({ ok: true, data: appConfig });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/app-config`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(headersOf(fetchFn).Authorization).toBeUndefined();
  });

  it('GET /app-config 가 401 이어도 세션을 다시 받지 않는다', async () => {
    const refreshSession = jest.fn(async () => true);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => null, refreshSession });
    expect((await api.getAppConfig()).ok).toBe(false);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('설정의 모양: 두 플랫폼이 모두 있고, 값은 글자 또는 null, blockNow 는 참 · 거짓이어야 한다', () => {
    expect(isAppConfig(appConfig)).toBe(true);
    expect(isAppConfig({ ios: { ...platformConfig, message: '점검이 있었어요' }, android: platformConfig })).toBe(true);
    expect(isAppConfig(null)).toBe(false);
    expect(isAppConfig([])).toBe(false);
    expect(isAppConfig({ ios: platformConfig })).toBe(false);
    expect(isAppConfig({ ios: platformConfig, android: null })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, minVersion: 120 } })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, minVersion: undefined } })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, storeUrl: 1 } })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, message: {} } })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, blockNow: 'true' } })).toBe(false);
    const { blockNow: _blockNow, ...withoutBlockNow } = platformConfig;
    expect(isAppConfig({ ...appConfig, android: withoutBlockNow })).toBe(false);
  });

  it('latestVersion(결정 059)은 글자 또는 null 이고, 다른 값이면 설정 전체를 받지 않는다', () => {
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, latestVersion: null } })).toBe(true);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, latestVersion: 130 } })).toBe(false);
    expect(isAppConfig({ ...appConfig, ios: { ...platformConfig, latestVersion: {} } })).toBe(false);
  });

  it('latestVersion 이 없는 옛 서버의 설정도 받고, 그 값은 null 로 읽는다(권하지 않는다)', async () => {
    const { latestVersion: _latest, ...old } = platformConfig;
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { ios: old, android: old }), getToken: () => null });
    expect(await api.getAppConfig()).toEqual({
      ok: true,
      data: { ios: { ...old, latestVersion: null }, android: { ...old, latestVersion: null } },
    });
  });

  it('모양이 다른 설정은 INVALID, 실패는 종류대로 돌려주고 다시 부르지 않는다', async () => {
    const bad = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { ios: {} }), getToken: () => null });
    expect(await bad.getAppConfig()).toEqual({ ok: false, error: 'INVALID', status: 200 });
    const fetchFn = fakeFetch(503);
    const down = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    expect(await down.getAppConfig()).toEqual({ ok: false, error: 'SERVER', status: 503 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('어느 호출이든 426 UPDATE_REQUIRED 를 받으면 알리고, 결과는 code 와 함께 실패다', async () => {
    const onUpdateRequired = jest.fn();
    const fetchFn = fakeFetch(426, { error: 'UPDATE_REQUIRED' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1', onUpdateRequired });
    expect(await api.createReading()).toEqual({ ok: false, error: 'SERVER', status: 426, code: 'UPDATE_REQUIRED' });
    expect(onUpdateRequired).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await api.getAppConfig();
    expect(onUpdateRequired).toHaveBeenCalledTimes(2);
  });

  it('426 이라도 UPDATE_REQUIRED 가 아니거나 다른 상태의 UPDATE_REQUIRED 면 알리지 않는다', async () => {
    const onUpdateRequired = jest.fn();
    for (const fetchFn of [
      fakeFetch(426),
      fakeFetch(426, { error: 'OTHER' }),
      fakeFetch(400, { error: 'UPDATE_REQUIRED' }),
    ]) {
      const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, onUpdateRequired });
      expect((await api.createReading()).ok).toBe(false);
    }
    expect(onUpdateRequired).not.toHaveBeenCalled();
  });

  it('가짜 서버를 켜면 fetch 없이 아무도 막지 않는 설정을 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const r = await api.getAppConfig();
    expect(r.ok && [r.data.ios.minVersion, r.data.android.minVersion]).toEqual([null, null]);
    expect(r.ok && [r.data.ios.latestVersion, r.data.android.latestVersion]).toEqual([null, null]);
    expect(r.ok && isAppConfig(r.data)).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 자주 묻는 질문(결정 028)', () => {
  const faqs = [
    { id: 'faq-1', question: '요금이 있나요?', answer: '지금은 모두 무료예요.' },
    { id: 'faq-2', question: '결과는 어떻게 만들어지나요?', answer: '첫 줄\n둘째 줄' },
  ];

  it('GET /faqs 를 세션 헤더 없이 부르고 서버가 준 순서 그대로 받는다', async () => {
    const fetchFn = fakeFetch(200, faqs);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1' });
    expect(await api.listFaqs()).toEqual({ ok: true, data: faqs });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/faqs`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(headersOf(fetchFn).Authorization).toBeUndefined();
  });

  it('빈 목록도 받는다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, []), getToken: () => null });
    expect(await api.listFaqs()).toEqual({ ok: true, data: [] });
  });

  it('목록의 모양: 배열이고, 항목마다 비지 않은 글자 id · question · answer 가 있어야 한다', () => {
    expect(isFaqList(faqs)).toBe(true);
    expect(isFaqList([])).toBe(true);
    expect(isFaqList(null)).toBe(false);
    expect(isFaqList({})).toBe(false);
    expect(isFaqList({ items: faqs })).toBe(false);
    expect(isFaqList('[]')).toBe(false);
    expect(isFaqList([null])).toBe(false);
    expect(isFaqList(['요금이 있나요?'])).toBe(false);
    expect(isFaqList([{ question: 'q', answer: 'a' }])).toBe(false);
    expect(isFaqList([{ id: 1, question: 'q', answer: 'a' }])).toBe(false);
    expect(isFaqList([{ id: 'a', question: 'q' }])).toBe(false);
    expect(isFaqList([{ id: 'a', question: 'q', answer: null }])).toBe(false);
    expect(isFaqList([{ id: 'a', question: 'q', answer: ['a'] }])).toBe(false);
    expect(isFaqList([{ id: 'a', question: '', answer: 'a' }])).toBe(false);
    expect(isFaqList([{ id: 'a', question: 'q', answer: '' }])).toBe(false);
    expect(isFaqList([{ id: '', question: 'q', answer: 'a' }])).toBe(false);
    // 하나라도 어긋나면 목록 전체를 받지 않는다.
    expect(isFaqList([...faqs, { id: 'faq-3', question: 'q' }])).toBe(false);
  });

  it('모양이 다른 목록은 INVALID, 429 는 한도, 그 밖의 실패는 종류대로 돌려주고 다시 부르지 않는다', async () => {
    const call = async (status: number, body?: unknown) => {
      const fetchFn = fakeFetch(status, body);
      const result = await createApi({ baseUrl: BASE, fetchFn, getToken: () => null }).listFaqs();
      expect(fetchFn).toHaveBeenCalledTimes(1);
      return result;
    };
    expect(await call(200, [{ id: 'a', question: 'q' }])).toEqual({ ok: false, error: 'INVALID', status: 200 });
    expect(await call(200, { faqs })).toEqual({ ok: false, error: 'INVALID', status: 200 });
    expect(await call(429)).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    expect(await call(500)).toEqual({ ok: false, error: 'SERVER', status: 500 });
  });

  it('가짜 서버를 켜면 fetch 없이 작은 예시 목록을 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const r = await api.listFaqs();
    expect(r).toEqual({ ok: true, data: fixtures.faqs });
    expect(isFaqList(fixtures.faqs)).toBe(true);
    expect(fixtures.faqs.length).toBeGreaterThan(0);
    expect(fixtures.faqs.length).toBeLessThanOrEqual(3);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 서버에 저장된 출생 정보(결정 029)', () => {
  it('GET /profile 을 세션 헤더와 함께 부르고 저장된 출생 정보를 받는다', async () => {
    const fetchFn = fakeFetch(200, input);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1' });
    expect(await api.getProfile()).toEqual({ ok: true, data: input });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/profile`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(fetchFn.mock.calls[0][1]?.body).toBeUndefined();
    expect(headersOf(fetchFn).Authorization).toBe('Bearer token-1');
  });

  it('시각 "모름" 이면 placeId 가 null 인 출생 정보를 받는다', async () => {
    const unknown = { date: '2000-06-15', time: null, placeId: null };
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, unknown), getToken: () => 't' });
    expect(await api.getProfile()).toEqual({ ok: true, data: unknown });
  });

  it('저장된 것이 없으면(404 NO_PROFILE) code 와 함께 실패이고 다시 부르지 않는다', async () => {
    const fetchFn = fakeFetch(404, { error: 'NO_PROFILE' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 't' });
    expect(await api.getProfile()).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('모양이 다른 출생 정보는 INVALID 다(시각이 있는데 곳이 없다 · 날짜가 없다)', async () => {
    for (const body of [{ date: '2000-06-15', time: '21:00', placeId: null }, { time: null, placeId: null }, null]) {
      const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, body), getToken: () => 't' });
      expect(await api.getProfile()).toEqual({ ok: false, error: 'INVALID', status: 200 });
    }
  });

  it('가짜 서버를 켜면 fetch 없이 "저장된 것이 없다" 로 답한다(되살리지 않는다)', async () => {
    const fetchFn = fakeFetch(200, input);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 't', useFixtures: true });
    expect(await api.getProfile()).toEqual({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 점검(결정 030)', () => {
  const platformConfig = { minVersion: null, latestVersion: null, storeUrl: null, message: null, blockNow: false };
  const base = { ios: platformConfig, android: platformConfig };

  it('GET /app-config 의 maintenance 를 함께 받는다', async () => {
    const config = { ...base, maintenance: { active: true, message: '새벽 2시까지 점검해요' } };
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, config), getToken: () => null });
    expect(await api.getAppConfig()).toEqual({ ok: true, data: config });
  });

  it('설정의 모양: maintenance 가 있으면 active 는 참 · 거짓, message 는 글자 또는 null 이어야 한다', () => {
    expect(isAppConfig({ ...base, maintenance: { active: false, message: null } })).toBe(true);
    expect(isAppConfig({ ...base, maintenance: { active: true, message: '점검 중' } })).toBe(true);
    expect(isAppConfig({ ...base, maintenance: null })).toBe(false);
    expect(isAppConfig({ ...base, maintenance: true })).toBe(false);
    expect(isAppConfig({ ...base, maintenance: { active: 'true', message: null } })).toBe(false);
    expect(isAppConfig({ ...base, maintenance: { active: true } })).toBe(false);
    expect(isAppConfig({ ...base, maintenance: { active: true, message: 1 } })).toBe(false);
    expect(isAppConfig({ ...base, maintenance: { message: null } })).toBe(false);
  });

  it('maintenance 키가 없는 옛 서버의 응답도 받는다(점검 중이 아닌 것으로 읽는다)', async () => {
    expect(isAppConfig(base)).toBe(true);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, base), getToken: () => null });
    const r = await api.getAppConfig();
    expect(r).toEqual({ ok: true, data: base });
    expect(r.ok && r.data.maintenance).toBeUndefined();
  });

  it('어느 호출이든 503 MAINTENANCE 를 받으면 알리고, 결과는 code 와 함께 실패다(다시 부르지 않는다)', async () => {
    const onMaintenance = jest.fn();
    const onUpdateRequired = jest.fn();
    const fetchFn = fakeFetch(503, { error: 'MAINTENANCE' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1', onMaintenance, onUpdateRequired });
    expect(await api.createReading()).toEqual({ ok: false, error: 'SERVER', status: 503, code: 'MAINTENANCE' });
    expect(onMaintenance).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    // 세션이 없는 호출(공유 페이지)도 알린다.
    await api.getSharedCard('AbCdEfGhIjKlMnOpQrStUv');
    expect(onMaintenance).toHaveBeenCalledTimes(2);
    expect(onUpdateRequired).not.toHaveBeenCalled();
  });

  it('503 이라도 MAINTENANCE 가 아니거나 다른 상태의 MAINTENANCE 면 알리지 않는다', async () => {
    const onMaintenance = jest.fn();
    for (const fetchFn of [
      fakeFetch(503),
      fakeFetch(503, { error: 'OTHER' }),
      fakeFetch(500, { error: 'MAINTENANCE' }),
    ]) {
      const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, onMaintenance });
      expect((await api.createReading()).ok).toBe(false);
    }
    expect(onMaintenance).not.toHaveBeenCalled();
  });

  it('가짜 서버의 설정은 점검 중이 아니다', async () => {
    const api = createApi({ baseUrl: BASE, getToken: () => null, useFixtures: true });
    const r = await api.getAppConfig();
    expect(r.ok && r.data.maintenance).toEqual({ active: false, message: null });
  });
});

describe('api: 앱이 쓰는 인스턴스의 점검 알림(결정 030)', () => {
  it('503 MAINTENANCE 를 받으면 등록된 처리기를 부르고, 처리기를 거두면 부르지 않는다', async () => {
    const { api, setMaintenanceHandler } = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
    const original = globalThis.fetch;
    globalThis.fetch = fakeFetch(503, { error: 'MAINTENANCE' });
    try {
      const handler = jest.fn();
      setMaintenanceHandler(handler);
      expect(await api.getSharedCard('AbCdEfGhIjKlMnOpQrStUv')).toMatchObject({ ok: false, code: 'MAINTENANCE' });
      expect(handler).toHaveBeenCalledTimes(1);
      setMaintenanceHandler(null);
      await api.getSharedCard('AbCdEfGhIjKlMnOpQrStUv');
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('api: 궁합 지우기', () => {
  it('DELETE /synastry/{id} 를 세션 헤더와 함께 본문 없이 부르고, 204 면 성공이다', async () => {
    const fetchFn = fakeFetch(204);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'token-1' });
    expect(await api.deleteSynastry('syn 1/2')).toEqual({ ok: true, data: null });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/synastry/syn%201%2F2`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('DELETE');
    expect(fetchFn.mock.calls[0][1]?.body).toBeUndefined();
    expect(headersOf(fetchFn).Authorization).toBe('Bearer token-1');
  });

  it('없는 궁합(404 NOT_FOUND)과 그 밖의 실패는 종류대로 돌려주고 다시 부르지 않는다', async () => {
    const gone = fakeFetch(404, { error: 'NOT_FOUND' });
    expect(await createApi({ baseUrl: BASE, fetchFn: gone, getToken: () => 't' }).deleteSynastry('s1')).toEqual({
      ok: false,
      error: 'SERVER',
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(gone).toHaveBeenCalledTimes(1);
    const failed = fakeFetch(500);
    expect(await createApi({ baseUrl: BASE, fetchFn: failed, getToken: () => 't' }).deleteSynastry('s1')).toEqual({
      ok: false,
      error: 'SERVER',
      status: 500,
    });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it('가짜 서버를 켜면 fetch 없이 성공이다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.deleteSynastry('s1')).toEqual({ ok: true, data: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
