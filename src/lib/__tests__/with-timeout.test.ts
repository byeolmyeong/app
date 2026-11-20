import { REQUEST_TIMEOUT_MS, withTimeout } from '@/lib/with-timeout';

// 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2) — 나 탭 풀이 · 시기 풀이 · 이번 달이 함께 쓴다
describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('한도는 10초', () => {
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it('한도 안에 오면 받은 결과 그대로', async () => {
    await expect(withTimeout(Promise.resolve({ ok: true as const, data: 1 }))).resolves.toEqual({ ok: true, data: 1 });
    await expect(withTimeout(Promise.resolve({ ok: false as const, error: 'LIMIT' as const, status: 429 }))).resolves.toEqual({
      ok: false,
      error: 'LIMIT',
      status: 429,
    });
  });

  it('한도가 지나도록 오지 않으면 서버 실패(SERVER)로 보고, 늦게 온 답은 버린다', async () => {
    let late: (v: { ok: true; data: number }) => void = () => {};
    const result = withTimeout(new Promise<{ ok: true; data: number }>((r) => (late = r)));
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(result).resolves.toEqual({ ok: false, error: 'SERVER' });
    late({ ok: true, data: 2 });
    await expect(result).resolves.toEqual({ ok: false, error: 'SERVER' });
  });

  it('한도를 따로 줄 수 있다', async () => {
    const result = withTimeout(new Promise(() => {}), 50);
    jest.advanceTimersByTime(50);
    await expect(result).resolves.toEqual({ ok: false, error: 'SERVER' });
  });
});
