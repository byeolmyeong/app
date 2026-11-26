import { StyleSheet, View } from 'react-native';
import { useId } from 'react';
import Svg, { Circle, Defs, G, Line, Mask, Path, Rect } from 'react-native-svg';

import { BrandColors, Colors, NicknameCardLayout } from '@/constants/theme';

const L = NicknameCardLayout.art;
/** 네 갈래 별(-1~1) — 가장 밝은 별 자리 */
const FOUR_STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';

/**
 * 카드에 그릴 별자리: 해 별자리 이름(식별자)과 그 별 모양(0~100 칸의 별 자리 · 이은 선 — `features/chart/constellations.ts`).
 * 화면이 서버 차트의 해 별자리(SUN)로 골라 넘긴다(계산하지 않는다, 결정 006).
 */
export type CardConstellationArt = {
  sign: string;
  stars: readonly { x: number; y: number; bright?: boolean }[];
  lines: readonly (readonly [number, number])[];
};

/**
 * 별명 카드(홈 보드 11 · 마이 보드 16) 오른쪽 위에 옅게 깔린 그 사람의 해 별자리 — 별을 잇는 선 · 별 점 · 가장 밝은 별 자리의 네 갈래 별.
 * 두 카드가 같은 그림을 쓴다(결정 047 · 056). 별 모양의 둘레 상자를 그림 칸 가운데에 둔다. 해 별자리를 모르면 그리지 않는다.
 * 카드의 오른쪽 위에 떠 있는 장식이라 카드(`overflow: hidden`) 안에 둔다. 화면 읽기에서 숨기고 누르기를 받지 않는다.
 * `clear` 로 카드의 오른쪽 위 꺾쇠 칸(카드 안 좌표)을 받으면 그 둘레를 그림에서 비운다 — 어느 별자리든 선 · 별이 꺾쇠 밑을 지나지 않는다(결정 080).
 */
export function CardConstellation({ art, clear }: { art: CardConstellationArt | null; clear?: { top: number; right: number; size: number } }) {
  const maskId = `cardClear${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!art || art.stars.length === 0) return null;
  const xs = art.stars.map((star) => star.x);
  const ys = art.stars.map((star) => star.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((L.view.w - L.view.pad * 2) / Math.max(maxX - minX, 1), (L.view.h - L.view.pad * 2) / Math.max(maxY - minY, 1));
  const at = (star: { x: number; y: number }) => ({
    x: L.view.w / 2 + (star.x - (minX + maxX) / 2) * scale,
    y: L.view.h / 2 + (star.y - (minY + maxY) / 2) * scale,
  });
  const bright = art.stars.find((star) => star.bright) ?? art.stars[0];
  const core = at(bright);
  // 꺾쇠 가운데(카드 좌표) → 그림 칸 좌표: 그림 칸은 카드 오른쪽에서 right, 위에서 top 만큼 떨어져 있고 viewBox 로 늘어난다
  const sx = L.view.w / L.width;
  const sy = L.view.h / L.height;
  const hole = clear
    ? { cx: (L.width + L.right - clear.right - clear.size / 2) * sx, cy: (clear.top + clear.size / 2 - L.top) * sy, r: (clear.size / 2 + L.clear) * sx }
    : null;
  return (
    <View
      testID={`card-constellation-${art.sign}`}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.art}>
      <Svg width={L.width} height={L.height} viewBox={`0 0 ${L.view.w} ${L.view.h}`}>
        {hole ? (
          <Defs>
            <Mask id={maskId}>
              <Rect width={L.view.w} height={L.view.h} fill="white" />
              <Circle testID="card-constellation-clear" cx={hole.cx} cy={hole.cy} r={hole.r} fill="black" />
            </Mask>
          </Defs>
        ) : null}
        <G mask={hole ? `url(#${maskId})` : undefined}>
          <G stroke={BrandColors.constellation} strokeWidth={1}>
            {art.lines.map(([a, b], i) => {
              const from = at(art.stars[a]);
              const to = at(art.stars[b]);
              return <Line key={`l${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
            })}
          </G>
          <G fill={Colors.ink}>
            {art.stars.map((star, i) => {
              if (star === bright) return null;
              const p = at(star);
              return <Circle key={`s${i}`} cx={p.x} cy={p.y} r={L.dot} />;
            })}
          </G>
          <Path transform={`translate(${core.x} ${core.y}) scale(${L.core})`} fill={BrandColors.core} d={FOUR_STAR} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', right: L.right, top: L.top, opacity: L.opacity },
});
