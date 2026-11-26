import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, type RenderResult } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import MeScreen from '@/app/me';
import ReadingScreen from '@/app/reading';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api, type Reading } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    createReading: jest.fn(),
    saveProfile: jest.fn(),
    requestMeReport: jest.fn(),
    getMeReport: jest.fn(),
    getMyAccount: jest.fn(),
    createShare: jest.fn(() => new Promise(() => {})),
  },
}));
jest.mock('@/features/audio/use-soundtrack', () => ({ useSoundtrack: jest.fn() }));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

/**
 * 뼈대는 그 화면이 다 그려졌을 때의 배치를 그대로 본뜬다(결정 071): 같은 칸이 같은 순서 · 같은 수로 온다.
 * 칸은 testID 로 센다 — 뼈대의 칸은 다 그려진 칸의 이름 뒤에 `-skeleton` 을 붙인다.
 */
const BLOCKS = new Set([
  'reading-headline',
  'sign-card',
  'sign-card-cell',
  'reading-section',
  'reason-line',
  'reading-list',
  'reading-item',
  'me-detail-card',
  'me-nickname-card',
  'me-chips',
  'me-chip',
  'me-hero',
  'me-keyword',
  'me-star',
]);

function blocks(): string[] {
  const out: string[] = [];
  const walk = (node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null) => {
    if (node === null || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const id = node.props.testID;
    if (typeof id === 'string') {
      const name = id.replace(/-skeleton$/, '').replace(/^me-chip-[A-Z]+$/, 'me-chip');
      if (BLOCKS.has(name)) out.push(name);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
const mockApi = api as jest.Mocked<typeof api>;
/** 보드 12 와 같은 꼴의 글: 문단 다섯 · 강점 셋 · 보완점 둘 */
const boardReading: Reading = {
  ...fixtures.reading,
  sections: Array.from({ length: 5 }, (_, i) => ({ ...fixtures.reading.sections[i % fixtures.reading.sections.length], title: `문단 ${i + 1}` })),
  strengths: ['하나', '둘', '셋'],
  cautions: ['하나', '둘'],
};
const storeReading = () => AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: birthKey, reading: boardReading }));
const storeReport = () => AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report: fixtures.meReport }));

/** 0.3초가 지나 뼈대가 보일 때까지 */
async function skeletonOf(ui: React.ReactElement, testID: string): Promise<{ names: string[]; view: RenderResult }> {
  jest.useFakeTimers();
  const view = await render(ui);
  await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
  expect(screen.getByTestId(testID)).toBeTruthy();
  expect(screen.getByTestId(testID).props.accessibilityLabel).toBe(strings.states.loading);
  const names = blocks();
  jest.useRealTimers();
  return { names, view };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockApi.createReading.mockResolvedValue({ ok: true, data: boardReading });
  mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
  await saveBirth({ profile, chart: fixtures.chart });
});

afterEach(() => jest.useRealTimers());

const readingBlocks = [
  'reading-headline',
  'sign-card',
  'sign-card-cell',
  'sign-card-cell',
  'sign-card-cell',
  ...Array.from({ length: 5 }, () => ['reading-section', 'reason-line']).flat(),
  'reading-list',
  'reading-item',
  'reading-item',
  'reading-item',
  'reading-list',
  'reading-item',
  'reading-item',
];

