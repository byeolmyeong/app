import { checkInquiry, formatInquiryDate, INQUIRY_BODY_MAX, INQUIRY_BODY_MIN, inquiryLength } from '@/features/support/inquiry';

describe('checkInquiry: 보내기 전에 서버와 같은 규칙으로 확인한다(결정 058)', () => {
  it('맞으면 보낼 본문을 준다: 종류와 앞뒤 공백을 뗀 내용만(이메일 칸은 없다)', () => {
    expect(checkInquiry({ category: 'BUG', body: '  알림이 오지 않아요. 확인해 주세요.  ' })).toEqual({
      ok: true,
      input: { category: 'BUG', body: '알림이 오지 않아요. 확인해 주세요.' },
    });
  });

  it('종류를 고르지 않았으면 막는다', () => {
    expect(checkInquiry({ category: null, body: '열 글자가 넘는 문의 내용이에요.' })).toEqual({ ok: false, problems: { category: 'REQUIRED' } });
  });

  it('내용은 공백을 뗀 길이로 10자부터 1000자까지다', () => {
    expect([INQUIRY_BODY_MIN, INQUIRY_BODY_MAX]).toEqual([10, 1000]);
    expect(checkInquiry({ category: 'ETC', body: '   아홉 글자예요요   ' })).toEqual({ ok: false, problems: { body: 'TOO_SHORT' } });
    expect(checkInquiry({ category: 'ETC', body: '열 글자예요요요요요' }).ok).toBe(true);
    expect(checkInquiry({ category: 'ETC', body: '가'.repeat(1000) }).ok).toBe(true);
    expect(checkInquiry({ category: 'ETC', body: '가'.repeat(1001) })).toEqual({ ok: false, problems: { body: 'TOO_LONG' } });
  });

  it('길이는 글자(유니코드 코드 포인트)로 센다: 이모지 하나는 한 글자다(서버와 같다)', () => {
    expect(inquiryLength('🌙🌙🌙')).toBe(3);
    expect(checkInquiry({ category: 'IDEA', body: '🌙'.repeat(1000) }).ok).toBe(true);
  });

  it('틀린 것을 한 번에 모두 알려 준다', () => {
    expect(checkInquiry({ category: null, body: '짧아요' })).toEqual({ ok: false, problems: { category: 'REQUIRED', body: 'TOO_SHORT' } });
  });
});

describe('formatInquiryDate: 문의 · 답의 날짜(보드 16-8 "11월 20일")', () => {
  const now = Date.parse('2026-11-20T03:00:00Z');

  it('한국 날짜로 "M월 D일" 을 적는다(밤 사이 UTC 날짜가 달라도 한국 날짜)', () => {
    expect(formatInquiryDate('2026-11-18T01:00:00Z', now)).toBe('11월 18일');
    // 한국 시각 11월 20일 오전 8시
    expect(formatInquiryDate('2026-11-19T23:00:00Z', now)).toBe('11월 20일');
  });

  it('올해가 아니면 해를 앞에 붙인다', () => {
    expect(formatInquiryDate('2025-12-31T01:00:00Z', now)).toBe('2025년 12월 31일');
  });

  it('읽을 수 없는 시각이면 빈 글자다', () => {
    expect(formatInquiryDate('어제', now)).toBe('');
  });
});
