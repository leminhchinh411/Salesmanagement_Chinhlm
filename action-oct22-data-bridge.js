'use strict';
// Data-only bridge for the existing Action Center. Keeps original cards, filters and actions.
(function(){
 let snapshot=null;
 const priorLoad=loadActionRoutes;
 loadActionRoutes=async function(){
  await priorLoad();
  try{
   const r=await fetch('data/action-outlets-20261022.json?v=20261022',{cache:'no-store'});
   if(!r.ok)throw Error('Missing Oct22 customer snapshot');
   const x=await r.json();
   if(x.cutoff_date!=='2026-10-22'||Object.keys(x.outlets||{}).length!==1702)throw Error('Customer snapshot invalid');
   snapshot=x;
   // The existing route master covers 1695 scheduled outlets. Seven new outlets await visit schedules.
   actionPurchases=new Map(Object.entries(x.outlets).map(([id,c])=>[id,c.orders>0]));
   actionPurchaseError='';
  }catch(e){snapshot=null;actionPurchaseError='Customer Oct22: '+e.message;}
 };
 const priorRows=actionRows;
 actionRows=function(){
  return priorRows().map(e=>({...e,customers:e.customers.map(c=>{
   const s=snapshot?.outlets?.[c.id];
   return s?{...c,purchased:s.orders>0,activity:{order_count:s.orders,last_order_date:c.activity?.last_order_date||null}}:c;
  })}));
 };
 const priorCenter=actionCenter;
 actionCenter=function(){
  const html=priorCenter();
  if(!snapshot||!actionRoutes)return html;
  const holder=document.createElement('template');holder.innerHTML=html;
  const divisions=snapshot.divisions;
  holder.content.querySelectorAll('.action-store').forEach(card=>{
   const id=card.querySelector('.action-store-meta span')?.textContent?.trim();
   const c=snapshot.outlets[id];if(!c)return;
   const meta=card.querySelector('.action-store-meta');
   if(meta){
    const item=document.createElement('span');item.textContent='Thực hiện / Chỉ tiêu: '+Math.round(c.actual).toLocaleString('vi-VN')+' / '+Math.round((c.target_raw||0)*1000).toLocaleString('vi-VN')+' đ';meta.appendChild(item);
   }
   const missing=divisions.filter(x=>!(c.bought||[]).includes(x));
   const area=card.querySelector('.action-store-detail')||card.querySelector('summary');
   if(area){
    const note=document.createElement('p');note.style.color='#c62828';note.style.fontWeight='700';note.textContent='Cơ hội: '+(missing.join(', ')||'Đã mua đủ 7 ngành hàng');area.appendChild(note);
   }
   const act=card.querySelector('.action-activity');
   if(act){
    const spans=act.querySelectorAll('span');
    if(spans.length>=2){
     const b=spans[1].querySelector('b');if(b)b.textContent=String(c.orders);
    }
   }
  });
  const src=holder.content.querySelector('.action-source');
  if(src)src.textContent='PILOT · RAW 01–15/10 giữ nguyên, 16–22/10 thay mới · 1.702 MCP REV5 (7 MCP mới chưa có lịch tuyến) · Chương trình khách hàng vẫn theo snapshot cũ/HOLD';
  return holder.innerHTML;
 };
})();