import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {validate}=require('./lib/schema');
export function verifyPersonalDefaults() {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'personal-defaults-'));
 try {
  const poster={mode:'poster',title:'Paired reading',cards:[{title:'Visible topic',body:[{type:'reading_unit',quote:'Exact source.',thought:'Personal interpretation.'},{type:'data_row',key:'Duration',value:'5 minutes'}]}]};
  const whiteboard={mode:'whiteboard',title:'Reasoning',steps:[{type:'annotation',text:'Keep the condition.'}]};
  const sketchnote=JSON.parse(fs.readFileSync(path.join(root,'evals/fixtures/sketchnote-wandering-notes/uncertainty.json'))).outputs[0].render_contract;
  const cover={mode:'editorial-image',title:'Separate systems',cover_art:{path:path.join(root,'assets/cover-series/paper-wilderness/cooperation.png'),alt:'Separate systems cooperate'}};
  for(const [input,field,value,rendererName] of [[poster,'variant','field-notes','poster'],[whiteboard,'variant','reasoning-notes','whiteboard'],[sketchnote,'variant','wandering-notes','studio-composition'],[cover,'cover_series','paper-wilderness','editorial-image']]) {
   const plain={...input};delete plain[field];
   const explicit={...plain,[field]:value};
   assert.equal(validate(plain).valid,true,JSON.stringify(validate(plain)));
   assert.equal(validate(explicit).valid,true);
   const renderer=require('./renderers/'+rendererName);
   const a=path.join(dir,input.mode+'-a'),b=path.join(dir,input.mode+'-b');
   let x,y;
   if(input.mode==='poster'){fs.mkdirSync(a);fs.mkdirSync(b);x=renderer.render(plain,a)[0].htmlPath;y=renderer.render(explicit,b)[0].htmlPath;}
   else {x=a+'.html';y=b+'.html';renderer.render(plain,x);renderer.render(explicit,y);}
   assert.equal(fs.readFileSync(x,'utf8'),fs.readFileSync(y,'utf8'),input.mode+' default differs from explicit style');
   assert.equal(validate({...plain,[field]:'retired'}).valid,false);
  }
  assert.equal(validate({...poster,variant:'reading-notes'}).valid,false);
  assert.equal(validate({...whiteboard,variant:'classic'}).valid,false);
  for(const change of [{cover_art:undefined},{cover_motif:'drawer'},{aspect:'square'},{aspect:'blog-hero'},{content_html:'<div>Other style</div>'},{composition_required:true}]) assert.equal(validate({...cover,...change}).valid,false,JSON.stringify(change));
  for(const input of [{mode:'article-diagram',title:'Legacy',family:'concept-map',nodes:[]},{mode:'article-diagram',title:'Formula',formula:'A = B',sentence:'Only when valid',render_plan:'summary'}]) assert.equal(validate(input).valid,false);
  console.log('Personal defaults: omitted/explicit HTML identity, paired content, retired contracts and cover boundaries passed.');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))verifyPersonalDefaults();
