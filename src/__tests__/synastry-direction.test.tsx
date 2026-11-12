import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SynastryDirectionScreen from '@/app/synastry/[id]/direction';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { forgetFresh, freshOf, rememberFresh } from '@/features/synastry/fresh-synastry';
import { api, type ApiResult, type Direction } from '@/lib/api';
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
  api: { listPlaces: jest.fn(), createSynastryDirection: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const H = strings.home;
const D = strings.direction.synastry;
const made = fixtures.synastry;
const id = made.id;
const direction = fixtures.directionSynastry;
const partner = { date: '1999-03-02', time: '08:30', placeId: 1841277 };
const typedBirth = { date: '1999-03-02', time: null, placeId: null };
const ok: ApiResult<Direction> = { ok: true, data: direction };
const refused = (status: number, code: string): ApiResult<Direction> => ({ ok: false, error: 'SERVER', status, code });

/** 상대의 출생 정보를 다시 넣는다: 생년월일과 "태어난 시각을 몰라요" */
async function reenter(date = '19990302') {
  await fireEvent.changeText(await screen.findByPlaceholderText(H.datePlaceholder), date);
  if (screen.queryByTestId('place-field')) await fireEvent.press(screen.getByText(H.timeUnknown));
  await fireEvent.press(screen.getByText(D.submit));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFresh();
  mockUseSession.mockReturnValue({ token: 'dev-token', ready: true });
  mockParams.mockReturnValue({ id });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.createSynastryDirection.mockResolvedValue(ok);
});

