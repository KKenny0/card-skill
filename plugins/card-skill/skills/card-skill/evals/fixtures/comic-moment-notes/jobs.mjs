import fs from 'node:fs';
import path from 'node:path';
export function comicJob(root,name){
 const entries={rousseau:['岸还在那里，此刻先回到手边','读卢梭 · 片刻札记','片刻安顿，不等于外界冲突已消失。','据用户提供的卢梭文章片段 · 场景为概念演绎','回望岸上、仍握紧书、转向触水的手、松开身体；岸仍在。'],uncertainty:['还没想清楚，能开始吗？','读不确定性 · 片刻札记','换问法，不等于保证幸福。','不确定性文章片段 · 场景为概念演绎','从担心选择后悔，到想象长期没有行动的遗憾，再迈出一小步；不保证幸福。'],interaction:['看见了动作，还没看见缘由','片刻札记 · 双人互动测试','多看见一点，回应也可以不同。','虚构情境 · 仅用于检验分镜叙事','虚构情境：拿书被拦，拉远看见倒杯积水，随后一起清理。']};
 const [title,subtitle,ending,source,excerpt]=entries[name];
 const input={mode:'comic',title,subtitle,source,tone:'reflective',composition_required:true,comic_art:{path:path.join(root,'evals/fixtures/comic-moment-notes',name+'.png'),alt:excerpt},content_html:'<section class="scene-sheet">{{COMIC_ART}}</section><p class="ending">'+ending+'</p>',custom_css:'.panels{display:flex;flex-direction:column;align-items:center}.scene-sheet{width:852px;height:1136px;flex:none}.ending{width:100%;font-size:36px;line-height:1.5;margin-top:10px}.colophon{min-height:40px}'};
 if(name==='uncertainty'){
  input.comic_art.path=path.join(root,'evals/fixtures/comic-moment-notes/uncertainty-art.png');
  input.content_html='<section class="scene-sheet">{{COMIC_ART}}<p class="scene-caption question-one">选了，会不会后悔？</p><p class="scene-caption question-two">如果一直没有推开门呢？</p><small class="scene-caption possibility">想象的一种可能</small></section><p class="ending">'+ending+'</p>';
  input.custom_css+='.scene-sheet{position:relative}.scene-caption{position:absolute;left:28px;font-size:36px;line-height:1.5;margin:0}.question-one{top:20px}.question-two{top:438px}.possibility{top:496px;font-size:24px}';
 }

 return {schema_version:3,job_id:'comic-moment-'+name,publish_target:'social-single',source:{kind:'pasted-text',language:'zh',label:source},source_units:[{id:'scene',excerpt,evidence:{kind:'claim',strength:'primary',freshness:'current'}}],decision:{mode:'comic',tier:'studio',selection_source:'user-override',reason:'维护者要求验证已认可的漫画叙事。'},outputs:[{id:name,render_contract:input,artifacts:[{id:name,artifact_index:1,basename:name+'.png',role:'claim',source_unit_ids:['scene'],transformation:'visualize',visual_plan:{core_message:ending,content_type:'story',argument_structure:'sequence',visual_metaphor:'连续的人物动作与视线',layout_strategy:'连续镜头揭示变化与边界',visual_hierarchy:['动作','镜头','必要文字'],avoid_patterns:['图标代替人物','旁白解释所有变化']}}]}]};
}
