import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { DataTable } from '@/components/data-table';
import { Field, FieldInput } from '@/components/field';
import { ListRow } from '@/components/list-row';
import { Paragraph } from '@/components/paragraph';
import { ChartMark } from '@/components/chart-mark';
import { SectionLabel } from '@/components/section-label';
import { ScrollPicker } from '@/components/scroll-picker';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontFamily, FontWeight, Radius, SheetRadius, Sizes, Spacing, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';

describe('테마', () => {
  it('어두운 바탕·밝은 글씨·푸른 보라 주색을 갖는다(결정 033)', () => {
    expect(Colors).toEqual({
      paper: '#0D0E12',
      raised: '#16171D',
      canvas: '#FFFFFF',
      ink: '#F2F3F7',
      gray: '#A9ABB7',
      hint: '#7C7E8A',
      muted: '#4D4F5A',
      hair: '#2A2B33',
      fill: '#1C1D24',
      primary: '#4752FF',
      primarySoft: '#1D2050',
      danger: '#E5484D',
    });
  });

  it('글자는 Pretendard 하나이고, 간격·모서리·부품 크기를 갖는다', () => {
    expect(Object.keys(Typography)).toEqual([
      'display', 'title', 'heading', 'button', 'body', 'table', 'label', 'mono', 'number', 'picker',
    ]);
    expect(Object.values(Typography).every((t) => t.fontFamily === FontFamily)).toBe(true);
    expect(Typography.display).toMatchObject({ fontSize: 28, lineHeight: 38, fontWeight: '500' });
    expect(Typography.button).toMatchObject({ fontSize: 16, fontWeight: '600' });
    expect(Typography.body).toMatchObject({ fontSize: 15, lineHeight: 24, fontWeight: '400' });
    // 자간: 20 이상 -2%, 15~18 -1%, 14 이하 0(결정 033)
    expect(Typography.display.letterSpacing).toBeCloseTo(-0.56);
    expect(Typography.body.letterSpacing).toBeCloseTo(-0.15);
    expect(Typography.label.letterSpacing).toBe(0);
    // 굵기는 400 · 500 · 600 세 가지만(결정 033). 700 이상 글꼴 파일은 싣지 않는다
    expect(FontWeight).toEqual({ regular: '400', medium: '500', semibold: '600' });
    const weights: string[] = Object.values(FontWeight);
    expect(Object.values(Typography).every((t) => weights.includes(t.fontWeight))).toBe(true);
    expect(Object.values(Spacing).slice(0, 7)).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(Radius).toBe(12);
    expect(SheetRadius).toBe(24);
    expect(Sizes).toMatchObject({ buttonHeight: 56, inputHeight: 56, maxContentWidth: 390 });
  });
});

