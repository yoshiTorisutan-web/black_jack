// ═══════════════════════════════════════════════════════════
//  BLACKJACK ULTIMATE — app.js
// ═══════════════════════════════════════════════════════════

// ── DECK ─────────────────────────────────────────────────────
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_S = new Set(['♥','♦']);

function makeDeck(n=6){
  const d=[];
  for(let i=0;i<n;i++) for(const s of SUITS) for(const r of RANKS) d.push({rank:r,suit:s});
  return shuffleArr(d);
}
function shuffleArr(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
function cardVal(c){ if(['J','Q','K'].includes(c.rank))return 10; if(c.rank==='A')return 11; return+c.rank; }
function hiLoVal(c){ const v=cardVal(c); if(v>=10)return-1; if(v<=6)return+1; return 0; }
function handVal(cs){ let t=0,a=0; for(const c of cs){t+=cardVal(c);if(c.rank==='A')a++;} while(t>21&&a>0){t-=10;a--;} return t; }
function isBJ(cs){ return cs.length===2&&handVal(cs)===21; }

// ── BASIC STRATEGY ───────────────────────────────────────────
// Returns recommended action string
function basicStrategy(playerHand, dealerUpCard) {
  const pv   = handVal(playerHand);
  const dv   = cardVal(dealerUpCard);
  const soft = playerHand.some(c=>c.rank==='A') && playerHand.length===2 && pv<=21;
  const pair = playerHand.length===2 && cardVal(playerHand[0])===cardVal(playerHand[1]);

  if(pair){
    const pairV = cardVal(playerHand[0]);
    if(pairV===11||pairV===8) return '↑ SÉPARER';
    if(pairV===10||pairV===5) return pairV===10?'○ RESTER':'× DOUBLER';
    if(pairV===9) return (dv===7||dv>=10)?'○ RESTER':'↑ SÉPARER';
    if(pairV===7) return dv<=7?'↑ SÉPARER':'⊕ TIRER';
    if(pairV===6) return dv<=6?'↑ SÉPARER':'⊕ TIRER';
    if(pairV===4) return (dv===5||dv===6)?'↑ SÉPARER':'⊕ TIRER';
    if(pairV<=3)  return dv<=7?'↑ SÉPARER':'⊕ TIRER';
  }
  if(soft){
    const other = playerHand.find(c=>c.rank!=='A');
    const ov = cardVal(other||{rank:'2'});
    if(ov>=8) return '○ RESTER';
    if(ov===7) return dv>=3&&dv<=6?'× DOUBLER':dv<=7?'○ RESTER':'⊕ TIRER';
    if(ov>=5) return dv>=4&&dv<=6?'× DOUBLER':'⊕ TIRER';
    if(ov>=3) return dv>=5&&dv<=6?'× DOUBLER':'⊕ TIRER';
    return '⊕ TIRER';
  }
  if(pv>=17) return '○ RESTER';
  if(pv>=13&&pv<=16) return dv<=6?'○ RESTER':'⊕ TIRER';
  if(pv===12) return dv>=4&&dv<=6?'○ RESTER':'⊕ TIRER';
  if(pv===11) return '× DOUBLER';
  if(pv===10) return dv<=9?'× DOUBLER':'⊕ TIRER';
  if(pv===9)  return dv>=3&&dv<=6?'× DOUBLER':'⊕ TIRER';
  return '⊕ TIRER';
}

// ── TABLES ───────────────────────────────────────────────────
const TABLES = {
  bronze:{ min:5,  max:100,  label:'🥉 BRONZE' },
  silver:{ min:25, max:500,  label:'🥈 SILVER' },
  gold:  { min:100,max:99999,label:'🥇 GOLD'   },
};

// ── OBJECTIVES ───────────────────────────────────────────────
const OBJECTIVES = [
  { id:'bj3',    desc:'3 Blackjacks',       target:3,  reward:500,  key:'bjCount',     done:false },
  { id:'win5',   desc:'5 victoires d\'affilée', target:5,  reward:300,  key:'curStreak',   done:false },
  { id:'hands50',desc:'50 mains jouées',    target:50, reward:1000, key:'handsPlayed',  done:false },
  { id:'dd5',    desc:'5 Doubles Down',     target:5,  reward:400,  key:'ddCount',      done:false },
];

// ── STATE ─────────────────────────────────────────────────────
const G = {
  deck:[], hiLoCount:0, deckRunning:0,
  dealerHand:[],
  hands:[[]], bets:[0], activeHand:0,
  balance:5000, currentBet:0, lastBet:0,
  multiHands:1,
  phase:'betting',
  tableLevel:'gold',
  jackpot:0, jackpotBet:false,
  insuranceBet:0, insurancePending:false,
  doubled:[false], splitDone:false, surrendered:false,
  strategyOn:false, hiloOn:false,
  history:[], curStreak:0, bestStreak:0,
  bankrollHistory:[5000],
  // stats
  handsPlayed:0, wins:0, losses:0, pushes:0,
  bjCount:0, ddCount:0, splitCount:0,
  totalWon:0,
  // objectives progress
  objProgress:{ bjCount:0, curStreak:0, handsPlayed:0, ddCount:0 },
  objDone: new Set(),
  theme:'night',
};

// ── AUDIO ─────────────────────────────────────────────────────
const AC = new(window.AudioContext||window.webkitAudioContext)();
function beep(f,d,t='sine',v=.07){ try{ AC.resume(); const o=AC.createOscillator(),g=AC.createGain(); o.connect(g);g.connect(AC.destination); o.type=t;o.frequency.value=f; g.gain.setValueAtTime(v,AC.currentTime); g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d); o.start();o.stop(AC.currentTime+d); }catch(e){} }
function sndDeal(){ beep(440,.06,'sine',.05); }
function sndFlip(){ beep(320,.1,'triangle',.06); }
function sndChip(){ beep(900,.04,'square',.04); }
function sndWin() { [523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,.15,'sine',.06),i*100)); }
function sndBJ()  { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.2,'sine',.07),i*80)); }
function sndLose(){ beep(220,.3,'sawtooth',.06); }
function sndBust(){ beep(150,.4,'sawtooth',.08); }

