import { CONSTELLATIONS } from '@/features/chart/constellations';
import { SIGN_ORDER } from '@/features/chart/wheel-layout';

describe('별자리 모양', () => {
  it('열두 별자리가 모두 있고, 별은 그림 칸(0~100) 안에 있으며, 선은 있는 별끼리만 잇는다', () => {
    for (const sign of SIGN_ORDER) {
      const c = CONSTELLATIONS[sign];
      expect(c.stars.length).toBeGreaterThanOrEqual(4);
      for (const s of c.stars) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(100);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(100);
      }
      for (const [a, b] of c.lines) {
        expect(c.stars[a]).toBeDefined();
        expect(c.stars[b]).toBeDefined();
        expect(a).not.toBe(b);
      }
      // 어느 별도 혼자 떨어져 있지 않다
      const linked = new Set(c.lines.flat());
      expect(linked.size).toBe(c.stars.length);
    }
  });
});
