import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import InquiryDetailScreen from '@/app/my/inquiries/[id]';
import InquiriesScreen from '@/app/my/inquiries/index';
import NewInquiryScreen from '@/app/my/inquiries/new';
import OldInquiryScreen from '@/app/settings/inquiry';
import { ScreenPaddingX } from '@/constants/theme';
import { strings } from '@/content/strings';
import { api, type InquiryItem } from '@/lib/api';

/** 화면을 떠났다 돌아옴을 흉내 낸다: key 를 바꾸고 다시 그리면 포커스 효과가 정리되고 다시 돈다 */
const mockFocus = { key: 0 };
const mockSession = { status: 'signedIn' as string };
const mockOnline = { value: true };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'a' })),
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect, mockFocus.key]),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn(() => ({ status: mockSession.status })) }));
// 쓰는 중에 온 푸시는 시험이 보낸다
const mockPush: { listeners: Set<(push: unknown) => void> } = { listeners: new Set() };
jest.mock('@/features/push/push', () => ({
  onPushReceived: (listener: (push: unknown) => void) => {
    mockPush.listeners.add(listener);
    return () => mockPush.listeners.delete(listener);
  },
}));
jest.mock('@/components/use-online', () => ({
  ...jest.requireActual('@/components/use-online'),
  useOnline: jest.fn(() => mockOnline.value),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getInquiries: jest.fn(), getInquiry: jest.fn(), createInquiry: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const I = strings.inquiry;
const F = I.form;
const answered: InquiryItem = {
  id: 'a',
  category: 'BUG',
  body: '아침에 오늘의 하늘 알림이 오지 않아요.\n둘째 줄',
  createdAt: '2026-11-18T01:00:00Z',
  answer: { body: '알려 주셔서 고마워요.', answeredAt: '2026-11-19T02:00:00Z' },
  emailed: false,
};
const open: InquiryItem = { id: 'b', category: 'IDEA', body: '별명을 다시 받을 수 있나요?', createdAt: '2026-11-20T01:00:00Z', answer: null, emailed: false };

let nowSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = 'signedIn';
  mockOnline.value = true;
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T03:00:00Z'));
});
afterEach(() => nowSpy.mockRestore());

describe('문의 내역(/my/inquiries, 보드 16-8)', () => {
  it('내 문의를 받은 순서대로 첫 줄 · 상태(확인 중 / 답변 왔어요) · 날짜로 보이고, 맨 아래 "새 문의하기"', async () => {
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [open, answered] });
    await render(<InquiriesScreen />);
    expect(await screen.findByText(open.body)).toBeTruthy();
    // 여러 줄이면 첫 줄만
    expect(screen.getByText('아침에 오늘의 하늘 알림이 오지 않아요.')).toBeTruthy();
    expect(screen.queryByText(/둘째 줄/)).toBeNull();
    expect(screen.getByText(I.status.open)).toBeTruthy();
    expect(screen.getByText(I.status.answered)).toBeTruthy();
    expect(screen.getByText('11월 20일')).toBeTruthy();
    expect(screen.getByText('11월 18일')).toBeTruthy();
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf(open.body)).toBeLessThan(shown.indexOf('아침에'));
    await fireEvent.press(screen.getByText(I.newInquiry));
    expect(router.push).toHaveBeenLastCalledWith('/my/inquiries/new');
  });

  it('줄을 누르면 그 문의의 답변 보기로 간다', async () => {
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [answered] });
    await render(<InquiriesScreen />);
    await fireEvent.press(await screen.findByText(I.status.answered));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/my/inquiries/[id]', params: { id: 'a' } });
  });

  it('비어 있으면 "아직 문의가 없어요" 와 설명, 아래 "새 문의하기" 는 그대로(결정 065 의 3)', async () => {
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [] });
    await render(<InquiriesScreen />);
    expect(await screen.findByText(I.empty.title)).toBeTruthy();
    expect(screen.getByText(I.empty.body)).toBeTruthy();
    expect(screen.getByText(I.newInquiry)).toBeTruthy();
  });

  it('못 불러오면 실패 화면, "다시 보기" 를 누르면 다시 부른다', async () => {
    mockApi.getInquiries.mockResolvedValueOnce({ ok: false, error: 'NETWORK' }).mockResolvedValueOnce({ ok: true, data: [open] });
    await render(<InquiriesScreen />);
    expect(await screen.findByText(I.loadFail.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.states.loadFail.retry));
    expect(await screen.findByText(open.body)).toBeTruthy();
    expect(mockApi.getInquiries).toHaveBeenCalledTimes(2);
  });

  it('주소로 바로 열어 돌아갈 곳이 없으면 뒤로 가기는 마이로', async () => {
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [] });
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await render(<InquiriesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.replace).toHaveBeenCalledWith('/my');
  });
});

