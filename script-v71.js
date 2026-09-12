
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const homeView = $("#homeView");
  const gameView = $("#gameView");
  const noteView = $("#noteView");
  const bossView = $("#bossView");
  const stage = $("#stage");
  const feedback = $("#feedback");
  const nextBtn = $("#nextBtn");
  const chapterLabel = $("#chapterLabel");
  const stepTitle = $("#stepTitle");
  const stepCounter = $("#stepCounter");
  const progressBar = $("#progressBar");

  let chapter = 1;
  let stepIndex = 0;
  let locked = false;

  const PROGRESS_KEY = "socialQuest_geo_source_v7";

  function getProgress(){
    try{
      return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {1:0,2:0,3:0,4:0,clear1:false,clear2:false,clear3:false,clear4:false};
    }catch{
      return {1:0,2:0,3:0,4:0,clear1:false,clear2:false,clear3:false,clear4:false};
    }
  }
  function saveProgress(ch, idx){
    const p = getProgress();
    p[ch] = Math.max(p[ch] || 0, idx);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    updateHomeProgress();
  }
  function setClear(ch){
    const p = getProgress();
    p["clear"+ch] = true;
    p[ch] = chapters[ch].length;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    updateHomeProgress();
  }
  function updateHomeProgress(){
    const p = getProgress();
    [1,2,3,4].forEach(ch=>{
      const max = chapters[ch].length;
      const done = Math.min(p[ch] || 0, max);
      const pct = p["clear"+ch] ? 100 : Math.round((done/max)*100);
      $("#progress"+ch).textContent = pct + "%";
    });
  }

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function resetStage(){
    locked = false;
    stage.innerHTML = "";
    feedback.innerHTML = "";
    feedback.className = "feedback hidden";
    nextBtn.classList.add("hidden");
    nextBtn.textContent = "次へ";
  }

  function showFeedback(html, type=""){
    feedback.innerHTML = html;
    feedback.className = "feedback" + (type ? " "+type : "");
  }

  function enableNext(){
    nextBtn.classList.remove("hidden");
  }

  function setHeader(title){
    chapterLabel.textContent = `第${chapter}章`;
    stepTitle.textContent = title;
    const n = chapters[chapter].length;
    stepCounter.textContent = `${stepIndex+1} / ${n}`;
    progressBar.style.width = `${((stepIndex+1)/n)*100}%`;
  }

  function render(){
    resetStage();
    homeView.classList.add("hidden");
    noteView.classList.add("hidden");
    bossView.classList.add("hidden");
    gameView.classList.remove("hidden");
    saveProgress(chapter, stepIndex);
    chapters[chapter][stepIndex]();
  }

  function goHome(){
    gameView.classList.add("hidden");
    noteView.classList.add("hidden");
    bossView.classList.add("hidden");
    homeView.classList.remove("hidden");
    updateHomeProgress();
  }

  function readStep({title,text,focus,after}){
    setHeader(title);
    stage.innerHTML = `
      <div class="stage-label">STEP 1　📖 読む</div>
      <div class="read-box">${text}</div>
      <div class="focus-box"><b>読むポイント</b><br>${focus}</div>
      <button id="readDone" class="primary full" style="margin-top:14px">意味を考えながら読んだ</button>
    `;
    $("#readDone").addEventListener("click",()=>{
      showFeedback(after || "👍 次は、今読んだ内容を使います。","correct");
      enableNext();
    });
  }

  function evidenceStep({title,question,parts,correctIndex,explain}){
    setHeader(title);
    stage.innerHTML = `
      <div class="stage-label">STEP 2　🔎 本文の根拠を直接タップ</div>
      <p style="margin-top:14px;font-weight:900">${question}</p>
      <div id="evidenceBox" class="evidence-box"></div>
    `;
    const box = $("#evidenceBox");
    parts.forEach((part,i)=>{
      const b = document.createElement("button");
      b.className = "evidence-token";
      b.textContent = part;
      b.addEventListener("click",()=>{
        if(locked) return;
        if(i === correctIndex){
          locked = true;
          $$("#evidenceBox .evidence-token").forEach(x=>x.disabled=true);
          b.classList.add("hit");
          showFeedback(`⭕ <b>ここが根拠！</b><br>${explain}`,"correct");
          enableNext();
        }else{
          b.disabled = true;
          b.classList.add("miss");
          showFeedback("🔎 そこではありません。質問に直接答える部分を探そう。","wrong");
        }
      });
      box.appendChild(b);
    });
  }

  function quizStep({title,question,correct,distractors,extra,wrongHints={}}){
    setHeader(title);
    const options = shuffle([correct, ...distractors]);
    stage.innerHTML = `
      <div class="stage-label">STEP 4　🧠 見ないで思い出す</div>
      <p style="margin-top:14px;font-size:1.08rem;font-weight:900">${question}</p>
      <div id="optionGrid" class="option-grid"></div>
    `;
    const grid = $("#optionGrid");
    options.forEach(opt=>{
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.addEventListener("click",()=>{
        if(locked) return;
        if(opt === correct){
          locked = true;
          [...grid.children].forEach(x=>x.disabled=true);
          b.classList.add("correct");
          showFeedback(`⭕ <b>正解！</b><br>${extra}`,"correct");
          enableNext();
        }else{
          b.disabled = true;
          b.classList.add("wrong");
          const hint = wrongHints[opt] || "似た言葉ですが、問いが何を聞いているかをもう一度確認しよう。";
          showFeedback(`🔎 <b>${opt}</b>ではありません。<br>${hint}`,"wrong");
        }
      });
      grid.appendChild(b);
    });
  }

  function matchStep({title,prompt,rows,answers,success}){
    setHeader(title);
    stage.innerHTML = `
      <div class="stage-label">STEP 3　🧩 対応させる</div>
      <p style="margin-top:14px;font-weight:900">${prompt}</p>
      <p class="muted">間違えた欄には、赤枠と「←ここを見直そう」が付きます。</p>
      <div id="matchList" class="match-list"></div>
      <button id="matchCheck" class="primary full" style="margin-top:14px">答え合わせ</button>
    `;
    const list = $("#matchList");
    rows.forEach((row,i)=>{
      const card = document.createElement("div");
      card.className = "match-row";
      card.dataset.index = i;
      const choices = shuffle(row.choices);
      card.innerHTML = `
        <div class="match-main">
          <b>${row.label}</b>
          <select>
            <option value="">選ぶ</option>
            ${choices.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}
          </select>
        </div>
        <div class="match-mark">⚠️ ←ここを見直そう</div>
      `;
      list.appendChild(card);
    });

    $("#matchCheck").addEventListener("click",()=>{
      let all = true;
      $$("#matchList .match-row").forEach((rowEl,i)=>{
        rowEl.classList.remove("bad");
        const select = rowEl.querySelector("select");
        if(select.value !== answers[i]){
          all = false;
          rowEl.classList.add("bad");
        }
      });
      if(all){
        locked = true;
        $$("#matchList select").forEach(s=>s.disabled=true);
        $("#matchCheck").disabled = true;
        showFeedback(`⭕ <b>全部正解！</b><br>${success}`,"correct");
        enableNext();
      }else{
        showFeedback("🔎 まだ違うところがあります。<br><b>赤枠と「←ここを見直そう」</b>が付いた欄だけ、もう一度考えてみよう。","wrong");
      }
    });
  }

  function infoStep({title,label="STEP 3　👀 図で整理",html,buttonText="確認した",after}){
    setHeader(title);
    stage.innerHTML = `<div class="stage-label">${label}</div>${html}<button id="infoDone" class="primary full" style="margin-top:14px">${buttonText}</button>`;
    $("#infoDone").addEventListener("click",()=>{
      showFeedback(after,"correct");
      enableNext();
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  async function japanMapStep(){
    setHeader("1-3 東西南北端を地図で整理");
    stage.innerHTML = `
      <div class="stage-label">STEP 3　🗺️ 地図で整理</div>
      <p style="margin-top:14px;font-weight:900">日本列島全体と、4つの端の位置関係を確認しよう。</p>
      <div class="map-card"><svg id="japanMap" viewBox="0 0 820 560" aria-label="日本と周辺地域の地図"></svg></div>
      <p style="margin:14px 0 0;font-weight:900">日本の最南端はどれ？</p>
      <div id="mapChoices" class="option-grid"></div>
    `;
    const points = [
      {name:"択捉島",role:"北端",lon:148.75,lat:45.55},
      {name:"沖ノ鳥島",role:"南端",lon:136.08,lat:20.43},
      {name:"南鳥島",role:"東端",lon:153.98,lat:24.28},
      {name:"与那国島",role:"西端",lon:122.93,lat:24.45},
    ];
    try{
      const d3 = await import("https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm");
      const topo = await import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm");
      const worldModule = await import("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm");
      const world = worldModule.default;
      const countries = topo.feature(world, world.objects.countries).features;
      const svg = d3.select("#japanMap");
      const proj = d3.geoMercator().center([138,33]).scale(820).translate([410,280]);
      const path = d3.geoPath(proj);
      svg.selectAll("path")
        .data(countries.filter(d=>["392","156","410","408","643"].includes(String(d.id))))
        .join("path")
        .attr("d",path)
        .attr("fill",d=>String(d.id)==="392"?"#fff":"#e7e6df")
        .attr("stroke","#8e8c84")
        .attr("stroke-width",1.2);

      const labels = [
        ["日本",138,37],["中国",112,37],["韓国",127.7,36.2],["ロシア",142,49]
      ];
      labels.forEach(([t,lon,lat])=>{
        const [x,y]=proj([lon,lat]);
        svg.append("text").attr("x",x).attr("y",y).attr("text-anchor","middle").attr("font-size",13).attr("fill","#555").text(t);
      });
      points.forEach(p=>{
        const [x,y]=proj([p.lon,p.lat]);
        svg.append("circle").attr("cx",x).attr("cy",y).attr("r",6).attr("fill","#2f6f55");
        svg.append("text").attr("x",x+9).attr("y",y-7).attr("font-size",12).attr("fill","#242424").text(`${p.role}・${p.name}`);
      });
    }catch(err){
      $("#japanMap").outerHTML = `<div class="read-box">地図データを読み込めませんでした。<br>北：択捉島／南：沖ノ鳥島／東：南鳥島／西：与那国島</div>`;
    }

    const grid = $("#mapChoices");
    shuffle(points.map(x=>x.name)).forEach(name=>{
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = name;
      b.addEventListener("click",()=>{
        if(locked) return;
        if(name === "沖ノ鳥島"){
          locked=true;
          [...grid.children].forEach(x=>x.disabled=true);
          b.classList.add("correct");
          showFeedback("⭕ 最南端は<b>沖ノ鳥島</b>。<br>北＝択捉島／東＝南鳥島／西＝与那国島もセットで確認しよう。","correct");
          enableNext();
        }else{
          b.disabled=true;b.classList.add("wrong");
          const msg = name==="南鳥島"
            ? "「南」と付くので間違えやすいですが、南鳥島は<b>最東端</b>です。"
            : name==="与那国島"
            ? "与那国島は<b>最西端</b>です。"
            : "択捉島は<b>最北端</b>です。";
          showFeedback(`🔎 ${msg}`,"wrong");
        }
      });
      grid.appendChild(b);
    });
  }

  async function chapter2MapStep(){
    setHeader("2-7 半島・湾を地図で整理");
    stage.innerHTML = `
      <div class="stage-label">STEP 3　🗺️ 地図で整理</div>
      <p style="margin-top:14px;font-weight:900">教材と同じ番号・記号の位置を、実際の日本列島の形で確認しよう。</p>
      <div class="map-card"><svg id="ch2Map" viewBox="0 0 820 560" aria-label="半島と湾の地図"></svg></div>
      <button id="mapDone" class="primary full" style="margin-top:14px">位置を確認した</button>
    `;
    const peninsulas = [
      ["1",136.90,34.78],["2",137.18,34.63],["3",140.35,41.12],["4",141.20,41.28],
      ["5",130.30,31.35],["6",130.85,31.30],["7",138.95,34.90],["8",130.22,32.75],["9",140.15,35.35]
    ];
    const bays = [
      ["ア",136.75,34.65],["イ",137.15,34.72],["ウ",140.85,41.00],["エ",138.55,35.00],["オ",130.25,33.00],["カ",139.85,35.45]
    ];
    try{
      const d3 = await import("https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm");
      const topo = await import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm");
      const worldModule = await import("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm");
      const world = worldModule.default;
      const countries = topo.feature(world, world.objects.countries).features;
      const japan = countries.find(d=>String(d.id)==="392");
      const svg = d3.select("#ch2Map");
      const proj = d3.geoMercator().center([137.5,36.2]).scale(1150).translate([410,280]);
      const path = d3.geoPath(proj);
      svg.append("path").datum(japan).attr("d",path).attr("fill","#fff").attr("stroke","#686760").attr("stroke-width",1.5);
      peninsulas.forEach(([t,lon,lat])=>{
        const [x,y]=proj([lon,lat]);
        svg.append("circle").attr("cx",x).attr("cy",y).attr("r",8).attr("fill","#2f6f55");
        svg.append("text").attr("x",x).attr("y",y+4).attr("text-anchor","middle").attr("font-size",10).attr("font-weight","800").attr("fill","white").text(t);
      });
      bays.forEach(([t,lon,lat])=>{
        const [x,y]=proj([lon,lat]);
        svg.append("rect").attr("x",x-8).attr("y",y-8).attr("width",16).attr("height",16).attr("rx",3).attr("fill","#9b6a35");
        svg.append("text").attr("x",x).attr("y",y+4).attr("text-anchor","middle").attr("font-size",10).attr("font-weight","800").attr("fill","white").text(t);
      });
      svg.append("text").attr("x",16).attr("y",24).attr("font-size",12).attr("fill","#555").text("● 1〜9＝半島　■ ア〜カ＝湾・海");
    }catch(err){
      $("#ch2Map").outerHTML = `<div class="read-box">地図データを読み込めませんでした。次の対応問題で位置関係を確認できます。</div>`;
    }
    $("#mapDone").addEventListener("click",()=>{
      showFeedback("次は、この番号・記号を地名と対応させます。","correct");
      enableNext();
    });
  }


  function multiSelectStep({title,question,choices,answers,success}){
    setHeader(title);
    const ans = new Set(answers);
    stage.innerHTML = `<div class="stage-label">🧠 必要なものを全部選ぶ</div><p style="margin-top:14px;font-weight:900">${question}</p><div id="multiGrid" class="option-grid"></div><button id="multiCheck" class="primary full" style="margin-top:14px">答え合わせ</button>`;
    const grid = $("#multiGrid");
    shuffle(choices).forEach(opt=>{
      const b=document.createElement("button"); b.className="option"; b.textContent=opt; b.dataset.on="0";
      b.onclick=()=>{ if(locked)return; b.dataset.on=b.dataset.on==="1"?"0":"1"; b.style.outline=b.dataset.on==="1"?"3px solid var(--accent)":""; };
      grid.appendChild(b);
    });
    $("#multiCheck").onclick=()=>{
      const selected=[...grid.children].filter(b=>b.dataset.on==="1").map(b=>b.textContent);
      const ok=selected.length===answers.length && selected.every(x=>ans.has(x));
      if(ok){locked=true;[...grid.children].forEach(b=>b.disabled=true);showFeedback(`⭕ ${success}`,"correct");enableNext();}
      else{showFeedback("🔎 選びすぎ・選び忘れがないか確認しよう。","wrong");}
    };
  }

  function sequenceStep({title,question,items,correct,success}){
    setHeader(title);
    let order=shuffle(items);
    stage.innerHTML=`<div class="stage-label">➡️ 原因と結果を並べる</div><p style="margin-top:14px;font-weight:900">${question}</p><div id="seq" class="sequence-box"></div><button id="seqCheck" class="primary full" style="margin-top:14px">この順番で答える</button>`;
    const box=$("#seq");
    function draw(){box.innerHTML="";order.forEach((txt,i)=>{const row=document.createElement("div");row.className="sequence-row";row.innerHTML=`<span class="sequence-num">${i+1}</span><span style="flex:1">${txt}</span><button class="ghost" data-dir="up">↑</button><button class="ghost" data-dir="down">↓</button>`;row.querySelector('[data-dir="up"]').onclick=()=>{if(i>0){[order[i-1],order[i]]=[order[i],order[i-1]];draw()}};row.querySelector('[data-dir="down"]').onclick=()=>{if(i<order.length-1){[order[i+1],order[i]]=[order[i],order[i+1]];draw()}};box.appendChild(row)})}draw();
    $("#seqCheck").onclick=()=>{const ok=order.every((x,i)=>x===correct[i]);if(ok){locked=true;showFeedback(`⭕ ${success}`,"correct");enableNext();}else showFeedback("🔎 原因から結果へつながるように並べよう。","wrong")};
  }

  async function stickyJapanMapQuiz({title,intro,points,questions,afterAll}){
    setHeader(title);
    stage.innerHTML=`
      <div class="stage-label">🗾 地図を見たまま答える</div>
      <p style="margin-top:12px;line-height:1.7">${intro}</p>
      <div class="sticky-map-wrap">
        <div class="sticky-map-head"><b>地図はこのまま残ります</b><div class="map-tools"><button id="zout" aria-label="縮小">−</button><button id="zreset" aria-label="元の大きさ">↺</button><button id="zin" aria-label="拡大">＋</button></div></div>
        <div id="mapViewport" class="map-viewport"><svg id="stickyJapanMap" viewBox="0 0 820 620" aria-label="日本地図"></svg></div>
      </div>
      <div class="map-question-panel"><div id="mqCount" class="qcount"></div><p id="mqText" class="qtext"></p><div id="mqHint" class="map-hint"></div></div>`;
    let zoom=1;const svgEl=$("#stickyJapanMap");const setZoom=()=>{svgEl.style.width=(100*zoom)+"%"};$("#zin").onclick=()=>{zoom=Math.min(2.2,zoom+.3);setZoom()};$("#zout").onclick=()=>{zoom=Math.max(1,zoom-.3);setZoom()};$("#zreset").onclick=()=>{zoom=1;setZoom();$("#mapViewport").scrollTo({left:0,top:0,behavior:"smooth"})};
    let proj=null, svg=null;
    try{
      const d3=await import("https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm");
      const topo=await import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm");
      const worldModule=await import("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm");
      const countries=topo.feature(worldModule.default,worldModule.default.objects.countries).features;
      const japan=countries.find(d=>String(d.id)==="392");
      svg=d3.select("#stickyJapanMap"); proj=d3.geoMercator().center([137.4,36.2]).scale(1200).translate([410,300]); const path=d3.geoPath(proj);
      svg.append("path").datum(japan).attr("d",path).attr("fill","#fff").attr("stroke","#77756d").attr("stroke-width",1.4);
      points.forEach(p=>{const [x,y]=proj([p.lon,p.lat]);const g=svg.append("g").attr("class","map-point").attr("data-id",p.id).attr("transform",`translate(${x},${y})`).attr("role","button").attr("tabindex",0);g.append("circle").attr("r",15);g.append("text").attr("text-anchor","middle").attr("dy",".35em").text(p.label);g.on("click",()=>pick(p.id));g.on("keydown",e=>{if(e.key==="Enter"||e.key===" ")pick(p.id)})});
    }catch(e){
      $("#mapViewport").innerHTML='<div class="read-box">地図データを読み込めませんでした。通信を確認して再読み込みしてください。</div>';
    }
    let qi=0;
    function clearMarks(){document.querySelectorAll('.map-point').forEach(g=>g.classList.remove('wrong','correct','selected'));document.querySelectorAll('.map-answer-name').forEach(x=>x.remove())}
    function showQ(){clearMarks();const q=questions[qi];$("#mqCount").textContent=`地図問題 ${qi+1} / ${questions.length}`;$("#mqText").textContent=q.q;$("#mqHint").textContent=q.hint||"地図上の記号を直接タップしよう。"}
    function pick(id){if(locked||qi>=questions.length)return;const q=questions[qi],g=document.querySelector(`.map-point[data-id="${id}"]`);if(id===q.answer){g?.classList.add("correct");const p=points.find(x=>x.id===id);if(svg&&proj){const [x,y]=proj([p.lon,p.lat]);svg.append("text").attr("class","map-answer-name").attr("x",x+20).attr("y",y-18).text(`⭕ ${p.name}`)};$("#mqHint").innerHTML=`⭕ <b>${p.name}</b>。${q.explain||""}`;setTimeout(()=>{qi++;if(qi<questions.length)showQ();else{locked=true;showFeedback(`⭕ ${afterAll}`,"correct");enableNext()}},850)}else{g?.classList.add("wrong");const p=points.find(x=>x.id===id);$("#mqHint").innerHTML=`⚠️ <b>${p?.name||"その場所"}</b>ではありません。${q.wrong||"問題文の地名・流れる向き・平野に注目しよう。"}`;setTimeout(()=>g?.classList.remove("wrong"),700)}}
    showQ();
  }


  function sourceBlankStep({title,number,prompt,blanks,success}){
    setHeader(title);
    stage.innerHTML = `
      <div class="stage-label">📝 ポイント・チェック ${number}</div>
      <p style="margin-top:14px;font-weight:900;line-height:1.8">${prompt}</p>
      <div id="sourceBlankList" class="match-list"></div>
      <button id="sourceBlankCheck" class="primary full" style="margin-top:14px">答え合わせ</button>`;
    const list=$("#sourceBlankList");
    blanks.forEach((b,i)=>{
      const card=document.createElement("div");
      card.className="match-row";
      card.innerHTML=`<div class="match-main"><b>${b.label}</b><select><option value="">選ぶ</option>${shuffle(b.choices).map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}</select></div><div class="match-mark">⚠️ ←ここを見直そう</div>`;
      list.appendChild(card);
    });
    $("#sourceBlankCheck").onclick=()=>{
      let all=true;
      $$("#sourceBlankList .match-row").forEach((row,i)=>{
        row.classList.remove("bad");
        if(row.querySelector("select").value!==blanks[i].answer){all=false;row.classList.add("bad");}
      });
      if(all){
        locked=true; $$("#sourceBlankList select").forEach(x=>x.disabled=true); $("#sourceBlankCheck").disabled=true;
        showFeedback(`⭕ <b>正解！</b><br>${success}`,"correct"); enableNext();
      }else{
        showFeedback("🔎 赤枠の欄だけ見直そう。教材の文の意味と地名の関係を考えてください。","wrong");
      }
    };
  }

  async function chapter3SourceRiverMap(){
    setHeader("3-7 ポイント・チェック② 地図から川を特定");
    stage.innerHTML=`
      <div class="stage-label">🗾 ポイント・チェック ②</div>
      <p style="margin-top:12px;line-height:1.7;font-weight:800">説明文を読んで、同じ地図上の記号をタップし、その川の名前も答えよう。</p>
      <div class="sticky-map-wrap">
        <div class="sticky-map-head"><b>地図は問題が変わっても固定</b><div class="map-tools"><button id="zout">−</button><button id="zreset">↺</button><button id="zin">＋</button></div></div>
        <div id="mapViewport" class="map-viewport"><svg id="sourceRiverMap" viewBox="0 0 820 620"></svg></div>
      </div>
      <div class="map-question-panel">
        <div id="mqCount" class="qcount"></div><p id="mqText" class="qtext"></p>
        <div id="mqHint" class="map-hint">地図上の記号を直接タップしよう。</div>
        <div id="riverNameChoices" class="option-grid hidden" style="margin-top:10px"></div>
      </div>`;
    let zoom=1; const svgEl=$("#sourceRiverMap"); const setZoom=()=>svgEl.style.width=(100*zoom)+"%";
    $("#zin").onclick=()=>{zoom=Math.min(2.3,zoom+.3);setZoom()}; $("#zout").onclick=()=>{zoom=Math.max(1,zoom-.3);setZoom()}; $("#zreset").onclick=()=>{zoom=1;setZoom();$("#mapViewport").scrollTo({left:0,top:0,behavior:"smooth"})};

    const rivers=[
      {id:"i",symbol:"イ",name:"石狩川",lon:141.65,lat:43.2},
      {id:"o",symbol:"オ",name:"最上川",lon:140.05,lat:38.75},
      {id:"ku",symbol:"ク",name:"信濃川",lon:138.85,lat:37.45},
      {id:"sa",symbol:"サ",name:"木曽川",lon:136.75,lat:35.15},
      {id:"a",symbol:"ア",name:"北上川",lon:141.15,lat:39.25},
      {id:"ka",symbol:"カ",name:"利根川",lon:140.3,lat:36.0},
      {id:"ko",symbol:"コ",name:"富士川",lon:138.55,lat:35.25},
      {id:"so",symbol:"ソ",name:"筑後川",lon:130.55,lat:33.2}
    ];
    const questions=[
      {symbol:"オ",answer:"最上川",q:"1　東北地方の南部から北に流れ、県庁所在地のある盆地や庄内平野を通って日本海へそそぐ川は？",hint:"庄内平野・日本海が手がかり。"},
      {symbol:"イ",answer:"石狩川",q:"2　日本の最低気温−41.0℃を記録した盆地を流れ、石狩平野を通って日本海へそそぐ川は？",hint:"北海道・石狩平野が手がかり。"},
      {symbol:"サ",answer:"木曽川",q:"3　2つの山脈の間を流れ、下流で長良川・揖斐川と低湿な平野をつくり伊勢湾へそそぐ川は？",hint:"長良川・揖斐川・伊勢湾が手がかり。"},
      {symbol:"ク",answer:"信濃川",q:"4　日本一の長さをもち、有数の米どころとして知られる平野をつくり日本海へそそぐ川は？",hint:"日本一の長さ・米どころ・日本海が手がかり。"}
    ];
    let svg=null,proj=null,qi=0,chosenSymbol=null;
    try{
      const d3=await import("https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm");
      const topo=await import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm");
      const worldModule=await import("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm");
      const countries=topo.feature(worldModule.default,worldModule.default.objects.countries).features;
      const japan=countries.find(d=>String(d.id)==="392");
      svg=d3.select("#sourceRiverMap"); proj=d3.geoMercator().center([137.4,36.2]).scale(1200).translate([410,300]); const path=d3.geoPath(proj);
      svg.append("path").datum(japan).attr("d",path).attr("fill","#fff").attr("stroke","#77756d").attr("stroke-width",1.5);
      rivers.forEach(r=>{const [x,y]=proj([r.lon,r.lat]);
        svg.append("path").attr("d",`M${x-18},${y-20} Q${x+6},${y-4} ${x-3},${y+20}`).attr("fill","none").attr("stroke","#5a8fa8").attr("stroke-width",4).attr("stroke-linecap","round");
        const g=svg.append("g").attr("class","map-point").attr("data-symbol",r.symbol).attr("transform",`translate(${x},${y})`).attr("role","button").attr("tabindex",0);
        g.append("circle").attr("r",16); g.append("text").attr("text-anchor","middle").attr("dy",".35em").text(r.symbol);
        g.on("click",()=>pickSymbol(r.symbol));
      });
      svg.append("text").attr("x",18).attr("y",26).attr("font-size",13).attr("fill","#555").text("青線＝川　丸印＝教材形式の記号");
    }catch(e){$("#mapViewport").innerHTML='<div class="read-box">地図データを読み込めませんでした。通信を確認して再読み込みしてください。</div>'}

    function clearMarks(){ $$(".map-point").forEach(g=>g.classList.remove("wrong","correct")); $("#riverNameChoices").classList.add("hidden"); $("#riverNameChoices").innerHTML=""; chosenSymbol=null; }
    function showQ(){clearMarks();const q=questions[qi];$("#mqCount").textContent=`地図問題 ${qi+1} / ${questions.length}`;$("#mqText").textContent=q.q;$("#mqHint").textContent=q.hint+" まず記号をタップ。"}
    function pickSymbol(symbol){if(locked)return;const q=questions[qi];const g=document.querySelector(`.map-point[data-symbol="${symbol}"]`);
      if(symbol!==q.symbol){g?.classList.add("wrong");$("#mqHint").innerHTML=`⚠️ 記号<b>${symbol}</b>ではありません。${q.hint}`;setTimeout(()=>g?.classList.remove("wrong"),700);return;}
      chosenSymbol=symbol; g?.classList.add("correct"); $("#mqHint").innerHTML=`⭕ 記号は <b>${symbol}</b>。次に川の名前を選ぼう。`;
      const grid=$("#riverNameChoices");grid.classList.remove("hidden");
      const names=shuffle([q.answer,...rivers.map(r=>r.name).filter(n=>n!==q.answer)].slice(0,4));
      // ensure plausible 4 items including answer
      const pool=shuffle([...new Set([q.answer,"最上川","石狩川","木曽川","信濃川","利根川","北上川","富士川"])]).filter(n=>n!==q.answer).slice(0,3);
      grid.innerHTML=""; shuffle([q.answer,...pool]).forEach(name=>{const b=document.createElement("button");b.className="option";b.textContent=name;b.onclick=()=>pickName(name,b);grid.appendChild(b)});
    }
    function pickName(name,b){const q=questions[qi];if(name!==q.answer){b.disabled=true;b.classList.add("wrong");$("#mqHint").innerHTML=`⚠️ 記号は合っています。川名は<b>${name}</b>ではありません。説明文の平野や注ぐ海を確認しよう。`;return;}
      b.classList.add("correct");$$("#riverNameChoices button").forEach(x=>x.disabled=true);$("#mqHint").innerHTML=`⭕ <b>記号${q.symbol}・${q.answer}</b>。記号と川名の両方が正解です。`;
      setTimeout(()=>{qi++;if(qi<questions.length)showQ();else{locked=true;showFeedback("⭕ 教材のポイント・チェック②の4問を、地図を固定したまま記号＋川名まで確認しました。","correct");enableNext()}},950);
    }
    showQ();
  }

  function chapter3WrittenStep(){
    setHeader("3-8 ポイント・チェック③ 記述");
    const pieces=["長さが短く","流れが急である"];
    stage.innerHTML=`
      <div class="stage-label">✍️ ポイント・チェック ③</div>
      <p style="margin-top:14px;font-weight:900;line-height:1.8">大陸を流れる外国の大きな川とくらべたとき、日本の川の特色を説明しなさい。</p>
      <div class="diagram-grid" style="margin-top:12px">
        <div class="diagram"><b>外国の大河川</b><svg viewBox="0 0 300 110"><path d="M10 35 Q95 45 180 68 T290 82" fill="none" stroke="#5a8fa8" stroke-width="6"/><text x="150" y="22" text-anchor="middle" font-size="13">長く、傾きがゆるやか</text></svg></div>
        <div class="diagram"><b>日本の川</b><svg viewBox="0 0 300 110"><path d="M65 20 L105 72 L190 88" fill="none" stroke="#5a8fa8" stroke-width="6"/><text x="150" y="105" text-anchor="middle" font-size="13">海までの距離が短い</text></svg></div>
      </div>
      <p style="font-weight:800;margin-top:14px">次の2つを選んで、答えの文を完成させよう。</p>
      <div id="writtenChoices" class="option-grid"></div>
      <div id="writtenAnswer" class="read-box" style="margin-top:12px">日本の川は、<b>＿＿＿＿＿＿＿＿＿＿</b>。</div>
      <button id="writtenCheck" class="primary full" style="margin-top:14px">これで答える</button>`;
    const selected=[]; const choices=["長さが短く","流れが急である","長さが長く","流れがゆるやかである"];
    const grid=$("#writtenChoices");shuffle(choices).forEach(x=>{const b=document.createElement("button");b.className="option";b.textContent=x;b.onclick=()=>{if(selected.includes(x)){selected.splice(selected.indexOf(x),1);b.style.outline=""}else if(selected.length<2){selected.push(x);b.style.outline="3px solid var(--accent)"}$("#writtenAnswer").innerHTML=`日本の川は、<b>${selected.join("、")||"＿＿＿＿＿＿＿＿＿＿"}</b>。`};grid.appendChild(b)});
    $("#writtenCheck").onclick=()=>{const ok=pieces.every(x=>selected.includes(x))&&selected.length===2;if(ok){locked=true;$$("#writtenChoices button").forEach(b=>b.disabled=true);showFeedback("⭕ <b>長さが短く、流れが急である。</b><br>教材の記述問題③に必要な2点をそろえました。","correct");enableNext()}else showFeedback("🔎 外国の大河川と比べて、日本の川の『長さ』と『流れ』の2点を答えよう。","wrong")};
  }

  function chapter3MountainsMap(){
    return stickyJapanMapQuiz({
      title:"3-3 山脈を地図で確認",
      intro:"教材の地図にある山地・山脈を、位置と名前で結びつけます。地図は切り替わりません。",
      points:[
        {id:"hida",label:"A",name:"飛騨山脈",lon:137.6,lat:36.4},{id:"kiso",label:"B",name:"木曽山脈",lon:137.7,lat:35.85},{id:"akaishi",label:"C",name:"赤石山脈",lon:138.15,lat:35.55},{id:"echigo",label:"D",name:"越後山脈",lon:139.1,lat:37.0},{id:"kanto",label:"E",name:"関東山地",lon:138.75,lat:35.85}
      ],
      questions:[
        {q:"北アルプスともよばれる飛騨山脈はどこ？",answer:"hida",hint:"日本アルプスの3山脈のうち最も北側。"},
        {q:"南アルプスともよばれる赤石山脈はどこ？",answer:"akaishi",hint:"飛騨・木曽・赤石のうち最も東寄り。"},
        {q:"信濃川の源流に関係する越後山脈はどこ？",answer:"echigo",hint:"新潟県側の山地を探そう。"},
        {q:"富士川の源流に関係する関東山地はどこ？",answer:"kanto",hint:"関東地方の西側を探そう。"}
      ],afterAll:"同じ地図を見ながら、山脈の位置を4問続けて確認できました。"
    });
  }

  function chapter3RapidRiversMap(){
    return stickyJapanMapQuiz({title:"3-5 日本三急流を地図で確認",intro:"日本三急流を、名前だけでなく位置でも覚えます。",
      points:[{id:"mogami",label:"A",name:"最上川",lon:140.0,lat:38.75},{id:"fuji",label:"B",name:"富士川",lon:138.6,lat:35.25},{id:"kuma",label:"C",name:"球磨川",lon:130.7,lat:32.25},{id:"tone",label:"D",name:"利根川",lon:140.45,lat:35.8}],
      questions:[{q:"山形県を流れる日本三急流・最上川はどこ？",answer:"mogami"},{q:"山梨・静岡方面を流れる日本三急流・富士川はどこ？",answer:"fuji"},{q:"熊本県を流れる日本三急流・球磨川はどこ？",answer:"kuma"}],afterAll:"最上川・富士川・球磨川を、地図上の位置とセットで確認しました。"});
  }

  function chapter3RiverInferenceMap(){
    return stickyJapanMapQuiz({title:"3-6 説明から川を探す",intro:"教材と同じように、説明文を読んで地図上の川を特定します。問題が変わっても地図はそのままです。",
      points:[{id:"mogami",label:"ア",name:"最上川",lon:140.0,lat:38.75},{id:"ishikari",label:"イ",name:"石狩川",lon:141.8,lat:43.15},{id:"kiso",label:"ウ",name:"木曽川",lon:136.75,lat:35.25},{id:"shinano",label:"エ",name:"信濃川",lon:138.75,lat:37.55},{id:"tone",label:"オ",name:"利根川",lon:140.45,lat:35.8},{id:"kitakami",label:"カ",name:"北上川",lon:141.2,lat:39.2}],
      questions:[
        {q:"東北地方南部から北に流れ、盆地や庄内平野を通って日本海へ注ぐ川は？",answer:"mogami",hint:"『庄内平野』『日本海』が決め手。"},
        {q:"日本最低気温を記録した盆地を流れ、石狩平野を通って日本海へ注ぐ川は？",answer:"ishikari",hint:"北海道の石狩平野を探そう。"},
        {q:"長良川・揖斐川と低湿な平野をつくり、伊勢湾へ注ぐ川は？",answer:"kiso",hint:"中部地方・伊勢湾側。"},
        {q:"日本一の長さをもち、有数の米どころの平野をつくって日本海へ注ぐ川は？",answer:"shinano",hint:"新潟県の越後平野につながる。"}
      ],afterAll:"文章中の『平野』『流れる向き』『注ぐ海』を根拠に、4つの川を地図から特定しました。"});
  }


  function dataTableMatchStep({title,intro,rows}){
    setHeader(title);
    stage.innerHTML = `
      <div class="stage-label">📊 図表を読み取る</div>
      <p style="margin-top:12px;line-height:1.8;font-weight:800">${intro}</p>
      <div class="table-scroll"><table class="study-table">
        <thead><tr><th>川</th><th>長さ</th><th>流域面積</th></tr></thead>
        <tbody id="riverDataRows"></tbody>
      </table></div>
      <button id="tableCheck" class="primary full" style="margin-top:14px">答え合わせ</button>`;
    const body=$("#riverDataRows");
    const lengths=rows.map(r=>r.length);
    const basins=rows.map(r=>r.basin);
    rows.forEach((r,i)=>{
      const tr=document.createElement("tr");
      tr.dataset.index=i;
      tr.innerHTML=`<td><b>${r.name}</b><div class="row-mark">⚠️ ←ここを見直そう</div></td>
        <td><select class="lengthSel"><option value="">選ぶ</option>${shuffle(lengths).map(x=>`<option value="${x}">${x}</option>`).join("")}</select></td>
        <td><select class="basinSel"><option value="">選ぶ</option>${shuffle(basins).map(x=>`<option value="${x}">${x}</option>`).join("")}</select></td>`;
      body.appendChild(tr);
    });
    $("#tableCheck").onclick=()=>{
      let all=true;
      $$("#riverDataRows tr").forEach((tr,i)=>{
        tr.classList.remove("bad-row");
        const ok=tr.querySelector(".lengthSel").value===rows[i].length && tr.querySelector(".basinSel").value===rows[i].basin;
        if(!ok){all=false;tr.classList.add("bad-row");}
      });
      if(all){
        locked=true; $$("#riverDataRows select").forEach(x=>x.disabled=true); $("#tableCheck").disabled=true;
        showFeedback("⭕ 6本すべての長さと流域面積を図表から対応できました。<br>この図では、<b>最長＝信濃川367km</b>、<b>流域面積最大＝利根川1.7万km²</b>です。","correct"); enableNext();
      }else showFeedback("🔎 赤く示された行だけ見直そう。長さと流域面積の列を取り違えていないか確認してください。","wrong");
    };
  }

  function chapter3MountainPatternStep(){
    return sourceBlankStep({
      title:"3-2 山地の割合と並び方",number:"要点①",
      prompt:"要点のまとめにある『割合』と『山地の並び方』を全部完成させよう。",
      blanks:[
        {label:"山地の面積",answer:"国土の4分の3",choices:["国土の4分の3","国土の3分の2","国土の4分の1"]},
        {label:"平地の面積",answer:"国土の4分の1",choices:["国土の4分の1","国土の3分の1","国土の2分の1"]},
        {label:"森林面積",answer:"国土の3分の2",choices:["国土の3分の2","国土の4分の3","国土の4分の1"]},
        {label:"東北日本の山地",answer:"ほぼ3列に南北",choices:["ほぼ3列に南北","ほぼ2列に東西","ほぼ3列に東西"]},
        {label:"東北日本の山系",answer:"北弯山系",choices:["北弯山系","南弯山系","日本アルプス"]},
        {label:"西南日本の山地",answer:"ほぼ2列に東西",choices:["ほぼ2列に東西","ほぼ3列に南北","ほぼ2列に南北"]},
        {label:"西南日本の山系",answer:"南弯山系",choices:["南弯山系","北弯山系","フォッサマグナ"]}
      ],
      success:"山地4分の3・平地4分の1・森林3分の2。東北日本はほぼ3列に南北、西南日本はほぼ2列に東西です。"
    });
  }

  function chapter3AlpsStep(){
    return sourceBlankStep({
      title:"3-3 日本アルプスと日本の屋根",number:"要点②",
      prompt:"日本アルプス3山脈と呼び名、日本の屋根を整理しよう。",
      blanks:[
        {label:"飛騨山脈",answer:"北アルプス",choices:["北アルプス","中央アルプス","南アルプス"]},
        {label:"木曽山脈",answer:"中央アルプス",choices:["中央アルプス","北アルプス","南アルプス"]},
        {label:"赤石山脈",answer:"南アルプス",choices:["南アルプス","中央アルプス","北アルプス"]},
        {label:"『日本の屋根』",answer:"3000m級の山々",choices:["3000m級の山々","2000m級の山々","1000m級の山々"]}
      ],
      success:"飛騨＝北、木曽＝中央、赤石＝南。3000m級の山々が連なる地域を『日本の屋根』とよびます。"
    });
  }

  function chapter3MountainMapNorth(){
    return stickyJapanMapQuiz({
      title:"3-4 地図：北海道・東北の山地",intro:"要点の地図にある北海道・東北の山地を、同じ日本地図のまま順番に答えます。位置は学習用の概略点です。",
      points:[
        {id:"kitami",label:"A",name:"北見山地",lon:143.6,lat:43.8},{id:"teshio",label:"B",name:"天塩山地",lon:142.0,lat:44.3},{id:"yubari",label:"C",name:"夕張山地",lon:142.2,lat:43.1},{id:"hidaka",label:"D",name:"日高山脈",lon:142.8,lat:42.4},
        {id:"dewa",label:"E",name:"出羽山地",lon:140.0,lat:39.4},{id:"ou",label:"F",name:"奥羽山脈",lon:140.7,lat:39.1},{id:"kitakami",label:"G",name:"北上高地",lon:141.4,lat:39.5},{id:"abukuma",label:"H",name:"阿武隈高地",lon:140.7,lat:37.4}
      ],
      questions:[
        {q:"北海道北東部の北見山地はどこ？",answer:"kitami"},{q:"北海道北部の天塩山地はどこ？",answer:"teshio"},{q:"北海道中央部の夕張山地はどこ？",answer:"yubari"},{q:"北海道南東部の日高山脈はどこ？",answer:"hidaka"},
        {q:"東北地方の日本海側にある出羽山地はどこ？",answer:"dewa"},{q:"東北地方中央部を南北にのびる奥羽山脈はどこ？",answer:"ou"},{q:"東北地方東側の北上高地はどこ？",answer:"kitakami"},{q:"東北地方南東部の阿武隈高地はどこ？",answer:"abukuma"}
      ],afterAll:"北海道・東北の8つを地図で確認しました。"
    });
  }

  function chapter3MountainMapCentral(){
    return stickyJapanMapQuiz({
      title:"3-5 地図：中部・関東の山地",intro:"フォッサマグナ周辺と日本アルプスを、位置と名前で結びつけます。位置は学習用の概略点です。",
      points:[
        {id:"echigo",label:"A",name:"越後山脈",lon:139.1,lat:37.0},{id:"hida",label:"B",name:"飛騨山脈",lon:137.6,lat:36.3},{id:"kiso",label:"C",name:"木曽山脈",lon:137.7,lat:35.8},{id:"akaishi",label:"D",name:"赤石山脈",lon:138.15,lat:35.5},{id:"kanto",label:"E",name:"関東山地",lon:138.75,lat:35.8},{id:"fossa",label:"F",name:"フォッサマグナ",lon:138.4,lat:36.2}
      ],
      questions:[
        {q:"越後山脈はどこ？",answer:"echigo"},{q:"飛騨山脈（北アルプス）はどこ？",answer:"hida"},{q:"木曽山脈（中央アルプス）はどこ？",answer:"kiso"},{q:"赤石山脈（南アルプス）はどこ？",answer:"akaishi"},{q:"関東山地はどこ？",answer:"kanto"},{q:"本州中央部を南北にはしる大地溝帯・フォッサマグナはどこ？",answer:"fossa"}
      ],afterAll:"中部・関東の山地とフォッサマグナを地図で確認しました。"
    });
  }

  function chapter3MountainMapWest(){
    return stickyJapanMapQuiz({
      title:"3-6 地図：西日本の山地",intro:"要点の地図にある近畿・中国・四国・九州の山地を答えます。位置は学習用の概略点です。",
      points:[
        {id:"suzuka",label:"A",name:"鈴鹿山脈",lon:136.4,lat:35.1},{id:"tamba",label:"B",name:"丹波高地",lon:135.3,lat:35.2},{id:"kii",label:"C",name:"紀伊山地",lon:135.8,lat:34.1},{id:"chugoku",label:"D",name:"中国山地",lon:133.2,lat:35.0},{id:"shikoku",label:"E",name:"四国山地",lon:133.5,lat:33.7},{id:"sanuki",label:"F",name:"讃岐山脈",lon:134.0,lat:34.1},{id:"tsukushi",label:"G",name:"筑紫山地",lon:130.7,lat:33.5},{id:"kyushu",label:"H",name:"九州山地",lon:131.2,lat:32.4}
      ],
      questions:[
        {q:"鈴鹿山脈はどこ？",answer:"suzuka"},{q:"丹波高地はどこ？",answer:"tamba"},{q:"紀伊山地はどこ？",answer:"kii"},{q:"中国山地はどこ？",answer:"chugoku"},{q:"四国山地はどこ？",answer:"shikoku"},{q:"讃岐山脈はどこ？",answer:"sanuki"},{q:"筑紫山地はどこ？",answer:"tsukushi"},{q:"九州山地はどこ？",answer:"kyushu"}
      ],afterAll:"西日本の8つの山地・山脈を地図で確認しました。"
    });
  }

  function chapter3LakeStep(){
    return sourceBlankStep({
      title:"3-7 湖のでき方と例",number:"要点③",
      prompt:"要点のまとめにある湖を、種類と結びつけよう。",
      blanks:[
        {label:"十和田湖",answer:"カルデラ湖",choices:["カルデラ湖","せき止め湖","断層湖","潟湖","河せき湖（三日月湖）"]},
        {label:"摩周湖",answer:"カルデラ湖",choices:["カルデラ湖","せき止め湖","断層湖","潟湖","河せき湖（三日月湖）"]},
        {label:"洞爺湖",answer:"カルデラ湖",choices:["カルデラ湖","せき止め湖","断層湖","潟湖","河せき湖（三日月湖）"]},
        {label:"田沢湖",answer:"カルデラ湖",choices:["カルデラ湖","せき止め湖","断層湖","潟湖","河せき湖（三日月湖）"]},
        {label:"富士五湖",answer:"せき止め湖",choices:["せき止め湖","カルデラ湖","断層湖","潟湖","河せき湖（三日月湖）"]},
        {label:"琵琶湖",answer:"断層湖",choices:["断層湖","カルデラ湖","せき止め湖","潟湖","河せき湖（三日月湖）"]},
        {label:"諏訪湖",answer:"断層湖",choices:["断層湖","カルデラ湖","せき止め湖","潟湖","河せき湖（三日月湖）"]},
        {label:"八郎潟",answer:"潟湖",choices:["潟湖","カルデラ湖","せき止め湖","断層湖","河せき湖（三日月湖）"]},
        {label:"サロマ湖",answer:"潟湖",choices:["潟湖","カルデラ湖","せき止め湖","断層湖","河せき湖（三日月湖）"]},
        {label:"石狩川流域",answer:"河せき湖（三日月湖）",choices:["河せき湖（三日月湖）","カルデラ湖","せき止め湖","断層湖","潟湖"]}
      ],
      success:"湖の5分類と、要点に載っている具体例をすべて対応できました。田沢湖は日本最深です。"
    });
  }

  function chapter3LakeFactsStep(){
    return sourceBlankStep({
      title:"3-8 湖の重要ポイント",number:"要点④",
      prompt:"湖について、まとめ欄と一口メモの情報まで確認しよう。",
      blanks:[
        {label:"日本最深の湖",answer:"田沢湖",choices:["田沢湖","琵琶湖","十和田湖","摩周湖"]},
        {label:"地図の『85』",answer:"湖面の標高",choices:["湖面の標高","最深部の深さ","湖の面積","湖岸の長さ"]},
        {label:"地図の『−104』",answer:"最も深いところの深さ",choices:["最も深いところの深さ","湖面の標高","湖の面積","湖岸の長さ"]}
      ],
      success:"田沢湖＝日本最深。琵琶湖の例では、85は湖面の標高、−104は最深部の深さを表します。"
    });
  }

  function chapter3RiverFeatureStep(){
    return multiSelectStep({
      title:"3-9 日本の川の特色",question:"要点のまとめに書かれている日本の川の特色を、全部選ぼう。",
      choices:["流れが急で長さが短い","ダムをつくって水力発電に利用しやすい","洪水がおこりやすい","舟運に利用しにくい","流れがゆるやかで長さが長い","舟運に利用しやすい"],
      answers:["流れが急で長さが短い","ダムをつくって水力発電に利用しやすい","洪水がおこりやすい","舟運に利用しにくい"],
      success:"要点の4点をすべて選べました。"
    });
  }

  function chapter3RiverTableStep(){
    return dataTableMatchStep({
      title:"3-10 図表：川の長さと流域面積",intro:"教材の図表をもとに、6本の川の長さと流域面積を対応させよう。",
      rows:[
        {name:"信濃川（中部）",length:"367km",basin:"1.2万km²"},
        {name:"利根川（関東）",length:"322km",basin:"1.7万km²"},
        {name:"石狩川（北海道）",length:"268km",basin:"1.4万km²"},
        {name:"天塩川（北海道）",length:"256km",basin:"0.6万km²"},
        {name:"北上川（東北）",length:"249km",basin:"1.0万km²"},
        {name:"阿武隈川（東北）",length:"239km",basin:"0.5万km²"}
      ]
    });
  }


  function chapter4LandformMatch(){
    return matchStep({title:"4-2 土地のでき方と利用",prompt:"地形の特徴を対応させよう。",rows:[
      {label:"川が山地から平地へ出るところ・水はけがよい",choices:["扇状地","三角州","河岸段丘","海岸平野"]},
      {label:"川が海へ注ぐところ・水もちがよい",choices:["扇状地","三角州","河岸段丘","海岸平野"]},
      {label:"川すじにできた階段状の土地",choices:["扇状地","三角州","河岸段丘","海岸平野"]},
      {label:"海岸が隆起してできた平野",choices:["扇状地","三角州","河岸段丘","海岸平野"]}
    ],answers:["扇状地","三角州","河岸段丘","海岸平野"],success:"扇状地は水はけがよく果樹園など、三角州は水もちがよく水田に利用されます。"});
  }
  function chapter4PlateauMatch(){
    return matchStep({title:"4-3 台地を場所と産業で覚える",prompt:"台地と特色を対応させよう。",rows:[
      {label:"根室と釧路の中間・大規模な酪農",choices:["根釧台地","牧ノ原","シラス台地"]},
      {label:"大井川下流・日本最大の茶の産地",choices:["根釧台地","牧ノ原","シラス台地"]},
      {label:"鹿児島〜宮崎・畑作や畜産",choices:["根釧台地","牧ノ原","シラス台地"]}
    ],answers:["根釧台地","牧ノ原","シラス台地"],success:"地名だけでなく『どこ・何がさかん』までつなげました。"});
  }
  async function chapter4SourceMap(){
    return stickyJapanMapQuiz({
      title:"4-9 ポイント・チェック② 地図で平野・盆地を特定",
      intro:"教材②と同じ4つの説明です。問題が変わっても地図はそのまま。説明を読んで、地図上の記号を直接タップしよう。",
      points:[
        {id:"a",label:"ア",name:"石狩平野",lon:141.5,lat:43.1},{id:"e",label:"エ",name:"北上盆地",lon:141.1,lat:39.4},
        {id:"sa",label:"サ",name:"甲府盆地",lon:138.6,lat:35.65},{id:"se",label:"セ",name:"徳島平野",lon:134.55,lat:34.05},
        {id:"ta",label:"タ",name:"筑紫平野",lon:130.35,lat:33.25},{id:"so",label:"ソ",name:"広島平野",lon:132.45,lat:34.4},
        {id:"ka",label:"カ",name:"越後平野",lon:139.0,lat:37.7},{id:"ko",label:"コ",name:"関東平野",lon:139.6,lat:36.0}
      ],
      questions:[
        {q:"1　四国山地をぬうように流れる川がつくり、紀伊半島と向かい合う平野。",answer:"se",explain:"セ＝徳島平野。"},
        {q:"2　日本で最も干潮と満潮の差がはげしい有明海に面している平野。",answer:"ta",explain:"タ＝筑紫平野。"},
        {q:"3　山梨県の県庁所在地があり、笛吹川と釜無川が合流するところにある盆地。",answer:"sa",explain:"サ＝甲府盆地。"},
        {q:"4　西を奥羽山脈、東を北上高地にはさまれ、南北に細長くのびる盆地。",answer:"e",explain:"エ＝北上盆地。"}
      ],afterAll:"教材②の4問をすべて地図上で確認しました。位置は実際の日本列島上に学習用ポイントとして示しています。"
    });
  }

  const chapters = {
    1: [
      ()=>readStep({
        title:"1-1 日本列島の基本データ",
        text:`日本の面積は北方領土などを含めて約<b>37.8万km²</b>（問題では約38万km²）。2019年の人口は約<b>1億2617万人</b>、人口密度は約<b>338人/km²</b>です。日本列島はアジア大陸の東側にあり、北東から南西へ約<b>3000km</b>にわたって連なり、約<b>7000の島々</b>からなります。`,
        focus:"数字だけ読まず、「面積」「人口」「人口密度」「向き」「長さ」「島の数」を区別する。"
      }),
      ()=>evidenceStep({
        title:"1-2 文章から位置と向きを読み取る",
        question:"日本列島がどちら向きに、どのくらい連なっているかを示す根拠は？",
        parts:["日本列島は","アジア大陸の東側にあり、","北東から南西へ約3000km","にわたって連なり、","約7000の島々","からなります。"],
        correctIndex:2,
        explain:"「北東から南西へ約3000km」が、向きと長さの両方に答えています。"
      }),
      ()=>japanMapStep(),
      ()=>quizStep({
        title:"1-4 四大島以外で最も広い島",
        question:"日本の四大島以外で最も面積が広い島は？",
        correct:"択捉島",
        distractors:["国後島","佐渡島","奄美大島"],
        extra:"教材では、択捉島を含む北方領土についても続けて学びます。",
        wrongHints:{
          "国後島":"国後島も北方領土に含まれますが、四大島以外で最も広いのは択捉島です。",
          "佐渡島":"佐渡島は大きな島ですが、択捉島より小さいです。",
          "奄美大島":"奄美大島も大きな島ですが、ここで問われている答えは択捉島です。"
        }
      }),
      ()=>readStep({
        title:"1-5 領土をめぐる関係",
        text:`教材では、北方領土は<b>ロシア連邦からまだ返還されていない</b>と説明されています。また、<b>竹島について韓国が</b>、<b>尖閣諸島について中国が</b>、領有をめぐって日本とは異なる主張をしています。`,
        focus:"「島＝国」と短く結びつけず、「どの島について、どの国が、どのような関係にあるか」を読む。"
      }),
      ()=>evidenceStep({
        title:"1-6 領土の文章から根拠を探す",
        question:"竹島について述べている根拠をタップしよう。",
        parts:["北方領土は","ロシア連邦からまだ返還されていません。","竹島について韓国が、","尖閣諸島について中国が、","領有をめぐって日本とは異なる主張をしています。"],
        correctIndex:2,
        explain:"「竹島について韓国が」が該当箇所。ただし文の意味は、その後の「日本とは異なる主張」までつなげて理解します。"
      }),
      ()=>quizStep({
        title:"1-7 標準時子午線",
        question:"日本の標準時子午線の組み合わせは？",
        correct:"東経135度・兵庫県明石市",
        distractors:["東経123度・沖縄県与那国町","東経140度・東京都","東経154度・東京都小笠原村"],
        extra:"東経135度の経線上で太陽が南中するときを正午とする考え方です。",
        wrongHints:{
          "東経123度・沖縄県与那国町":"123度は日本の西端・与那国島付近の経度です。",
          "東経154度・東京都小笠原村":"154度は日本の東端・南鳥島付近の経度です。"
        }
      }),
      ()=>readStep({
        title:"1-8 日本近海の海流",
        text:`日本海を北上する<b>対馬海流</b>と、太平洋を北上する<b>日本海流</b>があります。太平洋側では、<b>千島海流＝親潮</b>、<b>日本海流＝黒潮</b>ともよばれます。千島海流と日本海流は<b>三陸海岸の沖</b>で出合い、寒流と暖流が出合うところを<b>潮目</b>といいます。`,
        focus:"海流名 → 別名 → 出合う場所 → 潮目、までつなげて読む。"
      }),
      ()=>quizStep({
        title:"1-9 海流の別名",
        question:"日本海流の別名は？",
        correct:"黒潮",
        distractors:["親潮","千島海流","対馬海流"],
        extra:"日本海流＝黒潮、千島海流＝親潮。暖流と寒流が出合うところ＝潮目。",
        wrongHints:{
          "親潮":"親潮は千島海流の別名です。",
          "千島海流":"千島海流そのものは親潮とよばれます。",
          "対馬海流":"対馬海流は日本海を北上する別の暖流です。"
        }
      }),
      ()=>quizStep({
        title:"1-10 潮目と三陸海岸",
        question:"千島海流と日本海流が出合い、よい漁場になりやすい場所として教材に出るのは？",
        correct:"三陸海岸の沖",
        distractors:["能登半島の沖","紀伊半島の沖","薩摩半島の沖"],
        extra:"寒流と暖流が出合う場所＝潮目。三陸海岸の沖はその代表です。"
      }),
      ()=>quizStep({
        title:"1-11 東シナ海と大陸棚",
        question:"九州地方の西に広がり、浅くなだらかな海底「大陸棚」が発達している海は？",
        correct:"東シナ海",
        distractors:["日本海","オホーツク海","瀬戸内海"],
        extra:"海の名前と海底地形をセットで覚える：東シナ海 → 大陸棚。"
      }),
      ()=>infoStep({
        title:"1-12 1mと1カイリ",
        label:"STEP 3　🧮 数字の意味を整理",
        html:`<div class="calc-box">
          <b>1mのもとの考え方</b><br>
          北極から赤道までの距離の1000万分の1。<br><br>
          <b>1カイリ</b><br>
          緯度1分の長さで、<b>1852m</b>。
        </div>`,
        after:"「m」と「カイリ」は、どちらも地球の大きさや緯度と関係していることを確認しました。"
      }),
      ()=>quizStep({
        title:"1-13 赤道から房総半島南端まで",
        question:"地球の周囲を約4万kmとすると、赤道から北緯35度付近の房総半島南端までの距離はおよそ？",
        correct:"4000km",
        distractors:["2000km","3000km","6000km"],
        extra:"緯度1度≒111km。111×35≒3885kmなので、およそ4000kmです。"
      }),
      ()=>quizStep({
        title:"1-14 1カイリ",
        question:"1カイリは何m？",
        correct:"1852m",
        distractors:["1110m","1609m","2000m"],
        extra:"1カイリ＝緯度1分の長さ＝1852m。"
      }),
      ()=>matchStep({
        title:"1-15 日本の周辺国",
        prompt:"説明と国名を対応させよう。",
        rows:[
          {label:"日本の約25倍の面積・世界最大級の人口",choices:["中華人民共和国","ロシア連邦","大韓民国","朝鮮民主主義人民共和国"]},
          {label:"世界一広い面積",choices:["中華人民共和国","ロシア連邦","大韓民国","朝鮮民主主義人民共和国"]},
          {label:"日本に最も近く、経済的にも深い関係",choices:["中華人民共和国","ロシア連邦","大韓民国","朝鮮民主主義人民共和国"]},
          {label:"日本と正式な国交がなく、拉致問題",choices:["中華人民共和国","ロシア連邦","大韓民国","朝鮮民主主義人民共和国"]}
        ],
        answers:["中華人民共和国","ロシア連邦","大韓民国","朝鮮民主主義人民共和国"],
        success:"4か国を、名前だけでなく説明と結びつけました。"
      }),
      ()=>quizStep({
        title:"1-16 日本列島の南北距離",
        question:"南端約20度、北端約46度。緯度1度≒111kmとして計算すると、南北の距離はおよそ？",
        correct:"約3000km",
        distractors:["約1500km","約4500km","約6000km"],
        extra:"111×(46−20)=2886km。両端は同じ経度上ではないので、実際は少し長く、およそ3000km。",
        wrongHints:{
          "約4500km":"地球の4分の1ほどに近い値で、日本列島の南北距離としては大きすぎます。"
        }
      }),
      ()=>quizStep({
        title:"1-17 東西の南中時刻",
        question:"東端約154度、西端約123度。経度15度で1時間とすると、南鳥島で南中してから与那国島で南中するまでおよそ何時間？",
        correct:"約2時間",
        distractors:["約1時間","約3時間","約4時間"],
        extra:"経度差は約31度。31÷15≒2。東にある南鳥島の方が先に南中します。"
      })
    ],

    2: [
      ()=>readStep({
        title:"2-1 日本の海岸線",
        text:`日本の海岸線は約<b>3万5000km</b>と長く、<b>島が多い</b>ことに加え、<b>海岸線が複雑</b>です。`,
        focus:"「長い」という結果と、その理由になりそうな2つの特徴を分けて読む。"
      }),
      ()=>readStep({
        title:"2-2 リアス海岸",
        text:`<b>リアス海岸</b>は、山地が海に沈んでできた出入りの多い海岸です。漁港をつくりやすい一方、<b>地震による津波の被害を受けやすい</b>特徴があります。太平洋側に多く、<b>三陸海岸</b>や<b>志摩半島</b>が代表例です。`,
        focus:"でき方 → 形 → 利点 → 欠点 → 代表例、の順で読む。"
      }),
      ()=>evidenceStep({
        title:"2-3 リアス海岸の欠点",
        question:"リアス海岸の欠点を示す根拠をタップしよう。",
        parts:["リアス海岸は、","山地が海に沈んでできた","出入りの多い海岸です。","漁港をつくりやすい一方、","地震による津波の被害を受けやすい","特徴があります。"],
        correctIndex:4,
        explain:"欠点は「地震による津波の被害を受けやすい」ことです。"
      }),
      ()=>infoStep({
        title:"2-4 海岸の形を見比べる",
        html:`<div class="diagram-grid">
          <div class="diagram">
            <b>リアス海岸</b>
            <svg viewBox="0 0 300 150">
              <path d="M10 30 L50 55 L27 82 L80 65 L55 120 L118 85 L140 128 L180 80 L220 112 L250 60 L290 78" fill="none" stroke="#2b2b2b" stroke-width="5"/>
              <text x="150" y="20" text-anchor="middle" font-size="14" fill="#666">出入りが多い</text>
            </svg>
          </div>
          <div class="diagram">
            <b>砂浜海岸</b>
            <svg viewBox="0 0 300 150">
              <path d="M10 88 Q80 75 150 86 T290 82" fill="none" stroke="#2b2b2b" stroke-width="5"/>
              <text x="150" y="40" text-anchor="middle" font-size="14" fill="#666">比較的単調</text>
            </svg>
          </div>
        </div>`,
        after:"リアス海岸は出入りが多く、砂浜海岸は比較的単調。形の違いを言葉と結びつけました。"
      }),
      ()=>quizStep({
        title:"2-5 リアス海岸の代表例",
        question:"リアス海岸が多く、多くの漁港がある海岸は？",
        correct:"三陸海岸",
        distractors:["若狭湾沿岸","能登半島沿岸","山陰海岸"],
        extra:"教材では青森県から宮城県にかけての三陸海岸が代表例です。"
      }),
      ()=>quizStep({
        title:"2-6 志摩半島と真珠",
        question:"英虞湾や五ヶ所湾でさかんな養殖は？",
        correct:"真珠",
        distractors:["かき","ほたて貝","のり"],
        extra:"志摩半島のリアス海岸は波が静かで、真珠の養殖がさかんです。",
        wrongHints:{
          "かき":"かき養殖も湾で行われますが、この教材で英虞湾・五ヶ所湾と結びつくのは真珠です。",
          "ほたて貝":"ほたて貝は別地域の養殖と混同しやすい選択肢です。"
        }
      }),
      ()=>readStep({
        title:"2-7 砂浜海岸・砂嘴・砂州",
        text:`<b>砂浜海岸</b>は、波によって砂が打ち上げられてできた比較的単調な海岸で、日本海側に多く見られます。教材では<b>鳥取砂丘</b>が例です。さらに、砂が細長く突き出したものを<b>砂嘴</b>、それが発達して内側に湖や湾をつくるものを<b>砂州</b>と説明しています。`,
        focus:"砂浜海岸・砂嘴・砂州を、似た言葉でも別物として読む。"
      }),
      ()=>quizStep({
        title:"2-8 砂浜海岸の例",
        question:"教材で砂浜海岸の例として出てくるのは？",
        correct:"鳥取砂丘",
        distractors:["三陸海岸","志摩半島","英虞湾"],
        extra:"鳥取砂丘は山陰地方の砂浜海岸の代表例として扱われています。"
      }),
      ()=>matchStep({
        title:"2-9 四大島の面積比",
        prompt:"面積の関係を完成させよう。",
        rows:[
          {label:"九州 ÷ 四国",choices:["2倍","3倍","4倍"]},
          {label:"北海道 ÷ 九州",choices:["2倍","3倍","4倍"]},
          {label:"本州 ÷ 北海道",choices:["2倍","3倍","4倍"]}
        ],
        answers:["2倍","2倍","3倍"],
        success:"九州≒四国×2、北海道≒九州×2、本州≒北海道×3。"
      }),
      ()=>chapter2MapStep(),
      ()=>matchStep({
        title:"2-10 半島 1〜9",
        prompt:"教材の地図の番号と半島名を対応させよう。",
        rows:[
          {label:"1",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"2",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"3",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"4",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"5",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"6",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"7",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"8",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]},
          {label:"9",choices:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"]}
        ],
        answers:["知多半島","渥美半島","津軽半島","下北半島","薩摩半島","大隅半島","伊豆半島","島原半島","房総半島"],
        success:"1 知多／2 渥美／3 津軽／4 下北／5 薩摩／6 大隅／7 伊豆／8 島原／9 房総"
      }),
      ()=>matchStep({
        title:"2-11 湾・海 ア〜カ",
        prompt:"教材の地図の記号と湾・海の名前を対応させよう。",
        rows:[
          {label:"ア",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]},
          {label:"イ",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]},
          {label:"ウ",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]},
          {label:"エ",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]},
          {label:"オ",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]},
          {label:"カ",choices:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"]}
        ],
        answers:["伊勢湾","三河湾","陸奥湾","駿河湾","有明海","東京湾"],
        success:"ア 伊勢湾／イ 三河湾／ウ 陸奥湾／エ 駿河湾／オ 有明海／カ 東京湾"
      }),
      ()=>readStep({
        title:"2-12 「津」「浦」の地名",
        text:`日本は湾が多く港が発達しているため、「浦」や「津」のつく地名が多くあります。教材では、かつて安濃津とよばれた<b>津</b>、まぐろ・かつおの遠洋漁業の根拠地である<b>焼津</b>、富士山南部の砂浜海岸にある<b>田子ノ浦</b>を扱います。`,
        focus:"地名だけ暗記せず、説明から地名を言えるようにする。"
      }),
      ()=>matchStep({
        title:"2-13 地名 A〜C",
        prompt:"説明と地名を対応させよう。",
        rows:[
          {label:"A かつて安濃津とよばれた",choices:["津","焼津","田子ノ浦"]},
          {label:"B まぐろ・かつおの遠洋漁業",choices:["津","焼津","田子ノ浦"]},
          {label:"C 富士山南部の砂浜海岸",choices:["津","焼津","田子ノ浦"]}
        ],
        answers:["津","焼津","田子ノ浦"],
        success:"A＝津、B＝焼津、C＝田子ノ浦。"
      }),
      ()=>evidenceStep({
        title:"2-14 海岸線が長い理由",
        question:"「日本の海岸線が長い理由」のうち、島の数に関係する根拠をタップしよう。",
        parts:["日本の海岸線は約3万5000kmと長く、","島が多い","ことに加え、","海岸線が複雑","です。"],
        correctIndex:1,
        explain:"理由は1つではありません。「島が多い」と「海岸線が複雑」の2つをそろえます。"
      }),
      ()=>quizStep({
        title:"2-15 記述問題の完成",
        question:"日本の海岸線が長い理由として最も適切なのは？",
        correct:"海岸線が複雑で、また、多くの島からなっているため",
        distractors:[
          "山地が多く、川が短いため",
          "太平洋側にリアス海岸が多いため",
          "日本海側に砂浜海岸が多いため"
        ],
        extra:"教材の記述では、<b>「海岸線が複雑」＋「多くの島からなる」</b>の2点が必要です。",
        wrongHints:{
          "太平洋側にリアス海岸が多いため":"一部の海岸の特徴だけでは、日本全体の海岸線が長い理由として不十分です。",
          "日本海側に砂浜海岸が多いため":"砂浜海岸は比較的単調なので、この理由にはなりません。"
        }
      })
    ],
    3: [
      ()=>readStep({
        title:"3-1 この章で何をつかむ？",
        text:`日本は山がちで、山地・山脈の並び方には地域差があります。日本アルプスやフォッサマグナ、湖のでき方、日本の川の特色、川の長さと流域面積を、<b>文章・地図・図表</b>を使って整理します。最後は教材のポイント・チェック①〜③をその形式に合わせて解きます。`,
        focus:"『名前を読むだけ』ではなく、割合・位置・分類・図表・理由のどれを問われているかを意識する。"
      }),
      ()=>chapter3MountainPatternStep(),
      ()=>chapter3AlpsStep(),
      ()=>chapter3MountainMapNorth(),
      ()=>chapter3MountainMapCentral(),
      ()=>chapter3MountainMapWest(),
      ()=>chapter3LakeStep(),
      ()=>chapter3LakeFactsStep(),
      ()=>chapter3RiverFeatureStep(),
      ()=>chapter3RiverTableStep(),
      ()=>sourceBlankStep({
        title:"3-11 ポイント・チェック①(1)",number:"①(1)",
        prompt:"日本の国土は山がちです。山地と森林の割合を完成させよう。",
        blanks:[
          {label:"ア　山地の面積は国土の…",answer:"4分の3",choices:["4分の3","3分の2","4分の1"]},
          {label:"イ　森林の面積は国土の…",answer:"3分の2",choices:["4分の3","3分の2","4分の1"]}
        ],success:"ア＝4分の3、イ＝3分の2。"
      }),
      ()=>sourceBlankStep({
        title:"3-12 ポイント・チェック①(2)",number:"①(2)",prompt:"日本の中央部には3000mをこす山々が連なります。何とよばれる？",
        blanks:[{label:"ウ　『日本の＿＿＿』",answer:"屋根",choices:["屋根","背骨","高原","山門"]}],success:"ウ＝屋根。"
      }),
      ()=>sourceBlankStep({
        title:"3-13 ポイント・チェック①(3)",number:"①(3)",prompt:"本州中央部の大地溝帯と、その近くの湖・秋田県の潟湖を完成させよう。",
        blanks:[
          {label:"エ　本州中央部を南北にはしる大地溝帯",answer:"フォッサマグナ",choices:["フォッサマグナ","中央構造線","日本アルプス","リアス海岸"]},
          {label:"オ　その近くにある断層湖",answer:"諏訪湖",choices:["諏訪湖","琵琶湖","十和田湖","サロマ湖"]},
          {label:"カ　秋田県にある潟湖",answer:"八郎潟",choices:["八郎潟","サロマ湖","田沢湖","洞爺湖"]}
        ],success:"エ＝フォッサマグナ、オ＝諏訪湖、カ＝八郎潟。"
      }),
      ()=>sourceBlankStep({
        title:"3-14 ポイント・チェック①(4)",number:"①(4)",prompt:"日本三急流の3つを、説明から完成させよう。",
        blanks:[
          {label:"キ　庄内平野を流れる",answer:"最上川",choices:["最上川","利根川","信濃川","石狩川"]},
          {label:"ク　甲府盆地を流れて駿河湾に注ぐ",answer:"富士川",choices:["富士川","木曽川","北上川","阿武隈川"]},
          {label:"ケ　熊本県を流れる",answer:"球磨川",choices:["球磨川","筑後川","吉野川","天竜川"]}
        ],success:"日本三急流＝最上川・富士川・球磨川。"
      }),
      ()=>sourceBlankStep({
        title:"3-15 ポイント・チェック①(5)",number:"①(5)",prompt:"川の源流や県境と関係する山地・山脈を完成させよう。",
        blanks:[
          {label:"コ　利根川の源流",answer:"越後山脈",choices:["越後山脈","飛騨山脈","赤石山脈","奥羽山脈"]},
          {label:"サ　信濃川の源流",answer:"関東山地",choices:["関東山地","中国山地","九州山地","北上高地"]},
          {label:"シ　長野・岐阜・富山の境",answer:"飛騨山脈",choices:["飛騨山脈","木曽山脈","赤石山脈","越後山脈"]},
          {label:"ス　長野・山梨・静岡の境",answer:"赤石山脈",choices:["赤石山脈","飛騨山脈","木曽山脈","越後山脈"]}
        ],success:"コ＝越後山脈、サ＝関東山地、シ＝飛騨山脈、ス＝赤石山脈。"
      }),
      ()=>chapter3SourceRiverMap(),
      ()=>chapter3WrittenStep()
    ],
    4: [
      ()=>readStep({title:"4-1 平野・台地・盆地を整理",text:`川が山地から平地へ出るところには<b>扇状地</b>、海へ注ぐところには<b>三角州</b>ができます。海岸が隆起してできる<b>海岸平野</b>、川すじの階段状の<b>河岸段丘</b>、周囲より一段高い<b>台地</b>、山に囲まれた<b>盆地</b>も区別します。`,focus:"『どこにできるか』『水はけ・水もち』『土地利用』をセットで読む。"}),
      ()=>chapter4LandformMatch(),
      ()=>chapter4PlateauMatch(),
      ()=>quizStep({title:"4-4 盆地とは",question:"盆地の説明として正しいものは？",correct:"まわりを山に囲まれた平地",distractors:["海岸が隆起してできた平地","川が海に注ぐところの三角形状の土地","川すじにできた階段状の土地"],extra:"盆地＝まわりを山に囲まれた平地。"}),
      ()=>sourceBlankStep({title:"4-5 ポイント・チェック①(1)(2)",number:"①(1)(2)",prompt:"教材①の前半を完成させよう。",blanks:[
        {label:"ア　山地から平地に出るところの扇形の土地",answer:"扇状地",choices:["扇状地","三角州","台地","盆地"]},
        {label:"イ　川が海に注ぐところの三角形状の土地",answer:"三角州",choices:["三角州","扇状地","海岸平野","河岸段丘"]},
        {label:"ウ　まわりより一段高い平地",answer:"台地",choices:["台地","盆地","平野","三角州"]},
        {label:"エ　根室と釧路の中間・酪農",answer:"根釧台地",choices:["根釧台地","牧ノ原","シラス台地","関東平野"]},
        {label:"オ　大井川下流・茶",answer:"牧ノ原",choices:["牧ノ原","根釧台地","シラス台地","越後平野"]}
      ],success:"ア＝扇状地、イ＝三角州、ウ＝台地、エ＝根釧台地、オ＝牧ノ原。"}),
      ()=>sourceBlankStep({title:"4-6 ポイント・チェック①(3)(4)",number:"①(3)(4)",prompt:"火山灰の台地と日本最大の平野を完成させよう。",blanks:[
        {label:"カ　鹿児島〜宮崎の白っぽい火山灰台地",answer:"シラス台地",choices:["シラス台地","根釧台地","牧ノ原","関東ローム層"]},
        {label:"キ　関東ローム層が広がる日本最大の平野",answer:"関東平野",choices:["関東平野","越後平野","石狩平野","濃尾平野"]}
      ],success:"カ＝シラス台地、キ＝関東平野。"}),
      ()=>sourceBlankStep({title:"4-7 ポイント・チェック①(5)",number:"①(5)",prompt:"日本海側の穀倉地帯。川と平野をつなげよう。",blanks:[
        {label:"ク　雄物川が流れる",answer:"秋田平野",choices:["秋田平野","庄内平野","越後平野","仙台平野"]},
        {label:"ケ　最上川が流れる",answer:"庄内平野",choices:["庄内平野","秋田平野","越後平野","津軽平野"]},
        {label:"コ　信濃川が流れる",answer:"越後平野",choices:["越後平野","庄内平野","関東平野","濃尾平野"]}
      ],success:"雄物川→秋田平野、最上川→庄内平野、信濃川→越後平野。"}),
      ()=>infoStep({title:"4-8 地図問題の見方",html:`<div class="read-box"><b>地図では説明文が手がかり</b><br>川の名前／海や半島／県庁所在地／山脈・高地、の順に根拠を拾います。次は教材②の4問を、同じ地図を残したまま解きます。</div>`,after:"地名を先に当てるのではなく、説明文の根拠から位置を絞ります。"}),
      ()=>chapter4SourceMap(),
      ()=>multiSelectStep({title:"4-10 ポイント・チェック③ 輪中",question:"輪中を説明するのに必要な内容を2つ選ぼう。",choices:["水害にそなえる","周囲を堤防で囲んだ集落","山の斜面につくられた集落","海を埋め立てた工業用地"],answers:["水害にそなえる","周囲を堤防で囲んだ集落"],success:"輪中＝水害にそなえて、周囲を堤防で囲んだ集落。"}),
      ()=>sequenceStep({title:"4-11 土地利用を理由までつなぐ",question:"扇状地の土地利用を、理由がつながる順に並べよう。",items:["川が山地から平地へ出る","砂やれきがたまる","水はけがよい","果樹園などに利用"],correct:["川が山地から平地へ出る","砂やれきがたまる","水はけがよい","果樹園などに利用"],success:"地形→性質→土地利用までつながりました。"})
    ]
  };

  const notes = {
    1: `
      <div class="note-section"><b>【今日のテーマ】</b>日本列島の位置・端・海流・周辺国・距離と時差</div>
      <div class="note-section"><b>【大事な言葉】</b>択捉島／沖ノ鳥島／南鳥島／与那国島／東経135度・明石市／黒潮／親潮／潮目／東シナ海／大陸棚／1852m</div>
      <div class="note-section"><b>【関係図】</b>日本海流＝黒潮　＋　千島海流＝親潮　→　潮目　→　よい漁場</div>
      <div class="note-section"><b>【これだけは覚える！】</b>北：択捉島　南：沖ノ鳥島　東：南鳥島　西：与那国島。南北約3000km、東西の南中時刻差約2時間。</div>
    `,
    2: `
      <div class="note-section"><b>【今日のテーマ】</b>海岸線・湾・半島</div>
      <div class="note-section"><b>【大事な言葉】</b>リアス海岸／津波／三陸海岸／志摩半島／真珠／砂浜海岸／鳥取砂丘／砂嘴／砂州</div>
      <div class="note-section"><b>【関係図】</b>山地が海に沈む → 出入りの多いリアス海岸 → 漁港をつくりやすい／津波被害を受けやすい</div>
      <div class="note-section"><b>【これだけは覚える！】</b>九州≒四国×2、北海道≒九州×2、本州≒北海道×3。海岸線が長い理由＝海岸線が複雑＋多くの島。</div>
    `,
    3: `
      <div class="note-section"><b>【今日のテーマ】</b>山地・山脈と湖・川</div>
      <div class="note-section"><b>【割合と並び方】</b>山地＝国土の4分の3／平地＝4分の1／森林＝3分の2。東北日本＝ほぼ3列に南北（北弯山系）、西南日本＝ほぼ2列に東西（南弯山系）。</div>
      <div class="note-section"><b>【日本アルプス】</b>飛騨山脈＝北アルプス／木曽山脈＝中央アルプス／赤石山脈＝南アルプス。3000m級の山々＝日本の屋根。</div>
      <div class="note-section"><b>【湖】</b>カルデラ湖＝十和田湖・摩周湖・洞爺湖・田沢湖（日本最深）／せき止め湖＝富士五湖／断層湖＝琵琶湖・諏訪湖／潟湖＝八郎潟・サロマ湖／河せき湖（三日月湖）＝石狩川流域。</div>
      <div class="note-section"><b>【川】</b>流れが急で長さが短い。ダムをつくって水力発電に利用しやすい。洪水がおこりやすく、舟運に利用しにくい。日本三急流＝最上川・富士川・球磨川。</div>
      <div class="note-section"><b>【図表】</b>信濃川367km・1.2万km²／利根川322km・1.7万km²／石狩川268km・1.4万km²／天塩川256km・0.6万km²／北上川249km・1.0万km²／阿武隈川239km・0.5万km²。</div>
      <div class="note-section"><b>【一口メモ】</b>湖の表示例「85／−104」では、85＝湖面の標高、−104＝最も深いところの深さ。</div>
      <div class="note-section"><b>【ポイント・チェック②】</b>1 最上川（オ）／2 石狩川（イ）／3 木曽川（サ）／4 信濃川（ク）。</div>
      <div class="note-section"><b>【これだけは覚える！】</b>日本の川は、大陸の大河川と比べて「長さが短く、流れが急」。</div>
    `,
    4: `
      <div class="note-section"><b>【今日のテーマ】</b>平野・台地・盆地</div>
      <div class="note-section"><b>【地形】</b>扇状地＝山地から平地へ出るところ・水はけがよい／三角州＝河口・水もちがよい／海岸平野＝海岸の隆起／河岸段丘＝川すじの階段状。</div>
      <div class="note-section"><b>【台地】</b>根釧台地＝酪農／牧ノ原＝茶／シラス台地＝畑作・畜産。</div>
      <div class="note-section"><b>【平野と川】</b>雄物川→秋田平野／最上川→庄内平野／信濃川→越後平野。日本最大＝関東平野。</div>
      <div class="note-section"><b>【地図問題】</b>徳島平野／筑紫平野／甲府盆地／北上盆地を説明文から特定する。</div>
      <div class="note-section"><b>【記述】</b>輪中＝水害にそなえて、周囲を堤防で囲んだ集落。</div>
      <div class="note-section"><b>【これだけは覚える！】</b>地形は「できる場所→水の性質→土地利用」までつなげる。</div>
    `
  };

  const bosses = {
    1:[
      {q:"日本の最南端は？",correct:"沖ノ鳥島",d:["南鳥島","与那国島","択捉島"]},
      {q:"日本の最東端は？",correct:"南鳥島",d:["沖ノ鳥島","与那国島","択捉島"]},
      {q:"標準時子午線は？",correct:"東経135度",d:["東経123度","東経140度","東経154度"]},
      {q:"千島海流の別名は？",correct:"親潮",d:["黒潮","対馬海流","日本海流"]},
      {q:"1カイリは？",correct:"1852m",d:["1110m","1609m","2000m"]},
      {q:"日本列島の南北距離はおよそ？",correct:"3000km",d:["1500km","4500km","6000km"]}
    ],
    2:[
      {q:"リアス海岸の代表例は？",correct:"三陸海岸",d:["鳥取砂丘","有明海","東京湾"]},
      {q:"英虞湾・五ヶ所湾でさかんな養殖は？",correct:"真珠",d:["かき","ほたて貝","のり"]},
      {q:"6番の半島は？",correct:"大隅半島",d:["薩摩半島","島原半島","房総半島"]},
      {q:"オは？",correct:"有明海",d:["東京湾","伊勢湾","三河湾"]},
      {q:"Bの地名は？",correct:"焼津",d:["津","田子ノ浦","大津"]},
      {q:"日本の海岸線が長い主な理由は？",correct:"海岸線が複雑で、多くの島からなる",d:["川が短く、山が多い","リアス海岸だけでできている","砂浜海岸だけでできている"]}
    ],
    3:[
      {q:"山地は国土のおよそどれくらい？",correct:"4分の3",d:["3分の2","4分の1","2分の1"]},
      {q:"東北日本の山地の並び方は？",correct:"ほぼ3列に南北",d:["ほぼ2列に東西","ほぼ3列に東西","ほぼ2列に南北"]},
      {q:"中央アルプスともよばれるのは？",correct:"木曽山脈",d:["飛騨山脈","赤石山脈","越後山脈"]},
      {q:"せき止め湖の例は？",correct:"富士五湖",d:["諏訪湖","八郎潟","摩周湖"]},
      {q:"日本最深の湖は？",correct:"田沢湖",d:["琵琶湖","十和田湖","洞爺湖"]},
      {q:"教材の図表で流域面積が最も広い川は？",correct:"利根川",d:["信濃川","石狩川","北上川"]},
      {q:"教材の図表で信濃川の長さは？",correct:"367km",d:["322km","268km","239km"]},
      {q:"『85／−104』の85は何を表す？",correct:"湖面の標高",d:["最深部の深さ","湖の面積","湖岸の長さ"]},
      {q:"日本三急流の組み合わせは？",correct:"最上川・富士川・球磨川",d:["最上川・利根川・球磨川","信濃川・富士川・球磨川","最上川・富士川・木曽川"]},
      {q:"日本の川の特色は？",correct:"長さが短く、流れが急",d:["長さが長く、流れが急","長さが短く、流れがゆるやか","長さが長く、流れがゆるやか"]}
    ],
    4:[
      {q:"川が山地から平地へ出るところにできるのは？",correct:"扇状地",d:["三角州","河岸段丘","海岸平野"]},
      {q:"根釧台地でさかんな産業は？",correct:"酪農",d:["茶の栽培","稲作","真珠養殖"]},
      {q:"日本最大の平野は？",correct:"関東平野",d:["越後平野","石狩平野","濃尾平野"]},
      {q:"最上川が流れる平野は？",correct:"庄内平野",d:["秋田平野","越後平野","仙台平野"]},
      {q:"山梨県の県庁所在地がある盆地は？",correct:"甲府盆地",d:["北上盆地","松本盆地","山形盆地"]},
      {q:"輪中とは？",correct:"水害にそなえ周囲を堤防で囲んだ集落",d:["山の斜面の階段状の畑","海岸を埋め立てた集落","台地上の酪農集落"]}
    ]
  };

  function showNote(){
    gameView.classList.add("hidden");
    noteView.classList.remove("hidden");
    $("#noteTitle").textContent = `第${chapter}章 まとめノート`;
    $("#noteBody").innerHTML = notes[chapter];
  }

  function startBoss(){
    noteView.classList.add("hidden");
    bossView.classList.remove("hidden");
    $("#bossTitle").textContent = `第${chapter}章 章ボス`;
    let i=0, score=0;
    const bossStage = $("#bossStage");
    const bossFeedback = $("#bossFeedback");

    function renderBoss(){
      bossFeedback.className="feedback hidden";
      bossFeedback.innerHTML="";
      const item = bosses[chapter][i];
      const options = shuffle([item.correct,...item.d]);
      bossStage.innerHTML = `
        <div class="stage-label">BOSS ${i+1} / ${bosses[chapter].length}</div>
        <p style="font-size:1.08rem;font-weight:900;margin-top:14px">${item.q}</p>
        <div id="bossOptions" class="option-grid"></div>
      `;
      const grid = $("#bossOptions");
      options.forEach(opt=>{
        const b=document.createElement("button");
        b.className="option";
        b.textContent=opt;
        b.addEventListener("click",()=>{
          [...grid.children].forEach(x=>x.disabled=true);
          if(opt===item.correct){
            score++;
            b.classList.add("correct");
            bossFeedback.innerHTML="⭕ 正解！";
            bossFeedback.className="feedback correct";
          }else{
            b.classList.add("wrong");
            [...grid.children].find(x=>x.textContent===item.correct)?.classList.add("correct");
            bossFeedback.innerHTML=`復習ポイント。正解は <b>${item.correct}</b>。`;
            bossFeedback.className="feedback wrong";
          }
          const nb=document.createElement("button");
          nb.className="primary full";
          nb.style.marginTop="12px";
          nb.textContent=i===bosses[chapter].length-1?"結果を見る":"次の問題";
          nb.addEventListener("click",()=>{
            i++;
            if(i>=bosses[chapter].length){
              setClear(chapter);
              bossStage.innerHTML=`
                <div class="result">
                  <div style="font-size:3rem">🏆</div>
                  <h2>第${chapter}章 CLEAR！</h2>
                  <div class="score">${score} / ${bosses[chapter].length}</div>
                  <p class="muted">${score===bosses[chapter].length?"全問正解！":"間違えたところは、もう一度章をやると定着します。"}</p>
                  <button id="resultHome" class="primary full">章選択へ戻る</button>
                </div>`;
              bossFeedback.className="feedback hidden";
              $("#resultHome").addEventListener("click",goHome);
            }else{
              renderBoss();
            }
          });
          bossFeedback.appendChild(nb);
        });
        grid.appendChild(b);
      });
    }
    renderBoss();
  }

  nextBtn.addEventListener("click",()=>{
    resetStage();
    stepIndex++;
    if(stepIndex >= chapters[chapter].length){
      saveProgress(chapter, chapters[chapter].length);
      showNote();
    }else{
      render();
    }
  });

  $("#homeBtn").addEventListener("click",goHome);
  $("#toBossBtn").addEventListener("click",startBoss);

  $$(".chapter-card").forEach(btn=>{
    btn.addEventListener("click",()=>{
      chapter = Number(btn.dataset.chapter);
      const p = getProgress();
      const saved = Math.min(p[chapter] || 0, chapters[chapter].length-1);
      stepIndex = p["clear"+chapter] ? 0 : saved;
      render();
    });
  });

  $("#resetProgressBtn").addEventListener("click",()=>{
    if(confirm("地理編の進捗をリセットしますか？")){
      localStorage.removeItem(PROGRESS_KEY);
      updateHomeProgress();
    }
  });

  updateHomeProgress();
})();
