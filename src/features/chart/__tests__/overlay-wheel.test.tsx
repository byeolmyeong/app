import { render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { OverlayWheel } from '@/features/chart/overlay-wheel';
import type { SynastryOverlay } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const overlay = fixtures.synastry.overlay as SynastryOverlay;

describe('OverlayWheel: 두 사람을 한 고리에 겹친 그림', () => {
  it('내 점 10개와 상대 점 10개를 서로 다른 모양으로 그린다: 나는 채운 점, 상대는 빈 점', async () => {
    await render(<OverlayWheel overlay={overlay} name="지우" />);
    const mine = screen.getAllByTestId('overlay-mine-dot');
    const theirs = screen.getAllByTestId('overlay-theirs-dot');
    expect(mine).toHaveLength(10);
    expect(theirs).toHaveLength(10);
    // 색 값은 그림 부품이 숫자로 바꿔 들고 있다: 먹색(ink)과 바탕색(paper)
    const argb = (hex: string) => ({ type: 0, payload: parseInt(`ff${hex.slice(1)}`, 16) });
    for (const dot of mine) expect(dot.props.fill).toEqual(argb(Colors.ink));
    for (const dot of theirs) expect(dot.props.fill).toEqual(argb(Colors.paper));
  });

  it('서버가 준 선을 긋고(합은 긋지 않는다), 긴장하는 각도는 점선이다', async () => {
    await render(<OverlayWheel overlay={overlay} name="지우" />);
    const lines = screen.getAllByTestId('overlay-line');
    expect(lines).toHaveLength(overlay.lines.filter((l) => l.type !== 'CONJUNCTION').length);
    expect(lines.filter((l) => l.props.strokeDasharray).length).toBe(
      overlay.lines.filter((l) => ['SQUARE', 'OPPOSITION'].includes(l.type)).length,
    );
  });

  it('그림 아래에 어느 점이 누구인지 적는다: 나 · 상대의 이름', async () => {
    await render(<OverlayWheel overlay={overlay} name="지우" />);
    expect(screen.getByText(strings.synastry.overlay.mine)).toBeTruthy();
    expect(screen.getByText('지우')).toBeTruthy();
    expect(screen.getByLabelText(strings.synastry.overlay.wheelLabel)).toBeTruthy();
  });

  it('내 상승점이 없으면 상승점 선을 그리지 않는다', async () => {
    const view = await render(<OverlayWheel overlay={overlay} name="지우" />);
    expect(screen.getAllByTestId('overlay-asc-line')).toHaveLength(1);
    await view.unmount();
    await render(<OverlayWheel overlay={{ ...overlay, mineAsc: undefined }} name="지우" />);
    expect(screen.queryByTestId('overlay-asc-line')).toBeNull();
  });
});
