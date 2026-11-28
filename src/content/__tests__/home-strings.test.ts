import { strings } from '@/content/strings';

// 아래 탭 다섯(결정 102 의 3)과 홈 별명 한 줄 카드 · 이번 달 눈여겨볼 날(결정 092)의 문구
describe('아래 탭 · 홈 별명 카드 문구', () => {
  it('아래 탭은 다섯, 이 순서다: 홈 · 나 · 시기 · 궁합 · 마이', () => {
    expect(Object.entries(strings.tabs)).toEqual([
      ['home', '홈'],
      ['me', '나'],
      ['timing', '시기'],
      ['synastry', '궁합'],
      ['my', '마이'],
    ]);
  });

  it('별명 한 줄 카드의 문구는 비어 있지 않다 — "새벽별 님의 별명", 닉네임이 없으면 "내 별명"', () => {
    const card = strings.home.card;
    expect(`새벽별${card.labelSuffix}`).toBe('새벽별 님의 별명');
    expect(card.fallback).toBe('내 별명');
    expect(card.read).toBe('풀이 읽기');
    expect(strings.home.monthDays.title).toBe('이번 달 눈여겨볼 날');
    for (const value of Object.values(card)) expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
  });
});
