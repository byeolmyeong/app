import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Platform, StyleSheet } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Byeoli } from '@/components/byeoli';
import { DataTable } from '@/components/data-table';
import { Field, FieldInput, FieldSelect } from '@/components/field';
import { GlowShape } from '@/components/glow';
import { InfoButton } from '@/components/info-button';
import { ListRow } from '@/components/list-row';
import { Paragraph } from '@/components/paragraph';
import { SectionLabel } from '@/components/section-label';
import { ScrollPicker } from '@/components/scroll-picker';
import { Sheet } from '@/components/sheet';
import { StatusView } from '@/components/status-view';
import { Txt } from '@/components/txt';
import { Colors, FontFamily, FontWeight, Radius, SheetRadius, Sizes, Spacing, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';

describe('테마', () => {
  it('어두운 바탕·밝은 글씨·푸른 보라 주색을 갖는다(결정 033 · 글씨 색은 결정 080)', () => {
    expect(Colors).toEqual({
      paper: '#0D0E12',
      raised: '#16171D',
      // 화면 밖 여백: 웹 넓은 화면만 흰색이고, 앱(태블릿·폴드)은 바탕색이다. jest 는 앱(ios)으로 돈다
      canvas: '#0D0E12',
      ink: '#F2F3F7',
      // 달력의 날짜 · 마이 카드의 한 줄 별명만(결정 080)
      inkSoft: '#DADCE3',
      // 본문 회색: 제목보다 한 단, 보조보다 한 단 밝다(결정 080, 시안 "본문 회색 ②")
      body: '#BCBFC8',
      gray: '#A9ABB7',
      // 메타: 카드(#16171D) 위 작은 글씨도 4.5 를 넘게(결정 080 — 옛 #7C7E8A 는 4.4)
      hint: '#868894',
      muted: '#4D4F5A',
      hair: '#2A2B33',
      fill: '#1C1D24',
      sheetFill: '#1F2027',
      handle: '#3A3B42',
      fieldOff: '#121318',
      primary: '#4752FF',
      accentText: '#9AA3FF',
      primarySoft: '#1D2050',
      // 나 탭: 문단 번호 · 막대 끝의 밝은 주색, 키워드 칩의 옅은 바탕 · 테두리 · 글씨(보드 12-8~12-12)
      primaryBright: '#6E78FF',
      keyword: 'rgba(154,163,255,0.12)',
      keywordLine: 'rgba(154,163,255,0.28)',
      keywordText: '#C9CEFF',
      danger: '#E5484D',
      dangerSoft: '#FF8A8A',
      // 짧은 알림의 성공 체크(보드 23) · 처음 불러올 때 뼈대의 바탕과 빛(보드 24)
      success: '#7EE0B5',
      skeleton: '#1E1F27',
      skeletonShine: '#2A2B35',
    });
  });

  it('웹 넓은 화면의 앱 폭 밖은 바탕보다 한 단 어두운 색이다(2026-11-18 소유자)', () => {
    // 테마를 웹으로 다시 불러온다(격리된 모듈에서 Platform.OS 만 웹으로 바꾼다)
    jest.isolateModules(() => {
      const { Platform } = jest.requireActual<typeof import('react-native')>('react-native');
      const original = Platform.OS;
      Platform.OS = 'web';
      try {
        const web = jest.requireActual<typeof import('@/constants/theme')>('@/constants/theme');
        expect(web.Colors.canvas).toBe('#08090B');
        expect(web.Colors.canvas).not.toBe(web.Colors.paper);
      } finally {
        Platform.OS = original;
      }
    });
  });

  it('글자는 Pretendard 하나이고, 간격·모서리·부품 크기를 갖는다', () => {
    // 글자 단계 v2(결정 080): 역할 13 + 부품 전용 8. 옛 37단(결정 033)에서 겹친 것을 합쳤다
    expect(Object.keys(Typography)).toEqual([
      'display', 'title', 'section', 'subhead', 'kicker', 'reading', 'body', 'bodyStrong', 'small', 'caption', 'captionStrong', 'label', 'badge',
      'button', 'input', 'table', 'term', 'number', 'yearBig', 'picker', 'pickerOn',
    ]);
    expect(Object.values(Typography).every((t) => t.fontFamily === FontFamily)).toBe(true);
    expect(Typography.display).toMatchObject({ fontSize: 28, lineHeight: 38, fontWeight: '500' });
    expect(Typography.title).toMatchObject({ fontSize: 24, lineHeight: 34, fontWeight: '600' });
    expect(Typography.section).toMatchObject({ fontSize: 20, lineHeight: 28, fontWeight: '600' });
    expect(Typography.subhead).toMatchObject({ fontSize: 17, lineHeight: 24, fontWeight: '600' });
    // 카드 이름표는 15(소유자 2026-11-26 — 꺾쇠 22 옆에서 13 은 작다)
    expect(Typography.kicker).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: '500' });
    // 긴 글은 회색을 오래 읽으니 한 단 크게(안 B 의 17/28)
    expect(Typography.reading).toMatchObject({ fontSize: 17, lineHeight: 28, fontWeight: '400' });
    expect(Typography.body).toMatchObject({ fontSize: 15, lineHeight: 23, fontWeight: '400' });
    expect(Typography.bodyStrong).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: '600' });
    // 작은 본문 14 는 남긴다(안 A — 본문과 보조의 크기 차이)
    expect(Typography.small).toMatchObject({ fontSize: 14, lineHeight: 21, fontWeight: '400' });
    expect(Typography.caption).toMatchObject({ fontSize: 13, lineHeight: 18, fontWeight: '400' });
    expect(Typography.label).toMatchObject({ fontSize: 12, lineHeight: 17, fontWeight: '500' });
    expect(Typography.button).toMatchObject({ fontSize: 16, fontWeight: '600' });
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
    expect(Sizes).toMatchObject({ buttonHeight: 56, inputHeight: 52, maxContentWidth: 480 });
  });
});

