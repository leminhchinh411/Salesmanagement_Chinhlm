#!/usr/bin/env python3
"""PILOT calculation engine, 10/2026. Run with RAW exports and REV3 master locally.
Dependencies: Python standard library only. Never treats candidate MOQ as official.
"""
import sys,json,zipfile,xml.etree.ElementTree as ET,collections,pathlib
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def rows(path,sheet=1):
 with zipfile.ZipFile(path) as z:
  ss=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   ss=[''.join(t.text or '' for t in si.findall('.//m:t',NS)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
  root=ET.fromstring(z.read(f'xl/worksheets/sheet{sheet}.xml'))
  for row in root.findall('.//m:sheetData/m:row',NS):
   d={}
   for c in row.findall('m:c',NS):
    v=c.find('m:v',NS);inline=c.find('m:is',NS)
    x=v.text if v is not None else ''.join(t.text or '' for t in inline.findall('.//m:t',NS)) if inline is not None else None
    if c.get('t')=='s' and x is not None:x=ss[int(x)]
    d[''.join(t for t in c.get('r') if t.isalpha())]=x
   yield d
def n(v):
 try:return float(v or 0)
 except:return 0
def s(v):return str(v or '').strip()
def run(master,raws,out):
 mr=list(rows(master,3));mcp=collections.defaultdict(set)
 for r in mr[1:]:mcp[s(r.get('D'))].add(s(r.get('A')))
 prod={s(r.get('A')) for r in list(rows(master,4))[1:] if r.get('A')}
 regs=collections.defaultdict(list)
 for r in list(rows(master,8))[1:]:
  if r.get('F') in ('CAT','BRAND'):regs[s(r.get('D'))].append(r.get('F'))
 rules={s(r.get('A')):s(r.get('G')) for r in list(rows(master,6))[1:]}
 for key in ['R001','R002','R003','R004','R005','R007','R008','R009','R010','R018','R019']:
  if rules.get(key)!='CONFIRMED':raise ValueError('Rule not confirmed: '+key)
 counts=collections.Counter();states=collections.Counter();seen=collections.defaultdict(set);outside=collections.Counter();unmapped=collections.Counter();program=collections.Counter();shop_sales=collections.Counter();fingerprints=set();duplicate=0;orders=set();revenue=0
 for path in raws:
  source=list(rows(path));start=next(i for i,r in enumerate(source[:10]) if r.get('G')=='Mã đơn hàng' and r.get('X')=='Mã sản phẩm')
  for r in source[start+1:]:
   if not r.get('G'):continue
   counts['raw_lines']+=1;status=s(r.get('M'));states[status]+=1
   if status.lower() in ('đã hủy','đã huỷ'):counts['cancelled']+=1;continue
   amount=n(r.get('AK'))
   if amount<=0:counts['nonpositive']+=1;continue
   pos,shop,sku,oid=map(s,(r.get('F'),r.get('Q'),r.get('X'),r.get('G')))
   if not all((pos,shop,sku,oid)):counts['missing_key']+=1;continue
   counts['positive']+=1;revenue+=amount;orders.add(oid)
   fp=(oid,shop,sku,s(r.get('AB')),s(r.get('AC')),s(r.get('AG')),s(r.get('AK')),status)
   if fp in fingerprints:duplicate+=1
   fingerprints.add(fp)
   if shop in mcp[pos]:seen[pos].add(shop)
   else:outside[pos]+=1
   if sku not in prod:unmapped[sku]+=amount
   shop_sales[shop]+=amount
   for p in regs.get(shop,[]):program[p]+=amount
 coverage={'schema_version':1,'cutoff_date':'2026-10-16','status':'PILOT','qa_status':'REVIEW_VISIT_MCP','employees':[{'id':p,'mcp':len(v),'positive_order_mcp':len(seen[p])} for p,v in sorted(mcp.items())],'summary':{'mcp_total':sum(map(len,mcp.values())),'positive_order_mcp':sum(map(len,seen.values())),'outside_mcp_lines':sum(outside.values())}}
 cat={'schema_version':1,'cutoff_date':'2026-10-16','status':'PILOT','qa_status':'HOLD_FOCUS_NEW','programs':{p:{'enrollments':sum(p in rr for rr in regs.values()),'actual_after_discount_vnd':round(program[p],2),'customers_with_positive_sales':sum(shop_sales[shop]>0 for shop,rr in regs.items() if p in rr)} for p in ('CAT','BRAND')}}
 audit={'schema_version':1,'cutoff_date':'2026-10-16','status':'PILOT','counts':dict(counts),'statuses':dict(states),'unique_orders':len(orders),'exact_fingerprint_repeats':duplicate,'revenue_AK':round(revenue,2),'missing_skus':dict(unmapped),'outside_mcp':dict(outside),'HOLD':['MOQ-qualified KPI','CAT/BRAND task qualification','growth SKU eligibility','combo']}
 out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
 for name,obj in [('coverage-pilot.json',coverage),('cat-brand-pilot.json',cat),('audit.json',audit)]:(out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'coverage':coverage['summary'],'cat_brand':cat['programs'],'audit':audit},ensure_ascii=False))
if __name__=='__main__':
 if len(sys.argv)<5:sys.exit('Usage: python engine.py MASTER.xlsx RAW_01-15.xlsx RAW_16.xlsx OUTPUT_DIR')
 run(sys.argv[1],sys.argv[2:-1],sys.argv[-1])
