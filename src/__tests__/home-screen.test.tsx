import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

  it('카테고리는 아이콘 타일이고 한 줄에 둘씩 놓인다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByText(M.categories[0].caption);
    expect(screen.getAllByTestId('home-category-icon')).toHaveLength(4);
    for (const cell of screen.getAllByTestId('home-category-cell')) {
      expect(StyleSheet.flatten(cell.props.style).width).toBe('50%');
    }
  });

  it('"나" 타일을 누르면 그 칸의 항목이 시트로 올라오고, 거기서 풀이 글과 차트로 간다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    // 타일을 누르기 전에는 항목이 보이지 않는다
    await screen.findByText(M.categories[0].caption);
    expect(screen.queryByText('요약 풀이')).toBeNull();
    await fireEvent.press(screen.getByLabelText('나'));
    await fireEvent.press(await screen.findByText('요약 풀이'));
    expect(router.push).toHaveBeenCalledWith('/reading');
    // 고르면 시트가 닫힌다
    await waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
    await fireEvent.press(screen.getByLabelText('나'));
    await fireEvent.press(await screen.findByText('내 차트'));
    expect(router.push).toHaveBeenCalledWith('/chart');
  });

  it('아직 없는 기능은 "준비 중" 으로 보이고 눌러도 아무 데도 가지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByText(M.categories[0].caption);
    // 관계 · 궁합 · 시기 세 타일은 통째로 준비 중이라 눌러도 열리지 않는다
    expect(screen.getAllByTestId('home-category-soon')).toHaveLength(3);
    await fireEvent.press(screen.getByLabelText('궁합'));
    expect(screen.queryByTestId('sheet-dim')).toBeNull();
    // "나" 안의 아직 없는 항목도 준비 중이다
    await fireEvent.press(screen.getByLabelText('나'));
    await fireEvent.press(await screen.findByText('심층 리포트'));
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
