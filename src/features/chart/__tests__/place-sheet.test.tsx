import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { PlaceSheet, placeLabel } from '@/features/chart/place-sheet';
import { fixtures } from '@/lib/fixtures';

const B = strings.birthSheet;
const onPick = jest.fn();
const onClose = jest.fn();
const onRetry = jest.fn();

beforeEach(() => jest.clearAllMocks());

const open = (over: Partial<Parameters<typeof PlaceSheet>[0]> = {}) =>
  render(
    <PlaceSheet visible places={fixtures.places} failed={false} onRetry={onRetry} onPick={onPick} onClose={onClose} {...over} />,
  );

const search = () => screen.getByLabelText(B.searchPlaceholder);

// 태어난 곳 고르기 시트(결정 041, 보드 8-2 · 8-2-1 · 8-2-2). 목록은 서버가 준 것만 쓴다.
describe('태어난 곳 시트', () => {
  it('맨 위 동네 검색, 아래 시 · 도 칩 17개(3열)', async () => {
    await open();
    expect(search()).toBeTruthy();
    expect(screen.getByText(B.regions)).toBeTruthy();
    expect(screen.getAllByTestId('place-region')).toHaveLength(17);
    expect(screen.getByText('서울')).toBeTruthy();
    expect(screen.queryAllByTestId('place-option')).toHaveLength(0);
  });

  it('시 · 도를 누르면 그 시 · 군 · 구 목록(제목은 시 · 도), 뒤로 가면 다시 칩', async () => {
    await open();
    await fireEvent.press(screen.getByText('부산'));
    expect(screen.getAllByTestId('place-option')).toHaveLength(16);
    expect(screen.queryAllByTestId('place-region')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(screen.getAllByTestId('place-region')).toHaveLength(17);
  });

  it('시 · 군 · 구를 고르면 그 곳을 넘긴다. 고른 곳에는 체크', async () => {
    const gangnam = fixtures.places.find((p) => p.name === '서울특별시 강남구')!;
    await open({ selectedId: gangnam.id });
    await fireEvent.press(screen.getByText('서울'));
    expect(screen.getByRole('button', { name: '강남구' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByText('마포구'));
    expect(onPick).toHaveBeenCalledWith(fixtures.places.find((p) => p.name === '서울특별시 마포구'));
  });

  it('세종처럼 시 · 군 · 구가 없는 곳은 칩을 누르면 바로 고른다', async () => {
    await open();
    await fireEvent.press(screen.getByText('세종'));
    expect(onPick).toHaveBeenCalledWith(fixtures.places.find((p) => p.name === '세종특별자치시'));
  });

  it('검색 "중구" → 6곳, 같은 이름이라 시 · 도가 앞에 함께 보이고 결과 개수 줄은 없다(리뷰 초점 4)', async () => {
    await open();
    await fireEvent.changeText(search(), '중구');
    const rows = screen.getAllByTestId('place-option');
    expect(rows).toHaveLength(6);
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel).filter((l) => /중구$/.test(l ?? ''))).toEqual([
      '서울 중구',
      '부산 중구',
      '대구 중구',
      '인천 중구',
      '대전 중구',
      '울산 중구',
    ]);
    expect(screen.queryByText(/6/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '대구 중구' }));
    expect(onPick).toHaveBeenCalledWith(fixtures.places.find((p) => p.name === '대구광역시 중구'));
  });

  it('같은 이름의 고성군 · 강서구도 시 · 도로 가른다', async () => {
    await open();
    await fireEvent.changeText(search(), '고성');
    expect(screen.getByRole('button', { name: '강원 고성군' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '경남 고성군' })).toBeTruthy();
    await fireEvent.changeText(search(), '강서');
    expect(screen.getByRole('button', { name: '서울 강서구' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '부산 강서구' })).toBeTruthy();
  });

  it('찾는 곳이 없으면 안내, 지우기를 누르면 다시 칩', async () => {
    await open();
    await fireEvent.changeText(search(), '없는동네');
    expect(screen.getByText(B.noResult)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: B.clearSearch }));
    expect(screen.getAllByTestId('place-region')).toHaveLength(17);
  });

  it('지역 목록을 받는 동안은 받는 중이라고 보이고, 그 사이 검색해도 "찾는 동네가 없어요" 를 띄우지 않는다(리뷰 A12)', async () => {
    await open({ places: null, failed: false });
    expect(screen.getByText(B.loading)).toBeTruthy();
    await fireEvent.changeText(search(), '중구');
    expect(screen.queryByText(B.noResult)).toBeNull();
    expect(screen.getByText(B.loading)).toBeTruthy();
  });

  it('목록을 받지 못했으면 안내와 다시 불러오기', async () => {
    await open({ places: null, failed: true });
    expect(screen.getByText(strings.home.placeLoadFailed)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.home.placeRetry));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('placeLabel', () => {
  it('칸에는 짧은 시 · 도 이름으로 적는다', () => {
    expect(placeLabel('서울특별시 강남구')).toBe('서울 강남구');
    expect(placeLabel('경기도 성남시 분당구')).toBe('경기 성남시 분당구');
    expect(placeLabel('세종특별자치시')).toBe('세종');
  });
});
