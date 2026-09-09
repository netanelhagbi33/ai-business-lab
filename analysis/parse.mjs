import fs from 'fs';
// proper CSV parse — bodies contain commas, quotes and newlines
function parseCSV(text){
  const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; }
      else field+=c;
    } else {
      if(c==='"') q=true;
      else if(c===','){ row.push(field); field=''; }
      else if(c==='\r'){}
      else if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else field+=c;
    }
  }
  if(field||row.length){ row.push(field); rows.push(row); }
  return rows;
}
const rows=parseCSV(fs.readFileSync('analysis/tickets.csv','utf8'));
const head=rows[0];
const iSub=head.indexOf('subject'), iBody=head.indexOf('body'), iCat=head.indexOf('category');
const tickets=rows.slice(1).filter(r=>r.length>=head.length-2 && (r[iSub]||r[iBody]))
  .map(r=>({subject:(r[iSub]||'').trim(), body:(r[iBody]||'').trim(), category:(r[iCat]||'').trim()}));
fs.writeFileSync('analysis/tickets.json', JSON.stringify(tickets));
console.log('tickets parsed:', tickets.length);
console.log('\nsystem category field:');
const c={}; tickets.forEach(t=>c[t.category||'(blank)']=(c[t.category||'(blank)']||0)+1);
Object.entries(c).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+String(v).padStart(5)+'  '+k));
