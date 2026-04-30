// 外部JSONから問題集を読み込む
let questions = {};
let currentRound = "round1"; // 現在のラウンド

// 問題集を読み込む関数
async function loadQuestions(filename = "questions_round1") {
  try {
    const response = await fetch(`./questions/${filename}.json`);
    if (!response.ok) throw new Error(`Failed to load ${filename}.json`);
    const data = await response.json();
    console.log(`✓ Loaded questions from: ${filename}.json`);
    return data;
  } catch (error) {
    console.error("❌ Error loading questions:", error);
    alert("問題集の読み込みに失敗しました。ページをリロードしてください。");
    return {};
  }
}

// ラウンドを切り替える関数
async function switchRound(round) {
  // ボタンのハイライトを更新
  const buttons = document.querySelectorAll(".round-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  // 現在のラウンドの進捗を保存
  saveRoundData(currentRound);

  // 現在のラウンドを更新
  currentRound = round;

  // 新しい問題集を読み込む
  const questionFileName = `questions_${round}`;
  questions = await loadQuestions(questionFileName);

  if (Object.keys(questions).length === 0) {
    alert(`${questionFileName}がまだ作成されていません。`);
    currentRound = "round1";
    questions = await loadQuestions("questions_round1");
    buttons[0].classList.add("active");
    return;
  }

  // 新しいラウンドの進捗を読み込む
  loadRoundData(currentRound);

  // ホーム画面を再レンダリング
  goHome();
}

// 以下、削除されたのは元のlet questions { ... }の定義です
// 現在はquestions/questions_round1.jsonから読み込まれます

/* 状態 */
let state={
 chapter:null,
 index:0,
 selected:null,
 score:0,
 progress:{},
 wrong:{},
 allWrong:[],
 mode:"normal",
 currentList:[],
 allProgress: 0,
 firstClearShown: false,
 times: {},  // 各章の最速タイム（ミリ秒）
 startTime: null,  // クイズ開始時刻
 answerHistory: [],  // 各問題での選択回答履歴
 answerResults: []   // 各問題の正解/不正解記録（true=正解, false=不正解）
};



/* ホーム */
function renderHome(){

 let totalChapters = Object.keys(questions).length;
 let cleared = 0;

 Object.keys(questions).forEach(ch=>{
   if((state.progress[ch]||0)===questions[ch].length){
     cleared++;
   }
 });

 let percent = Math.floor((cleared/totalChapters)*100);

 document.getElementById("overallProgress").innerHTML=`
 <div class="lesson">
   <div style="width:100%">
     <strong>全体進捗</strong>
     <div class="progress-bar">
       <div class="progress-fill" style="width:${percent}%"></div>
     </div>
     <small>${cleared}/${totalChapters} (${percent}%)</small>
   </div>
 </div>
 `;

 const list = document.getElementById("lessonList");
 list.innerHTML = "";

 // ★ここが重要：全体テストも含める
 [...Object.keys(questions), "全体テスト"].forEach(ch=>{

   const isAll = ch === "全体テスト";

  const total = isAll
  ? getAllQuestions().length
  : questions[ch].length;

 const correct = isAll
  ? (state.allProgress || 0)
  : (state.progress[ch] || 0);

 const percent = Math.floor((correct / total) * 100);

 const isChecked = isAll 
  ? (state.allProgress === total)
  : (state.progress[ch] || 0) === questions[ch].length;
  // 所要時間を取得
  const timeMs = state.times[ch];
  const timeStr = timeMs ? formatTime(timeMs) : "";   const div = document.createElement("div");
   div.className = "lesson";

  div.innerHTML = `
<div style="display:flex;align-items:center;gap:10px;width:100%">
  <input type="checkbox" class="checkbox"
    ${isChecked ? "checked" : ""} disabled>

  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:8px">
      <strong>${ch}</strong>
      ${timeStr ? `<span style="font-size:0.85em;color:#666;">(${timeStr})</span>` : ""}
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${percent}%"></div>
    </div>
    <small>
      ${isAll ? "全問題から出題" : `${correct}/${total} (${percent}%)`}
    </small>
  </div>

  ${isAll ? `<button class="btn" onclick="startAllReview(event)">復習</button>` : ""}
</div>
`;

   // クリック処理
   div.onclick = () => {
     if(isAll){
       startAll();
     }else{
       openChapter(ch);
     }
   };

   div.style.setProperty("--progress", percent + "%");
   list.appendChild(div);
 });
}

function getAllQuestions(){
  let all = [];
  Object.keys(questions).forEach(ch=>{
    all = all.concat(questions[ch]);
  });
  return all;
}

function startAll(){
 state.chapter = "全体テスト";
 state.index = 0;
 state.score = 0;
 state.mode = "all";
 state.answerHistory = [];  // 回答履歴をリセット
 state.answerResults = [];  // 回答結果をリセット
 // 間違えた問題を保持（初期化のみ）
 if(!state.allWrong){
   state.allWrong = [];
 }
 state.startTime = Date.now();  // タイマー開始

 // 全問題＋選択肢ランダム
 state.currentList = shuffle(
   getAllQuestions().map(q => shuffleChoices(q))
 );

 document.getElementById("chapterView").classList.add("hidden"); 
 showQuiz();
}


function start(ch){
 state.chapter=ch;
 state.index=0;
 state.score=0;
 state.answerHistory = [];  // 回答履歴をリセット
 state.answerResults = [];  // 回答結果をリセット
 // 間違えた問題を保持（初期化のみ）
 if(!state.wrong[ch]){
   state.wrong[ch] = [];
 }
 state.mode="normal";
 state.startTime = Date.now();  // タイマー開始

 state.currentList = shuffle(
   questions[ch].map(q => shuffleChoices(q))
 ); 
 
 document.getElementById("chapterView").classList.add("hidden"); 
 showQuiz();
}

function shuffle(array){
  const arr = [...array]; // 元の配列を壊さない

  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));

    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }

  return arr;
}

