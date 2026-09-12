
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

  const PROGRESS_KEY = "socialQuest_ch1_ch2_v1";

  function getProgress(){
    try{
      return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {1:0,2:0,clear1:false,clear2:false};
    }catch{
      return {1:0,2:0,clear1:false,clear2:false};
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
    [1,2].forEach(ch=>{
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
    if(confirm("第1章・第2章の進捗をリセットしますか？")){
      localStorage.removeItem(PROGRESS_KEY);
      updateHomeProgress();
    }
  });

  updateHomeProgress();
})();
