import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { strings } from '@/content/strings';
import { ChunkErrorBoundary, clearChunkReload, isChunkLoadError, reloadOnceForChunk } from '@/features/update/chunk-reload';

// 웹 배포가 바뀌면 열려 있던 탭의 옛 화면 조각이 사라진다(Vercel 은 새 배포 파일만 둔다) — 조각 불러오기 실패면 한 번만 새로 고친다
const asyncRequire = Object.assign(new Error('Loading module https://app.test/_expo/static/js/web/terms-255c.js failed.\n(error: 404)'), { name: 'AsyncRequireError' });
const chunk = Object.assign(new Error('Loading chunk 12 failed.'), { name: 'ChunkLoadError' });

function fakeStorage() {
  const kept = new Map<string, string>();
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k), kept };
}

describe('조각 불러오기 실패', () => {
  it('AsyncRequireError · ChunkLoadError · "Loading module … failed" 만 조각 실패로 본다', () => {
    expect(isChunkLoadError(asyncRequire)).toBe(true);
    expect(isChunkLoadError(chunk)).toBe(true);
    expect(isChunkLoadError(new Error('Loading module /x.js failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('undefined is not a function'))).toBe(false);
    expect(isChunkLoadError('boom')).toBe(false);
  });

  it('한 번만 새로 고친다: 표시를 남기고 새로 고치고, 표시가 있으면(새로 고친 뒤에도 실패) 다시 고치지 않는다. 표시를 지우면 다시 된다', () => {
    const storage = fakeStorage();
    const reload = jest.fn();
    expect(reloadOnceForChunk(storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadOnceForChunk(storage, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    clearChunkReload(storage);
    expect(reloadOnceForChunk(storage, reload)).toBe(true);
  });
});

describe('루트의 오류 경계(웹)', () => {
  const original = Platform.OS;
  let storage: ReturnType<typeof fakeStorage>;
  const reload = jest.fn();
  beforeEach(() => {
    Platform.OS = 'web';
    storage = fakeStorage();
    reload.mockClear();
  });
  afterEach(() => {
    Platform.OS = original;
  });

  it('조각 실패면 스플래시 모양으로 한 번 새로 고친다', async () => {
    await render(<ChunkErrorBoundary error={asyncRequire} retry={jest.fn()} storage={storage} reload={reload} />);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('splash')).toBeTruthy();
  });

  it('새로 고친 뒤에도 실패하면 볼 게 없는 화면(20-1) — 다시 시도는 표시를 지우고 새로 고친다', async () => {
    reloadOnceForChunk(storage, jest.fn());
    await render(<ChunkErrorBoundary error={asyncRequire} retry={jest.fn()} storage={storage} reload={reload} />);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText(strings.states.offlineEmpty.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.states.offlineEmpty.retry }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('조각 실패가 아니면 받지 않고 위로 넘긴다', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<ChunkErrorBoundary error={new Error('boom')} retry={jest.fn()} storage={storage} reload={reload} />)).rejects.toThrow('boom');
  });
});
