import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {comicJob} from '../evals/fixtures/comic-moment-notes/jobs.mjs';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {validate}=require('./lib/schema'),{validateVisualJob,sha256Bytes}=require('./lib/visual-job');
const renderer=require('./renderers/studio-composition'),{chromium}=require('playwright');
const {candidateDirectorySha256}=require('./lib/candidate-snapshot');
const env={...process.env,CARD_SKILL_DISABLE_UPDATE_CHECK:'1',CARD_SKILL_DISABLE_AUTO_UPDATE:'1'};
export async function verifyComicNotes({outputDir}={}){
 const dir=outputDir?path.resolve(outputDir):fs.mkdtempSync(path.join(os.tmpdir(),'comic-notes-'));
 fs.mkdirSync(dir,{recursive:true});let browser;
 const run=(script,args)=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{env,encoding:'utf8'});
 try{
 browser=await chromium.launch();const page=await browser.newPage();
 for(const name of ['rousseau','uncertainty','interaction']){
  const job=comicJob(root,name),input=job.outputs[0].render_contract;
  const originalArt=input.comic_art.path;input.comic_art.path=path.join(dir,name+'-input.png');fs.copyFileSync(originalArt,input.comic_art.path);
  assert.equal(validateVisualJob(job).valid,true,validateVisualJob(job).errors.join('\n'));
  const jobPath=path.join(dir,name+'.job.json');fs.writeFileSync(jobPath,JSON.stringify(job,null,2));
  const candidate=path.join(dir,name);const result=run('render-job.mjs',['--input',jobPath,'--output-dir',candidate,'--candidate','--json']);assert.equal(result.status,0,result.stdout+result.stderr);
  const receipt=JSON.parse(fs.readFileSync(path.join(candidate,name+'.receipt.json')));
  assert.equal(receipt.comic_art_snapshot.sha256,sha256Bytes(fs.readFileSync(input.comic_art.path)));
  assert.equal(receipt.media_snapshots.length,0);assert.equal(receipt.cover_art_snapshot,null);
  assert.equal(receipt.png.width,2160);assert.equal(receipt.png.height,2880);
  const manifest=JSON.parse(fs.readFileSync(path.join(candidate,'candidate-manifest.json')));
  await page.goto(pathToFileURL(path.join(candidate,manifest.artifacts[0].checked_html)).href);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.comic-art').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  const before=await page.locator('.comic-art').evaluate(i=>({src:i.src,rect:JSON.stringify(i.getBoundingClientRect().toJSON())}));
  {
   await page.addStyleTag({content:'.title-area,.ending,.colophon,.scene-caption{visibility:hidden!important}'});
   assert.deepEqual(await page.locator('.comic-art').evaluate(i=>({src:i.src,rect:JSON.stringify(i.getBoundingClientRect().toJSON())})),before,'Silent review changed artwork or geometry');
  }
  await page.screenshot({path:path.join(dir,name+'-silent.png')});
  if(name==='rousseau'){
   const implicit=path.join(dir,'implicit.html'),explicit=path.join(dir,'explicit.html');
   renderer.render(input,implicit);renderer.render({...input,variant:'moment-notes'},explicit);assert.equal(fs.readFileSync(implicit,'utf8'),fs.readFileSync(explicit,'utf8'));
   for(const change of [{variant:'classic'},{comic_art:null},{comic_art:{...input.comic_art,alt:''}},{comic_art:{...input.comic_art,path:'https://example.com/a.png'}},{content_html:'<p>missing</p>'},{content_html:'{{COMIC_ART}}{{COMIC_ART}}'},{content_html:'<div title="{{COMIC_ART}}"></div>'},{content_html:'<!-- > {{COMIC_ART}} < -->'},{content_html:'<style>{{COMIC_ART}}</style>'},{content_html:'<div title=">{{COMIC_ART}}<"></div>'},{comic_art:{...input.comic_art,extra:true}},{comic_art:{...input.comic_art,path:dir}}])assert.equal(validate({...input,...change}).valid,false);
   assert.equal(validate({...input,comic_art:{...input.comic_art,path:'relative.png'}}).valid,false);
   const vector={...input};delete vector.comic_art;vector.content_html='<svg viewBox="0 0 600 600" aria-label="vector test"><circle cx="300" cy="300" r="80"/></svg>';assert.equal(validate(vector).valid,true);
   assert.equal(validateVisualJob({...job,schema_version:2}).valid,false);
   const shapes=[];for(const tone of ['reflective','sharp','warm','technical']){renderer.render({...input,tone},explicit);shapes.push(fs.readFileSync(explicit,'utf8').replace(/data-card-design="[^"]+"/g,'data-card-design="COLOR"').replace(/#[0-9a-f]{3,8}\b/gi,'#COLOR'));}for(const shape of shapes)assert.equal(shape,shapes[0]);
   // Synthetic protocol review only, never a claim of visual comprehension.
   const review={schema_version:1,job_id:job.job_id,output_id:name,artifact_index:1,attempt:0,...Object.fromEntries(['visual_job_sha256','artifact_plan_sha256','artifact_contract_sha256','render_contract_sha256'].map(k=>[k,receipt[k]])),png_sha256:receipt.png.sha256,checker_pass:true,metaphor_required:receipt.metaphor_required,scores:{message_clarity:4,visual_hierarchy:4,cognitive_load:4,style_consistency:4,metaphor_quality:4},overall_score:8,issues:[],verdict:'pass'};
   for(const [mutation,change] of [['missing',r=>{r.comic_art_snapshot=null}],['digest',r=>{r.comic_art_snapshot.sha256='a'.repeat(64)}],['metadata',r=>{r.comic_art_snapshot.width+=1}]]) {
   const tampered=path.join(dir,'tampered-'+mutation);fs.cpSync(candidate,tampered,{recursive:true});
   fs.writeFileSync(path.join(tampered,name+'.review.json'),JSON.stringify(review));
   const bad=structuredClone(receipt);change(bad);fs.writeFileSync(path.join(tampered,name+'.receipt.json'),JSON.stringify(bad));
   manifest.artifacts[0].receipt_sha256=sha256Bytes(fs.readFileSync(path.join(tampered,name+'.receipt.json')));fs.writeFileSync(path.join(tampered,'candidate-manifest.json'),JSON.stringify(manifest));
   const rejected=run('publish-reviewed-job.mjs',['--candidate-dir',tampered,'--output-dir',path.join(dir,'bad-published'),'--expected-candidate-sha256',candidateDirectorySha256(tampered),'--json']);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/(comic|cover) art snapshot/);
   }
   const accepted=path.join(dir,'accepted');fs.cpSync(candidate,accepted,{recursive:true});fs.writeFileSync(path.join(accepted,name+'.review.json'),JSON.stringify(review));
   fs.writeFileSync(input.comic_art.path,'source changed after snapshot');
   const published=run('publish-reviewed-job.mjs',['--candidate-dir',accepted,'--output-dir',path.join(dir,'published-protocol-fixture'),'--expected-candidate-sha256',candidateDirectorySha256(accepted),'--json']);assert.equal(published.status,0,published.stderr);
   fs.copyFileSync(originalArt,input.comic_art.path);
  }
 }
 console.log('Comic notes: three sealed PNGs, distinct conceptual snapshots, silent artwork identity, defaults, palette geometry and tamper rejection passed.');
 }finally{await browser?.close();if(!outputDir)fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const i=process.argv.indexOf('--output-dir');await verifyComicNotes({outputDir:i<0?undefined:process.argv[i+1]});}
