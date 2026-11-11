/**
 * 열두 별자리의 별 모양(별과 별을 잇는 선). 그림을 그리기 위한 좌표일 뿐 계산에 쓰지 않는다.
 * 좌표는 0~100 칸 안의 자리이고, 하늘에서 보이는 모양을 손으로 옮긴 근사값이다(실측 좌표가 아니다).
 * `bright` 는 그 별자리에서 가장 밝은 별이다.
 */
export type Star = { x: number; y: number; bright?: boolean };
export type Constellation = { stars: Star[]; lines: [number, number][] };

const s = (x: number, y: number, bright?: boolean): Star => (bright ? { x, y, bright } : { x, y });
/** 별 번호를 차례로 잇는다: chain(0,1,2) → [0,1],[1,2] */
const chain = (...ids: number[]): [number, number][] => ids.slice(1).map((id, i) => [ids[i], id]);

export const CONSTELLATIONS: Record<string, Constellation> = {
  ARIES: {
    stars: [s(10, 38), s(55, 34, true), s(78, 50), s(86, 64)],
    lines: chain(0, 1, 2, 3),
  },
  TAURUS: {
    stars: [s(10, 46), s(46, 58, true), s(60, 63), s(52, 48), s(14, 18), s(76, 73), s(94, 82)],
    lines: [...chain(0, 1, 2, 3, 4), ...chain(2, 5, 6)],
  },
  GEMINI: {
    stars: [s(24, 10, true), s(10, 24, true), s(36, 24), s(52, 34), s(72, 44), s(86, 46), s(36, 48), s(56, 62), s(76, 74)],
    lines: [[0, 1], ...chain(0, 2, 3, 4, 5), ...chain(1, 6, 7, 8)],
  },
  CANCER: {
    stars: [s(50, 6), s(50, 40), s(53, 54, true), s(74, 92), s(20, 86)],
    lines: [...chain(0, 1, 2, 3), [2, 4]],
  },
  LEO: {
    stars: [s(90, 28), s(80, 18), s(68, 26), s(62, 42), s(70, 54), s(73, 72, true), s(30, 64), s(8, 70), s(30, 46)],
    lines: [...chain(0, 1, 2, 3, 4, 5, 6, 7, 8, 3), [8, 6]],
  },
  VIRGO: {
    stars: [s(86, 44), s(66, 47), s(50, 50), s(36, 40), s(24, 20), s(28, 60), s(46, 78, true), s(10, 64), s(34, 96)],
    lines: [...chain(0, 1, 2, 3, 4), ...chain(3, 5, 6, 2), [5, 7], [6, 8]],
  },
  LIBRA: {
    stars: [s(62, 58), s(44, 14, true), s(22, 44), s(70, 92), s(16, 88)],
    lines: [...chain(0, 1, 2, 0), [0, 3], [2, 4]],
  },
  SCORPIO: {
    stars: [
      s(88, 10),
      s(92, 24),
      s(89, 38),
      s(77, 30),
      s(68, 37, true),
      s(61, 46),
      s(52, 62),
      s(49, 76),
      s(45, 88),
      s(33, 94),
      s(18, 91),
      s(8, 80),
      s(11, 68),
      s(22, 62),
    ],
    lines: [...chain(0, 1, 2), ...chain(1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)],
  },
  SAGITTARIUS: {
    stars: [s(80, 62), s(64, 48), s(66, 76, true), s(30, 72), s(18, 54), s(26, 38), s(42, 44), s(54, 24)],
    lines: [...chain(0, 1, 2, 0), ...chain(1, 7, 6, 1), ...chain(6, 3, 2), ...chain(6, 5, 4, 3)],
  },
  CAPRICORN: {
    stars: [s(88, 10), s(84, 24), s(66, 66), s(60, 84), s(34, 72), s(8, 40, true), s(20, 37), s(34, 35), s(54, 31)],
    lines: chain(0, 1, 2, 3, 4, 5, 6, 7, 8, 1),
  },
  AQUARIUS: {
    stars: [
      s(96, 62),
      s(80, 40, true),
      s(56, 24),
      s(42, 26),
      s(34, 21),
      s(26, 27),
      s(37, 10),
      s(48, 50),
      s(36, 60),
      s(32, 86),
      s(20, 56),
      s(12, 74),
    ],
    lines: [...chain(0, 1, 2, 3, 4, 5), [4, 6], ...chain(2, 7, 8, 9), ...chain(8, 10, 11)],
  },
  PISCES: {
    stars: [
      s(76, 66),
      s(81, 57),
      s(91, 59),
      s(94, 70),
      s(85, 77),
      s(62, 67),
      s(48, 65),
      s(34, 64),
      s(22, 70),
      s(8, 84, true),
      s(15, 62),
      s(22, 42),
      s(28, 26),
      s(24, 10),
      s(38, 12),
    ],
    lines: [...chain(0, 1, 2, 3, 4, 0), ...chain(0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 12)],
  },
};
