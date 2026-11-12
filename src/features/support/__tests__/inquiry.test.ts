import { checkInquiry, INQUIRY_BODY_MAX, INQUIRY_BODY_MIN } from '@/features/support/inquiry';

const draft = { category: 'BUG' as const, body: '리포트 화면이 열리지 않아요.', email: '' };

describe('checkInquiry: 보내기 전에 서버와 같은 규칙으로 확인한다', () => {
  it('맞으면 보낼 본문을 준다: 내용은 앞뒤 공백을 떼고, 빈 이메일은 null 이다', () => {
    expect(checkInquiry({ ...draft, body: `  \n${draft.body}\n  `, email: '   ' })).toEqual({
      ok: true,
      input: { category: 'BUG', body: draft.body, replyEmail: null },
    });
  });

  it('이메일을 적었으면 앞뒤 공백을 떼어 싣는다', () => {
    expect(checkInquiry({ ...draft, email: ' me@example.test ' })).toEqual({
      ok: true,
      input: { category: 'BUG', body: draft.body, replyEmail: 'me@example.test' },
    });
  });

  it('종류를 고르지 않았으면 막는다', () => {
    expect(checkInquiry({ ...draft, category: null })).toEqual({ ok: false, problems: { category: 'REQUIRED' } });
  });

  it('내용은 공백을 뗀 길이로 10자부터 2000자까지다', () => {
    expect(INQUIRY_BODY_MIN).toBe(10);
    expect(INQUIRY_BODY_MAX).toBe(2000);
    const body = (n: number) => checkInquiry({ ...draft, body: `   ${'가'.repeat(n)}   ` });
    expect(body(9)).toEqual({ ok: false, problems: { body: 'TOO_SHORT' } });
    expect(body(10).ok).toBe(true);
    expect(body(2000).ok).toBe(true);
    expect(body(2001)).toEqual({ ok: false, problems: { body: 'TOO_LONG' } });
    expect(checkInquiry({ ...draft, body: ' '.repeat(30) })).toEqual({ ok: false, problems: { body: 'TOO_SHORT' } });
  });

  it.each([
    'me',
    'me@',
    '@example.test',
    'me@example',
    'me@@example.test',
    'a@b@c.test',
    'me @example.test',
    'me@.test',
    'me@example.',
  ])('이메일 모양이 아니면 막는다: %s', (email) => {
    expect(checkInquiry({ ...draft, email })).toEqual({ ok: false, problems: { email: 'FORMAT' } });
  });

  it('틀린 것을 한 번에 모두 알려 준다', () => {
    expect(checkInquiry({ category: null, body: '짧아요', email: 'x' })).toEqual({
      ok: false,
      problems: { category: 'REQUIRED', body: 'TOO_SHORT', email: 'FORMAT' },
    });
  });
});