describe('뼈대 = 다 그려진 화면의 칸 · 순서(결정 071)', () => {
  it('내 별명(나 탭 풀이를 받은 뒤): 한 줄 별명 → 별자리 카드(셋 칸) → 문단 다섯(이유 상자) → 강점 셋 · 보완점 둘', async () => {
    mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.meReport } });
    // 받아 오는 동안(홈 · 나 탭에서 들어옴, 기기에 글 없음) — 끝에 답해 다음 시험이 이 요청을 기다리지 않게 한다
    let resolve: (r: { ok: true; data: Reading }) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    const { names: skeleton, view } = await skeletonOf(<ReadingScreen />, 'reading-skeleton');
    await act(async () => resolve({ ok: true, data: boardReading }));
    await view.unmount();

    await storeReading();
    await render(<ReadingScreen />);
    expect(await screen.findByText(boardReading.headline)).toBeTruthy();
    expect(blocks()).toEqual(readingBlocks);
    expect(skeleton).toEqual(readingBlocks);
  });

  it('내 별명(나 탭 풀이를 받기 전): 글의 칸 그대로 + 맨 아래 "자세한 풀이" 카드 — 뼈대도 같다(결정 071 · 082)', async () => {
    let resolve: (r: { ok: true; data: Reading }) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    const { names: skeleton, view } = await skeletonOf(<ReadingScreen />, 'reading-skeleton');
    await act(async () => resolve({ ok: true, data: boardReading }));
    await view.unmount();

    await storeReading();
    await render(<ReadingScreen />);
    expect(await screen.findByTestId('me-detail-card')).toBeTruthy();
    expect(blocks()).toEqual([...readingBlocks, 'me-detail-card']);
    expect(skeleton).toEqual([...readingBlocks, 'me-detail-card']);
  });

  it('나 탭 받기 전: 내 별명 글의 칸 그대로 + 맨 아래 "자세한 풀이" 카드', async () => {
    await storeReading();
    let resolve: (r: { ok: true; data: { status: 'NONE' } }) => void = () => {};
    mockApi.getMeReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { names: skeleton, view } = await skeletonOf(<MeScreen />, 'me-skeleton');
    // 상태를 아직 모르면 머리 제목은 비워 둔다 — "내 별명" 이 먼저 보였다가 "나" 로 바뀌지 않게(소유자 지적), 받기 전이 오면 "내 별명"
    expect(screen.queryByText(strings.reading.title)).toBeNull();
    await act(async () => resolve({ ok: true, data: { status: 'NONE' } }));
    expect(await screen.findByTestId('me-detail-card')).toBeTruthy();
    expect(screen.getByText(strings.reading.title)).toBeTruthy();
    expect(blocks()).toEqual([...readingBlocks, 'me-detail-card']);
    expect(skeleton).toEqual(blocks());
    await view.unmount();
  });

  it('나 탭 받은 뒤(칩을 골라 들어옴 — 푸시 12-8): 별명 카드 → 칩 다섯 → 영역 카드(키워드 셋 · 쓰인 별 셋)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ area: 'PERSONALITY' });
    await storeReading();
    // 0.3초 전 빈 단계부터 받은 뒤 화면의 머리(나) — 중간에 바뀌지 않게(결정 071 의 6)
    mockApi.getMeReport.mockReturnValueOnce(new Promise(() => {}));
    jest.useFakeTimers();
    const blank = await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(100)));
    expect(screen.queryByTestId('me-after-skeleton')).toBeNull();
    expect(screen.queryByText(strings.reading.title)).toBeNull();
    await blank.unmount();
    jest.useRealTimers();
    let resolve: (r: { ok: true; data: { status: 'DONE'; report: typeof fixtures.meReport } }) => void = () => {};
    mockApi.getMeReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { names: skeleton, view } = await skeletonOf(<MeScreen />, 'me-after-skeleton');
    // 받은 뒤 화면과 같은 머리(나) — 아래 탭의 "나" 도 있다
    expect(screen.queryByText(strings.reading.title)).toBeNull();
    expect(screen.getAllByText(strings.me.title).length).toBeGreaterThan(1);
    await act(async () => resolve({ ok: true, data: { status: 'DONE', report: fixtures.meReport } }));
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    const after = ['me-nickname-card', 'me-chips', 'me-chip', 'me-chip', 'me-chip', 'me-chip', 'me-chip', 'me-hero', 'me-keyword', 'me-keyword', 'me-keyword', 'me-star', 'me-star', 'me-star'];
    // 영역 카드 아래 칸(한눈에 보기 · 번호 문단의 이유 상자 …)은 영역마다 달라 뼈대는 영역 카드까지(결정 071 의 3)
    expect(blocks().slice(0, after.length)).toEqual(after);
    expect(blocks().slice(after.length).every((b) => b === 'reason-line')).toBe(true);
    expect(skeleton).toEqual(after);
    await view.unmount();

    // 기기에 받아 둔 풀이가 있으면 뼈대 없이 바로(결정 065 의 2)
    await storeReport();
    jest.useFakeTimers();
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(screen.queryByTestId('me-after-skeleton')).toBeNull();
    expect(screen.getByTestId('me-nickname-card')).toBeTruthy();
  });
});
