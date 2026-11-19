import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AVATAR_IDS, Avatar } from '@/components/avatar';
import { strings } from '@/content/strings';

// 프로필 8종(결정 042, 원본 assets/brand/avatar-1~8.svg). 화면에는 이름이 보이지 않고 화면 읽기 이름만 있다.
describe('Avatar', () => {
  it('1~8 여덟 가지다', () => {
    expect(AVATAR_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each(AVATAR_IDS)('%i: 정한 크기의 원으로 그리고 화면 읽기 이름을 준다', async (id) => {
    await render(<Avatar id={id} size={64} />);
    const view = screen.getByLabelText(strings.nickname.avatars[id - 1]);
    expect(StyleSheet.flatten(view.props.style)).toMatchObject({ width: 64, height: 64 });
    expect(screen.queryByText(strings.nickname.avatars[id - 1])).toBeNull();
  });
});
