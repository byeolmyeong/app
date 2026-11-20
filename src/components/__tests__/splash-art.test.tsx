import { render, screen } from '@testing-library/react-native';

import { SplashArt } from '@/components/splash-art.web';
import { strings } from '@/content/strings';

// 웹 스플래시(리뷰 PR #46 의 3): 웹은 정적 출력이라 서버가 그린 HTML 이 먼저 보인다.
// 그림은 브라우저가 바로 받는 <img>, 빛은 CSS radial-gradient(보드 1 과 같은 식)로 그려 스크립트를 기다리지 않는다.
describe('웹 스플래시 그림', () => {
  it('그림(300×300 <img>)과 빛(가운데 44% · 58% 에서 바탕색)을 처음부터 그린다', async () => {
    await render(<SplashArt />);
    type Node = { type: string; props: Record<string, any>; children?: (Node | string)[] | null };
    const nodes: Node[] = [];
    const walk = (n: Node | Node[] | string | null) => {
      if (!n || typeof n === 'string') return;
      if (Array.isArray(n)) return n.forEach(walk);
      nodes.push(n);
      n.children?.forEach(walk);
    };
    walk(screen.toJSON() as unknown as Node);
    const img = nodes.find((n) => n.type === 'img');
    const glow = nodes.find((n) => n.type === 'div');
    expect(img?.props).toMatchObject({ alt: strings.appName, width: 300, height: 300 });
    expect(img?.props.style?.opacity).toBeUndefined();
    expect(glow?.props.style.backgroundImage).toBe('radial-gradient(circle at 50% 44%, #161A45 0%, #0D0E12 58%)');
  });
});
