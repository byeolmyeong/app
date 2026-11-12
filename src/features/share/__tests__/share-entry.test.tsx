import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { strings } from '@/content/strings';
import { sendImage, sendLink } from '@/features/share/share-actions';
import { ShareEntry } from '@/features/share/share-entry';
import { api, type ShareCard, type ShareRequest } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createShare: jest.fn() },
}));
jest.mock('@/features/share/share-actions', () => ({
  sendImage: jest.fn(async () => true),
  sendLink: jest.fn(async () => true),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockSendImage = sendImage as jest.MockedFunction<typeof sendImage>;
const mockSendLink = sendLink as jest.MockedFunction<typeof sendLink>;
const S = strings.share;
const C = fixtures.shareCards;
const made = (card: ShareCard, shareId = 'share-1') => ({ ok: true as const, data: { shareId, card } });
const notFound = { ok: false as const, error: 'SERVER' as const, status: 404, code: 'NOT_FOUND' };
const button = (label: string) => screen.getByRole('button', { name: label });
const open = async () => {
  await fireEvent.press(button(S.open));
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_WEB_URL = 'https://app.example.test';
  mockApi.createShare.mockImplementation(async (request: ShareRequest) =>
    request.kind === 'READING'
      ? made(C.reading)
      : request.kind === 'SCORE'
        ? made({ ...C.score, names: [request.myName, '지우'] })
        : request.kind === 'RANKING'
          ? made(request.showNames ? C.rankingNames : C.ranking, request.showNames ? 'share-names' : 'share-initials')
          : made(C.nextTurn),
  );
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_WEB_URL;
  jest.restoreAllMocks();
});

describe('공유 시트', () => {
  it('열기 전에는 공유를 만들지 않고, 열면 카드를 만들어 미리보기와 공유 버튼을 보여 준다', async () => {
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await act(async () => {});
    expect(mockApi.createShare).not.toHaveBeenCalled();
    await open();
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'READING' });
    expect(within(screen.getByTestId('share-card')).getByText(C.reading.headline)).toBeTruthy();
    // 앱에서는 시스템 공유 시트로 이미지와 링크를 보낸다
    await fireEvent.press(button(S.actions.shareImage));
    expect(mockSendImage).toHaveBeenCalledTimes(1);
    await fireEvent.press(button(S.actions.shareLink));
    expect(mockSendLink).toHaveBeenCalledWith('https://app.example.test/s/share-1');
    expect(screen.queryByText(S.actions.saveImage)).toBeNull();
  });

  it('웹에서는 "이미지 저장" 과 "링크 복사" 이고, 끝나면 알려 준다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(screen.queryByText(S.actions.shareImage)).toBeNull();
    await fireEvent.press(button(S.actions.saveImage));
    expect(await screen.findByText(S.notices.saved)).toBeTruthy();
    await fireEvent.press(button(S.actions.copyLink));
    expect(await screen.findByText(S.notices.copied)).toBeTruthy();
    expect(mockSendLink).toHaveBeenCalledWith('https://app.example.test/s/share-1');
  });

  it('이미지나 링크를 보내지 못하면 안내한다', async () => {
    mockSendImage.mockResolvedValueOnce(false);
    mockSendLink.mockResolvedValueOnce(false);
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await open();
    await screen.findByTestId('share-card');
    await fireEvent.press(button(S.actions.shareImage));
    expect(await screen.findByText(S.notices.imageFailed)).toBeTruthy();
    await fireEvent.press(button(S.actions.shareLink));
    expect(await screen.findByText(S.notices.linkFailed)).toBeTruthy();
  });

  it('웹 주소를 알 수 없으면(앱에 변수가 없다) 링크 버튼을 누를 수 없다', async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(button(S.actions.shareLink).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(button(S.actions.shareLink));
    expect(mockSendLink).not.toHaveBeenCalled();
  });

  it('만들지 못하면 안내와 "다시 시도" 를 보여 주고, 공유 버튼은 없다', async () => {
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await open();
    expect(await screen.findByText(S.failed.NETWORK)).toBeTruthy();
    expect(screen.queryByText(S.actions.shareImage)).toBeNull();
    await fireEvent.press(screen.getByText(S.retry));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
  });
});