describe('문의 내역 — 다시 받기 · 불러오기 · 끊김(결정 061 · 065 의 2)', () => {
  type ListResult = Awaited<ReturnType<typeof api.getInquiries>>;
  const deferred = () => {
    let resolve: (r: ListResult) => void = () => {};
    const promise = new Promise<ListResult>((r) => (resolve = r));
    return { promise, resolve };
  };

  it('로그인 확인 전에는 묻지 않는다(토큰 없이 나가 보관 토큰이 지워지지 않게), 확인되면 묻는다', async () => {
    mockSession.status = 'checking';
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [open] });
    const view = await render(<InquiriesScreen />);
    expect(mockApi.getInquiries).not.toHaveBeenCalled();
    mockSession.status = 'signedIn';
    await view.rerender(<InquiriesScreen />);
    expect(await screen.findByText(open.body)).toBeTruthy();
    expect(mockApi.getInquiries).toHaveBeenCalledTimes(1);
  });

  it('다시 볼 때 받지 못하면 받아 둔 목록을 그대로 둔다', async () => {
    mockApi.getInquiries.mockResolvedValueOnce({ ok: true, data: [open] }).mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    const view = await render(<InquiriesScreen />);
    await screen.findByText(open.body);
    mockFocus.key++;
    await view.rerender(<InquiriesScreen />);
    await waitFor(() => expect(mockApi.getInquiries).toHaveBeenCalledTimes(2));
    expect(screen.getByText(open.body)).toBeTruthy();
    expect(screen.queryByText(I.loadFail.title)).toBeNull();
  });

  it('늦게 온 "다시 보기" 의 답은 그 뒤에 받은 새 목록을 덮지 않는다', async () => {
    const late = deferred();
    mockApi.getInquiries
      .mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 })
      .mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce({ ok: true, data: [open, answered] });
    const view = await render(<InquiriesScreen />);
    await fireEvent.press(await screen.findByText(strings.states.loadFail.retry));
    // 다시 보기의 답이 오기 전에 떠났다 돌아와(새 문의를 보내고) 새 목록을 받았다
    mockFocus.key++;
    await view.rerender(<InquiriesScreen />);
    expect(await screen.findByText(open.body)).toBeTruthy();
    await act(async () => late.resolve({ ok: true, data: [answered] }));
    expect(screen.getByText(open.body)).toBeTruthy();
  });

  it('화면을 떠난 뒤 온 답은 쓰지 않는다', async () => {
    const first = deferred();
    mockApi.getInquiries.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ ok: true, data: [open] });
    const view = await render(<InquiriesScreen />);
    mockFocus.key++;
    await view.rerender(<InquiriesScreen />);
    expect(await screen.findByText(open.body)).toBeTruthy();
    await act(async () => first.resolve({ ok: true, data: [] }));
    expect(screen.getByText(open.body)).toBeTruthy();
    expect(screen.queryByText(I.empty.title)).toBeNull();
  });

  it('0.3초가 넘으면 뼈대, 10초가 넘으면 실패 화면', async () => {
    jest.useFakeTimers();
    try {
      mockApi.getInquiries.mockReturnValue(new Promise(() => {}));
      await render(<InquiriesScreen />);
      expect(screen.queryByLabelText(strings.states.loading)).toBeNull();
      await act(async () => jest.advanceTimersByTime(350));
      expect(screen.getByLabelText(strings.states.loading)).toBeTruthy();
      // 다 그려진 목록과 같은 카드 하나에 줄 셋, 줄마다 상태 칩 자리(결정 065 의 뼈대 규칙)
      expect(screen.getAllByTestId('skeleton-row')).toHaveLength(3);
      expect(screen.getAllByTestId('skeleton-chip')).toHaveLength(3);
      await act(async () => jest.advanceTimersByTime(10_000));
      expect(screen.getByText(I.loadFail.title)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('끊겨서 못 받았으면 20-1(인터넷에 연결되어 있지 않아요), 연결이 돌아오면 다시 부른다', async () => {
    mockOnline.value = false;
    mockApi.getInquiries.mockResolvedValueOnce({ ok: false, error: 'NETWORK' }).mockResolvedValueOnce({ ok: true, data: [open] });
    const view = await render(<InquiriesScreen />);
    expect(await screen.findByText(strings.states.offlineEmpty.title)).toBeTruthy();
    mockOnline.value = true;
    await view.rerender(<InquiriesScreen />);
    expect(await screen.findByText(open.body)).toBeTruthy();
    expect(mockApi.getInquiries).toHaveBeenCalledTimes(2);
  });

  it('옛 이메일 문의는 상태 칩이 "이메일로 보냈어요"', async () => {
    mockApi.getInquiries.mockResolvedValue({ ok: true, data: [{ ...open, emailed: true }] });
    await render(<InquiriesScreen />);
    expect(await screen.findByText(I.status.emailed)).toBeTruthy();
  });
});

describe('새 문의(/my/inquiries/new, 보드 16-8)', () => {
  const submit = () => screen.getByRole('button', { name: F.submit });
  const body = () => screen.getByLabelText(F.bodyLabel);

  it('종류 칩 넷 · 내용 · 글자 수 · 안내가 있고 이메일 칸은 없다. 종류를 고르고 10자를 넘겨야 보낼 수 있다', async () => {
    await render(<NewInquiryScreen />);
    for (const label of Object.values(I.categories)) expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    expect(screen.getByText(F.hint)).toBeTruthy();
    expect(screen.queryByText(/이메일/)).toBeNull();
    expect(screen.getByText('0/1000')).toBeTruthy();
    expect(submit().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(body(), '아침에 오늘의 하늘 알림이 오지 않아요.');
    expect(screen.getByText('22/1000')).toBeTruthy();
    expect(submit().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: I.categories.BUG }));
    expect(submit().props.accessibilityState.disabled).toBe(false);
    await fireEvent.changeText(body(), '짧아요');
    expect(submit().props.accessibilityState.disabled).toBe(true);
  });

  it('10자가 안 되면 내용 칸 아래에 "10자 이상 적어 주세요." — 비었을 때와 10자를 넘기면 없다', async () => {
    await render(<NewInquiryScreen />);
    expect(screen.queryByText(F.tooShort)).toBeNull();
    await fireEvent.changeText(body(), '짧아요');
    expect(screen.getByText(F.tooShort)).toBe(screen.getByText('10자 이상 적어 주세요.'));
    await fireEvent.changeText(body(), '열 글자가 넘는 문의 내용이에요.');
    expect(screen.queryByText(F.tooShort)).toBeNull();
    await fireEvent.changeText(body(), '');
    expect(screen.queryByText(F.tooShort)).toBeNull();
  });

  it('보내면 종류 · 내용만 서버에 보내고 "문의를 보냈어요", "문의 내역 보기" 는 내역으로 돌아간다', async () => {
    mockApi.createInquiry.mockResolvedValue({ ok: true, data: { id: 'c' } });
    await render(<NewInquiryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: I.categories.IDEA }));
    await fireEvent.changeText(body(), '  별명을 다시 받을 수 있나요?  ');
    await fireEvent.press(submit());
    expect(await screen.findByText(I.sent.title)).toBeTruthy();
    expect(mockApi.createInquiry).toHaveBeenCalledWith({ category: 'IDEA', body: '별명을 다시 받을 수 있나요?' });
    await fireEvent.press(screen.getByText(I.sent.toList));
    expect(router.dismissTo).toHaveBeenCalledWith('/my/inquiries');
  });

  it.each([
    ['인터넷이 끊겼을 때', { ok: false as const, error: 'NETWORK' as const }, I.failed.NETWORK],
    ['한 시간에 여러 번(429)', { ok: false as const, error: 'LIMIT' as const }, I.failed.LIMIT],
    ['서버가 내용을 거절(INVALID_BODY)', { ok: false as const, error: 'SERVER' as const, status: 400, code: 'INVALID_BODY' }, I.failed.INVALID_BODY],
    ['그 밖', { ok: false as const, error: 'SERVER' as const, status: 500 }, I.failed.OTHER],
  ])('보내지 못하면(%s) 짧은 알림, 적은 글은 그대로', async (_name, result, message) => {
    mockApi.createInquiry.mockResolvedValue(result);
    await render(<NewInquiryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: I.categories.ETC }));
    await fireEvent.changeText(body(), '알림이 오지 않아요. 확인해 주세요.');
    await fireEvent.press(submit());
    expect(await screen.findByText(message)).toBeTruthy();
    expect(body().props.value).toBe('알림이 오지 않아요. 확인해 주세요.');
    expect(screen.queryByText(I.sent.title)).toBeNull();
  });

  it('보내는 동안 다시 눌러도 한 번만 보낸다', async () => {
    let finish: (r: { ok: true; data: { id: string } }) => void = () => {};
    mockApi.createInquiry.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<NewInquiryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: I.categories.BUG }));
    await fireEvent.changeText(body(), '알림이 오지 않아요. 확인해 주세요.');
    await fireEvent.press(submit());
    await fireEvent.press(submit());
    expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true, data: { id: 'c' } }));
    expect(await screen.findByText(I.sent.title)).toBeTruthy();
  });

  it('옛 주소(/settings/inquiry)는 새 문의로 보낸다', async () => {
    await render(<OldInquiryScreen />);
    expect(screen.getByTestId('redirect').props.children).toBe('/my/inquiries/new');
  });
});

