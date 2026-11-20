import { legalInfo, marketing, privacy, privacyConsent, terms } from '@/content/legal';
import { LEGAL_VERSIONS } from '@/content/legal-versions';

/** "2026년 11월 19일" → "2026-11-19" */
function isoDate(korean: string): string {
  const m = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일$/.exec(korean);
  if (!m) throw new Error(`시행일 꼴이 아니다: ${korean}`);
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

// 글을 바꾸면 버전도 올린다(legal.ts 머리 주석). 가입 때 보내는 버전과 글의 시행일이 같은 날이어야 한다.
describe('약관 글의 시행일과 약관 버전', () => {
  it('글의 시행일과 가입 때 보내는 약관 · 처리방침 버전이 같은 날이다', () => {
    expect(isoDate(legalInfo.effective)).toBe(LEGAL_VERSIONS.terms);
    expect(isoDate(legalInfo.effective)).toBe(LEGAL_VERSIONS.privacy);
  });

  it('네 글의 마지막 시행 문구가 그 시행일을 적는다', () => {
    for (const doc of [terms, privacy, marketing, privacyConsent]) expect(doc.closing).toContain(legalInfo.effective);
  });

  // 개인정보 수집 · 이용 동의(결정 045): 동의받을 때 알릴 네 가지(개인정보 보호법 제15조 제2항)만 담은 글
  it('개인정보 수집 · 이용 동의는 목적 · 항목 · 보유 기간 · 거부할 권리 네 조항이다', () => {
    expect(privacyConsent.title).toBe('개인정보 수집 · 이용 동의');
    expect(privacyConsent.sections.map((s) => s.title)).toEqual([
      '1. 수집 · 이용 목적',
      '2. 수집하는 항목',
      '3. 보유 및 이용 기간',
      '4. 동의를 거부할 권리와 불이익',
    ]);
  });
});
