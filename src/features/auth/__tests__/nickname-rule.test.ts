import { checkNickname, isComposingOnly } from '@/features/auth/nickname-rule';

// 닉네임: 앞뒤 공백을 뗀 한글(가~힣) · 영문만 2~10자(결정 042). 판정은 서버, 앱은 먼저 안내만.
describe('checkNickname', () => {
  it('한글 · 영문 2~10자는 통과하고, 섞어도 된다. 앞뒤 공백은 뗀다', () => {
    expect(checkNickname('새벽별')).toEqual({ ok: true, value: '새벽별' });
    expect(checkNickname('Star')).toEqual({ ok: true, value: 'Star' });
    expect(checkNickname('별Star')).toEqual({ ok: true, value: '별Star' });
    expect(checkNickname('  새벽별 ')).toEqual({ ok: true, value: '새벽별' });
    expect(checkNickname('가나')).toEqual({ ok: true, value: '가나' });
    expect(checkNickname('가나다라마바사아자차')).toEqual({ ok: true, value: '가나다라마바사아자차' });
  });

  it('1자 · 빈 값은 짧다, 11자는 길다', () => {
    expect(checkNickname('별')).toEqual({ ok: false, reason: 'TOO_SHORT' });
    expect(checkNickname('')).toEqual({ ok: false, reason: 'TOO_SHORT' });
    expect(checkNickname('   ')).toEqual({ ok: false, reason: 'TOO_SHORT' });
    expect(checkNickname('가나다라마바사아자차카')).toEqual({ ok: false, reason: 'TOO_LONG' });
    expect(checkNickname('abcdefghijk')).toEqual({ ok: false, reason: 'TOO_LONG' });
  });

  it('숫자 · 가운데 공백 · 기호 · 이모지 · 낱자(ㅋ)는 쓸 수 없다(길이보다 먼저 알린다)', () => {
    for (const raw of ['별1', '새벽 별', '별!', '별_빛', '별⭐', 'ㅋㅋ', '별ㅋ', '!', '가나다라마바사아자차1']) {
      expect(checkNickname(raw)).toEqual({ ok: false, reason: 'INVALID_CHAR' });
    }
  });
});

describe('isComposingOnly', () => {
  it('한글을 치는 중의 낱자만 어긋나면 참이다(오류를 바로 띄우지 않는다)', () => {
    expect(isComposingOnly('새벽ㅂ')).toBe(true);
    expect(isComposingOnly('ㅅ')).toBe(true);
    expect(isComposingOnly('별!')).toBe(false);
    expect(isComposingOnly('별ㅂ1')).toBe(false);
    expect(isComposingOnly('새벽별')).toBe(false);
  });
});
