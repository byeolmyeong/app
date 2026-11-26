/**
 * 앱 글꼴: Pretendard 공식 OTF 셋(400 · 500 · 600, theme.ts FontWeight)을 expo-font 설정 플러그인(app.json)이 빌드 때 넣는다(결정 086).
 * 앱이 뜰 때 이미 있어 실행 때 등록하지 않고, 스플래시도 글꼴을 기다리지 않는다. 웹은 use-app-fonts.web.ts(공식 부분 글꼴 woff2).
 */
export function useAppFonts(): [boolean, Error | null] {
  return [true, null];
}