describe('답변 보기(/my/inquiries/[id], 보드 16-8)', () => {
  it('0.3초가 넘으면 다 그려진 화면과 같은 자리의 뼈대 — 내 문의 카드(머리 + 글 줄) + 아래 안내 한 줄', async () => {
    jest.useFakeTimers();
    try {
      mockApi.getInquiry.mockReturnValue(new Promise(() => {}));
      await render(<InquiryDetailScreen />);
      expect(screen.queryByLabelText(strings.states.loading)).toBeNull();
      await act(async () => jest.advanceTimersByTime(350));
      expect(screen.getByLabelText(strings.states.loading)).toBeTruthy();
      // 실제 화면처럼 좌우 여백은 한 번(화면 바깥 20)뿐, 글 줄 사이에는 카드 간격이 끼지 않는다
      expect(StyleSheet.flatten(screen.getByLabelText(strings.states.loading).props.style).paddingHorizontal).toBe(ScreenPaddingX);
      expect(StyleSheet.flatten(screen.getByTestId('skeleton-body').props.style)?.gap).toBeUndefined();
      expect(screen.getByTestId('skeleton-card')).toBeTruthy();
      expect(screen.getAllByTestId('skeleton-body-line')).toHaveLength(3);
      expect(screen.getByTestId('skeleton-note')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('내 문의 카드(종류 · 날짜 · 글)와 별명 답변 카드(날짜 · 글)를 보인다', async () => {
    mockApi.getInquiry.mockResolvedValue({ ok: true, data: answered });
    await render(<InquiryDetailScreen />);
    expect(await screen.findByText(`${I.detail.mine}${I.detail.separator}${I.categories.BUG}`)).toBeTruthy();
    expect(screen.getByText(answered.body)).toBeTruthy();
    expect(screen.getByText('11월 18일')).toBeTruthy();
    const card = within(screen.getByTestId('inquiry-answer'));
    expect(card.getByText(I.detail.answer)).toBeTruthy();
    expect(card.getByText('11월 19일')).toBeTruthy();
    expect(card.getByText('알려 주셔서 고마워요.')).toBeTruthy();
    expect(mockApi.getInquiry).toHaveBeenCalledWith('a');
  });

  it('답이 아직 없으면 답변 카드 대신 안내, 옛 이메일 문의면 "이메일로 보내 드려요"', async () => {
    mockApi.getInquiry.mockResolvedValueOnce({ ok: true, data: open });
    const view = await render(<InquiryDetailScreen />);
    expect(await screen.findByText(I.detail.waiting)).toBeTruthy();
    expect(screen.queryByTestId('inquiry-answer')).toBeNull();
    await view.unmount();

    mockApi.getInquiry.mockResolvedValueOnce({ ok: true, data: { ...open, category: 'ETC', emailed: true } });
    await render(<InquiryDetailScreen />);
    expect(await screen.findByText(I.detail.emailed)).toBeTruthy();
    expect(screen.getByText(`${I.detail.mine}${I.detail.separator}${I.categories.ETC}`)).toBeTruthy();
  });

  it('남의 것 · 없는 것(404 NOT_FOUND)이면 "문의를 찾지 못했어요" → 문의 내역으로', async () => {
    mockApi.getInquiry.mockResolvedValue({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await render(<InquiryDetailScreen />);
    expect(await screen.findByText(I.detail.notFound.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(I.sent.toList));
    expect(router.dismissTo).toHaveBeenCalledWith('/my/inquiries');
  });

  it('그 밖에 못 불러오면 실패 화면과 "다시 보기"', async () => {
    mockApi.getInquiry.mockResolvedValueOnce({ ok: false, error: 'NETWORK' }).mockResolvedValueOnce({ ok: true, data: answered });
    await render(<InquiryDetailScreen />);
    await fireEvent.press(await screen.findByText(strings.states.loadFail.retry));
    await waitFor(() => expect(screen.getByTestId('inquiry-answer')).toBeTruthy());
  });

  it('주소에 식별자가 없으면 묻지 않고 찾지 못했다고 보인다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    try {
      await render(<InquiryDetailScreen />);
      expect(await screen.findByText(I.detail.notFound.title)).toBeTruthy();
      expect(mockApi.getInquiry).not.toHaveBeenCalled();
    } finally {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'a' });
    }
  });

  it('보는 중에 그 문의의 답 푸시가 오면 다시 묻고 답을 보인다 — 다른 문의의 푸시에는 묻지 않는다(결정 076)', async () => {
    mockApi.getInquiry.mockResolvedValueOnce({ ok: true, data: { ...answered, answer: null } }).mockResolvedValue({ ok: true, data: answered });
    await render(<InquiryDetailScreen />);
    await screen.findByText(answered.body.split('\n')[0], { exact: false });
    expect(screen.queryByText('알려 주셔서 고마워요.')).toBeNull();
    expect(mockApi.getInquiry).toHaveBeenCalledTimes(1);
    await act(async () => mockPush.listeners.forEach((l) => l({ type: 'INQUIRY_ANSWERED', inquiryId: 'other' })));
    expect(mockApi.getInquiry).toHaveBeenCalledTimes(1);
    await act(async () => mockPush.listeners.forEach((l) => l({ type: 'INQUIRY_ANSWERED', inquiryId: 'a' })));
    expect(await screen.findByText('알려 주셔서 고마워요.')).toBeTruthy();
    expect(mockApi.getInquiry).toHaveBeenCalledTimes(2);
  });

  it('끊겨서 못 받았으면 20-1', async () => {
    mockOnline.value = false;
    mockApi.getInquiry.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<InquiryDetailScreen />);
    expect(await screen.findByText(strings.states.offlineEmpty.title)).toBeTruthy();
  });
});
