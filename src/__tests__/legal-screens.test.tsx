import { render, screen } from '@testing-library/react-native';

import MarketingScreen from '@/app/settings/marketing';
import PrivacyScreen from '@/app/settings/privacy';
import TermsScreen from '@/app/settings/terms';
import { legalInfo, marketing, privacy, terms } from '@/content/legal';
import { strings } from '@/content/strings';

const L = strings.legal;

// 앱 안의 약관 · 처리방침 · 마케팅 수신 동의(결정 042). 글은 랜딩(byeolmyeong.com)과 같은 원본 `src/content/legal.ts` 에서 온다.
describe('약관 글 화면', () => {
  it.each([
    ['이용약관', TermsScreen, terms],
    ['개인정보 처리방침', PrivacyScreen, privacy],
    ['마케팅 정보 수신 동의 약관', MarketingScreen, marketing],
  ])('%s: 제목 · 머리말 · 모든 조항 제목(heading) · 문단 · 목록 · 표 머리와 칸 · 마지막 시행 문구를 그린다', async (_name, Component, doc) => {
    await render(<Component />);
    expect(screen.getByText(doc.title)).toBeTruthy();
    expect(screen.getByText(doc.intro)).toBeTruthy();
    for (const section of doc.sections) {
      expect(screen.getByRole('header', { name: section.title })).toBeTruthy();
      for (const block of section.blocks) {
        if ('p' in block) expect(screen.getByText(block.p)).toBeTruthy();
        else if ('ul' in block) for (const item of block.ul) expect(screen.getByText(item)).toBeTruthy();
        else if ('ol' in block)
          block.ol.forEach((item, i) => {
            expect(screen.getByText(item)).toBeTruthy();
            expect(screen.getAllByText(`${i + 1}${L.numberSuffix}`).length).toBeGreaterThan(0);
          });
        else {
          for (const head of block.table.head) expect(screen.getAllByText(head).length).toBeGreaterThan(0);
          for (const cell of block.table.rows.flat()) expect(screen.getAllByText(cell).length).toBeGreaterThan(0);
        }
      }
    }
    expect(screen.getByText(doc.closing)).toBeTruthy();
  });

  it('표는 행마다 "머리 · 값" 카드로 쌓는다(폰 폭에서 칸이 좁아지지 않게): 처리방침은 제3조 4행 + 제5조 6행 → 카드 10장, 카드마다 그 표의 머리를 다 적는다', async () => {
    await render(<PrivacyScreen />);
    const tables = privacy.sections.flatMap((s) => s.blocks).flatMap((b) => ('table' in b ? [b.table] : []));
    expect(tables.map((t) => t.rows.length)).toEqual([4, 6]);
    expect(screen.getAllByTestId('legal-table-card')).toHaveLength(10);
    for (const table of tables) for (const head of table.head) expect(screen.getAllByText(head)).toHaveLength(table.rows.length);
  });

  it.each([
    ['이용약관', TermsScreen],
    ['개인정보 처리방침', PrivacyScreen],
    ['마케팅 정보 수신 동의 약관', MarketingScreen],
  ])('%s: 자리표시 글과 "[확인 필요]" 안내가 없다', async (_name, Component) => {
    await render(<Component />);
    expect(screen.queryByText(/자리표시|확인 필요/)).toBeNull();
    expect(L).not.toHaveProperty('placeholderNotice');
  });

  it.each([
    ['개인정보 처리방침', PrivacyScreen],
    ['마케팅 정보 수신 동의 약관', MarketingScreen],
  ])('%s: 글 안의 연락처는 글로만 적고 메일 앱을 여는 링크(mailto)는 두지 않는다(결정 024 · 042)', async (_name, Component) => {
    await render(<Component />);
    expect(screen.getAllByText(legalInfo.contact, { exact: false }).length).toBeGreaterThan(0);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/mailto/);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
