import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import MarketingScreen from '@/app/settings/marketing';
import PrivacyScreen from '@/app/settings/privacy';
import PrivacyConsentScreen from '@/app/settings/privacy-consent';
import TermsScreen from '@/app/settings/terms';
import { legalInfo, marketing, privacy, privacyConsent, terms } from '@/content/legal';
import { strings } from '@/content/strings';

const L = strings.legal;
const flat = (node: { props: Record<string, any> }) => StyleSheet.flatten(node.props.style);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useCanGoBack: jest.fn(() => true),
  useIsFocused: () => true,
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

// 약관 보기(결정 044, 보드 6-2): 가운데 제목 17/24 · 600 과 왼쪽 뒤로, 시행일 한 줄 13/18, 조항 제목 15/22 · 600, 문단 14/22 회색, 조항 사이 24, 좌우 20
describe('약관 글 화면의 모양(보드 6-2)', () => {
  it('머리는 가운데 제목(17/24 · 600)과 왼쪽 뒤로, 그 아래 시행일 한 줄(13/18 · 안내색)', async () => {
    await render(<TermsScreen />);
    expect(flat(screen.getByText(terms.title))).toMatchObject({ fontSize: 17, lineHeight: 24, fontWeight: '600', textAlign: 'center' });
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
    const date = screen.getByText(`${L.effectiveLabel} ${legalInfo.effective}`);
    expect(`${L.effectiveLabel} ${legalInfo.effective}`).toBe('시행일 2026년 11월 20일');
    expect(flat(date)).toMatchObject({ fontSize: 13, lineHeight: 18, color: '#868894' });
  });

  it('조항 제목 15/22 · 600, 문단 · 목록 · 표는 작은 본문 14/21(결정 080), 조항 사이 24, 좌우 20', async () => {
    await render(<PrivacyScreen />);
    const first = privacy.sections[0];
    expect(flat(screen.getByRole('header', { name: first.title }))).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: '600' });
    const p = first.blocks.find((b) => 'p' in b) as { p: string };
    expect(flat(screen.getByText(p.p))).toMatchObject({ fontSize: 14, lineHeight: 21, color: '#A9ABB7' });
    // 시안 문단의 word-break: keep-all — 낱말 중간에서 줄을 바꾸지 않는다
    expect(screen.getByText(p.p).props.lineBreakStrategyIOS).toBe('hangul-word');
    const ul = first.blocks.find((b) => 'ul' in b) as { ul: string[] };
    expect(flat(screen.getByText(ul.ul[0]))).toMatchObject({ fontSize: 14, lineHeight: 21 });
    const table = privacy.sections.flatMap((s) => s.blocks).find((b) => 'table' in b) as { table: { head: string[]; rows: string[][] } };
    expect(flat(screen.getAllByText(table.table.rows[0][1])[0])).toMatchObject({ fontSize: 14, lineHeight: 21 });
    expect(flat(screen.getAllByText(table.table.head[0])[0])).toMatchObject({ fontSize: 14, lineHeight: 21 });
    const sections = screen.getAllByTestId('legal-section');
    expect(sections).toHaveLength(privacy.sections.length);
    expect(flat(sections[1])).toMatchObject({ marginTop: 24 });
    expect(flat(screen.getByTestId('legal-body'))).toMatchObject({ paddingHorizontal: 20, paddingTop: 8 });
  });

  it.each([
    ['이용약관', TermsScreen],
    ['개인정보 처리방침', PrivacyScreen],
    ['마케팅 정보 수신 동의 약관', MarketingScreen],
    ['개인정보 수집 · 이용 동의', PrivacyConsentScreen],
  ])('%s: 마이에서 연 글(가입 중이 아님)에는 동의하기가 없다', async (_name, Component) => {
    await render(<Component />);
    expect(screen.queryByRole('button', { name: L.agree })).toBeNull();
  });

  it('가입 약관 단계에서 연 글(from=signup)에는 맨 아래 동의하기(56 · 주색)가 있다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<TermsScreen />);
    const agree = screen.getByRole('button', { name: L.agree });
    expect(L.agree).toBe('동의하기');
    expect(flat(agree)).toMatchObject({ height: 56, backgroundColor: '#4752FF' });
    // 리뷰 5: 시안의 가림막은 높이 130(위 40 · 버튼 56 · 아래 34)의 32% 에서 다 찬다. 앱은 아래 34 를 화면 여백으로 두므로 위 96 칸에서 같은 자리(41.6)
    type Node = { type?: string; props?: Record<string, any>; children?: (Node | string)[] | null };
    const stops: number[] = [];
    const walk = (node: Node | string | null) => {
      if (!node || typeof node === 'string') return;
      if (node.props?.name === 'legalAgreeFade') stops.push(node.props.gradient[2]);
      node.children?.forEach(walk);
    };
    const tree = screen.toJSON() as Node | Node[];
    (Array.isArray(tree) ? tree : [tree]).forEach(walk);
    expect(stops).toHaveLength(1);
    expect(stops[0] * (40 + 56)).toBeCloseTo(0.32 * (40 + 56 + 34), 1);
  });
});

// 앱 안의 약관 · 처리방침 · 마케팅 수신 동의(결정 043). 글은 랜딩(byeolmyeong.com)과 같은 원본 `src/content/legal.ts` 에서 온다.
describe('약관 글 화면', () => {
  it.each([
    ['이용약관', TermsScreen, terms],
    ['개인정보 처리방침', PrivacyScreen, privacy],
    ['마케팅 정보 수신 동의 약관', MarketingScreen, marketing],
    ['개인정보 수집 · 이용 동의(결정 045)', PrivacyConsentScreen, privacyConsent],
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

  it('표는 행마다 "머리 · 값" 카드로 쌓는다(폰 폭에서 칸이 좁아지지 않게): 처리방침은 제3조 4행 + 제5조 7행(Amplitude 줄 — 결정 081) → 카드 11장, 카드마다 그 표의 머리를 다 적는다', async () => {
    await render(<PrivacyScreen />);
    const tables = privacy.sections.flatMap((s) => s.blocks).flatMap((b) => ('table' in b ? [b.table] : []));
    expect(tables.map((t) => t.rows.length)).toEqual([4, 7]);
    expect(screen.getAllByTestId('legal-table-card')).toHaveLength(11);
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
  ])('%s: 글 안의 연락처는 글로만 적고 메일 앱을 여는 링크(mailto)는 두지 않는다(결정 024 · 043)', async (_name, Component) => {
    await render(<Component />);
    expect(screen.getAllByText(legalInfo.contact, { exact: false }).length).toBeGreaterThan(0);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/mailto/);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

// 개인정보 수집 · 이용 동의(결정 045): 약관 단계의 동의는 이 글에서 받고, 처리방침은 알리는 글로 남는다
describe('개인정보 수집 · 이용 동의와 처리방침', () => {
  it('가입 약관 단계에서 연 개인정보 수집 · 이용 동의에는 동의하기가 있다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<PrivacyConsentScreen />);
    expect(screen.getByText(privacyConsent.title)).toBeTruthy();
    expect(screen.getByRole('button', { name: L.agree })).toBeTruthy();
  });

  it('처리방침은 from=signup 이어도 동의하기가 없다(동의받는 글이 아니다)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<PrivacyScreen />);
    expect(screen.getByText(privacy.title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: L.agree })).toBeNull();
  });
});
