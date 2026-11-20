import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { skyDetail } from '@/features/chart/chart-rows';
import { SkySheet } from '@/features/chart/sky-sheet';
import type { Chart } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const G = strings.glossary;
const S = strings.skyMap;
const signFull = (sign: keyof typeof strings.signs) => strings.signs[sign] + strings.chart.signSuffix;

describe('skyDetail: 별을 눌렀을 때 시트에 적는 것(시안 13-1)', () => {
  it('토성: 이름 · "짧은 주제 · 한 줄 뜻" · 별자리와 하우스(서버 값)의 뜻과 팁 · 토성이 낀 각도를 서버 순서대로', () => {
    // 토성: 황소자리 · 4하우스. 각도: 목성과 합(a=JUPITER), 천왕성과 사분
    expect(skyDetail(fixtures.chart, 'SATURN')).toEqual({
      key: 'SATURN',
      title: G.bodies.SATURN.name,
      subtitle: `${G.bodies.SATURN.topic}${S.separator}${G.bodies.SATURN.meaning}`,
      sign: { name: signFull('TAURUS'), meaning: G.signs.TAURUS.meaning, tip: `${S.signTipPrefix}둘째${S.signTipSuffix}` },
      house: { name: `4${S.houseSuffix}`, meaning: G.houses[4].meaning, tip: `${S.houseTipPrefix}넷째${S.houseTipSuffix}` },
      relations: [
        { key: 'JUPITER', name: G.bodies.JUPITER.name, topic: G.bodies.JUPITER.topic, phrase: G.aspects.CONJUNCTION.phrase, aspect: strings.aspects.CONJUNCTION },
        { key: 'URANUS', name: G.bodies.URANUS.name, topic: G.bodies.URANUS.topic, phrase: G.aspects.SQUARE.phrase, aspect: strings.aspects.SQUARE },
      ],
    });
  });

  it('상승점: 첫인상의 자리 · "상승점 · 뜻" · 별자리 · 1하우스, 시각 "모름" 이면 없다', () => {
    const asc = skyDetail(fixtures.chart, 'ASC')!;
    expect(asc).toMatchObject({
      title: G.angles.ASC.nickname,
      subtitle: `${G.angles.ASC.name}${S.separator}${G.angles.ASC.meaning}`,
      sign: { name: signFull('CAPRICORN') },
      house: { name: `1${S.houseSuffix}` },
      // 서버는 상승점 · 중천의 각도를 내지 않는다: "없어요" 라고 단정하지 않게 관계 칸을 뺀다
      relations: null,
    });
    expect(skyDetail(fixtures.chart, 'MC')!.relations).toBeNull();
    // 서버가 상승점이 낀 각도를 내면 그대로 보여 준다
    const withAsc: Chart = { ...fixtures.chart, aspects: [{ a: 'SUN', b: 'ASC', type: 'TRINE', orb: 1, applying: true }] };
    expect(skyDetail(withAsc, 'ASC')!.relations!.map((r) => [r.key, r.phrase])).toEqual([['SUN', G.aspects.TRINE.phrase]]);
    expect(skyDetail(fixtures.chart, 'MC')).toMatchObject({ house: { name: `10${S.houseSuffix}` } });
    expect(skyDetail(fixtures.chartTimeUnknown, 'ASC')).toBeNull();
    expect(skyDetail({ ...fixtures.chart, timeKnown: false }, 'MC')).toBeNull();
  });

  it('시각 "모름" 이면 하우스 줄이 없다(서버가 실수로 실어 보내도)', () => {
    expect(skyDetail(fixtures.chartTimeUnknown, 'SUN')!.house).toBeNull();
    expect(skyDetail({ ...fixtures.chart, timeKnown: false }, 'SUN')!.house).toBeNull();
  });

  it('관계에는 용어 사전의 별만 넣는다: 추가 지점과 시각 "모름" 의 상승점 · 중천은 뺀다', () => {
    const chart: Chart = {
      ...fixtures.chart,
      aspects: [
        { a: 'SUN', b: 'NORTH_NODE', type: 'TRINE', orb: 1, applying: true },
        { a: 'ASC', b: 'SUN', type: 'OPPOSITION', orb: 2, applying: false },
        { a: 'SUN', b: 'MOON', type: 'OPPOSITION', orb: 3, applying: false },
      ],
    };
    expect(skyDetail(chart, 'SUN')!.relations!.map((r) => [r.key, r.phrase])).toEqual([
      ['ASC', G.aspects.OPPOSITION.phrase],
      ['MOON', G.aspects.OPPOSITION.phrase],
    ]);
    expect(skyDetail(chart, 'SUN')!.relations![0].name).toBe(G.angles.ASC.nickname);
    expect(skyDetail({ ...chart, timeKnown: false }, 'SUN')!.relations!.map((r) => r.key)).toEqual(['MOON']);
  });

  it('사전에 없는 식별자는 없다', () => {
    expect(skyDetail(fixtures.chart, 'NORTH_NODE')).toBeNull();
  });
});

