/* ============================================================
   Build the whole site into one HTML file.

   For review only. The team needs to walk the page and approve the
   flow, and there is no server to put it on, so everything has to
   travel in a single file: seven stylesheets inlined, five JSON
   files embedded, twenty-nine screenshots as data: URIs, and the
   eight ES modules bundled.

   The modules are NOT concatenated. Concatenation merges every
   module's top-level scope, so two files that both define `norm`
   silently become one. Each module is wrapped in its own function
   and registered by name instead, which keeps the scopes apart and
   makes a missing export an error rather than an undefined.

   Two functions are swapped for the offline build, and both exist
   precisely so this build can swap them:
     loadJSON  — fetch() has nothing to fetch
     imgSrc    — there is no img/ directory

   The output is <body> content plus one <style> and one <script>,
   with no <html>/<head>/<body> wrapper, because the host that
   serves it supplies its own.

   Run: node scripts/build-single.mjs
   ============================================================ */
import fs from 'fs';

/* Git checks these out with CRLF on Windows. The exact-string swaps below
   would miss every one of them, so normalise on the way in. */
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const CSS = ['tokens', 'base', 'layout', 'components', 'views', 'journey', 'qa'];
const MODULES = ['dom', 'store', 'router', 'highlights', 'spotlight',
                 'journey', 'support', 'qa', 'main'];
const DATA = ['steps', 'highlights', 'image-sizes', 'kb', 'categories'];
const ENTRY = 'main.js';

const out = [];
const say = m => { out.push(m); console.log(m); };

/* ---------- stylesheets ---------------------------------- */
const css = CSS.map(n => `/* ===== css/${n}.css ===== */\n`
                       + read(`css/${n}.css`)).join('\n');
say(`css      ${CSS.length} files, ${(css.length / 1024).toFixed(0)} KB`);

/* ---------- screenshots ---------------------------------- */
const images = {};
for (const file of fs.readdirSync('img').filter(f => f.endsWith('.png'))) {
  images[file] = 'data:image/png;base64,' + fs.readFileSync(`img/${file}`).toString('base64');
}
const imgBytes = Object.values(images).reduce((n, s) => n + s.length, 0);
say(`images   ${Object.keys(images).length} files, ${(imgBytes / 1048576).toFixed(2)} MB as data URIs`);

/* ---------- data ----------------------------------------- */
const data = {};
for (const n of DATA) data[`data/${n}.json`] = JSON.parse(read(`data/${n}.json`));
say(`data     ${DATA.length} files`);

// Every screenshot the guides reference must have travelled with them.
const referenced = [...data['data/steps.json'].build, ...data['data/steps.json'].live]
  .flatMap(s => s.images);
const missing = referenced.filter(f => !images[f]);
if (missing.length) { console.log('MISSING images: ' + missing.join(', ')); process.exit(1); }

/* ---------- modules -------------------------------------- */
/**
 * Rewrite one ES module into a registration call.
 *
 * Handles the four export forms this codebase uses and both import
 * spellings (single line, and the braces spread over several). Anything
 * it does not recognise is left alone and will fail loudly at runtime
 * rather than being quietly dropped.
 */
function wrap(name, src) {
  let s = src;
  const exports = [];

  // import { a, b } from './x.js';   (including multi-line braces)
  s = s.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\/([\w-]+\.js)';/g,
                (_, names, from) => `const {${names}} = __req('${from}');`);

  const leftover = s.match(/^\s*import\s.+$/m);
  if (leftover) { console.log(`  unhandled import in ${name}: ${leftover[0].trim()}`); process.exit(1); }

  // export { a, b };
  s = s.replace(/export\s*\{([^}]*)\};/g, (_, names) => {
    names.split(',').map(x => x.trim()).filter(Boolean).forEach(x => exports.push(x));
    return '';
  });

  // export function f / export async function f / export const c
  s = s.replace(/export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
                (_, async_, id) => { exports.push(id); return `${async_ || ''}function ${id}`; });
  s = s.replace(/export\s+const\s+([A-Za-z_$][\w$]*)/g,
                (_, id) => { exports.push(id); return `const ${id}`; });

  const still = s.match(/^\s*export\s.+$/m);
  if (still) { console.log(`  unhandled export in ${name}: ${still[0].trim()}`); process.exit(1); }

  const unique = [...new Set(exports)];
  return { code: `__def('${name}', () => {\n${s}\nreturn { ${unique.join(', ')} };\n});`,
           exports: unique };
}