// ── PARTICLES ────────────────────────────────────────────────
const pCanvas = document.getElementById('particle-canvas');
const pCtx    = pCanvas.getContext('2d');
let particles = [];

function resizeParticles(){
  pCanvas.width=window.innerWidth;
  pCanvas.height=window.innerHeight;
}
window.addEventListener('resize',resizeParticles);
resizeParticles();

function spawnParticles(type='win'){
  const colors = type==='win'
    ? ['#c9a84c','#e8c86a','#4ade80','#fff']
    : type==='bj'
    ? ['#c9a84c','#e8c86a','#fff8dc','#ffd700']
    : ['#e74c3c','#ff6b6b','#c0392b'];
  const table = document.getElementById('main-table');
  const rect  = table.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top  + rect.height/2;
  for(let i=0;i<(type==='bj'?80:40);i++){
    particles.push({
      x:cx, y:cy,
      vx:(Math.random()-.5)*10,
      vy:(Math.random()-1)*10,
      r:Math.random()*5+2,
      c:colors[Math.floor(Math.random()*colors.length)],
      life:1, decay:Math.random()*.02+.015,
      rot:Math.random()*360, vr:(Math.random()-.5)*8,
    });
  }
  animParticles();
}

let pAnimId=null;
function animParticles(){
  if(pAnimId) cancelAnimationFrame(pAnimId);
  function frame(){
    pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
    particles=particles.filter(p=>p.life>0);
    for(const p of particles){
      p.x+=p.vx; p.y+=p.vy; p.vy+=.25; p.rot+=p.vr; p.life-=p.decay;
      pCtx.save();
      pCtx.translate(p.x,p.y); pCtx.rotate(p.rot*Math.PI/180);
      pCtx.globalAlpha=Math.max(0,p.life);
      pCtx.fillStyle=p.c;
      pCtx.fillRect(-p.r,-p.r*.6,p.r*2,p.r*.6*2);
      pCtx.restore();
    }
    if(particles.length) pAnimId=requestAnimationFrame(frame);
    else pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  }
  pAnimId=requestAnimationFrame(frame);
}

// ── THEME ─────────────────────────────────────────────────────
function toggleTheme(){
  G.theme = G.theme==='night'?'day':'night';
  document.documentElement.dataset.theme=G.theme;
  document.getElementById('theme-btn').textContent=G.theme==='night'?'☀ JOUR':'🌙 NUIT';
  drawBankrollChart();
}

