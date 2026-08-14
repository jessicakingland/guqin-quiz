(()=>{
  function normalizeNumberQuery(v){
    const m=String(v||'').trim().match(/^(?:第\s*)?(\d{1,3})(?:\s*题)?$/);
    return m?Number(m[1]):null;
  }
  function enhance(){
    const input=document.querySelector('#bankSearch');
    if(!input||input.dataset.numberSearchReady)return;
    input.dataset.numberSearchReady='1';
    input.placeholder='搜索题目关键词或序号（如 1 / 第1题）';
    const originalChange=input.onchange;
    const filterByNumber=()=>{
      const n=normalizeNumberQuery(input.value);
      if(n===null)return false;
      const items=[...document.querySelectorAll('.bank-list .bank-item')];
      let shown=0;
      items.forEach(item=>{
        const tag=item.querySelector('.tag')?.textContent||'';
        const m=tag.match(/第\s*(\d+)\s*题/);
        const hit=!!m&&Number(m[1])===n;
        item.style.display=hit?'':'none';
        if(hit)shown++;
      });
      const titleSpans=[...document.querySelectorAll('.section-title span')];
      const count=titleSpans.find(el=>/题/.test(el.textContent||''));
      if(count)count.textContent=`${shown} 题`;
      return true;
    };
    input.oninput=()=>{
      const n=normalizeNumberQuery(input.value);
      if(n!==null){filterByNumber();return;}
      if(String(input.value||'').trim()===''){
        document.querySelectorAll('.bank-list .bank-item').forEach(item=>item.style.display='');
      }
    };
    input.onchange=(e)=>{
      if(filterByNumber())return;
      if(typeof originalChange==='function')originalChange.call(input,e);
    };
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&filterByNumber()){e.preventDefault();input.blur();}
    });
  }
  const mo=new MutationObserver(enhance);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  enhance();
})();