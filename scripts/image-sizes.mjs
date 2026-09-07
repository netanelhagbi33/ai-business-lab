/* Reads intrinsic width/height straight from each PNG's IHDR chunk
   and writes data/image-sizes.json, so <img> can reserve exact space
   before a lazy image arrives. */
import fs from 'fs';
const out = {};
for (const f of fs.readdirSync('img').filter(n => n.endsWith('.png'))) {
  const b = fs.readFileSync(`img/${f}`);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG: ' + f);
  if (b.toString('ascii', 12, 16) !== 'IHDR') throw new Error('no IHDR: ' + f);
  out[f] = { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
fs.writeFileSync('data/image-sizes.json', JSON.stringify(out, null, 1));
const vals = Object.values(out);
console.log(`wrote ${vals.length} image sizes`);
console.log('distinct aspect ratios:',
  new Set(vals.map(v => (v.w / v.h).toFixed(3))).size);
Object.entries(out).slice(0, 4).forEach(([k, v]) => console.log(` ${k}  ${v.w}x${v.h}`));
