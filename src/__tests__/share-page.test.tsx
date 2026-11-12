import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SharedCardScreen, { generateMetadata } from '@/app/s/[shareId]';
import { strings } from '@/content/strings';
import { api, type ApiResult, type ShareCard } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: jest.fn(() => ({ shareId: 'AbCdEfGhIjKlMnOpQrStUv' })),
}));
// 이 화면이 부를 수 있는 것은 getSharedCard 뿐이다. 나머지는 불리면 안 되는 것으로 둔다.
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  const forbidden = Object.fromEntries(Object.keys(actual.api).map((name) => [name, jest.fn()]));
  return { ...actual, api: forbidden };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockParams = useLocalSearchParams as jest.Mock;
const P = strings.share.page;
const C = fixtures.shareCards;
const got = (card: ShareCard): ApiResult<ShareCard> => ({ ok: true, data: card });
/** getSharedCard 말고 불린 호출의 이름 */
const otherCalls = () =>
  Object.entries(mockApi)
    .filter(([name, fn]) => name !== 'getSharedCard' && (fn as jest.Mock).mock.calls.length > 0)
    .map(([name]) => name);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ shareId: 'AbCdEfGhIjKlMnOpQrStUv' });
});

describe('공유 페이지(/s/<공유 식별자>)', () => {
  const cases: [string, ShareCard, string[]][] = [
    ['요약 해석', C.reading, [C.reading.headline, ...C.reading.keywords]],
    ['궁합 점수', C.score, ['나 × 지우', '82점', C.score.headline]],
    ['랭킹', C.ranking, ['내 친구 궁합 TOP 3', 'ㅁㅅ', '91점', 'ㅅㅇ', '77점']],
    ['다음 변곡점', C.nextTurn, ['2029년 여름', C.nextTurn.theme]],
  ];

  it.each(cases)('%s 카드를 세션 없이 받아 그린다', async (_name, card, expected) => {
    mockApi.getSharedCard.mockResolvedValue(got(card));
    await render(<SharedCardScreen />);
    const view = await screen.findByTestId('share-card');
    for (const text of expected) expect(within(view).getByText(text)).toBeTruthy();
    expect(mockApi.getSharedCard).toHaveBeenCalledTimes(1);
    expect(mockApi.getSharedCard).toHaveBeenCalledWith('AbCdEfGhIjKlMnOpQrStUv');
    // 개발용 세션(POST /auth/dev)도, 세션이 필요한 다른 호출도 하지 않는다
    expect(otherCalls()).toEqual([]);
  });

  it('"나도 보러 가기" 는 첫 화면(/)으로 간다', async () => {
    mockApi.getSharedCard.mockResolvedValue(got(C.reading));
    await render(<SharedCardScreen />);
    await screen.findByTestId('share-card');
    await fireEvent.press(screen.getByText(P.cta));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('받는 동안에는 불러오는 중을 보여 준다', async () => {
    mockApi.getSharedCard.mockReturnValue(new Promise(() => {}));
    await render(<SharedCardScreen />);
    expect(await screen.findByText(P.loading)).toBeTruthy();
    expect(screen.queryByTestId('share-card')).toBeNull();
  });

  it('없는 식별자(404)면 안내와 같은 버튼을 보여 준다', async () => {
    mockApi.getSharedCard.mockResolvedValue({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await render(<SharedCardScreen />);
    expect(await screen.findByText(P.notFound)).toBeTruthy();
    expect(screen.queryByTestId('share-card')).toBeNull();
    expect(screen.queryByText(P.retry)).toBeNull();
    await fireEvent.press(screen.getByText(P.cta));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(otherCalls()).toEqual([]);
  });

  it('받지 못하면 안내와 "다시 시도" 를 보여 주고, 누르면 다시 받는다', async () => {
    mockApi.getSharedCard
      .mockResolvedValueOnce({ ok: false, error: 'NETWORK' })
      .mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 })
      .mockResolvedValueOnce(got(C.nextTurn));
    await render(<SharedCardScreen />);
    expect(await screen.findByText(P.failed.NETWORK)).toBeTruthy();
    expect(screen.getByText(P.cta)).toBeTruthy();
    await fireEvent.press(screen.getByText(P.retry));
    expect(await screen.findByText(P.failed.LIMIT)).toBeTruthy();
    await fireEvent.press(screen.getByText(P.retry));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.getSharedCard).toHaveBeenCalledTimes(3);
  });

  it('링크 미리보기의 제목 · 설명은 고정 문구다(카드 내용 · 식별자를 넣지 않는다)', () => {
    const meta = generateMetadata();
    expect(meta).toMatchObject({
      title: P.metaTitle,
      description: P.metaDescription,
      openGraph: { title: P.metaTitle, description: P.metaDescription },
    });
  });
});
