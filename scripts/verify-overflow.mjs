/* No view, at any width, may scroll the page horizontally. */
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const VIEWS = ['home','guide-build','guide-live','next-steps','qa','support'];
let pass=0, fail=0;
for (const [w,h] of [[1440,900],[1024,900],[768,900],[390,844],[360,780]]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  await p.goto('http://localhost:8137/');
  await p.waitForSelector('#buildNav .journey-step',{state:'attached'});
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card',{state:'attached'});
  await p.click('.topic-card[data-category="Website & Content"]');   // longest topic
  await p.waitForTimeout(300);
  for (const v of VIEWS) {
    await p.evaluate(id=>{
      document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }, v);
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    const ok = r.doc <= r.win + 1;
    if (ok) pass++; else fail++;
    console.log(`  ${ok?'PASS':'FAIL'}  ${w}px / ${v}${ok?'':`  (content ${r.doc}px > viewport ${r.win}px)`}`);
  }
  await p.close();
}
await b.close();
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) process.exit(1);
