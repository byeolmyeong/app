import { render, screen } from '@testing-library/react-native';

import { CardConstellation } from '@/components/card-constellation';
import { NicknameCardLayout } from '@/constants/theme';

const L = NicknameCardLayout.art;
const art = { sign: 'GEMINI', stars: [{ x: 0, y: 0, bright: true }, { x: 100, y: 100 }], lines: [[0, 1]] as const };
const hidden = { includeHiddenElements: true };

describe('CardConstellation', () => {
  it('꺾쇠 칸을 받으면 그 둘레(꺾쇠 바깥 art.clear)를 그림에서 비운다 — 카드 좌표의 꺾쇠 가운데가 빈 원의 가운데(결정 080)', async () => {
    const clear = { top: 20, right: 20, size: 22 };
    await render(<CardConstellation art={art} clear={clear} />);
    const hole = screen.getByTestId('card-constellation-clear', hidden);
    // 그림 칸은 카드 오른쪽 위에서 right · top 만큼 떨어져 있고, viewBox 는 view.w × view.h 로 늘린다
    const sx = L.view.w / L.width;
    const sy = L.view.h / L.height;
    expect(hole.props.cx).toBeCloseTo((L.width + L.right - clear.right - clear.size / 2) * sx);
    expect(hole.props.cy).toBeCloseTo((clear.top + clear.size / 2 - L.top) * sy);
    expect(hole.props.r).toBeCloseTo((clear.size / 2 + L.clear) * sx);
  });

  it('꺾쇠 칸이 없으면 비우지 않는다', async () => {
    await render(<CardConstellation art={art} />);
    expect(screen.getByTestId('card-constellation-GEMINI', hidden)).toBeTruthy();
    expect(screen.queryByTestId('card-constellation-clear', hidden)).toBeNull();
  });
});
