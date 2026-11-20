import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { strings } from '@/content/strings';

const props = { label: '물병자리가 뭔가요?', title: '물병자리', text: '열두 별자리 중 열한째 자리예요.' };

describe('InfoTip: 이름 옆 물음표를 누르면 위에 뜨는 말풍선(시안 13-2)', () => {
  it('닫혀 있으면 이름과 물음표만 보이고, 물음표를 누르면 알린다', async () => {
    const onToggle = jest.fn();
    await render(
      <InfoTip {...props} open={false} onToggle={onToggle} testID="tip">
        <Text>물병자리</Text>
      </InfoTip>,
    );
    expect(screen.getByText('물병자리')).toBeTruthy();
    const mark = screen.getByRole('button', { name: props.label });
    expect(mark.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText(props.text)).toBeNull();
    await fireEvent.press(mark);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('열려 있으면 굵은 첫 줄과 설명을 보여 주고, 물음표는 "팁 닫기" 가 된다', async () => {
    const onToggle = jest.fn();
    await render(
      <InfoTip {...props} open onToggle={onToggle} testID="tip">
        <Text>물병자리</Text>
      </InfoTip>,
    );
    expect(screen.getByTestId('tip-bubble')).toBeTruthy();
    expect(screen.getAllByText(props.title)).toHaveLength(2);
    expect(screen.getByText(props.text)).toBeTruthy();
    const mark = screen.getByRole('button', { name: strings.help.tipClose });
    expect(mark.props.accessibilityState).toMatchObject({ expanded: true });
    await fireEvent.press(mark);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
