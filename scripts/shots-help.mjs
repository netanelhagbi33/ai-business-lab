import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
for (const [scheme, tag] of [['light',''],['dark','dark-']]) {
  for (const [w,h,size] of [[1440,900,'desktop'],[390,844,'mobile']]) {
    if (scheme==='dark' && size==='mobile') continue;
    const p = await b.newPage({ viewport:{width:w,height:h}, colorScheme: scheme });
    await p.goto('http://localhost:8137/');
    await p.click('.nav[data-view="qa"]');
    await p.waitForSelector('.topic-card', { state:'attached' });
    await p.waitForTimeout(400);

    await p.click('.topic-card[data-category="Earnings & Payouts"]');
    await p.waitForTimeout(400);
    await p.click('#results .qa:first-child .q');          // open one answer
    await p.waitForTimeout(300);
    await p.screenshot({ path:`verify-shots/${tag}${size}-help-topic.png`, fullPage:false });

    await p.fill('#qSearch','how do payouts work');
    await p.click('[data-action="qa-search"]');
    await p.waitForTimeout(400);
    await p.screenshot({ path:`verify-shots/${tag}${size}-help-search.png`, fullPage:false });
    await p.close();
  }
}
await b.close();
console.log('wrote help-center state screenshots');
