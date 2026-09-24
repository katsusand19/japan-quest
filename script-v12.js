
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

  const PROGRESS_KEY = "socialQuest_geo_source_v9";

  function getProgress(){
    try{
      return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,clear1:false,clear2:false,clear3:false,clear4:false,clear5:false,clear6:false,clear7:false,clear8:false};
    }catch{
      return {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,clear1:false,clear2:false,clear3:false,clear4:false,clear5:false,clear6:false,clear7:false,clear8:false};
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
    [1,2,3,4,5,6,7,8].forEach(ch=>{
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


  function chapter5ClimateBasics(){
    return matchStep({title:"5-2 日本の気候を決めるもの",prompt:"教材の要点を、原因と特色で対応させよう。",rows:[
      {label:"国土が南北に細長い",choices:["北海道は冷帯・沖縄は亜熱帯","高度100mで約0.6℃低下","年較差・日較差が大きい","夏と冬で風向きが逆"]},
      {label:"海抜高度が高くなる",choices:["北海道は冷帯・沖縄は亜熱帯","高度100mで約0.6℃低下","年較差・日較差が大きい","夏と冬で風向きが逆"]},
      {label:"内陸",choices:["北海道は冷帯・沖縄は亜熱帯","高度100mで約0.6℃低下","年較差・日較差が大きい","夏と冬で風向きが逆"]},
      {label:"季節風（モンスーン）",choices:["北海道は冷帯・沖縄は亜熱帯","高度100mで約0.6℃低下","年較差・日較差が大きい","夏と冬で風向きが逆"]}
    ],answers:["北海道は冷帯・沖縄は亜熱帯","高度100mで約0.6℃低下","年較差・日較差が大きい","夏と冬で風向きが逆"],success:"南北の長さ・高度・内陸・季節風が、それぞれ何に影響するか整理できました。"});
  }

  function chapter5CurrentMatch(){
    return matchStep({title:"5-3 海流と別名",prompt:"暖流・寒流と別名を対応させよう。",rows:[
      {label:"日本海流",choices:["暖流・黒潮","暖流・対馬海流","寒流・親潮","寒流・リマン海流"]},
      {label:"対馬海流",choices:["暖流・黒潮","暖流・対馬海流","寒流・親潮","寒流・リマン海流"]},
      {label:"千島海流",choices:["暖流・黒潮","暖流・対馬海流","寒流・親潮","寒流・リマン海流"]}
    ],answers:["暖流・黒潮","暖流・対馬海流","寒流・親潮"],success:"日本海流＝黒潮、千島海流＝親潮。対馬海流も暖流です。"});
  }

  function chapter5DisasterMatch(){
    return matchStep({title:"5-5 災害を『地域→原因→対策』でつなぐ",prompt:"教材の要点に出る災害と地域・原因や対策を対応させよう。",rows:[
      {label:"北海道の冷害",choices:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"]},
      {label:"東北地方東部の冷害",choices:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"]},
      {label:"瀬戸内地方の干害",choices:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"]},
      {label:"北陸地方の雪害",choices:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"]},
      {label:"太平洋側の風水害",choices:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"]}
    ],answers:["高緯度・千島海流・濃霧","千島海流・やませ","満濃池・香川用水","がん木・消雪道路","台風・ダム・堤防・植林"],success:"災害名だけでなく、どこで・なぜ・どう備えるかまでつながりました。"});
  }

  function chapter5SakuraStep(){
    setHeader("5-9 ポイント・チェック② 桜前線");
    stage.innerHTML = `
      <div class="stage-label">ポイント・チェック②　🌸 図を読み取る</div>
      <p style="margin-top:14px;font-weight:900">4月20日の桜前線は、山地付近でどのような形になる？</p>
      <div class="map-card" style="padding:12px">
        <svg viewBox="0 0 720 330" role="img" aria-label="桜前線と標高の関係を考える学習用模式図" style="width:100%;height:auto">
          <path d="M95 265 C145 245 180 235 220 205 C260 175 300 175 340 145 C385 112 425 115 465 82 C505 48 555 45 625 28" fill="none" stroke="#777" stroke-width="16" stroke-linecap="round" opacity=".28"/>
          <path d="M98 266 C148 246 180 236 220 206 C260 176 300 176 340 146 C385 113 425 116 465 83 C505 49 555 46 625 29" fill="none" stroke="#f7f6f2" stroke-width="11" stroke-linecap="round"/>
          <path d="M150 235 C210 220 255 205 305 188 C350 172 392 174 445 153" fill="none" stroke="#e8759a" stroke-width="5" stroke-dasharray="10 8"/>
          <text x="120" y="222" font-size="18">3/31</text><text x="460" y="145" font-size="18">4/20 ?</text><text x="560" y="66" font-size="18">5/10</text>
          <path d="M320 190 L350 155 L380 190" fill="#ddd" stroke="#888"/><text x="334" y="145" font-size="15">高い山地</text>
        </svg>
      </div>
      <p class="muted">教材の桜前線問題を、標高との関係が見える模式図に置き換えています。</p>
      <div id="sakuraOpts" class="option-grid"></div>`;
    const opts=shuffle(["山地のところだけ南へくぼむ","山地のところだけ北へふくらむ","標高に関係なく東西一直線","海岸だけ大きく南へくぼむ"]);
    const grid=$("#sakuraOpts");
    opts.forEach(opt=>{const b=document.createElement("button");b.className="option";b.textContent=opt;b.onclick=()=>{if(locked)return;if(opt==="山地のところだけ南へくぼむ"){locked=true;[...grid.children].forEach(x=>x.disabled=true);b.classList.add("correct");showFeedback("⭕ 山地は標高が高く、同じ緯度の低地より気温が低いため、開花が遅れます。だから前線は山地のところで南へくぼみます。","correct");enableNext();}else{b.disabled=true;b.classList.add("wrong");showFeedback("🔎 『標高が高いほど気温が低い』→『開花が遅い』の順で考えよう。","wrong");}};grid.appendChild(b);});
  }

  function chapter5ColdDamageWritten(){
    return multiSelectStep({title:"5-10 ポイント・チェック③ 冷害の理由",question:"東北地方の太平洋側が、日本海側より冷害を受けやすい理由を2つ選ぼう。",choices:["沖合を寒流の千島海流（親潮）が流れる","夏に冷たい北東風のやませが吹く","冬に北西の季節風が吹く","瀬戸内地方より雨が少ない"],answers:["沖合を寒流の千島海流（親潮）が流れる","夏に冷たい北東風のやませが吹く"],success:"記述なら『沖合を寒流の千島海流が流れ、夏にやませが吹くため』とまとめられます。"});
  }


  function climateMiniSvg({label,city,temp,precip,type}){
    const patterns={
      naha:{t:[18,18,20,22,25,28,29,29,28,25,22,19],p:[100,120,160,190,260,250,180,220,260,190,110,100]},
      kochi:{t:[6,7,10,15,19,23,27,28,24,18,13,8],p:[60,100,160,220,240,320,280,300,350,180,100,70]},
      okayama:{t:[5,6,9,14,18,22,26,27,23,17,12,7],p:[35,45,70,80,100,150,140,80,100,70,45,35]},
      matsumoto:{t:[-1,0,4,11,16,20,24,25,20,13,7,2],p:[25,35,55,70,85,110,120,95,110,70,45,25]},
      kanazawa:{t:[4,4,7,13,18,22,26,27,23,17,12,7],p:[260,180,150,130,140,180,200,160,220,190,250,270]},
      sapporo:{t:[-4,-3,1,7,13,17,21,22,18,11,4,-1],p:[90,70,60,55,50,55,65,110,130,110,100,95]}
    };
    const d=patterns[type]; const W=300,H=190,pl=32,pr=20,pt=20,pb=28, cw=(W-pl-pr)/12;
    const maxP=360, minT=-10,maxT=32;
    const pts=d.t.map((v,i)=>{const x=pl+cw*(i+.5), y=pt+(maxT-v)/(maxT-minT)*(H-pt-pb); return `${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
    const bars=d.p.map((v,i)=>{const x=pl+cw*i+2, h=(v/maxP)*(H-pt-pb), y=H-pb-h;return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(3,cw-4).toFixed(1)}" height="${h.toFixed(1)}" rx="1" class="climate-bar"/>`}).join('');
    return `<div class="climate-card" data-letter="${label}"><div class="climate-card-head"><b>${label}</b><span class="climate-city">${city||'？'}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="気候グラフ ${label}">${bars}<polyline points="${pts}" fill="none" class="climate-line" stroke-width="3"/><line x1="${pl}" y1="${H-pb}" x2="${W-pr}" y2="${H-pb}" class="climate-axis"/><text x="8" y="18" font-size="11">℃</text><text x="${W-35}" y="18" font-size="11">雨</text><text x="${pl}" y="${H-8}" font-size="10">1月</text><text x="${W-pr-28}" y="${H-8}" font-size="10">12月</text></svg><div class="climate-stats">年平均 ${temp}℃ ／ 年降水量 ${precip}mm</div></div>`;
  }

  function chapter6Overview(){
    return matchStep({title:"6-1 6つの気候区分",prompt:"教材の地図と気候グラフをもとに、気候区分と代表都市・特色を対応させよう。",rows:[
      {label:"北海道の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]},
      {label:"日本海側の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]},
      {label:"瀬戸内の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]},
      {label:"内陸性の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]},
      {label:"太平洋側の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]},
      {label:"南西諸島の気候",choices:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"]}
    ],answers:["札幌｜低温・降水量少なめ","金沢｜冬の降水量が多い","岡山｜年間降水量が少ない","松本｜寒暖差が大きい","高知｜夏の降水量が多い","那覇｜高温・降水量が多い"],success:"6区分を代表都市・グラフの特徴と結びつけました。"});
  }

  function chapter6GraphRead(){
    setHeader("6-6 ポイント・チェック② 気候グラフ");
    const charts=[
      {label:"ア",city:"？",temp:"23.1",precip:"2040.8",type:"naha",answer:"那覇"},
      {label:"イ",city:"？",temp:"17.0",precip:"2547.5",type:"kochi",answer:"高知"},
      {label:"ウ",city:"？",temp:"16.2",precip:"1105.9",type:"okayama",answer:"岡山"},
      {label:"エ",city:"？",temp:"11.8",precip:"1031.0",type:"matsumoto",answer:"松本"},
      {label:"オ",city:"？",temp:"14.6",precip:"2398.9",type:"kanazawa",answer:"金沢"},
      {label:"カ",city:"？",temp:"8.9",precip:"1106.6",type:"sapporo",answer:"札幌"}
    ];
    const qs=[
      {city:"松本",letter:"エ",hint:"降水量が少なく、気温が低めで寒暖差が大きい内陸性。"},
      {city:"岡山",letter:"ウ",hint:"年間を通して降水量が少ない瀬戸内。"},
      {city:"札幌",letter:"カ",hint:"年平均気温が最も低い。"},
      {city:"高知",letter:"イ",hint:"夏の降水量が多い太平洋側。"},
      {city:"金沢",letter:"オ",hint:"冬の降水量が多い日本海側。"},
      {city:"那覇",letter:"ア",hint:"年平均気温が高く、降水量も多い南西諸島。"}
    ];
    stage.innerHTML=`<div class="stage-label">ポイント・チェック②　📈 グラフを読み取る</div><p style="margin-top:14px;font-weight:900">教材と同じ6都市。グラフの形と年平均気温・年降水量から都市を特定しよう。</p><p class="muted">月別の線・棒は教材の特徴を保った学習用模式グラフです。年平均気温・年降水量は教材の値を表示しています。</p><div id="climateGrid" class="climate-grid">${charts.map(climateMiniSvg).join('')}</div><div class="map-question-panel"><div id="cgCount" class="qcount"></div><p id="cgText" class="qtext"></p><div id="cgHint" class="map-hint"></div></div>`;
    let qi=0;
    const cards=[...document.querySelectorAll('.climate-card')];
    function clear(){cards.forEach(c=>c.classList.remove('picked-wrong','picked-correct'))}
    function show(){clear();const q=qs[qi];$('#cgCount').textContent=`グラフ問題 ${qi+1} / ${qs.length}`;$('#cgText').textContent=`${q.city}の気候グラフはどれ？`;$('#cgHint').textContent='ア〜カのグラフをタップしよう。'}
    cards.forEach(c=>{c.setAttribute('role','button');c.setAttribute('tabindex','0');const pick=()=>{if(locked)return;const q=qs[qi],letter=c.dataset.letter;if(letter===q.letter){c.classList.add('picked-correct');$('#cgHint').innerHTML=`⭕ <b>${q.city}＝${letter}</b>。${q.hint}`;setTimeout(()=>{qi++;if(qi<qs.length)show();else{locked=true;showFeedback('⭕ 教材②の6都市をすべてグラフから特定しました。','correct');enableNext()}},700)}else{c.classList.add('picked-wrong');$('#cgHint').innerHTML='⚠️ もう一度。気温の高さ、雨の多い季節、年間降水量の3点を見比べよう。';setTimeout(()=>c.classList.remove('picked-wrong'),600)}};c.addEventListener('click',pick);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}})});show();
  }

  function chapter6Compare(){
    return matchStep({title:"6-7 ポイント・チェック③ 瀬戸内と内陸",prompt:"岡山（瀬戸内）と松本（内陸性）の『似ている点／ちがう点』を整理しよう。",rows:[
      {label:"似ている点",choices:["どちらも降水量が少ない","どちらも冬の降水量が多い","どちらも年平均気温が高い"]},
      {label:"ちがう点① 気温",choices:["岡山の方が年平均気温がやや高い","松本の方が年平均気温が高い","年平均気温は同じ"]},
      {label:"ちがう点② 年較差",choices:["松本の方が年較差が大きい","岡山の方が年較差が大きい","年較差は同じ"]}
    ],answers:["どちらも降水量が少ない","岡山の方が年平均気温がやや高い","松本の方が年較差が大きい"],success:"記述なら『どちらも降水量が少ない。岡山は松本より年平均気温がやや高く、松本は年較差が大きい』とまとめられます。"});
  }


  function chapter7InlandMap(){
    setHeader("7-9 ポイント・チェック② 内陸県の地図");
    stage.innerHTML=`
      <div class="stage-label">🗾 教材の地図を見たまま答える</div>
      <p style="margin-top:12px;font-weight:900">47都道府県のうち、内陸県は全部でいくつ？　そのあと、教材のア〜キを県名と対応させよう。</p>
      <div class="source-image-wrap"><img src="ch7_inland_map.png" alt="教材の内陸県の地図。アからキの県の形と県庁所在地が示されている"></div>
      <div id="inlandCount" class="option-grid"></div>
      <div id="inlandMatch" class="match-list hidden" style="margin-top:14px"></div>
      <button id="inlandCheck" class="primary full hidden" style="margin-top:14px">地図の答え合わせ</button>`;
    const countGrid=$("#inlandCount");
    shuffle(["8","7","9","10"]).forEach(v=>{
      const b=document.createElement("button"); b.className="option"; b.textContent=v+"県";
      b.onclick=()=>{
        if(v==="8"){
          [...countGrid.children].forEach(x=>x.disabled=true); b.classList.add("correct");
          showFeedback("⭕ 内陸県は8県。教材の地図には、そのうち7県が出ています。","correct");
          $("#inlandMatch").classList.remove("hidden"); $("#inlandCheck").classList.remove("hidden");
        }else{ b.disabled=true;b.classList.add("wrong");showFeedback("🔎 数を見直そう。海に面していない県を数えます。","wrong");}
      }; countGrid.appendChild(b);
    });
    const rows=[
      ["ア","長野県"],["イ","奈良県"],["ウ","岐阜県"],["エ","山梨県"],["オ","埼玉県"],["カ","栃木県"],["キ","群馬県"]
    ];
    const pool=["長野県","奈良県","岐阜県","山梨県","埼玉県","栃木県","群馬県","滋賀県"];
    const list=$("#inlandMatch");
    rows.forEach(([lab,ans])=>{
      const row=document.createElement("div");row.className="match-row";row.dataset.answer=ans;
      row.innerHTML=`<div class="match-main"><b>${lab}</b><select><option value="">県名を選ぶ</option>${shuffle(pool).map(x=>`<option>${x}</option>`).join("")}</select></div><div class="match-mark">⚠️ ←ここを見直そう</div>`;
      list.appendChild(row);
    });
    $("#inlandCheck").onclick=()=>{
      let all=true;
      $$("#inlandMatch .match-row").forEach(row=>{
        row.classList.remove("bad");
        if(row.querySelector("select").value!==row.dataset.answer){all=false;row.classList.add("bad");}
      });
      if(all){
        locked=true;$$("#inlandMatch select").forEach(s=>s.disabled=true);$("#inlandCheck").disabled=true;
        showFeedback("⭕ 全部正解！　教材の地図：ア長野・イ奈良・ウ岐阜・エ山梨・オ埼玉・カ栃木・キ群馬。残る内陸県は滋賀県です。","correct");enableNext();
      }else showFeedback("🔎 赤枠だけ見直そう。県の形と県庁所在地の位置も手がかりです。","wrong");
    };
  }

  function chapter7SchoolShortage(){
    return quizStep({title:"7-12 ポイント・チェック③ 都心回帰",question:"2000年代に東京23区の人口が増え、臨海部などに高層マンションが増えたことで急に不足したものは？",correct:"小学校",distractors:["緑地","工業用水","工業用地"],extra:"教材の選択肢では「ウ 小学校」です。住宅が増えると、そこで暮らす子どもも増えるためです。"});
  }


  function chapter8IndustryChart(){
    setHeader("8-4 産業別人口の移り変わり");
    stage.innerHTML=`
      <div class="stage-label">📊 グラフから読み取る</div>
      <p style="font-weight:900">社会が発展するにつれて、どの産業の人口割合が高くなっている？</p>
      <div class="c8chart">
        <div><b>1960</b><span style="--a:32.7;--b:29.1;--c:38.2"></span><small>第一次32.7%／第二次29.1%／第三次38.2%</small></div>
        <div><b>2015</b><span style="--a:4;--b:25;--c:71"></span><small>第一次は小さくなり、第三次が大きくなっている</small></div>
      </div>
      <div id="o" class="option-grid"></div>`;
    shuffle(["第一次産業","第二次産業","第三次産業","どれも同じ"]).forEach(v=>{
      const b=document.createElement("button");b.className="option";b.textContent=v;
      b.onclick=()=>{
        if(v==="第三次産業"){b.classList.add("correct");showFeedback("⭕ 第三次産業。教材は「社会が発展するほど、第一次より第二次、第二次より第三次の割合が高くなる」と整理しています。","correct");enableNext();}
        else{b.classList.add("wrong");b.disabled=true;showFeedback("🔎 1960年と現在側を比べて、割合が大きくなった部分を見よう。","wrong");}
      };$("#o").appendChild(b);
    });
  }

  function chapter8PopulationShape(){
    setHeader("8-7 年齢別人口の形");
    stage.innerHTML=`
      <div class="stage-label">👀 形で整理</div>
      <p style="font-weight:900">教材の説明と人口ピラミッドの形を結びつけよう。</p>
      <div class="popshape-wrap">
        <div class="popshape"><div class="pyramid"></div><b>戦前</b><small>ピラミッド型<br>多産多死</small></div>
        <div class="popshape"><div class="vase"></div><b>現在</b><small>つぼ型<br>少産少死</small></div>
      </div>
      <div class="focus-box"><b>日本の現在</b>は、ベビーブームの影響で単純なつぼ型ではなく、少し変形しています。</div>
      <button id="okShape" class="primary full">形を確認した</button>`;
    $("#okShape").onclick=()=>{showFeedback("戦前＝ピラミッド（多産多死）。現在＝つぼ（少産少死）。ベビーブームのふくらみも忘れません。","correct");enableNext();}
  }

  function chapter8BirthDeathGraph(){
    setHeader("8-11 ポイント・チェック② 出生率と死亡率");
    stage.innerHTML=`
      <div class="stage-label">📈 教材のグラフを読む</div>
      <p style="font-weight:900">グラフを見て3問に答えよう。</p>
      <div class="linegraph">
        <svg viewBox="0 0 520 250" role="img" aria-label="出生率と死亡率の移り変わりを簡略化したグラフ">
          <line x1="45" y1="210" x2="500" y2="210"/><line x1="45" y1="25" x2="45" y2="210"/>
          <polyline class="birth" points="45,70 90,45 115,75 165,115 220,130 280,145 340,160 400,175 460,185 500,190"/>
          <polyline class="death" points="45,155 100,165 165,170 230,175 300,176 370,174 430,168 500,155"/>
          <text x="102" y="40">A</text><text x="88" y="180">B</text>
          <text x="45" y="232">1940</text><text x="95" y="232">47</text><text x="470" y="232">2019</text>
        </svg>
      </div>
      <div id="birthQs"></div>`;
    const qs=[
      ["(1) 出生率を示すのは？","A",["A","B"]],
      ["(2) AとBの間は何を表す？","人口の自然増減",["人口の自然増減","昼間人口","産業人口","人口密度"]],
      ["(3) Aが1947年ごろ増えた理由は？","戦争が終わって安心して子どもを産めるようになったから",["戦争が終わって安心して子どもを産めるようになったから","平均寿命が短くなったから","第三次産業が減ったから","都市の地価が上がったから"]]
    ];
    let k=0;
    const box=$("#birthQs");
    const ask=()=>{
      box.innerHTML=`<div class="qbox"><b>${qs[k][0]}</b><div class="option-grid" id="bo"></div></div>`;
      shuffle(qs[k][2]).forEach(v=>{const b=document.createElement("button");b.className="option";b.textContent=v;b.onclick=()=>{
        if(v===qs[k][1]){b.classList.add("correct");k++;if(k===qs.length){showFeedback("⭕ 3問正解。A＝出生率、AとBの差＝人口の自然増減、1947年ごろの増加＝戦後の第一次ベビーブームにつながる動きです。","correct");enableNext();}else ask();}
        else{b.classList.add("wrong");b.disabled=true;showFeedback("🔎 グラフのA・Bと、教材の説明をもう一度対応させよう。","wrong");}
      };$("#bo").appendChild(b);});
    };ask();
  }

  function chapter8KantoGraph(){
    setHeader("8-12 ポイント・チェック③ 関東の昼間・夜間人口");
    const data=[["茨城",300,290],["栃木",200,195],["群馬",200,195],["埼玉",730,640],["千葉",620,540],["東京",1350,1600],["神奈川",910,820]];
    stage.innerHTML=`
      <div class="stage-label">📊 グラフから説明する</div>
      <p style="font-weight:900">同じ地域の夜間人口と昼間人口を比べよう。</p>
      <div class="bars">${data.map(([n,night,day])=>`<div class="baritem"><b>${n}</b><div class="barpair"><i class="night" style="height:${night/9}px"></i><i class="day" style="height:${day/9}px"></i></div></div>`).join("")}</div>
      <div class="legend8">■ 夜間人口　▥ 昼間人口</div>
      <p class="small">教材の2015年グラフの関係を、読み取りやすい形で再構成しています。</p>
      <div id="kantoOpts" class="option-grid"></div>`;
    const correct="東京都は他県にくらべて昼間人口が目立って多い";
    shuffle([correct,"埼玉県は昼間人口が夜間人口より目立って多い","茨城・栃木・群馬は昼夜の差が非常に大きい","すべての県で昼間人口の方が多い"]).forEach(v=>{
      const b=document.createElement("button");b.className="option";b.textContent=v;b.onclick=()=>{
        if(v===correct){b.classList.add("correct");showFeedback("⭕ 教材の解答は「東京都は他の県にくらべて、昼間の人口が目立って多くなっている」です。埼玉・千葉・神奈川は夜間人口の方が目立って多く、茨城・栃木・群馬は差が小さいことも読み取れます。","correct");enableNext();}
        else{b.classList.add("wrong");b.disabled=true;showFeedback("🔎 東京と、その周辺県の昼・夜の高さを比べよう。","wrong");}
      };$("#kantoOpts").appendChild(b);
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
    ],
    5: [
      ()=>readStep({title:"5-1 日本の気候の特色",text:`日本の大部分は<b>温帯</b>で四季の区別があります。国土が南北に細長いため、<b>北海道は冷帯</b>、<b>沖縄は亜熱帯</b>です。北と南の気温差は夏より冬の方が大きく、年較差も北海道の方が大きくなります。気温は海抜高度が<b>100m上がるごとに約0.6℃</b>下がります。`,focus:"気候帯・南北差・高度による気温変化を分けて読む。"}),
      ()=>chapter5ClimateBasics(),
      ()=>chapter5CurrentMatch(),
      ()=>matchStep({title:"5-4 季節風の向き",prompt:"夏と冬の季節風を対応させよう。",rows:[{label:"夏",choices:["暖かくてしめった南東の風","冷たくてしめった北西の風"]},{label:"冬",choices:["暖かくてしめった南東の風","冷たくてしめった北西の風"]}],answers:["暖かくてしめった南東の風","冷たくてしめった北西の風"],success:"夏＝南東、冬＝北西。季節によって反対方向に吹く風＝季節風（モンスーン）です。"}),
      ()=>chapter5DisasterMatch(),
      ()=>sourceBlankStep({title:"5-6 ポイント・チェック① 前半",number:"①(1)〜(4)",prompt:"教材①の前半を完成させよう。",blanks:[
        {label:"日本の大部分の気候帯",answer:"温帯",choices:["温帯","冷帯","亜熱帯","乾燥帯"]},
        {label:"北海道の気候帯",answer:"冷帯",choices:["冷帯","温帯","亜熱帯","寒帯"]},
        {label:"沖縄の気候帯",answer:"亜熱帯",choices:["亜熱帯","温帯","冷帯","寒帯"]},
        {label:"真夏日の最高気温",answer:"30℃以上",choices:["30℃以上","35℃以上","25℃以上","0℃未満"]},
        {label:"熱帯夜の最低気温",answer:"25℃以上",choices:["25℃以上","30℃以上","35℃以上","20℃未満"]},
        {label:"夏と冬で等温線が多くなる日本図",answer:"冬",choices:["冬","夏","春","秋"]},
        {label:"北海道東部沖の寒流",answer:"千島海流",choices:["千島海流","日本海流","対馬海流","黒潮"]},
        {label:"北海道東部で夏に発生し日光をさえぎる",answer:"濃霧",choices:["濃霧","やませ","梅雨","高潮"]}
      ],success:"気候帯・真夏日/熱帯夜・冬の南北差・北海道東部の冷害要因まで確認しました。"}),
      ()=>sourceBlankStep({title:"5-7 ポイント・チェック① 後半",number:"①(5)〜(7)",prompt:"季節風・干害・風水害を完成させよう。",blanks:[
        {label:"夏に風が吹いてくる方向",answer:"南東",choices:["南東","北西","南西","北東"]},
        {label:"冬に風が吹いてくる方向",answer:"北西",choices:["北西","南東","北東","南西"]},
        {label:"夏冬で反対方向に吹く風",answer:"季節風",choices:["季節風","偏西風","海風","陸風"]},
        {label:"瀬戸内地方へ水を引く川",answer:"吉野川",choices:["吉野川","利根川","信濃川","最上川"]},
        {label:"その用水",answer:"香川用水",choices:["香川用水","愛知用水","明治用水","豊川用水"]},
        {label:"6月〜7月中旬の長雨",answer:"梅雨",choices:["梅雨","台風","高潮","濃霧"]},
        {label:"夏〜秋に日本をおそう",answer:"台風",choices:["台風","梅雨","やませ","季節風"]},
        {label:"台風時に海岸付近で注意",answer:"高潮",choices:["高潮","津波","雪害","干害"]}
      ],success:"教材①の後半もすべて確認しました。"}),
      ()=>sourceBlankStep({title:"5-8 要点・一口メモまで確認",number:"要点＋一口メモ",prompt:"まとめ欄にある災害・気象用語も問題にして確認しよう。",blanks:[
        {label:"瀬戸内の干害対策として教材に出るため池",answer:"満濃池",choices:["満濃池","八郎潟","琵琶湖","諏訪湖"]},
        {label:"北陸の雪害対策",answer:"がん木・消雪道路",choices:["がん木・消雪道路","防風林・地下ダム","堤防・輪中","ため池・用水"]},
        {label:"風水害への備え",answer:"ダム・堤防・植林",choices:["ダム・堤防・植林","がん木・消雪道路","暗渠排水・客土","防風林・地下ダム"]},
        {label:"風速17m/秒以上の熱帯低気圧",answer:"台風",choices:["台風","梅雨","やませ","季節風"]},
        {label:"最高気温35℃以上の日",answer:"猛暑日",choices:["猛暑日","真夏日","熱帯夜","真冬日"]},
        {label:"最高気温0℃未満の日",answer:"真冬日",choices:["真冬日","冬日","熱帯夜","猛暑日"]}
      ],success:"まとめノートに出す災害対策・台風の定義・気温用語まで、先に問題として扱いました。"}),
      ()=>chapter5SakuraStep(),
      ()=>chapter5ColdDamageWritten(),
      ()=>sequenceStep({title:"5-11 桜の開花が遅れる理由",question:"標高の高いところで桜の開花が遅れる理由を順に並べよう。",items:["標高が高い","気温が低くなる","桜の開花が遅れる","桜前線が山地で南へくぼむ"],correct:["標高が高い","気温が低くなる","桜の開花が遅れる","桜前線が山地で南へくぼむ"],success:"『標高』を使って理由を説明できる流れになりました。"})
    ]
    ,6: [
      ()=>readStep({title:"6-1 気候グラフは何を見る？",text:`日本の気候は、<b>北海道・日本海側・瀬戸内・内陸性・太平洋側・南西諸島</b>の6つに分けて整理できます。気候グラフでは、<b>気温の高さ・寒暖差・雨の多い季節・年間降水量</b>を見比べます。`,focus:"都市名を暗記する前に、『気温』『降水量』『季節』のどこを見るかを意識する。"}),
      ()=>chapter6Overview(),
      ()=>sourceBlankStep({title:"6-2 ポイント・チェック① 北海道・日本海側",number:"①(1)(2)",prompt:"北海道と日本海側の気候について完成させよう。",blanks:[
        {label:"ア　北海道の気温が低い主な理由",answer:"緯度が高い",choices:["緯度が高い","標高が高い","黒潮が流れる","都市が少ない"]},
        {label:"イ　北海道で影響を受けにくい長雨",answer:"梅雨",choices:["梅雨","秋雨","雪害","高潮"]},
        {label:"ウ　北海道で影響を受けにくいもの",answer:"台風",choices:["台風","季節風","流氷","寒流"]},
        {label:"エ　日本海側で冬に吹く季節風",answer:"北西",choices:["北西","南東","北東","南西"]},
        {label:"オ　日本海で湿気を与える暖流",answer:"対馬海流",choices:["対馬海流","日本海流","千島海流","リマン海流"]}
      ],success:"北海道＝高緯度・梅雨や台風の影響が小さい。日本海側＝北西季節風＋対馬海流の湿気→冬の降水。"}),
      ()=>sourceBlankStep({title:"6-3 ポイント・チェック① 太平洋側・沖縄",number:"①(3)(4)",prompt:"太平洋側と沖縄の気候・農業・水について完成させよう。",blanks:[
        {label:"カ　太平洋側で夏に吹く季節風",answer:"南東",choices:["南東","北西","北東","南西"]},
        {label:"キ　沖縄で栽培される果実",answer:"パイナップル",choices:["パイナップル","りんご","さくらんぼ","ぶどう"]},
        {label:"ク　沖縄でさかんな工芸作物",answer:"さとうきび",choices:["さとうきび","てんさい","い草","みつまた"]},
        {label:"ケ　沖縄で少ないため水不足につながるもの",answer:"大きな川",choices:["大きな川","サンゴ礁","台風","地下水"]}
      ],success:"太平洋側＝南東季節風で夏に雨が多い。沖縄＝高温多雨だが、石灰岩地質や大きな川の少なさから水不足対策が必要です。"}),
      ()=>infoStep({title:"6-4 沖縄の地下ダム",label:"STEP 3　👀 図で理解",html:`<div class="diagram"><b>地下ダムのしくみ</b><svg viewBox="0 0 650 260" role="img" aria-label="地下ダムの模式図"><path d="M20 80 Q140 55 260 78 T630 70 L630 245 L20 245 Z" fill="#e9dfc8" stroke="#777"/><path d="M40 110 Q160 95 300 115 T610 105" fill="none" stroke="#72a6bf" stroke-width="18" opacity=".65"/><rect x="360" y="100" width="28" height="145" rx="4" fill="#8e8c84"/><text x="405" y="160" font-size="18">水を通しにくい壁</text><text x="75" y="138" font-size="18">地下水</text><text x="65" y="42" font-size="17">雨がしみこみやすい石灰岩</text></svg></div><p>雨が地下へしみこみやすい地域で、地下に壁をつくって水をためます。</p>`,after:"沖縄では雨水利用・海水の淡水化に加え、地下ダムも生活用水・農業用水の確保に使われます。"}),
      ()=>sourceBlankStep({title:"6-5 ポイント・チェック① 関東内陸の冬",number:"①(5)",prompt:"関東地方の内陸部で冬に見られる風と、その対策を完成させよう。",blanks:[
        {label:"コ　北西から吹く乾いた風",answer:"からっ風",choices:["からっ風","やませ","フェーン","季節風"]},
        {label:"サ　屋敷の周りに木を植えた防風林",answer:"屋敷森",choices:["屋敷森","防砂林","魚つき林","保安林"]}
      ],success:"関東内陸の冬＝北西からの乾いた『からっ風』。家の周囲の『屋敷森』で風を防ぎます。"}),
      ()=>chapter6GraphRead(),
      ()=>chapter6Compare(),
      ()=>quizStep({title:"6-8 グラフを見る順番",question:"気候グラフで『日本海側の気候』を見分けるとき、最も決め手になりやすいのは？",correct:"冬の降水量が多い",distractors:["夏の気温が最も高い","年間を通じて雨がほぼない","年平均気温が最も高い"],extra:"日本海側は、冬の北西季節風が日本海で湿気を含み、山地にぶつかって雨や雪を降らせます。"}),
      ()=>sequenceStep({title:"6-9 日本海側で冬に雪・雨が多い理由",question:"原因から結果へ並べよう。",items:["北西の季節風が吹く","日本海を渡って対馬海流の湿気を含む","中央部の山脈にぶつかる","冬に雨や雪が多くなる"],correct:["北西の季節風が吹く","日本海を渡って対馬海流の湿気を含む","中央部の山脈にぶつかる","冬に雨や雪が多くなる"],success:"風向き→海流の湿気→山脈→降水、という因果で説明できます。"})
    ]

    ,7: [
      ()=>readStep({title:"7-1 都市と政令指定都市",text:`教材の都市人口表では、1位は<b>東京23区 957.1万人</b>、2位横浜、3位大阪、4位名古屋です。☆印の20都市は<b>政令指定都市</b>で、市に区を置くことができ、国の援助を受けるときは都道府県なみにあつかわれます。東京23区は特別区です。`,focus:"「都市人口の順位」と「政令指定都市の意味」を分けて読む。"}),
      ()=>evidenceStep({title:"7-2 政令指定都市の根拠",question:"政令指定都市の特徴を直接説明している部分は？",parts:["☆印の20都市は政令指定都市です。","市に区を置くことができ、","国の援助を受けるときは都道府県なみにあつかわれます。","東京23区は特別区です。"],correctIndex:2,explain:"教材では、国の援助を受けるときに都道府県なみにあつかわれることも特徴として示しています。"}),
      ()=>sourceBlankStep({title:"7-3 都道府県の人口ランキング",number:"要点のまとめ",prompt:"教材の表をもとに、人口の多い都道府県の上位を完成させよう。",blanks:[
        {label:"1位",answer:"東京都",choices:["東京都","神奈川県","大阪府","愛知県"]},
        {label:"2位",answer:"神奈川県",choices:["神奈川県","大阪府","埼玉県","千葉県"]},
        {label:"3位",answer:"大阪府",choices:["大阪府","愛知県","埼玉県","兵庫県"]},
        {label:"4位",answer:"愛知県",choices:["愛知県","埼玉県","千葉県","兵庫県"]},
        {label:"5位",answer:"埼玉県",choices:["埼玉県","千葉県","兵庫県","福岡県"]},
        {label:"6位",answer:"千葉県",choices:["千葉県","兵庫県","埼玉県","北海道"]},
        {label:"7位",answer:"兵庫県",choices:["兵庫県","千葉県","福岡県","北海道"]}
      ],success:"上位7都府県で、日本の人口の5割近くをしめると教材にあります。"}),
      ()=>sourceBlankStep({title:"7-4 都道府県の人口・面積・人口密度",number:"要点のまとめ",prompt:"表の「いちばん」と上位を読み分けよう。",blanks:[
        {label:"人口が最も少ない",answer:"鳥取県",choices:["鳥取県","島根県","高知県","福井県"]},
        {label:"面積1位",answer:"北海道",choices:["北海道","岩手県","福島県","長野県"]},
        {label:"面積2位",answer:"岩手県",choices:["岩手県","福島県","長野県","新潟県"]},
        {label:"面積3位",answer:"福島県",choices:["福島県","長野県","岩手県","新潟県"]},
        {label:"面積4位",answer:"長野県",choices:["長野県","新潟県","福島県","岩手県"]},
        {label:"面積5位",answer:"新潟県",choices:["新潟県","長野県","北海道","福島県"]},
        {label:"人口密度が最も高い",answer:"東京都",choices:["東京都","大阪府","神奈川県","愛知県"]},
        {label:"人口密度が最も低い",answer:"北海道",choices:["北海道","岩手県","秋田県","青森県"]}
      ],success:"人口・面積・人口密度は別のランキングです。問いの言葉を見落とさないことが大切です。"}),
      ()=>infoStep({title:"7-5 三大都市圏と人口",html:`<div class="read-box"><b>三大都市圏の人口割合（2020年）</b><br>東京50キロ圏：27.0%<br>大阪50キロ圏：13.1%<br>名古屋50キロ圏：7.4%<br>その他：52.5%</div><div class="focus-box"><b>読むポイント</b><br>東京・大阪・名古屋の3つを合わせると、日本の人口のおよそ半分です。</div>`,buttonText:"割合を確認した",after:"都市圏には人口が集中しています。次は昼間人口・夜間人口と人口移動をつなげます。"}),
      ()=>readStep({title:"7-6 昼間人口・夜間人口・ドーナツ化",text:`<b>昼間人口</b>は昼間の人口で都市部に多く、<b>夜間人口</b>は夜間の人口で、ふつう「人口」というと夜間人口を指します。夜間人口はベッドタウンに多くなります。大都市の周辺部で人口増加率が高く、中心部で人口が減る現象を<b>ドーナツ化現象</b>といいます。地方の農山村や大都市中心部で人口が減ることは<b>過疎</b>につながります。`,focus:"「昼に集まる場所」「夜に住む場所」「中心部と周辺部の人口変化」を分ける。"}),
      ()=>evidenceStep({title:"7-7 ベッドタウンの根拠",question:"ベッドタウンで多い人口を示す根拠は？",parts:["昼間人口は昼間の人口のこと。","都市部に多い。","夜間人口は夜間の人口のこと。","夜間人口はベッドタウンに多い。"],correctIndex:3,explain:"ベッドタウンは、昼は通勤・通学で人が外へ出ても、夜には住民が戻るため夜間人口が多くなります。"}),
      ()=>sourceBlankStep({title:"7-8 ポイント・チェック① ア〜ソ",number:"①",prompt:"教材の穴埋めを、内容のまとまりごとに全部確認しよう。",blanks:[
        {label:"ア　人口2位の都道府県",answer:"神奈川県",choices:["神奈川県","大阪府","愛知県","埼玉県"]},
        {label:"イ　人口3位の都道府県",answer:"大阪府",choices:["大阪府","神奈川県","愛知県","千葉県"]},
        {label:"ウ　人口5位の都道府県",answer:"埼玉県",choices:["埼玉県","千葉県","兵庫県","福岡県"]},
        {label:"エ　人口2位の都市",answer:"横浜市",choices:["横浜市","大阪市","名古屋市","札幌市"]},
        {label:"オ　人口3位の都市",answer:"大阪市",choices:["大阪市","横浜市","名古屋市","札幌市"]},
        {label:"カ　100万人以上の都市を2つもつ都道府県",answer:"神奈川県",choices:["神奈川県","大阪府","愛知県","北海道"]},
        {label:"キ　人口が最も少ない県",answer:"鳥取県",choices:["鳥取県","島根県","高知県","徳島県"]},
        {label:"ク　北海道地方の100万人都市",answer:"札幌市",choices:["札幌市","仙台市","広島市","福岡市"]},
        {label:"ケ　東北地方の100万人都市",answer:"仙台市",choices:["仙台市","札幌市","広島市","新潟市"]},
        {label:"コ　中国地方の100万人都市",answer:"広島市",choices:["広島市","岡山市","仙台市","北九州市"]},
        {label:"サ　面積2位",answer:"岩手県",choices:["岩手県","福島県","長野県","新潟県"]},
        {label:"シ　面積4位",answer:"長野県",choices:["長野県","福島県","新潟県","岩手県"]},
        {label:"ス　浦和・大宮・与野が合併",answer:"さいたま市",choices:["さいたま市","川崎市","相模原市","熊本市"]},
        {label:"セ　2010年に政令指定都市",answer:"相模原市",choices:["相模原市","川崎市","さいたま市","熊本市"]},
        {label:"ソ　2012年に政令指定都市",answer:"熊本市",choices:["熊本市","岡山市","相模原市","静岡市"]}
      ],success:"ポイント・チェック①のア〜ソをすべて確認しました。"}),
      ()=>chapter7InlandMap(),
      ()=>sequenceStep({title:"7-10 ポイント・チェック③ 地方の農山村",question:"地方の農山村で人口が減った理由を、原因から結果へ並べよう。",items:["働き口が少ない","若者が地域を出ていく","人口が減る"],correct:["働き口が少ない","若者が地域を出ていく","人口が減る"],success:"教材の記述例は「働き口が少なく、若者が出ていってしまったから」です。"}),
      ()=>sequenceStep({title:"7-11 ポイント・チェック③ 東京の中心部",question:"1970〜80年代に東京中心部の人口が減った理由を、原因から結果へ並べよう。",items:["地価が高騰する","郊外へ移り住む","中心部の人口が減る"],correct:["地価が高騰する","郊外へ移り住む","中心部の人口が減る"],success:"教材の記述例は「地価の高騰により、郊外に移り住むようになったから」です。"}),
      ()=>chapter7SchoolShortage()
    ]


    ,8:[
      ()=>readStep({title:"8-1 産業別人口",text:`<b>第一次産業</b>は農業・林業・水産業、<b>第二次産業</b>は鉱業・工業・建設業、<b>第三次産業</b>は商業・運輸通信業・サービス業です。社会が発展するほど、第一次産業より第二次産業、第二次産業より第三次産業の人口割合が高くなります。`,focus:"「何をする産業か」と「社会が発展したときの割合の変化」を分けて読む。"}),
      ()=>evidenceStep({title:"8-2 第三次産業の根拠",question:"第三次産業に入る仕事を直接説明している部分は？",parts:["第一次産業は農業・林業・水産業。","第二次産業は鉱業・工業・建設業。","第三次産業は商業・運輸通信業・サービス業。","社会が発展するほど第三次産業の割合が高くなる。"],correctIndex:2,explain:"商業・運輸通信業・サービス業が第三次産業です。"}),
      ()=>matchStep({title:"8-3 産業を分類",prompt:"仕事を産業に分けよう。",rows:[
        {label:"農業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"林業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"水産業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"鉱業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"工業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"建設業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"商業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"運輸通信業",choices:["第一次産業","第二次産業","第三次産業"]},
        {label:"サービス業",choices:["第一次産業","第二次産業","第三次産業"]}
      ],answers:["第一次産業","第一次産業","第一次産業","第二次産業","第二次産業","第二次産業","第三次産業","第三次産業","第三次産業"],success:"教材に出てくる産業分類をすべて確認しました。"}),
      ()=>chapter8IndustryChart(),
      ()=>readStep({title:"8-5 年齢別人口",text:`戦前の年齢別人口は<b>ピラミッド（多産多死）型</b>で、発展途上国に多い形です。現在は<b>つぼ（少産少死）型</b>で、先進国に多い形です。ただし日本は、ベビーブームの影響で形が少し変形しています。`,focus:"戦前と現在で「形」と「出生・死亡」をセットにする。"}),
      ()=>evidenceStep({title:"8-6 現在の日本の根拠",question:"現在の日本の年齢別人口を説明している部分は？",parts:["戦前はピラミッド型。","多産多死型は発展途上国に多い。","現在はつぼ（少産少死）型。","第一次産業の割合が高い。"],correctIndex:2,explain:"現在＝つぼ型＝少産少死。ただし日本はベビーブームの影響で変形しています。"}),
      ()=>chapter8PopulationShape(),
      ()=>readStep({title:"8-8 少子化・平均寿命・ベビーブーム",text:`生まれる子どもの数が少なくなった背景として、教材は<b>女性の高学歴化・晩婚化・共働きの増加</b>をあげています。平均寿命がのびた背景は<b>医学の発達・栄養の改善</b>です。太平洋戦争直後の1947〜1949年生まれを<b>第一次ベビーブーム</b>、その世代の子どもが多く生まれた1970年代前半を<b>第二次ベビーブーム</b>としています。`,focus:"「子どもが減る理由」「長生きする理由」「2つのベビーブーム」を区別する。"}),
      ()=>readStep({title:"8-9 将来人口と少子高齢社会",text:`教材では、2025年には<b>3割</b>の人が高齢者、2050年には0〜14歳10.6%、15〜64歳51.8%、65歳以上37.7%と予測しています。その結果、高齢者が受け取る年金が<b>少なく</b>なり、働く世代の負担が<b>重く</b>なることなどが問題として示されています。`,focus:"割合の数字だけでなく、「その結果どうなるか」までつなげる。"}),
      ()=>sourceBlankStep({title:"8-10 ポイント・チェック① 穴埋め",number:"①",prompt:"教材の穴埋めを全部確認しよう。",blanks:[
        {label:"ア　第一次産業の例",answer:"林業",choices:["林業","鉱業","商業","運輸業"]},
        {label:"イ　自然に働きかける産業",answer:"第一次産業",choices:["第一次産業","第二次産業","第三次産業","サービス業"]},
        {label:"ウ　地下資源を取り出す",answer:"鉱業",choices:["鉱業","林業","商業","運輸業"]},
        {label:"エ　鉱業・工業・建設業",answer:"第二次産業",choices:["第二次産業","第一次産業","第三次産業","サービス業"]},
        {label:"オ　ものを売る",answer:"商業",choices:["商業","林業","鉱業","建設業"]},
        {label:"カ　ものの輸送",answer:"運輸業",choices:["運輸業","鉱業","農業","建設業"]},
        {label:"キ　社会発展で割合が高くなる",answer:"第三次産業",choices:["第三次産業","第一次産業","第二次産業","農業"]},
        {label:"ク　年齢別人口構成のグラフ",answer:"ピラミッド",choices:["ピラミッド","ドーナツ","扇形","棒"]},
        {label:"ケ　現在の型",answer:"少産少死",choices:["少産少死","多産多死","多産少死","少産多死"]},
        {label:"コ　昭和20年代の出生増",answer:"ベビーブーム",choices:["ベビーブーム","ドーナツ化","過疎","高齢化"]},
        {label:"サ　2025年の高齢者割合",answer:"3割",choices:["3割","1割","5割","7割"]},
        {label:"シ　2050年はおよそ何人に2人が高齢者",answer:"5人",choices:["5人","3人","7人","10人"]},
        {label:"ス　働く世代何人で高齢者1人を支える",answer:"1.4人",choices:["1.4人","2.4人","3.4人","4.1人"]},
        {label:"セ　高齢者が受け取る年金",answer:"少なく",choices:["少なく","多く","同じに","なく"]},
        {label:"ソ　働く世代の負担",answer:"重く",choices:["重く","軽く","なく","同じに"]}
      ],success:"ポイント・チェック①をすべて確認しました。"}),
      ()=>chapter8BirthDeathGraph(),
      ()=>chapter8KantoGraph()
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
    `,
    5: `
      <div class="note-section"><b>【今日のテーマ】</b>気候の特色と災害</div>
      <div class="note-section"><b>【日本の気候】</b>大部分＝温帯／北海道＝冷帯／沖縄＝亜熱帯。高度100m上昇→気温約0.6℃低下。内陸は年較差・日較差が大きい。</div>
      <div class="note-section"><b>【海流・季節風】</b>日本海流＝黒潮（暖流）／対馬海流＝暖流／千島海流＝親潮（寒流）。夏＝暖かく湿った南東風、冬＝冷たく湿った北西風。</div>
      <div class="note-section"><b>【災害】</b>北海道の冷害＝高緯度・千島海流・濃霧／東北東部＝千島海流・やませ／瀬戸内の干害＝満濃池・香川用水（吉野川）／北陸の雪害＝がん木・消雪道路／太平洋側の風水害＝台風。</div>
      <div class="note-section"><b>【気象用語】</b>梅雨＝6月〜7月中旬の長雨。台風＝風速17m/秒以上の熱帯低気圧。真夏日＝最高30℃以上／猛暑日＝最高35℃以上／熱帯夜＝最低25℃以上／真冬日＝最高0℃未満。</div>
      <div class="note-section"><b>【桜前線】</b>標高が高い→気温が低い→開花が遅い→前線は山地で南へくぼむ。</div>
      <div class="note-section"><b>【記述】</b>東北太平洋側が冷害を受けやすい理由＝沖合を寒流の千島海流が流れ、夏にやませが吹くため。</div>
      <div class="note-section"><b>【これだけは覚える！】</b>気候問題は『場所→気温・風・海流→災害や農業への影響』でつなげる。</div>
    `
    ,6: `
      <div class="note-section"><b>【今日のテーマ】</b>気候区分と気候グラフ</div>
      <div class="note-section"><b>【6つの区分】</b>北海道＝札幌／日本海側＝金沢／瀬戸内＝岡山／内陸性＝松本／太平洋側＝高知／南西諸島＝那覇。</div>
      <div class="note-section"><b>【グラフの見分け方】</b>北海道＝低温／日本海側＝冬の降水量が多い／瀬戸内＝降水量が少ない／内陸＝降水量が少なく寒暖差が大きい／太平洋側＝夏の降水量が多い／南西諸島＝高温・多雨。</div>
      <div class="note-section"><b>【理由】</b>日本海側：北西季節風→日本海で対馬海流の湿気→山脈→冬に雪・雨。太平洋側：南東季節風→夏に降水量が多い。</div>
      <div class="note-section"><b>【沖縄】</b>パイナップル・さとうきび。石灰岩で雨がしみこみやすく大きな川も少ない→水不足→雨水利用・海水淡水化・地下ダム。</div>
      <div class="note-section"><b>【関東内陸】</b>冬の乾いた北西風＝からっ風。屋敷森で風を防ぐ。</div>
      <div class="note-section"><b>【ポイント・チェック②】</b>松本＝エ／岡山＝ウ／札幌＝カ／高知＝イ／金沢＝オ／那覇＝ア。</div>
      <div class="note-section"><b>【記述】</b>瀬戸内と内陸はどちらも降水量が少ない。瀬戸内の方が年平均気温はやや高く、内陸は年較差が大きい。</div>
    `
    ,7: `
      <div class="note-section"><b>【今日のテーマ】</b>都市・都道府県の人口、面積、人口密度と人口移動</div>
      <div class="note-section"><b>【大事な言葉】</b>政令指定都市／昼間人口／夜間人口／ベッドタウン／ドーナツ化現象／過疎／内陸県</div>
      <div class="note-section"><b>【人口】</b>都道府県上位：東京→神奈川→大阪→愛知→埼玉→千葉→兵庫。最少＝鳥取。都市上位：東京23区→横浜→大阪→名古屋。</div>
      <div class="note-section"><b>【面積・人口密度】</b>面積：北海道→岩手→福島→長野→新潟。人口密度：最高＝東京、最低＝北海道。</div>
      <div class="note-section"><b>【関係図】</b>大都市中心部：地価高騰 → 郊外へ移住 → 中心部人口減少。地方農山村：働き口が少ない → 若者流出 → 人口減少。</div>
      <div class="note-section"><b>【内陸県】</b>全部で8県。教材地図：ア長野／イ奈良／ウ岐阜／エ山梨／オ埼玉／カ栃木／キ群馬。残りは滋賀。</div>
      <div class="note-section"><b>【政令指定都市】</b>市に区を置ける。教材では20都市。2001年＝さいたま市、2010年＝相模原市、2012年＝熊本市。</div>
      <div class="note-section"><b>【これだけは覚える！】</b>「人口」「面積」「人口密度」を混同しない。人口移動は「原因→人の移動→人口の増減」で説明する。</div>
    `

    ,8: `
      <div class="note-section"><b>【今日のテーマ】</b>産業別人口・年齢別人口・少子高齢社会と人口の変化</div>
      <div class="note-section"><b>【大事な言葉】</b>第一次産業／第二次産業／第三次産業／人口ピラミッド／多産多死／少産少死／ベビーブーム／少子高齢社会／出生率／死亡率／自然増減</div>
      <div class="note-section"><b>【産業別人口】</b>第一次＝農林水産、第二次＝鉱工業・建設、第三次＝商業・運輸通信・サービス。社会が発展するほど第三次産業の割合が高くなる。</div>
      <div class="note-section"><b>【年齢別人口】</b>戦前＝ピラミッド型（多産多死）。現在＝つぼ型（少産少死）。日本はベビーブームの影響で形が少し変形。</div>
      <div class="note-section"><b>【関係図】</b>子どもの数が減る＋平均寿命がのびる → 少子高齢社会 → 年金や働く世代の負担などの問題。</div>
      <div class="note-section"><b>【ベビーブーム】</b>第一次＝1947〜1949年生まれ。第二次＝その世代の子どもが多く生まれた1970年代前半。</div>
      <div class="note-section"><b>【グラフ】</b>出生率＝A。AとBの差＝人口の自然増減。1947年ごろの出生率増加は、戦争が終わって安心して子どもを産めるようになったため。</div>
      <div class="note-section"><b>【昼・夜の人口】</b>関東では東京都の昼間人口が目立って多い。埼玉・千葉・神奈川は夜間人口の方が目立って多い。</div>
      <div class="note-section"><b>【これだけは覚える！】</b>グラフは「名前を覚える」だけでなく、何が増減しているか・その差が何を意味するかまで説明する。</div>
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
    ],
    5:[
      {q:"日本の大部分が属する気候帯は？",correct:"温帯",d:["冷帯","亜熱帯","寒帯"]},
      {q:"海抜高度が100m上がると気温は約どうなる？",correct:"0.6℃下がる",d:["0.6℃上がる","1.0℃下がる","変わらない"]},
      {q:"千島海流の別名は？",correct:"親潮",d:["黒潮","対馬海流","日本海流"]},
      {q:"夏の季節風の向きは？",correct:"南東から",d:["北西から","北東から","南西から"]},
      {q:"瀬戸内地方の干害対策として吉野川から水を引くのは？",correct:"香川用水",d:["愛知用水","明治用水","豊川用水"]},
      {q:"北陸地方の雪害対策は？",correct:"がん木・消雪道路",d:["満濃池・香川用水","ダム・堤防・植林","防風林・地下ダム"]},
      {q:"熱帯夜の基準は？",correct:"最低気温25℃以上",d:["最高気温25℃以上","最高気温30℃以上","最低気温30℃以上"]},
      {q:"東北太平洋側の冷害の主な2要因は？",correct:"千島海流とやませ",d:["黒潮と南東風","対馬海流と北西風","梅雨と高潮"]}
    ]
    ,6:[
      {q:"日本海側の気候の代表都市は？",correct:"金沢",d:["岡山","松本","高知"]},
      {q:"瀬戸内の気候の特徴は？",correct:"年間降水量が少ない",d:["冬の降水量が多い","一年中低温","夏の降水量が最も多い"]},
      {q:"内陸性の気候の代表都市は？",correct:"松本",d:["札幌","那覇","金沢"]},
      {q:"日本海側で冬の降水量が多くなるとき湿気を与える海流は？",correct:"対馬海流",d:["日本海流","千島海流","リマン海流"]},
      {q:"沖縄でさかんな工芸作物は？",correct:"さとうきび",d:["てんさい","い草","みつまた"]},
      {q:"関東内陸で冬に吹く乾いた風は？",correct:"からっ風",d:["やませ","フェーン","海風"]},
      {q:"岡山と松本の共通点は？",correct:"どちらも降水量が少ない",d:["どちらも冬の降水量が多い","どちらも年平均気温が高い","どちらも年較差が小さい"]},
      {q:"ポイント・チェック②で那覇はどのグラフ？",correct:"ア",d:["イ","オ","カ"]}
    ]
    ,7:[
      {q:"人口が多い都道府県の2位は？",correct:"神奈川県",d:["大阪府","愛知県","埼玉県"]},
      {q:"人口が最も少ない県は？",correct:"鳥取県",d:["島根県","高知県","徳島県"]},
      {q:"面積が2番目に広い都道府県は？",correct:"岩手県",d:["福島県","長野県","新潟県"]},
      {q:"人口密度が最も高い都道府県は？",correct:"東京都",d:["大阪府","神奈川県","愛知県"]},
      {q:"47都道府県のうち内陸県はいくつ？",correct:"8県",d:["7県","9県","10県"]},
      {q:"浦和・大宮・与野が合併してできた市は？",correct:"さいたま市",d:["相模原市","川崎市","熊本市"]},
      {q:"地方の農山村で人口が減った主な理由は？",correct:"働き口が少なく若者が出ていった",d:["地価が高騰した","高層マンションが増えた","昼間人口が増えた"]},
      {q:"1970〜80年代に東京中心部の人口が減った主な理由は？",correct:"地価高騰で郊外へ移り住んだ",d:["働き口がなくなった","農業人口が増えた","小学校が不足した"]},
      {q:"2000年代の東京23区で高層マンション増加に伴い不足したものは？",correct:"小学校",d:["工業用水","工業用地","緑地"]}
    ]

    ,8:[
      {q:"農業・林業・水産業は？",correct:"第一次産業",d:["第二次産業","第三次産業","サービス業"]},
      {q:"鉱業・工業・建設業は？",correct:"第二次産業",d:["第一次産業","第三次産業","運輸業"]},
      {q:"社会が発展するほど人口割合が高くなるのは？",correct:"第三次産業",d:["第一次産業","第二次産業","農業だけ"]},
      {q:"戦前の年齢別人口の型は？",correct:"ピラミッド（多産多死）型",d:["つぼ（少産少死）型","ドーナツ型","少産多死型"]},
      {q:"現在の年齢別人口の基本的な型は？",correct:"つぼ（少産少死）型",d:["ピラミッド（多産多死）型","多産少死型","ドーナツ型"]},
      {q:"第一次ベビーブームは？",correct:"1947〜1949年生まれ",d:["1970年代前半生まれ","1960年代後半生まれ","1980年代生まれ"]},
      {q:"出生率と死亡率の差が表すものは？",correct:"人口の自然増減",d:["人口密度","昼間人口","産業人口"]},
      {q:"1947年ごろ出生率が増えた理由は？",correct:"戦争が終わって安心して子どもを産めるようになったから",d:["平均寿命が短くなったから","地価が下がったから","第三次産業が減ったから"]},
      {q:"関東の昼夜人口グラフで目立つ特徴は？",correct:"東京都の昼間人口が他県より目立って多い",d:["埼玉県の昼間人口が最も多い","全県で昼夜人口が同じ","東京都は夜間人口の方が多い"]}
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
