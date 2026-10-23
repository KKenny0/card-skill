import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {validate}=require('./lib/schema'),renderer=require('./renderers/studio-composition'),{chromium}=require('playwright');
export async function verifyInfographNotes({outputDir}={}) {
 const dir=outputDir?path.resolve(outputDir):fs.mkdtempSync(path.join(os.tmpdir(),'infograph-notes-'));
 if(outputDir)fs.mkdirSync(dir,{recursive:false});
 let browser;
 try{
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1080,height:1500}}),texts={},jobs={};
  for(const name of ['a2a','cursor','metrics','dense','overview','loading','interaction','stability']){
   const file=path.join(root,'evals/fixtures/infograph-comparison-notes',name+'.json'),job=JSON.parse(fs.readFileSync(file,'utf8'));jobs[name]=job;
   const input=job.outputs[0].render_contract;
   const run=spawnSync(process.execPath,[path.join(root,'scripts/render-job.mjs'),'--input',file,'--output-dir',path.join(dir,name),'--candidate','--json'],{encoding:'utf8',env:{...process.env,CARD_SKILL_DISABLE_UPDATE_CHECK:'1',CARD_SKILL_DISABLE_AUTO_UPDATE:'1'}});
   assert.equal(run.status,0,run.stdout+run.stderr);
   const html=path.join(dir,name+'.html');renderer.render(input,html);await page.goto(pathToFileURL(html).href);await page.evaluate(()=>document.fonts.ready);
   texts[name]=(await page.locator('main').innerText()).replace(/\s/g,'');
   assert.equal(await page.locator('.page').getAttribute('data-card-variant'),'comparison-notes');
   assert.equal(await page.locator('.grain').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='none')),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>1080),false);
   assert.equal(await page.locator('.unit,.reading-unit').evaluateAll(es=>es.every(e=>{const r=document.createRange();r.selectNodeContents(e);return new Set([...r.getClientRects()].map(x=>Math.round(x.y))).size<=1})),true,'Protected phrase wraps');
   if(['metrics','cursor'].includes(name))assert.equal(await page.locator(name==='metrics'?'.threshold':'.delta').evaluateAll(es=>new Set(es.map(e=>getComputedStyle(e).fontSize)).size),1,'Peer metrics must retain equal size');
   if(['loading','interaction','stability'].includes(name))assert.match(texts[name],/返回第1页总览/);
  }
  for(const term of ['版本与支持','业务口径仍须约定','跨公司不排除MCP'])assert.ok(texts.a2a.includes(term));
  for(const term of ['7%','66%','60%','20%','不同口径不能相加','真实流量A/B验证'])assert.ok(texts.cursor.includes(term));
  for(const term of ['2.5s','200ms','0.1','第75百分位','移动端与桌面端分开统计','不是实测成绩'])assert.ok(texts.metrics.includes(term));
  // Split detail evidence must remain visible, not merely attached to its contract.
  for(const name of ['loading','interaction','stability'])for(const unit of jobs[name].source_units.filter(u=>u.id.startsWith('action-'))){
   const source=unit.excerpt.replace(/\s/g,'').replace(/。+/g,'。');
   for(const sentence of source.split('。').filter(Boolean))assert.ok(texts[name].includes(sentence),`${name}: lost ${sentence}`);
  }
  for(const term of ['资源发现','图片体积','长任务拆分','非关键工作延后','布局读写调整','媒体空间预留','第2页','第3页','第4页'])assert.ok(texts.overview.includes(term));
  const input=jobs.metrics.outputs[0].render_contract;
  for(const variant of ['unknown',42])assert.equal(validate({...input,variant}).valid,false);
  assert.equal(validate({...input,custom_css:''}).valid,false);
  const implicit={...input};delete implicit.variant;assert.equal(validate(implicit).valid,true);
  const explicitPath=path.join(dir,'explicit.html'),implicitPath=path.join(dir,'implicit.html');renderer.render(input,explicitPath);renderer.render(implicit,implicitPath);assert.equal(fs.readFileSync(explicitPath,'utf8'),fs.readFileSync(implicitPath,'utf8'));
  assert.throws(()=>renderer.render({...input,variant:'unknown'},implicitPath),/comparison-notes/);
  const shapes=[];for(const tone of ['reflective','sharp','warm','technical']){const f=path.join(dir,'tone-'+tone+'.html');renderer.render({...input,tone},f);shapes.push(fs.readFileSync(f,'utf8').replace(/data-card-design="[^"]+"/g,'data-card-design="COLOR"').replace(/#[0-9a-f]{3,8}\b/gi,'#COLOR'));}for(const shape of shapes.slice(1))assert.equal(shape,shapes[0]);
  console.log('Infograph notes: eight checked PNGs, split evidence/navigation, metric scopes, phrase wrapping, default contract and palette geometry passed.');
 }finally{if(browser)await browser.close();if(!outputDir)fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const i=process.argv.indexOf('--output-dir');await verifyInfographNotes({outputDir:i<0?undefined:process.argv[i+1]});}
