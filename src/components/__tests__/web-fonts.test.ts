import { WEB_FONT_DIR, WEB_FONTS, webCoreFontCss } from '@/components/web-fonts';
import { FontFamily, FontWeight } from '@/constants/theme';

/**
 * 웹 글꼴(성능 계획 1): 핵심 묶음(공식 정적 부분 글꼴 woff2) 셋은 루트 HTML 이 unicode-range 없이 먼저 적고 미리 받는다.
 * 핵심에 없는 글자는 뒤에 적힌 공식 동적 조각(dynamic.css — 그 글자만 unicode-range)이 맡아, 드문 글자도 같은 글꼴로 받아진다.
 */
// 시험은 저장소 맨 위에서 돈다(jest rootDir) — 파일은 public/ 아래 그 주소 그대로
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; existsSync: (file: string) => boolean }>('fs');
const dir = `public${WEB_FONT_DIR}`;
const dynamicCss = fs.readFileSync(`${dir}/dynamic.css`, 'utf8');
const rules = [...dynamicCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);

/** unicode-range 글자 하나가 들어 있는가 */
function covers(range: string, cp: number) {
  return range.split(',').some((part) => {
    const [a, z] = part.trim().replace(/U\+/i, '').split('-');
    const lo = parseInt(a, 16);
    return cp >= lo && cp <= (z ? parseInt(z, 16) : lo);
  });
}

describe('웹 글꼴 — 핵심 묶음', () => {
  it('앱이 쓰는 굵기 셋(theme FontWeight)마다 하나, 이름은 theme FontFamily, 파일이 있다', () => {
    expect(WEB_FONTS.map((f) => String(f.weight)).sort()).toEqual(Object.values(FontWeight).sort());
    for (const f of WEB_FONTS) expect(fs.existsSync(`${dir}/${f.file}`)).toBe(true);
  });

  it('핵심 @font-face 는 unicode-range 없이(핵심에 없는 글자만 뒤의 조각이 맡는다) · 바로 바꿔 그리기(swap)', () => {
    const css = webCoreFontCss();
    const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(faces).toHaveLength(3);
    for (const face of faces) {
      expect(face).toContain(`font-family:'${FontFamily}'`);
      expect(face).toContain('font-display:swap');
      expect(face).not.toContain('unicode-range');
      expect(face).toMatch(/url\(\/fonts\/pretendard\/1\.3\.9\/Pretendard-(Regular|Medium|SemiBold)\.subset\.woff2\) format\('woff2'\)/);
    }
  });
});

describe('웹 글꼴 — 핵심에 없는 글자의 조각(dynamic.css)', () => {
  it('조각마다 같은 이름 · 굵기 셋 중 하나 · unicode-range · 있는 파일', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).toContain(`font-family: '${FontFamily}'`);
      expect(rule).toMatch(/font-weight: (400|500|600);/);
      expect(rule).toMatch(/unicode-range: [^;]+;/);
      const file = /url\(\.\/(dynamic\/[^)]+\.woff2)\)/.exec(rule)?.[1];
      expect(file !== undefined && fs.existsSync(`${dir}/${file}`)).toBe(true);
    }
  });

  it('흔한 글자(영문 · 숫자 · 자주 쓰는 한글)는 어느 조각에도 없다 — 핵심 묶음이 맡아 조각을 받지 않는다', () => {
    const ranges = rules.map((r) => /unicode-range: ([^;]+);/.exec(r)![1]);
    for (const ch of ['A', 'z', '0', '가', '별', '명', '나', '의', '시', '기']) {
      expect(ranges.some((r) => covers(r, ch.codePointAt(0)!))).toBe(false);
    }
  });

  it('핵심 묶음(한글 2,780자)에 없는 드문 글자(닉네임에 칠 수 있는 "똷 · 쀍 · 뛟")는 굵기마다 조각이 맡는다 — 대체 글꼴로 남지 않는다', () => {
    for (const ch of ['똷', '쀍', '뛟']) {
      for (const w of ['400', '500', '600']) {
        const rule = rules.find((r) => r.includes(`font-weight: ${w};`) && covers(/unicode-range: ([^;]+);/.exec(r)![1], ch.codePointAt(0)!));
        expect(rule).toBeTruthy();
      }
    }
  });
});
