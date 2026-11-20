import { render, screen } from '@testing-library/react-native';

import SynastryLayout from '@/app/synastry/_layout';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
  Stack: () => null,
}));

// 1.0.0 에는 궁합으로 가는 길이 없다 — 딥 링크로 /synastry/** 를 열어도 홈으로(결정 055 의 1, 계획 리뷰 초점 5)
describe('궁합 주소', () => {
  it('/synastry 아래 어느 주소로 들어와도 홈으로 보낸다', async () => {
    await render(<SynastryLayout />);
    expect(screen.getByText('redirect:/')).toBeTruthy();
  });
});
