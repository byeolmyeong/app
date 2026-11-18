import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { Colors, Sizes } from '@/constants/theme';

/**
 * 웹의 루트 HTML(웹에서만 쓰인다). Expo Router 의 기본 틀과 같고, 어두운 화면(결정 033)에 맞춰
 * 브라우저가 직접 그리는 것만 정한다: 기본 색 체계(입력 부품·선택 영역), 모바일 브라우저 위쪽 줄의 색,
 * 앱 화면이 그려지기 전과 당겨 내렸을 때 보이는 바탕, 자동 완성이 칠하는 입력칸 바탕.
 */
export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content={Colors.paper} />
        <ScrollViewStyleReset />
        <style id="byeolmyeong-dark" dangerouslySetInnerHTML={{ __html: darkCss }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// 넓은 화면의 바깥은 canvas(한 단 어두운 밤색), 휴대폰 폭에서는 앱 바탕색. 자동 완성 색은 칸의 채운 면과 본문 글씨로 덮는다.
const darkCss = `
html,body{background-color:${Colors.canvas}}
@media (max-width:${Sizes.maxContentWidth}px){html,body{background-color:${Colors.paper}}}
input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,textarea:-webkit-autofill{
-webkit-box-shadow:0 0 0 1000px ${Colors.fill} inset;-webkit-text-fill-color:${Colors.ink};caret-color:${Colors.ink}}
`;
