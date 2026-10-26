// index.html 안의 Tailwind 클래스를 미리 컴파일해 <style id="twCss">로 넣기 → 인터넷 없이도 디자인이 유지됨
// 실행: node build.mjs   (Tailwind CLI 3.4.16은 npx로 내려받음)
// 새 Tailwind 클래스를 쓰도록 index.html을 고쳤다면 다시 실행할 것. 여러 번 실행해도 결과가 같음
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let html = readFileSync('index.html', 'utf8');

// 처음 한 번: CDN 스크립트와 설정 스크립트를 내장 스타일 자리로 바꿈
const cdn = /<script src="https:\/\/cdn\.tailwindcss\.com\/[^"]+"><\/script>\n/;
const cfg = /<script id="twConfig">[\s\S]*?<\/script>\n/;
if (cdn.test(html)) html = html.replace(cdn, '').replace(cfg, '<style id="twCss">/*TW*/</style>\n');
if (!html.includes('<style id="twCss">')) throw new Error('<style id="twCss"> 자리를 찾지 못했습니다');

const tmp = mkdtempSync(join(tmpdir(), 'cliplab-'));
// 이미 들어 있는 CSS는 빼고 클래스만 훑음
writeFileSync(join(tmp, 'page.html'), html.replace(/<style id="twCss">[\s\S]*?<\/style>/, ''));
writeFileSync(join(tmp, 'in.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
writeFileSync(join(tmp, 'tailwind.config.cjs'), `module.exports = {
  content: [${JSON.stringify(join(tmp, 'page.html'))}],
  theme: { extend: {
    colors: { ink: '#1d1d1f', line: 'rgba(0,0,0,.08)', mute: '#77777d' },
    fontFamily: { sans: ['Inter', '"Noto Sans KR"', 'system-ui', 'sans-serif'], disp: ['Inter', '"Noto Sans KR"', 'sans-serif'] }
  } }
};
`);
execSync(`npx --yes tailwindcss@3.4.16 -c "${join(tmp, 'tailwind.config.cjs')}" -i "${join(tmp, 'in.css')}" -o "${join(tmp, 'out.css')}" --minify`, { stdio: 'inherit' });
const css = readFileSync(join(tmp, 'out.css'), 'utf8').trim();
if (/<\/style/i.test(css)) throw new Error('CSS 안에 </style 문자열이 있습니다');
html = html.replace(/<style id="twCss">[\s\S]*?<\/style>/, () => `<style id="twCss">${css}</style>`);

writeFileSync('index.html', html);
console.log(`index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · Tailwind CSS ${(css.length / 1024).toFixed(1)} KB 내장`);
