import { maskEmail } from '@/features/my/mask-email';

describe('maskEmail — 연결된 계정 줄의 가린 이메일(결정 056 의 3, 보드 16-1)', () => {
  it('@ 앞의 절반(많아야 4자)만 보이고 나머지는 * 로 가린다. 도메인은 그대로', () => {
    expect(maskEmail('dawnstar@kakao.com')).toBe('dawn****@kakao.com');
    expect(maskEmail('johnsmith123@gmail.com')).toBe('john********@gmail.com');
    expect(maskEmail('abc@icloud.com')).toBe('a**@icloud.com');
  });

  it('@ 앞이 한두 글자여도 적어도 한 글자는 가린다', () => {
    expect(maskEmail('ab@x.com')).toBe('a*@x.com');
    expect(maskEmail('a@x.com')).toBe('*@x.com');
  });

  it('@ 가 없거나 맨 앞이면 글 전체를 같은 규칙으로 가린다', () => {
    expect(maskEmail('dawnstar')).toBe('dawn****');
    expect(maskEmail('@x.com')).toBe('@x.***');
  });
});