function shuffleChoices(q){
  const arr = q.choices.map((choice, index) => ({
    text: choice,
    isCorrect: index === q.a
  }));

  const shuffled = arr.sort(() => Math.random() - 0.5);

  return {
    q: q.q,
    choices: shuffled.map(x => x.text),
    a: shuffled.findIndex(x => x.isCorrect)
  };
}


function startReview(ch){
 state.chapter=ch;
 state.index=0;
 state.mode="review";
 state.answerHistory = [];  // 回答履歴をリセット
 state.answerResults = [];  // 回答結果をリセット
 state.startTime = null;  // 復習モードではタイマーをリセット

 if(!state.wrong[ch]||state.wrong[ch].length===0){
   alert("復習問題なし");
   return;
 }
 state.currentList = shuffle(
   state.wrong[ch].map(q => shuffleChoices(q))
 );
 
 document.getElementById
    ("chapterView").classList.add("hidden");
 showQuiz();
}

function startAllReview(e){
  if(e) e.stopPropagation();

  if(!state.allWrong || state.allWrong.length === 0){
    alert("復習問題なし");
    return;
  }

  state.chapter = "全体テスト";
  state.index = 0;
  state.score = 0;
  state.mode = "allReview";
  state.answerHistory = [];  // 回答履歴をリセット
  state.answerResults = [];  // 回答結果をリセット
  state.startTime = null;  // 復習モードではタイマーをリセット

  state.currentList = shuffle(
    state.allWrong.map(q => shuffleChoices(q))
  );

  document.getElementById("chapterView").classList.add("hidden"); 
  showQuiz();
}


function showQuiz(){
 document.getElementById("homeView").classList.add("hidden");
 document.getElementById("quizView").classList.remove("hidden");
 load();
}

function getList(){
 return state.currentList;
}

