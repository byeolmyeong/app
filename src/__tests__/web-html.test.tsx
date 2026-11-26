import { render, screen } from '@testing-library/react-native';

import Root from '@/app/+html';
import { WEB_FONT_DIR, WEB_FONTS } from '@/components/web-fonts';

jest.mock('expo-router/html', () => ({
  ScrollViewStyleReset: () => null,
  useServerDocumentContext: () => ({ bodyAttributes: {}, bodyNodes: null, htmlAttributes: {}, headNodes: null }),
}));

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };

/** head · body 안의 그 종류 요소들의 props(그린 순서대로) */
function inside(part: 'head' | 'body', type: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (node: Node | string, within: boolean) => {
    if (typeof node === 'string') return;
    const here = within || node.type === part;
    if (here && node.type === type) out.push(node.props);
    node.children?.forEach((c) => walk(c, here));
  };
  walk(screen.toJSON() as unknown as Node, false);
  return out;
}

/** 웹 루트 HTML(성능 계획 1): 핵심 글꼴 셋을 미리 받고(@font-face 는 head 에), 드문 글자의 조각 규칙은 body 끝에서 */
describe('웹 루트 HTML 의 글꼴', () => {
  beforeEach(async () => {
    await render(<Root>{null}</Root>);
  });

  it('핵심 묶음 셋을 woff2 로 미리 받는다(crossorigin — 글꼴 미리 받기를 CORS 로 다시 받지 않게), OTF 는 받지 않는다', () => {
    const preloads = inside('head', 'link')
      .filter((l) => l.rel === 'preload')
      .map((l) => [l.href, l.as, l.type, l.crossOrigin]);
    expect(preloads).toEqual(WEB_FONTS.map((f) => [`${WEB_FONT_DIR}/${f.file}`, 'font', 'font/woff2', '']));
    expect(JSON.stringify(preloads)).not.toContain('.otf');
  });

  it('핵심 @font-face 는 head 의 <style> 에, 조각 규칙(dynamic.css)은 body 끝 — 뒤에 적힌 조각이 그 글자를 먼저 맡는다', () => {
    const css = inside('head', 'style')
      .map((s) => (s.dangerouslySetInnerHTML as { __html: string } | undefined)?.__html ?? '')
      .join('');
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(inside('body', 'link').map((l) => [l.rel, l.href])).toEqual([['stylesheet', `${WEB_FONT_DIR}/dynamic.css`]]);
  });
});
