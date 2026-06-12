// ==UserScript==
// @name         Obsidian AI Bridge Web Connector
// @namespace    https://github.com/Kaergo/obsidian_to_ai
// @version      0.1.4
// @description  Connect Obsidian AI Bridge to supported web AI pages.
// @updateURL    https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js
// @supportURL   https://github.com/Kaergo/obsidian_to_ai
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://chat.deepseek.com/*
// @match        https://kimi.moonshot.cn/*
// @match        https://www.kimi.com/*
// @connect      127.0.0.1
// @connect      localhost
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @noframes
// @run-at       document-idle
// ==/UserScript==
(function(){'use strict';
const ENDPOINT='http://127.0.0.1:23129/obsidian-ai';
const UPDATE_MANIFEST='https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/releases/latest.json';
const DOWNLOAD_URL='https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js';
const VERSION='0.1.4';
const TAB_ID=`tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const LOCK_KEY='obsidian_ai_bridge_running';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(...a)=>console.log('[ObsidianAI]',...a);
function cmp(a,b){a=String(a||'0').split('.').map(n=>parseInt(n)||0);b=String(b||'0').split('.').map(n=>parseInt(n)||0);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return 1;if((a[i]||0)<(b[i]||0))return -1}return 0}
function request(method,url,body,timeout=30000){let abort;const promise=new Promise((resolve,reject)=>{const req=GM_xmlhttpRequest({method,url,anonymous:true,headers:{'Content-Type':'application/json','Accept':'application/json'},data:body?JSON.stringify(body):undefined,timeout,onload:r=>{try{resolve(JSON.parse(r.responseText||'{}'))}catch(e){reject(e)}},onerror:reject,ontimeout:()=>resolve({})});abort=()=>{try{req.abort()}catch(e){}reject(new DOMException('Aborted','AbortError'))}});return{promise,abort}}
function gm(path,body,timeout=30000){return request('POST',ENDPOINT+path,body,timeout)}
function openUrl(url){if(typeof GM_openInTab==='function')GM_openInTab(url,{active:true,insert:true,setParent:true});else window.open(url,'_blank')}
function paste(el,text){el.focus();const dt=new DataTransfer();dt.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}))}
function setText(el,text){if(!el)return false;el.focus();if(el.tagName==='TEXTAREA'){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;if(setter)setter.call(el,text);else el.value=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}))}else paste(el,text);return true}
function click(el){if(!el)return false;el.click();el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return true}
const SITES={
 ChatGPT:{hosts:['chatgpt.com','chat.openai.com'],input:'#prompt-textarea,textarea,[contenteditable="true"]',send:'[data-testid="send-button"],button[data-testid="composer-send-button"],button[aria-label*="Send"]',msg:'[data-message-author-role="assistant"],article,#main section'},
 DeepSeek:{hosts:['chat.deepseek.com'],input:'textarea,[contenteditable="true"]',send:'button[class*="send"],._52c986b,button',msg:'._4f9bf79,[class*="message"],[class*="markdown"]'},
 Kimi:{hosts:['kimi.moonshot.cn','www.kimi.com'],input:'[contenteditable="true"],textarea',send:'.send-button-container,button[class*="send"],button',msg:'.chat-content-item,[class*="assistant"],[class*="markdown"]'}
};
function site(){const host=location.host;for(const [name,cfg] of Object.entries(SITES)){if(cfg.hosts.some(h=>host.includes(h)))return{name,...cfg}}return{name:'Generic',input:'textarea,[contenteditable="true"]',send:'button[type="submit"],button[aria-label*="Send"],button',msg:'[data-message-author-role="assistant"],article'}}
class Connector{constructor(){this.config=site();this.running=false;this.connected=false;this.secret=Math.random().toString(36).slice(2);this.pollReq=null;this.currentTask=null;this.lastText='';this.menuIds=[];this.registerMenus();GM_addValueChangeListener(LOCK_KEY,(n,o,v,remote)=>{if(!remote)return;let lock={};try{lock=JSON.parse(v||'{}')}catch{}if(lock.locked&&lock.tab&&lock.tab!==TAB_ID&&this.connected){this.stop(false);alert('Obsidian AI Bridge 已在另一个 AI 网页连接，本页面已自动断开。')}})}registerMenus(){for(const id of this.menuIds){try{if(typeof GM_unregisterMenuCommand==='function')GM_unregisterMenuCommand(id)}catch(e){}}this.menuIds=[];const toggleText=this.connected?'🔌 断开':'🔗 连接';this.menuIds.push(GM_registerMenuCommand(toggleText,()=>{if(this.connected)this.stop(true);else this.start(true)}));this.menuIds.push(GM_registerMenuCommand('✨ 更新',()=>this.checkUpdate(true)))}writeLock(){GM_setValue(LOCK_KEY,JSON.stringify({locked:true,tab:TAB_ID,ai:this.config.name,url:location.href,at:Date.now()}))}clearOwnLock(){let lock={};try{lock=JSON.parse(GM_getValue(LOCK_KEY,'{}'))}catch{}if(lock.tab===TAB_ID)GM_setValue(LOCK_KEY,JSON.stringify({locked:false,tab:null,at:Date.now()}))}async checkUpdate(show){try{const latest=await request('GET',UPDATE_MANIFEST,null,10000).promise;const web=(latest.userscript&&latest.userscript.version)||latest.version||'0.0.0';const download=(latest.userscript&&(latest.userscript.downloadUrl||latest.userscript.updateUrl))||DOWNLOAD_URL;if(cmp(web,VERSION)>0){const ok=confirm(`发现网页脚本新版本 ${web}。当前版本：${VERSION}\n\n是否打开安装/更新链接？`);if(ok)openUrl(download);return{updateAvailable:true,latest:web}}if(show)alert(`网页脚本已经是最新版：${VERSION}`);return{updateAvailable:false,latest:web}}catch(e){alert(`检查更新失败：${e.message||e}`);return{updateAvailable:false,error:String(e)}}}async start(force){if(this.connected)return;this.writeLock();this.running=true;try{const r=await gm('/connect',{ai:this.config.name,url:location.href,icon:document.querySelector('link[rel*=icon]')?.href||'',version:VERSION,sessionSecret:this.secret},5000).promise;if(r.status==='connected'||r.success){this.connected=true;this.registerMenus();log('connected',this.config.name);this.poll();alert(`Obsidian AI Bridge 已连接：${this.config.name}`)}else{this.running=false;this.clearOwnLock();alert(`连接失败：${r.error||'Obsidian 插件未响应'}`)}}catch(e){this.running=false;this.clearOwnLock();alert(`连接失败：${e.message||e}`)}}stop(manual){this.running=false;this.connected=false;this.currentTask=null;if(this.pollReq){this.pollReq.abort();this.pollReq=null}this.clearOwnLock();this.registerMenus();if(manual)alert('Obsidian AI Bridge 已断开。')}async poll(){if(!this.running||!this.connected||this.pollReq)return;this.pollReq=gm('/poll',{sessionSecret:this.secret},30000);try{const r=await this.pollReq.promise;this.pollReq=null;if(r.task)await this.runTask(r.task);if(this.running)setTimeout(()=>this.poll(),200)}catch(e){this.pollReq=null;if(this.running)setTimeout(()=>this.poll(),1000)}}async runTask(task){this.currentTask=task;this.lastText='';const prompt=(task.messages||[]).filter(m=>m.type!=='file').map(m=>m.text||'').join('\n\n');const input=document.querySelector(this.config.input);if(!input){await this.update('Input box not found on this AI page.',true);return}setText(input,prompt);await sleep(300);const sent=click(document.querySelector(this.config.send));if(!sent)await this.update('Send button not found. Try clicking send manually.',false);this.watch(task.id)}async update(text,isDone){if(!this.currentTask)return;this.lastText=String(text||'');try{await gm('/update',{id:this.currentTask.id,text:this.lastText,isDone:!!isDone,sessionSecret:this.secret},8000).promise}catch(e){log('update failed',e)}}watch(id){let stable=0,last='';const timer=setInterval(async()=>{if(!this.currentTask||this.currentTask.id!==id){clearInterval(timer);return}const nodes=[...document.querySelectorAll(this.config.msg)].filter(n=>(n.innerText||'').trim());const n=nodes[nodes.length-1];const text=n?(n.innerText||'').trim():'';if(text&&text!==this.lastText)await this.update(text,false);if(text===last)stable++;else stable=0;last=text;const stop=document.querySelector('[data-testid="stop-button"],button[aria-label*="Stop"],button[class*="stop"]');if(text&&stable>=8&&!stop){await this.update(text,true);this.currentTask=null;clearInterval(timer)}},800)}}
new Connector();
})();
