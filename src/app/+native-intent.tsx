/**
 * 시스템이 연 주소를 화면 주소로 읽기 전에 거른다(Expo Router `+native-intent`, 앱만 — 웹은 부르지 않는다).
 * 카카오톡 로그인에서 돌아오는 주소(`kakao{앱 키}://oauth?code=…`)는 카카오 SDK 가 받는 것이라 화면 주소가 아니다(iOS 는 SceneDelegate —
 * plugins/with-kakao-scene-delegate.js, 안드로이드는 SDK 의 AuthCodeHandlerActivity). SDK 가 못 받고 여기까지 오면 화면을 옮기지 않는다(null)
 * — "Unmatched Route" 가 뜨지 않게(빌드 8). 앱에는 `/oauth` 화면이 없어 첫 경로 조각이 `oauth` 인 주소도 같이 거른다.
 * 그 밖의 주소(공유 `/s/…` · 푸시 · 앱 주소 · 구글의 `…:/oauth2redirect`)는 그대로. 인가 코드가 든 주소는 로그에 남기지 않는다.
 */
const KAKAO_LOGIN_RETURN = /^kakao[^:/]*:\/\/oauth(?:[/?#]|$)/i;
const OAUTH_PATH = /^(?:[a-z][a-z0-9+.-]*:\/\/\/?)?\/?oauth(?:[/?#]|$)/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return KAKAO_LOGIN_RETURN.test(path) || OAUTH_PATH.test(path) ? null : path;
}
