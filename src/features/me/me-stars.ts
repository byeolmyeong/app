/**
 * "이 풀이에 쓰인 별"(결정 054 의 5, 보드 12-8~12-12): 서버의 `stars` 를 용어 사전으로 "나의 중심 · 쌍둥이자리" 꼴로 옮긴다.
 * 놓인 자리 → 별의 이유 이름(상승점 · 중천은 짧은 이름) + 별자리, 하우스 모임 → 하우스 별명 + "별 셋", 별 하나 → 이유 이름 + 이름,
 * 하우스 하나 → 하우스 별명 + "4하우스". 시각을 모르면 하우스 · 상승점 · 중천이 든 별은 그리지 않는다(이중 안전).
 */
import { strings } from '@/content/strings';
import type { Star } from '@/lib/api';

const G = strings.glossary;
const R = strings.reason;

/** 굵게 적는 앞말과 " · " 뒤의 말 */
export type StarLabel = { key: string; strong: string; rest: string };

const isAngle = (key: string): key is 'ASC' | 'MC' => key === 'ASC' || key === 'MC';

function labelOf(star: Star): StarLabel | null {
  const body = star.body;
  if (body !== undefined) {
    const sign = star.sign !== undefined ? (strings.signs as Record<string, string | undefined>)[star.sign] : undefined;
    if (star.sign !== undefined && !sign) return null;
    if (isAngle(body)) {
      const a = G.angles[body];
      return sign ? { key: body, strong: a.short, rest: sign + strings.chart.signSuffix } : { key: body, strong: a.nickname, rest: a.name };
    }
    const b = (G.bodies as Record<string, { name: string; reasonName: string } | undefined>)[body];
    if (!b) return null;
    return { key: body, strong: b.reasonName, rest: sign ? sign + strings.chart.signSuffix : b.name };
  }
  if (star.house === undefined) return null;
  const house = (G.houses as Record<number, { nickname: string } | undefined>)[star.house];
  if (!house) return null;
  if (star.count === undefined) return { key: `house-${star.house}`, strong: house.nickname, rest: `${star.house}${R.houseSuffix}` };
  const count = G.counts[star.count];
  return count ? { key: `house-${star.house}`, strong: house.nickname, rest: `${R.starsPrefix}${count}` } : null;
}

export function starLabels(stars: Star[], timeKnown: boolean): StarLabel[] {
  return stars
    .filter((s) => timeKnown || (s.house === undefined && !(s.body !== undefined && isAngle(s.body))))
    .map(labelOf)
    .filter((l): l is StarLabel => l !== null);
}