//問題と選択肢を画面に表示する関数
function load(){
 const list = getList();
 const q=getList()[state.index];

 const persent = Math.floor(((state.index) / list.length) * 100);
 document.getElementById("quizProgressFill").style.width = persent + "%";
 document.getElementById("quizProgressText").innerText = 
    ` ${state.index} / ${list.length}`;

 document.getElementById("title").innerText=`${state.chapter} (${state.index+1})`;
 document.getElementById("question").innerText=q.q;

 const box=document.getElementById("answers");
 box.innerHTML="";
 
 // 前の回答を復元
 const previousAnswer = state.answerHistory[state.index];
 state.selected = previousAnswer !== undefined ? previousAnswer : null;

 q.choices.forEach((c,i)=>{
   const d=document.createElement("div");
   d.innerText=c;
   d.onclick=()=>select(i,d);
   // 前回選択した回答をハイライト
   if(i === previousAnswer){
     d.classList.add("selected");
   }
   box.appendChild(d);
 });
 
 // 戻るボタンの有効/無効を設定
 const prevBtn = document.getElementById("prevBtn");
 if(prevBtn){
   prevBtn.disabled = state.index === 0;
 }
}
//選択肢選ぶと呼ばれる関数
function select(i,el){
 state.selected=i;
 document.querySelectorAll("#answers div").forEach(d=>d.classList.remove("selected"));
 el.classList.add("selected");
}

//答えチェックして、進めて、終わったら結果処理する関数
function next(){
  if(state.selected===null)return;

  const list=getList();
  const q=list[state.index];

  // 前の回答と結果を取得
  const previousAnswer = state.answerHistory[state.index];
  const previousResult = state.answerResults[state.index];
  const isCorrect = (state.selected === q.a);
  
  // 回答を履歴に保存
  state.answerHistory[state.index] = state.selected;
  state.answerResults[state.index] = isCorrect;
  
  // スコアを調整
  if(previousResult !== undefined){
    // 既に回答済み - 結果が変わった場合のみスコアを調整
    if(previousResult && !isCorrect){
      // 正解→不正解に変更
      state.score--;
    } else if(!previousResult && isCorrect){
      // 不正解→正解に変更
      state.score++;
    }
  } else {
    // 初回回答
    if(isCorrect){
      state.score++;

      if(state.mode==="review"){
        state.progress[state.chapter] = (state.progress[state.chapter] || 0) + 1;

        if(state.progress[state.chapter] > questions[state.chapter].length){
          state.progress[state.chapter] = questions[state.chapter].length;
        }
      }
    }
  }

  state.index++;

  if(state.index>=list.length){

    // クイズ終了時に間違えた問題を記録
    if(state.mode === "normal"){
      state.wrong[state.chapter] = [];  // リセット
      list.forEach((q, i) => {
        if(state.answerResults[i] === false){
          state.wrong[state.chapter].push(q);
        }
      });
    }
    
    if(state.mode === "all"){
      state.allWrong = [];  // リセット
      list.forEach((q, i) => {
        if(state.answerResults[i] === false){
          state.allWrong.push(q);
        }
      });
    }

    // クイズ終了時に所要時間を記録
    if(state.startTime && (state.mode === "normal" || state.mode === "all")){
      const elapsedTime = Date.now() - state.startTime;
      const chapter = state.chapter;
      
      // 最速タイムを更新（まだ記録がないか、より速い場合）
      if(!state.times[chapter] || elapsedTime < state.times[chapter]){
        state.times[chapter] = elapsedTime;
      }
    }

    if(state.mode==="normal"){
      state.progress[state.chapter]=state.score;
    }

   let total;
   if (state.mode === "all" || state.mode === "allReview") {
     total = getAllQuestions().length;
   } else {
     total = questions[state.chapter].length;
   }

if(state.score === total){
  if(state.mode !== "all"){
    state.progress[state.chapter] = total;
  }
}

     if(state.mode==="all" || state.mode === "allReview"){
    state.allProgress = state.score;
  }

    saveData();

    // ★「今回初めて全クリしたか」を判定
    let totalChapters = Object.keys(questions).length;

    let cleared = Object.keys(questions).filter(ch => {
      return state.progress[ch] === questions[ch].length;
    }).length;

    // ★ここが超重要（フラグ追加）
    if(cleared === totalChapters && !state.firstClearShown){
      state.firstClearShown = true;
      showModal();

        setTimeout(() => {
            state.allCleared = false;
          }, 0);
        

      return;
    }

    goHome();

  }else{
    load();
  }
}

