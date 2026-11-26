import { useEffect, useState } from 'react';

import { WEB_FONTS } from '@/components/web-fonts';
import { FontFamily } from '@/constants/theme';

/** 받았는지 볼 글자(한글 · 영문 · 숫자 — 모두 핵심 묶음에 있다) */
const SAMPLE = '가Aa1';

/**
 * 웹 글꼴: 루트 HTML(+html.tsx)이 @font-face 를 적고 미리 받는 핵심 묶음 셋(web-fonts.ts)이 다 받아질 때까지 기다린다 —
 * 스플래시가 이것을 기다려 첫 화면의 글자가 바뀌어 보이지 않는다. 글꼴 규칙이 없거나(받은 것 0) 받지 못하면 오류로 알려
 * 스플래시가 기다림을 멈춘다(그때는 기본 글꼴로 그린다). document.fonts 가 없으면 기다리지 않는다.
 */
export function useAppFonts(): [boolean, Error | null] {
  const [state, setState] = useState<[boolean, Error | null]>([false, null]);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    const waiting = fonts ? Promise.all(WEB_FONTS.map((f) => fonts.load(`${f.weight} 16px "${FontFamily}"`, SAMPLE))) : Promise.resolve(null);
    waiting
      .then((loaded) => {
        if (!alive) return;
        if (!loaded) return setState([true, null]);
        setState(loaded.every((faces) => faces.length > 0) ? [true, null] : [false, new Error('web fonts missing')]);
      })
      .catch((e: unknown) => {
        if (alive) setState([false, e instanceof Error ? e : new Error('web fonts failed')]);
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