// ── TABLE SELECT ──────────────────────────────────────────────
function openTableSelect(){ document.getElementById('table-modal').classList.add('show'); }
function closeTableSelect(){ document.getElementById('table-modal').classList.remove('show'); }
function selectTable(t){
  G.tableLevel=t;
  document.getElementById('table-badge').textContent=TABLES[t].label;
  document.querySelectorAll('.table-card').forEach(c=>c.classList.toggle('active',c.dataset.t===t));
  closeTableSelect();
}

// ── JACKPOT ───────────────────────────────────────────────────
function toggleJackpotBet(){
  if(G.phase!=='betting')return;
  G.jackpotBet=!G.jackpotBet;
  document.getElementById('jackpot-btn').className='jackpot-btn'+(G.jackpotBet?' active':'');
}

function growJackpot(amount){
  G.jackpot+=amount;
  document.getElementById('jackpot-val').textContent=fmt(G.jackpot);
}

function checkJackpot(hand){
  // Jackpot: suited blackjack (same suit)
  if(!G.jackpotBet||!isBJ(hand)) return false;
  if(hand[0].suit===hand[1].suit){
    G.balance+=G.jackpot;
    showToast(`💥 JACKPOT ! +${fmt(G.jackpot)} !`);
    G.jackpot=0;
    document.getElementById('jackpot-val').textContent='0 €';
    return true;
  }
  return false;
}

// ── HI-LO COUNTING ───────────────────────────────────────────
function updateHiLo(card){
  G.hiLoCount+=hiLoVal(card);
  const decks=Math.max(1,Math.round(G.deck.length/52));
  G.deckRunning=decks>0?+(G.hiLoCount/decks).toFixed(1):0;
  if(G.hiloOn) renderHiLoIndicator();
}

function renderHiLoIndicator(){
  const el=document.getElementById('hilo-indicator');
  if(!G.hiloOn){ el.textContent='◆'; el.className='bank-value hilo neutral'; return; }
  const v=G.deckRunning;
  if(v>=2){ el.textContent='🔥'; el.className='bank-value hilo hot'; }
  else if(v<=-2){ el.textContent='❄'; el.className='bank-value hilo cold'; }
  else { el.textContent=v>0?'▲':v<0?'▼':'◆'; el.className='bank-value hilo neutral'; }
}

function toggleHiLo(){
  G.hiloOn=document.getElementById('hilo-toggle').checked;
  renderHiLoIndicator();
}

// ── STRATEGY ─────────────────────────────────────────────────
function toggleStrategy(){
  G.strategyOn=document.getElementById('strategy-toggle').checked;
  updateStrategyHint();
}

function updateStrategyHint(){
  const el=document.getElementById('strategy-hint');
  if(!G.strategyOn||G.phase!=='playing'||G.dealerHand.length<2){ el.style.display='none'; return; }
  const hand=G.hands[G.activeHand];
  const upCard=G.dealerHand[0];
  const rec=basicStrategy(hand,upCard);
  document.getElementById('strategy-text').textContent=`Conseil : ${rec}`;
  el.style.display='block';
}

// ── MULTI HANDS ───────────────────────────────────────────────
function setMultiHands(n){
  G.multiHands=n;
  document.querySelectorAll('.multi-btn').forEach(b=>b.classList.toggle('active',+b.dataset.h===n));
}

// ── BETTING ───────────────────────────────────────────────────
function addBet(amount){
  if(G.phase!=='betting')return;
  const totalNeeded=amount*(G.jackpotBet?G.multiHands:G.multiHands);
  if(G.balance-G.currentBet<amount){ flashBalance(); return; }
  G.currentBet+=amount;
  sndChip(); updateBankUI();
  document.getElementById('deal-btn').disabled=G.currentBet<TABLES[G.tableLevel].min;
}

function clearBet(){ G.currentBet=0; updateBankUI(); document.getElementById('deal-btn').disabled=true; }
function repeatBet(){
  if(G.lastBet>0&&G.balance>=G.lastBet*G.multiHands){
    G.currentBet=G.lastBet; sndChip(); updateBankUI();
    document.getElementById('deal-btn').disabled=false;
  }
}