describe('SkySheet: 별을 누르면 올라오는 시트(시안 13-1 · 13-2)', () => {
  const sheetClosed = () => waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());

  it('해: 이름 · 별명과 뜻 · 별자리 · 하우스 · 다른 별과의 관계(각도의 말)', async () => {
    await render(<SkySheet chart={fixtures.chart} selected="SUN" visible onClose={jest.fn()} />);
    expect(screen.getByText(G.bodies.SUN.name)).toBeTruthy();
    expect(screen.getByText(`${G.bodies.SUN.topic}${S.separator}${G.bodies.SUN.meaning}`)).toBeTruthy();
    expect(screen.getByText(signFull('GEMINI'))).toBeTruthy();
    expect(screen.getByText(G.signs.GEMINI.meaning)).toBeTruthy();
    expect(screen.getByText(`6${S.houseSuffix}`)).toBeTruthy();
    expect(screen.getByText(G.houses[6].meaning)).toBeTruthy();
    expect(screen.getByText(S.relations)).toBeTruthy();
    // 해: 금성 합 · 화성 합 · 천왕성 삼분(서버 순서)
    expect(screen.getAllByTestId('sky-relation')).toHaveLength(3);
    expect(screen.getAllByText(G.aspects.CONJUNCTION.phrase)).toHaveLength(2);
    expect(screen.getByText(G.aspects.TRINE.phrase)).toBeTruthy();
    expect(screen.getByText(G.bodies.URANUS.topic)).toBeTruthy();
  });

  it('물음표를 누르면 말풍선이 뜨고, 한 번에 하나만 열린다. 다시 누르면 닫힌다', async () => {
    await render(<SkySheet chart={fixtures.chart} selected="SUN" visible onClose={jest.fn()} />);
    expect(screen.queryByText(S.relationsTip)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: S.relationsQuestion }));
    expect(screen.getByText(S.relationsTip)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${signFull('GEMINI')}${S.questionSuffix}` }));
    expect(screen.getByText(`${S.signTipPrefix}셋째${S.signTipSuffix}`)).toBeTruthy();
    expect(screen.queryByText(S.relationsTip)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: strings.help.tipClose }));
    expect(screen.queryByText(`${S.signTipPrefix}셋째${S.signTipSuffix}`)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: `6${S.houseSuffix}${S.questionSuffix}` }));
    expect(screen.getByText(`${S.houseTipPrefix}여섯째${S.houseTipSuffix}`)).toBeTruthy();
  });

  it('시각 "모름" 이면 하우스 줄과 그 물음표가 없다', async () => {
    await render(<SkySheet chart={fixtures.chartTimeUnknown} selected="SUN" visible onClose={jest.fn()} />);
    expect(screen.getByText(G.bodies.SUN.name)).toBeTruthy();
    expect(screen.queryByText(new RegExp(`\\d${S.houseSuffix}$`))).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(`${S.houseSuffix}${S.questionSuffix}`) })).toBeNull();
  });

  it('다른 별과 이루는 각도가 없으면 그렇다고 적는다', async () => {
    await render(<SkySheet chart={{ ...fixtures.chart, aspects: [] }} selected="SUN" visible onClose={jest.fn()} />);
    expect(screen.getByText(S.noRelations)).toBeTruthy();
    expect(screen.queryAllByTestId('sky-relation')).toHaveLength(0);
  });

  it('첫인상의 자리 시트에는 관계 칸이 없다(서버가 상승점의 각도를 내지 않는다)', async () => {
    await render(<SkySheet chart={fixtures.chart} selected="ASC" visible onClose={jest.fn()} />);
    expect(screen.getByText(G.angles.ASC.nickname)).toBeTruthy();
    expect(screen.queryByText(S.relations)).toBeNull();
    expect(screen.queryByText(S.noRelations)).toBeNull();
  });

  it('별자리 물음표의 말풍선은 시트 위 끝에 막히지 않게 아래로 뜬다. 하우스 · 관계는 위로', async () => {
    await render(<SkySheet chart={fixtures.chart} selected="SUN" visible onClose={jest.fn()} />);
    const placement = (id: string) => StyleSheet.flatten(screen.getByTestId(`${id}-bubble`).props.style);
    await fireEvent.press(screen.getByTestId('tip-sign'));
    expect(placement('tip-sign')).toMatchObject({ top: '100%' });
    await fireEvent.press(screen.getByTestId('tip-house'));
    expect(placement('tip-house')).toMatchObject({ bottom: '100%' });
    await fireEvent.press(screen.getByTestId('tip-relations'));
    expect(placement('tip-relations')).toMatchObject({ bottom: '100%' });
  });

  it('시트를 닫으면 열린 말풍선도 닫혀, 다시 열 때 말풍선 없이 뜬다', async () => {
    const onClose = jest.fn();
    const view = await render(<SkySheet chart={fixtures.chart} selected="SUN" visible onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('tip-relations'));
    expect(screen.getByText(S.relationsTip)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await view.rerender(<SkySheet chart={fixtures.chart} selected="SUN" visible={false} onClose={onClose} />);
    await sheetClosed();
    await view.rerender(<SkySheet chart={fixtures.chart} selected="MOON" visible onClose={onClose} />);
    expect(await screen.findByText(G.bodies.MOON.name)).toBeTruthy();
    expect(screen.queryByText(S.relationsTip)).toBeNull();
  });

  it('바깥을 누르면 닫으라고 알린다', async () => {
    const onClose = jest.fn();
    const view = await render(<SkySheet chart={fixtures.chart} selected="SUN" visible onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.rerender(<SkySheet chart={fixtures.chart} selected="SUN" visible={false} onClose={onClose} />);
    await sheetClosed();
  });
});
