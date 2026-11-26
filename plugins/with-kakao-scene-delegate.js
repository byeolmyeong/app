/**
 * iOS 카카오 로그인(빌드 8): 카카오톡에서 돌아오는 로그인 주소(`kakao{앱 키}://oauth?code=…`)를 카카오 SDK 에 넘긴다.
 * Expo SDK 58 은 주소 열기를 장면(SceneDelegate → ExpoAppSceneDelegate.scene(_:openURLContexts:))이 받고, AppDelegate 에는
 * application(_:open:options:) 가 없다. @react-native-seoul/kakao-login 6.0.4 의 플러그인은 그 함수 안에 넣으려다 자리를 못 찾아
 * 아무 데도 넣지 못했다 — 그래서 SDK 가 주소를 못 받고 RN Linking → Expo Router 가 `/oauth` 로 읽어 "Unmatched Route" 가 떴다.
 * 생성된 `ios/<앱>/SceneDelegate.swift` 의 확장 자리에 scene(_:openURLContexts:) 를 넣어 카카오 로그인 주소는 SDK 로, 나머지만 super 로 보낸다.
 * app.config.ts 가 카카오 키가 있을 때 카카오 플러그인 뒤에 넣는다. 확장 자리가 없으면(템플릿이 바뀌었다) 멈춘다 — 조용히 빠지지 않게.
 * 인가 코드가 든 주소는 로그에 남기지 않는다.
 */
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const ANCHOR = '  // Extension point for config plugins.\n';
const MARKER = '// byeolmyeong: kakao-login scene';
const IMPORT = 'import kakao_login';
const OVERRIDE = `  ${MARKER}
  // 카카오톡에서 돌아오는 로그인 주소는 카카오 SDK 가 받는다(SDK 58 은 주소 열기를 장면이 받는다). 나머지 주소만 Expo 로.
  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    var others = Set<UIOpenURLContext>()
    for context in URLContexts {
      if kakao_login.RNKakaoLogins.isKakaoTalkLoginUrl(context.url) {
        _ = kakao_login.RNKakaoLogins.handleOpen(context.url)
      } else {
        others.insert(context)
      }
    }
    if !others.isEmpty {
      super.scene(scene, openURLContexts: others)
    }
  }
`;

/** SceneDelegate.swift 글에 카카오 로그인 주소 받기를 넣는다. 이미 들어 있으면 그대로 */
function addKakaoToSceneDelegate(contents) {
  if (contents.includes(MARKER)) return contents;
  if (!contents.includes(ANCHOR)) {
    throw new Error('with-kakao-scene-delegate: SceneDelegate.swift 에 "// Extension point for config plugins." 자리가 없다 — Expo 템플릿이 바뀌었는지 보고 플러그인을 고친다');
  }
  if (contents.includes('openURLContexts')) {
    throw new Error('with-kakao-scene-delegate: SceneDelegate.swift 에 이미 다른 scene(_:openURLContexts:) 가 있다 — 합치지 않고 멈춘다');
  }
  let out = contents.replace(ANCHOR, `${ANCHOR}\n${OVERRIDE}`);
  if (!/^import kakao_login$/m.test(out)) {
    // 맨 위 import 줄들 다음에(AppDelegate 와 같은 공개 import — 카카오 플러그인이 AppDelegate 에 넣는 것과 접근 수준을 맞춘다)
    const lines = out.split('\n');
    let last = -1;
    lines.forEach((line, i) => {
      if (/^(?:internal |public |private |fileprivate |package )?import /.test(line)) last = i;
    });
    lines.splice(last + 1, 0, IMPORT, 'import UIKit');
    out = lines.join('\n');
  }
  return out;
}

/** 파일을 고친다. 파일이 없으면(장면 생애 주기가 아닌 템플릿 — AppDelegate 쪽은 카카오 플러그인이 넣는다) 건드리지 않고 false */
function patchSceneDelegate(file) {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, 'utf8');
  const after = addKakaoToSceneDelegate(before);
  if (after !== before) fs.writeFileSync(file, after);
  return true;
}

const withKakaoSceneDelegate = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const { platformProjectRoot, projectName } = cfg.modRequest;
      patchSceneDelegate(path.join(platformProjectRoot, projectName ?? '', 'SceneDelegate.swift'));
      return cfg;
    },
  ]);

module.exports = withKakaoSceneDelegate;
module.exports.addKakaoToSceneDelegate = addKakaoToSceneDelegate;
module.exports.patchSceneDelegate = patchSceneDelegate;
