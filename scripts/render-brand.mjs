// 브랜드 그림 SVG(assets/brand) → PNG(assets/images). 그림을 고치면 이 스크립트를 다시 돌린다(결정 035).
// 이 컴퓨터의 Chrome 으로 찍는다. 다른 곳에 깔렸으면 CHROME 에 경로를 준다.
//   node scripts/render-brand.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** [원본 SVG, 만들 PNG, 가로, 세로] */
const TARGETS = [
  ['app-icon.svg', 'icon.png', 1024, 1024],
  ['app-icon-test.svg', 'icon-test.png', 1024, 1024], // 테스트앱(APP_VARIANT=test, 결정 041)
  ['app-icon.svg', 'favicon.png', 48, 48],
  ['adaptive-background.svg', 'android-icon-background.png', 512, 512],
  ['adaptive-foreground.svg', 'android-icon-foreground.png', 512, 512],
  ['adaptive-monochrome.svg', 'android-icon-monochrome.png', 432, 432],
  ['splash.svg', 'splash-icon.png', 1024, 1024],
  // 공유 카드(결정 036): 웹 이미지 저장이 SVG 필터를 못 그려 PNG 로 넣는다. 1080 폭 이미지에서도 흐리지 않은 크기
  ['share-byeoli-default.svg', 'share/byeoli-default.png', 640, 640],
  ['share-byeoli-happy.svg', 'share/byeoli-happy.png', 640, 640],
  ['share-byeoli-think.svg', 'share/byeoli-think.png', 640, 640],
  ['share-mark.svg', 'share/mark.png', 424, 224],
  ['share-glow.svg', 'share/glow.png', 540, 960],
];

const work = mkdtempSync(join(tmpdir(), 'render-brand-'));
try {
  for (const [svg, png, width, height] of TARGETS) {
    const page = join(work, `${png.replace('/', '-')}.html`);
    mkdirSync(dirname(join(root, 'assets/images', png)), { recursive: true });
    const src = `file://${join(root, 'assets/brand', svg)}`;
    writeFileSync(
      page,
      `<!doctype html><html><body style="margin:0;background:transparent"><img src="${src}" style="display:block;width:${width}px;height:${height}px"></body></html>`,
    );
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--user-data-dir=${join(work, 'profile')}`,
      `--window-size=${width},${height}`,
      `--screenshot=${join(root, 'assets/images', png)}`,
      `file://${page}`,
    ], { stdio: 'ignore' });
    console.log(`${svg} → assets/images/${png} (${width}×${height})`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
