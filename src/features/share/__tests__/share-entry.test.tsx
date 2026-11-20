import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Linking, Platform, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

import { strings } from '@/content/strings';
import { saveImage, shareStory } from '@/features/share/share-actions';
import { ShareEntry, type ShareTarget } from '@/features/share/share-entry';
import * as story from '@/features/share/story';
import * as webStory from '@/features/share/story.web';
import { api, type ShareCard, type ShareRequest } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createShare: jest.fn() },
}));
jest.mock('@/features/share/share-actions', () => ({
  saveImage: jest.fn(async () => 'SAVED'),
  shareStory: jest.fn(async () => 'OPENED'),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockSave = saveImage as jest.MockedFunction<typeof saveImage>;
const mockStory = shareStory as jest.MockedFunction<typeof shareStory>;
const S = strings.share;
const C = fixtures.shareCards;
const APP_ID = '1162644856216782';
const made = (card: ShareCard, shareId = 'share-1') => ({ ok: true as const, data: { shareId, card } });
const notFound = { ok: false as const, error: 'SERVER' as const, status: 404, code: 'NOT_FOUND' };
const button = (label: string) => screen.getByRole('button', { name: label });
const open = async () => {
  await fireEvent.press(button(S.open));
};
/** 시트 아래 버튼의 이름(위 → 아래) */
const actionLabels = () =>
  screen.queryAllByText(new RegExp(`^(${S.actions.saveImage}|${S.actions.story})$`)).map((node) => String(node.props.children));
/** 버튼의 바탕색(주 버튼은 주색, 보조는 채운 면) */
const fillOf = (label: string) => StyleSheet.flatten(button(label).props.style).backgroundColor;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_META_APP_ID = APP_ID;
  mockApi.createShare.mockImplementation(async (request: ShareRequest) => {
    switch (request.kind) {
      case 'NICKNAME':
        return made(C.nickname);
      case 'ME_AREA':
        return made({ ...C.meArea, area: request.area });
      case 'DAY_SKY':
        return made({ ...C.daySky, date: request.date });
      case 'NEXT_BIG':
        return made(C.nextBig);
      case 'SCORE':
        return made({ ...C.score, names: [request.myName, '지우'] });
      case 'RANKING':
        return made(request.showNames ? C.rankingNames : C.ranking, request.showNames ? 'share-names' : 'share-initials');
      default:
        return made(C.reading);
    }
  });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_META_APP_ID;
  jest.restoreAllMocks();
});

describe('공유 시트 v2(결정 053 · 061 의 6 · 065 의 1, 보드 12-4 · 12-5 · 12-13 · 11-6 · 14-5)', () => {
  it('열기 전에는 공유를 만들지 않고, 열면 카드 넷 각각을 한 번만 만들어 미리보기를 보여 준다', async () => {
    const targets: [ShareTarget, ShareRequest, string][] = [
      [{ kind: 'NICKNAME' }, { kind: 'NICKNAME' }, C.nickname.headline],
      [{ kind: 'ME_AREA', area: 'WORK' }, { kind: 'ME_AREA', area: 'WORK' }, C.meArea.title],
      [{ kind: 'DAY_SKY', date: '2026-11-21' }, { kind: 'DAY_SKY', date: '2026-11-21' }, C.daySky.title],
      [{ kind: 'NEXT_BIG' }, { kind: 'NEXT_BIG' }, C.nextBig.title],
    ];
    for (const [target, request, text] of targets) {
      jest.clearAllMocks();
      const view = await render(<ShareEntry target={target} trigger="icon" />);
      await act(async () => {});
      expect(mockApi.createShare).not.toHaveBeenCalled();
      await open();
      const card = await screen.findByTestId('share-card');
      expect(within(card).getByText(text)).toBeTruthy();
      // 버튼을 눌러도 다시 만들지 않는다(시트를 열 때 한 번)
      await fireEvent.press(button(S.actions.saveImage));
      expect(mockApi.createShare).toHaveBeenCalledTimes(1);
      expect(mockApi.createShare).toHaveBeenCalledWith(request);
      await view.unmount();
    }
  });

  it('시트에는 제목이 없다(결정 061 의 6 · 계획 A7-5)', async () => {
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} trigger="icon" />);
    await open();
    await screen.findByTestId('share-card');
    expect(screen.queryByText(S.sheetTitle)).toBeNull();
  });

  it('앱: 보조 "이미지 저장" 이 위, 주 "인스타그램 스토리 공유" 가 맨 아래다(링크 버튼 없음)', async () => {
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(actionLabels()).toEqual([S.actions.saveImage, S.actions.story]);
    expect(fillOf(S.actions.saveImage)).toBe(Colors.fill);
    expect(fillOf(S.actions.story)).toBe(Colors.primary);
    for (const old of [S.actions.shareLink, S.actions.copyLink, S.actions.shareImage]) expect(screen.queryByText(old)).toBeNull();
  });

  it('Meta 앱 ID 가 없는 빌드에서는 스토리 버튼이 없고 "이미지 저장" 하나다', async () => {
    delete process.env.EXPO_PUBLIC_META_APP_ID;
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(actionLabels()).toEqual([S.actions.saveImage]);
    expect(fillOf(S.actions.saveImage)).toBe(Colors.primary);
  });

  it('웹(휴대폰 · 컴퓨터)은 앱 ID 가 있어도 "이미지 저장" 하나다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    // 웹 번들은 story.web.ts 를 읽는다(jest 는 앱 쪽 파일을 읽으므로 그 답을 끼운다)
    jest.spyOn(story, 'storyAppId').mockImplementation(webStory.storyAppId);
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
    await open();
    await screen.findByTestId('share-card');
    expect(actionLabels()).toEqual([S.actions.saveImage]);
    expect(fillOf(S.actions.saveImage)).toBe(Colors.primary);
  });

  it('이미지 저장 → 짧은 알림 "이미지를 저장했어요"(성공 2초) — 시트 안에 결과 글을 붙이지 않는다', async () => {
    jest.useFakeTimers();
    try {
      await render(<ShareEntry target={{ kind: 'ME_AREA', area: 'LOVE' }} />);
      await open();
      await screen.findByTestId('share-card');
      await fireEvent.press(button(S.actions.saveImage));
      expect(mockSave).toHaveBeenCalledTimes(1);
      const toast = await screen.findByTestId('toast');
      expect(within(toast).getByText(S.notices.saved)).toBeTruthy();
      expect(screen.getByTestId('toast-icon-success')).toBeTruthy();
      // 그 글은 알림 안에만 있다(버튼 아래에 붙은 글이 없다)
      expect(screen.getAllByText(S.notices.saved)).toHaveLength(1);
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.queryByTestId('toast')).toBeNull();
      expect(screen.queryByText(S.notices.saved)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('저장하지 못하면 실패 알림, 사진 접근을 막았으면 설정을 여는 알림(누르면 설정)', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
    await open();
    await screen.findByTestId('share-card');

    mockSave.mockResolvedValueOnce('FAILED');
    await fireEvent.press(button(S.actions.saveImage));
    expect(within(await screen.findByTestId('toast')).getByText(S.notices.saveFailed)).toBeTruthy();
    expect(screen.getByTestId('toast-icon-error')).toBeTruthy();

    mockSave.mockResolvedValueOnce('DENIED');
    await fireEvent.press(button(S.actions.saveImage));
    const denied = await screen.findByTestId('toast');
    expect(within(denied).getByText(S.notices.photosDenied)).toBeTruthy();
    await fireEvent.press(denied);
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('스토리: 카드와 앱 ID 로 열고, 열렸거나 공유 창으로 넘겼으면 알림이 없다 · 실패하면 실패 알림', async () => {
    await render(<ShareEntry target={{ kind: 'NEXT_BIG' }} />);
    await open();
    await screen.findByTestId('share-card');
    await fireEvent.press(button(S.actions.story));
    expect(mockStory).toHaveBeenCalledTimes(1);
    expect(mockStory.mock.calls[0][1]).toBe(APP_ID);
    mockStory.mockResolvedValueOnce('SHARED');
    await fireEvent.press(button(S.actions.story));
    expect(screen.queryByTestId('toast')).toBeNull();
    mockStory.mockResolvedValueOnce('FAILED');
    await fireEvent.press(button(S.actions.story));
    expect(within(await screen.findByTestId('toast')).getByText(S.notices.storyFailed)).toBeTruthy();
  });

  it('공유할 것이 없으면(404) 그 말만 보이고 버튼이 없다', async () => {
    const cases: [ShareTarget, string][] = [
      [{ kind: 'NICKNAME' }, S.nothing.NICKNAME],
      [{ kind: 'ME_AREA', area: 'LOVE' }, S.nothing.ME_AREA],
      [{ kind: 'DAY_SKY', date: '2026-11-21' }, S.nothing.DAY_SKY],
      [{ kind: 'NEXT_BIG' }, S.nothing.NEXT_BIG],
    ];
    for (const [target, text] of cases) {
      mockApi.createShare.mockResolvedValueOnce(notFound);
      const view = await render(<ShareEntry target={target} />);
      await open();
      expect(await screen.findByText(text)).toBeTruthy();
      expect(screen.queryByText(S.retry)).toBeNull();
      expect(actionLabels()).toEqual([]);
      await view.unmount();
    }
  });

  it('만들지 못하면 안내와 "다시 시도" 를 보여 주고, 버튼은 없다', async () => {
    mockApi.createShare.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
    await open();
    expect(await screen.findByText(S.failed.NETWORK)).toBeTruthy();
    expect(actionLabels()).toEqual([]);
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
    await render(<ShareEntry target={{ kind: 'NICKNAME' }} />);
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
