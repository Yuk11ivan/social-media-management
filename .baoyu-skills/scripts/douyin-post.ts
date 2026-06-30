/**
 * 抖音文章发布 v11 — 封面+内容图+文字全流程
 * 文章URL: /creator-micro/content/post/article?default-tab=5
 */
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  CdpConnection, findChromeExecutable, findExistingChromeDebugPort,
  getDefaultProfileDir, killChromeByProfile, launchChrome,
  sleep, waitForChromeDebugPort,
} from './weibo-utils.js';

interface DyMeta { title?: string; content?: string; images?: string[]; topics?: string[]; profile?: string; }

const log = (msg: string) => console.log(`[dy] ${msg}`);

const exec = async (cdp: CdpConnection, sid: string, e: string) => {
  const r = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', { expression: e, returnByValue: true, timeout: 15000 }, { sessionId: sid });
  return r.result?.value || '';
};

const clickText = async (cdp: CdpConnection, sid: string, text: string) => {
  const r = await exec(cdp, sid, `(()=>{for(const el of document.querySelectorAll('button,a,div[role="button"],span,li')){const t=(el.textContent||'').trim();if(t.includes('${text.replace(/'/g,"\\'")}')){const rect=el.getBoundingClientRect();if(rect.width>0&&rect.height>0&&rect.width<400){el.click();return'ok'}}}return''})()`);
  if (r==='ok'){log(`Clicked: ${text}`);return true;}
  return false;
};

const waitForEditor = async (cdp: CdpConnection, sid: string, ms = 60000) => {
  log('Wait editor...');
  const st = Date.now();
  while (Date.now()-st<ms) {
    const i = await exec(cdp, sid, `JSON.stringify({title:!!document.querySelector('input[placeholder*="标题"],textarea[placeholder*="标题"]'),ce:!!document.querySelector('[contenteditable="true"]'),ta:!!document.querySelector('textarea'),url:location.href.substring(0,80)})`);
    const d = JSON.parse(i||'{}');
    if(d.title||d.ce||d.ta){log(`Editor OK title=${d.title} ce=${d.ce} ta=${d.ta}`);return true;}
    await sleep(3000);
  }
  return false;
};

const fillField = async (cdp: CdpConnection, sid: string, text: string, sels: string[]) => {
  for(const s of sels){
    const f=await exec(cdp,sid,`(()=>{const e=document.querySelector('${s}');if(!e)return'';e.focus();if(e.tagName==='INPUT'||e.tagName==='TEXTAREA')e.value='';else if(e.contentEditable==='true')e.innerText='';return e.tagName})()`);
    if(f){await sleep(300);await cdp.send('Input.insertText',{text},{sessionId:sid});await sleep(600);return true;}
  }
  return false;
};

const clipboardPaste = async (cdp: CdpConnection, sid: string, imgPath: string) => {
  const { execSync } = await import('node:child_process');
  const esc = imgPath.replace(/\\/g,'\\\\');
  const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${esc}'))`;
  execSync(`powershell -NoProfile -Command "${ps}"`,{timeout:8000});
  await sleep(500);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2},{sessionId:sid});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2},{sessionId:sid});
  await sleep(2500);
};

