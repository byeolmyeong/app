import { createApi, isDaySky, isMonthSky, isTimingReport, isTimingReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const apiWith = (fetchFn: typeof fetch) => createApi({ baseUrl: BASE, getToken: () => 'tok', fetchFn });

describe('이번 달 MonthSky(서버 결정 032, `GET /timing/month`)', () => {
  const month = fixtures.monthSky;

  it('계약의 예(달 · 시각 앎 · 이번 달 내내 0~2 · 눈여겨볼 날 0~3)를 받는다', () => {
    expect(isMonthSky(month)).toBe(true);
    expect(isMonthSky({ ...month, themes: [], days: [] })).toBe(true);
    expect(isMonthSky({ ...month, timeKnown: false })).toBe(true);
  });

  it('모르는 칩 · 모르는 영역은 받아 두고 그 줄만 숨기게 한다(전체를 거절하지 않는다)', () => {
    expect(isMonthSky({ ...month, days: [{ ...month.days[0], category: 'LUCK' }] })).toBe(true);
    expect(isMonthSky({ ...month, themes: [{ ...month.themes[0], area: 'HEALTH' }] })).toBe(true);
  });

  it('필드가 빠지거나 모양이 틀리면 거절한다', () => {
    const day = month.days[0];
    const theme = month.themes[0];
    const broken: unknown[] = [
      null,
      { ...month, month: '2026-13' },
      { ...month, month: '2026-1' },
      { ...month, timeKnown: 'yes' },
      { ...month, themes: undefined },
      { ...month, days: [{ ...day, date: '2026/11/21' }] },
      { ...month, days: [{ ...day, text: '' }] },
      { ...month, days: [{ ...day, category: '' }] },
      { ...month, days: [{ ...day, reason: { when: 'DAY', items: [] } }] },
      { ...month, themes: [{ ...theme, title: '' }] },
      { ...month, themes: [{ ...theme, from: undefined }] },
    ];
    for (const v of broken) expect(isMonthSky(v)).toBe(false);
  });

  it('달을 주면 `?month=YYYY-MM` 으로, 없으면 쿼리 없이 부른다', async () => {
    const fetchFn = fakeFetch(200, month);
    const api = apiWith(fetchFn);
    expect(await api.getMonth()).toEqual({ ok: true, data: month });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/timing/month`);
    await api.getMonth('2026-12');
    expect(fetchFn.mock.calls[1][0]).toBe(`${BASE}/timing/month?month=2026-12`);
    expect(fetchFn.mock.calls[1][1]?.method).toBe('GET');
  });

  it('범위 밖(400 MONTH_OUT_OF_RANGE)은 이름과 함께 실패로 준다', async () => {
    const api = apiWith(fakeFetch(400, { error: 'MONTH_OUT_OF_RANGE' }));
    expect(await api.getMonth('2027-03')).toEqual({ ok: false, error: 'SERVER', status: 400, code: 'MONTH_OUT_OF_RANGE' });
  });
});

describe('시기 풀이 TimingReport(서버 결정 033, `POST` · `GET /timing-report`)', () => {
  const report = fixtures.timingReport;
  const main = report.intervals.find((i) => i.id === report.current.mainId)!;
  const withMain = (patch: Record<string, unknown>, drop: string[] = []) => {
    const next: Record<string, unknown> = { ...main, ...patch };
    for (const key of drop) delete next[key];
    return { ...report, intervals: report.intervals.map((i) => (i.id === main.id ? next : i)) };
  };

  it('계약의 예(마디 넷 · 구간 · 지금 · 대표 구간, 모델이 쓴 구간의 한 줄 · 자세히 · 실천 셋 · 근거)를 받는다', () => {
    expect(isTimingReport(report)).toBe(true);
    expect(isTimingReport(fixtures.timingReportTimeUnknown)).toBe(true);
    expect(main.detail?.changes).toBeTruthy();
    expect(main.practices).toHaveLength(3);
    expect(main.reason?.when).toBe('NOW');
  });

  it('표의 글뿐인 구간(한 줄 · 자세히 · 실천 · 근거 키가 없음)과 대표 구간 없는 지금도 받는다', () => {
    const plain = report.intervals.find((i) => i.detail === undefined);
    expect(plain).toBeTruthy();
    const { mainId: _mainId, ...current } = report.current;
    expect(isTimingReport({ ...report, current })).toBe(true);
  });

  it('모델이 쓴 칸의 모양이 틀리면 거절한다', () => {
    const broken: unknown[] = [
      withMain({ summary: '' }),
      withMain({ detail: { changes: '바뀜', howTo: '지내기' } }),
      withMain({ detail: { changes: '바뀜', howTo: '', after: '뒤' } }),
      withMain({ practices: [{ title: '하나 해 보기' }, { title: '둘 해 보기' }] }),
      withMain({ practices: [{ title: '' }, { title: '둘' }, { title: '셋' }] }),
      withMain({ reason: { when: 'NOW', items: [] } }),
      { ...report, current: { ...report.current, mainId: 3 } },
      { ...report, milestones: report.milestones.slice(1) },
    ];
    for (const v of broken) expect(isTimingReport(v)).toBe(false);
  });

  it('상태: NONE · WRITING · FAILED 는 글 없이, DONE 은 글이 있어야 받는다', () => {
    for (const status of ['NONE', 'WRITING', 'FAILED']) expect(isTimingReportState({ status })).toBe(true);
    expect(isTimingReportState({ status: 'DONE', report })).toBe(true);
    expect(isTimingReportState({ status: 'DONE' })).toBe(false);
    expect(isTimingReportState({ status: 'LATER' })).toBe(false);
  });

  it('POST 는 202 의 상태를, GET 은 상태와 글을 준다', async () => {
    const post = fakeFetch(202, { status: 'WRITING' });
    expect(await apiWith(post).requestTimingReport()).toEqual({ ok: true, data: { status: 'WRITING' } });
    expect(post.mock.calls[0][0]).toBe(`${BASE}/timing-report`);
    expect(post.mock.calls[0][1]?.method).toBe('POST');
    const get = fakeFetch(200, { status: 'DONE', report });
    expect(await apiWith(get).getTimingReport()).toEqual({ ok: true, data: { status: 'DONE', report } });
    expect(get.mock.calls[0][1]?.method).toBe('GET');
  });

  it('POST 의 모르는 상태 · GET 의 깨진 글은 INVALID', async () => {
    expect(await apiWith(fakeFetch(202, { status: 'NONE' })).requestTimingReport()).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await apiWith(fakeFetch(200, { status: 'DONE', report: {} })).getTimingReport()).toMatchObject({ ok: false, error: 'INVALID' });
  });
});

describe('그날의 하늘 DaySky(서버 결정 034, `POST /day-sky`)', () => {
  const day = fixtures.daySky;

  it('계약의 예(날짜 · 제목 · 칩 · 흐름 셋 · 이유 · 실천 셋 · 만든 때)를 받는다', () => {
    expect(isDaySky(day)).toBe(true);
    expect(isDaySky({ ...day, category: 'LUCK' })).toBe(true);
  });

  it('필드가 빠지거나 모양이 틀리면 거절한다', () => {
    const broken: unknown[] = [
      null,
      { ...day, date: '2026-11' },
      { ...day, title: '' },
      { ...day, flow: { people: '사람', work: '일' } },
      { ...day, flow: { ...day.flow, mind: '' } },
      { ...day, practices: day.practices.slice(0, 2) },
      { ...day, practices: [{ title: '' }, ...day.practices.slice(1)] },
      { ...day, reason: undefined },
      { ...day, createdAt: 1 },
    ];
    for (const v of broken) expect(isDaySky(v)).toBe(false);
  });

  it('날짜를 주면 본문 `{ date }` 로, 없으면 본문 없이 부른다(오늘의 하늘)', async () => {
    const fetchFn = fakeFetch(200, day);
    const api = apiWith(fetchFn);
    expect(await api.postDaySky('2026-11-21')).toEqual({ ok: true, data: day });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/day-sky`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');
    expect(fetchFn.mock.calls[0][1]?.body).toBe(JSON.stringify({ date: '2026-11-21' }));
    await api.postDaySky();
    expect(fetchFn.mock.calls[1][1]?.body).toBeUndefined();
  });

  it('생성 한도(429)는 LIMIT, 못 썼으면(502 GENERATION_FAILED) 이름과 함께 실패', async () => {
    expect(await apiWith(fakeFetch(429, { error: 'RATE_LIMITED' })).postDaySky('2026-11-21')).toEqual({ ok: false, error: 'LIMIT', status: 429 });
    expect(await apiWith(fakeFetch(502, { error: 'GENERATION_FAILED' })).postDaySky('2026-11-21')).toEqual({
      ok: false,
      error: 'SERVER',
      status: 502,
      code: 'GENERATION_FAILED',
    });
  });
});

describe('모의 서버(fixtures)', () => {
  const api = createApi({ baseUrl: BASE, getToken: () => null, useFixtures: true });

  it('이번 달은 예시의 달이면 그 달을, 다른 달이면 눈여겨볼 날 없이 그 달로 답한다', async () => {
    expect(await api.getMonth()).toEqual({ ok: true, data: fixtures.monthSky });
    const next = await api.getMonth('2026-12');
    expect(next).toEqual({ ok: true, data: { ...fixtures.monthSky, month: '2026-12', days: [] } });
  });

  it('시기 풀이 · 그날의 하늘도 예시로 답한다', async () => {
    expect(await api.getTimingReport()).toEqual({ ok: true, data: { status: 'DONE', report: fixtures.timingReport } });
    expect(await api.requestTimingReport()).toEqual({ ok: true, data: { status: 'DONE' } });
    expect(await api.postDaySky('2026-11-25')).toEqual({ ok: true, data: { ...fixtures.daySky, date: '2026-11-25' } });
  });
});
