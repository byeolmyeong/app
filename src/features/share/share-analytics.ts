import type { EventProps } from '@/lib/analytics';
import type { ShareKind } from '@/lib/api';

/**
 * 공유 카드 종류 → 분석 값(결정 040 · 081). 카드의 글(닉네임 · 제목 · 날짜)은 보내지 않고 종류만.
 * 옛 링크의 READING · NEXT_TURN(결정 053 의 6)은 그 뒤를 이은 카드(내 별명 · 다음 큰 변화)로 센다.
 */
export const shareCardOf: Record<ShareKind, EventProps<'share_started'>['card']> = {
  NICKNAME: 'nickname',
  READING: 'nickname',
  ME_AREA: 'me_area',
  DAY_SKY: 'day_sky',
  NEXT_BIG: 'next_big',
  NEXT_TURN: 'next_big',
  SCORE: 'synastry_score',
  RANKING: 'ranking',
};
