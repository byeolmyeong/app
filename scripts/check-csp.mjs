/**
 * 웹 빌드(`dist`)의 HTML 이 vercel.json 의 CSP 와 맞는지 본다(결정 077). CI 의 웹 빌드 뒤에 돈다.
 * - 인라인 <script> 마다 sha256 해시가 script-src 에 있어야 한다(Expo 를 올려 인라인 한 줄이 바뀌면 여기서 실패).
 * - HTML 에 외부 출처의 <script src> 가 없어야 한다(자기 출처만).
 * 쓰는 법: node scripts/check-csp.mjs [dist 경로]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] ?? 'dist';
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const header = (config.headers ?? []).flatMap((h) => h.headers).find((h) => /^Content-Security-Policy(-Report-Only)?$/i.test(h.key));
if (!header) {
  console.error('vercel.json 에 Content-Security-Policy 머리가 없다');
  process.exit(1);
}
const scriptSrc = header.value.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';

const htmlFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const file = path.join(dir, name);
  return statSync(file).isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
});

const problems = [];
const pages = htmlFiles(dist);
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = /\bsrc="([^"]*)"/.exec(attrs)?.[1];
    if (src !== undefined) {
      if (/^(https?:)?\/\//.test(src)) problems.push(`${file}: 외부 스크립트 ${src}`);
      continue;
    }
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!scriptSrc.includes(hash)) problems.push(`${file}: 인라인 스크립트의 해시 ${hash} 가 script-src 에 없다 — ${JSON.stringify(body.slice(0, 80))}`);
  }
}
if (problems.length > 0) {
  console.error([...new Set(problems)].join('\n'));
  process.exit(1);
}
console.log(`CSP 점검 통과: HTML ${pages.length}개`);
