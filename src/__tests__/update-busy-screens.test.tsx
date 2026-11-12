import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';

import DirectionScreen from '@/app/direction';
import ReadingScreen from '@/app/reading';
import ReportScreen from '@/app/report';
import InquiryScreen from '@/app/settings/inquiry';
import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryReportScreen from '@/app/synastry/[id]/report';
import SynastryEntryScreen from '@/app/synastry/index';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { forgetFresh, rememberFresh } from '@/features/synastry/fresh-synastry';
import { UpdateGate } from '@/features/update/update-gate';
import { api, type ApiResult, type AppConfig, type PlatformConfig } from '@/lib/api';
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
    getAppConfig: jest.fn(),
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    createReading: jest.fn(),
    createDirection: jest.fn(),
    getReport: jest.fn(),
    requestReport: jest.fn(),
    createDirectSynastry: jest.fn(),
    getSynastry: jest.fn(),
    listSynastries: jest.fn(),
    getSynastryReport: jest.fn(),
    requestSynastryReport: jest.fn(),
    createInquiry: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
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
const open: PlatformConfig = { minVersion: null, storeUrl: null, message: null, blockNow: false };
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
    expect(await screen.findByText(strings.reading.generating)).toBeTruthy();
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

  it('방향성 제시: 기다리는 중과 방금 받은 글이 떠 있는 동안 미룬다', async () => {
    let resolve: (r: ApiResult<typeof fixtures.direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = await render(gate(<DirectionScreen />));
    expect(await screen.findByText(strings.direction.generating)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await act(async () => resolve({ ok: true, data: fixtures.direction }));
    expect(await screen.findByText(fixtures.direction.title)).toBeTruthy();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('심층 리포트: 쓰는 중에는 미루고, 화면에서 나오면 막는다', async () => {
    mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
    const view = await render(gate(<ReportScreen />));
    expect(await screen.findByText(strings.report.writing)).toBeTruthy();
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await view.rerender(home);
    expect(blocked()).toBe(true);
  });

  it('심층 리포트: 이미 다 쓰인 글을 연 것은 미루지 않는다', async () => {
    mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.report } });
    await render(gate(<ReportScreen />));
    expect(await screen.findByText(fixtures.report.sections[0].title)).toBeTruthy();
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
    await fireEvent.press(screen.getByText(H.timeUnknown));
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

  it('문의하기: 적은 글이 있으면 미루고, 보내고 나면 막는다', async () => {
    mockApi.createInquiry.mockResolvedValue({ ok: true, data: { id: 'inq-1' } });
    await render(gate(<InquiryScreen />));
    await fireEvent.press(screen.getByText(I.categories.BUG));
    await fireEvent.changeText(screen.getByLabelText(I.bodyLabel), '리포트 화면이 열리지 않아요.');
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);

    await fireEvent.press(screen.getByText(I.submit));
    await waitFor(() => expect(blocked()).toBe(true));
    expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
  });

  it('문의하기: 답장 받을 이메일만 적어도 미루고, 지우면 막는다', async () => {
    await render(gate(<InquiryScreen />));
    await fireEvent.changeText(screen.getByLabelText(I.emailLabel), 'me@example.test');
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(false);
    await fireEvent.changeText(screen.getByLabelText(I.emailLabel), '');
    expect(blocked()).toBe(true);
  });

  it('문의하기: 아무것도 적지 않았으면(종류만 골랐어도) 미루지 않는다', async () => {
    await render(gate(<InquiryScreen />));
    await fireEvent.press(screen.getByText(I.categories.BUG));
    await comeBackToUpdateRequired();
    expect(blocked()).toBe(true);
  });
});
