import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Colors } from '@/constants/theme';

const styleOf = () => StyleSheet.flatten(screen.getByRole('button').props.style);
const textOf = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style);

// 시트 위의 보조 버튼(결정 103 의 3): 이름 있는 바탕 sheetSecondary(#2A2B33 — 시트 면 raised 위에서 보이게). 테두리 · 구분선 색(hair)을 빌리지 않는다(리뷰 #166)
describe('Button sheetLine', () => {
  it('누를 수 있으면 sheetSecondary(#2A2B33) 바탕에 본문색 글자', async () => {
    await render(<Button variant="sheetLine" label="이미지 저장" onPress={() => {}} />);
    expect(Colors.sheetSecondary).toBe('#2A2B33');
    expect(styleOf().backgroundColor).toBe(Colors.sheetSecondary);
    expect(textOf('이미지 저장').color).toBe(Colors.ink);
  });

  it('누를 수 없으면 다른 버튼과 같은 비활성 모양(채운 면 fill · 흐린 글자 muted) — 바탕이 시트에 가까워지고 글자가 흐려져 누를 수 없음이 보인다', async () => {
    await render(<Button variant="sheetLine" label="이미지 저장" onPress={() => {}} disabled />);
    expect(styleOf().backgroundColor).toBe(Colors.fill);
    expect(textOf('이미지 저장').color).toBe(Colors.muted);
    await render(<Button variant="line" label="보조" onPress={() => {}} disabled />);
    expect(styleOf().backgroundColor).toBe(Colors.fill);
  });
});
