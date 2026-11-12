import { fireEvent, render, screen } from '@testing-library/react-native';

import FaqScreen from '@/app/settings/faq';
import { strings } from '@/content/strings';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const F = strings.faq;

describe('자주 묻는 질문(/settings/faq)', () => {
  it('질문을 모두 보여 주고, 답은 접혀 있다', async () => {
    await render(<FaqScreen />);
    expect(screen.getByText(F.title)).toBeTruthy();
    expect(F.items.length).toBeGreaterThanOrEqual(8);
    for (const item of F.items) {
      expect(screen.getByText(item.question)).toBeTruthy();
      expect(screen.queryByText(item.answer)).toBeNull();
    }
  });

  it('질문을 누르면 그 답만 펼쳐지고, 다시 누르면 접힌다', async () => {
    await render(<FaqScreen />);
    const [first, second] = F.items;
    const row = screen.getByRole('button', { name: first.question });
    expect(row.props.accessibilityState).toMatchObject({ expanded: false });

    await fireEvent.press(row);
    expect(screen.getByText(first.answer)).toBeTruthy();
    expect(screen.queryByText(second.answer)).toBeNull();
    expect(screen.getByRole('button', { name: first.question }).props.accessibilityState).toMatchObject({
      expanded: true,
    });

    await fireEvent.press(screen.getByRole('button', { name: first.question }));
    expect(screen.queryByText(first.answer)).toBeNull();
  });

  it('여러 질문을 함께 펼쳐 둘 수 있다', async () => {
    await render(<FaqScreen />);
    const [first, second] = F.items;
    await fireEvent.press(screen.getByRole('button', { name: first.question }));
    await fireEvent.press(screen.getByRole('button', { name: second.question }));
    expect(screen.getByText(first.answer)).toBeTruthy();
    expect(screen.getByText(second.answer)).toBeTruthy();
  });
});
