import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Colors, FontWeight, TimingLayout } from '@/constants/theme';
import { PracticeCards, TodoList } from '@/features/timing/timing-parts';

const flat = (el: { props: Record<string, unknown> }) => (StyleSheet.flatten(el.props.style as never) ?? {}) as Record<string, unknown>;
const items = [{ title: '미뤄 둔 이야기 하나 꺼내 보기' }, { title: '오늘 고마웠던 사람에게 짧은 메시지 하나 보내 보기' }, { title: '대화 뒤에 혼자 쉬는 시간 갖기' }];

/** 번호 동그라미 32 · 숫자 15/22 굵게(주색 글자) · 바탕은 카드에 가까운 채움색 */
function expectBadge(badge: { props: Record<string, unknown> }, n: number) {
  expect(flat(badge)).toMatchObject({ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.fill });
  const digit = within(badge as never).getByText(String(n));
  expect(flat(digit)).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: FontWeight.semibold, color: Colors.accentText });
}

describe('작은 실천의 번호(결정 095, 소유자 B안)', () => {
  it('번호 줄(그날의 작은 실천 14-4): 동그라미 32 · 숫자 15, 두 줄로 꺾여도 번호는 줄의 가운데 · 줄 최소 높이는 그대로 44', async () => {
    await render(<TodoList items={items} />);
    expect(TimingLayout.badge).toBe(32);
    const rows = screen.getAllByTestId('timing-todo');
    rows.forEach((row, i) => {
      expect(flat(row)).toMatchObject({ alignItems: 'center', minHeight: TimingLayout.day.todo });
      expectBadge(within(row).getByTestId('timing-badge'), i + 1);
    });
  });

  it('홈 카드의 번호 줄: 줄 최소 높이는 번호 높이(32), 줄 사이 14', async () => {
    await render(<TodoList items={items} spaced />);
    expect(flat(screen.getByTestId('timing-todos'))).toMatchObject({ gap: 14 });
    for (const row of screen.getAllByTestId('timing-todo')) expect(flat(row)).toMatchObject({ alignItems: 'center', minHeight: 32 });
  });

  it('시기 화면 "이 시기의 작은 실천" 카드도 같은 번호(32 · 15)', async () => {
    await render(<PracticeCards practices={items} />);
    screen.getAllByTestId('timing-practice').forEach((card, i) => expectBadge(within(card).getByTestId('timing-badge'), i + 1));
  });
});
