(()=>{
const U={
"GJ062":{
  answer:"A",
  answerContent:"A：伏羲",
  background:"本题按考级题库最新答案口径选A“伏羲”。伏羲在古琴起源传说中常被视为最早的制琴圣王，因此在追溯琴史源头时，常以“伏羲制琴”作为最早的人物线索。复习时可把“伏羲—制琴起源”连在一起记忆。需要留意的是，现存《琴史》卷一正文篇目首列帝尧，文献编排与本题考级答案口径存在差异；本程序按最新考级答案A判分。",
  anomaly:"正常",
  isMulti:false
},
"GJ088":{
  answer:"ACD",
  answerContent:"A：节奏跳跃，多用切分音；C：整曲仅用到一至五弦；D：将十三个徽位的泛音以及徽外音全都用到了",
  background:"本题应选A、C、D。《神人畅》是一首形制和音响都很特殊的古琴曲：其一，乐曲节奏感强，带有原始乐舞般的跳跃与切分性律动，因此A正确；其二，整曲只使用一至五弦，不用六、七弦，这种写法在传世琴曲中十分少见，因此C正确；其三，乐曲把十三个徽位的泛音广泛运用，并出现徽外泛音，形成清亮、空灵而辽阔的音响，因此D正确。B所说“大量应用撮并以此表现庄重肃穆”不是这首曲子最典型、最核心的结构特征，所以不选。题干所说“相传为尧所作”属于传统归属说法。",
  anomaly:"正常",
  isMulti:true
}
};
(window.QUESTION_BANK||[]).forEach(q=>{const x=U[q.id];if(!x)return;q.answer=x.answer;q.answerContent=x.answerContent;q.background=x.background;q.explanation=x.background;q.anomaly=x.anomaly;q.isMulti=x.isMulti;});
})();
