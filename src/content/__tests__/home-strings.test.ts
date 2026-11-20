import { strings } from '@/content/strings';

// 아래 탭 넷(결정 055 의 2)과 홈 별명 카드(결정 047 의 1-2, 보드 11 · 11-1)의 문구
describe('아래 탭 · 홈 별명 카드 문구', () => {
  it('아래 탭은 넷, 이 순서다: 홈 · 나 · 시기 · 마이(궁합 없음)', () => {
    expect(Object.entries(strings.tabs)).toEqual([
      ['home', '홈'],
      ['me', '나'],
      ['timing', '시기'],
      ['my', '마이'],
    ]);
  });

  it('별명 카드의 문구는 비어 있지 않다', () => {
    const card = strings.home.card;
    expect(card.nicknameSuffix).toBe(' 님');
    expect(`${card.daysPrefix}12${card.daysSuffix}`).toBe('별명을 받은 지 12일');
    expect(card.read).toBe('풀이 읽기');
    for (const value of Object.values(card)) expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
  });
});