describe('방향성 제시 — 궁합(/synastry/[id]/direction)', () => {
  it('방금 계산한 궁합이면: 다시 묻지 않고 메모리의 상대 출생 정보를 함께 보낸다 → 기다리는 중 → 제목과 해 볼 만한 것 3개', async () => {
    rememberFresh({ synastry: made, birth: partner });
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createSynastryDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.generating)).toBeTruthy();
    expect(screen.getByText(D.generatingNote)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createSynastryDirection).toHaveBeenCalledWith(id, partner);
    await act(async () => resolve(ok));

    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(screen.getByText(D.title)).toBeTruthy();
    for (const item of direction.items) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByText(item.body)).toBeTruthy();
      expect(screen.getByText(['근거', ...item.basis].join(' · '))).toBeTruthy();
    }
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(1);
    // 리포트가 아직 쓸 수 있으니 메모리의 값은 그대로 둔다
    expect(freshOf(id)).toEqual({ synastry: made, birth: partner });
  });

  it('나중에 연 궁합이고 글이 이미 있으면: 식별자만 보내고 바로 글을 보여 준다', async () => {
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createSynastryDirection).toHaveBeenCalledWith(id, undefined);
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
  });

  it('나중에 연 궁합이고 글이 없으면(BIRTH_REQUIRED): 상대의 출생 정보를 다시 입력받아 그 값으로 다시 보낸다', async () => {
    mockApi.createSynastryDirection.mockResolvedValueOnce(refused(400, 'BIRTH_REQUIRED'));
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.reenter)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledWith(id, undefined);
    expect(screen.getByTestId('time-field')).toBeTruthy();
    expect(screen.getByTestId('place-field')).toBeTruthy();
    // 비어 있으면 칸마다 알리고 보내지 않는다
    await fireEvent.press(screen.getByText(D.submit));
    expect(screen.getByText(H.errors.dateFormat)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(1);

    await reenter();
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(2);
    expect(mockApi.createSynastryDirection).toHaveBeenLastCalledWith(id, typedBirth);
    expect(screen.queryByText(D.reenter)).toBeNull();
  });

  it('다른 궁합의 메모리 자료는 보내지 않는다', async () => {
    rememberFresh({ synastry: { ...made, id: 'other' }, birth: partner });
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledWith(id, undefined);
  });

  it('다른 사람의 출생 정보면(BIRTH_MISMATCH) 까닭을 알리고, 넣었던 값이 채워진 칸에서 고쳐 다시 보낼 수 있다', async () => {
    mockApi.createSynastryDirection
      .mockResolvedValueOnce(refused(400, 'BIRTH_REQUIRED'))
      .mockResolvedValueOnce(refused(400, 'BIRTH_MISMATCH'));
    await render(<SynastryDirectionScreen />);
    await reenter('19990303');
    expect(await screen.findByText(D.mismatch)).toBeTruthy();
    // 넣었던 값이 그대로 있다
    expect(screen.getByDisplayValue('1999-03-03')).toBeTruthy();
    expect(screen.queryByText(D.retry)).toBeNull();
    await reenter();
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenLastCalledWith(id, typedBirth);
  });

  it('메모리의 값이 거절돼도(BIRTH_MISMATCH) 다시 입력받는다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.createSynastryDirection.mockResolvedValueOnce(refused(400, 'BIRTH_MISMATCH'));
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.mismatch)).toBeTruthy();
    expect(screen.getByText(D.reenter)).toBeTruthy();
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
  });

  it('서버가 날짜 · 시각 · 곳을 받지 못하면(INVALID_DATE 등) 다시 확인해 달라고 알리고 다시 입력받는다', async () => {
    for (const code of ['INVALID_DATE', 'INVALID_TIME', 'UNKNOWN_PLACE']) {
      rememberFresh({ synastry: made, birth: partner });
      mockApi.createSynastryDirection.mockResolvedValueOnce(refused(400, code));
      const view = await render(<SynastryDirectionScreen />);
      expect(await screen.findByText(D.invalidBirth)).toBeTruthy();
      expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
      await view.unmount();
    }
  });

  it('내 출생 정보가 바뀌었으면(PROFILE_CHANGED) 궁합을 새로 봐야 한다고 알리고, 다시 입력받지 않는다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    mockApi.createSynastryDirection.mockResolvedValue(refused(409, 'PROFILE_CHANGED'));
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.profileChanged)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(screen.queryByText(D.retry)).toBeNull();
    await fireEvent.press(screen.getByText(D.recalculate));
    expect(router.replace).toHaveBeenCalledWith('/synastry');
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(1);
  });

  it('없는 궁합이면(404 NOT_FOUND) 안내와 궁합 보러 가는 버튼을 보여 준다', async () => {
    mockApi.createSynastryDirection.mockResolvedValue(refused(404, 'NOT_FOUND'));
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(strings.synastry.result.notFound)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.synastry.result.goEntry));
    expect(router.replace).toHaveBeenCalledWith('/synastry');
  });

  it('생성에 실패하면(502) 안내와 "다시 시도" 를 보여 주고, 누르면 방금 보낸 것(다시 넣은 출생 정보)을 그대로 다시 보낸다', async () => {
    mockApi.createSynastryDirection
      .mockResolvedValueOnce(refused(400, 'BIRTH_REQUIRED'))
      .mockResolvedValueOnce(refused(502, 'GENERATION_FAILED'));
    await render(<SynastryDirectionScreen />);
    await reenter();
    expect(await screen.findByText(D.failed.OTHER)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    await fireEvent.press(screen.getByText(D.retry));
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createSynastryDirection).toHaveBeenCalledTimes(3);
    expect(mockApi.createSynastryDirection).toHaveBeenLastCalledWith(id, typedBirth);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.createSynastryDirection.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.failed.NETWORK)).toBeTruthy();
    await first.unmount();
    mockApi.createSynastryDirection.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.failed.LIMIT)).toBeTruthy();
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ token: null, ready: false });
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(D.generating)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.createSynastryDirection).not.toHaveBeenCalled();
  });

  it('다시 넣은 상대의 출생 정보도 받은 글도 기기에 보관하지 않는다', async () => {
    mockApi.createSynastryDirection.mockResolvedValueOnce(refused(400, 'BIRTH_REQUIRED'));
    await render(<SynastryDirectionScreen />);
    await reenter();
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    // 메모리(fresh-synastry)에도 올리지 않는다
    expect(freshOf(id)).toBeNull();
  });

  it('방금 계산한 궁합의 글을 받아도 기기에는 아무것도 두지 않는다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    await render(<SynastryDirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
