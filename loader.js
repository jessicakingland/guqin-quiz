(async()=>{
 const view=document.getElementById('view');
 view.innerHTML='<section class="hero"><span class="eyebrow">正在准备题库</span><h2>古琴考级题库</h2><p>正在加载 210 道题和详细解析，请稍候片刻……</p></section>';
 const files=['qdata-1','q2-1','q2-2','qdata-3','qdata-4','q5-1','q5-2','qdata-6','q7-1','q7-2','q7-3','q8a-1','q8a-2','q8-2','q8-3','q9-1','q9-2','q9-3'];
 try{
   const parts=await Promise.all(files.map(n=>fetch('./data/'+n+'.txt').then(r=>{if(!r.ok)throw Error(n);return r.text()})));
   const b64=parts.join('').replace(/\s/g,'');
   const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
   let code;
   if('DecompressionStream' in window){const ds=new DecompressionStream('gzip');code=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();}
   else{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});code=new TextDecoder().decode(window.pako.ungzip(bytes));}
   (0,eval)(code);
   if(!window.QUESTION_BANK||window.QUESTION_BANK.length<200)throw Error('question bank incomplete');
   const s=document.createElement('script');s.src='./app.js';s.defer=false;document.body.appendChild(s);
 }catch(e){console.error(e);view.innerHTML='<section class="hero"><span class="eyebrow">加载失败</span><h2>题库没有完整加载</h2><p>请刷新页面重试；首次打开需要保持网络连接。</p><p style="margin-top:16px"><button class="btn primary" onclick="location.reload()">重新加载</button></p></section>'}
})();
