import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { DataTable } from '@/components/data-table';
import { Field } from '@/components/field';
import { ChartMark } from '@/components/chart-mark';
import { SectionLabel } from '@/components/section-label';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontFamily, MonoFamily, Radius, SerifFamily, Spacing, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';

describe('테마', () => {
  it('천문도 색을 갖는다(결정 016)', () => {
    expect(Colors).toMatchObject({
      paper: '#F4F1EA',
      canvas: '#E9E6DE',
      ink: '#15161A',
      gray: '#77736A',
      hair: '#D6D2C8',
      gold: '#C8822E',
      night: '#0F1220',
      nightGold: '#E0A45A',
      danger: '#B3402F',
    });
    expect(Colors).not.toHaveProperty('seal');
  });

  it('글자 단계 8개와 간격·모서리를 갖는다', () => {
    expect(Object.keys(Typography)).toEqual(['display', 'title', 'heading', 'body', 'table', 'mono', 'number', 'label']);
    expect(Typography.display).toMatchObject({ fontFamily: SerifFamily, fontSize: 30, lineHeight: 38 });
    expect(Typography.title).toMatchObject({ fontFamily: SerifFamily, fontSize: 26 });
    expect(Typography.body).toMatchObject({ fontFamily: FontFamily, fontSize: 14, lineHeight: 22 });
    // 한글이 섞이는 표·보조 문장은 Pretendard, 숫자만 있는 곳은 고정폭
    expect(Typography.table).toMatchObject({ fontFamily: FontFamily });
    expect(Typography.mono).toMatchObject({ fontFamily: MonoFamily });
    expect(Typography.number).toMatchObject({ fontFamily: MonoFamily, fontSize: 26 });
    expect(Typography.label).toMatchObject({ fontFamily: FontFamily, fontSize: 11, lineHeight: 14 });
    expect(Object.values(Spacing).slice(0, 7)).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(Radius).toBe(4);
  });
});

describe('Button', () => {
  it('글씨와 화살표를 그리고 누르면 onPress 를 부른다', async () => {
    const onPress = jest.fn();
    await render(<Button label="내 하늘 보기" onPress={onPress} />);
    expect(screen.getByText('→')).toBeTruthy();
    await fireEvent.press(screen.getByText('내 하늘 보기'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('주·선·빨강 세 가지 바탕을 테마 색으로 그린다', async () => {
    const bg = async (variant: 'primary' | 'line' | 'danger') => {
      const view = await render(<Button label="버튼" variant={variant} onPress={() => {}} />);
      const style = StyleSheet.flatten(screen.getByRole('button').props.style);
      await view.unmount();
      return style;
    };
    expect((await bg('primary')).backgroundColor).toBe(Colors.ink);
    expect((await bg('danger')).backgroundColor).toBe(Colors.danger);
    const line = await bg('line');
    expect(line.backgroundColor).toBe('transparent');
    expect(line.borderColor).toBe(Colors.ink);
  });

  it('disabled 이면 눌러도 onPress 를 부르지 않는다', async () => {
    const onPress = jest.fn();
    await render(<Button label="버튼" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByText('버튼'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('라벨·값·도움말을 한 줄에 그린다', async () => {
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
  it('눈금 원과 금색 점 하나로 된 표식을 그린다', async () => {
    await render(<ChartMark />);
    expect(screen.getByTestId('chart-mark')).toBeTruthy();
    expect(screen.getByLabelText(strings.appName)).toBeTruthy();
    // react-native-svg 는 색을 { type: 0, payload: 숫자 } 로 바꿔 넘긴다
    expect(screen.getByTestId('chart-mark-dot').props.fill).toEqual({ type: 0, payload: processColor(Colors.gold) });
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
