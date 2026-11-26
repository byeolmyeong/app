import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import FaqScreen from '@/app/settings/faq';
import { strings } from '@/content/strings';
import { FAQ_REUSE_MS, forgetFaqs } from '@/features/support/use-faqs';
import { api, createApi, type ApiResult, type Faq } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { listFaqs: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const F = strings.faq;
const faqs: Faq[] = [
  { id: 'faq-1', question: '요금이 있나요?', answer: '지금은 모두 무료예요.' },
  { id: 'faq-2', question: '계정을 지우면 어떻게 되나요?', answer: '모두 지워져요.\n되돌릴 수 없어요.' },
  {
    id: 'faq-3',
    question: '답에 기호가 있으면요?',
    answer: '<b>굵게</b> 와 **별표** 와 [링크](https://example.test) 는 글자 그대로예요.',
  },
];
const ok = (data: Faq[]): ApiResult<Faq[]> => ({ ok: true, data });
/** 화면 읽기에서 숨긴 것(접힌 답)까지 찾는다 */
const HIDDEN = { includeHiddenElements: true };

/** 서버가 이 본문으로 답할 때 진짜 응답 검사를 거친 결과 */
function serverAnswers(status: number, body: unknown) {
  const fetchFn = jest.fn(async () => ({ ok: status < 300, status, json: async () => body }));
  const real = createApi({ baseUrl: '', getToken: () => null, fetchFn: fetchFn as unknown as typeof fetch });
  mockApi.listFaqs.mockImplementation(() => real.listFaqs());
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFaqs();
  mockApi.listFaqs.mockResolvedValue(ok(faqs));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('자주 묻는 질문(/settings/faq, 결정 028)', () => {
  it('받는 동안 불러오는 중을 보여 주고, 받으면 서버가 준 순서대로 질문을 보여 준다(답은 접혀 있다)', async () => {
    let resolve: (r: ApiResult<Faq[]>) => void = () => {};
    mockApi.listFaqs.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<FaqScreen />);
    expect(screen.getByText(F.title)).toBeTruthy();
    expect(screen.getByText(F.loading)).toBeTruthy();
    expect(screen.queryAllByRole('button', { expanded: false })).toHaveLength(0);

    await act(async () => resolve(ok(faqs)));
    expect(screen.queryByText(F.loading)).toBeNull();
    const rows = screen.getAllByRole('button', { expanded: false });
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual(faqs.map((f) => f.question));
    // 접힌 답은 화면 읽기에서 숨는다 — 펼침 움직임을 위해 처음부터 그려 두고 재므로 트리에는 있다
    for (const item of faqs) {
      expect(screen.queryByText(item.answer)).toBeNull();
      expect(screen.getByText(item.answer, HIDDEN)).toBeTruthy();
    }
    expect(mockApi.listFaqs).toHaveBeenCalledTimes(1);
  });

  it('질문을 누르면 그 답만 펼쳐지고, 다시 누르면 접힌다', async () => {
    await render(<FaqScreen />);
    const [first, second] = faqs;
    await fireEvent.press(await screen.findByRole('button', { name: first.question }));
    expect(screen.getByText(first.answer)).toBeTruthy();
    expect(screen.queryByText(second.answer)).toBeNull();
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({
      expanded: true,
    });

    await fireEvent.press(screen.getByRole('button', { name: first.question }));
    expect(screen.queryByText(first.answer)).toBeNull();
    expect(screen.getByText(first.answer, HIDDEN)).toBeTruthy();
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({
      expanded: false,
    });
  });

  it('여러 질문을 함께 펼쳐 둘 수 있다', async () => {
    await render(<FaqScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: faqs[0].question }));
    await fireEvent.press(screen.getByRole('button', { name: faqs[1].question }));
    expect(screen.getByText(faqs[0].answer)).toBeTruthy();
    expect(screen.getByText(faqs[1].answer)).toBeTruthy();
  });

  it('답은 그냥 글자다: 줄바꿈은 그대로 두고 HTML · 마크다운으로 해석하지 않는다', async () => {
    await render(<FaqScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: faqs[1].question }));
    await fireEvent.press(screen.getByRole('button', { name: faqs[2].question }));
    // 글자 하나 바뀌지 않은 한 덩어리의 글로 그린다.
    expect(screen.getByText('모두 지워져요.\n되돌릴 수 없어요.').props.children).toBe(faqs[1].answer);
    expect(screen.getByText(faqs[2].answer).props.children).toBe(faqs[2].answer);
    expect(screen.queryByText('굵게')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('질문 글이 같아도 id 가 다르면 따로 펼친다', async () => {
    mockApi.listFaqs.mockResolvedValue(
      ok([
        { id: 'a', question: '같은 질문', answer: '첫째 답' },
        { id: 'b', question: '같은 질문', answer: '둘째 답' },
      ]),
    );
    await render(<FaqScreen />);
    const rows = await screen.findAllByRole('button', { name: '같은 질문' });
    expect(rows).toHaveLength(2);
    await fireEvent.press(rows[1]);
    expect(screen.getByText('둘째 답')).toBeTruthy();
    expect(screen.queryByText('첫째 답')).toBeNull();
  });

  it('등록된 질문이 없으면 안내와 문의하기로 가는 줄을 보여 준다', async () => {
    mockApi.listFaqs.mockResolvedValue(ok([]));
    await render(<FaqScreen />);
    expect(await screen.findByText(F.empty)).toBe(screen.getByText('아직 등록된 질문이 없어요'));
    expect(screen.getByText(F.emptyNote)).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: F.toInquiry }));
    expect(router.push).toHaveBeenCalledWith('/my/inquiries/new');
  });

  it.each([
    ['인터넷이 끊겼을 때', { ok: false, error: 'NETWORK' }, F.failed.NETWORK],
    ['요청이 많을 때(429)', { ok: false, error: 'LIMIT', status: 429 }, F.failed.LIMIT],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }, F.failed.OTHER],
  ] as [string, ApiResult<Faq[]>, string][])(
    '받지 못하면(%s) 안내와 "다시 시도" 를 보여 주고, 누를 때만 다시 받는다',
    async (_name, failure, message) => {
      mockApi.listFaqs.mockResolvedValueOnce(failure);
      await render(<FaqScreen />);
      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.queryByText(F.empty)).toBeNull();
      expect(mockApi.listFaqs).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByRole('button', { name: F.retry }));
      expect(await screen.findByRole('button', { name: faqs[0].question })).toBeTruthy();
      expect(screen.queryByText(message)).toBeNull();
      expect(mockApi.listFaqs).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['항목에 답이 없다', [{ id: 'a', question: 'q' }]],
    ['배열이 아니다', { items: faqs }],
    ['한 항목만 어긋난다', [...faqs, { id: 7, question: 'q', answer: 'a' }]],
    ['빈 질문', [{ id: 'a', question: '', answer: 'a' }]],
  ])('모양이 계약과 다른 목록(%s)은 하나도 그리지 않고 실패로 본다', async (_name, body) => {
    serverAnswers(200, body);
    await render(<FaqScreen />);
    expect(await screen.findByText(F.failed.OTHER)).toBeTruthy();
    expect(screen.queryByRole('button', { name: faqs[0].question })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('받은 목록은 메모리에만 5분 두고 그동안 다시 열면 서버를 부르지 않는다. 기기에는 보관하지 않는다', async () => {
    jest.useFakeTimers();
    const first = await render(<FaqScreen />);
    expect(await screen.findByRole('button', { name: faqs[0].question })).toBeTruthy();
    await first.unmount();

    jest.advanceTimersByTime(FAQ_REUSE_MS - 1);
    const second = await render(<FaqScreen />);
    expect(await screen.findByRole('button', { name: faqs[0].question })).toBeTruthy();
    expect(mockApi.listFaqs).toHaveBeenCalledTimes(1);
    await second.unmount();

    jest.advanceTimersByTime(1);
    mockApi.listFaqs.mockResolvedValue(ok([faqs[2]]));
    await render(<FaqScreen />);
    expect(await screen.findByRole('button', { name: faqs[2].question })).toBeTruthy();
    expect(screen.queryByRole('button', { name: faqs[0].question })).toBeNull();
    expect(mockApi.listFaqs).toHaveBeenCalledTimes(2);

    expect(FAQ_REUSE_MS).toBe(5 * 60 * 1000);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('실패와 빈 목록은 메모리에 두지 않는다(다시 열면 다시 받는다)', async () => {
    mockApi.listFaqs.mockResolvedValueOnce({ ok: false, error: 'NETWORK' }).mockResolvedValueOnce(ok([]));
    const first = await render(<FaqScreen />);
    expect(await screen.findByText(F.failed.NETWORK)).toBeTruthy();
    await first.unmount();

    const second = await render(<FaqScreen />);
    expect(await screen.findByText(F.empty)).toBeTruthy();
    await second.unmount();

    await render(<FaqScreen />);
    expect(await screen.findByRole('button', { name: faqs[0].question })).toBeTruthy();
    expect(mockApi.listFaqs).toHaveBeenCalledTimes(3);
  });

  it('가짜 서버에서는 작은 예시 목록을 보여 준다', async () => {
    const fixtureApi = createApi({ baseUrl: '', getToken: () => null, useFixtures: true });
    mockApi.listFaqs.mockImplementation(() => fixtureApi.listFaqs());
    await render(<FaqScreen />);
    for (const item of fixtures.faqs) expect(await screen.findByRole('button', { name: item.question })).toBeTruthy();
  });

  it('앱에 실린 질문과 답은 없다. 화면의 문구만 남는다', () => {
    expect('items' in F).toBe(false);
    const leftovers = JSON.stringify(strings.faq);
    expect(leftovers).not.toMatch(/question|answer/);
    expect(Object.values(F).some((value) => Array.isArray(value))).toBe(false);
  });
});
