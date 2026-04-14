<template>
<div class="scoreboard">

  <!-- VICTORY -->
  <div v-if="winner" class="victory">
    🏆 {{ winner }} WINS 🏆
    <button class="back-btn" @click="backToMatch">
      Back
    </button>
  </div>

  <!-- JASO -->
  <div v-if="jaso.active" class="overlay">
    <h2 class="jaso">JASO</h2>
    <button @click="resumeFromJaso">Resume Match</button>
  </div>

  <!-- MEDIC -->
  <div v-if="medic.active" class="overlay">
    <h2>MEDIC {{ medic.team }}</h2>
    <h1>{{ medicTime }}</h1>
    <button @click="continueMatch">Continue</button>
    <button @click="injuryStop">Stop — Injury</button>
  </div>

  <!-- TOP -->
  <div class="top">
    <div class="category" @click="toggleTime">Time</div>
    <div class="timer">{{ time }}</div>
   
    <div class="reset" @click="reset">Reset</div>
    
  </div>

  <!-- RED -->
  <div class="row">

    <div class="info">
      <div class="country">Country</div>
      <div class="name">{{ match.A.name }}</div>
    </div>

    <div class="score cyan">

      <!-- penalty life bar -->
      <div class="penalty-bar" @click="penalty('A')">
        <div :class="['life', match.A.penalty >= 1 ? 'on' : '']"></div>
        <div :class="['life', match.A.penalty >= 2 ? 'on' : '']"></div>
        <div :class="['life', match.A.penalty >= 3 ? 'on red' : '']"></div>
      </div>

      <!-- score -->
      <div class="grid-3 boxes">
        <div class="box clickable" @click="score('A','k')">{{ match.A.k }}</div>
        <div class="box clickable" @click="score('A','yo')">{{ match.A.yo }}</div>
        <div class="box clickable" @click="score('A','ch')">{{ match.A.ch }}</div>
      </div>

    </div>
  </div>

  <!-- CENTER LABELS -->
  <div class="row">
    <div class="info"></div>
    <div class="score">
      <div class="grid-3 center-labels">
        <span>K</span>
        <span>YO</span>
        <span>CH</span>
      </div>
    </div>
  </div>

  <!-- BLUE -->
  <div class="row">

    <div class="info">
      <div class="country">Country</div>
      <div class="name">{{ match.B.name }}</div>
    </div>

    <div class="score green">

      <!-- score -->
      <div class="grid-3 boxes">
        <div class="box clickable" @click="score('B','k')">{{ match.B.k }}</div>
        <div class="box clickable" @click="score('B','yo')">{{ match.B.yo }}</div>
        <div class="box clickable" @click="score('B','ch')">{{ match.B.ch }}</div>
      </div>

      <!-- penalty life bar -->
      <div class="penalty-bar" @click="penalty('B')">
        <div :class="['life', match.B.penalty >= 1 ? 'on' : '']"></div>
        <div :class="['life', match.B.penalty >= 2 ? 'on' : '']"></div>
        <div :class="['life', match.B.penalty >= 3 ? 'on red' : '']"></div>
      </div>

    </div>
  </div>

  <!-- CONTROLS -->
  <div class="controls">
    <button @click="start">Start</button>
    <button @click="pause">Pause</button>
    <button @click="undo">Undo</button>
    <button @click="callMedic('A')">Medic A</button>
    <button @click="callMedic('B')">Medic B</button>
  </div>

</div>
</template>



<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const match = reactive({
  A:{ name:'Kian', k:0, yo:0, ch:0, g:0, d:0, t:0, medic:0 },
  B:{ name:'Ashleyt', k:0, yo:0, ch:0, g:0, d:0, t:0, medic:0 }
})

const history = ref([])
const winner = ref(null)

const matchDuration = ref(3)
const seconds = ref(matchDuration.value*60)
let interval = null

const actionHappened = ref(false)
const jaso = reactive({ active:false, triggered:false })

const medic = reactive({ active:false, seconds:60, team:null })
let medicInterval = null

const time = computed(()=>{
  const m=Math.floor(seconds.value/60)
  const s=seconds.value%60
  return `${m}:${s.toString().padStart(2,'0')}`
})

const medicTime = computed(()=>{
  const m=Math.floor(medic.seconds/60)
  const s=medic.seconds%60
  return `${m}:${s.toString().padStart(2,'0')}`
})

function saveState(){
  history.value.push(JSON.parse(JSON.stringify(match)))
}

function undo(){
  if(!history.value.length) return
  const prev=history.value.pop()
  Object.assign(match.A,prev.A)
  Object.assign(match.B,prev.B)
}

function score(side,type){
  if(winner.value || medic.active) return
  saveState()
  match[side][type]++
  actionHappened.value=true
  if(jaso.active) resumeFromJaso()

  // Kurash victory rules
  if(type==='k') winner.value=match[side].name
  if(type==='yo' && match[side].yo>=2) winner.value=match[side].name

  checkWinner()
}

function penalty(side){
  if(winner.value || medic.active) return
  saveState()

  const p = match[side]

  // escalate penalty ladder
  p.penalty = (p.penalty || 0) + 1

  // disqualification
  if(p.penalty >= 3){
    const opp = side === 'A' ? 'B' : 'A'
    winner.value = match[opp].name
    pause()
  }

  actionHappened.value = true
  if(jaso.active) resumeFromJaso()
}
function evaluateByPoints(){
  const A=match.A
  const B=match.B

  // Yonbosh comparison
  if(A.yo>B.yo) return A.name
  if(B.yo>A.yo) return B.name

  // Chala comparison
  if(A.ch>B.ch) return A.name
  if(B.ch>A.ch) return B.name

  return 'DRAW'
}

