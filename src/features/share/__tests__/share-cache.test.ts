import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchShare, readCachedShare, SHARE_CARDS_STORAGE_PREFIX, shareKeyOf } from '@/features/share/share-cache';
import { api, type ShareCard } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createShare: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const C = fixtures.shareCards;
const made = (card: ShareCard = C.nickname, shareId = 's1') => ({ ok: true as const, data: { shareId, card } });
const storedKeys = async () => (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(SHARE_CARDS_STORAGE_PREFIX)).sort();

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('공유 카드 기억', () => {
  it('키는 종류(+영역 · 날짜)이고, 궁합 카드(이름 · 이름 표시가 바뀐다)는 기억하지 않는다', () => {
    expect(shareKeyOf({ kind: 'NICKNAME' })).toBe('NICKNAME');
    expect(shareKeyOf({ kind: 'ME_AREA', area: 'LOVE' })).toBe('ME_AREA:LOVE');
    expect(shareKeyOf({ kind: 'DAY_SKY', date: '2026-11-21' })).toBe('DAY_SKY:2026-11-21');
    expect(shareKeyOf({ kind: 'NEXT_BIG' })).toBe('NEXT_BIG');
    expect(shareKeyOf({ kind: 'SCORE', synastryId: 'x', myName: '동환' })).toBeNull();
    expect(shareKeyOf({ kind: 'RANKING', relation: 'FRIEND' })).toBeNull();
  });

  it('카드만(공유 식별자는 빼고) 키마다 따로, 로그아웃 · 계정 삭제 · 출생 정보 바꾸기가 지우는 머리(byeolmyeong.)로 둔다', async () => {
    // features/auth/delete-account.ts 의 DEVICE_STORAGE_PREFIX(기능끼리 import 하지 않아 글자로 본다)
    expect(SHARE_CARDS_STORAGE_PREFIX.startsWith('byeolmyeong.')).toBe(true);
    mockApi.createShare.mockResolvedValue(made());
    expect(await fetchShare({ kind: 'NICKNAME' })).toEqual(made());
    expect(await readCachedShare('NICKNAME')).toEqual(C.nickname);
    const raw = await AsyncStorage.getItem(`${SHARE_CARDS_STORAGE_PREFIX}NICKNAME`);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('s1');
  });

  it('다른 키 셋을 동시에 받아도 셋 다 기억한다(읽고-고치고-쓰기 경합 없음 — #61 리뷰 R2)', async () => {
    mockApi.createShare.mockImplementation(async (req) =>
      made(req.kind === 'ME_AREA' ? { ...C.meArea, area: req.area } : C.nickname, `s-${JSON.stringify(req)}`),
    );
    await Promise.all([fetchShare({ kind: 'ME_AREA', area: 'LOVE' }), fetchShare({ kind: 'ME_AREA', area: 'WORK' }), fetchShare({ kind: 'NICKNAME' })]);
    const kept = await Promise.all(['ME_AREA:LOVE', 'ME_AREA:WORK', 'NICKNAME'].map(readCachedShare));
    expect(kept.every(Boolean)).toBe(true);
  });

  it('공유할 것이 없어지면(404) 기억도 지우고, 그 밖의 실패에는 기억을 남긴다', async () => {
    mockApi.createShare.mockResolvedValueOnce(made());
    await fetchShare({ kind: 'NICKNAME' });
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await fetchShare({ kind: 'NICKNAME' });
    expect(await readCachedShare('NICKNAME')).toEqual(C.nickname);
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await fetchShare({ kind: 'NICKNAME' });
    expect(await readCachedShare('NICKNAME')).toBeNull();
  });

  it('그날의 하늘을 기억할 때 한국 날짜로 지난 날의 그날의 하늘 기억은 지운다', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-21T00:30:00+09:00'), doNotFake: ['setTimeout', 'setImmediate', 'nextTick'] });
    for (const date of ['2026-11-19', '2026-11-20']) {
      mockApi.createShare.mockResolvedValueOnce(made({ ...C.daySky, date }));
      await fetchShare({ kind: 'DAY_SKY', date });
    }
    mockApi.createShare.mockResolvedValueOnce(made({ ...C.daySky, date: '2026-11-25' }));
    await fetchShare({ kind: 'DAY_SKY', date: '2026-11-25' });
    // 남는 것: 앞으로의 그날의 하늘 하나와 세대 표식
    expect(await storedKeys()).toEqual([`${SHARE_CARDS_STORAGE_PREFIX}DAY_SKY:2026-11-25`, `${SHARE_CARDS_STORAGE_PREFIX}gen`]);
  });

  it('기기에 둔 값이 계약의 모양이 아니면(옛 판 · 깨짐 · 다른 종류) 없는 것으로 본다', async () => {
    await AsyncStorage.setItem(`${SHARE_CARDS_STORAGE_PREFIX}NICKNAME`, JSON.stringify({ kind: 'NICKNAME' }));
    expect(await readCachedShare('NICKNAME')).toBeNull();
    await AsyncStorage.setItem(`${SHARE_CARDS_STORAGE_PREFIX}NICKNAME`, '{');
    expect(await readCachedShare('NICKNAME')).toBeNull();
    await AsyncStorage.setItem(`${SHARE_CARDS_STORAGE_PREFIX}NICKNAME`, JSON.stringify(C.nextBig));
    expect(await readCachedShare('NICKNAME')).toBeNull();
  });
});
