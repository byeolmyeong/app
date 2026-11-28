import { strings } from '@/content/strings';

// 아래 탭 다섯(결정 102 의 3)의 문구
describe('아래 탭 문구', () => {
  it('아래 탭은 다섯, 이 순서다: 홈 · 나 · 시기 · 궁합 · 마이', () => {
    expect(Object.entries(strings.tabs)).toEqual([
      ['home', '홈'],
      ['me', '나'],
      ['timing', '시기'],
      ['synastry', '궁합'],
      ['my', '마이'],
    ]);
  });
});
