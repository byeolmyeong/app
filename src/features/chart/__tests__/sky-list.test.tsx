import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { skyRows } from '@/features/chart/chart-rows';
import { SkyList } from '@/features/chart/sky-list';
import { fixtures } from '@/lib/fixtures';

const G = strings.glossary;
const S = strings.skyMap;
const signFull = (sign: keyof typeof strings.signs) => strings.signs[sign] + strings.chart.signSuffix;

describe('skyRows: "별마다 있던 자리" 의 줄', () => {
  it('시각을 알면 별 10 + 첫인상의 자리 + 꿈의 자리, 줄마다 별자리와 "N하우스 · 주제"(서버 값)', () => {
    const rows = skyRows(fixtures.chart);
    expect(rows.map((r) => r.key)).toEqual([...fixtures.chart.positions.map((p) => p.body), 'ASC', 'MC']);
    // 태양: 쌍둥이자리 · 6하우스
    expect(rows[0]).toEqual({
      key: 'SUN',
      title: G.bodies.SUN.name,
      subtitle: G.bodies.SUN.topic,
      sign: signFull('GEMINI'),
      place: `6${S.houseSuffix}${S.separator}${G.houses[6].topic}`,
      angle: false,
    });
    expect(rows[10]).toEqual({
      key: 'ASC',
      title: G.angles.ASC.nickname,
      subtitle: G.angles.ASC.name,
      sign: signFull('CAPRICORN'),
      place: `1${S.houseStartSuffix}`,
      angle: true,
    });
    expect(rows[11]).toMatchObject({ key: 'MC', title: G.angles.MC.nickname, sign: signFull('SCORPIO'), place: `10${S.houseStartSuffix}` });
  });

  it('시각 "모름" 이면 별 10 줄만, 하우스 칸은 비운다', () => {
    const rows = skyRows(fixtures.chartTimeUnknown);
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.place === null && !r.angle)).toBe(true);
  });

  it('서버가 실수로 하우스를 실어 보내도 timeKnown 이 false 면 하우스 칸과 상승점 · 중천 줄이 없다', () => {
    const rows = skyRows({ ...fixtures.chart, timeKnown: false });
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.place === null)).toBe(true);
  });
});

describe('SkyList: "별마다 있던 자리" 목록(시안 13)', () => {
  it('제목과 12줄을 그리고, 고른 줄은 고른 상태다', async () => {
    await render(<SkyList chart={fixtures.chart} selected="SUN" onSelect={jest.fn()} />);
    expect(screen.getByText(S.listHeading)).toBeTruthy();
    expect(screen.getAllByTestId(/^sky-row-/)).toHaveLength(12);
    expect(screen.getByTestId('sky-row-SUN').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('sky-row-MOON').props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByText(G.bodies.SATURN.topic)).toBeTruthy();
    expect(screen.getByText(G.angles.MC.nickname)).toBeTruthy();
    expect(screen.getByText(`10${S.houseStartSuffix}`)).toBeTruthy();
    // 고른 줄의 점만 빛난다
    expect(screen.getAllByTestId('sky-dot-glow')).toHaveLength(1);
  });

  it('줄을 누르면 그 별의 식별자를 알린다', async () => {
    const onSelect = jest.fn();
    await render(<SkyList chart={fixtures.chart} selected="SUN" onSelect={onSelect} />);
    await fireEvent.press(screen.getByTestId('sky-row-SATURN'));
    expect(onSelect).toHaveBeenCalledWith('SATURN');
    await fireEvent.press(screen.getByTestId('sky-row-ASC'));
    expect(onSelect).toHaveBeenLastCalledWith('ASC');
  });

  it('시각 "모름" 이면 10줄이고 하우스 글과 첫인상 · 꿈의 자리가 없다', async () => {
    await render(<SkyList chart={fixtures.chartTimeUnknown} selected={null} onSelect={jest.fn()} />);
    expect(screen.getAllByTestId(/^sky-row-/)).toHaveLength(10);
    expect(screen.queryByText(new RegExp(S.houseSuffix))).toBeNull();
    expect(screen.queryByText(G.angles.ASC.nickname)).toBeNull();
    expect(screen.queryAllByTestId('sky-dot-glow')).toHaveLength(0);
  });
});
