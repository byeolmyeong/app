import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchShare,
  prefetchShare,
  readCachedShare,
  resetShareRequests,
  SHARE_CARDS_STORAGE_KEY,
  shareKeyOf,
} from '@/features/share/share-cache';
import { api, type ShareCard, type ShareRequest } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createShare: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const C = fixtures.shareCards;
const made = (card: ShareCard = C.nickname, shareId = 's1') => ({ ok: true as const, data: { shareId, card } });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  resetShareRequests();
});

describe('공유 카드 기억 · 미리 받기', () => {
  it('키는 종류(+영역 · 날짜)이고, 궁합 카드(이름 · 이름 표시가 바뀐다)는 기억하지 않는다', () => {
    expect(shareKeyOf({ kind: 'NICKNAME' })).toBe('NICKNAME');
    expect(shareKeyOf({ kind: 'ME_AREA', area: 'LOVE' })).toBe('ME_AREA:LOVE');
    expect(shareKeyOf({ kind: 'DAY_SKY', date: '2026-11-21' })).toBe('DAY_SKY:2026-11-21');
    expect(shareKeyOf({ kind: 'NEXT_BIG' })).toBe('NEXT_BIG');
    expect(shareKeyOf({ kind: 'SCORE', synastryId: 'x', myName: '동환' })).toBeNull();
    expect(shareKeyOf({ kind: 'RANKING', relation: 'FRIEND' })).toBeNull();
  });

  it('받은 카드는 로그아웃 · 계정 삭제 · 출생 정보 바꾸기가 지우는 머리(byeolmyeong.)로 기기에 둔다', async () => {
    // features/auth/delete-account.ts 의 DEVICE_STORAGE_PREFIX(기능끼리 import 하지 않아 글자로 본다)
    expect(SHARE_CARDS_STORAGE_KEY.startsWith('byeolmyeong.')).toBe(true);
    mockApi.createShare.mockResolvedValue(made());
    expect(await fetchShare({ kind: 'NICKNAME' })).toEqual(made());
    expect(await readCachedShare('NICKNAME')).toEqual(made().data);
  });

  it('같은 키의 요청이 진행 중이면 그것을 같이 쓴다(서버는 한 번)', async () => {
    let resolve: (v: ReturnType<typeof made>) => void = () => {};
    mockApi.createShare.mockImplementation(() => new Promise((r) => (resolve = r)));
    const a = fetchShare({ kind: 'NEXT_BIG' });
    const b = fetchShare({ kind: 'NEXT_BIG' });
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    resolve(made(C.nextBig));
    expect(await a).toEqual(await b);
    // 끝난 뒤에는 새로 묻는다
    mockApi.createShare.mockResolvedValue(made(C.nextBig));
    await fetchShare({ kind: 'NEXT_BIG' });
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
  });

  it('미리 받기: 기억한 카드가 없을 때만 묻고, 실패는 조용히 넘긴다', async () => {
    mockApi.createShare.mockResolvedValue({ ok: false, error: 'NETWORK' });
    prefetchShare({ kind: 'ME_AREA', area: 'WORK' });
    await flush();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(await readCachedShare('ME_AREA:WORK')).toBeNull();

    mockApi.createShare.mockResolvedValue(made({ ...C.meArea, area: 'WORK' }));
    prefetchShare({ kind: 'ME_AREA', area: 'WORK' });
    await flush();
    await flush();
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
    prefetchShare({ kind: 'ME_AREA', area: 'WORK' });
    await flush();
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
    // 궁합 카드는 미리 받지 않는다
    prefetchShare({ kind: 'SCORE', synastryId: 'x', myName: 'y' } as ShareRequest);
    await flush();
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
  });

  it('공유할 것이 없어지면(404) 기억도 지우고, 그 밖의 실패에는 기억을 남긴다', async () => {
    mockApi.createShare.mockResolvedValueOnce(made());
    await fetchShare({ kind: 'NICKNAME' });
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await fetchShare({ kind: 'NICKNAME' });
    expect(await readCachedShare('NICKNAME')).toEqual(made().data);
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await fetchShare({ kind: 'NICKNAME' });
    expect(await readCachedShare('NICKNAME')).toBeNull();
  });

  it('기기에 둔 값이 계약의 모양이 아니면(옛 판 · 깨짐) 없는 것으로 본다', async () => {
    await AsyncStorage.setItem(SHARE_CARDS_STORAGE_KEY, JSON.stringify({ NICKNAME: { shareId: 's', card: { kind: 'NICKNAME' } }, NEXT_BIG: 'x' }));
    expect(await readCachedShare('NICKNAME')).toBeNull();
    expect(await readCachedShare('NEXT_BIG')).toBeNull();
    await AsyncStorage.setItem(SHARE_CARDS_STORAGE_KEY, '{');
    expect(await readCachedShare('NICKNAME')).toBeNull();
    // 다른 종류의 카드가 그 키에 있으면 쓰지 않는다
    await AsyncStorage.setItem(SHARE_CARDS_STORAGE_KEY, JSON.stringify({ NICKNAME: { shareId: 's', card: C.nextBig } }));
    expect(await readCachedShare('NICKNAME')).toBeNull();
  });
});