// ── DEAL ──────────────────────────────────────────────────────
function dealCards(){
  if(G.currentBet<TABLES[G.tableLevel].min||G.currentBet>TABLES[G.tableLevel].max||G.phase!=='betting')return;

  const jackpotFee=G.jackpotBet?5:0;
  const totalBet=G.currentBet*G.multiHands+jackpotFee;
  if(G.balance<totalBet){ flashBalance(); return; }

  G.lastBet=G.currentBet;
  G.balance-=totalBet;
  if(G.jackpotBet) growJackpot(jackpotFee*0.8);

  G.phase='playing';
  G.dealerHand=[];
  G.activeHand=0;
  G.splitDone=false;
  G.surrendered=false;
  G.insurancePending=false;
  G.insuranceBet=0;

  // Init hands
  G.hands=[]; G.bets=[]; G.doubled=[];
  for(let i=0;i<G.multiHands;i++){
    G.hands.push([drawCard(),drawCard()]);
    G.bets.push(G.currentBet);
    G.doubled.push(false);
  }
  G.dealerHand=[drawCard(),drawCard()];
  G.currentBet=0;

  // Rebuild zones
  buildPlayerZones();
  showBettingPanel(false);
  showActionPanel(true);
  renderAll();
  updateBankUI();
  updateStrategyHint();

  // Insurance check
  if(G.dealerHand[0].rank==='A'){
    setTimeout(()=>promptInsurance(),500);
  } else {
    checkImmediateBlackjacks();
  }
}

function drawCard(){
  if(G.deck.length<30) G.deck=makeDeck(6);
  const c=G.deck.pop();
  updateHiLo(c);
  return c;
}

function buildPlayerZones(){
  const wrap=document.getElementById('player-zones-wrap');
  wrap.innerHTML='';
  for(let i=0;i<G.multiHands;i++){
    const z=document.createElement('div');
    z.className='player-zone'; z.id=`zone-${i}`;
    z.innerHTML=`
      <div class="zone-label">MAIN ${i+1} <span class="active-dot off" id="dot-${i}">◆</span></div>
      <div class="score-display" id="score-${i}"></div>
      <div class="hand" id="hand-${i}"></div>
      <div class="zone-bet" id="zbet-${i}"></div>
    `;
    wrap.appendChild(z);
  }
}

function checkImmediateBlackjacks(){
  let allBJ=true;
  G.hands.forEach((h,i)=>{ if(!isBJ(h)) allBJ=false; });
  if(allBJ) setTimeout(()=>endRound(),600);
}

// ── INSURANCE ────────────────────────────────────────────────
function promptInsurance(){
  G.insurancePending=true;
  const sa=document.getElementById('special-actions');
  document.getElementById('btn-insurance').style.display='inline-flex';
  document.getElementById('btn-decline-ins').style.display='inline-flex';
  sa.style.display='flex';
  setActionsDisabled(true);
}

function takeInsurance(){
  const maxIns=Math.floor(G.bets[0]/2);
  if(G.balance<maxIns){ flashBalance(); declineInsurance(); return; }
  G.insuranceBet=maxIns;
  G.balance-=maxIns;
  hideSpecialActions();
  setActionsDisabled(false);
  updateBankUI();
  G.insurancePending=false;
  continueAfterInsurance();
}

function declineInsurance(){
  G.insuranceBet=0;
  hideSpecialActions();
  setActionsDisabled(false);
  G.insurancePending=false;
  continueAfterInsurance();
}

function hideSpecialActions(){
  document.getElementById('btn-insurance').style.display='none';
  document.getElementById('btn-decline-ins').style.display='none';
  document.getElementById('special-actions').style.display='none';
}

function continueAfterInsurance(){
  if(isBJ(G.dealerHand)){
    // Dealer has BJ — resolve insurance, then round
    if(G.insuranceBet>0){
      G.balance+=G.insuranceBet*3; // insurance pays 2:1
      updateBankUI();
    }
    endRound();
  } else {
    if(G.insuranceBet>0){
      showToast('Croupier n\'a pas de Blackjack. Assurance perdue.');
    }
    checkImmediateBlackjacks();
  }
}

// ── HIT / STAND / DOUBLE / SPLIT / SURRENDER ─────────────────
function hit(){
  if(G.phase!=='playing')return;
  const hand=G.hands[G.activeHand];
  hand.push(drawCard()); sndDeal();
  renderHand(G.activeHand); updateScore(G.activeHand);
  updateStrategyHint(); updateActionBtns();
  const v=handVal(hand);
  if(v>21){ sndBust(); setTimeout(()=>advanceOrEnd(),500); }
  else if(v===21){ setTimeout(()=>advanceOrEnd(),400); }
}

