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
  // 처리방침 · 수집 동의는 제품 분석(앰플리튜드)을 더해 시행일이 따로다(결정 081) — 약관 · 마케팅 동의는 그대로
  it('글의 시행일과 가입 때 보내는 약관 · 처리방침 버전이 같은 날이다', () => {
    expect(isoDate(legalInfo.effective)).toBe(LEGAL_VERSIONS.terms);
    expect(isoDate(legalInfo.privacyEffective)).toBe(LEGAL_VERSIONS.privacy);
  });

  it('네 글의 마지막 시행 문구가 그 시행일을 적는다', () => {
    for (const doc of [terms, marketing]) expect(doc.closing).toContain(legalInfo.effective);
    for (const doc of [privacy, privacyConsent]) expect(doc.closing).toContain(legalInfo.privacyEffective);
  });

  it('네 글마다 머리에 적을 시행일(effective)을 갖고, 맺음말의 시행일과 같다', () => {
    expect([terms, marketing].map((d) => d.effective)).toEqual([legalInfo.effective, legalInfo.effective]);
    expect([privacy, privacyConsent].map((d) => d.effective)).toEqual([legalInfo.privacyEffective, legalInfo.privacyEffective]);
    for (const doc of [terms, privacy, marketing, privacyConsent]) expect(doc.closing).toContain(`${doc.effective}부터 시행합니다`);
  });

  // 랜딩이 약관에서 궁합(1.1.0)을 뺀 판(랜딩 main 4eaca8e, 시행일 2026-11-20)과 같은 글이다 — 궁합을 다시 넣으면 랜딩 · 앱 글과 버전을 함께 올린다
  it('네 글 어디에도 궁합이 없다', () => {
    for (const doc of [terms, privacy, marketing, privacyConsent]) expect(JSON.stringify(doc)).not.toContain('궁합');
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

// 2026-11-27: Google Play 계정 삭제 URL 로 넣은 랜딩 계정 삭제 안내 페이지를 처리방침 제7조에서도 알린다(랜딩 글과 같은 문장)
describe('처리방침 — 계정 삭제 안내 페이지', () => {
  it('제7조(권리)에 앱 없이 삭제를 요청하는 안내 주소(byeolmyeong.com/delete-account)가 있다', () => {
    const text = privacy.sections.flatMap((s) => s.blocks).map((b) => JSON.stringify(b)).join('\n');
    expect(text).toContain('byeolmyeong.com/delete-account');
  });
});
