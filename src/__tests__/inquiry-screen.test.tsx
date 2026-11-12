import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import InquiryScreen from '@/app/settings/inquiry';
import { strings } from '@/content/strings';
import { api, createApi, type ApiResult, type InquiryCreated } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createInquiry: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const I = strings.inquiry;
const MESSAGE = '리포트 화면이 열리지 않아요.';
const sent: ApiResult<InquiryCreated> = { ok: true, data: { id: 'inq-1' } };

const bodyInput = () => screen.getByLabelText(I.bodyLabel);
const emailInput = () => screen.getByLabelText(I.emailLabel);
const submit = () => fireEvent.press(screen.getByText(I.submit));

async function fill({ category = I.categories.BUG as string, body = MESSAGE, email = '' } = {}) {
  await fireEvent.press(screen.getByText(category));
  await fireEvent.changeText(bodyInput(), body);
  await fireEvent.changeText(emailInput(), email);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.createInquiry.mockResolvedValue(sent);
});

describe('문의하기(/settings/inquiry)', () => {
  it('종류 다섯 가지 · 내용 · 답장 받을 이메일 · 보내기 버튼을 보여 준다', async () => {
    await render(<InquiryScreen />);
    expect(screen.getByText(I.title)).toBeTruthy();
    for (const label of ['계정', '풀이/리포트', '궁합', '오류 신고', '기타'])
      expect(screen.getByText(label)).toBeTruthy();
    expect(bodyInput().props.multiline).toBe(true);
    expect(emailInput()).toBeTruthy();
    expect(screen.getByText(I.bodyHint)).toBeTruthy();
    expect(screen.getByText(`0${I.countSeparator}2000${I.countUnit}`)).toBeTruthy();
  });

  it('글자 수는 앞뒤 공백을 뗀 길이로 센다', async () => {
    await render(<InquiryScreen />);
    await fireEvent.changeText(bodyInput(), '  안녕하세요  ');
    expect(screen.getByText(`5${I.countSeparator}2000${I.countUnit}`)).toBeTruthy();
  });

  it('고른 종류는 선택 상태가 된다', async () => {
    await render(<InquiryScreen />);
    await fireEvent.press(screen.getByText(I.categories.SYNASTRY));
    expect(screen.getByRole('button', { name: I.categories.SYNASTRY }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole('button', { name: I.categories.BUG }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('종류를 고르지 않았거나 내용이 10자보다 짧으면 보내지 않고 알려 준다', async () => {
    await render(<InquiryScreen />);
    await fireEvent.changeText(bodyInput(), '  짧아요  ');
    await submit();
    expect(screen.getByText(I.errors.categoryRequired)).toBeTruthy();
    expect(screen.getByText(I.errors.bodyTooShort)).toBeTruthy();
    expect(mockApi.createInquiry).not.toHaveBeenCalled();
  });

  it('내용이 2000자를 넘으면 보내지 않는다', async () => {
    await render(<InquiryScreen />);
    await fill({ body: '가'.repeat(2001) });
    await submit();
    expect(screen.getByText(I.errors.bodyTooLong)).toBeTruthy();
    expect(mockApi.createInquiry).not.toHaveBeenCalled();
  });

  it('이메일 모양이 틀리면 보내지 않고, 고쳐 적으면 오류가 사라진다', async () => {
    await render(<InquiryScreen />);
    await fill({ email: 'me@example' });
    await submit();
    expect(screen.getByText(I.errors.emailFormat)).toBeTruthy();
    expect(mockApi.createInquiry).not.toHaveBeenCalled();
    await fireEvent.changeText(emailInput(), 'me@example.test');
    expect(screen.queryByText(I.errors.emailFormat)).toBeNull();
  });

  it('이메일을 비우면 null 로, 내용은 앞뒤 공백을 떼어 보낸다', async () => {
    await render(<InquiryScreen />);
    await fill({ body: `  ${MESSAGE}\n ` });
    await submit();
    expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
    expect(mockApi.createInquiry).toHaveBeenCalledWith({ category: 'BUG', body: MESSAGE, replyEmail: null });
  });

  it('이메일을 적으면 함께 보낸다', async () => {
    await render(<InquiryScreen />);
    await fill({ category: I.categories.READING, email: ' me@example.test ' });
    await submit();
    expect(mockApi.createInquiry).toHaveBeenCalledWith({
      category: 'READING',
      body: MESSAGE,
      replyEmail: 'me@example.test',
    });
  });

  it('보내는 동안에는 버튼이 눌리지 않아 두 번 보내지 않는다', async () => {
    let finish: (r: ApiResult<InquiryCreated>) => void = () => {};
    mockApi.createInquiry.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    await render(<InquiryScreen />);
    await fill();
    await submit();
    expect(screen.getByRole('button', { name: I.sending }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByText(I.sending));
    expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
    await act(async () => finish(sent));
    expect(screen.getByText(I.done.title)).toBeTruthy();
  });

  it('보내면 "문의를 보냈어요" 와 설정으로 돌아가는 버튼만 남는다', async () => {
    await render(<InquiryScreen />);
    await fill();
    await submit();
    expect(await screen.findByText(I.done.title)).toBeTruthy();
    expect(screen.queryByLabelText(I.bodyLabel)).toBeNull();
    expect(screen.queryByText(I.submit)).toBeNull();
    await fireEvent.press(screen.getByText(I.done.back));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('주소로 바로 들어와 돌아갈 곳이 없으면 설정으로 간다', async () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    await render(<InquiryScreen />);
    await fill();
    await submit();
    await fireEvent.press(await screen.findByText(I.done.back));
    expect(router.replace).toHaveBeenCalledWith('/settings');
    (router.canGoBack as jest.Mock).mockReturnValue(true);
  });

  it.each([
    ['연결 실패', { ok: false, error: 'NETWORK' }, I.failed.NETWORK],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }, I.failed.OTHER],
    [
      '서버가 내용을 받지 않음',
      { ok: false, error: 'SERVER', status: 400, code: 'INVALID_BODY' },
      I.failed.INVALID_BODY,
    ],
    [
      '서버가 이메일을 받지 않음',
      { ok: false, error: 'SERVER', status: 400, code: 'INVALID_EMAIL' },
      I.failed.INVALID_EMAIL,
    ],
  ] as [string, ApiResult<InquiryCreated>, string][])(
    '실패(%s)하면 안내를 보여 주고 적은 것은 그대로 둔다',
    async (_name, result, message) => {
      mockApi.createInquiry.mockResolvedValueOnce(result);
      await render(<InquiryScreen />);
      await fill({ category: I.categories.ACCOUNT, email: 'me@example.test' });
      await submit();
      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.queryByText(I.done.title)).toBeNull();
      expect(bodyInput().props.value).toBe(MESSAGE);
      expect(emailInput().props.value).toBe('me@example.test');
      expect(screen.getByRole('button', { name: I.categories.ACCOUNT }).props.accessibilityState).toMatchObject({
        selected: true,
      });
      // 스스로 다시 보내지 않는다. 다시 누르면 같은 내용으로 한 번 더 보낸다.
      expect(mockApi.createInquiry).toHaveBeenCalledTimes(1);
      await submit();
      expect(mockApi.createInquiry).toHaveBeenCalledTimes(2);
      expect(await screen.findByText(I.done.title)).toBeTruthy();
    },
  );

  it('한 시간 한도를 넘으면(429) 잠시 뒤 다시 보내 달라고 한다', async () => {
    mockApi.createInquiry.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<InquiryScreen />);
    await fill();
    await submit();
    expect(await screen.findByText(I.failed.LIMIT)).toBeTruthy();
    expect(I.failed.LIMIT).toMatch(/잠시 뒤 다시/);
    expect(bodyInput().props.value).toBe(MESSAGE);
  });

  it('가짜 서버 모드에서는 fetch 없이 보낸 것으로 끝난다', async () => {
    const fetchFn = jest.fn();
    const fixtureApi = createApi({ baseUrl: '', fetchFn, getToken: () => null, useFixtures: true });
    mockApi.createInquiry.mockImplementationOnce((input) => fixtureApi.createInquiry(input));
    await render(<InquiryScreen />);
    await fill();
    await submit();
    expect(await screen.findByText(I.done.title)).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('적은 내용과 이메일을 기기 저장소에 두지 않는다', async () => {
    await render(<InquiryScreen />);
    await fill({ email: 'me@example.test' });
    await submit();
    await screen.findByText(I.done.title);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