describe('Button', () => {
  it('글씨를 그리고 누르면 onPress 를 부른다', async () => {
    const onPress = jest.fn();
    await render(<Button label="내 하늘 보기" onPress={onPress} />);
    await fireEvent.press(screen.getByText('내 하늘 보기'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('주·보조·빨강 세 가지 바탕을 테마 색으로 그리고, 누를 수 없으면 회색이다', async () => {
    const bg = async (variant: 'primary' | 'line' | 'danger', disabled = false) => {
      const view = await render(<Button label="버튼" variant={variant} disabled={disabled} onPress={() => {}} />);
      const style = StyleSheet.flatten(screen.getByRole('button').props.style);
      await view.unmount();
      return style;
    };
    expect((await bg('primary')).backgroundColor).toBe(Colors.primary);
    expect((await bg('line')).backgroundColor).toBe(Colors.fill);
    expect((await bg('danger')).backgroundColor).toBe(Colors.danger);
    expect((await bg('primary', true)).backgroundColor).toBe(Colors.hair);
    expect((await bg('primary')).borderRadius).toBe(12);
  });

  it('주·빨강 버튼의 글씨는 밝은 본문색이다(어두운 바탕, 결정 033)', async () => {
    const color = async (variant: 'primary' | 'danger') => {
      const view = await render(<Button label="버튼" variant={variant} onPress={() => {}} />);
      const value = StyleSheet.flatten(screen.getByText('버튼').props.style).color;
      await view.unmount();
      return value;
    };
    expect(await color('primary')).toBe(Colors.ink);
    expect(await color('danger')).toBe(Colors.ink);
  });

  it('disabled 이면 눌러도 onPress 를 부르지 않는다', async () => {
    const onPress = jest.fn();
    await render(<Button label="버튼" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByText('버튼'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('라벨(위)·값·도움말(아래)을 그린다', async () => {
    await render(
      <Field label="태어난 시각" hint="분 단위">
        오후 9:00
      </Field>,
    );
    expect(screen.getByText('태어난 시각')).toBeTruthy();
    expect(screen.getByText('오후 9:00')).toBeTruthy();
    expect(screen.getByText('분 단위')).toBeTruthy();
  });

  it('error 가 있으면 도움말 대신 오류 문구를 보여 준다', async () => {
    await render(
      <Field label="생년월일" hint="도움말" error="날짜를 확인해 주세요">
        1899
      </Field>,
    );
    expect(screen.getByText('날짜를 확인해 주세요')).toBeTruthy();
    expect(screen.queryByText('도움말')).toBeNull();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'body', title: '천체' },
    { key: 'sign', title: '별자리' },
    { key: 'degree', title: '도수', align: 'right' as const },
  ];
  const rows = [
    { key: 'sun', body: '태양', sign: '쌍둥이', degree: '24°41′' },
    { key: 'moon', body: '달', sign: '사수', degree: '8°54′' },
  ];

  it('머리줄과 줄마다의 칸을 그린다', async () => {
    await render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('천체')).toBeTruthy();
    expect(screen.getByText('24°41′')).toBeTruthy();
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(2);
  });

  it('header={false} 면 머리줄을 그리지 않는다', async () => {
    await render(<DataTable columns={columns} rows={rows} header={false} />);
    expect(screen.queryByText('천체')).toBeNull();
    expect(screen.getByText('태양')).toBeTruthy();
  });
});

describe('ChartMark', () => {
  it('눈금 원과 주색 점 하나로 된 표식을 그린다', async () => {
    await render(<ChartMark />);
    expect(screen.getByTestId('chart-mark')).toBeTruthy();
    expect(screen.getByLabelText(strings.appName)).toBeTruthy();
    // react-native-svg 는 색을 { type: 0, payload: 숫자 } 로 바꿔 넘긴다
    expect(screen.getByTestId('chart-mark-dot').props.fill).toEqual({ type: 0, payload: processColor(Colors.primary) });
  });
});

describe('Sheet', () => {
  it('visible 일 때만 내용을 그린다', async () => {
    const view = await render(
      <Sheet visible={false} onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    expect(screen.queryByText('시트 내용')).toBeNull();
    await view.rerender(
      <Sheet visible onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    expect(screen.getByText('시트 내용')).toBeTruthy();
  });

  it('바깥 어두운 곳을 누르면 onClose 를 부른다', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('시트는 바탕보다 한 단 떠 있는 면이고 손잡이는 그 위에서 보인다(결정 033)', async () => {
    await render(
      <Sheet visible onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style).backgroundColor).toBe(Colors.raised);
    expect(StyleSheet.flatten(screen.getByTestId('sheet-handle').props.style).backgroundColor).toBe(Colors.muted);
  });
});

describe('SectionLabel', () => {
  it('라벨 글자 단계와 회색으로 그린다', async () => {
    await render(<SectionLabel>한 줄 총평</SectionLabel>);
    const style = StyleSheet.flatten(screen.getByText('한 줄 총평').props.style);
    expect(style.fontSize).toBe(Typography.label.fontSize);
    expect(style.color).toBe(Colors.gray);
  });
});

describe('ScrollPicker', () => {
  const hours = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

  it('줄을 누르면 그 값을 고른다', async () => {
    const onChange = jest.fn();
    await render(<ScrollPicker testID="hour" items={hours} value={3} onChange={onChange} />);
    expect(screen.getAllByText('7')).toHaveLength(1);
    expect(screen.getByTestId('hour-3').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('hour-7'));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('loop 이면 끝에서 처음으로 이어지게 목록을 앞뒤로 한 벌씩 더 그린다', async () => {
    const onChange = jest.fn();
    await render(<ScrollPicker testID="hour" loop items={hours} value={12} onChange={onChange} />);
    // 12 다음에 1 이, 1 앞에 12 가 보인다
    expect(screen.getAllByText('12')).toHaveLength(3);
    expect(screen.getAllByText('1')).toHaveLength(3);
    // 가운데 벌의 줄이 골라져 있다
    expect(screen.getByTestId('hour-12').props.accessibilityState.selected).toBe(true);
    // 굴려서 뒤쪽 벌의 3 에 멈춰도 값은 3 이다
    await fireEvent.scroll(screen.getByTestId('hour-scroll'), {
      nativeEvent: { contentOffset: { y: (24 + 2) * 36 } },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
  });
});

describe('Paragraph', () => {
  it('근거 줄(작은 회색) · 제목 · 본문 순서로 그린다', async () => {
    await render(<Paragraph title="제목" body="본문" basis={['태양', '쌍둥이', '6하우스']} />);
    const basis = screen.getByText('근거 · 태양 · 쌍둥이 · 6하우스');
    expect(StyleSheet.flatten(basis.props.style)).toMatchObject({ ...Typography.label, color: Colors.gray });
    expect(StyleSheet.flatten(screen.getByText('제목').props.style)).toMatchObject(Typography.heading);
    expect(StyleSheet.flatten(screen.getByText('본문').props.style)).toMatchObject(Typography.body);
  });

  it('근거가 없으면 근거 줄을 그리지 않는다', async () => {
    await render(<Paragraph title="제목" body="본문" basis={[]} />);
    expect(screen.queryByText(new RegExp(`^${strings.reading.basisLabel}`))).toBeNull();
  });
});

describe('ListRow', () => {
  it('누를 수 있는 줄은 버튼이고 높이가 목록 한 줄이다. 누르면 알린다', async () => {
    const onPress = jest.fn();
    await render(<ListRow label="이용약관" onPress={onPress} />);
    const row = screen.getByRole('button', { name: '이용약관' });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      height: Sizes.listRow,
      borderBottomColor: Colors.hair,
    });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('값이 있으면 오른쪽에 회색으로 적고, 누를 수 없는 줄은 버튼이 아니다', async () => {
    await render(<ListRow label="앱 버전" value="1.0.0" />);
    expect(StyleSheet.flatten(screen.getByText('1.0.0').props.style).color).toBe(Colors.gray);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('이름의 색을 고를 수 있다(지우는 줄)', async () => {
    await render(<ListRow label="계정 삭제" color="danger" onPress={() => {}} />);
    expect(StyleSheet.flatten(screen.getByText('계정 삭제').props.style).color).toBe(Colors.danger);
  });
});

describe('FieldInput: 여러 줄', () => {
  it('multiline 이면 칸이 여러 줄 높이가 되고 글은 위에서 시작한다', async () => {
    await render(<FieldInput multiline placeholder="길게" />);
    const input = screen.getByPlaceholderText('길게');
    expect(StyleSheet.flatten(input.parent?.props.style)).toMatchObject({ height: Sizes.textArea });
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ textAlignVertical: 'top' });
  });

  it('한 줄 칸의 높이는 그대로 56 이다', async () => {
    await render(<FieldInput placeholder="짧게" />);
    expect(StyleSheet.flatten(screen.getByPlaceholderText('짧게').parent?.props.style)).toMatchObject({
      height: Sizes.inputHeight,
    });
  });
});
