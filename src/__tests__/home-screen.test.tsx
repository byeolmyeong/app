import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { listPlaces: jest.fn(), createChart: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const M = strings.main;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
});

describe('홈', () => {
  it('출생 정보가 없으면 입력부터 받는다', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByPlaceholderText(strings.home.datePlaceholder)).toBeTruthy();
    expect(screen.queryByText(M.categories[0].caption)).toBeNull();
  });

  it('출생 정보가 있으면 카테고리 네 칸을 보여 준다: 나 · 관계 · 궁합 · 시기', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByText(M.categories[0].caption)).toBeTruthy();
    expect(screen.getAllByTestId('home-category').map((c) => c.props.accessibilityLabel)).toEqual([
      '나',
      '관계',
      '궁합',
      '시기',
    ]);
    // 입력 칸은 보이지 않고, 넣어 둔 출생 정보가 한 줄로 적힌다
    expect(screen.queryByPlaceholderText(strings.home.datePlaceholder)).toBeNull();
    expect(screen.getByText('2000. 6. 15. 오후 9:00 · 서울특별시 마포구')).toBeTruthy();
  });

  it('"나" 에서 풀이 글과 차트로 간다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByText('요약 풀이'));
    expect(router.push).toHaveBeenCalledWith('/reading');
    await fireEvent.press(screen.getByText('내 차트'));
    expect(router.push).toHaveBeenCalledWith('/chart');
  });

  it('아직 없는 기능은 "준비 중" 으로 보이고 눌러도 아무 데도 가지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByText(M.categories[0].caption);
    // 관계 · 궁합 · 시기 세 칸은 통째로 준비 중이다
    expect(screen.getAllByTestId('home-category-soon')).toHaveLength(3);
    await fireEvent.press(screen.getByText('상대와 궁합 보기'));
    await fireEvent.press(screen.getByText('심층 리포트'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('"출생 정보 바꾸기" 는 입력 화면(/birth)으로 간다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByText(M.editBirth));
    expect(router.push).toHaveBeenCalledWith('/birth');
  });
});

describe('출생 정보 바꾸기(/birth)', () => {
  it('넣어 둔 값으로 채운 입력 화면을 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<BirthScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    expect(screen.getByText('오후 9:00')).toBeTruthy();
    expect(screen.getByText('서울특별시 마포구')).toBeTruthy();
  });
});