const parts = [];
for (const m of MODULES) {
  const file = `${m}.js`;
  let src = read(`js/${file}`);

  if (file === 'dom.js') {
    const from = `export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(\`Could not load \${path} (HTTP \${res.status})\`);
  return res.json();
}`;
    if (!src.includes(from)) { console.log('loadJSON does not look as expected'); process.exit(1); }
    src = src.replace(from, `export async function loadJSON(path) {
  // Single-file build: the JSON travelled with the page.
  const d = window.__ABL_DATA[path];
  if (!d) throw new Error(\`Could not load \${path}\`);
  return d;
}`);
  }

  if (file === 'highlights.js') {
    const from = `export const imgSrc = file => IMG_DIR + file;`;
    if (!src.includes(from)) { console.log('imgSrc does not look as expected'); process.exit(1); }
    src = src.replace(from,
      `export const imgSrc = file => window.__ABL_IMG[file] || (IMG_DIR + file);`);
  }

  const { code, exports } = wrap(file, src);
  parts.push(code);
  say(`module   ${file.padEnd(14)} ${exports.length} exports`);
}

/* ---------- page shell ----------------------------------- */
const html = read('index.html');
const body = html.match(/<body>([\s\S]*)<\/body>/);
if (!body) { console.log('could not find <body> in index.html'); process.exit(1); }

const markup = body[1]
  .replace(/<script type="module" src="js\/main\.js"><\/script>/, '')
  .trim();
if (/<script[^>]*src=/.test(markup)) { console.log('a script src survived the strip'); process.exit(1); }

const page = `<title>AI Business Lab — Start Here</title>
<style>
${css}
</style>

${markup}

<script>
window.__ABL_DATA = ${JSON.stringify(data)};
window.__ABL_IMG = ${JSON.stringify(images)};
</script>

<script>
/* Modules, each in its own scope, resolved by name and memoised. */
const __mods = {}, __cache = {};
const __def = (name, fn) => { __mods[name] = fn; };
const __req = name => {
  if (!(name in __mods)) throw new Error('no such module: ' + name);
  return __cache[name] ??= __mods[name]();
};

${parts.join('\n\n')}

__req('${ENTRY}');
</script>
`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/review.html', page);

/* The same page with the wrapper a host would supply. Two reasons it exists:
   it can be opened straight off disk or dropped on any static host, and it is
   what the smoke test loads — testing the body-only file in a browser leaves
   the charset to guesswork, which turns every em dash into mojibake and would
   have hidden that the published page is fine. */
fs.writeFileSync('dist/standalone.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230aa77c'/%3E%3Ctext x='16' y='23' font-size='19' text-anchor='middle' fill='white' font-family='system-ui,sans-serif'%3E%E2%AC%A1%3C/text%3E%3C/svg%3E">
<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
${page}</body>
</html>
`);

/* A folder holding exactly one file, named index.html.

   Static hosts serve index.html at the root, so dragging this folder gives
   a clean address instead of one ending in /standalone.html. It is the
   thing to upload; dist/ itself also holds the body-only build, which
   would be served as a second, broken page. */
fs.mkdirSync('dist/site', { recursive: true });
fs.copyFileSync('dist/standalone.html', 'dist/site/index.html');

const mb = Buffer.byteLength(page) / 1048576;
say(`\nwrote dist/review.html — ${mb.toFixed(2)} MB`);
if (mb > 15) { console.log('too large to publish (16 MB limit)'); process.exit(1); }
say(`${(15 - mb).toFixed(2)} MB under the limit`);
