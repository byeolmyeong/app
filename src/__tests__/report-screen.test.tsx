import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import ReportScreen from '@/app/report';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { REPORT_POLL_MS } from '@/features/report/use-report';
import { api, type ApiResult, type ReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { requestReport: jest.fn(), getReport: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const R = strings.report;
const report = fixtures.report;
const [personality, relationship, work, emotion] = report.sections;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<ReportState> => ({ ok: true, data: { status } });
const done: ApiResult<ReportState> = { ok: true, data: { status: 'DONE', report } };
const selectedTabs = () => screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ token: 'dev-token', ready: true });
  mockParams.mockReturnValue({});
  mockApi.getReport.mockResolvedValue(done);
  mockApi.requestReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
  await saveBirth({ profile, chart: fixtures.chart });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('심층 리포트 화면', () => {
  it('아직 없으면 한 줄 설명과 "리포트 받기" 를 보여 주고, 누르면 쓰는 중이 되었다가 다 쓰이면 글을 보여 준다', async () => {
    jest.useFakeTimers();
    mockApi.getReport.mockResolvedValueOnce(got('NONE')).mockResolvedValueOnce(got('WRITING'));
    await render(<ReportScreen />);
    expect(await screen.findByText(R.intro)).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(mockApi.requestReport).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(R.request));
    expect(await screen.findByText(R.writing)).toBeTruthy();
    // 1~2분 걸리고, 나갔다가 돌아와도 된다고 알린다
    expect(screen.getByText(R.writingNote)).toBeTruthy();
    expect(R.writingNote).toMatch(/1~2분/);
    expect(screen.queryByText(R.request)).toBeNull();
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);

    await act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS)));
    expect(screen.getByText(R.writing)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS)));
    expect(screen.getByText(personality.title)).toBeTruthy();
    expect(screen.queryByText(R.writing)).toBeNull();
  });

  it('열었을 때 쓰는 중이면 쓰는 중을 보여 준다', async () => {
    mockApi.getReport.mockResolvedValue(got('WRITING'));
    const view = await render(<ReportScreen />);
    expect(await screen.findByText(R.writing)).toBeTruthy();
    expect(mockApi.requestReport).not.toHaveBeenCalled();
    await view.unmount();
  });

  it('다 쓰였으면 영역 탭 넷(성격 · 관계 · 일 · 감정)과 첫 영역의 제목 · 문단을 서버가 준 그대로 보여 준다', async () => {
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    ['성격', '관계', '일', '감정'].forEach((label, i) => expect(within(tabs[i]).getByText(label)).toBeTruthy());
    // 탭 넷이 폭을 똑같이 나눠 쓴다
    for (const tab of tabs) expect(StyleSheet.flatten(tab.props.style).flex).toBe(1);
    expect(selectedTabs()).toEqual([true, false, false, false]);
    for (const paragraph of personality.paragraphs) {
      expect(screen.getByText(paragraph.title)).toBeTruthy();
      expect(screen.getByText(paragraph.body)).toBeTruthy();
    }
    // 문단마다 근거가 된 차트 요소를 작게 적는다
    expect(screen.getByText('근거 · 태양 · 쌍둥이 · 6하우스')).toBeTruthy();
    // 고르지 않은 영역의 글은 그리지 않는다
    expect(screen.queryByText(relationship.title)).toBeNull();
    // 요약 해석과 같은 면책 문구
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
  });

  it('탭을 누르면 그 영역의 글로 바뀐다', async () => {
    await render(<ReportScreen />);
    await screen.findByText(personality.title);
    for (const [label, section, other] of [
      ['관계', relationship, personality],
      ['일', work, relationship],
      ['감정', emotion, work],
      ['성격', personality, emotion],
    ] as const) {
      await fireEvent.press(screen.getByText(label));
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.paragraphs[0].body)).toBeTruthy();
      expect(screen.queryByText(other.title)).toBeNull();
    }
  });

  it('주소의 area 로 처음 보일 탭을 고른다(/report?area=RELATIONSHIP)', async () => {
    mockParams.mockReturnValue({ area: 'RELATIONSHIP' });
    await render(<ReportScreen />);
    expect(await screen.findByText(relationship.title)).toBeTruthy();
    expect(selectedTabs()).toEqual([false, true, false, false]);
    expect(screen.queryByText(personality.title)).toBeNull();
  });

  it('area 가 모르는 값이면 첫 영역을 보여 준다', async () => {
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(selectedTabs()).toEqual([true, false, false, false]);
  });

  it('누를 수 있는 것은 뒤로 가기와 탭 넷뿐이다(시기 탭·공유·다시 생성 없음)', async () => {
    await render(<ReportScreen />);
    await screen.findByText(personality.title);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.queryAllByRole('button')).toHaveLength(1);
    expect(screen.getByLabelText(strings.common.backLabel)).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('실패하면 안내와 "다시 시도" 를 보여 주고, 누르면 요청부터 다시 한다', async () => {
    mockApi.getReport.mockResolvedValueOnce(got('FAILED'));
    mockApi.requestReport.mockResolvedValue({ ok: true, data: { status: 'DONE' } });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(mockApi.requestReport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(R.retry));
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.getReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.NETWORK)).toBeTruthy();
    await first.unmount();
    mockApi.getReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
  });

  it('같은 날 다시 열면 보관된 리포트를 보여 주고 서버를 부르지 않는다', async () => {
    // "지금 나의 구간" 이 오늘(한국 날짜) 것인 리포트. 오늘 것이 아니면 한 번 다시 받는다(use-report 테스트)
    const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = { ...report, timing: { ...report.timing, current: { ...report.timing.current, date } } };
    mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: today } });
    const first = await render(<ReportScreen />);
    await screen.findByText(personality.title);
    await first.unmount();
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ token: null, ready: false });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.checking)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getReport).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내를 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<ReportScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await waitFor(() => expect(mockApi.getReport).not.toHaveBeenCalled());
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