function stand(){ if(G.phase!=='playing')return; advanceOrEnd(); }

function doubleDown(){
  if(G.phase!=='playing')return;
  const hand=G.hands[G.activeHand];
  if(hand.length!==2)return;
  const extra=Math.min(G.bets[G.activeHand],G.balance);
  if(extra===0)return;
  G.balance-=extra; G.bets[G.activeHand]+=extra;
  G.doubled[G.activeHand]=true; G.ddCount++;
  G.objProgress.ddCount++;
  hand.push(drawCard()); sndDeal();
  renderHand(G.activeHand); updateScore(G.activeHand);
  updateBankUI(); checkObjectives();
  setTimeout(()=>advanceOrEnd(),400);
}

function splitHand(){
  if(G.phase!=='playing'||G.splitDone||G.multiHands>1)return;
  const hand=G.hands[0];
  if(hand.length!==2||cardVal(hand[0])!==cardVal(hand[1]))return;
  if(G.balance<G.bets[0]){ flashBalance(); return; }
  G.balance-=G.bets[0]; G.splitDone=true;
  G.splitCount++;
  G.hands=[[hand[0],drawCard()],[hand[1],drawCard()]];
  G.bets=[G.bets[0],G.bets[0]]; G.doubled=[false,false];
  G.activeHand=0;
  // Add a second zone
  G.multiHands=2; buildPlayerZones(); G.multiHands=1; // keep multiHands=1 for next deal
  sndDeal(); renderAll(); updateBankUI(); updateActionBtns(); updateStrategyHint();
}

function surrender(){
  if(G.phase!=='playing')return;
  const hand=G.hands[G.activeHand];
  if(hand.length!==2)return;
  // Return half the bet
  G.balance+=Math.floor(G.bets[G.activeHand]/2);
  G.surrendered=true;
  G.history.push('S'); G.losses++;
  G.curStreak=0;
  G.bankrollHistory.push(G.balance);
  updateBankUI();
  document.getElementById('result-banner').textContent='⚑ Abandonné';
  document.getElementById('result-banner').className='result-banner surr';
  G.phase='done'; showActionPanel(false);
  setTimeout(()=>{ resetBanner(); showBettingPanel(true); document.getElementById('repeat-btn').style.display='inline-flex'; renderHistory(); drawBankrollChart(); updateStats(); },2000);
}

// ── ADVANCE / END ─────────────────────────────────────────────
function advanceOrEnd(){
  if(G.activeHand<G.hands.length-1){
    G.activeHand++;
    renderAll(); updateActionBtns(); updateStrategyHint(); return;
  }
  endRound();
}

// ── DEALER + RESOLVE ─────────────────────────────────────────
function endRound(){
  G.phase='done'; showActionPanel(false);
  // Show dealer think
  const think=document.getElementById('dealer-think');
  think.classList.add('show');
  // Flip hole card with 3D animation
  const holeCard=document.getElementById('dealer-hand').children[1];
  if(holeCard){ holeCard.classList.add('flip-anim'); }
  sndFlip();
  setTimeout(()=>{
    renderDealer(true); think.classList.remove('show');
    dealerDraw();
  },600);
}

function dealerDraw(){
  const dv=handVal(G.dealerHand);
  if(dv<17){
    setTimeout(()=>{
      G.dealerHand.push(drawCard()); sndDeal();
      renderDealer(true); dealerDraw();
    },550);
  } else {
    setTimeout(()=>resolveAll(),400);
  }
}

