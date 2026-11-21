/**
 * 화면에 바로 실리는 브랜드 그림의 크기 한도(성능 계획 2). render-brand.mjs 로 다시 만들면 크기가 다시 커지므로
 * scripts/compress-png.mjs 로 줄였는지 지킨다 — 크기(가로 · 세로)는 그대로여야 한다(앱 스플래시 · 공유 카드가 같은 파일).
 */
const fs = jest.requireActual<{ readFileSync: (file: string) => Uint8Array }>('fs');

/** PNG 의 IHDR 에서 가로 · 세로 */
function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe('브랜드 그림 크기 한도', () => {
  it.each([
    ['assets/images/splash-icon.png', 1024, 80_000],
    ['assets/images/share/byeoli-default.png', 640, 60_000],
  ])('%s — 가로 · 세로 %i 그대로, %i 바이트 이하(팔레트 PNG)', (file, side, budget) => {
    const bytes = fs.readFileSync(file);
    expect(pngSize(bytes)).toEqual({ width: side, height: side });
    expect(bytes.byteLength).toBeLessThanOrEqual(budget);
  });
});
