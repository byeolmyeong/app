import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';

import ReadingScreen from '@/app/reading';
import MeScreen from '@/app/me';
import TimingScreen from '@/app/timing';
import NewInquiryScreen from '@/app/my/inquiries/new';
import SynastryDirectionScreen from '@/app/synastry/[id]/direction';
import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryReportScreen from '@/app/synastry/[id]/report';
import SynastryEntryScreen from '@/app/synastry/index';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { ME_REPORT_POLL_MS, ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { forgetFresh, rememberFresh } from '@/features/synastry/fresh-synastry';
import { UpdateGate } from '@/features/update/update-gate';
import { api, type ApiResult, type AppConfig, type MeReportState, type PlatformConfig } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/app-client', () => ({ appClient: { platform: 'ios', version: '1.0.0' } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    // 공유 아이콘이 있는 화면은 들어올 때 카드를 미리 받는다 — 이 시험에서는 끝나지 않는 요청으로 둔다
    createShare: jest.fn(() => new Promise(() => {})),
    getAppConfig: jest.fn(),
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    createReading: jest.fn(),
    requestMeReport: jest.fn(),
    getMeReport: jest.fn(),
    getMyAccount: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    createSynastryDirection: jest.fn(),
    getTimingReport: jest.fn(),
    requestTimingReport: jest.fn(),
    getMonth: jest.fn(),
    createDirectSynastry: jest.fn(),
    getSynastry: jest.fn(),
    listSynastries: jest.fn(),
    getSynastryReport: jest.fn(),
    requestSynastryReport: jest.fn(),
    createInquiry: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockParams = useLocalSearchParams as jest.Mock;
const U = strings.update;
const H = strings.home;
const S = strings.synastry;
const I = strings.inquiry;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const made = fixtures.synastry;
const { overlay: _overlay, ...storedSynastry } = made;
const open: PlatformConfig = { minVersion: null, latestVersion: null, storeUrl: null, message: null, blockNow: false };
const openConfig: ApiResult<AppConfig> = { ok: true, data: { ios: open, android: open } };
const required: ApiResult<AppConfig> = { ok: true, data: { ios: { ...open, minVersion: '9.0.0' }, android: open } };

let appStateHandlers: ((next: AppStateStatus) => void)[] = [];

/** 앱이 앞으로 돌아왔고, 이번에는 설정이 "업데이트가 필요하다" 고 한다 */
async function comeBackToUpdateRequired() {
  mockApi.getAppConfig.mockResolvedValue(required);
  await act(async () => appStateHandlers.forEach((handler) => handler('active')));
  expect(mockApi.getAppConfig).toHaveBeenCalledTimes(2);
}

const gate = (children: ReactElement) => <UpdateGate>{children}</UpdateGate>;
const home = gate(<Text>홈</Text>);
const blocked = () => screen.queryByText(U.title) !== null;

beforeEach(async () => {
  mockApi.getMonth.mockResolvedValue({ ok: true, data: fixtures.monthSky });
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFresh();
  appStateHandlers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandlers.push(handler as (next: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  mockParams.mockReturnValue({});
  mockApi.getAppConfig.mockResolvedValue(openConfig);
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.saveProfile.mockImplementation(async (input) => ({ ok: true, data: input }));
  mockApi.listSynastries.mockResolvedValue({ ok: true, data: [] });
  await saveBirth({ profile, chart: fixtures.chart });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('하던 일이 있는 화면은 강제 업데이트를 미룬다(결정 027)', () => {
  it('풀이 글: 짓는 중과 방금 받은 글이 떠 있는 동안 미루고, 화면에서 나오면 막는다', async () => {
    let resolve: (r: ApiResult<typeof fixtures.reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = await render(gate(<ReadingScreen />));
    // 홈에서 들어와 기기에 글이 없으면 받아 오는 동안 뼈대(결정 071) — 그동안도 미룬다
    expect(await screen.findByTestId('reading-skeleton')).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await act(async () => resolve({ ok: true, data: fixtures.reading }));
    expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('풀이 글: 기기에 받아 둔 글을 다시 연 것은 미루지 않는다', async () => {
    mockApi.createReading.mockResolvedValue({ ok: true, data: fixtures.reading });
    const first = await render(<ReadingScreen />);
    expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
    await first.unmount();

    await render(gate(<ReadingScreen />));
    expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });

  it('나 탭: 자세한 풀이를 쓰는 중과 방금 다 쓴 풀이가 떠 있는 동안 미루고, 화면에서 나오면 막는다(리뷰 #49)', async () => {
    await AsyncStorage.setItem(
      READING_STORAGE_KEY,
      JSON.stringify({ key: JSON.stringify([profile.date, profile.time, profile.place.id]), reading: fixtures.reading }),
    );
    let resolve: (r: ApiResult<MeReportState>) => void = () => {};
    mockApi.getMeReport.mockResolvedValueOnce({ ok: true, data: { status: 'WRITING' } }).mockReturnValueOnce(new Promise((r) => (resolve = r)));
    jest.useFakeTimers();
    const view = await render(gate(<MeScreen />));
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    expect(screen.getByText(strings.me.making.title)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS)));
    await act(async () => resolve({ ok: true, data: { status: 'DONE', report: fixtures.meReport } }));
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(blocked()).toBe(false);
    await view.rerender(home);
    expect(blocked()).toBe(true);
    jest.useRealTimers();
  });

  it('나 탭: 기기에 받아 둔 풀이를 다시 연 것은 미루지 않는다', async () => {
    const key = JSON.stringify([profile.date, profile.time, profile.place.id]);
    await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key, reading: fixtures.reading }));
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key, report: fixtures.meReport }));
    mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.meReport } });
    await render(gate(<MeScreen />));
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });

  it('시기 탭: 시기 풀이를 쓰는 중에는 미루고, 화면에서 나오면 막는다', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
    const view = await render(gate(<TimingScreen />));
    expect(await screen.findByText(strings.timing.making.title)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('시기 탭: 이미 다 쓰인 시기 풀이를 연 것은 미루지 않는다', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.timingReport } });
    await render(gate(<TimingScreen />));
    expect(await screen.findByTestId('timing-now-card')).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });

  it('궁합 시작: 계산하는 중과 결과 화면으로 넘어간 뒤에도 미루고, 화면에서 나오면 막는다', async () => {
    let finish: (r: ApiResult<typeof made>) => void = () => {};
    mockApi.createDirectSynastry.mockReturnValue(new Promise((r) => (finish = r)));
    const view = await render(gate(<SynastryEntryScreen />));
    await fireEvent.press(await screen.findByText('연애'));
    await fireEvent.changeText(screen.getByPlaceholderText(S.entry.namePlaceholder), '지우');
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '19990302');
    await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(await screen.findByText(S.entry.calculating)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await act(async () => finish({ ok: true, data: made }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}`));
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('궁합 시작: 칸만 채운 것은 미루지 않는다', async () => {
    await render(gate(<SynastryEntryScreen />));
    await fireEvent.changeText(await screen.findByPlaceholderText(S.entry.namePlaceholder), '지우');
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });

  it('궁합 결과: 방금 계산한 결과(겹친 휠이 있다)는 미루고, 나중에 다시 연 결과는 미루지 않는다', async () => {
    mockParams.mockReturnValue({ id: made.id });
    rememberFresh({ synastry: made, birth: null });
    const view = await render(gate(<SynastryResultScreen />));
    expect(await screen.findByTestId('overlay-wheel')).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);
    await view.rerender(home);
    expect(blocked()).toBe(true);
    await view.unmount();

    forgetFresh();
    appStateHandlers = [];
    mockApi.getAppConfig.mockClear().mockResolvedValue(openConfig);
    mockApi.getSynastry.mockResolvedValue({ ok: true, data: storedSynastry });
    await render(gate(<SynastryResultScreen />));
    expect(await screen.findByText(S.result.noWheel)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });

  it('궁합의 방향성: 기다리는 중과 방금 받은 글이 떠 있는 동안 미루고, 화면에서 나오면 막는다', async () => {
    mockParams.mockReturnValue({ id: made.id });
    let resolve: (r: ApiResult<typeof fixtures.directionSynastry>) => void = () => {};
    mockApi.createSynastryDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = await render(gate(<SynastryDirectionScreen />));
    expect(await screen.findByText(strings.direction.synastry.generating)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await act(async () => resolve({ ok: true, data: fixtures.directionSynastry }));
    expect(await screen.findByText(fixtures.directionSynastry.title)).toBeTruthy();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('궁합 리포트: 쓰는 중에는 미루고, 화면에서 나오면 막는다', async () => {
    mockParams.mockReturnValue({ id: made.id });
    mockApi.getSynastryReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
    const view = await render(gate(<SynastryReportScreen />));
    expect(await screen.findByText(S.report.writing)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('새 문의: 적은 글이 있으면 미루고, 보내고 나면 막는다', async () => {
    mockApi.createInquiry.mockResolvedValue({ ok: true, data: { id: 'inq-1' } });
    await render(gate(<NewInquiryScreen />));
    await fireEvent.press(screen.getByText(I.categories.BUG));
    await fireEvent.changeText(screen.getByLabelText(I.form.bodyLabel), '리포트 화면이 열리지 않아요.');
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await fireEvent.press(screen.getByText(I.form.submit));
    await waitFor(() => expect(blocked()).toBe(true));
    expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
  });

  it('새 문의: 적은 글을 지우면 다시 막는다', async () => {
    await render(gate(<NewInquiryScreen />));
    await fireEvent.changeText(screen.getByLabelText(I.form.bodyLabel), '적다가 지울 글');
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);
    await fireEvent.changeText(screen.getByLabelText(I.form.bodyLabel), '');
    expect(blocked()).toBe(true);
  });

  it('새 문의: 아무것도 적지 않았으면(종류만 골랐어도) 미루지 않는다', async () => {
    await render(gate(<NewInquiryScreen />));
    await fireEvent.press(screen.getByText(I.categories.BUG));
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });
});
