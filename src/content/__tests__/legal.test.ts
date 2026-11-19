import { legalInfo, marketing, privacy, terms } from '@/content/legal';
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

  it('세 글의 마지막 시행 문구가 그 시행일을 적는다', () => {
    for (const doc of [terms, privacy, marketing]) expect(doc.closing).toContain(legalInfo.effective);
  });
});
