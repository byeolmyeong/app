import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SynastryReportScreen from '@/app/synastry/[id]/report';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { forgetFresh, freshOf, rememberFresh } from '@/features/synastry/fresh-synastry';
import { SYNASTRY_REPORT_POLL_MS } from '@/features/synastry/use-synastry-report';
import { api, type ApiResult, type SynastryReportRequest, type SynastryReportState } from '@/lib/api';
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
  api: { listPlaces: jest.fn(), requestSynastryReport: jest.fn(), getSynastryReport: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const H = strings.home;
const R = strings.synastry.report;
const made = fixtures.synastry;
const id = made.id;
const report = fixtures.synastryReport;
const [attraction, talk, conflict, lasting] = report.sections;
const partner = { date: '1999-03-02', time: '08:30', placeId: 1841277 };
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<SynastryReportState> => ({ ok: true, data: { status } });
const done: ApiResult<SynastryReportState> = { ok: true, data: { status: 'DONE', report } };
const asked = (status: 'WRITING' | 'DONE' | 'FAILED'): ApiResult<SynastryReportRequest> => ({
  ok: true,
  data: { status },
});
const refused = (status: number, code: string): ApiResult<SynastryReportRequest> => ({
  ok: false,
  error: 'SERVER',
  status,
  code,
});

/** 상대의 출생 정보를 다시 넣는다: 생년월일과 "태어난 시각을 몰라요" */
async function reenter(date = '19990302') {
  await fireEvent.changeText(await screen.findByPlaceholderText(H.datePlaceholder), date);
  // 시각 "모름" 체크가 아직 꺼져 있으면 켠다(결정 042 — 곳 칸은 그대로 있다)
  const unknown = screen.getByRole('checkbox', { name: H.timeUnknown });
  if (!unknown.props.accessibilityState?.checked) await fireEvent.press(unknown);
  await fireEvent.press(screen.getByText(R.request));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFresh();
  mockUseSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
  mockParams.mockReturnValue({ id });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.getSynastryReport.mockResolvedValue(got('NONE'));
  mockApi.requestSynastryReport.mockResolvedValue(asked('WRITING'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('궁합 리포트(/synastry/[id]/report)', () => {
  it('아직 없고 방금 계산한 궁합이면: 다시 묻지 않고 메모리의 상대 출생 정보로 요청한다 → 쓰는 중 → 다 쓰이면 글', async () => {
    jest.useFakeTimers();
    rememberFresh({ synastry: made, birth: partner });
    mockApi.getSynastryReport.mockResolvedValueOnce(got('NONE')).mockResolvedValueOnce(got('WRITING'));
    mockApi.getSynastryReport.mockResolvedValue(done);
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.intro)).toBeTruthy();
    expect(mockApi.getSynastryReport).toHaveBeenCalledWith(id);
    // 출생 정보를 다시 넣는 칸이 없다
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(screen.queryByText(R.reenter)).toBeNull();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(R.request));
    expect(await screen.findByText(R.writing)).toBeTruthy();
    // 기다리는 동안 생각하는 별이(결정 035)
    expect(screen.getByTestId('byeoli-face-think', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(R.writingNote)).toBeTruthy();
    expect(mockApi.requestSynastryReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestSynastryReport).toHaveBeenCalledWith(id, partner);

    await act(async () => void (await jest.advanceTimersByTimeAsync(SYNASTRY_REPORT_POLL_MS)));
    expect(screen.getByText(R.writing)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(SYNASTRY_REPORT_POLL_MS)));
    expect(screen.getByText(attraction.title)).toBeTruthy();
    expect(screen.queryByText(R.writing)).toBeNull();
    // 다 쓰였으니 메모리의 상대 출생 정보는 버린다(휠은 남는다)
    expect(freshOf(id)).toEqual({ synastry: made, birth: null });
  });

  it('아직 없고 나중에 연 궁합이면: 상대의 출생 정보를 다시 입력받아 그 값으로 요청한다', async () => {
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.reenter)).toBeTruthy();
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
    expect(screen.getByTestId('time-field')).toBeTruthy();
    expect(screen.getByTestId('place-field')).toBeTruthy();
    // 비어 있으면 칸마다 알리고 보내지 않는다
    await fireEvent.press(screen.getByText(R.request));
    expect(screen.getByText(H.errors.dateFormat)).toBeTruthy();
    expect(screen.getByText(H.errors.placeRequired)).toBeTruthy();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();
    // 시각을 모른다고 하면 곳 칸이 사라지고 날짜만으로 보낸다
    await reenter();
    expect(await screen.findByText(R.writing)).toBeTruthy();
    expect(mockApi.requestSynastryReport).toHaveBeenCalledWith(id, { date: '1999-03-02', time: null, placeId: null });
    await screen.unmount();
  });

  it('다른 궁합의 메모리 자료로는 요청하지 않는다(다시 입력받는다)', async () => {
    rememberFresh({ synastry: { ...made, id: 'other' }, birth: partner });
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.reenter)).toBeTruthy();
  });

  it('열었을 때 쓰는 중이면 쓰는 중을 보여 주고 요청하지 않는다', async () => {
    mockApi.getSynastryReport.mockResolvedValue(got('WRITING'));
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.writing)).toBeTruthy();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('다 쓰였으면 출생 정보 없이 읽는다: 영역 탭 넷(끌림 · 대화 · 갈등 · 오래가기)과 고른 영역의 제목 · 문단 · 근거', async () => {
    mockApi.getSynastryReport.mockResolvedValue(done);
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(attraction.title)).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    ['끌림', '대화', '갈등', '오래가기'].forEach((label, i) => expect(within(tabs[i]).getByText(label)).toBeTruthy());
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false]);
    for (const paragraph of attraction.paragraphs) {
      expect(screen.getByText(paragraph.title)).toBeTruthy();
      expect(screen.getByText(paragraph.body)).toBeTruthy();
    }
    expect(screen.getByText(`근거 · ${attraction.paragraphs[0].basis.join(' · ')}`)).toBeTruthy();
    expect(screen.queryByText(talk.title)).toBeNull();
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();
    for (const [label, section] of [
      ['대화', talk],
      ['갈등', conflict],
      ['오래가기', lasting],
    ] as const) {
      await fireEvent.press(screen.getByText(label));
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.paragraphs[0].body)).toBeTruthy();
    }
  });

  it('서버가 쓰지 못했으면(FAILED) 안내를 보여 주고, 방금 계산한 궁합이면 "다시 시도" 가 메모리의 값으로 다시 요청한다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.getSynastryReport.mockResolvedValueOnce(got('FAILED')).mockResolvedValue(done);
    mockApi.requestSynastryReport.mockResolvedValue(asked('DONE'));
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(R.retry));
    expect(await screen.findByText(attraction.title)).toBeTruthy();
    expect(mockApi.requestSynastryReport).toHaveBeenCalledWith(id, partner);
  });

  it('서버가 쓰지 못했고 나중에 연 궁합이면 상대의 출생 정보를 다시 입력받는다', async () => {
    mockApi.getSynastryReport.mockResolvedValueOnce(got('FAILED'));
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(screen.getByText(R.reenter)).toBeTruthy();
    expect(screen.queryByText(R.retry)).toBeNull();
    await reenter();
    await waitFor(() => expect(mockApi.requestSynastryReport).toHaveBeenCalledTimes(1));
    await screen.unmount();
  });

  it('요청의 답이 FAILED 면(일할 자리가 없다) 실패를 보여 준다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.requestSynastryReport.mockResolvedValue(asked('FAILED'));
    await render(<SynastryReportScreen />);
    await fireEvent.press(await screen.findByText(R.request));
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(screen.getByText(R.retry)).toBeTruthy();
  });

  it('다른 사람의 출생 정보면(BIRTH_MISMATCH) 까닭을 알리고, 넣었던 값이 채워진 칸에서 고쳐 다시 보낼 수 있다', async () => {
    mockApi.requestSynastryReport.mockResolvedValueOnce(refused(400, 'BIRTH_MISMATCH'));
    await render(<SynastryReportScreen />);
    await reenter('19990303');
    expect(await screen.findByText(R.mismatch)).toBeTruthy();
    expect(screen.queryByText(R.writing)).toBeNull();
    // 넣었던 값이 그대로 있다
    expect(screen.getByDisplayValue('1999-03-03')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: H.timeUnknown }).props.accessibilityState).toMatchObject({ checked: true });
    await reenter('19990302');
    expect(await screen.findByText(R.writing)).toBeTruthy();
    expect(mockApi.requestSynastryReport).toHaveBeenLastCalledWith(id, {
      date: '1999-03-02',
      time: null,
      placeId: null,
    });
    await screen.unmount();
  });

  it('메모리의 값이 거절돼도(BIRTH_MISMATCH) 다시 입력받는다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.requestSynastryReport.mockResolvedValueOnce(refused(400, 'BIRTH_MISMATCH'));
    await render(<SynastryReportScreen />);
    await fireEvent.press(await screen.findByText(R.request));
    expect(await screen.findByText(R.mismatch)).toBeTruthy();
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
  });

  it('내 출생 정보가 바뀌었으면(PROFILE_CHANGED) 궁합을 새로 봐야 한다고 알리고, 다시 입력받지 않는다', async () => {
    mockApi.requestSynastryReport.mockResolvedValueOnce(refused(409, 'PROFILE_CHANGED'));
    await render(<SynastryReportScreen />);
    await reenter();
    expect(await screen.findByText(R.profileChanged)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(screen.queryByText(R.request)).toBeNull();
    await fireEvent.press(screen.getByText(R.recalculate));
    expect(router.replace).toHaveBeenCalledWith('/synastry');
  });

  it('상태 확인에 실패하면 안내와 "다시 시도" 를 보여 주고, 누르면 확인만 다시 한다(요청하지 않는다)', async () => {
    mockApi.getSynastryReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' }).mockResolvedValue(done);
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.failed.NETWORK)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    await fireEvent.press(screen.getByText(R.retry));
    expect(await screen.findByText(attraction.title)).toBeTruthy();
    expect(mockApi.requestSynastryReport).not.toHaveBeenCalled();
  });

  it('요청이 많을 때(429)는 그에 맞는 안내를 보여 준다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.requestSynastryReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<SynastryReportScreen />);
    await fireEvent.press(await screen.findByText(R.request));
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<SynastryReportScreen />);
    expect(await screen.findByText(R.checking)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getSynastryReport).not.toHaveBeenCalled();
  });

  it('다시 넣은 상대의 출생 정보도 리포트도 기기에 보관하지 않는다', async () => {
    mockApi.requestSynastryReport.mockResolvedValue(asked('DONE'));
    mockApi.getSynastryReport.mockResolvedValueOnce(got('NONE')).mockResolvedValue(done);
    await render(<SynastryReportScreen />);
    await reenter();
    expect(await screen.findByText(attraction.title)).toBeTruthy();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
