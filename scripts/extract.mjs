import fs from 'fs';
const SRC='C:/Users/Netan/Downloads/index (28).html';
const OUT=process.cwd();  // run from the project root
const lines=fs.readFileSync(SRC,'utf8').split('\n');

// --- DATA (line 84, index 83)
const jsLine=lines[83];
const DATA=JSON.parse(jsLine.slice(jsLine.indexOf('{'), jsLine.lastIndexOf('}')+1));

// --- images: byte-for-byte from base64
let imgBytes=0;
for(const [name,uri] of Object.entries(DATA.imgs)){
  const b64=uri.slice(uri.indexOf(',')+1);
  const buf=Buffer.from(b64,'base64');
  fs.writeFileSync(`${OUT}/img/${name}`,buf);
  imgBytes+=buf.length;
  // integrity: re-encode must equal original payload
  if(buf.toString('base64')!==b64) throw new Error('base64 roundtrip mismatch: '+name);
}

// --- data json
fs.writeFileSync(`${OUT}/data/kb.json`, JSON.stringify(DATA.kb,null,1));
fs.writeFileSync(`${OUT}/data/steps.json`, JSON.stringify({build:DATA.buildSteps,live:DATA.liveSteps},null,1));

// --- highlights: parse the HIGHLIGHTS object literal (lines 86-144 => idx 85..143)
const hlSrc=lines.slice(85,144).join('\n');
const HIGHLIGHTS=eval('('+hlSrc.replace(/^\s*const HIGHLIGHTS=/,'').replace(/;\s*$/,'')+')');
fs.writeFileSync(`${OUT}/data/highlights.json`, JSON.stringify(HIGHLIGHTS,null,1));

// --- integrity report
const kbBack=JSON.parse(fs.readFileSync(`${OUT}/data/kb.json`,'utf8'));
const stepsBack=JSON.parse(fs.readFileSync(`${OUT}/data/steps.json`,'utf8'));
const hlBack=JSON.parse(fs.readFileSync(`${OUT}/data/highlights.json`,'utf8'));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
console.log('CONTENT INTEGRITY');
console.log('  kb deep-equal      :', eq(kbBack,DATA.kb), `(${kbBack.length} items)`);
console.log('  buildSteps         :', eq(stepsBack.build,DATA.buildSteps), `(${stepsBack.build.length})`);
console.log('  liveSteps          :', eq(stepsBack.live,DATA.liveSteps), `(${stepsBack.live.length})`);
console.log('  highlights         :', eq(hlBack,HIGHLIGHTS), `(${Object.keys(hlBack).length} images)`);
console.log('  images written     :', Object.keys(DATA.imgs).length, `(${(imgBytes/1048576).toFixed(2)} MB, base64 roundtrip OK)`);
// every highlight key must have a real image file
const missing=Object.keys(HIGHLIGHTS).filter(k=>!fs.existsSync(`${OUT}/img/${k}`));
console.log('  highlight->img     :', missing.length?('MISSING '+missing):'all resolve');
// every image referenced by steps must exist
const refd=[...DATA.buildSteps,...DATA.liveSteps].flatMap(s=>s.images);
const missRef=refd.filter(f=>!fs.existsSync(`${OUT}/img/${f}`));
console.log('  steps->img         :', missRef.length?('MISSING '+missRef):`all ${refd.length} refs resolve`);
const unused=Object.keys(DATA.imgs).filter(f=>!refd.includes(f));
console.log('  unused images      :', unused.length?unused.join(' '):'none');
