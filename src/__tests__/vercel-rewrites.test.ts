/**
 * 웹은 정적 내보내기(app.json `web.output: "static"`)라 `[param]` 화면은 `/synastry/[id].html` 처럼 이름 그대로 한 장만 생긴다.
 * 그 주소(`/my/inquiries/42`)로 새로 고치거나 바로 열면 Vercel 이 파일을 찾지 못해 404 — vercel.json 의 rewrites 가 그 한 장으로 잇는다.
 * 새 `[param]` 화면을 더하면 rewrite 도 함께 더해야 한다(이 시험이 빠진 것을 알린다).
 */
// 시험은 저장소 맨 위에서 돈다(jest rootDir)
const fs = jest.requireActual<{
  readFileSync: (file: string, encoding: 'utf8') => string;
  readdirSync: (dir: string, options: { withFileTypes: true }) => { name: string; isDirectory: () => boolean }[];
}>('fs');

/** src/app 아래 `[param]` 이 든 화면의 경로(`/synastry/[id]/report` 꼴). `index` 는 폴더 주소, `_layout` · `+html` 은 화면이 아니다 */
function dynamicRoutes(dir = 'src/app', base = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : dynamicRoutes(`${dir}/${entry.name}`, `${base}/${entry.name}`);
    const name = entry.name.replace(/\.(web\.)?tsx?$/, '');
    if (name === entry.name || name.startsWith('_') || name.startsWith('+')) return [];
    const route = name === 'index' ? base : `${base}/${name}`;
    return route.includes('[') ? [route] : [];
  });
}

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8')) as { rewrites?: { source: string; destination: string }[] };
const rewrites = config.rewrites ?? [];

describe('웹 새로 고침 — 동적 화면의 rewrite(vercel.json)', () => {
  it.each([...new Set(dynamicRoutes())].sort())('%s 는 :param 주소에서 그 화면 한 장으로 잇는다', (route) => {
    const source = route.replace(/\[([^\]]+)\]/g, ':$1');
    expect(rewrites).toContainEqual({ source, destination: route });
  });
});