// 前の問題に戻る関数
function previous(){
  if(state.index === 0) return;  // 最初の問題の場合は戻れない
  
  state.index--;
  load();
}

function openChapter(ch){
    state.chapter = ch;
    
    document.getElementById("homeView").classList.add("hidden");
    document.getElementById("quizView").classList.add("hidden");
  document.getElementById("chapterView").classList.remove("hidden");

  document.getElementById("chapterTitle").innerText = ch;

  const hasWrong = state.wrong[ch] && state.wrong[ch].length > 0;
  const reviewBtn = document.querySelector("#chapterView .review");
    if(hasWrong){
  reviewBtn.classList.add("review-alert");
 }else{
  reviewBtn.classList.remove("review-alert");
 }


  const total = questions[ch].length;
  const correct = state.progress[ch] || 0;
  const percent = Math.floor((correct / total) * 100);

  document.getElementById("chapterProgress").innerHTML = `
  <div class="progress-bar">
    <div class="progress-fill" style="width:${percent}%"></div>
  </div>
  <small>${correct} / ${total} (${percent}%)</small>
 `;
}

function showModal(){
 const m = document.getElementById("resultModal");
 m.classList.add("show");
}

function closeModal(){
  const m = document.getElementById("resultModal");
  m.classList.remove("show");
  goHome();
}

function goHome(){
 document.getElementById("homeView").classList.remove("hidden");
 document.getElementById("quizView").classList.add("hidden");
 document.getElementById("chapterView").classList.add("hidden");
 renderHome();
}

// ミリ秒を「○分○秒」形式に変換
function formatTime(ms){
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if(minutes > 0){
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
}

function saveData(){
  saveRoundData(currentRound);
}

// ラウンド固有のデータを保存
function saveRoundData(round){
  localStorage.setItem(`progress_${round}`, JSON.stringify(state.progress));
  localStorage.setItem(`wrong_${round}`, JSON.stringify(state.wrong));
  localStorage.setItem(`allProgress_${round}`, JSON.stringify(state.allProgress));
  localStorage.setItem(`allWrong_${round}`, JSON.stringify(state.allWrong));
  localStorage.setItem(`firstClearShown_${round}`, JSON.stringify(state.firstClearShown));
  localStorage.setItem(`times_${round}`, JSON.stringify(state.times));  // 時間情報を保存
}

// ラウンド固有のデータを読み込み
function loadRoundData(round){
  state.progress = JSON.parse(localStorage.getItem(`progress_${round}`)) || {};
  state.wrong = JSON.parse(localStorage.getItem(`wrong_${round}`)) || {};
  state.allProgress = JSON.parse(localStorage.getItem(`allProgress_${round}`)) || 0;
  state.allWrong = JSON.parse(localStorage.getItem(`allWrong_${round}`)) || [];
  state.firstClearShown = JSON.parse(localStorage.getItem(`firstClearShown_${round}`)) || false;
  state.times = JSON.parse(localStorage.getItem(`times_${round}`)) || {};  // 時間情報を読み込み
}

document.addEventListener("DOMContentLoaded", async ()=>{
 // 問題集を動的に読み込む（デフォルトは第一回）
 questions = await loadQuestions("questions_round1");
 
 if (Object.keys(questions).length === 0) {
   console.error("No questions loaded!");
   return;
 }

 // ローカルストレージから現在のラウンドの状態を復元
 loadRoundData(currentRound);
 
 renderHome();
});