function resolveAll(){
  const dv=handVal(G.dealerHand);
  const dbust=dv>21; const dbj=isBJ(G.dealerHand)&&!G.splitDone;
  let netGain=0; const results=[];

  G.hands.forEach((hand,idx)=>{
    const pv=handVal(hand); const pbj=isBJ(hand)&&!G.splitDone; const pbust=pv>21;
    const bet=G.bets[idx];
    let result,gain;

    if(pbust){ result='L'; gain=0; }
    else if(pbj&&!dbj){ result='BJ'; gain=Math.round(bet*2.5); }
    else if(dbj&&!pbj){ result='L'; gain=0; }
    else if(dbust||pv>dv){ result='W'; gain=bet*2; }
    else if(pv===dv){ result='P'; gain=bet; }
    else { result='L'; gain=0; }

    G.balance+=gain; netGain+=gain-bet;
    G.totalWon+=gain-bet;
    results.push({result,gain,bet,hand});

    const zbet=document.getElementById(`zbet-${idx}`);
    if(zbet){
      const lbl={W:'✓ GAGNÉ',L:'✗ PERDU',P:'═ ÉGALITÉ',BJ:'★ BLACKJACK'}[result];
      const col={W:'#4ade80',L:'#e74c3c',P:'var(--cream)',BJ:'var(--gold2)'}[result];
      zbet.innerHTML=`<span style="color:${col};font-size:11px;letter-spacing:1.5px">${lbl}</span>`;
    }

    // Jackpot
    if(result==='BJ') checkJackpot(hand);

    // Stats
    if(result==='BJ'||result==='W'){ G.wins++; G.curStreak++; G.bestStreak=Math.max(G.bestStreak,G.curStreak); }
    else if(result==='L'){ G.losses++; G.curStreak=0; }
    else { G.pushes++; }
    if(result==='BJ'){ G.bjCount++; G.objProgress.bjCount++; }
  });

  G.handsPlayed++; G.objProgress.handsPlayed++;
  if(G.curStreak>0) G.objProgress.curStreak=G.curStreak;

  // Overall banner
  const mainRes=results.length===1?results[0].result:
    results.every(r=>r.result==='W')?'W':
    results.every(r=>r.result==='L')?'L':
    results.some(r=>r.result==='BJ')?'BJ':'P';

  const bn=document.getElementById('result-banner');
  const msgs={BJ:'★ Blackjack !',W:`✓ +${fmt(Math.abs(netGain))} €`,L:'✗ Perdu',P:'═ Égalité'};
  bn.textContent=msgs[mainRes]||'';
  bn.className=`result-banner ${mainRes.toLowerCase()}`;

  // Effects
  if(mainRes==='BJ'){ sndBJ(); spawnParticles('bj'); }
  else if(mainRes==='W'){ sndWin(); spawnParticles('win'); }
  else { sndLose(); }

  G.bankrollHistory.push(G.balance);
  if(G.bankrollHistory.length>50) G.bankrollHistory.shift();

  updateBankUI(); renderHistory(); drawBankrollChart(); updateStats(); checkObjectives();

  setTimeout(()=>{
    results.forEach((_,i)=>{ const z=document.getElementById(`zbet-${i}`); if(z)z.innerHTML=''; });
    resetBanner(); showBettingPanel(true);
    G.multiHands=1; // reset multi
    document.getElementById('repeat-btn').style.display=G.lastBet>0?'inline-flex':'none';
    document.querySelectorAll('.multi-btn').forEach(b=>b.classList.toggle('active',+b.dataset.h===1));
  },2200);
}

// ── RENDER ────────────────────────────────────────────────────
function renderAll(){
  renderDealer(G.phase==='done');
  for(let i=0;i<G.hands.length;i++){
    renderHand(i); updateScore(i); updateZoneBet(i);
  }
  // Active dots
  for(let i=0;i<4;i++){
    const d=document.getElementById(`dot-${i}`);
    if(d) d.className=`active-dot${G.activeHand===i&&G.phase==='playing'?'':' off'}`;
  }
}

function renderDealer(revealed=false){
  const el=document.getElementById('dealer-hand'); el.innerHTML='';
  G.dealerHand.forEach((c,i)=>el.appendChild(makeCard(c,!revealed&&i===1)));
  const se=document.getElementById('dealer-score');
  if(revealed){
    const v=handVal(G.dealerHand);
    se.textContent=v; se.className=`score-display${v>21?' bust':isBJ(G.dealerHand)?' blackjack':''}`;
  } else {
    se.textContent=cardVal(G.dealerHand[0])+'+'; se.className='score-display';
  }
}

function renderHand(idx){
  const el=document.getElementById(`hand-${idx}`); if(!el)return;
  el.innerHTML='';
  (G.hands[idx]||[]).forEach(c=>el.appendChild(makeCard(c,false)));
}

function updateScore(idx){
  const el=document.getElementById(`score-${idx}`); if(!el)return;
  const v=handVal(G.hands[idx]||[]);
  el.textContent=v||'';
  el.className=`score-display${v>21?' bust':isBJ(G.hands[idx])?' blackjack':''}`;
}

