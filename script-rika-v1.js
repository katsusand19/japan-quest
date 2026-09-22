const A=document.getElementById('app'),B=document.getElementById('bar'),N=document.getElementById('num');let n=0;const sh=a=>[...a].sort(()=>Math.random()-.5);
const Q=[
['光合成を行う場所は？','葉緑体',['葉緑体','気孔','道管','師管'],'葉緑体には葉緑素という緑色の成分が含まれます。'],
['根毛から吸収された水が通る管は？','道管',['道管','師管','気孔','葉緑体'],'水は根毛から吸収され、道管を通ります。'],
['二酸化炭素を空気中から取り入れる部分は？','気孔',['気孔','根毛','道管','師管'],'主に葉のうら側に多い気孔から取り入れます。'],
['光合成のエネルギー源は？','光',['光','水','酸素','でんぷん'],'光をエネルギー源にします。'],
['光合成でできる物質の組合せは？','でんぷんと酸素',['でんぷんと酸素','水と酸素','糖と二酸化炭素','水と二酸化炭素'],'光合成によって、でんぷんと酸素ができます。'],
['でんぷんは運ばれるとき何に変えられる？','糖',['糖','酸素','水','葉緑素'],'水にとけやすい糖に変えられます。'],
['糖が通る管は？','師管',['師管','道管','気孔','根毛'],'水は道管、糖は師管です。'],
['できた酸素が空気中へ出る部分は？','気孔',['気孔','根毛','道管','師管'],'酸素は気孔から放出されます。'],
['実験前に24時間光を当てない理由は？','実験前から葉にあったでんぷんの影響をなくすため',['実験前から葉にあったでんぷんの影響をなくすため','葉を緑色にするため','気孔を閉じるため','水を吸わせるため'],'その後にできたでんぷんを調べやすくします。'],
['葉をあたためたアルコールにつける理由は？','葉の緑色をぬき、色の変化を見やすくするため',['葉の緑色をぬき、色の変化を見やすくするため','でんぷんを糖にするため','二酸化炭素を入れるため','葉に光を当てるため'],'ヨウ素液の色の変化を見やすくします。'],
['「あ」と「い」を比べると何が必要だとわかる？','葉緑体（緑色の部分）',['葉緑体（緑色の部分）','根毛','師管','酸素'],'緑色部分と緑色でない部分を比べます。'],
['「あ」と「う」を比べると何が必要だとわかる？','光',['光','道管','糖','酸素'],'アルミニウムはくで光をさえぎった部分と比べます。'],
['ヨウ素液で青紫色になるのは何がある部分？','でんぷん',['でんぷん','酸素','水','二酸化炭素'],'ヨウ素液はでんぷんがあると青紫色になります。']];
function render(){if(n>=Q.length)return leaf();B.style.width=(n/Q.length*80)+'%';N.textContent=(n+1)+' / '+(Q.length+1);let x=Q[n];A.innerHTML=`<div class=q>${x[0]}</div><div id=o class=opts></div><div id=f></div>`;sh(x[2]).forEach(v=>{let b=document.createElement('button');b.className='opt';b.textContent=v;b.onclick=()=>{let ok=v===x[1];document.querySelectorAll('.opt').forEach(z=>z.disabled=true);b.classList.add(ok?'good':'bad');f.innerHTML=`<div class=fb>${ok?'⭕ 正解':'⚠️ ここを見直そう'}<br>${x[3]}</div><button id=nx class=next>${ok?'次へ':'もう一度'}</button>`;nx.onclick=()=>{if(ok)n++;render()};};o.appendChild(b)})}
function leaf(){B.style.width='90%';N.textContent=(Q.length+1)+' / '+(Q.length+1);A.innerHTML=`<div class=q>葉「い」で青紫色になる場所は？<br>緑色で、光が当たった部分をタップしよう。</div><div class=leaf><button class='zone a' data-ok=1>緑＋光</button><button class='zone b'>緑＋光なし</button><button class='zone c'>白＋光</button></div><div id=f></div>`;document.querySelectorAll('.zone').forEach(z=>z.onclick=()=>{let ok=z.dataset.ok;z.classList.add(ok?'good':'bad');f.innerHTML=`<div class=fb>${ok?'⭕ そこ！':'⚠️ そこではありません'}<br>葉緑体があり、光が当たった部分ででんぷんができます。</div><button id=nx class=next>${ok?'まとめへ':'もう一度'}</button>`;nx.onclick=()=>ok?finish():leaf()})}
function finish(){B.style.width='100%';N.textContent='COMPLETE';A.innerHTML=`<div class=q>📒 まとめノート</div><div class=note><b>【大事な言葉】</b><br>葉緑体・葉緑素・根毛・道管・気孔・光・でんぷん・糖・師管・酸素・ヨウ素液<br><br><b>【関係】</b><br>水（根毛→道管）＋二酸化炭素（気孔）＋光 → 葉緑体で光合成 → でんぷん＋酸素<br>でんぷん→糖→師管→体の各部。酸素→気孔→空気中。<br><br><b>【実験】</b><br>暗所24時間→日光→熱湯→あたためたアルコール→水洗い→ヨウ素液。緑色部分との比較で葉緑体、アルミニウムはく部分との比較で光が必要だと確かめる。<br><br><b>【ヨウ素でんぷん反応】</b><br>でんぷんがあると青紫色。</div><button class=next onclick='location.reload()'>もう一度</button>`}render();
