import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearDeviceData } from '@/features/auth/delete-account';
import { fetchShare, readCachedShare } from '@/features/share/share-cache';
import { api, type ShareCreated } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { createShare: jest.fn() } }));
jest.mock('@/features/auth/signup-resume', () => ({ clearResume: jest.fn(async () => {}) }));

const mockApi = api as jest.Mocked<typeof api>;
const C = fixtures.shareCards;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// 기기 지우기(로그아웃 · 계정 삭제 · 출생 정보 바꾸기, features/auth/delete-account.ts)와 진행 중이던 공유 요청(#61 리뷰 수정 2 · R1)
describe('공유 카드 기억과 기기 지우기', () => {
  it('진행 중이던 요청이 기기를 지운 뒤에 끝나도 앞사람 카드를 다시 써 넣지 않는다', async () => {
    let resolve: (v: { ok: true; data: ShareCreated }) => void = () => {};
    mockApi.createShare.mockImplementation(() => new Promise((r) => (resolve = r)));
    const pending = fetchShare({ kind: 'NICKNAME' });
    await flush();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    await clearDeviceData();
    resolve({ ok: true, data: { shareId: 'A', card: { ...C.nickname, nickname: '앞사람' } } });
    await pending;
    await flush();
    expect(await readCachedShare('NICKNAME')).toBeNull();
  });

  it('기기를 지운 뒤의 같은 키 요청은 새로 묻고 다음 사람 카드만 기억한다', async () => {
    mockApi.createShare.mockImplementationOnce(() => new Promise(() => {}));
    void fetchShare({ kind: 'NICKNAME' });
    await flush();
    await clearDeviceData();
    mockApi.createShare.mockResolvedValueOnce({ ok: true, data: { shareId: 'B', card: { ...C.nickname, nickname: '다음 사람' } } });
    const next = await fetchShare({ kind: 'NICKNAME' });
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
    expect(next.ok && next.data.card.kind === 'NICKNAME' && next.data.card.nickname).toBe('다음 사람');
    expect(await readCachedShare('NICKNAME')).toEqual({ ...C.nickname, nickname: '다음 사람' });
  });
});