function updateZoneBet(idx){
  const el=document.getElementById(`zbet-${idx}`); if(!el)return;
  el.textContent=G.bets[idx]?`Mise : ${G.bets[idx]} €`:'';
}

function makeCard(card,faceDown){
  const el=document.createElement('div');
  el.className=faceDown?'card face-down':'card';
  if(!faceDown){
    const red=RED_S.has(card.suit),cc=red?'red-s':'blk-s';
    el.innerHTML=`
      <div class="card-corner"><div class="card-rank ${cc}">${card.rank}</div><div class="card-suit ${cc}">${card.suit}</div></div>
      <div class="card-center ${cc}">${card.suit}</div>
      <div class="card-corner br"><div class="card-rank ${cc}">${card.rank}</div><div class="card-suit ${cc}">${card.suit}</div></div>
    `;
  }
  return el;
}

// ── ACTION BUTTONS ────────────────────────────────────────────
function updateActionBtns(){
  if(G.phase!=='playing')return;
  const hand=G.hands[G.activeHand]||[];
  const v=handVal(hand); const isFirst=hand.length===2&&!G.doubled[G.activeHand];
  const canDouble=isFirst&&G.balance>=G.bets[G.activeHand];
  const canSplit=isFirst&&!G.splitDone&&G.multiHands===1&&hand.length===2
    &&cardVal(hand[0])===cardVal(hand[1])&&G.balance>=G.bets[G.activeHand];
  const canSurr=isFirst;

  document.getElementById('btn-hit').disabled=v>=21;
  document.getElementById('btn-stand').disabled=false;
  document.getElementById('btn-double').disabled=!canDouble;
  const bs=document.getElementById('btn-split');
  bs.style.display=canSplit?'inline-flex':'none';
  const surr=document.getElementById('btn-surrender');
  surr.style.display=canSurr?'inline-flex':'none';
}

function setActionsDisabled(d){
  ['btn-hit','btn-stand','btn-double','btn-split','btn-surrender'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.disabled=d;
  });
}

// ── UI HELPERS ────────────────────────────────────────────────
function showBettingPanel(s){ G.phase=s?'betting':G.phase; document.getElementById('betting-panel').style.display=s?'flex':'none'; }
function showActionPanel(s){ document.getElementById('action-panel').style.display=s?'flex':'none'; if(s)updateActionBtns(); }

function updateBankUI(){
  const b=document.getElementById('balance'); b.textContent=fmt(G.balance);
  b.className='bank-value'+( G.balance>5000?' win':G.balance<1000?' lose':'');
  document.getElementById('current-bet').textContent=G.currentBet>0?fmt(G.currentBet):'0 €';
  const w=document.getElementById('total-won');
  w.textContent=(G.totalWon>=0?'+':'')+fmt(G.totalWon);
  w.className='bank-value'+(G.totalWon>0?' win':G.totalWon<0?' lose':'');
}

function fmt(n){ return Math.abs(n).toLocaleString('fr-FR')+' €'; }

function flashBalance(){
  const el=document.getElementById('balance');
  el.style.animation='none'; el.offsetHeight;
  el.style.animation='flashRed .4s ease';
}

function resetBanner(){
  const b=document.getElementById('result-banner');
  b.textContent=''; b.className='result-banner';
}

function renderHistory(){
  const strip=document.getElementById('history-strip');
  strip.innerHTML=G.history.slice(-30).map(r=>`<div class="hdot ${r}">${r}</div>`).join('');
  const s=document.getElementById('streak-display');
  s.textContent=G.curStreak>=3?`🔥 Série de ${G.curStreak} !`:G.bestStreak>=3?`Meilleure série : ${G.bestStreak}`:'';
}

