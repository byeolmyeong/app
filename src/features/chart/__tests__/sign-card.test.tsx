import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ReadingLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { SignCard, SignCardSkeleton } from '@/features/chart/sign-card';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const L = ReadingLayout.card;

/** 카드 아래 안쪽 여백 */
const padBottom = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).paddingBottom as number;
/** "내 하늘 지도 보기" 줄의 높이 */
const rowHeight = () => StyleSheet.flatten(screen.getByRole('button', { name: strings.reading.seeSkyMap }).props.style).height as number;

describe('별자리 카드의 "내 하늘 지도 보기" 줄(보드 12)', () => {
  it('글 아래 여백은 셋 칸의 위아래 여백과 같다 — 줄 안 글 아래 + 카드 아래 안쪽 여백(소유자 빌드 14 "조금 좁혀")', async () => {
    await render(<SignCard chart={fixtures.chart} />);
    const belowText = (rowHeight() - Typography.table.lineHeight) / 2 + padBottom('sign-card');
    expect(belowText).toBe(L.gridPadV);
  });

  it('누르는 칸은 44 이상을 지킨다', async () => {
    await render(<SignCard chart={fixtures.chart} />);
    expect(rowHeight()).toBeGreaterThanOrEqual(44);
  });

  it('뼈대도 같은 카드 · 같은 아래 여백(결정 071)', async () => {
    await render(<SignCard chart={fixtures.chart} />);
    const real = padBottom('sign-card');
    await render(<SignCardSkeleton chart={fixtures.chart} />);
    expect(padBottom('sign-card-skeleton')).toBe(real);
  });
});