describe('랭킹 카드 공유', () => {
  it('처음에는 이니셜로 요청하고(이름 표시는 꺼져 있다), 켜면 showNames: true 로 다시 요청한다', async () => {
    await render(<ShareEntry target={{ kind: 'RANKING', relation: 'FRIEND' }} />);
    await open();
    const card = await screen.findByTestId('share-card');
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenLastCalledWith({ kind: 'RANKING', relation: 'FRIEND', showNames: false });
    const toggle = screen.getByRole('checkbox', { name: S.showNames });
    expect(toggle.props.accessibilityState.checked).toBe(false);
    expect(within(card).getByText('ㅁㅅ')).toBeTruthy();
    expect(within(card).queryByText('민서')).toBeNull();

    await fireEvent.press(toggle);
    await waitFor(() => expect(within(screen.getByTestId('share-card')).getByText('민서')).toBeTruthy());
    expect(mockApi.createShare).toHaveBeenCalledTimes(2);
    expect(mockApi.createShare).toHaveBeenLastCalledWith({ kind: 'RANKING', relation: 'FRIEND', showNames: true });
    expect(screen.getByRole('checkbox', { name: S.showNames }).props.accessibilityState.checked).toBe(true);
    // 링크는 지금 보이는 카드의 것이다
    await fireEvent.press(button(S.actions.shareLink));
    expect(mockSendLink).toHaveBeenCalledWith('https://app.example.test/s/share-names');
  });

  it('닫았다가 다시 열면 이름 표시는 다시 꺼져 있다', async () => {
    await render(<ShareEntry target={{ kind: 'RANKING', relation: 'LOVE' }} />);
    await open();
    await screen.findByTestId('share-card');
    await fireEvent.press(screen.getByRole('checkbox', { name: S.showNames }));
    await waitFor(() => expect(mockApi.createShare).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await open();
    await waitFor(() => expect(mockApi.createShare).toHaveBeenCalledTimes(3));
    expect(mockApi.createShare).toHaveBeenLastCalledWith({ kind: 'RANKING', relation: 'LOVE', showNames: false });
  });

  it('다른 종류의 카드에는 이름 표시 스위치가 없다', async () => {
    await render(<ShareEntry target={{ kind: 'READING' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('궁합 점수 카드 공유', () => {
  const target = { kind: 'SCORE', synastryId: 'syn-1' } as const;
  const typeName = async (name: string) => {
    await fireEvent.changeText(screen.getByPlaceholderText(S.myName.placeholder), name);
    await fireEvent.press(screen.getByText(S.myName.submit));
  };

  it('먼저 내 이름을 묻고, 적기 전에는 공유를 만들지 않는다', async () => {
    await render(<ShareEntry target={target} />);
    await open();
    expect(await screen.findByText(S.myName.label)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.createShare).not.toHaveBeenCalled();
    expect(screen.queryByTestId('share-card')).toBeNull();
  });

  it('이름은 앞뒤 공백을 뗀 1~20자여야 한다', async () => {
    await render(<ShareEntry target={target} />);
    await open();
    await screen.findByText(S.myName.label);
    await typeName('   ');
    expect(await screen.findByText(S.myName.errors.required)).toBeTruthy();
    await typeName('가'.repeat(21));
    expect(await screen.findByText(S.myName.errors.tooLong)).toBeTruthy();
    expect(mockApi.createShare).not.toHaveBeenCalled();

    await typeName(`  ${'가'.repeat(20)}  `);
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'SCORE', synastryId: 'syn-1', myName: '가'.repeat(20) });
  });

  it('적은 이름으로 카드를 만들고, 다음에 열면 그 이름이 적혀 있다(메모리에만 둔다)', async () => {
    await render(<ShareEntry target={target} />);
    await open();
    await screen.findByText(S.myName.label);
    await typeName(' 동환 ');
    const card = await screen.findByTestId('share-card');
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'SCORE', synastryId: 'syn-1', myName: '동환' });
    expect(within(card).getByText('동환 × 지우')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await open();
    // 다시 열면 이름부터 다시 묻되, 마지막에 적은 이름이 들어 있다
    expect((await screen.findByPlaceholderText(S.myName.placeholder)).props.value).toBe('동환');
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
  });
});

describe('다음 변곡점 카드 공유', () => {
  it('공유할 변곡점이 없으면(404) 그 말만 보여 준다', async () => {
    mockApi.createShare.mockResolvedValueOnce(notFound);
    await render(<ShareEntry target={{ kind: 'NEXT_TURN' }} label={S.openNextTurn} />);
    await fireEvent.press(screen.getByText(S.openNextTurn));
    expect(await screen.findByText(S.nothing.NEXT_TURN)).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'NEXT_TURN' });
    expect(screen.queryByText(S.retry)).toBeNull();
    expect(screen.queryByText(S.actions.shareImage)).toBeNull();
    expect(screen.queryByTestId('share-card')).toBeNull();
  });

  it('있으면 해와 계절이 적힌 카드를 보여 준다', async () => {
    await render(<ShareEntry target={{ kind: 'NEXT_TURN' }} />);
    await open();
    expect(await within(await screen.findByTestId('share-card')).findByText('2029년 여름')).toBeTruthy();
  });
});
