(()=>{
  function simplify(root=document){
    root.querySelectorAll('.explain-details .explain-box').forEach(box=>{
      if(box.dataset.v11==='1') return;
      const parts=[...box.children].filter(el=>el.classList&&el.classList.contains('explain-part'));
      if(parts.length>=2){
        const keep=parts[1];
        parts[0].remove();
        const title=keep.querySelector('b');
        if(title) title.remove();
        keep.classList.remove('bg');
        keep.classList.add('single');
      }else if(parts.length===1){
        const title=parts[0].querySelector('b');
        if(title && /为什么选|背景补充/.test(title.textContent||'')) title.remove();
        parts[0].classList.remove('bg');
        parts[0].classList.add('single');
      }
      box.dataset.v11='1';
    });
  }
  simplify();
  const mo=new MutationObserver(()=>simplify());
  mo.observe(document.documentElement,{subtree:true,childList:true});
})();
