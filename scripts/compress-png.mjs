// 화면에 바로 실리는 브랜드 PNG 를 팔레트 PNG 로 줄인다(성능 계획 2, docs/plans/2026-11-21-app-perf.md).
// render-brand.mjs 로 다시 만들면 크기가 다시 커지므로 그 뒤에 이것을 돌린다. 크기 · 모양은 그대로(바탕색 위 화소 차이 > 16 이 0.1% 아래).
// sharp 는 저장소 의존성이 아니다 — 쓸 때만 저장소 밖에 깔아 그 경로를 준다:
//   (cd /tmp/x && npm i sharp@0.33.5) && SHARP=/tmp/x/node_modules/sharp node scripts/compress-png.mjs
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * 줄일 그림과 팔레트 품질: 스플래시(웹 첫 화면의 LCP · 앱 스플래시 · 로그인) · 기본 별이(소개 · 실패 화면 · 쓰는 중 · 공유 카드)는 90.
 * 옛 공유 카드 면(ByeoliFace)의 웃는 · 생각하는 별이와 바탕 빛은 100 — 저장 · 공유되는 1080×1920 이미지라 90 은 확대하면 흐린 그라데이션에
 * 옅은 점무늬가 보였다(2026-11-26 나란히 비교, 바탕 위 화소 차이 > 16: 90 은 0.05% · 100 은 0.003% 이하).
 */
const FILES = [
  ['splash-icon.png', 90],
  ['share/byeoli-default.png', 90],
  ['share/byeoli-happy.png', 100],
  ['share/byeoli-think.png', 100],
  ['share/glow.png', 100],
];

if (!process.env.SHARP) {
  console.error('SHARP 에 sharp 모듈 경로를 준다(위 사용법).');
  process.exit(1);
}
const sharp = createRequire(import.meta.url)(process.env.SHARP);
for (const [file, quality] of FILES) {
  const path = join(root, 'assets/images', file);
  const before = statSync(path).size;
  const out = await sharp(readFileSync(path)).png({ palette: true, quality, effort: 10, compressionLevel: 9 }).toBuffer();
  if (out.length < before) writeFileSync(path, out);
  console.log(file, before, '→', Math.min(out.length, before));
}