// ── BANKROLL CHART ────────────────────────────────────────────
function drawBankrollChart(){
  const canvas=document.getElementById('bankroll-chart');
  canvas.width=canvas.offsetWidth||740; canvas.height=60;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const data=G.bankrollHistory.slice(-50);
  if(data.length<2){ ctx.fillStyle='rgba(201,168,76,.3)'; ctx.font='10px Josefin Sans'; ctx.fillText('Joue des mains pour voir la courbe…',10,30); return; }
  const max=Math.max(...data),min=Math.min(...data),rng=max-min||1;
  const w=canvas.width,h=canvas.height,pad=6;
  const pts=data.map((v,i)=>({x:pad+i/(data.length-1)*(w-pad*2),y:pad+(max-v)/rng*(h-pad*2)}));
  const isUp=data[data.length-1]>=data[0];
  const col=isUp?'#4ade80':'#e74c3c';
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,isUp?'rgba(74,222,128,.3)':'rgba(231,76,60,.3)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();
  ctx.lineTo(w-pad,h); ctx.lineTo(pad,h); ctx.fillStyle=grad; ctx.fill();
  pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,2.5,0,Math.PI*2); ctx.fillStyle=col; ctx.fill(); });
}

// ── STATS ─────────────────────────────────────────────────────
function updateStats(){
  // live stats button will update modal if open
  if(document.getElementById('stats-modal').classList.contains('show')) renderStatsModal();
}

function openStats(){ renderStatsModal(); document.getElementById('stats-modal').classList.add('show'); }
function closeStats(){ document.getElementById('stats-modal').classList.remove('show'); }

function renderStatsModal(){
  const sg=document.getElementById('stats-grid');
  const total=G.wins+G.losses+G.pushes||1;
  sg.innerHTML=[
    ['Mains jouées',G.handsPlayed],
    ['Victoires',`${G.wins} (${Math.round(G.wins/total*100)}%)`],
    ['Défaites',G.losses],
    ['Égalités',G.pushes],
    ['Blackjacks',G.bjCount],
    ['Doubles Down',G.ddCount],
    ['Splits',G.splitCount],
    ['Meilleure série',G.bestStreak],
    ['Solde actuel',fmt(G.balance)],
    ['Net total',(G.totalWon>=0?'+':'')+fmt(G.totalWon)],
  ].map(([l,v])=>`<div class="stat-item"><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`).join('');

  // Mini chart in stats
  const canvas=document.getElementById('stats-chart');
  canvas.width=canvas.offsetWidth||380; canvas.height=100;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const data=G.bankrollHistory.slice(-30);
  if(data.length<2) return;
  const max=Math.max(...data),min=Math.min(...data),rng=max-min||1;
  const w=canvas.width,h=canvas.height,p=8;
  const pts=data.map((v,i)=>({x:p+i/(data.length-1)*(w-p*2),y:p+(max-v)/rng*(h-p*2)}));
  const col=data[data.length-1]>=data[0]?'#4ade80':'#e74c3c';
  ctx.beginPath(); pts.forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y));
  ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();
}

// ── OBJECTIVES ────────────────────────────────────────────────
function renderObjectives(){
  const row=document.getElementById('objectives-row'); row.innerHTML='';
  for(const obj of OBJECTIVES){
    const prog=Math.min(G.objProgress[obj.key]||0,obj.target);
    const done=prog>=obj.target;
    const pct=Math.round(prog/obj.target*100);
    row.innerHTML+=`<div class="obj-chip${done?' done':''}">
      ${done?'✓':'○'} ${obj.desc}
      <div class="obj-bar"><div class="obj-fill" style="width:${pct}%"></div></div>
    </div>`;
  }
}

function checkObjectives(){
  for(const obj of OBJECTIVES){
    if(G.objDone.has(obj.id)) continue;
    const prog=G.objProgress[obj.key]||0;
    if(prog>=obj.target){
      G.objDone.add(obj.id);
      G.balance+=obj.reward;
      updateBankUI();
      showToast(`🎯 Objectif atteint : ${obj.desc} ! +${fmt(obj.reward)}`);
    }
  }
  renderObjectives();
}

function showToast(msg){
  const t=document.getElementById('obj-toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

// ── FLASH ANIMATION ───────────────────────────────────────────
const flashStyle=document.createElement('style');
flashStyle.textContent=`@keyframes flashRed{0%,100%{color:var(--cream)}50%{color:#e74c3c}}`;
document.head.appendChild(flashStyle);

// ── INIT ──────────────────────────────────────────────────────
G.deck=makeDeck(6);
updateBankUI();
renderHistory();
renderObjectives();
drawBankrollChart();
document.getElementById('deal-btn').disabled=true;
document.getElementById('repeat-btn').style.display='none';
document.getElementById('stats-modal').onclick=closeStats;
document.getElementById('table-modal').onclick=closeTableSelect;