// 시안의 word-break: keep-all(결정 044 보드 6-2 문단 · 보드 10 별명): 한국어 낱말 중간에서 줄을 바꾸지 않는다
describe('Txt keepAll', () => {
  it('켜면 iOS 는 hangul-word 줄바꿈(웹은 CSS word-break: keep-all), 끄면 그대로', async () => {
    await render(<Txt keepAll>낱말 단위로 줄을 바꾼다</Txt>);
    expect(screen.getByText('낱말 단위로 줄을 바꾼다').props.lineBreakStrategyIOS).toBe('hangul-word');
    await render(<Txt>보통 글</Txt>);
    expect(screen.getByText('보통 글').props.lineBreakStrategyIOS).toBeUndefined();
  });
});

describe('Button', () => {
  it('글씨를 그리고 누르면 onPress 를 부른다', async () => {
    const onPress = jest.fn();
    await render(<Button label="내 하늘 보기" onPress={onPress} />);
    await fireEvent.press(screen.getByText('내 하늘 보기'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('주·보조·위험 세 가지 바탕을 테마 색으로 그리고, 누를 수 없으면 회색이다', async () => {
    const bg = async (variant: 'primary' | 'line' | 'danger', disabled = false) => {
      const view = await render(<Button label="버튼" variant={variant} disabled={disabled} onPress={() => {}} />);
      const style = StyleSheet.flatten(screen.getByRole('button').props.style);
      await view.unmount();
      return style;
    };
    expect((await bg('primary')).backgroundColor).toBe(Colors.primary);
    expect((await bg('line')).backgroundColor).toBe(Colors.fill);
    // 위험 버튼은 붉은 바탕을 쓰지 않는다 — 검은 바탕 + 붉은 글자(결정 065 의 6)
    expect((await bg('danger')).backgroundColor).toBe(Colors.fill);
    expect((await bg('primary', true)).backgroundColor).toBe(Colors.fill);
    expect((await bg('primary')).borderRadius).toBe(12);
  });

  it('주 버튼의 글씨는 밝은 본문색, 위험 버튼은 붉은 글자다(결정 033 · 065 의 6)', async () => {
    const color = async (variant: 'primary' | 'danger') => {
      const view = await render(<Button label="버튼" variant={variant} onPress={() => {}} />);
      const value = StyleSheet.flatten(screen.getByText('버튼').props.style).color;
      await view.unmount();
      return value;
    };
    expect(await color('primary')).toBe(Colors.ink);
    expect(await color('danger')).toBe(Colors.dangerSoft);
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

  it('시험에서는 닫히는 움직임(220ms)을 기다리지 않고 바로 치운다(jest.setup.js — 부하에서 시간 제한에 걸리지 않게)', async () => {
    const view = await render(
      <Sheet visible onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    await view.rerender(
      <Sheet visible={false} onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    expect(screen.queryByText('시트 내용')).toBeNull();
  });

  it('끄는 영역은 내용을 덮지 않는다 — 제목이 있으면 제목 줄까지, 없으면 내용이 시작하는 위 여백까지(리뷰 2026-11-20)', async () => {
    const top = () => StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style).paddingTop;
    const drag = () => StyleSheet.flatten(screen.getByTestId('sheet-drag').props.style).height;
    const view = await render(
      <Sheet visible onClose={() => {}}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    expect(drag()).toBeLessThanOrEqual(top());
    await view.rerender(
      <Sheet visible onClose={() => {}} title="제목">
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    // 위 여백 36 + 제목 줄 28 + 간격 16 = 내용이 시작하는 80
    expect(drag()).toBeLessThanOrEqual(top() + 28 + 16);
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
    expect(StyleSheet.flatten(screen.getByTestId('sheet-handle').props.style).backgroundColor).toBe(Colors.handle);
  });

  // 소유자 지적: 시트가 좁아 내용이 잘린다 → 내용만큼 늘리고, 화면 위는 남기고, 길면 시트 안에서 굴린다
  it('내용만큼 늘어나고 화면 위 64 는 남긴다 — 넘치면 시트 안에서 굴리고, 들어가면 굴리지 않는다(드럼과 다투지 않게)', async () => {
    await render(
      <Sheet visible onClose={() => {}} gap={12}>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    const panel = StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style);
    expect(panel.maxHeight).toBe(Dimensions.get('window').height - Sizes.sheetTop);
    expect(panel.height).toBeUndefined();
    const scroll = screen.getByTestId('sheet-scroll');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ gap: 12 });
    expect(scroll.props.scrollEnabled).toBe(false);
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 300 } } });
    await fireEvent(scroll, 'contentSizeChange', 350, 600);
    expect(screen.getByTestId('sheet-scroll').props.scrollEnabled).toBe(true);
    await fireEvent(scroll, 'contentSizeChange', 350, 280);
    expect(screen.getByTestId('sheet-scroll').props.scrollEnabled).toBe(false);
  });

  it('높이를 정한 시트(태어난 곳)는 그 높이 그대로 — 안의 목록이 스스로 굴려 감싸지 않는다', async () => {
    await render(
      <Sheet visible onClose={() => {}} height={500} flush>
        <Txt>시트 내용</Txt>
      </Sheet>,
    );
    const panel = StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style);
    expect(panel.height).toBe(500);
    expect(panel.maxHeight).toBeUndefined();
    expect(screen.queryByTestId('sheet-scroll')).toBeNull();
  });

  it('주 버튼(footer)은 굴리는 칸 밖, 시트 맨 아래 같은 자리(결정 061 의 5) — 도움말 시트의 낱말도 따로 높이를 자르지 않는다', async () => {
    await render(<InfoButton title="도움말" items={[{ term: '하우스', text: '삶의 영역' }]} testID="help" />);
    await fireEvent.press(screen.getByTestId('help'));
    const close = screen.getByRole('button', { name: strings.help.close });
    expect(within(screen.getByTestId('sheet-footer')).getByRole('button', { name: strings.help.close })).toBe(close);
    expect(within(screen.getByTestId('sheet-scroll')).queryByRole('button', { name: strings.help.close })).toBeNull();
    expect(within(screen.getByTestId('sheet-scroll')).getByText('하우스')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('info-items').props.style)?.maxHeight).toBeUndefined();
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
      nativeEvent: { contentOffset: { y: (24 + 2) * Sizes.pickerRow } },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
  });

  it('굴리면 멈추기를 기다리지 않고 가운데 줄의 값을 바로 알린다 — 굴린 직후 확인을 눌러도 옛 값이 아니게', async () => {
    jest.useFakeTimers();
    try {
      const onChange = jest.fn();
      await render(<ScrollPicker testID="hour" items={hours} value={3} onChange={onChange} />);
      await fireEvent.scroll(screen.getByTestId('hour-scroll'), { nativeEvent: { contentOffset: { y: 8 * Sizes.pickerRow } } });
      // 멈춘 것으로 보는 시간(120ms)이 지나지 않았다
      expect(onChange).toHaveBeenLastCalledWith(9);
    } finally {
      jest.useRealTimers();
    }
  });

  it('굴리는 동안 값이 바뀌어도 처음 자리(contentOffset)는 그대로 둔다 — 손가락 밑에서 판이 튀지 않게', async () => {
    const view = await render(<ScrollPicker testID="hour" loop items={hours} value={3} onChange={() => {}} />);
    const first = screen.getByTestId('hour-scroll').props.contentOffset;
    await view.rerender(<ScrollPicker testID="hour" loop items={hours} value={9} onChange={() => {}} />);
    expect(screen.getByTestId('hour-scroll').props.contentOffset).toEqual(first);
  });
});

describe('Paragraph', () => {
  it('근거 줄(작은 회색) · 제목 · 본문 순서로 그린다', async () => {
    await render(<Paragraph title="제목" body="본문" basis={['태양', '쌍둥이', '6하우스']} />);
    const basis = screen.getByText('근거 · 태양 · 쌍둥이 · 6하우스');
    expect(StyleSheet.flatten(basis.props.style)).toMatchObject({ ...Typography.label, color: Colors.gray });
    expect(StyleSheet.flatten(screen.getByText('제목').props.style)).toMatchObject(Typography.subhead);
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

describe('입력칸의 커서 · 고르는 칸의 화살표(비교 B4 · B5)', () => {
  it('치는 칸의 커서 · 선택 색은 주색이다', async () => {
    await render(<FieldInput placeholder="칸" />);
    const input = screen.getByPlaceholderText('칸');
    expect(input.props.selectionColor).toBe(Colors.primary);
    expect(input.props.cursorColor).toBe(Colors.primary);
  });

  it('고르는 칸의 화살표는 시트가 열려도 아래를 향한 채다', async () => {
    await render(<FieldSelect testID="sel" placeholder="고르기" open onPress={() => {}} />);
    expect(StyleSheet.flatten(screen.getByTestId('field-select-arrow').props.style)?.transform).toBeUndefined();
    expect(screen.getByTestId('sel').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('제목이 있는 시트는 위 여백 36(손잡이와 제목 사이 22)', async () => {
    await render(
      <Sheet visible title="제목" onClose={() => {}}>
        <Txt>내용</Txt>
      </Sheet>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style).paddingTop).toBe(36);
  });
});

describe('FieldInput: 글자가 칸의 세로 가운데(소유자 지적 — iOS 테스트앱)', () => {
  it('iOS 한 줄 칸의 TextInput 에는 lineHeight 가 없다(숫자 · 한글 · 영문이 위아래로 밀리지 않게), 여러 줄 칸은 줄 간격을 그대로 둔다', async () => {
    const view = await render(<FieldInput value="2000-06-15" onChangeText={() => {}} keyboardType="number-pad" testID="date" />);
    const style = StyleSheet.flatten(screen.getByTestId('date').props.style);
    expect(style.lineHeight).toBeUndefined();
    expect(style.fontSize).toBe(Typography.input.fontSize);
    await view.rerender(<FieldInput value="여러 줄" onChangeText={() => {}} multiline testID="area" />);
    expect(StyleSheet.flatten(screen.getByTestId('area').props.style).lineHeight).toBe(Typography.input.lineHeight);
  });

  it('안드로이드: 글꼴 위아래 여백 없이 세로 가운데, 여러 줄 칸은 위에서부터', async () => {
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      const view = await render(<FieldInput value="새벽별" onChangeText={() => {}} testID="nick" />);
      expect(StyleSheet.flatten(screen.getByTestId('nick').props.style)).toMatchObject({ includeFontPadding: false, textAlignVertical: 'center' });
      await view.rerender(<FieldInput value="여러 줄" onChangeText={() => {}} multiline testID="area" />);
      expect(StyleSheet.flatten(screen.getByTestId('area').props.style)).toMatchObject({ includeFontPadding: false, textAlignVertical: 'top' });
    } finally {
      Platform.OS = original;
    }
  });
});

describe('FieldInput: 여러 줄', () => {
  it('multiline 이면 칸이 여러 줄 높이가 되고 글은 위에서 시작한다', async () => {
    await render(<FieldInput multiline placeholder="길게" />);
    const input = screen.getByPlaceholderText('길게');
    expect(StyleSheet.flatten(input.parent?.props.style)).toMatchObject({ height: Sizes.textArea });
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ textAlignVertical: 'top' });
  });

  it('한 줄 칸의 높이는 입력칸 높이(52, 결정 042 시안)다', async () => {
    await render(<FieldInput placeholder="짧게" />);
    expect(StyleSheet.flatten(screen.getByPlaceholderText('짧게').parent?.props.style)).toMatchObject({
      height: Sizes.inputHeight,
    });
  });
});

describe('브랜드 그림(결정 035)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('로고(BrandMark)는 앱 이름으로 읽히고, 높이에 맞춰 가로가 정해진다', async () => {
    await render(<BrandMark height={20} />);
    const mark = screen.getByLabelText(strings.appName);
    expect(mark.props.accessibilityRole).toBe('image');
    expect(StyleSheet.flatten(mark.props.style)).toMatchObject({ height: 20 });
    expect(StyleSheet.flatten(mark.props.style).width).toBeGreaterThan(30);
  });

  it.each(['think', 'empty', 'error'] as const)('별이 "%s" 는 그 표정을 그린다', async (state) => {
    await render(<Byeoli state={state} size={120} />);
    // 별이는 화면 읽기에서 숨긴 장식이라 숨긴 것까지 찾는다
    const hidden = { includeHiddenElements: true };
    expect(screen.getByTestId(`byeoli-face-${state}`, hidden)).toBeTruthy();
    for (const other of ['think', 'empty', 'error'].filter((s) => s !== state))
      expect(screen.queryByTestId(`byeoli-face-${other}`, hidden)).toBeNull();
  });

  it('별이는 장식이라 화면 읽기에서 숨는다(상태는 옆의 제목 글이 말한다)', async () => {
    await render(<Byeoli state="empty" size={120} />);
    const byeoli = screen.getByTestId('byeoli', { includeHiddenElements: true });
    expect(byeoli.props['aria-hidden']).toBe(true);
    expect(byeoli.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('동작 줄이기가 꺼져 있으면 생각 중 별이가 돌고, 화면에서 사라지면 멈춘다', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const view = await render(<Byeoli state="think" size={120} />);
    await waitFor(() => expect(loop).toHaveBeenCalledTimes(1));
    const stop = jest.spyOn(loop.mock.results[0].value, 'stop');
    await view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('동작 줄이기가 켜져 있으면 처음부터 움직이지 않고, 도는 중에 켜면 멈춘다', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    let changed: (on: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (on: boolean) => void) => {
      changed = handler;
      return { remove: jest.fn() };
    }) as never);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const still = await render(<Byeoli state="think" size={120} />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await act(async () => {});
    expect(loop).not.toHaveBeenCalled();
    await still.unmount();

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<Byeoli state="think" size={120} />);
    await waitFor(() => expect(loop).toHaveBeenCalledTimes(1));
    const stop = jest.spyOn(loop.mock.results[0].value, 'stop');
    await act(async () => changed(true));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it.each(['star', 'flame', 'heart', 'moon'] as const)('빛나는 모양 "%s" 를 그린다', async (shape) => {
    await render(<GlowShape shape={shape} size={64} />);
    const glow = screen.getByTestId(`glow-${shape}`, { includeHiddenElements: true });
    expect(glow.props['aria-hidden']).toBe(true);
  });
});

describe('StatusView', () => {
  it('별이 · 제목 · 설명 · 버튼을 가운데에 놓는다. 생각 중의 제목은 문단 제목 단계다', async () => {
    const onPress = jest.fn();
    await render(
      <StatusView state="think" title="짓는 중" note="1분쯤 걸려요">
        <Button label="다시 시도" onPress={onPress} />
      </StatusView>,
    );
    expect(screen.getByTestId('byeoli-face-think', { includeHiddenElements: true })).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('짓는 중').props.style)).toMatchObject({ ...Typography.subhead, textAlign: 'center' });
    expect(screen.getByText('1분쯤 걸려요')).toBeTruthy();
    await fireEvent.press(screen.getByText('다시 시도'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('실패 · 빈 화면의 제목은 본문 단계다', async () => {
    await render(<StatusView state="error" title="불러오지 못했어요" />);
    expect(screen.getByTestId('byeoli-face-error', { includeHiddenElements: true })).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('불러오지 못했어요').props.style)).toMatchObject(Typography.body);
  });
});
