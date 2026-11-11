import { createApi, isChart, isPlaceList } from '@/lib/api';
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
    expect(await api2.searchPlaces('서울')).toEqual({ ok: false, error: 'INVALID', status: 200 });
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

  it('GET /places?q= 에 검색어를 인코딩해 보낸다', async () => {
    const fetchFn = fakeFetch(200, fixtures.places);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null });
    const result = await api.searchPlaces('서울 마포');
    expect(result.ok).toBe(true);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/places?q=${encodeURIComponent('서울 마포')}`);
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });
});

describe('api: 개발용 가짜 서버 스위치', () => {
  it('켜면 fetch 를 부르지 않고 fixtures 로 답한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    const places = await api.searchPlaces('마포');
    expect(places.ok && places.data.map((p) => p.name)).toEqual(['서울특별시 마포구']);
    // 서버와 같이: 공백으로 나눈 낱말이 이름에 모두 들어 있으면 찾고, 20개까지만 준다
    const words = await api.searchPlaces('서울 마포');
    expect(words.ok && words.data.map((p) => p.id)).toEqual([1841277]);
    const many = await api.searchPlaces('시');
    expect(many.ok && many.data.length).toBe(20);
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
