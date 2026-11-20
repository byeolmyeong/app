import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { strings } from '@/content/strings';
import { ReasonLine } from '@/features/reason/reason-line';
import type { Reason } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const R = strings.reason;
const G = strings.glossary;
const S = strings.skyMap;
const sun: Reason = { when: 'BIRTH', items: [{ kind: 'PLACEMENT', body: 'SUN', sign: 'GEMINI', house: 6 }] };
const TEXT = '태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리, 일상의 자리(6하우스)에 있었어요';

beforeEach(() => jest.clearAllMocks());

describe('ReasonLine: 접힌 이유 줄 → 그 자리에서 펼침(보드 12 · 12-1~12-3, 결정 054 의 4)', () => {
  it('접혀 있으면 "이렇게 풀이한 이유" 와 한 문장만 보이고, 화면 읽기는 펼칠 수 있는 단추로 읽는다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    expect(screen.getByText(R.label)).toBeTruthy();
    expect(screen.getByText(TEXT)).toBeTruthy();
    const toggle = screen.getByRole('button', { name: `${R.label}, ${TEXT}` });
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
    expect(screen.queryByText(R.seeOnMap)).toBeNull();
  });

  it('누르면 펼쳐진다: 작은 지도(그 별 · 칸만 빛남) · 용어 줄 셋 · "하늘 지도에서 보기". 다시 누르면 접힌다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    expect(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }).props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('reason-wheel')).toBeTruthy();
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(1);
    expect(screen.getAllByTestId('mini-wheel-sector')).toHaveLength(1);
    // 용어 줄: 나의 중심 · 해 / 호기심 · 쌍둥이자리 / 일상의 자리 · 6하우스 — 별명 아래 한 줄 뜻
    expect(screen.getAllByTestId('reason-term')).toHaveLength(3);
    expect(screen.getByText(G.bodies.SUN.meaning)).toBeTruthy();
    expect(screen.getByText(G.signs.GEMINI.meaning)).toBeTruthy();
    expect(screen.getByText(G.houses[6].meaning)).toBeTruthy();
    expect(screen.getByText(R.seeOnMap)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
  });

  it('물음표는 말풍선이고 한 번에 하나만 열린다(12-2 해 · 12-3 하우스 — 하늘 지도의 팁과 같은 글)', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${G.bodies.SUN.name}${S.questionSuffix}` }));
    expect(screen.getByText(G.bodies.SUN.tip)).toBeTruthy();
    expect(screen.getByText(`${G.bodies.SUN.name} (${strings.bodies.SUN})`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `6${S.houseSuffix}${S.questionSuffix}` }));
    expect(screen.queryByText(G.bodies.SUN.tip)).toBeNull();
    expect(screen.getByText(`${S.houseTipPrefix}${S.ordinals[5]}${S.houseTipSuffix}`)).toBeTruthy();
    // 다시 누르면 닫힌다
    await fireEvent.press(screen.getByRole('button', { name: strings.help.tipClose }));
    expect(screen.queryByText(`${S.houseTipPrefix}${S.ordinals[5]}${S.houseTipSuffix}`)).toBeNull();
  });

  it('"하늘 지도에서 보기" 는 그 별을 고른 채로 내 하늘 지도를 연다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${TEXT}` }));
    await fireEvent.press(screen.getByText(R.seeOnMap));
    expect(router.push).toHaveBeenCalledWith('/chart?selected=SUN');
  });

  it('하우스 모임은 그 칸과 별들이 빛나고, 각도는 두 별이 빛난다', async () => {
    const cluster: Reason = { when: 'BIRTH', items: [{ kind: 'CLUSTER', house: 6, bodies: ['SUN', 'VENUS', 'MARS'] }] };
    const view = await render(<ReasonLine reason={cluster} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(3);
    expect(screen.getAllByTestId('mini-wheel-sector')).toHaveLength(1);
    await view.unmount();
    const aspect: Reason = { when: 'BIRTH', items: [{ kind: 'ASPECT', a: 'URANUS', b: 'SATURN', type: 'SQUARE' }] };
    await render(<ReasonLine reason={aspect} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(2);
    expect(screen.queryAllByTestId('mini-wheel-sector')).toHaveLength(0);
    expect(screen.getByText(G.aspects.SQUARE.meaning)).toBeTruthy();
  });

  it('시각 "모름" 차트에서는 하우스 부분 · 하우스 칸이 없다', async () => {
    await render(<ReasonLine reason={sun} chart={fixtures.chartTimeUnknown} />);
    const text = '태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리에 있었어요';
    await fireEvent.press(screen.getByRole('button', { name: `${R.label}, ${text}` }));
    expect(screen.queryAllByTestId('mini-wheel-sector')).toHaveLength(0);
    expect(screen.queryAllByTestId('mini-wheel-house-line')).toHaveLength(0);
    expect(screen.getAllByTestId('reason-term')).toHaveLength(2);
    expect(screen.queryByText(G.houses[6].meaning)).toBeNull();
  });

  it('시각 "모름" 이면 문장에서 빠진 근거(상승점 · 중천 · 하우스 모임)는 용어 줄 · 작은 지도에도 없다(리뷰)', async () => {
    const mixed: Reason = {
      when: 'BIRTH',
      items: [
        { kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' },
        { kind: 'PLACEMENT', body: 'MOON', sign: 'SAGITTARIUS', house: 11 },
      ],
    };
    await render(<ReasonLine reason={mixed} chart={fixtures.chartTimeUnknown} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.queryByText(G.signs.LIBRA.meaning)).toBeNull();
    expect(screen.queryByText(G.angles.ASC.meaning)).toBeNull();
    expect(screen.getAllByTestId('reason-term')).toHaveLength(2);
    expect(screen.getAllByTestId('mini-wheel-dot')).toHaveLength(1);
  });

  it('지나가는 별(TRANSIT)의 펼침에는 작은 지도와 하늘 지도 보기가 없다(태어난 하늘이 아니다)', async () => {
    const transit: Reason = { when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'SATURN', target: 'SUN', type: 'SQUARE' }] };
    await render(<ReasonLine reason={transit} chart={fixtures.chart} />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${R.label}`) }));
    expect(screen.queryByTestId('reason-wheel')).toBeNull();
    expect(screen.queryByText(R.seeOnMap)).toBeNull();
    expect(screen.getAllByTestId('reason-term')).toHaveLength(3);
  });

  it('문장을 만들 수 없는 근거(모르는 kind)면 아무것도 그리지 않는다', async () => {
    const view = await render(<ReasonLine reason={{ when: 'BIRTH', items: [{ kind: 'MIDPOINT' }] }} chart={fixtures.chart} />);
    expect(view.toJSON()).toBeNull();
  });
});