function checkWinner(){
  if(winner.value) pause()
}

function callMedic(side){
  if(medic.active || match[side].medic>=2) return
  pause()
  match[side].medic++
  medic.active=true
  medic.team=side
  medic.seconds=60

  medicInterval=setInterval(()=>{
    if(medic.seconds>0) medic.seconds--
    else endMedic()
  },1000)
}

function endMedic(){
  clearInterval(medicInterval)
  medic.active=false
}

function continueMatch(){
  endMedic()
  start()
}

function injuryStop(){
  const opp=medic.team==='A'?'B':'A'
  winner.value=match[opp].name
  endMedic()
  pause()
}

function checkJaso(){
  if(!actionHappened.value){
    jaso.active=true
    jaso.triggered=true
    pause()
  }
}

function resumeFromJaso(){
  jaso.active=false
  start()
}

function start(){
  if(interval || winner.value) return
  interval=setInterval(()=>{
    if(seconds.value>0){
      seconds.value--
      const half=Math.floor(matchDuration.value*60/2)
      if(seconds.value<=half && !jaso.triggered) checkJaso()
    } else {
      pause()
      winner.value=evaluateByPoints()
    }
  },1000)
}

function pause(){
  clearInterval(interval)
  interval=null
}

function reset(){
  pause()
  winner.value=null
  seconds.value=matchDuration.value*60
  jaso.active=false
  jaso.triggered=false
  actionHappened.value=false
  history.value=[]
  Object.assign(match.A,{
    k:0, yo:0, ch:0,
    penalty:0,
    medic:0
  })

  Object.assign(match.B,{
    k:0, yo:0, ch:0,
    penalty:0,
    medic:0
  })
}
function toggleTime(){
  const minutes = prompt("Enter match time (minutes):")

  if(minutes !== null && !isNaN(minutes) && minutes > 0){
    pause() // stop timer first
    matchDuration.value = parseInt(minutes)
    seconds.value = matchDuration.value * 60
    jaso.triggered = false
    jaso.active = false
  } else {
    alert("Invalid input")
  }
}
function backToMatch(){
  winner.value = null
  reset()
}

</script>


<style>
.clickable{cursor:pointer}
</style>

<style>
.back-btn{
  margin-top:20px;
  padding:15px 30px;
  font-size:24px;
  font-weight:bold;
  cursor:pointer;
}

.penalty-bar{
  display:flex;
  justify-content:center;
  gap:10px;
  margin-top:8px;
}

.life{
  width:28px;
  height:28px;
  border-radius:6px;
  background:#333;
  border:2px solid #555;
  transition:0.2s;
}

/* active penalty */
.life.on{
  background:#22c55e; /* green */
  border-color:#16a34a;
}

/* disqualification */
.life.red{
  background:#ef4444;
  border-color:#b91c1c;
  animation:pulse 0.6s infinite alternate;
}

@keyframes pulse{
  from{ transform:scale(1); opacity:0.8 }
  to{ transform:scale(1.15); opacity:1 }
}
.penalties{
  background-color: black;
  font-size:32px;
  color:rgb(255, 255, 255);
  padding:10px 0;
  cursor:pointer;
}
.grid-3{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  text-align:center;
  align-items:center;
}
.scoreboard{
background:black;
color:white;
height:100vh;
padding:20px;
font-family:Arial;
display:flex;
flex-direction:column;
justify-content:space-between;
}

.top{
display:flex;
justify-content:space-between;
align-items:center;
}

.timer{
font-size:180px;
color:red;
font-weight:bold;
}

.category,.reset{
color:gold;
font-size:28px;
cursor:pointer;
}

.row{
display:flex;
margin:20px 0;
}

.info{
width:20%;
}

.name{
font-size:60px;
font-weight:bold;
}

.country{
color:gold;
font-size:26px;
}

.score{
width:80%;
margin:auto;
}

.cyan{background:#4fa9bd;}
.green{background:#7dbb17;}

.labels{
display:flex;
justify-content:space-around;
font-size:40px;
color:#ccc;
}

.labels.yellow{color:yellow;}

.boxes{
display:flex;
justify-content:space-around;
}

.box{
font-size:110px;
font-weight:bold;
width:33%;
text-align:center;
border-left:5px solid black;
}

.box:first-child{border:none;}

.controls{
display:flex;
justify-content:center;
gap:10px;
}

button{
padding:12px;
font-size:18px;
font-weight:bold;
}

.overlay{
position:fixed;
inset:0;
background:black;
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
font-size:50px;
z-index:10;
}

.jaso{
color:yellow;
font-size:100px;
}

.victory{
position:fixed;
inset:0;
display:flex;
align-items:center;
justify-content:center;
font-size:70px;
color:#22c55e;
background:black;
animation:flash 1s infinite alternate;
z-index:20;
}
.label-row{
display:flex;
justify-content:space-around;
font-size:40px;
margin-bottom:10px;
color:#ccc;
}

.top-labels{
margin-bottom:15px;
}

.bottom-labels{
margin-top:15px;
cursor:pointer;
}

.center-labels{
display:flex;
justify-content:space-around;
font-size:48px;
color:yellow;
margin:10px 0;
font-weight:bold;
}

@keyframes flash{
from{opacity:0.5}
to{opacity:1}
}
</style>
