import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {validate}=require('./lib/schema');
const renderer=require('./renderers/article-diagram');
const {analyze}=require('./lib/personal-diagram');
const {candidates}=require('./renderers/article-diagram-personal');
export function verifyPersonalDiagrams() {
  const fixtures=JSON.parse(fs.readFileSync(path.join(root,'evals/fixtures/article-diagram-personal.json')));
  const {artifactContractProjection}=require('./lib/visual-job');
  const contract=fixtures.timeline;
  const publicSchema=JSON.parse(fs.readFileSync(path.join(root,'schemas/article-diagram.json'),'utf8'));
  for (const field of ['formula','sentence']) {
    assert.ok(publicSchema.required.includes(field));
    assert.equal(publicSchema.properties[field].minLength,1);
    assert.equal(publicSchema.properties[field].pattern,'\\S');
    for (const blank of ['', '   ']) assert.equal(validate({...contract,[field]:blank}).valid,false);
  }
  const projection=artifactContractProjection(contract,1);
  assert.equal(projection.formula,contract.formula);
  assert.equal(projection.sentence,contract.sentence);
  assert.notDeepEqual(projection,artifactContractProjection({...contract,sentence:'Changed scope'},1),'visible scope must change artifact identity');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'personal-diagram-'));
  const run=(script,args)=>{
    const r=spawnSync(process.execPath,[path.join(root,script),...args],{encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+'\n'+r.stderr);return r.stdout;
  };
  const ctx={measure:s=>JSON.parse(run('assets/capture4k.js',[s.htmlPath,'--measure',String(s.captureWidth),String(s.captureHeight),'1']))};
  for(const [name,input] of Object.entries(fixtures)) {
    if(name==='cycle-branch') { assert.equal(validate(input).valid,false); continue; }
    assert.equal(validate(input).valid,true,JSON.stringify(validate(input)));
    const file=path.join(dir,name+'.html');
    if(name==='hierarchy-dense') {assert.throws(()=>renderer.render(input,file,ctx),/content_fit/);continue;}
    const out=renderer.render(input,file,ctx);
    const report=JSON.parse(run('scripts/check-output.mjs',['--html',file,'--width','1080','--height','720','--skip-png','--json']));
    assert.equal(report.pass,true,name);
    const html=fs.readFileSync(file,'utf8');assert.match(html,/data-personal-layout/);
    for(const n of input.structure.nodes) assert.ok(html.includes(n.label.replaceAll('\n','<br>')),`${name} lost label ${n.id}`);
    if(name==='timeline-dense')assert.match(html,/timeline-vertical/);
    assert.equal(out.captureHeight,720);
  }
  const credited={...fixtures.timeline,sentence:'条件有效',subtitle:'保留条件',caption:'来源说明',source:'示例来源',brand_name:'用户署名'};
  assert.notDeepEqual(artifactContractProjection(credited,1),artifactContractProjection({...credited,source:'另一来源'},1),'source must bind to artifact identity');
  const creditedPath=path.join(dir,'credited.html'); renderer.render(credited,creditedPath,ctx);
  const creditedHtml=fs.readFileSync(creditedPath,'utf8');
  for(const text of ['条件有效','保留条件','来源说明','示例来源','用户署名']) assert.ok(creditedHtml.includes(text),'lost optional visible content '+text);
  assert.equal(JSON.parse(run('scripts/check-output.mjs',['--html',creditedPath,'--width','1080','--height','720','--skip-png','--json'])).pass,true);
  for(const kind of ['exchange','convergence','tension','cycle','timeline','hierarchy']) {
    const x=structuredClone(fixtures[kind]);x.structure.relations.push(x.structure.relations[0]);assert.equal(validate(x).valid,false,kind+' duplicate edge');
    const y=structuredClone(fixtures[kind]);y.render_plan='auto';assert.equal(validate(y).valid,false,kind+' auto');
  }
  // A cycle label must never occupy a return wire's rectangle.
  for (const plan of candidates(analyze(fixtures.cycle))) for (const label of plan.labels) {
    for (const wire of plan.lines) for (let i=1;i<wire.points.length;i++) {
      const [a,b]=[wire.points[i-1],wire.points[i]];
      const crosses=a[0]===b[0]
        ? a[0]>label.x && a[0]<label.x+label.w && Math.max(a[1],b[1])>label.y && Math.min(a[1],b[1])<label.y+label.h
        : a[1]>label.y && a[1]<label.y+label.h && Math.max(a[0],b[0])>label.x && Math.min(a[0],b[0])<label.x+label.w;
      assert.equal(crosses,false,'cycle wire crosses label');
    }
  }
  for (const kind of ['timeline','exchange']) {
    const input=structuredClone(fixtures[kind]); input.structure.nodes.reverse();
    const graph=analyze(input), original=analyze(fixtures[kind]);
    assert.deepEqual(graph.order.map(i=>graph.ns[i].id),original.order.map(i=>original.ns[i].id),kind+' topology order');
  }
  const disconnected=structuredClone(fixtures.hierarchy);disconnected.structure.relations[0]={from:'index',to:'key'};assert.equal(validate(disconnected).valid,false);
  const long=structuredClone(fixtures.timeline);long.sentence='说明'.repeat(100);assert.throws(()=>renderer.render(long,path.join(dir,'long.html'),ctx),/content_fit/);
  assert.throws(()=>renderer.render(fixtures.cycle,path.join(dir,'no-measure.html')),/measurement adapter/);
  fs.rmSync(dir,{recursive:true,force:true});
  console.log('Personal diagram: seven measured layouts, two boundary fixtures and malformed contracts passed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))verifyPersonalDiagrams();
