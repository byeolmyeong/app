import { fireEvent, render, screen } from '@testing-library/react-native';

import { Dialog } from '@/components/dialog';

// 가운데 창(결정 061 의 6, 보드 17): 제목 · 설명 · 버튼 둘(보조 왼쪽 · 주 오른쪽)
describe('Dialog', () => {
  const setup = async () => {
    const cancel = jest.fn();
    const confirm = jest.fn();
    await render(
      <Dialog
        title="새 버전이 나왔어요"
        body={'첫째 줄\n둘째 줄'}
        cancel={{ label: '나중에', onPress: cancel }}
        confirm={{ label: '업데이트', onPress: confirm }}
      />,
    );
    return { cancel, confirm };
  };

  it('제목 · 두 줄 설명 · 버튼 둘을 그린다 — 보조가 왼쪽, 주 버튼이 오른쪽', async () => {
    await setup();
    expect(screen.getByRole('header', { name: '새 버전이 나왔어요' })).toBeTruthy();
    expect(screen.getByText('첫째 줄\n둘째 줄')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getAllByText(/나중에|업데이트/).map((t) => t.props.children)).toEqual(['나중에', '업데이트']);
  });

  it('버튼마다 제 일을 한다', async () => {
    const { cancel, confirm } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: '업데이트' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: '나중에' }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('뒤로 가기(안드로이드)는 보조 버튼과 같다', async () => {
    const { cancel, confirm } = await setup();
    await fireEvent(screen.getByTestId('dialog'), 'requestClose');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });
});
