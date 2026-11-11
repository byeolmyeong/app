import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { DataTable } from '@/components/data-table';
import { Field } from '@/components/field';
import { ChartMark } from '@/components/chart-mark';
import { SectionLabel } from '@/components/section-label';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontFamily, Radius, SheetRadius, Sizes, Spacing, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';

describe('테마', () => {
  it('흰 바탕·중립 회색·초록 주색을 갖는다(결정 018)', () => {
    expect(Colors).toMatchObject({
      paper: '#FFFFFF',
      canvas: '#FFFFFF',
      ink: '#191919',
      gray: '#6A6A6A',
      hint: '#989898',
      muted: '#C6C6C6',
      hair: '#E6E6E6',
      fill: '#F6F6F6',
      primary: '#3DDB99',
      primaryLight: '#ECFBF5',
      night: '#0F1220',
      nightGold: '#E0A45A',
      danger: '#F73838',
    });
    expect(Colors).not.toHaveProperty('gold');
  });

  it('글자는 Pretendard 하나이고, 간격·모서리·부품 크기를 갖는다', () => {
    expect(Object.keys(Typography)).toEqual([
      'display', 'title', 'heading', 'button', 'body', 'table', 'label', 'mono', 'number', 'picker',
    ]);
    expect(Object.values(Typography).every((t) => t.fontFamily === FontFamily)).toBe(true);
    expect(Typography.display).toMatchObject({ fontSize: 28, lineHeight: 39, fontWeight: '700' });
    expect(Typography.button).toMatchObject({ fontSize: 16, fontWeight: '600' });
    expect(Typography.body).toMatchObject({ fontSize: 15, lineHeight: 23 });
    // 글자 사이는 크기의 -2%
    expect(Typography.body.letterSpacing).toBeCloseTo(-0.3);
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
});

describe('SectionLabel', () => {
  it('라벨 글자 단계와 회색으로 그린다', async () => {
    await render(<SectionLabel>한 줄 총평</SectionLabel>);
    const style = StyleSheet.flatten(screen.getByText('한 줄 총평').props.style);
    expect(style.fontSize).toBe(Typography.label.fontSize);
    expect(style.color).toBe(Colors.gray);
  });
});
