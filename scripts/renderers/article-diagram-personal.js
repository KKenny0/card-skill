const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml } = require('../lib/escape');
const { analyze } = require('../lib/personal-diagram');
const { getDesign, resolveDesignNameForInput } = require('../lib/designs');
const esc = text => escapeHtml(String(text || '')).replace(/\n/g, '<br>');
const fail = message => { throw new Error(`Personal diagram content_fit: ${message}; split the explanation or shorten only with permission to compress. Font size and content were preserved.`); };

// Geometry is a contract-specific reservation, never an inferred topic template.
function candidates(g) {
  const { kind, ns, order, children, root } = g;
  const boxes = [], lines = [], labels = [];
  const box = (i,x,y,w,h=110) => boxes.push({i,x,y,w,h});
  const line = (points, arrow=false) => lines.push({points,arrow});
  const label = (text,x,y,w,h=46) => { if (text) labels.push({text,x,y,w,h}); };
  const edgeText = (a,b) => g.rs.find(r => r.from === ns[a].id && r.to === ns[b].id)?.label || '';
  const shared = g.rs[0]?.label;
  if (kind === 'exchange') {
    const [a,b,c] = order;
    box(a,0,45,235,175); box(b,737,45,235,175); box(c,0,300,972,135);
    label(edgeText(a,b),245,0,482,50); line([[245,65],[727,65]],true);
    label(edgeText(b,a),245,140,482,50); line([[727,205],[245,205]],true);
    label(edgeText(b,c),0,245,972,45); line([[0,295],[972,295]]);
  } else if (kind === 'convergence') {
    const src = order.slice(0,-1), rows = Math.ceil(src.length / 2), height = 310 / rows;
    src.forEach((i,k) => box(i,(k%2)*500,Math.floor(k/2)*height,472,height-6));
    label(shared,280,312,412); line([[16,325],[16,360],[956,360],[956,325]]);
    box(order.at(-1),0,375,972,75); boxes.at(-1).inline=true;
  } else if (kind === 'tension') {
    const [a,b,c] = order;
    box(a,0,90,320,220); box(b,652,90,320,220); box(c,346,90,280,220);
    line([[334,65],[334,325]]); line([[638,65],[638,325]]);
    label(edgeText(a,c),0,340,450,95); label(edgeText(b,c),522,340,450,95);
  } else if (kind === 'cycle') {
    const coords = order.length === 4 ? [[0,0],[652,0],[652,290],[0,290]] : [[0,0],[652,0],[326,290]];
    order.forEach((i,k) => box(i,...coords[k],320,135));
    line([[340,60],[632,60]],true);
    if (order.length === 4) {
      line([[812,145],[812,275]],true); line([[632,355],[340,355]],true); line([[160,275],[160,145]],true);
      label(edgeText(order[0],order[1]),335,0,302); label(edgeText(order[1],order[2]),490,185,300);
      label(edgeText(order[2],order[3]),335,390,302); label(edgeText(order[3],order[0]),180,185,300);
    } else {
      line([[812,145],[812,240],[486,240],[486,275]],true); line([[306,355],[160,355],[160,145]],true);
      label(edgeText(order[0],order[1]),335,0,302); label(edgeText(order[1],order[2]),490,175,300); label(edgeText(order[2],order[0]),180,185,300);
    }
  } else if (kind === 'timeline') {
    // The first candidate uses horizontal slots; measured overflow selects rows.
    if (ns.length <= 3) {
      const w = 972/ns.length;
      order.forEach((i,k) => box(i,k*w+8,75,w-16,250));
      line([[20,55],[952,55]]); order.forEach((_,k)=>line([[k*w+w/2,48],[k*w+w/2,63]])); label(shared,0,365,972);
    } else return [timelineRows(g)];
  } else {
    // Allocate every subtree its own horizontal interval. Deep long labels fail
    // rather than borrowing another subtree's space and obscuring parentage.
    const leaves = i => children[i].length ? children[i].reduce((n,c) => n+leaves(c),0) : 1;
    const depth = i => children[i].length ? 1+Math.max(...children[i].map(depth)) : 1;
    const levels = depth(root); if (levels > 4) fail('hierarchy exceeds four levels');
    const step = 400/levels;
    const place = (i,left,width,level) => {
      const y = level*step; box(i,left+8,y,width-16,step-26);
      let offset=left;
      for (const c of children[i]) {
        const cw = width*leaves(c)/leaves(i), cy=(level+1)*step;
        line([[left+width/2,y+step-20],[left+width/2,cy-10],[offset+cw/2,cy-10],[offset+cw/2,cy-2]]);
        place(c,offset,cw,level+1); offset+=cw;
      }
    }; place(root,0,972,0); label(shared,0,410,972);
  }
  const result = {boxes,lines,labels,name:kind};
  return kind === 'timeline' ? [result,timelineRows(g)] : [result];
}
function timelineRows(g) {
  const step=420/g.order.length;
  return {name:'timeline-vertical',boxes:g.order.map((i,k)=>({i,x:0,y:k*step,w:972,h:step-10,row:true})),lines:[{points:[[245,0],[245,410]]},...g.order.map((_,k)=>({points:[[238,k*step+22],[252,k*step+22]]}))],labels:g.rs[0]?.label?[{text:g.rs[0].label,x:0,y:420,w:972,h:40}]:[]};
}
function css(design) {
  const fonts=pathToFileURL(path.resolve(__dirname,'../../assets/fonts')).href;
  return `@import url('${fonts}/local-fonts.css');@font-face{font-family:XiangcuiDengcusong;src:url('${fonts}/XiangcuiDengcusong.ttf')}*{box-sizing:border-box}html,body{margin:0;width:1080px;background:${design.canvas};color:${design.ink};font-family:XiangcuiDengcusong,'DM Serif Display',serif}.page{width:1080px;height:720px;padding:36px 54px;position:relative}h1{font-size:46px;line-height:1.25;font-weight:400;margin:0;padding-left:20px;border-left:2px solid ${design.accent}}.stage{position:absolute;left:54px;top:140px;width:972px;height:460px}.node{position:absolute;text-align:center}.node h2{font-size:36px;line-height:1.3;font-weight:400;margin:0;white-space:pre-line;word-break:normal;overflow-wrap:normal}.node p{font-size:36px;line-height:1.3;margin:8px 0 0;color:${design.inkMuted};white-space:pre-line}.row{display:grid;grid-template-columns:220px 1fr;gap:48px;text-align:left;align-items:start}.row h2{text-align:right;color:${design.accent}}.row p{margin:0}.edge-label{position:absolute;font-size:30px;line-height:1.3;text-align:center;white-space:pre-line;color:${design.inkMuted}}.qualification{position:absolute;left:54px;top:620px;width:972px;border-top:1px solid ${design.hairline};padding-top:12px;font-size:36px;line-height:1.3;margin:0;color:${design.inkMuted}}svg{position:absolute;inset:0;width:972px;height:460px}.wire{fill:none;stroke:${design.inkMuted};stroke-width:2}.measure{position:static!important;margin-bottom:10px}.probe{display:inline-block;white-space:pre;font-size:36px;line-height:1.3}.probe.title{font-size:46px}.measure h1{width:972px}.node:lang(en){font-family:'DM Serif Display',serif}`;
}
function nodeHtml(n,b,measureId='') {
  return `<div class="node${b.row?' row':''}${measureId?' measure':''}" ${measureId?`data-measure-id="${measureId}"`:''} style="left:${b.x}px;top:${b.y}px;width:${b.w}px;${b.inline?'display:flex;justify-content:center;gap:24px;align-items:baseline;':''}"><h2>${esc(n.label)}</h2>${n.note?`<p>${esc(n.note)}</p>`:''}</div>`;
}
function documentHtml(styles,body) { return `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body>${body}</body></html>`; }
function render(input,htmlPath,ctx = {}) {
  const g=analyze(input), plans=candidates(g), styles=css(getDesign(resolveDesignNameForInput(input,'stripe')))+'h1.measure{width:972px}';
  if (typeof ctx.measure !== 'function') fail('browser measurement adapter is required');
  const qualification=[input.sentence,input.subtitle,input.caption].filter(Boolean).join(' · ');
  const credit=[input.source,input.brand_name].filter(Boolean).join(' · ');
  const hasCredit=Boolean(credit||input.logo);
  let probes='<h1 class="measure" data-measure-id="heading">'+esc(input.formula)+'</h1><p class="qualification measure" data-measure-id="footer">'+esc(qualification)+'</p>';
  if(hasCredit) probes+=`<div class="measure" data-measure-id="credit" style="width:${input.logo?920:972}px;font-size:24px;line-height:1.3">${esc(credit)}</div>`;
  const tokens = text => String(text||'').match(/[A-Za-z0-9_]+|[^\s]/gu)||[];
  plans.forEach((p,k)=>{
    p.boxes.forEach((b,j)=>{
      probes+=nodeHtml(g.ns[b.i],b,`p${k}n${j}`);
      tokens(g.ns[b.i].label).forEach((t,z)=>{probes+=`<span class="probe" data-measure-id="p${k}n${j}w${z}">${esc(t)}</span>`;});
      tokens(g.ns[b.i].note).forEach((t,z)=>{probes+=`<span class="probe" data-measure-id="p${k}n${j}v${z}">${esc(t)}</span>`;});
    });
    p.labels.forEach((l,j)=>{probes+=`<div class="edge-label measure" style="width:${l.w}px" data-measure-id="p${k}e${j}">${esc(l.text)}</div>`;});
  });
  const measurePath=htmlPath.replace(/\.html$/i,'')+'.measure.html';
  fs.writeFileSync(measurePath,documentHtml(styles,probes));
  const m=ctx.measure({htmlPath:measurePath,captureWidth:1080,captureHeight:720,fullpage:false});
  const height=(id,max)=>Number.isFinite(m?.[id]?.height)&&m[id].height<=max+0.5;
  if (!height('heading',90)||!height('footer',hasCredit?64:76)|| (hasCredit&&!height('credit',32))) fail('heading or qualification exceeds its reserved area');
  const chosen=plans.find((p,k)=>p.boxes.every((b,j)=>{
    const n=g.ns[b.i];
    const widths=(text,prefix,limit)=>tokens(text).every((_,z)=>Number.isFinite(m?.[prefix+z]?.width)&&m[prefix+z].width<=limit);
    return height(`p${k}n${j}`,b.h)&&widths(n.label,`p${k}n${j}w`,b.row?220:b.w)&&widths(n.note,`p${k}n${j}v`,b.row?704:b.w);
  })&&p.labels.every((l,j)=>height(`p${k}e${j}`,l.h||46)));
  if (!chosen) fail('labels, notes or subtrees exceed the available width/height');
  const lines=chosen.lines.map(l=>`<polyline class="wire" points="${l.points.map(p=>p.join(',')).join(' ')}"${l.arrow?' marker-end="url(#tip)"':''}/>`).join('');
  const body=`<div class="page" data-card-mode="article-diagram" data-personal-layout="${g.kind}" data-personal-orientation="${chosen.name}"><h1>${esc(input.formula)}</h1><div class="stage"><svg aria-hidden="true" viewBox="0 0 972 460"><defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor"/></marker></defs>${lines}</svg>${chosen.boxes.map(b=>nodeHtml(g.ns[b.i],b)).join('')}${chosen.labels.map(l=>`<div class="edge-label" style="left:${l.x}px;top:${l.y}px;width:${l.w}px">${esc(l.text)}</div>`).join('')}</div><p class="qualification">${esc(qualification)}</p>${hasCredit?`<footer class="colophon" style="position:absolute;left:54px;top:684px;width:972px;display:flex;gap:16px;align-items:center;font-size:24px;line-height:1.3">${input.logo?`<img style="height:28px;width:auto" alt="logo" src="${esc(pathToFileURL(path.resolve(input.logo)).href)}">`:""}<span>${esc(credit)}</span></footer>`:""}</div>`;
  fs.writeFileSync(htmlPath,documentHtml(styles,body));
  return {htmlPath,captureWidth:1080,captureHeight:720,fullpage:false};
}
module.exports={render,candidates};
