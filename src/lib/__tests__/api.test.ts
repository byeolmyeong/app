import { createApi, isChart, isPlaceList, isReading, isReport, isReportState } from '@/lib/api';
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
    expect(Object.keys(fixtures.reading).sort()).toEqual(['cautions', 'headline', 'sections', 'shareId', 'strengths']);
    expect(Object.keys(fixtures.reading.sections[0]).sort()).toEqual(['basis', 'body', 'title']);
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
    expect(session.ok && session.data.token.length).toBeGreaterThan(0);
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
    expect(await call(404)).toEqual({ ok: false, error: 'SERVER', status: 404 });
    expect(await call(502)).toEqual({ ok: false, error: 'SERVER', status: 502 });
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
      { ...r, shareId: undefined },
    ];
    for (const v of broken) expect(isReading(v)).toBe(false);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { headline: 'x' }), getToken: () => null });
    expect(await api.createReading()).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('가짜 서버를 켜면 fetch 없이 예시 글을 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.createReading()).toEqual({ ok: true, data: fixtures.reading });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('api: 심층 리포트', () => {
  const report = fixtures.report;

  it('POST /reports 를 본문 없이 세션 헤더와 함께 부르고 상태를 받는다', async () => {
    const fetchFn = fakeFetch(202, { status: 'WRITING' });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.requestReport()).toEqual({ ok: true, data: { status: 'WRITING' } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/reports`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
    const done = createApi({ baseUrl: BASE, fetchFn: fakeFetch(202, { status: 'DONE' }), getToken: () => null });
    expect(await done.requestReport()).toEqual({ ok: true, data: { status: 'DONE' } });
  });

  it('POST /reports: 출생 정보가 없으면(404) 서버 오류, 429 는 한도, 모르는 상태는 INVALID 다', async () => {
    const call = (status: number, body: unknown) =>
      createApi({ baseUrl: BASE, fetchFn: fakeFetch(status, body), getToken: () => null }).requestReport();
    expect(await call(404, { error: 'NO_PROFILE' })).toEqual({ ok: false, error: 'SERVER', status: 404 });
    expect(await call(429, {})).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    for (const body of [null, {}, { status: 'NONE' }, { status: 'FAILED' }, { status: 1 }])
      expect(await call(202, body)).toEqual({ ok: false, error: 'INVALID', status: 202 });
  });

  it('GET /reports/me 를 세션 헤더와 함께 부르고 네 가지 상태를 받는다', async () => {
    const fetchFn = fakeFetch(200, { status: 'DONE', report });
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => 'session-abc' });
    expect(await api.getReport()).toEqual({ ok: true, data: { status: 'DONE', report } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/reports/me`);
    expect(init?.method).toBe('GET');
    expect(headersOf(fetchFn).Authorization).toBe('Bearer session-abc');
    for (const status of ['NONE', 'WRITING', 'FAILED']) {
      const other = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { status }), getToken: () => null });
      expect(await other.getReport()).toEqual({ ok: true, data: { status } });
    }
  });

  it('상태의 모양이 계약과 다르면 INVALID 다', async () => {
    const broken: unknown[] = [null, {}, { status: 'OTHER' }, { status: 'DONE' }, { status: 'DONE', report: {} }];
    for (const v of broken) expect(isReportState(v)).toBe(false);
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { status: 'DONE' }), getToken: () => null });
    expect(await api.getReport()).toEqual({ ok: false, error: 'INVALID', status: 200 });
  });

  it('리포트는 성격 · 관계 · 일 · 감정 네 영역이 이 순서로 있고 문단마다 제목 · 본문 · 근거가 있어야 한다', () => {
    expect(isReport(report)).toBe(true);
    const [a, b, c, d] = report.sections;
    const p = a.paragraphs[0];
    const broken: unknown[] = [
      null,
      {},
      { sections: 'x' },
      { sections: [a, b, c] },
      { sections: [b, a, c, d] },
      { sections: [a, b, c, d, d] },
      { sections: [a, b, c, { ...d, area: 'TIMING' }] },
      { sections: [{ ...a, title: 1 }, b, c, d] },
      { sections: [{ ...a, paragraphs: [] }, b, c, d] },
      { sections: [{ ...a, paragraphs: [{ ...p, title: undefined }] }, b, c, d] },
      { sections: [{ ...a, paragraphs: [{ ...p, body: 1 }] }, b, c, d] },
      { sections: [{ ...a, paragraphs: [{ title: 't', body: 'b' }] }, b, c, d] },
      { sections: [{ ...a, paragraphs: [{ ...p, basis: [1] }] }, b, c, d] },
    ];
    for (const v of broken) expect(isReport(v)).toBe(false);
  });

  it('계약에 아직 없는 필드(나중에 올 timing)는 무시한다', () => {
    expect(isReport({ ...report, timing: { anything: 1 } })).toBe(true);
    expect(isReportState({ status: 'DONE', report: { ...report, timing: [] }, extra: 1 })).toBe(true);
  });

  it('예시 리포트는 계약의 모양이다: 네 영역, 영역마다 문단 4~6개, 계약의 필드만', () => {
    expect(Object.keys(report)).toEqual(['sections']);
    expect(report.sections.map((s) => s.area)).toEqual(['PERSONALITY', 'RELATIONSHIP', 'WORK', 'EMOTION']);
    for (const section of report.sections) {
      expect(Object.keys(section).sort()).toEqual(['area', 'paragraphs', 'title']);
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(4);
      expect(section.paragraphs.length).toBeLessThanOrEqual(6);
      for (const paragraph of section.paragraphs) expect(Object.keys(paragraph).sort()).toEqual(['basis', 'body', 'title']);
    }
  });

  it('가짜 서버를 켜면 fetch 없이 요청은 DONE, 확인은 예시 리포트를 준다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.requestReport()).toEqual({ ok: true, data: { status: 'DONE' } });
    expect(await api.getReport()).toEqual({ ok: true, data: { status: 'DONE', report } });
    expect(fetchFn).not.toHaveBeenCalled();
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
