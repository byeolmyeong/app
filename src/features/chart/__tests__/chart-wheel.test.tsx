import { render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ChartWheel } from '@/features/chart/ChartWheel';
import { fixtures } from '@/lib/fixtures';

/** 그림 부품은 색을 숫자로 바꿔 들고 있다 */
const argb = (hex: string) => ({ type: 0, payload: parseInt(`ff${hex.slice(1)}`, 16) });

describe('ChartWheel: 내 하늘 지도의 휠(시안 13)', () => {
  it('별 점 10개와 하우스 선 12개 · 번호 12개 · 축 2개를 그리고, 각도 선은 긋지 않는다', async () => {
    await render(<ChartWheel chart={fixtures.chart} selected={null} />);
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(10);
    expect(screen.getAllByTestId('wheel-house-line')).toHaveLength(12);
    expect(screen.getAllByTestId(/^wheel-house-number-/)).toHaveLength(12);
    expect(screen.getAllByTestId('wheel-axis')).toHaveLength(2);
    expect(screen.getByTestId('wheel-axis-label-ASC')).toBeTruthy();
    expect(screen.getByTestId('wheel-axis-label-MC')).toBeTruthy();
    expect(screen.queryAllByTestId('wheel-aspect-line')).toHaveLength(0);
    // 고른 별이 없으면 빛나는 점도 칠한 칸도 없다
    expect(screen.queryByTestId('wheel-selected-dot')).toBeNull();
    expect(screen.queryByTestId('wheel-house-sector')).toBeNull();
  });

  it('고른 별은 주색으로 빛나고, 그 별이 있던 별자리 이름 · 하우스 번호가 밝아지며 그 하우스 칸이 칠해진다', async () => {
    // 태양: 쌍둥이자리 · 6하우스(서버 값)
    await render(<ChartWheel chart={fixtures.chart} selected="SUN" />);
    expect(screen.getByTestId('wheel-selected-dot').props.fill).toEqual(argb(Colors.primary));
    expect(screen.getByTestId('wheel-selected-halo').props.fill).toEqual(argb(Colors.primary));
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(9);
    expect(screen.getByTestId('wheel-sign-GEMINI').props.fill).toEqual(argb(Colors.accentText));
    expect(screen.getByTestId('wheel-sign-TAURUS').props.fill).toEqual(argb(Colors.hint));
    expect(screen.getByTestId('wheel-house-number-6').props.fill).toEqual(argb(Colors.accentText));
    expect(screen.getByTestId('wheel-house-number-5').props.fill).toEqual(argb(Colors.muted));
    const sector = screen.getByTestId('wheel-house-sector');
    expect(sector.props.fill).toEqual(argb(Colors.primary));
    expect(screen.getAllByTestId('wheel-house-sector')).toHaveLength(1);
    // 고른 별의 이름은 크고 밝게, 나머지는 회색
    expect(screen.getByTestId('wheel-body-label-SUN').props.fill).toEqual(argb(Colors.ink));
    expect(screen.getByTestId('wheel-body-label-MOON').props.fill).toEqual(argb(Colors.gray));
  });

  it('상승점을 고르면 첫인상의 축 이름과 1하우스 칸이 밝아진다', async () => {
    await render(<ChartWheel chart={fixtures.chart} selected="ASC" />);
    expect(screen.getByTestId('wheel-axis-label-ASC').props.fill).toEqual(argb(Colors.accentText));
    expect(screen.getByTestId('wheel-axis-label-MC').props.fill).toEqual(argb(Colors.hint));
    expect(screen.getByTestId('wheel-house-number-1').props.fill).toEqual(argb(Colors.accentText));
    expect(screen.getByTestId('wheel-sign-CAPRICORN').props.fill).toEqual(argb(Colors.accentText));
    expect(screen.queryByTestId('wheel-selected-dot')).toBeNull();
  });

  it('시각 "모름" 이면 하우스 선 · 번호 · 칸과 첫인상 · 꿈의 축이 없고, 고른 별과 그 별자리만 밝아진다', async () => {
    await render(<ChartWheel chart={fixtures.chartTimeUnknown} selected="SUN" />);
    expect(screen.queryAllByTestId('wheel-house-line')).toHaveLength(0);
    expect(screen.queryAllByTestId(/^wheel-house-number-/)).toHaveLength(0);
    expect(screen.queryAllByTestId('wheel-axis')).toHaveLength(0);
    expect(screen.queryByTestId('wheel-house-sector')).toBeNull();
    expect(screen.queryByTestId('wheel-axis-label-ASC')).toBeNull();
    expect(screen.getByTestId('wheel-selected-dot')).toBeTruthy();
    const sun = fixtures.chartTimeUnknown.positions.find((p) => p.body === 'SUN')!;
    expect(screen.getByTestId(`wheel-sign-${sun.sign}`).props.fill).toEqual(argb(Colors.accentText));
  });

  it('서버가 실수로 하우스를 실어 보내도 timeKnown 이 false 면 하우스 칸을 칠하지 않는다', async () => {
    await render(<ChartWheel chart={{ ...fixtures.chart, timeKnown: false }} selected="SUN" />);
    expect(screen.queryByTestId('wheel-house-sector')).toBeNull();
    expect(screen.queryAllByTestId(/^wheel-house-number-/)).toHaveLength(0);
  });

  it('읽기 이름에 고른 별을 적는다', async () => {
    await render(<ChartWheel chart={fixtures.chart} selected="SUN" />);
    const S = strings.skyMap;
    expect(
      screen.getByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${strings.glossary.bodies.SUN.name}`),
    ).toBeTruthy();
  });
});
