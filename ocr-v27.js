(()=> {
  const VERSION='27';
  let currentFile=null;
  let currentObjectURL=null;
  let cropState=null;
  let ocrBusy=false;

  const $=s=>document.querySelector(s);

  function injectStyle(){
    if(document.getElementById('ocr-v27-style')) return;
    const s=document.createElement('style');
    s.id='ocr-v27-style';
    s.textContent=`
      .wechat-tip{display:none!important}
      .ocr-v27-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
      .ocr-v27-actions.hidden{display:none}
      .ocr-v27-mini{border:1px solid #d8d0c2;background:#fffdf8;color:#31574f;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700}
      .ocr-v27-modal{position:fixed;inset:0;z-index:9999;background:rgba(25,29,27,.72);display:flex;align-items:center;justify-content:center;padding:14px}
      .ocr-v27-modal.hidden{display:none}
      .ocr-v27-panel{width:min(760px,100%);max-height:94vh;overflow:auto;background:#fffdf8;border-radius:18px;box-shadow:0 22px 60px rgba(0,0,0,.28);padding:16px}
      .ocr-v27-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .ocr-v27-head h3{margin:0;color:#243532;font-size:20px}
      .ocr-v27-head p{margin:4px 0 0;color:#7d817b;font-size:13px;line-height:1.5}
      .ocr-v27-close{width:34px;height:34px;border:0;border-radius:50%;background:#f0ece4;font-size:20px;color:#454a47}
      .ocr-v27-stage{min-height:220px;display:flex;align-items:center;justify-content:center;background:#e9e6df;border-radius:14px;padding:8px;overflow:auto;touch-action:none}
      .ocr-v27-wrap{position:relative;flex:none;box-shadow:0 3px 16px rgba(0,0,0,.15);background:#fff;touch-action:none}
      .ocr-v27-img{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
      .ocr-v27-mask{position:absolute;inset:0;background:rgba(0,0,0,.34);pointer-events:none}
      .ocr-v27-crop{position:absolute;border:2px solid #f8f4eb;box-shadow:0 0 0 1px rgba(36,53,50,.75);cursor:move;touch-action:none}
      .ocr-v27-crop::before{content:"";position:absolute;inset:0;background:transparent;box-shadow:0 0 0 9999px rgba(0,0,0,.35);pointer-events:none}
      .ocr-v27-handle{position:absolute;width:18px;height:18px;border-radius:50%;background:#fffdf8;border:2px solid #31574f;z-index:2}
      .ocr-v27-handle.nw{left:-10px;top:-10px}.ocr-v27-handle.ne{right:-10px;top:-10px}.ocr-v27-handle.sw{left:-10px;bottom:-10px}.ocr-v27-handle.se{right:-10px;bottom:-10px}
      .ocr-v27-toolbar{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
      .ocr-v27-btn{border:0;border-radius:11px;padding:10px 14px;font-weight:800;font-size:14px}
      .ocr-v27-btn.secondary{background:#eee9df;color:#36433f}
      .ocr-v27-btn.primary{background:#243532;color:white}
      .ocr-v27-help{margin:9px 0 0;color:#7d817b;font-size:12px;text-align:center}
      @media(max-width:560px){.ocr-v27-panel{padding:12px;border-radius:16px}.ocr-v27-stage{min-height:200px}.ocr-v27-btn{flex:1}}
    `;
    document.head.appendChild(s);
  }

  function setStatus(msg,pct){
    const status=$('#ocrStatus'), bar=$('#ocrBar');
    if(status) status.textContent=msg;
    if(bar && pct!=null) bar.style.width=`${Math.max(0,Math.min(100,pct))}%`;
  }

  function revokePreview(){
    if(currentObjectURL){URL.revokeObjectURL(currentObjectURL);currentObjectURL=null;}
  }

  function setPreview(blob){
    const p=$('#ocrPreview');
    if(!p) return;
    revokePreview();
    currentObjectURL=URL.createObjectURL(blob);
    p.src=currentObjectURL;
    p.classList.remove('hidden');
  }

  function ensureActions(){
    const zone=$('.upload-zone');
    if(!zone || document.getElementById('ocrV27Actions')) return;
    const actions=document.createElement('div');
    actions.id='ocrV27Actions';
    actions.className='ocr-v27-actions hidden';
    actions.innerHTML=`<button type="button" class="ocr-v27-mini" id="ocrV27CropAgain">重新裁剪</button>
      <button type="button" class="ocr-v27-mini" id="ocrV27Original">直接识别原图</button>`;
    zone.insertAdjacentElement('afterend',actions);
    $('#ocrV27CropAgain').onclick=()=>currentFile&&openCropper(currentFile);
    $('#ocrV27Original').onclick=()=>currentFile&&runOCR(currentFile);
  }

  function showActions(){
    const a=$('#ocrV27Actions'); if(a)a.classList.remove('hidden');
  }

  function setupInput(){
    injectStyle();
    ensureActions();
    const old=$('#ocrFile');
    if(!old || old.dataset.ocrV27==='1') return;
    const fresh=old.cloneNode(true);
    fresh.dataset.ocrV27='1';
    old.replaceWith(fresh);
    fresh.addEventListener('change',async e=>{
      const file=e.target.files&&e.target.files[0];
      if(!file) return;
      currentFile=file;
      setPreview(file);
      showActions();
      setStatus('图片已载入，请裁剪只保留一道题和选项',0);
      await openCropper(file);
    });
  }

  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

  async function loadImageFromBlob(blob){
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.src=url;
    await img.decode();
    URL.revokeObjectURL(url);
    return img;
  }

  async function openCropper(file){
    if(!file) return;
    closeCropper();
    const sourceURL=URL.createObjectURL(file);
    const modal=document.createElement('div');
    modal.id='ocrV27Modal';
    modal.className='ocr-v27-modal';
    modal.innerHTML=`
      <div class="ocr-v27-panel">
        <div class="ocr-v27-head">
          <div><h3>裁剪题目区域</h3><p>拖动边框，只保留一道题的题干和 A/B/C/D 选项，OCR 会更准确。</p></div>
          <button class="ocr-v27-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="ocr-v27-stage"><div class="ocr-v27-wrap"><img class="ocr-v27-img" alt="待裁剪题目"><div class="ocr-v27-crop">
          <i class="ocr-v27-handle nw" data-handle="nw"></i><i class="ocr-v27-handle ne" data-handle="ne"></i>
          <i class="ocr-v27-handle sw" data-handle="sw"></i><i class="ocr-v27-handle se" data-handle="se"></i>
        </div></div></div>
        <div class="ocr-v27-toolbar">
          <button class="ocr-v27-btn secondary" type="button" data-act="reset">重置范围</button>
          <button class="ocr-v27-btn secondary" type="button" data-act="original">直接识别原图</button>
          <buttton class="ocr-v27-btn primary" type="button" data-act="crop">裁剪并识别</button>
        </div>
        <div class="ocr-v27-help">建蠮题目四器留一点绹杨，不要切掉题孢或选项斉的于先信恢。</div>
      </div>`;
    document.body.appendChild(modal);
    const img=modal.querySelector('.ocr-v27-img');
    const wrap=modal.querySelector('.ocr-v27-wrap');
    const crop=modal.querySelector('.ocr-v27-crop');
    img.src=sourceURL;
    await img.decode();

    const maxW=Math.min(window.innerWidth-58,720);
    const maxH=Math.min(window.innerHeight*.56,560);
    const scale=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);
    const dw=Math.max(1,Math.round(img.naturalWidth*scale));
    const dh=Math.max(1,Math.round(img.naturalHeight*scale));
    wrap.style.width=dw+'px'; wrap.style.height=dh+'px';

    cropState={modal,file,sourceURL,img,wrap,crop,dw,dh,x:dw*.06,y:dh*.08,w:dw*.88,h:dh*.84};
    renderCrop();

    let drag=null;
    crop.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const h=e.target.dataset.handle||'move';
      drag={mode:h,sx:e.clientX, sy:e.clientY,x:cropState.x,y:cropState.y,w:cropState.w,h:cropState.h};
      crop.setPointerCapture?.(e.pointerId);
    });
    crop.addEventListener('pointermove',e=>{
      if(!drag) return;
      e.preventDefault();
      const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy,min=56;
      let {x,y,w,h}=drag;
      if(drag.mode==='move'){
        x=clamp(drag.x+dx,0,cropState.dw-drag.w) ;
        y=clamp(drag.y+dy,0,cropState.dh-drag.h);
      }else{
        if(drag.mode.includes('e')) w=clamp(drag.w+dx,min,cropState.dw-drag.x);
        if(drag.mode.includes('s')) h=clamp(drag.h+dy,min,cropState.dh-drag.y);
        if(drag.mode.includes('w')){
          x=clamp(drag.x+dx,0,drag.x+drag.w-min);
          w=drag.w+(drag.x-x);
        }
        if(drag.mode.includes('n')){
          y=clamp(drag.y+dy,0,drag.y+drag.h-min);
          h=drag.h+(drag.y-y);
        }
      }
      Object.assign(cropState,{x,y,w,h}); renderCrop();
    });
    const end=()=>drag=null;
    crop.addEventListener('pointerup',end);crop.addEventListener('pointercancel',end);

    modal.querySelector('.ocr-v27-close').onclick=closeCropper;
    modal.querySelector('[data-act="reset"]').onclick=()=>{Object.assign(cropState,{x:dw*.06,y:dh*.08,w:dw*.88,h:dh*.84});renderCrop();};
    modal.querySelector('[data-act="original"]').onclick=()=>{closeCropper();runOCR(file);};
    modal.querySelector('[data-act="crop"]').onclick=async()=>{
      const blob=await makeCropBlob();
      closeCropper();
      if(blob){setPreview(blob);await runOCR(blob);}else runOCR(file);
    };
  }

  function renderCrop(){
    if(!cropState) return;
    const {crop,x,y,w,h}=cropState;
    crop.style.left=x+'px';crop.style.top=y+'px';crop.style.width=w+'px';crop.style.height=h+'px';
  }

  function closeCropper(){
    if(!cropState) return;
    try{URL.revokeObjectURL(cropState.sourceURL)}catch{}
    cropState.modal?.remove();
    cropState=null;
  }

  async function makeCropBlob(){
    if(!cropState) return null;
    const {img,x,y,w,h,dw,dh}=cropState;
    const sx=x/dw*img.naturalWidth, sy=y/dh*img.naturalHeight;
    const sw=w/dw*img.naturalWidth, sh=h/dh*img.naturalHeight;
    const max=2400, scale=Math.min(2.2,max/sw,max/sh);
    const ow=Math.max(1,Math.round(sw*scale)),oh=Math.max(1,Math.round(sh*scale));
    const c=document.createElement('canvas');c.width=ow;c.height=oh;
    const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,ow,oh);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,sx,sy,sw,sh,0,0,ow,oh);
    return await new Promise(r=>c.toBlob(r,'image/png',.96));
  }

  async function loadTesseract(){
    if(window.Tesseract) return;
    if(window.__guqinTessP) return window.__guqinTessP;
    window.__guqinTessP=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    return window.__guqinTessP;
  }

  function normalize(s){
    return String(s||'').toLowerCase()
      .replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
      .replace(/[０-９]/g,d=>String.fromCharCode(d.charCodeAt(0)-0xFEE0))
      .replace(/[\s\p{P}\p{S}]/gu,'');
  }
  function grams(s,n=2){const a=new Set();if(s.length<n){if(s)a.add(s);return a;}for(let i=0;i<=s.length-n;i++)a.add(s.slice(i,i+n));return a;}
  function similarity(a,b){
    a=normalize(a);b=normalize(b);if(!a||!b)return 0;
    if(a.includes(b)||b.includes(a)) return .995;
    const A=grams(a),B=grams(b);let inter=0;A.forEach(x=>B.has(x)&&inter++);
    const dice=2*inter/(A.size+B.size||1);
    let chars=0;for(const ch of new Set(a))if(b.includes(ch))chars++;
    return Math.min(.99,dice*.76+(chars/(new Set(a).size||1))*.24);
  }
  function bestBankScore(text){
    const bank=(window.QUESTION_BANK||[]).filter(q=>q.available&&q.answer);
    let best=0;
    for(const q of bank){
      const base=q.question+' '+Object.values(q.options||{}).join(' ');
      best=Math.max(best,similarity(text,base),similarity(text,q.question));
    }
    return best;
  }
  function textScore(text,confidence=0){
    const zh=(String(text).match(/[\u4e00-\u9fff]/g)||[]).length;
    const digit=(String(text).match(/\d/g)||[]).length;
    return bestBankScore(text)*130 + Math.min(zh,80)*1.6 + digit*.4 + Math.max(0,confidence)*.08;
  }

  async function preprocess(blob,mode){
    const img=await loadImageFromBlob(blob);
    const max=2400, target=Math.min(max,Math.max(1500,img.naturalWidth*1.6));
    const scale=target/img.naturalWidth;
    const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    const id=ctx.getImageData(0,0,w,h),d=id.data,hist=new Array(256).fill(0),gray=new Uint8Array(w*h);
    for(let p=0,i=0;i<d.length;i+=4,p++){let g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);gray[p]=g;hist[g]++;}
    let threshold=178;
    if(mode==='binary'){
      const total=w*h;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
      let sumB=0,wB=0,maxVar=0;
      for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;sumB+=t*hist[t];const mB=sumB/wB,mF=(sum-sumB)/wF;const v=wB*wF*(mB-mF)*(mB-mF);if(v>maxVar){maxVar=v;threshold=t;}}
      threshold=clamp(threshold,135,215);
    }
    for(let p=0,i=0;i<d.length;i+=4,p++){
      let g=gray[p];
      if(mode==='binary') g=g<threshold?0:255;
      else {g=(g-128)*1.75+128;g=clamp(g,0,255);if(g>220)g=255;if(g<45)g=0;}
      d[i]=d[i+1]=d[i+2]=g;d[i+3]=255;
    }
    ctx.putImageData(id,0,0);
    return await new Promise(r=>c.toBlob(r,'image/png',.96));
  }

  async function recognize(worker,input,psm,label){
    setStatus(label,null);
    await worker.setParameters({tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1',user_defined_dpi:'300'});
    const ret=await worker.recognize(input,{rotateAuto:true});
    return {text:ret.data.text||'',confidence:Number(ret.data.confidence||0)};
  }

  async function runOCR(blob){
    if(ocrBusy) return;
    ocrBusy=true;
    const text=$('#ocrText');
    try{
      setStatus('正在优化图片并加载中文识别组件…',4);
      await loadTesseract();
      const worker=await Tesseract.createWorker(['chi_sim','eng'],1,{logger:m=>{
        if(m.progress!=null){
          const pct=Math.max(8,Math.min(92,Math.round(m.progress*88)+5));
          const bar=$('#ocrBar');if(bar)bar.style.width=pct+'%';
        }
      }});
      const contrast=await preprocess(blob,'contrast');
      const binary=await preprocess(blob,'binary');
      const results=[];
      results.push(await recognize(worker,contrast,6,'正在识别裁剪后的题目…'));
      let best=results[0],score=textScore(best.text,best.confidence);
      if(bestBankScore(best.text)<.62 || score<75){
        const r2=await recognize(worker,binary,11,'正在进行第二次增强识别…');
        results.push(r2); if(textScore(r2.text,r2.confidence)>score){best=r2;score=textScore(r2.text,r2.confidence);}
      }
      if(bestBankScore(best.text)<.48){
        const r3=await recognize(worker,blob,3,'正在用原始图像交叉识别…');
        results.push(r3); if(textScore(r3.text,r3.confidence)>score){best=r3;score=textScore(r3.text,r3.confidence);}
      }
      await worker.terminate();
      if(text) text.value=(best.text||'').trim();
      setStatus('识别完成，已自动选择匹配题库效果最好的结果',100);
      const btn=document.querySelector('[data-action="match-text"]');
      if(btn && text?.value) btn.click();
    }catch(err){
      console.error('OCR v27',err);
      setStatus('识别组件加载失败。可重新裁剪再试，或手动输入题目文字。',0);
    }finally{ocrBusy=false;}
  }

  const obs=new MutationObserver(()=>setupInput());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setupInput();
})();