import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {validate}=require('./lib/schema'),renderer=require('./renderers/long');
export function verifyLongNotes(){
 const fixture=JSON.parse(fs.readFileSync(path.join(root,'evals/fixtures/long-notes.json'))),dir=fs.mkdtempSync(path.join(os.tmpdir(),'long-notes-'));
 try {
 const q=(text,source_ref,quote_group)=>({type:'blockquote',text,...(source_ref?{source_ref}:{}),...(quote_group?{quote_group}:{})});
 const job=body=>({mode:'long',title:'引文边界',body});
 const count=body=>(renderer.renderBody(body).match(/<blockquote>/g)||[]).length;
 assert.equal(count([q('原句甲。','book','a'),q('原句乙。','book','a')]),1);
 assert.equal(count([q('原句甲。','book'),q('原句乙。','book')]),2,'source alone is not a grouping instruction');
 assert.equal(count([q('原句甲。','book','a'),q('原句乙。','other','b')]),2);
 assert.equal(count([q('原句甲。'),q('原句乙。')]),2,'legacy adjacency must not merge');
 for(const body of [[q('原句。',null,'a')],[q('原句甲。','book','a'),q('原句乙。','other','a')],[q('原句甲。','book','a'),{type:'paragraph',text:'解释。'},q('原句乙。','book','a')],[{type:'layer_card',text:'页尾。',role:'footer'},{type:'paragraph',text:'正文。'}],[{type:'layer_card',text:'旁记。',role:'unknown'}]])assert.equal(validate(job(body)).valid,false,JSON.stringify(body));
 assert.throws(()=>renderer.renderBody([q('一。','a','x'),q('二。','b','x')]),/input_contract/);
 assert.match(renderer.renderBody([q('<script>原文 & 保留</script>','book','a')]),/&lt;script&gt;原文 &amp; 保留&lt;\/script&gt;/);
 for(const [name,input]of Object.entries(fixture)){
  assert.equal(validate(input).valid,true,JSON.stringify(validate(input)));
  const html=path.join(dir,name+'.html');renderer.render(input,html);
  const result=spawnSync(process.execPath,[path.join(root,'scripts/check-output.mjs'),'--html',html,'--width','1080','--height','800','--fullpage','--skip-png','--json'],{encoding:'utf8'});
  assert.equal(result.status,0,name+': '+result.stdout+result.stderr);
  const text=fs.readFileSync(html,'utf8');assert(!text.includes('grain'));assert.match(text,/font-size:54px/);
 }
 const input={...fixture.rousseau,source:'可见出处',brand_name:'测试署名'};
 const texts=[];for(const tone of ['reflective','sharp','warm','technical']){const file=path.join(dir,tone+'.html');renderer.render({...input,tone},file);texts.push(fs.readFileSync(file,'utf8').replace(/:root\{[^}]*\}/,''));}
 texts.forEach(t=>assert.equal(t,texts[0],'tone changes only palette'));
 assert.match(texts[0],/可见出处/);assert.match(texts[0],/测试署名/);
 const plain=renderer.renderBody([{type:'layer_card',label:'不要隐藏',text:'最后一条旁记。'}]);assert.match(plain,/不要隐藏/);assert(!plain.includes('note-footer'));
 console.log('Long notes: three browser fixtures; explicit quote grouping, source boundaries, escaping, footer roles and four-tone geometry passed.');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))verifyLongNotes();
