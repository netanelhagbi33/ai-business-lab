import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1440, height: 980 } });
await p.goto('http://localhost:8137/');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.click('.nav[data-view="qa"]');
await p.waitForSelector('.topic-card', { state: 'attached' });
await p.click('.topic-card[data-category="Earnings & Payouts"]');
await p.waitForTimeout(300);

await p.click('#results .qa:nth-child(1) .q');
await p.waitForTimeout(250);
await p.screenshot({ path: 'verify-shots/funnel-1-article.png' });

await p.click('#results .qa:nth-child(1) [data-action="article-no"]');
await p.waitForTimeout(300);
await p.screenshot({ path: 'verify-shots/funnel-2-try-one-more.png' });

await p.click('#results .qa:nth-child(2) .q');
await p.waitForTimeout(250);
await p.click('#results .qa:nth-child(2) [data-action="article-no"]');
await p.waitForTimeout(300);
await p.locator('#results .qa:nth-child(2) .article-outcome-box').scrollIntoViewIfNeeded();
await p.screenshot({ path: 'verify-shots/funnel-3-unlocked.png' });

await p.click('[data-action="open-ticket"]');
await p.waitForSelector('#modal.show #tMessage');
await p.screenshot({ path: 'verify-shots/funnel-4-prefilled-form.png' });
await p.fill('#tMessage', 'My payout has been pending for 12 days.');
await p.click('#modal [data-action="submit-ticket"]');
await p.waitForTimeout(500);
await p.screenshot({ path: 'verify-shots/funnel-5-tickets-tab.png' });
await b.close();
console.log('wrote 5 funnel screenshots');