// ===== MAIN =====
async function main() {
  const a=process.argv.slice(2); const mi=a.indexOf('--meta');
  if(mi===-1||!a[mi+1]){log('Usage: --meta <path>');process.exit(1);}
  const meta: DyMeta = JSON.parse(fs.readFileSync(a[mi+1]!,'utf-8'));
  const {title,content,images=[],topics=[]}=meta;
  const pf=meta.profile||getDefaultProfileDir();

  const cleanContent = (content||'').replace(/\[插入图片\]/gi,'【图】').replace(/\[图片\]/gi,'【图】').trim();
  const fullText = topics.length>0 ? cleanContent+'\n\n'+topics.map(t=>t.startsWith('#')?t:`#${t}`).join(' '):cleanContent;
  log(`title="${title?.substring(0,40)}" content=${cleanContent.length}c images=${images.length}`);

  await mkdir(pf,{recursive:true});
  const cp=findChromeExecutable(); if(!cp) throw new Error('Chrome not found');
  try{killChromeByProfile(pf);await sleep(2000);}catch{}

  let port:number; const ep=await findExistingChromeDebugPort(pf);
  if(ep){try{const ws=await waitForChromeDebugPort(ep,8000);const tc=await CdpConnection.connect(ws,8000,{defaultTimeoutMs:8000});await tc.send('Target.getTargets');tc.close();port=ep;}catch{try{killChromeByProfile(pf);}catch{};await sleep(3000);port=await launchChrome('https://creator.douyin.com',pf,cp);}}
  else{port=await launchChrome('https://creator.douyin.com',pf,cp);}

  let cdp:CdpConnection|null=null;
  try{
    const wsUrl=await waitForChromeDebugPort(port,30000);
    cdp=await CdpConnection.connect(wsUrl,30000,{defaultTimeoutMs:20000});

    const tg=await cdp.send<{targetInfos:Array<{targetId:string;url:string;type:string}>}>('Target.getTargets');
    let pt=tg.targetInfos.find(t=>t.type==='page'&&t.url.includes('douyin.com'));
    if(!pt){const{targetId}=await cdp.send<{targetId:string}>('Target.createTarget',{url:'https://creator.douyin.com'});pt={targetId,url:'https://creator.douyin.com',type:'page'};}
    let{sessionId}=await cdp.send<{sessionId:string}>('Target.attachToTarget',{targetId:pt.targetId,flatten:true});
    await cdp.send('Target.activateTarget',{targetId:pt.targetId});
    await cdp.send('Page.enable',{},{sessionId});
    await cdp.send('Runtime.enable',{},{sessionId});
    await cdp.send('Input.setIgnoreInputEvents',{ignore:false},{sessionId});
    await sleep(4000);

    // Login
    let url = await exec(cdp,sessionId,'location.href');
    if(url.includes('login')||url.includes('sso')||url.includes('account')){
      log('LOGIN (5min)...');const st=Date.now();
      while(Date.now()-st<300000){await sleep(5000);const u=await exec(cdp!,sessionId,'location.href');if(!u.includes('login')&&!u.includes('sso')&&!u.includes('account'))break;}
      log('Logged in!');await sleep(5000);
    }

    // Flow: 发布文章 → 我要发文 → Editor
    log('Click 发布文章...');await clickText(cdp,sessionId,'发布文章');await sleep(4000);
    log('Click 我要发文...');await clickText(cdp,sessionId,'我要发文');await sleep(5000);

    url=await exec(cdp,sessionId,'location.href');
    if(!url.includes('/post/article')&&!url.includes('/content/article')){
      log('Direct nav to article editor...');
      await cdp.send('Page.navigate',{url:'https://creator.douyin.com/creator-micro/content/post/article?default-tab=5&enter_from=publish_page&media_type=article&type=new'},{sessionId});
      await sleep(8000);
    }

    await waitForEditor(cdp,sessionId,60000);
    await sleep(2000);

    // Fill title
    if(title){log('Fill title...');await fillField(cdp,sessionId,title,['input[placeholder*="标题"]','textarea[placeholder*="标题"]','input:not([type="hidden"]):not([type="file"]):not([type="submit"])','textarea']);}

    // Fill body
    if(fullText){log(`Fill body (${fullText.length}c)...`);await fillField(cdp,sessionId,fullText,['[contenteditable="true"]','textarea[placeholder*="正文"]','textarea','div[class*="editor"] [contenteditable]','.ProseMirror','.ql-editor']);}

    // ===== UPLOAD IMAGES =====
    const valid = images.filter(f=>fs.existsSync(f));
    if(valid.length>0){
      const paths=valid.map(f=>path.resolve(f));
      const coverPath=paths[0];
      const bodyPaths=paths.length>1?paths.slice(1):[];
      log(`Uploading: 1 cover + ${bodyPaths.length} body images`);

      await cdp.send('DOM.enable',{},{sessionId});
      const{root}=await cdp.send<{root:{nodeId:number}}>('DOM.getDocument',{},{sessionId});

      // ===== STEP 1: COVER — intercept file chooser =====
      log('Step 1: Cover image...');

      // Enable file chooser interception BEFORE clicking
      await cdp.send('Page.setInterceptFileChooserDialog',{enabled:true},{sessionId});

      // Click the upload button
      await exec(cdp,sessionId,`(()=>{
        for(const b of document.querySelectorAll('button,span,div,a')){
          const t=(b.textContent||'').trim();
          if(t==='上传图片'||t==='上传'){
            const r=b.getBoundingClientRect();
            if(r.width>0&&r.height>0&&r.width<500){b.click();return'clicked'}
          }
        }
        return'not found';
      })()`);
      log('Clicked upload, waiting for file chooser event...');
      await sleep(2000);

      // CDP will emit Page.fileChooserOpened event — but we can also try direct upload
      // Try finding file input and uploading
      try{
        await cdp.send('DOM.enable',{},{sessionId});
        const doc=await cdp.send<{root:{nodeId:number}}>('DOM.getDocument',{depth:-1},{sessionId});
        const nids=await cdp.send<{nodeIds:number[]}>('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'input[type="file"]'},{sessionId});
        log(`File inputs: ${nids.nodeIds.length}`);
        for(let i=0;i<nids.nodeIds.length;i++){
          await cdp.send('DOM.setFileInputFiles',{nodeId:nids.nodeIds[i],files:[coverPath]},{sessionId});
          log(`Uploaded to input ${i}`);
        }
        if(nids.nodeIds.length>0) await sleep(4000);
      }catch(e:any){log(`CDP upload error: ${e.message}`);}

      // If no file inputs found, copy to clipboard and use Ctrl+V
      if(!(await exec(cdp,sessionId,`document.querySelector('input[type="file"]')?1:0`)).includes('1')){
        log('No file input, using clipboard...');
        try{
          const {execSync}=await import('node:child_process');
          const esc=coverPath.replace(/\\/g,'\\\\');
          execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${esc}'))"`,{timeout:8000});
          await sleep(800);
          await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2},{sessionId});
          await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2},{sessionId});
          log('Ctrl+V pasted');
          await sleep(3000);
        }catch(e:any){log(`Clipboard fail: ${e.message}`);}
      }

      // ===== STEP 2: BODY — upload remaining images into editor =====
      if(bodyPaths.length>0){
        log(`Step 2: Body images (${bodyPaths.length})...`);
        // Focus editor body
        await exec(cdp,sessionId,`(()=>{const e=document.querySelector('[contenteditable="true"]')||document.querySelector('textarea');if(e)e.focus()})()`);
        // Click image button in toolbar
        await clickText(cdp,sessionId,'插入图片');await sleep(800);
        await clickText(cdp,sessionId,'图片');await sleep(800);
        // Also try clicking toolbar buttons
        await exec(cdp,sessionId,`(()=>{const tb=document.querySelector('[class*="toolbar"],[class*="Toolbar"]');if(tb){const b=tb.querySelector('button');if(b)b.click()}})()`);
        await sleep(2000);

        // Find file inputs again (may have changed)
        fileInputs=await cdp.send<{nodeIds:number[]}>('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'input[type="file"]'},{sessionId});
        log(`Body file inputs: ${fileInputs.nodeIds.length}`);

        if(fileInputs.nodeIds.length>0){
          // Use the last file input (usually body images)
          const bodyInput=fileInputs.nodeIds[fileInputs.nodeIds.length-1];
          await cdp.send('DOM.setFileInputFiles',{nodeId:bodyInput,files:bodyPaths},{sessionId});
          log(`Body images uploaded: ${bodyPaths.length} files`);
          await sleep(bodyPaths.length*2000+5000);
        } else {
          // Clipboard fallback
          log('No file input, using clipboard for body images...');
          for(let i=0;i<bodyPaths.length;i++){
            try{
              await clipboardPaste(cdp,sessionId,bodyPaths[i]);
              log(`Pasted body ${i+1}/${bodyPaths.length}`);
              await sleep(2500);
            }catch(e:any){log(`Body ${i+1} fail:${e.message}`);}
          }
        }
      }
    }

    log('DONE! Review and publish in browser.');

  }finally{if(cdp)cdp.close();}
}

await main().catch(err=>{console.error(`[dy] FATAL: ${err instanceof Error ? err.message : String(err)}`);process.exit(1);});
