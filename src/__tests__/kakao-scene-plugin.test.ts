/* eslint-disable @typescript-eslint/no-require-imports -- 설정 플러그인은 CommonJS(.js)이고, 이 저장소는 node 타입을 두지 않는다 */
const fs = require('node:fs') as {
  mkdtempSync(prefix: string): string;
  writeFileSync(file: string, data: string): void;
  readFileSync(file: string, encoding: 'utf8'): string;
  rmSync(dir: string, options: { recursive: boolean; force: boolean }): void;
};
const os = require('node:os') as { tmpdir(): string };
const path = require('node:path') as { join(...parts: string[]): string };
const { addKakaoToSceneDelegate, patchSceneDelegate } = require('../../plugins/with-kakao-scene-delegate.js') as {
  addKakaoToSceneDelegate: (contents: string) => string;
  patchSceneDelegate: (file: string) => boolean;
};

// iOS 카카오 로그인(빌드 8): SDK 58 의 AppDelegate 에는 application(_:open:options:) 가 없고 주소 열기를 SceneDelegate 가 받는다.
// 카카오 플러그인은 AppDelegate 에 넣을 자리를 못 찾아 아무 데도 넣지 못했다 — 그래서 SceneDelegate 의 확장 자리에 넣는다.
// SDK 58 템플릿(node_modules/expo/template.tgz 의 ios/HelloWorld/SceneDelegate.swift) 그대로
const TEMPLATE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;
const count = (s: string, part: string) => s.split(part).length - 1;

describe('with-kakao-scene-delegate', () => {
  it('카카오 로그인 주소는 카카오 SDK 로 넘기고 나머지 주소만 Expo(super)로 — import 는 맨 위, 함수는 클래스 안 확장 자리', () => {
    const out = addKakaoToSceneDelegate(TEMPLATE);
    expect(out).toContain('import kakao_login');
    expect(out).toContain('override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>)');
    expect(out).toContain('kakao_login.RNKakaoLogins.isKakaoTalkLoginUrl(context.url)');
    expect(out).toContain('kakao_login.RNKakaoLogins.handleOpen(context.url)');
    expect(out).toContain('super.scene(scene, openURLContexts: others)');
    expect(out.indexOf('import kakao_login')).toBeLessThan(out.indexOf('@objc(SceneDelegate)'));
    expect(out.indexOf('override func scene')).toBeGreaterThan(out.indexOf('// Extension point for config plugins.'));
    // 클래스를 닫는 괄호 앞에 들어간다
    expect(out.lastIndexOf('override func scene')).toBeLessThan(out.trimEnd().lastIndexOf('}'));
    expect(count(out, '{')).toBe(count(out, '}'));
  });

  it('두 번 돌려도 한 번만 들어간다', () => {
    const once = addKakaoToSceneDelegate(TEMPLATE);
    const twice = addKakaoToSceneDelegate(once);
    expect(twice).toBe(once);
    expect(count(twice, 'import kakao_login')).toBe(1);
    expect(count(twice, 'override func scene(')).toBe(1);
  });

  it('확장 자리가 없으면(템플릿이 바뀌었다) 조용히 넘어가지 않고 멈춘다', () => {
    expect(() => addKakaoToSceneDelegate('internal import Expo\nclass SceneDelegate: ExpoAppSceneDelegate {}\n')).toThrow(/SceneDelegate/);
  });

  it('이미 다른 openURLContexts 가 있으면 합치지 않고 멈춘다', () => {
    const other = TEMPLATE.replace(
      '  // Extension point for config plugins.\n',
      '  // Extension point for config plugins.\n  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {}\n',
    );
    expect(() => addKakaoToSceneDelegate(other)).toThrow(/openURLContexts/);
  });

  it('파일을 고친다 — 없으면(장면 생애 주기가 아닌 템플릿) 건드리지 않는다', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-'));
    const file = path.join(dir, 'SceneDelegate.swift');
    expect(patchSceneDelegate(file)).toBe(false);
    fs.writeFileSync(file, TEMPLATE);
    expect(patchSceneDelegate(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(addKakaoToSceneDelegate(TEMPLATE));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
