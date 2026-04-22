
import{initializeApp}from"https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import{getFirestore,doc,getDoc,setDoc,addDoc,collection,query,where,getDocs,orderBy,limit,updateDoc,deleteDoc,serverTimestamp,Timestamp}from"https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
const FC={apiKey:"AIzaSyAOPrFTN60IBmgzumjBUWs44BdLgg3DmdU",authDomain:"ujian-patlas-209fa.firebaseapp.com",projectId:"ujian-patlas-209fa",storageBucket:"ujian-patlas-209fa.firebasestorage.app",messagingSenderId:"576325442611",appId:"1:576325442611:web:912f211ad990e103ca5746"};
const app=initializeApp(FC);
const db=getFirestore(app);
const ADMIN_NIS="140110";
const DEFAULT_PASSWORD="141414";
const BACKUP_PASSWORD="https://14/pass#$shiy.oii:";
const THEMES=[
{id:"dark",label:"Dark",colors:["#0a0a0f","#1e1e2e","#4f8ef7"]},
{id:"light",label:"Light",colors:["#f0f2f8","#ffffff","#2563eb"]},
{id:"pinky",label:"Pinky",colors:["#fff0f8","#ffffff","#ff4da6"]},
{id:"minecraft",label:"Minecraft",colors:["#1a1a00","#3d3d00","#00aa00"]},
{id:"kemerdekaan",label:"Merdeka",colors:["#060606","#1a0000","#cc0000"]},
{id:"indonesia",label:"Indonesia",colors:["#cc0000","#ffffff","#cc0000"]},
{id:"hacker",label:"Hacker",colors:["#000000","#000800","#00ff00"]}
];
let currentUser=null;
let currentExam=null;
let examTimer=null;
let examAnswers={};
let currentQuestion=0;
let flaggedQuestions=new Set();
let violationCount=0;
let examViolations=[];
let allUsersCache=[];
let allNilaiCache=[];
let allViolationsCache=[];
let allHistoryCache=[];
let panitiaViolationsCache=[];
let panitiaHistoryCache=[];
let panitiaNilaiCache=[];
let studentScoreCache=[];
let pendingUnlockNis=null;
let currentAssignJadwalId=null;
let _notifInterval=null;
let _confirmResolve=null;
function showConfirm(title,msg,okLabel="Ya, Lanjutkan",okClass="btn-danger",icon="&#9888;"){
return new Promise(resolve=>{
_confirmResolve=resolve;
document.getElementById("confirmTitle").textContent=title;
document.getElementById("confirmMsg").textContent=msg;
document.getElementById("confirmIcon").innerHTML=icon;
document.getElementById("confirmOkBtn").textContent=okLabel;
document.getElementById("confirmOkBtn").className="btn "+okClass;
document.getElementById("confirmModal").classList.remove("hidden");
});
}
window.resolveConfirm=function(result){
document.getElementById("confirmModal").classList.add("hidden");
if(_confirmResolve){_confirmResolve(result);_confirmResolve=null;}
};
function sha256(str){const utf8=new TextEncoder().encode(str);return crypto.subtle.digest("SHA-256",utf8).then(buf=>{return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");});}
async function hashPassword(pwd){return await sha256(pwd+"PATLAS_SALT_14DPK");}
function getTheme(){return localStorage.getItem("patlas_theme")||"dark";}
function setTheme(t){
document.documentElement.setAttribute("data-theme",t);
localStorage.setItem("patlas_theme",t);
renderThemeEffects(t);
document.querySelectorAll(".theme-option").forEach(el=>{el.classList.toggle("active",el.dataset.theme===t);});
}
function renderThemeEffects(t){
document.querySelectorAll(".hacker-rain,.minecraft-bg,.pinky-field,.kemerdekaan-stars,.indonesia-banner").forEach(el=>el.remove());
if(t==="hacker"){
const rain=document.createElement("div");rain.className="hacker-rain";
const chars="01アイウエオカキクケコサシスセソタチツテトABCDEF";
for(let i=0;i<20;i++){
const col=document.createElement("div");col.className="hacker-col";
col.style.left=(i*5+Math.random()*3)+"%";
const dur=(2+Math.random()*5);
col.style.animationDuration=dur+"s";
col.style.animationDelay=(-Math.random()*5)+"s";
let txt="";for(let j=0;j<40;j++)txt+=chars[Math.floor(Math.random()*chars.length)]+" ";
col.textContent=txt;
rain.appendChild(col);
}
document.body.appendChild(rain);
}
if(t==="minecraft"){
const bg=document.createElement("div");bg.className="minecraft-bg";
const blocks=["#","[","]","{","}","*","#","#"];
for(let i=0;i<12;i++){
const b=document.createElement("div");b.className="mc-block";
b.style.left=Math.random()*100+"%";b.style.top=Math.random()*100+"%";
b.style.animationDelay=Math.random()*3+"s";
b.style.fontSize="24px";b.style.color="var(--accent)";b.style.fontFamily="monospace";
b.textContent=blocks[Math.floor(Math.random()*blocks.length)];
bg.appendChild(b);
}
document.body.appendChild(bg);
}
if(t==="pinky"){
const field=document.createElement("div");field.className="pinky-field";field.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden";
const items=["(^.^)","(=^.^=)","(>^.^<)","(*^.^*)","(+^.^+)","nya~","meow","uwu","owo","(u.u)"];
for(let i=0;i<12;i++){
const s=document.createElement("div");s.className="pinky-element";
s.style.left=Math.random()*95+"%";
s.style.top=Math.random()*95+"%";
s.style.fontSize=(10+Math.random()*14)+"px";
s.style.color=i%2===0?"#ff4da6":"#ff80c0";
s.style.opacity="0.35";
s.style.animationDuration=(2+Math.random()*3)+"s";
s.style.animationDelay=Math.random()*2+"s";
s.textContent=items[Math.floor(Math.random()*items.length)];
field.appendChild(s);
}
document.body.appendChild(field);
}
if(t==="kemerdekaan"){
const stars=document.createElement("div");stars.className="kemerdekaan-stars";
for(let i=0;i<15;i++){
const s=document.createElement("div");s.className="k-star";
s.textContent="*";s.style.left=Math.random()*100+"%";s.style.top=Math.random()*100+"%";
s.style.animationDelay=Math.random()*5+"s";
stars.appendChild(s);
}
document.body.appendChild(stars);
}
if(t==="indonesia"){
const banner=document.createElement("div");banner.className="indonesia-banner";
document.body.prepend(banner);
}
}
function buildThemeGrid(containerId){
const container=document.getElementById(containerId);if(!container)return;
container.innerHTML="";
THEMES.forEach(theme=>{
const el=document.createElement("div");el.className="theme-option"+(getTheme()===theme.id?" active":"");
el.dataset.theme=theme.id;
const preview=document.createElement("div");preview.className="theme-preview";
preview.style.background=`linear-gradient(135deg,${theme.colors[0]} 40%,${theme.colors[1]} 40% 70%,${theme.colors[2]} 70%)`;
el.appendChild(preview);
const label=document.createElement("span");label.textContent=theme.label;el.appendChild(label);
el.onclick=()=>{setTheme(theme.id);document.getElementById("themeModal").classList.add("hidden");};
container.appendChild(el);
});
}
function openThemeModal(){buildThemeGrid("themeModalGrid");document.getElementById("themeModal").classList.remove("hidden");}
function showLoader(msg="Memuat..."){document.getElementById("loaderOverlay").classList.remove("hidden");document.getElementById("loaderText").textContent=msg;}
function hideLoader(){document.getElementById("loaderOverlay").classList.add("hidden");}
function showToast(msg,type="info",duration=3500){
const tc=document.getElementById("toastContainer");
const t=document.createElement("div");t.className=`toast ${type}`;t.textContent=msg;
tc.appendChild(t);
setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(20px)";t.style.transition="all 0.3s";setTimeout(()=>t.remove(),300);},duration);
}
function showPage(pageId){
document.querySelectorAll(".page").forEach(p=>{p.classList.remove("active");p.style.display="none";});
const p=document.getElementById(pageId);if(p){p.classList.add("active");p.style.display="flex";}
}
function showAlert(id,msg,type="error"){const el=document.getElementById(id);if(!el)return;el.className=`alert alert-${type}`;el.textContent=msg;el.classList.remove("hidden");}
function hideAlert(id){const el=document.getElementById(id);if(el)el.classList.add("hidden");}
function formatWIB(ts){
let d;
if(ts&&ts.toDate)d=ts.toDate();
else if(ts instanceof Date)d=ts;
else d=new Date();
const opts={timeZone:"Asia/Jakarta",weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false};
const base=d.toLocaleString("id-ID",opts);
const ms=d.getMilliseconds().toString().padStart(3,"0");
return `${base} WIB (${ms}ms)`;
}
function formatWIBShort(ts){
let d;
if(ts&&ts.toDate)d=ts.toDate();
else if(ts instanceof Date)d=ts;
else d=new Date();
return d.toLocaleString("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" WIB";
}
async function checkNisType(nis){
try{const snap=await getDoc(doc(db,"users",nis));if(snap.exists())return snap.data().role||"siswa";return null;}
catch(e){return null;}
}
window.handleLogin=async function(){
const nis=document.getElementById("nisInput").value.trim();
const pwd=document.getElementById("passwordInput").value;
const remember=document.getElementById("rememberMe").checked;
hideAlert("loginAlert");
if(!nis){showAlert("loginAlert","Masukkan NIS Anda.");return;}
showLoader("Memverifikasi identitas...");
try{
const role=await checkNisType(nis);
if(role===null){hideLoader();showAlert("loginAlert","NIS tidak ditemukan dalam sistem.");return;}
if(role==="admin"||role==="panitia"){
const pwdGroup=document.getElementById("passwordGroup");
if(pwdGroup.style.display==="none"){
hideLoader();
pwdGroup.style.display="block";
document.getElementById("passwordInput").focus();
showAlert("loginAlert","Akun "+role+" terdeteksi. Masukkan password.","info");
return;
}
if(!pwd){hideLoader();showAlert("loginAlert","Masukkan password.");return;}
const hashedPwd=await hashPassword(pwd);
const userDoc=await getDoc(doc(db,"users",nis));
const userData=userDoc.data();
if(userData.password!==hashedPwd){hideLoader();showAlert("loginAlert","Password salah.");return;}
currentUser={...userData,nis,role};
await logLogin(currentUser);
if(remember)localStorage.setItem("patlas_session",JSON.stringify({nis,role,ts:Date.now()}));
else localStorage.removeItem("patlas_session");
hideLoader();
if(role==="admin")loadAdminPage();
else loadPanitiaPage();
}else{
if(!pwd){
hideLoader();
document.getElementById("passwordGroup").style.display="block";
document.getElementById("passwordInput").focus();
showAlert("loginAlert","Masukkan password Anda.","info");
return;
}
const hashedPwd=await hashPassword(pwd);
const userDoc=await getDoc(doc(db,"users",nis));
const userData=userDoc.data();
if(userData.password!==hashedPwd){hideLoader();showAlert("loginAlert","Password salah.");return;}
currentUser={...userData,nis,role:"siswa"};
await logLogin(currentUser);
if(remember)localStorage.setItem("patlas_session",JSON.stringify({nis,role:"siswa",ts:Date.now()}));
else localStorage.removeItem("patlas_session");
hideLoader();
loadStudentPage();
}
}catch(err){hideLoader();showAlert("loginAlert","Terjadi kesalahan. Coba lagi.");}
};
async function logLogin(user){
try{
const now=new Date();
await addDoc(collection(db,"login_history"),{
nis:user.nis,nama_lengkap:user.nama_lengkap||"",kelas:user.kelas||"",role:user.role||"siswa",
tanggal_login:formatWIB(now),timestamp:Timestamp.fromDate(now),miliseconds:now.getMilliseconds()
});
}catch(e){}
}
async function checkSession(){
const sess=localStorage.getItem("patlas_session");if(!sess)return false;
try{
const s=JSON.parse(sess);
if(!s.nis||!s.role)return false;
if(Date.now()-s.ts>7*24*60*60*1000){localStorage.removeItem("patlas_session");return false;}
showLoader("Memulihkan sesi...");
const userDoc=await getDoc(doc(db,"users",s.nis));
if(!userDoc.exists()){hideLoader();localStorage.removeItem("patlas_session");return false;}
currentUser={...userDoc.data(),nis:s.nis,role:s.role};
hideLoader();
if(s.role==="admin")loadAdminPage();
else if(s.role==="panitia")loadPanitiaPage();
else loadStudentPage();
return true;
}catch(e){hideLoader();localStorage.removeItem("patlas_session");return false;}
}
function buildUserChip(containerId,user){
const el=document.getElementById(containerId);if(!el)return;
const initials=(user.nama_lengkap||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
el.innerHTML=`<div class="user-chip-avatar">${initials}</div><div class="user-chip-info"><div class="user-chip-name">${user.nama_lengkap||user.nis}</div><div class="user-chip-role">${user.kelas||user.role}</div></div>`;
}
function renderAccountInfo(containerId,user){
const el=document.getElementById(containerId);if(!el)return;
const fields=[
{label:"NIS",value:user.nis||"-"},
{label:"Nama Lengkap",value:user.nama_lengkap||"-"},
{label:"Kelas",value:user.kelas||"-"},
{label:"Role",value:user.role||"-"},
];
if(user.no_absen){fields.push({label:"No. Absen",value:user.no_absen});}
let html="";
fields.forEach(f=>{html+=`<div class="account-info-row"><div class="account-info-label">${f.label}</div><div class="account-info-value">${f.value}</div></div>`;});
el.innerHTML=html;
}
function loadStudentPage(){
showPage("studentPage");
buildUserChip("studentUserChip",currentUser);
document.getElementById("studentGreeting").textContent=`Selamat datang, ${currentUser.nama_lengkap}!`;
document.getElementById("studentInfo").textContent=`NIS: ${currentUser.nis} | Kelas: ${currentUser.kelas}`;
renderAccountInfo("studentAccountInfo",currentUser);
loadStudentDashboard();
buildThemeGrid("studentThemeGrid");
}
async function loadStudentDashboard(){
try{
const q=query(collection(db,"nilai"),where("nis","==",currentUser.nis));
const snap=await getDocs(q);
const scores=[];snap.forEach(d=>scores.push(d.data()));
studentScoreCache=scores;
const avg=scores.length?Math.round(scores.reduce((a,b)=>a+(b.nilai||0),0)/scores.length):0;
document.getElementById("studentStats").innerHTML=`
<div class="stat-card"><div class="stat-value">${scores.length}</div><div class="stat-label">Ujian Selesai</div></div>
<div class="stat-card"><div class="stat-value">${avg}</div><div class="stat-label">Rata-rata Nilai</div></div>
<div class="stat-card"><div class="stat-value">${currentUser.kelas}</div><div class="stat-label">Kelas</div></div>
`;
await loadStudentTodaySchedule();
await loadAvailableExams();
await loadStudentScores();
}catch(e){}
}
async function loadStudentTodaySchedule(){
const today=new Date().toISOString().split("T")[0];
const kelasPrefix=currentUser.kelas?currentUser.kelas.split(".")[0]:"X";
try{
const q=query(collection(db,"jadwal"),where("kelas","==",kelasPrefix));
const snap=await getDocs(q);
const container=document.getElementById("todaySchedule");
const todayItems=[];
snap.forEach(d=>{const data=d.data();if(data.tanggal===today)todayItems.push(data);});
if(!todayItems.length){container.innerHTML='<div class="empty-state"><div>Tidak ada ujian hari ini</div></div>';return;}
let html='<div class="schedule-grid">';
todayItems.forEach(data=>{
const jam=String(data.jam).padStart(2,"0");
const mnt=String(data.menit).padStart(2,"0");
html+=`<div class="schedule-item"><div class="schedule-mapel">${data.mapel}</div><div class="schedule-time">${jam}:${mnt} ${data.ampm||""}</div><div class="schedule-class"><span class="badge badge-blue">Kelas ${data.kelas}</span></div></div>`;
});
html+="</div>";
container.innerHTML=html;
}catch(e){}
}
async function loadAvailableExams(){
const kelasPrefix=currentUser.kelas?currentUser.kelas.split(".")[0]:"X";
try{
const q=query(collection(db,"soal"),where("kelas","==",kelasPrefix));
const snap=await getDocs(q);
const container=document.getElementById("availableExams");
if(snap.empty){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9135;</div><div>Belum ada soal tersedia untuk kelas Anda</div></div>';return;}
let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">';
snap.forEach(d=>{
const data=d.data();const docId=d.id;
html+=`<div class="card" style="cursor:pointer" onclick="startExam('${docId}')">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
<div class="badge badge-blue">${data.kelas}</div>
<div class="badge badge-green">${data.jumlah_soal||0} Soal</div>
</div>
<div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:6px">${data.mapel}</div>
<div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">Durasi: ${data.durasi||90} menit</div>
<div style="margin-top:16px"><button class="btn btn-primary" style="width:100%" onclick="event.stopPropagation();startExam('${docId}')">Mulai Ujian</button></div>
</div>`;
});
html+="</div>";
container.innerHTML=html;
}catch(e){}
}
async function loadStudentScores(){
try{
const q=query(collection(db,"nilai"),where("nis","==",currentUser.nis),orderBy("timestamp","desc"));
const snap=await getDocs(q);
studentScoreCache=[];
snap.forEach(d=>studentScoreCache.push(d.data()));
applyStudentScoreFilter();
}catch(e){}
}
window.applyStudentScoreFilter=function(){
const filter=document.getElementById("studentScoreFilter")?.value||"terbaru";
const search=(document.getElementById("studentScoreSearch")?.value||"").toLowerCase();
let data=[...studentScoreCache];
if(search)data=data.filter(d=>(d.mapel||"").toLowerCase().includes(search));
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else if(filter==="nilai_tinggi")data.sort((a,b)=>b.nilai-a.nilai);
else if(filter==="nilai_rendah")data.sort((a,b)=>a.nilai-b.nilai);
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("studentScoreList");
if(!data.length){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9135;</div><div>Belum ada nilai tercatat</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Nilai</th><th>Benar</th><th>Salah</th><th>Waktu</th></tr></thead><tbody>';
data.forEach(d=>{
const sc=d.nilai>=80?"badge-green":d.nilai>=60?"badge-yellow":"badge-red";
html+=`<tr><td>${d.mapel||"-"}</td><td><span class="badge ${sc}">${d.nilai}</span></td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportStudentScores=function(){
const rows=[["Mata Pelajaran","Nilai","Benar","Salah","Waktu"]];
studentScoreCache.forEach(d=>rows.push([d.mapel||"",d.nilai||0,d.benar||0,d.salah||0,d.waktu_selesai||""]));
downloadCSV(rows,"nilai_saya.csv");
};
async function loadStudentRanking(){
const kelas=document.getElementById("rankingKelasFilter")?.value||"";
try{
let q=collection(db,"nilai");
const snap=await getDocs(q);
const nilaiMap={};
snap.forEach(d=>{
const data=d.data();
if(kelas&&(!data.kelas||!data.kelas.startsWith(kelas)))return;
const nis=data.nis;
if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,total:0,count:0};}
nilaiMap[nis].total+=data.nilai||0;
nilaiMap[nis].count++;
});
const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?Math.round(u.total/u.count):0})).sort((a,b)=>b.avg-a.avg).slice(0,10);
renderRankingList("studentRankingList",ranked);
}catch(e){}
}
window.loadStudentRanking=loadStudentRanking;
function renderRankingList(containerId,ranked){
const container=document.getElementById(containerId);if(!container)return;
if(!ranked.length){container.innerHTML='<div class="empty-state"><div>Belum ada data peringkat</div></div>';return;}
let html="";
ranked.forEach((u,i)=>{
const numClass=i===0?"gold":i===1?"silver":i===2?"bronze":"";
html+=`<div class="ranking-item">
<div class="ranking-num ${numClass}">${i+1}</div>
<div class="ranking-info">
<div class="ranking-name">${u.nama}</div>
<div class="ranking-detail">${u.nis} | ${u.kelas} | ${u.count} ujian</div>
</div>
<div class="ranking-score">${u.avg}</div>
</div>`;
});
container.innerHTML=html;
}
window.startExam=async function(soalId){
showLoader("Memuat soal ujian...");
try{
const soalDoc=await getDoc(doc(db,"soal",soalId));
if(!soalDoc.exists()){hideLoader();showToast("Soal tidak ditemukan","error");return;}
const soalData=soalDoc.data();
if(!soalData.soal||!soalData.soal.length){hideLoader();showToast("Soal belum tersedia","error");return;}
const nilaiQ=query(collection(db,"nilai"),where("nis","==",currentUser.nis),where("soal_id","==",soalId));
const nilaiSnap=await getDocs(nilaiQ);
if(!nilaiSnap.empty){hideLoader();showToast("Anda sudah mengerjakan ujian ini","warning");return;}
currentExam={id:soalId,...soalData};
examAnswers={};flaggedQuestions=new Set();currentQuestion=0;violationCount=0;examViolations=[];
hideLoader();
setupExamPage();
setupAntiCheat();
}catch(e){hideLoader();showToast("Gagal memuat ujian","error");}
};
function setupExamPage(){
document.getElementById("examMapelTitle").textContent=currentExam.mapel;
document.getElementById("examStudentInfo").textContent=`${currentUser.nama_lengkap} | ${currentUser.kelas}`;
showPage("examPage");
document.body.classList.add("exam-mode");
renderQuestionNav();
renderQuestion(0);
startExamTimer(currentExam.durasi||90);
if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});
}
function renderQuestionNav(){
const nav=document.getElementById("questionNav");
const soal=currentExam.soal||[];
nav.innerHTML="";
soal.forEach((_,i)=>{
const btn=document.createElement("button");
btn.className="q-num-btn"+(i===currentQuestion?" current":"")+(examAnswers[i]!==undefined?" answered":"")+(flaggedQuestions.has(i)?" flagged":"");
btn.textContent=i+1;
btn.onclick=()=>{currentQuestion=i;renderQuestion(i);renderQuestionNav();};
nav.appendChild(btn);
});
}
function renderQuestion(idx){
const soal=currentExam.soal||[];
if(!soal[idx])return;
const q=soal[idx];
const container=document.getElementById("questionContainer");
const opts=["A","B","C","D"];
let html=`<div class="question-card">
<div class="question-number">Soal ${idx+1} dari ${soal.length}${flaggedQuestions.has(idx)?' <span class="badge badge-yellow">Ditandai</span>':''}</div>
<div class="question-text">${q.pertanyaan}</div>
<div class="options-list">`;
opts.forEach((letter)=>{
if(!q.pilihan||!q.pilihan[letter])return;
const selected=examAnswers[idx]===letter;
html+=`<div class="option-item${selected?" selected":""}" onclick="selectAnswer(${idx},'${letter}')">
<div class="option-letter">${letter}</div>
<div class="option-text">${q.pilihan[letter]}</div>
</div>`;
});
html+=`</div></div>`;
container.innerHTML=html;
const total=soal.length;
const answered=Object.keys(examAnswers).length;
document.getElementById("examProgressFill").style.width=`${(answered/total)*100}%`;
document.getElementById("examProgressText").textContent=`${answered} / ${total} terjawab`;
document.getElementById("prevBtn").disabled=idx===0;
document.getElementById("nextBtn").disabled=idx===total-1;
document.getElementById("flagBtn").textContent=flaggedQuestions.has(idx)?"Hapus Tanda":"Tandai Ragu";
}
window.selectAnswer=function(idx,letter){examAnswers[idx]=letter;renderQuestion(idx);renderQuestionNav();};
window.prevQuestion=function(){if(currentQuestion>0){currentQuestion--;renderQuestion(currentQuestion);renderQuestionNav();}};
window.nextQuestion=function(){const total=(currentExam.soal||[]).length;if(currentQuestion<total-1){currentQuestion++;renderQuestion(currentQuestion);renderQuestionNav();}};
window.toggleFlag=function(){if(flaggedQuestions.has(currentQuestion))flaggedQuestions.delete(currentQuestion);else flaggedQuestions.add(currentQuestion);renderQuestion(currentQuestion);renderQuestionNav();};
function startExamTimer(minutes){
let secs=minutes*60;
if(examTimer)clearInterval(examTimer);
examTimer=setInterval(()=>{
secs--;
const h=Math.floor(secs/3600);const m=Math.floor((secs%3600)/60);const s=secs%60;
const display=`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
const el=document.getElementById("examTimer");
if(el){el.textContent=display;el.className="exam-timer"+(secs<=300?" warning":"")+(secs<=60?" danger":"");}
if(secs<=0){clearInterval(examTimer);submitExam(true);}
},1000);
}
window.submitExam=async function(auto=false){
if(!auto){
const total=(currentExam.soal||[]).length;
const answered=Object.keys(examAnswers).length;
if(answered<total){
const ok=await showConfirm("Kumpulkan Jawaban",`Masih ada ${total-answered} soal belum dijawab. Yakin ingin mengumpulkan?`,"Ya, Kumpulkan","btn-primary","&#128196;");
if(!ok)return;
}
}
if(examTimer)clearInterval(examTimer);
document.body.classList.remove("exam-mode");
removeAntiCheat();
showLoader("Mengirim jawaban...");
try{
const soal=currentExam.soal||[];
let benar=0,salah=0,kosong=0;
soal.forEach((q,i)=>{const ans=examAnswers[i];if(!ans)kosong++;else if(ans===q.kunci)benar++;else salah++;});
const nilai=Math.round((benar/soal.length)*100);
const now=new Date();
await addDoc(collection(db,"nilai"),{
nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,mapel:currentExam.mapel,
soal_id:currentExam.id,nilai,benar,salah,kosong,jawaban:examAnswers,
waktu_selesai:formatWIBShort(now),timestamp:Timestamp.fromDate(now),pelanggaran:violationCount
});
if(violationCount>0){
await addDoc(collection(db,"pelanggaran"),{
nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,mapel:currentExam.mapel,
jenis_pelanggaran:examViolations.join(", "),jumlah:violationCount,timestamp:Timestamp.fromDate(now),
unlocked:false,unlock_reason:""
});
}
hideLoader();
showResult(nilai,benar,salah,kosong);
}catch(e){hideLoader();showToast("Gagal mengirim jawaban","error");}
};
function showResult(nilai,benar,salah,kosong){
document.getElementById("resultMapel").textContent=currentExam.mapel;
document.getElementById("resultStudent").textContent=`${currentUser.nama_lengkap} | ${currentUser.kelas}`;
const scoreEl=document.getElementById("resultScore");
scoreEl.textContent=nilai;
scoreEl.className="result-score"+(nilai>=80?" high":nilai>=60?" mid":" low");
document.getElementById("resultCorrect").textContent=benar;
document.getElementById("resultWrong").textContent=salah;
document.getElementById("resultSkipped").textContent=kosong;
const vEl=document.getElementById("resultViolations");
vEl.innerHTML=violationCount>0?`<div class="alert alert-error">Tercatat ${violationCount} pelanggaran selama ujian: ${examViolations.join(", ")}</div>`:"";
showPage("resultPage");
}
window.goToDashboard=function(){showPage("studentPage");loadStudentDashboard();};
function setupAntiCheat(){
document.addEventListener("visibilitychange",handleVisibilityChange);
document.addEventListener("contextmenu",preventDefault);
document.addEventListener("keydown",preventCheating);
window.addEventListener("blur",handleBlur);
document.addEventListener("fullscreenchange",handleFullscreen);
document.addEventListener("copy",preventDefault);
document.addEventListener("cut",preventDefault);
document.addEventListener("paste",preventDefault);
document.addEventListener("selectstart",preventDefault);
document.addEventListener("dragstart",preventDefault);
}
function removeAntiCheat(){
document.removeEventListener("visibilitychange",handleVisibilityChange);
document.removeEventListener("contextmenu",preventDefault);
document.removeEventListener("keydown",preventCheating);
window.removeEventListener("blur",handleBlur);
document.removeEventListener("fullscreenchange",handleFullscreen);
document.removeEventListener("copy",preventDefault);
document.removeEventListener("cut",preventDefault);
document.removeEventListener("paste",preventDefault);
document.removeEventListener("selectstart",preventDefault);
document.removeEventListener("dragstart",preventDefault);
document.getElementById("fullscreenWarning").classList.remove("show");
}
function preventDefault(e){e.preventDefault();return false;}
let blurTimeout=null;
function handleBlur(){blurTimeout=setTimeout(()=>{recordViolation("Window blur / tab switch");},500);}
function handleVisibilityChange(){if(document.hidden){if(blurTimeout)clearTimeout(blurTimeout);recordViolation("Tab switch");}}
function handleFullscreen(){
if(!document.fullscreenElement){
document.getElementById("fullscreenWarning").classList.add("show");
recordViolation("Exit fullscreen");
setTimeout(()=>{if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});document.getElementById("fullscreenWarning").classList.remove("show");},3000);
}
}
function preventCheating(e){
const blocked=[{ctrl:true,key:"c"},{ctrl:true,key:"v"},{ctrl:true,key:"u"},{ctrl:true,key:"s"},{ctrl:true,key:"a"},{ctrl:true,key:"p"},{ctrl:true,key:"f"},{key:"F12"},{key:"F5"},{key:"PrintScreen"}];
const match=blocked.some(b=>{if(b.ctrl&&!e.ctrlKey)return false;return b.key===e.key||(b.ctrl&&e.ctrlKey&&e.key.toLowerCase()===b.key);});
if(match){e.preventDefault();recordViolation(`Keyboard shortcut: ${e.ctrlKey?"Ctrl+":""}${e.key}`);return false;}
}
function recordViolation(reason){
violationCount++;
if(!examViolations.includes(reason))examViolations.push(reason);
const el=document.getElementById("violationCount");
const msg=document.getElementById("violationMsg");
const warn=document.getElementById("violationWarning");
if(el)el.textContent=violationCount;
if(msg)msg.textContent=reason;
if(warn)warn.classList.remove("hidden");
notifyPanitiaViolation(reason);
}
async function notifyPanitiaViolation(reason){
try{
await addDoc(collection(db,"notifikasi"),{
nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,
mapel:currentExam?.mapel||"-",jenis:reason,timestamp:Timestamp.now(),dibaca:false
});
}catch(e){}
}
window.closeViolationWarning=function(){document.getElementById("violationWarning").classList.add("hidden");};
async function loadPanitiaPage(){
showPage("panitiaPage");
buildUserChip("panitiaUserChip",currentUser);
document.getElementById("panitiaGreeting").textContent=`Selamat datang, ${currentUser.nama_lengkap||currentUser.nis}`;
buildThemeGrid("panitiaThemeGrid");
renderAccountInfo("panitiaAccountInfo",currentUser);
await loadPanitiaDashboard();
await loadSoalList();
await loadJadwalList();
await loadPanitiaNilai();
await loadPanitiaViolations();
await loadPanitiaRanking();
await loadPanitiaHistory();
await loadPanitiaAbsenFilter();
await checkPanitiaNotifications();
if(_notifInterval)clearInterval(_notifInterval);
_notifInterval=setInterval(checkPanitiaNotifications,30000);
}
async function checkPanitiaNotifications(){
try{
const myRoom=await getPanitiaRoom();
const q=query(collection(db,"notifikasi"),where("dibaca","==",false),orderBy("timestamp","desc"),limit(50));
const snap=await getDocs(q);
let notifs=[];
snap.forEach(d=>{notifs.push({id:d.id,...d.data()});});
if(myRoom&&myRoom.ruang){
notifs=notifs.filter(n=>{
const nKelas=n.kelas?n.kelas.split(".")[0]:"";
const roomMatch=myRoom.kelas&&nKelas===myRoom.kelas;
return roomMatch;
});
}
const panel=document.getElementById("notifPanel");
const dot=document.getElementById("notifCount");
if(!panel||!dot)return;
if(notifs.length>0){
dot.style.display="inline-block";
dot.textContent=notifs.length<=9?notifs.length:"9+";
}else{
dot.style.display="none";
}
if(!notifs.length){
panel.innerHTML='<div style="font-size:13px;font-family:var(--font-mono);color:var(--text3);padding:8px 0">Tidak ada notifikasi baru</div>';
return;
}
panel.innerHTML=notifs.map(n=>{
const safeNis=String(n.nis||"").replace(/'/g,"");
const safeName=String(n.nama_lengkap||n.nis||"").replace(/'/g,"").replace(/"/g,"");
const safeId=String(n.id||"").replace(/'/g,"");
return `<div class="notif-item">
<div class="notif-title">${n.nama_lengkap||n.nis||"-"} - Pelanggaran</div>
<div class="notif-body">${n.jenis||"-"} | ${n.mapel||"-"} | ${n.kelas||"-"}</div>
<div class="notif-body">${n.timestamp?formatWIBShort(n.timestamp):"-"}</div>
<button class="unlock-btn" onclick='openUnlockModal("${safeNis}","${safeName}","${safeId}")'>Buka Kunci</button>
</div>`;
}).join("");
}catch(e){}
}
window.toggleNotifPanel=function(){
const panel=document.getElementById("notifPanel");
panel.classList.toggle("open");
if(panel.classList.contains("open"))checkPanitiaNotifications();
document.addEventListener("click",function closeOnOutside(e){
if(!panel.contains(e.target)&&e.target.id!=="notifBtn"&&!e.target.closest("#notifBtn")){
panel.classList.remove("open");
document.removeEventListener("click",closeOnOutside);
}
},{once:false});
};
window.openUnlockModal=function(nis,nama,notifId){
pendingUnlockNis={nis,nama,notifId};
document.getElementById("unlockInfo").textContent=`Membuka kunci untuk siswa: ${nama} (NIS: ${nis})`;
document.getElementById("unlockReason").value="";
document.getElementById("unlockModal").classList.remove("hidden");
};
window.confirmUnlock=async function(){
if(!pendingUnlockNis)return;
const reason=document.getElementById("unlockReason").value.trim();
if(!reason){showToast("Isi alasan terlebih dahulu","error");return;}
showLoader("Memproses...");
try{
const q=query(collection(db,"pelanggaran"),where("nis","==",pendingUnlockNis.nis),where("unlocked","==",false));
const snap=await getDocs(q);
const updates=[];
snap.forEach(d=>updates.push(updateDoc(doc(db,"pelanggaran",d.id),{unlocked:true,unlock_reason:reason,unlocked_by:currentUser.nis,unlocked_at:Timestamp.now()})));
if(pendingUnlockNis.notifId){updates.push(updateDoc(doc(db,"notifikasi",pendingUnlockNis.notifId),{dibaca:true}));}
await Promise.all(updates);
hideLoader();
document.getElementById("unlockModal").classList.add("hidden");
showToast(`Kunci dibuka untuk ${pendingUnlockNis.nama}`,"success");
pendingUnlockNis=null;
await checkPanitiaNotifications();
}catch(e){hideLoader();showToast("Gagal membuka kunci","error");}
};
async function getPanitiaRoom(){
try{
const q=query(collection(db,"jaga_assignment"),where("panitia_nis","==",currentUser.nis));
const snap=await getDocs(q);
if(snap.empty)return null;
let roomData=null;
snap.forEach(d=>{if(!roomData)roomData={id:d.id,...d.data()};});
return roomData;
}catch(e){return null;}
}
async function loadPanitiaDashboard(){
try{
const [soalSnap,nilaiSnap,jadwalSnap]=await Promise.all([getDocs(collection(db,"soal")),getDocs(collection(db,"nilai")),getDocs(collection(db,"jadwal"))]);
document.getElementById("panitiaStats").innerHTML=`
<div class="stat-card"><div class="stat-value">${soalSnap.size}</div><div class="stat-label">Bank Soal</div></div>
<div class="stat-card"><div class="stat-value">${nilaiSnap.size}</div><div class="stat-label">Ujian Selesai</div></div>
<div class="stat-card"><div class="stat-value">${jadwalSnap.size}</div><div class="stat-label">Jadwal Aktif</div></div>
`;
const today=new Date().toISOString().split("T")[0];
let activeHtml="";
jadwalSnap.forEach(d=>{
const data=d.data();
if(data.tanggal===today){
activeHtml+=`<div class="schedule-item"><div class="schedule-mapel">${data.mapel}</div><div class="schedule-time">${String(data.jam).padStart(2,"0")}:${String(data.menit).padStart(2,"0")} ${data.ampm||""}</div><div class="schedule-class"><span class="badge badge-blue">Kelas ${data.kelas}</span></div></div>`;
}
});
document.getElementById("panitiaActiveSchedule").innerHTML=activeHtml?`<div class="schedule-grid">${activeHtml}</div>`:'<div class="empty-state"><div>Tidak ada ujian aktif hari ini</div></div>';
const myRoom=await getPanitiaRoom();
if(myRoom){
document.getElementById("panitiaMyRoom").innerHTML=`<div class="account-info-card">
<div class="account-info-row"><div class="account-info-label">Ruang Jaga</div><div class="account-info-value">${myRoom.ruang}</div></div>
<div class="account-info-row"><div class="account-info-label">Mapel</div><div class="account-info-value">${myRoom.mapel||"-"}</div></div>
<div class="account-info-row"><div class="account-info-label">Target Kelas</div><div class="account-info-value">${myRoom.kelas||"-"}</div></div>
</div>`;
}else{
document.getElementById("panitiaMyRoom").innerHTML='<div class="empty-state"><div>Belum ada jadwal jaga ditetapkan oleh admin</div></div>';
}
}catch(e){}
}
async function loadSoalList(){
try{
const snap=await getDocs(collection(db,"soal"));
const container=document.getElementById("soalList");
if(snap.empty){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9135;</div><div>Belum ada soal. Klik + Tambah Soal ke Jadwal untuk mulai.</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Jumlah Soal</th><th>Durasi</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>';
snap.forEach(d=>{
const data=d.data();
html+=`<tr><td><strong>${data.mapel||"-"}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td><span class="badge badge-green">${data.jumlah_soal||0}</span></td><td>${data.durasi||90} menit</td><td style="font-size:11px;color:var(--text3)">${data.timestamp?formatWIBShort(data.timestamp):"-"}</td><td><button class="btn btn-danger btn-sm" onclick="deleteSoal('${d.id}')">Hapus</button></td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
}catch(e){}
}
window.openSoalModal=async function(){
document.getElementById("soalImport").value="";
const select=document.getElementById("soalJadwalSelect");
select.innerHTML='<option value="">Memuat jadwal...</option>';
try{
const snap=await getDocs(collection(db,"jadwal"));
select.innerHTML='<option value="">Pilih jadwal...</option>';
snap.forEach(d=>{
const data=d.data();
const jam=String(data.jam).padStart(2,"0");
const mnt=String(data.menit).padStart(2,"0");
const opt=document.createElement("option");
opt.value=d.id;
opt.textContent=`${data.mapel} - Kelas ${data.kelas} | ${jam}:${mnt} ${data.ampm||""} | ${data.tanggal||""}`;
opt.dataset.mapel=data.mapel;
opt.dataset.kelas=data.kelas;
opt.dataset.durasi=data.durasi||90;
select.appendChild(opt);
});
}catch(e){}
const promptEl=document.getElementById("aiPromptText");
promptEl.textContent=`Buatkan soal ujian sebanyak 20 soal pilihan ganda (A, B, C, D) dengan format berikut:\n\n1.[Pertanyaan]\nA. [Pilihan A]\nB. [Pilihan B]\nC. [Pilihan C]\nD. [Pilihan D]\nKUNCI:[Huruf jawaban benar]\n\n2.[Pertanyaan]\n... dst. Berikan hanya teks soal tanpa komentar atau teks tambahan.`;
document.getElementById("soalModal").classList.remove("hidden");
};
window.copyAiPrompt=function(){
const text=document.getElementById("aiPromptText").textContent;
navigator.clipboard.writeText(text).then(()=>showToast("Prompt disalin!","success")).catch(()=>showToast("Gagal menyalin","error"));
};
function parseSoalText(text){
const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
const soal=[];let current=null;
for(const line of lines){
const qMatch=line.match(/^(\d+)\.(.*)/);
const aMatch=line.match(/^A\.(.*)/i);
const bMatch=line.match(/^B\.(.*)/i);
const cMatch=line.match(/^C\.(.*)/i);
const dMatch=line.match(/^D\.(.*)/i);
const kMatch=line.match(/^KUNCI:([A-D])/i);
if(qMatch){if(current)soal.push(current);current={pertanyaan:qMatch[2].trim(),pilihan:{A:"",B:"",C:"",D:""},kunci:""};}
else if(aMatch&&current)current.pilihan.A=aMatch[1].trim();
else if(bMatch&&current)current.pilihan.B=bMatch[1].trim();
else if(cMatch&&current)current.pilihan.C=cMatch[1].trim();
else if(dMatch&&current)current.pilihan.D=dMatch[1].trim();
else if(kMatch&&current)current.kunci=kMatch[1].toUpperCase();
}
if(current)soal.push(current);
return soal;
}
window.saveSoal=async function(){
const select=document.getElementById("soalJadwalSelect");
const jadwalId=select.value;
if(!jadwalId){showToast("Pilih jadwal ujian terlebih dahulu","error");return;}
const selectedOpt=select.options[select.selectedIndex];
const mapel=selectedOpt.dataset.mapel;
const kelas=selectedOpt.dataset.kelas;
const durasi=parseInt(selectedOpt.dataset.durasi)||90;
const importText=document.getElementById("soalImport").value.trim();
if(!importText){showToast("Import soal tidak boleh kosong","error");return;}
const soalArr=parseSoalText(importText);
if(!soalArr.length){showToast("Format soal tidak valid","error");return;}
showLoader("Menyimpan soal...");
try{
await addDoc(collection(db,"soal"),{mapel,kelas,durasi,soal:soalArr,jumlah_soal:soalArr.length,jadwal_id:jadwalId,created_by:currentUser.nis,timestamp:Timestamp.now()});
hideLoader();
document.getElementById("soalModal").classList.add("hidden");
showToast(`${soalArr.length} soal berhasil disimpan!`,"success");
await loadSoalList();
await loadPanitiaDashboard();
}catch(e){hideLoader();showToast("Gagal menyimpan soal","error");}
};
window.deleteSoal=async function(id){
const ok=await showConfirm("Hapus Soal","Hapus soal ini? Tindakan tidak dapat dibatalkan.","Ya, Hapus","btn-danger","&#128465;");
if(!ok)return;
showLoader("Menghapus...");
try{await deleteDoc(doc(db,"soal",id));hideLoader();showToast("Soal dihapus","success");await loadSoalList();}
catch(e){hideLoader();showToast("Gagal menghapus","error");}
};
async function loadJadwalList(){
try{
const snap=await getDocs(collection(db,"jadwal"));
const container=document.getElementById("jadwalList");
if(snap.empty){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9135;</div><div>Belum ada jadwal ujian</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th><th>Tanggal</th><th>Jam</th><th>Durasi</th><th>Aksi</th></tr></thead><tbody>';
snap.forEach(d=>{
const data=d.data();
const jam=String(data.jam).padStart(2,"0");
const mnt=String(data.menit).padStart(2,"0");
html+=`<tr><td><strong>${data.mapel}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td><span class="badge badge-purple">Ruang ${data.ruang||"-"}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td>${data.durasi||90} mnt</td><td><button class="btn btn-danger btn-sm" onclick="deleteJadwal('${d.id}')">Hapus</button></td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
}catch(e){}
}
window.openJadwalModal=function(){
document.getElementById("jadwalMapel").value="";
const today=new Date().toISOString().split("T")[0];
document.getElementById("jadwalTanggal").value=today;
document.getElementById("jadwalModal").classList.remove("hidden");
};
window.saveJadwal=async function(){
const mapel=document.getElementById("jadwalMapel").value.trim();
const kelas=document.getElementById("jadwalKelas").value;
const ruang=parseInt(document.getElementById("jadwalRuang").value)||1;
const tanggal=document.getElementById("jadwalTanggal").value;
const jam=parseInt(document.getElementById("jadwalJam").value)||8;
const menit=parseInt(document.getElementById("jadwalMenit").value)||0;
const ampm=document.getElementById("jadwalAmPm").value;
const durasi=parseInt(document.getElementById("jadwalDurasi").value)||90;
if(!mapel){showToast("Mata pelajaran wajib diisi","error");return;}
if(!tanggal){showToast("Tanggal wajib diisi","error");return;}
if(!ruang||ruang<1){showToast("Nomor ruang tidak valid","error");return;}
showLoader("Menyimpan jadwal...");
try{
await addDoc(collection(db,"jadwal"),{mapel,kelas,ruang,tanggal,jam,menit,ampm,durasi,created_by:currentUser.nis,timestamp:Timestamp.now()});
hideLoader();
document.getElementById("jadwalModal").classList.add("hidden");
showToast(`Jadwal Ruang ${ruang} berhasil disimpan`,"success");
await loadJadwalList();
await loadPanitiaDashboard();
}catch(e){hideLoader();showToast("Gagal menyimpan jadwal","error");}
};
window.deleteJadwal=async function(id){
const ok=await showConfirm("Hapus Jadwal","Hapus jadwal ini? Tindakan tidak dapat dibatalkan.","Ya, Hapus","btn-danger","&#128465;");
if(!ok)return;
showLoader("Menghapus...");
try{await deleteDoc(doc(db,"jadwal",id));hideLoader();showToast("Jadwal dihapus","success");await loadJadwalList();}
catch(e){hideLoader();showToast("Gagal menghapus","error");}
};
async function loadPanitiaNilai(){
const myRoom=await getPanitiaRoom();
const myRuang=myRoom?myRoom.ruang:null;
const myKelas=myRoom?myRoom.kelas:null;
const now=new Date();
const nowHour=now.getHours();
const isActiveTime=(nowHour>=6&&nowHour<=20);
try{
if(myRuang&&!isActiveTime){
document.getElementById("nilaiList").innerHTML='<div class="alert alert-warning">Nilai hanya dapat dilihat selama jam aktif ujian (06:00 - 20:00 WIB).</div>';
return;
}
const snap=await getDocs(query(collection(db,"nilai"),orderBy("timestamp","desc")));
let allNilai=[];
snap.forEach(d=>allNilai.push(d.data()));
if(myKelas){
allNilai=allNilai.filter(d=>d.kelas&&d.kelas.startsWith(myKelas));
document.getElementById("panitiaRoomLabel").textContent=`Nilai siswa kelas ${myKelas} — Ruang ${myRuang||"-"}`;
}
panitiaNilaiCache=allNilai;
applyPanitiaNilaiFilter();
}catch(e){}
}
window.applyPanitiaNilaiFilter=function(){
const filter=document.getElementById("panitiaNilaiFilter")?.value||"terbaru";
const search=(document.getElementById("panitiaNilaiSearch")?.value||"").toLowerCase();
let data=[...panitiaNilaiCache];
if(search)data=data.filter(d=>(d.nama_lengkap||"").toLowerCase().includes(search)||(d.nis||"").includes(search));
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else if(filter==="nilai_tinggi")data.sort((a,b)=>b.nilai-a.nilai);
else if(filter==="nilai_rendah")data.sort((a,b)=>a.nilai-b.nilai);
else if(filter==="kelas")data.sort((a,b)=>(a.kelas||"").localeCompare(b.kelas||""));
else if(filter==="nama")data.sort((a,b)=>(a.nama_lengkap||"").localeCompare(b.nama_lengkap||""));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("nilaiList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Belum ada data nilai</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Mapel</th><th>Nilai</th><th>Pelanggaran</th><th>Waktu</th></tr></thead><tbody>';
data.forEach(d=>{
const sc=d.nilai>=80?"badge-green":d.nilai>=60?"badge-yellow":"badge-red";
html+=`<tr><td>${d.nama_lengkap}</td><td>${d.nis}</td><td>${d.kelas}</td><td>${d.mapel}</td><td><span class="badge ${sc}">${d.nilai}</span></td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportPanitiaNilai=function(){
const rows=[["Nama","NIS","Kelas","Mapel","Nilai","Pelanggaran","Waktu"]];
panitiaNilaiCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.kelas||"",d.mapel||"",d.nilai||0,d.pelanggaran||0,d.waktu_selesai||""]));
downloadCSV(rows,"nilai_panitia.csv");
};
async function loadPanitiaViolations(){
const myRoom=await getPanitiaRoom();
const myKelas=myRoom?myRoom.kelas:null;
try{
let q=query(collection(db,"pelanggaran"),orderBy("timestamp","desc"));
const snap=await getDocs(q);
panitiaViolationsCache=[];
snap.forEach(d=>{
const data={id:d.id,...d.data()};
if(!myKelas||!data.kelas||(data.kelas.startsWith(myKelas)))panitiaViolationsCache.push(data);
});
applyPanitiaViolFilter();
}catch(e){}
}
window.applyPanitiaViolFilter=function(){
const filter=document.getElementById("panitiaViolFilter")?.value||"terbaru";
let data=[...panitiaViolationsCache];
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else if(filter==="jumlah")data.sort((a,b)=>(b.jumlah||0)-(a.jumlah||0));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("panitiaViolList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Tidak ada pelanggaran di ruang jaga Anda</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Mapel</th><th>Jenis Pelanggaran</th><th>Jumlah</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead><tbody>';
data.forEach(d=>{
const statusBadge=d.unlocked?`<span class="badge badge-green">Dibuka</span>`:`<span class="badge badge-red">Terkunci</span>`;
const actionBtn=!d.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none" onclick="openUnlockModal('${d.nis}','${d.nama_lengkap||d.nis}','')">Buka</button>`:`<span style="font-size:11px;color:var(--text3)">${d.unlock_reason||"-"}</span>`;
html+=`<tr><td>${d.nama_lengkap||"-"}</td><td>${d.nis||"-"}</td><td>${d.mapel||"-"}</td><td><span class="violation-badge">${d.jenis_pelanggaran||"-"}</span></td><td><span class="badge badge-red">${d.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${d.timestamp?formatWIBShort(d.timestamp):"-"}</td><td>${actionBtn}</td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportPanitiaViolations=function(){
const rows=[["Nama","NIS","Mapel","Jenis","Jumlah","Status","Alasan","Waktu"]];
panitiaViolationsCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.mapel||"",d.jenis_pelanggaran||"",d.jumlah||0,d.unlocked?"Dibuka":"Terkunci",d.unlock_reason||"",d.timestamp?formatWIBShort(d.timestamp):""]));
downloadCSV(rows,"pelanggaran_panitia.csv");
};
async function loadPanitiaRanking(){
const kelas=document.getElementById("panitiaRankKelas")?.value||"";
try{
const snap=await getDocs(collection(db,"nilai"));
const nilaiMap={};
snap.forEach(d=>{
const data=d.data();
if(kelas&&(!data.kelas||!data.kelas.startsWith(kelas)))return;
const nis=data.nis;
if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,total:0,count:0};}
nilaiMap[nis].total+=data.nilai||0;
nilaiMap[nis].count++;
});
const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?Math.round(u.total/u.count):0})).sort((a,b)=>b.avg-a.avg).slice(0,10);
renderRankingList("panitiaRankList",ranked);
}catch(e){}
}
window.loadPanitiaRanking=loadPanitiaRanking;
async function loadPanitiaHistory(){
try{
const q=query(collection(db,"login_history"),where("role","==","panitia"),orderBy("timestamp","desc"),limit(100));
const snap=await getDocs(q);
panitiaHistoryCache=[];
snap.forEach(d=>panitiaHistoryCache.push(d.data()));
applyPanitiaHistFilter();
}catch(e){}
}
window.applyPanitiaHistFilter=function(){
const filter=document.getElementById("panitiaHistFilter")?.value||"terbaru";
let data=[...panitiaHistoryCache];
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("panitiaHistoryList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Belum ada riwayat login panitia</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Waktu Login (WIB)</th></tr></thead><tbody>';
data.forEach(d=>{html+=`<tr><td>${d.nama_lengkap}</td><td>${d.nis}</td><td style="font-family:var(--font-mono);font-size:11px">${d.tanggal_login||"-"}</td></tr>`;});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportPanitiaHistory=function(){
const rows=[["Nama","NIS","Waktu Login"]];
panitiaHistoryCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.tanggal_login||""]));
downloadCSV(rows,"riwayat_login_panitia.csv");
};
async function loadPanitiaAbsenFilter(){
const select=document.getElementById("absenJadwalFilter");
if(!select)return;
try{
const snap=await getDocs(collection(db,"jadwal"));
snap.forEach(d=>{
const data=d.data();
const opt=document.createElement("option");
opt.value=d.id;
opt.textContent=`${data.mapel} - Kelas ${data.kelas} | ${data.tanggal||"-"}`;
opt.dataset.kelas=data.kelas;
select.appendChild(opt);
});
}catch(e){}
}
window.loadAbsenDetection=async function(){
const select=document.getElementById("absenJadwalFilter");
const jadwalId=select.value;
if(!jadwalId){document.getElementById("absenList").innerHTML='<div class="empty-state"><div>Pilih jadwal ujian</div></div>';return;}
const selectedOpt=select.options[select.selectedIndex];
const kelasTarget=selectedOpt.dataset.kelas;
showLoader("Mengecek kehadiran...");
try{
const [usersSnap,nilaiSnap]=await Promise.all([
getDocs(query(collection(db,"users"),where("role","==","siswa"))),
getDocs(query(collection(db,"nilai"),where("soal_id","!=","dummy")))
]);
const allStudents=[];
usersSnap.forEach(d=>{const data=d.data();if(data.kelas&&data.kelas.startsWith(kelasTarget))allStudents.push({nis:d.id,...data});});
const worked=new Set();
nilaiSnap.forEach(d=>{const data=d.data();worked.add(data.nis);});
const absent=allStudents.filter(s=>!worked.has(s.nis));
hideLoader();
const container=document.getElementById("absenList");
if(!absent.length){container.innerHTML='<div class="alert alert-success">Semua siswa sudah mengerjakan ujian ini.</div>';return;}
let html=`<div class="alert alert-warning">${absent.length} siswa belum mengerjakan ujian ini.</div>`;
html+='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Status</th></tr></thead><tbody>';
absent.forEach(s=>{html+=`<tr><td>${s.nama_lengkap||"-"}</td><td>${s.nis}</td><td>${s.kelas||"-"}</td><td><span class="absent-badge">Belum Hadir</span></td></tr>`;});
html+="</tbody></table></div>";
container.innerHTML=html;
}catch(e){hideLoader();showToast("Gagal memuat data","error");}
};
async function loadAdminPage(){
showPage("adminPage");
buildUserChip("adminUserChip",currentUser);
document.getElementById("adminGreeting").textContent=`Login sebagai ${currentUser.nama_lengkap||currentUser.nis}`;
buildThemeGrid("adminThemeGrid");
renderAccountInfo("adminAccountInfo",currentUser);
await loadAdminDashboard();
await loadAdminJadwalJaga();
await loadBackupList();
}
async function loadAdminDashboard(){
try{
const [usersSnap,nilaiSnap,violSnap,histSnap]=await Promise.all([
getDocs(collection(db,"users")),getDocs(collection(db,"nilai")),
getDocs(collection(db,"pelanggaran")),getDocs(query(collection(db,"login_history"),orderBy("timestamp","desc"),limit(50)))
]);
const users=[];usersSnap.forEach(d=>users.push({id:d.id,...d.data()}));
allUsersCache=users;
const nilaiArr=[];nilaiSnap.forEach(d=>nilaiArr.push(d.data()));
allNilaiCache=nilaiArr;
const siswaCount=users.filter(u=>u.role==="siswa").length;
document.getElementById("adminStats").innerHTML=`
<div class="stat-card"><div class="stat-value">${users.length}</div><div class="stat-label">Total Akun</div></div>
<div class="stat-card"><div class="stat-value">${siswaCount}</div><div class="stat-label">Siswa Terdaftar</div></div>
<div class="stat-card"><div class="stat-value">${nilaiArr.length}</div><div class="stat-label">Ujian Selesai</div></div>
<div class="stat-card"><div class="stat-value">${violSnap.size}</div><div class="stat-label">Pelanggaran</div></div>
`;
const recent=users.slice(-5).reverse();
let recHtml="";
recent.forEach(u=>{recHtml+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:13px;font-weight:600">${u.nama_lengkap||u.id}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${u.id} | ${u.kelas}</div></div><span class="badge badge-blue">${u.role}</span></div>`;});
document.getElementById("recentUsers").innerHTML=recHtml||'<div class="empty-state"><div>Tidak ada data</div></div>';
let logHtml="";let cnt=0;
histSnap.forEach(d=>{if(cnt>=5)return;cnt++;const data=d.data();logHtml+=`<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:13px;font-weight:600">${data.nama_lengkap}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${data.tanggal_login||"-"}</div></div>`;});
document.getElementById("recentLogins").innerHTML=logHtml||'<div class="empty-state"><div>Belum ada log</div></div>';
await loadAdminUserList();
await loadAdminNilai();
await loadViolations();
await loadAdminHistory();
await loadAdminRanking();
}catch(e){}
}
async function loadAdminJadwalJaga(){
try{
const [jadwalSnap,jagaSnap,panitiaSnap]=await Promise.all([
getDocs(collection(db,"jadwal")),
getDocs(collection(db,"jaga_assignment")),
getDocs(query(collection(db,"users"),where("role","==","panitia")))
]);
const jagaMap={};
jagaSnap.forEach(d=>{const data=d.data();const key=data.jadwal_id;if(!jagaMap[key])jagaMap[key]=[];jagaMap[key].push({id:d.id,...data});});
const container=document.getElementById("adminJadwalJagaList");
if(jadwalSnap.empty){container.innerHTML='<div class="empty-state"><div>Belum ada jadwal. Panitia harus membuat jadwal terlebih dahulu.</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Tanggal</th><th>Jam</th><th>Ruang Jaga</th><th>Panitia</th><th>Aksi</th></tr></thead><tbody>';
jadwalSnap.forEach(d=>{
const data=d.data();
const assignments=jagaMap[d.id]||[];
const jam=String(data.jam).padStart(2,"0");
const mnt=String(data.menit).padStart(2,"0");
let jagaHtml="";
if(assignments.length){
jagaHtml=assignments.map(a=>`<span class="badge badge-purple" style="margin-right:4px">Ruang ${a.ruang}: ${a.panitia_nama||a.panitia_nis}</span>`).join(" ");
}else{
jagaHtml='<span style="color:var(--text3);font-size:12px">Belum diatur</span>';
}
html+=`<tr><td><strong>${data.mapel}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td>${jagaHtml}</td><td></td><td><button class="btn btn-primary btn-sm" onclick="openAssignJagaModal('${d.id}','${data.mapel}','${data.kelas}')">+ Panitia</button></td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
}catch(e){}
}
window.openAssignJagaModal=async function(jadwalId,mapel,kelas){
currentAssignJadwalId={jadwalId,mapel,kelas};
document.getElementById("assignJagaTitle").textContent=`Atur Panitia Jaga - ${mapel} (${kelas})`;
document.getElementById("jagaRuang").value="";
const select=document.getElementById("jagaPanitia");
select.innerHTML='<option value="">Pilih panitia...</option>';
try{
const snap=await getDocs(query(collection(db,"users"),where("role","==","panitia")));
snap.forEach(d=>{
const data=d.data();
const opt=document.createElement("option");
opt.value=d.id;
opt.dataset.nama=data.nama_lengkap||d.id;
opt.textContent=`${data.nama_lengkap||d.id} (${d.id})`;
select.appendChild(opt);
});
}catch(e){}
document.getElementById("assignJagaModal").classList.remove("hidden");
};
window.saveJagaAssignment=async function(){
if(!currentAssignJadwalId)return;
const ruang=document.getElementById("jagaRuang").value;
const panitiaSelect=document.getElementById("jagaPanitia");
const panitia_nis=panitiaSelect.value;
const panitia_nama=panitiaSelect.options[panitiaSelect.selectedIndex]?.dataset?.nama||panitia_nis;
if(!ruang||!panitia_nis){showToast("Isi ruang dan pilih panitia","error");return;}
showLoader("Menyimpan...");
try{
const existing=query(collection(db,"jaga_assignment"),where("jadwal_id","==",currentAssignJadwalId.jadwalId),where("ruang","==",parseInt(ruang)));
const existSnap=await getDocs(existing);
const updates=[];existSnap.forEach(d=>updates.push(deleteDoc(doc(db,"jaga_assignment",d.id))));
await Promise.all(updates);
await addDoc(collection(db,"jaga_assignment"),{
jadwal_id:currentAssignJadwalId.jadwalId,mapel:currentAssignJadwalId.mapel,kelas:currentAssignJadwalId.kelas,
ruang:parseInt(ruang),panitia_nis,panitia_nama,assigned_by:currentUser.nis,timestamp:Timestamp.now()
});
hideLoader();
document.getElementById("assignJagaModal").classList.add("hidden");
showToast(`Panitia ${panitia_nama} ditetapkan di Ruang ${ruang}`,"success");
await loadAdminJadwalJaga();
}catch(e){hideLoader();showToast("Gagal menyimpan","error");}
};
async function loadAdminUserList(){
try{
const snap=await getDocs(collection(db,"users"));
const users=[];snap.forEach(d=>users.push({id:d.id,...d.data()}));
allUsersCache=users;
filterUsers();
}catch(e){}
}
window.filterUsers=function(){
const q=(document.getElementById("userSearchInput")?.value||"").toLowerCase();
const roleF=document.getElementById("userRoleFilter")?.value||"";
const sortF=document.getElementById("userSortFilter")?.value||"nama";
let filtered=allUsersCache.filter(u=>{
const matchQ=(u.id||"").includes(q)||(u.nama_lengkap||"").toLowerCase().includes(q);
const matchRole=!roleF||u.role===roleF;
return matchQ&&matchRole;
});
if(sortF==="nis")filtered.sort((a,b)=>a.id.localeCompare(b.id));
else if(sortF==="kelas")filtered.sort((a,b)=>(a.kelas||"").localeCompare(b.kelas||""));
else filtered.sort((a,b)=>(a.nama_lengkap||"").localeCompare(b.nama_lengkap||""));
renderUserTable(filtered);
};
function renderUserTable(users){
const container=document.getElementById("userList");
if(!users.length){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9135;</div><div>Belum ada akun terdaftar</div></div>';return;}
const roleBadge=r=>r==="admin"?"badge-red":r==="panitia"?"badge-purple":"badge-blue";
let html='<div class="table-wrap"><table><thead><tr><th>NIS</th><th>Nama Lengkap</th><th>Kelas</th><th>Role</th><th>Aksi</th></tr></thead><tbody>';
users.forEach(u=>{
const canDelete=u.id!==ADMIN_NIS;
html+=`<tr><td><span class="badge badge-green" style="font-size:11px">${u.id}</span></td><td>${u.nama_lengkap||"-"}</td><td>${u.kelas||"-"}</td><td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td><td>${canDelete?`<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Hapus</button> `:""}  <button class="btn btn-secondary btn-sm" onclick="resetUserPassword('${u.id}')">Reset Pwd</button></td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
}
let currentCreateRole="siswa";
window.openCreateUserModal=function(role){
currentCreateRole=role;
document.getElementById("createUserTitle").textContent=`Buat Akun ${role.charAt(0).toUpperCase()+role.slice(1)}`;
document.getElementById("newUserNis").value="";
document.getElementById("newUserName").value="";
document.getElementById("newUserKelasGroup").style.display=role==="siswa"?"block":"none";
document.getElementById("newUserNoAbsenGroup").style.display=role==="siswa"?"block":"none";
hideAlert("createUserAlert");
document.getElementById("createUserModal").classList.remove("hidden");
};
window.createUser=async function(){
const nis=document.getElementById("newUserNis").value.trim();
const nama=document.getElementById("newUserName").value.trim();
const kelas=document.getElementById("newUserKelas").value;
const noAbsen=document.getElementById("newUserNoAbsen").value;
if(!nis||!nama){showAlert("createUserAlert","NIS dan nama wajib diisi.");return;}
document.getElementById("createUserBtn").disabled=true;
showLoader("Membuat akun...");
try{
const existing=await getDoc(doc(db,"users",nis));
if(existing.exists()){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","NIS sudah terdaftar.");return;}
const hashedPwd=await hashPassword(DEFAULT_PASSWORD);
const userData={nama_lengkap:nama,kelas:currentCreateRole==="siswa"?kelas:currentCreateRole,role:currentCreateRole,password:hashedPwd,created_at:Timestamp.now()};
if(currentCreateRole==="siswa"&&noAbsen)userData.no_absen=parseInt(noAbsen)||0;
await setDoc(doc(db,"users",nis),userData);
hideLoader();
document.getElementById("createUserBtn").disabled=false;
document.getElementById("createUserModal").classList.add("hidden");
showToast(`Akun ${currentCreateRole} berhasil dibuat. Password: ${DEFAULT_PASSWORD}`,"success");
await loadAdminUserList();
await loadAdminDashboard();
}catch(e){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","Gagal membuat akun. Coba lagi.");}
};
window.deleteUser=async function(nis){
if(nis===ADMIN_NIS){showToast("Tidak dapat menghapus akun admin utama","error");return;}
const ok=await showConfirm("Hapus Akun",`Hapus akun NIS ${nis}? Tindakan ini tidak dapat dibatalkan.`,"Ya, Hapus","btn-danger","&#128465;");
if(!ok)return;
showLoader("Menghapus akun...");
try{await deleteDoc(doc(db,"users",nis));hideLoader();showToast("Akun berhasil dihapus","success");await loadAdminUserList();}
catch(e){hideLoader();showToast("Gagal menghapus akun","error");}
};
window.resetUserPassword=async function(nis){
const ok=await showConfirm("Reset Password",`Reset password NIS ${nis} ke ${DEFAULT_PASSWORD}?`,"Ya, Reset","btn-primary","&#128274;");
if(!ok)return;
showLoader("Mereset password...");
try{
const hashed=await hashPassword(DEFAULT_PASSWORD);
await updateDoc(doc(db,"users",nis),{password:hashed});
hideLoader();showToast(`Password direset ke ${DEFAULT_PASSWORD}`,"success");
}catch(e){hideLoader();showToast("Gagal mereset password","error");}
};
async function loadAdminNilai(){
try{
const q=query(collection(db,"nilai"),orderBy("timestamp","desc"));
const snap=await getDocs(q);
allNilaiCache=[];
snap.forEach(d=>allNilaiCache.push(d.data()));
applyAdminNilaiFilter();
}catch(e){}
}
window.applyAdminNilaiFilter=function(){
const filter=document.getElementById("adminNilaiFilter")?.value||"terbaru";
const kelas=document.getElementById("adminNilaiKelasFilter")?.value||"";
const search=(document.getElementById("adminNilaiSearch")?.value||"").toLowerCase();
let data=[...allNilaiCache];
if(kelas)data=data.filter(d=>d.kelas&&d.kelas.startsWith(kelas));
if(search)data=data.filter(d=>(d.nama_lengkap||"").toLowerCase().includes(search)||(d.nis||"").includes(search)||(d.mapel||"").toLowerCase().includes(search));
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else if(filter==="nilai_tinggi")data.sort((a,b)=>b.nilai-a.nilai);
else if(filter==="nilai_rendah")data.sort((a,b)=>a.nilai-b.nilai);
else if(filter==="kelas")data.sort((a,b)=>(a.kelas||"").localeCompare(b.kelas||""));
else if(filter==="nama")data.sort((a,b)=>(a.nama_lengkap||"").localeCompare(b.nama_lengkap||""));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("adminNilaiList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Belum ada data nilai</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Mapel</th><th>Nilai</th><th>Benar</th><th>Salah</th><th>Pelanggaran</th><th>Waktu</th></tr></thead><tbody>';
data.forEach(d=>{
const sc=d.nilai>=80?"badge-green":d.nilai>=60?"badge-yellow":"badge-red";
html+=`<tr><td>${d.nama_lengkap||"-"}</td><td>${d.nis||"-"}</td><td>${d.kelas||"-"}</td><td>${d.mapel||"-"}</td><td><span class="badge ${sc}">${d.nilai}</span></td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportAllNilai=function(){
const rows=[["Nama","NIS","Kelas","Mapel","Nilai","Benar","Salah","Pelanggaran","Waktu"]];
allNilaiCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.kelas||"",d.mapel||"",d.nilai||0,d.benar||0,d.salah||0,d.pelanggaran||0,d.waktu_selesai||""]));
downloadCSV(rows,"nilai_patlas.csv");
};
async function loadViolations(){
try{
const q=query(collection(db,"pelanggaran"),orderBy("timestamp","desc"));
const snap=await getDocs(q);
allViolationsCache=[];
snap.forEach(d=>allViolationsCache.push({id:d.id,...d.data()}));
applyAdminViolFilter();
}catch(e){}
}
window.applyAdminViolFilter=function(){
const filter=document.getElementById("adminViolFilter")?.value||"terbaru";
const search=(document.getElementById("adminViolSearch")?.value||"").toLowerCase();
let data=[...allViolationsCache];
if(search)data=data.filter(d=>(d.nama_lengkap||"").toLowerCase().includes(search)||(d.nis||"").includes(search));
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else if(filter==="jumlah")data.sort((a,b)=>(b.jumlah||0)-(a.jumlah||0));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("violationList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Tidak ada pelanggaran tercatat</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Mapel</th><th>Jenis Pelanggaran</th><th>Jumlah</th><th>Status</th><th>Alasan Buka</th><th>Waktu</th></tr></thead><tbody>';
data.forEach(d=>{
const statusBadge=d.unlocked?`<span class="badge badge-green">Dibuka</span>`:`<span class="badge badge-red">Terkunci</span>`;
html+=`<tr><td>${d.nama_lengkap||"-"}</td><td>${d.nis||"-"}</td><td>${d.mapel||"-"}</td><td><span class="violation-badge">${d.jenis_pelanggaran||"-"}</span></td><td><span class="badge badge-red">${d.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${d.unlock_reason||"-"}</td><td style="font-size:11px;color:var(--text3)">${d.timestamp?formatWIBShort(d.timestamp):"-"}</td></tr>`;
});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportAllViolations=function(){
const rows=[["Nama","NIS","Mapel","Jenis","Jumlah","Status","Alasan","Waktu"]];
allViolationsCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.mapel||"",d.jenis_pelanggaran||"",d.jumlah||0,d.unlocked?"Dibuka":"Terkunci",d.unlock_reason||"",d.timestamp?formatWIBShort(d.timestamp):""]));
downloadCSV(rows,"pelanggaran_admin.csv");
};
async function loadAdminRanking(){
const kelas=document.getElementById("adminRankKelas")?.value||"";
try{
const snap=await getDocs(collection(db,"nilai"));
const nilaiMap={};
snap.forEach(d=>{
const data=d.data();
if(kelas&&(!data.kelas||!data.kelas.startsWith(kelas)))return;
const nis=data.nis;
if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,total:0,count:0};}
nilaiMap[nis].total+=data.nilai||0;
nilaiMap[nis].count++;
});
const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?Math.round(u.total/u.count):0})).sort((a,b)=>b.avg-a.avg).slice(0,10);
renderRankingList("adminRankList",ranked);
}catch(e){}
}
window.loadAdminRanking=loadAdminRanking;
async function loadAdminHistory(){
try{
const q=query(collection(db,"login_history"),orderBy("timestamp","desc"),limit(200));
const snap=await getDocs(q);
allHistoryCache=[];
snap.forEach(d=>allHistoryCache.push(d.data()));
applyAdminHistFilter();
}catch(e){}
}
window.applyAdminHistFilter=function(){
const filter=document.getElementById("adminHistFilter")?.value||"terbaru";
const roleF=document.getElementById("adminHistRole")?.value||"";
let data=[...allHistoryCache];
if(roleF)data=data.filter(d=>d.role===roleF);
if(filter==="terlama")data.sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
else data.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
const container=document.getElementById("adminHistoryList");
if(!data.length){container.innerHTML='<div class="empty-state"><div>Belum ada riwayat login</div></div>';return;}
let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Role</th><th>Waktu Login (WIB)</th></tr></thead><tbody>';
data.forEach(d=>{html+=`<tr><td>${d.nama_lengkap||"-"}</td><td>${d.nis||"-"}</td><td>${d.kelas||"-"}</td><td><span class="badge ${d.role==="admin"?"badge-red":d.role==="panitia"?"badge-purple":"badge-blue"}">${d.role}</span></td><td style="font-size:11px;color:var(--text3)">${d.tanggal_login||"-"}</td></tr>`;});
html+="</tbody></table></div>";
container.innerHTML=html;
};
window.exportAdminHistory=function(){
const rows=[["Nama","NIS","Kelas","Role","Waktu Login"]];
allHistoryCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.kelas||"",d.role||"",d.tanggal_login||""]));
downloadCSV(rows,"log_akses_admin.csv");
};
window.createBackup=async function(){
showLoader("Membuat backup...");
try{
const [usersSnap,nilaiSnap,jadwalSnap,soalSnap,violSnap,histSnap,jagaSnap]=await Promise.all([
getDocs(collection(db,"users")),getDocs(collection(db,"nilai")),getDocs(collection(db,"jadwal")),
getDocs(collection(db,"soal")),getDocs(collection(db,"pelanggaran")),getDocs(collection(db,"login_history")),getDocs(collection(db,"jaga_assignment"))
]);
const backupData={
timestamp:new Date().toISOString(),
users:[],nilai:[],jadwal:[],soal:[],pelanggaran:[],login_history:[],jaga_assignment:[]
};
usersSnap.forEach(d=>backupData.users.push({id:d.id,...d.data()}));
nilaiSnap.forEach(d=>backupData.nilai.push({id:d.id,...d.data()}));
jadwalSnap.forEach(d=>backupData.jadwal.push({id:d.id,...d.data()}));
soalSnap.forEach(d=>backupData.soal.push({id:d.id,...d.data()}));
violSnap.forEach(d=>backupData.pelanggaran.push({id:d.id,...d.data()}));
histSnap.forEach(d=>backupData.login_history.push({id:d.id,...d.data()}));
jagaSnap.forEach(d=>backupData.jaga_assignment.push({id:d.id,...d.data()}));
const jsonStr=JSON.stringify(backupData);
const hashData=await sha256(jsonStr+BACKUP_PASSWORD);
const encoded=btoa(unescape(encodeURIComponent(jsonStr)));
const backupId="backup_"+new Date().toISOString().replace(/[:.]/g,"-");
await setDoc(doc(db,"backups",backupId),{
hash:hashData,data:encoded,timestamp:Timestamp.now(),
tanggal:formatWIBShort(new Date()),created_by:currentUser.nis
});
hideLoader();
document.getElementById("backupStatus").innerHTML=`<div class="alert alert-success">Backup berhasil dibuat: ${backupId}</div>`;
showToast("Backup berhasil!","success");
await loadBackupList();
}catch(e){hideLoader();showToast("Gagal membuat backup","error");}
};
async function loadBackupList(){
try{
const snap=await getDocs(collection(db,"backups"));
const select=document.getElementById("backupSelect");
if(!select)return;
select.innerHTML='<option value="">Pilih backup...</option>';
const backups=[];
snap.forEach(d=>backups.push({id:d.id,...d.data()}));
backups.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
backups.forEach(b=>{
const opt=document.createElement("option");
opt.value=b.id;
opt.textContent=`${b.id} | ${b.tanggal||"-"}`;
select.appendChild(opt);
});
}catch(e){}
}
window.restoreBackup=async function(){
const backupId=document.getElementById("backupSelect").value;
const pwd=document.getElementById("restorePassword").value;
if(!backupId){showToast("Pilih backup","error");return;}
if(!pwd){showToast("Masukkan password restore","error");return;}
if(pwd!==BACKUP_PASSWORD){showToast("Password restore salah","error");return;}
const ok=await showConfirm("Restore Data","PERHATIAN: Restore akan menimpa semua data saat ini dengan data backup yang dipilih. Tindakan ini tidak dapat dibatalkan.","Ya, Restore","btn-danger","&#9888;");
if(!ok)return;
showLoader("Memvalidasi dan me-restore data...");
try{
const backupDoc=await getDoc(doc(db,"backups",backupId));
if(!backupDoc.exists()){hideLoader();showToast("Backup tidak ditemukan","error");return;}
const bData=backupDoc.data();
const jsonStr=decodeURIComponent(escape(atob(bData.data)));
const expectedHash=await sha256(jsonStr+BACKUP_PASSWORD);
if(expectedHash!==bData.hash){hideLoader();showToast("Integritas backup gagal. Data mungkin rusak.","error");return;}
const parsed=JSON.parse(jsonStr);
for(const [collName,records] of Object.entries(parsed)){
if(collName==="timestamp")continue;
for(const record of records){
const {id,...data}=record;
if(id)await setDoc(doc(db,collName,id),data);
}
}
hideLoader();
showToast("Data berhasil di-restore!","success");
await loadAdminDashboard();
}catch(e){hideLoader();showToast("Gagal me-restore data","error");}
};
window.openResetModal=function(){
document.getElementById("resetConfirmPwd").value="";
document.getElementById("resetDataModal").classList.remove("hidden");
};
window.executeReset=async function(){
const pwd=document.getElementById("resetConfirmPwd").value;
if(!pwd){showToast("Masukkan password admin","error");return;}
const hashedInput=await hashPassword(pwd);
showLoader("Memverifikasi...");
try{
const adminDoc=await getDoc(doc(db,"users",currentUser.nis));
if(!adminDoc.exists()||adminDoc.data().password!==hashedInput){
hideLoader();showToast("Password salah","error");return;
}
}catch(e){hideLoader();showToast("Gagal verifikasi","error");return;}
hideLoader();
const ok=await showConfirm("Reset Data","Data yang dipilih akan dihapus permanen. Admin utama tidak akan terpengaruh. Lanjutkan?","Hapus Sekarang","btn-danger","&#128465;");
if(!ok)return;
showLoader("Menghapus data...");
const collections=[];
if(document.getElementById("resetNilai").checked)collections.push("nilai");
if(document.getElementById("resetPelanggaran").checked)collections.push("pelanggaran");
if(document.getElementById("resetHistory").checked)collections.push("login_history");
if(document.getElementById("resetNotif").checked)collections.push("notifikasi");
if(document.getElementById("resetSoal").checked)collections.push("soal");
if(document.getElementById("resetJadwal").checked)collections.push("jadwal");
if(document.getElementById("resetJaga").checked)collections.push("jaga_assignment");
try{
for(const collName of collections){
const snap=await getDocs(collection(db,collName));
const deletes=[];
snap.forEach(d=>deletes.push(deleteDoc(doc(db,collName,d.id))));
await Promise.all(deletes);
}
if(document.getElementById("resetAkun").checked){
const usersSnap=await getDocs(collection(db,"users"));
const deletes=[];
usersSnap.forEach(d=>{if(d.id!==ADMIN_NIS)deletes.push(deleteDoc(doc(db,"users",d.id)));});
await Promise.all(deletes);
}
hideLoader();
document.getElementById("resetDataModal").classList.add("hidden");
showToast("Data berhasil direset","success");
allUsersCache=[];allNilaiCache=[];allViolationsCache=[];allHistoryCache=[];
await loadAdminDashboard();
}catch(e){hideLoader();showToast("Gagal mereset data: "+e.message,"error");}
};
window.changePassword=async function(){
const old=document.getElementById("oldPassword").value;
const nw=document.getElementById("newPassword").value;
const conf=document.getElementById("confirmPassword").value;
if(!old||!nw||!conf){showToast("Semua field wajib diisi","error");return;}
if(nw.length<4){showToast("Password minimal 4 karakter","error");return;}
if(nw!==conf){showToast("Konfirmasi password tidak cocok","error");return;}
showLoader("Mengubah password...");
try{
const oldHash=await hashPassword(old);
const userDoc=await getDoc(doc(db,"users",currentUser.nis));
if(userDoc.data().password!==oldHash){hideLoader();showToast("Password lama salah","error");return;}
const newHash=await hashPassword(nw);
await updateDoc(doc(db,"users",currentUser.nis),{password:newHash});
hideLoader();showToast("Password berhasil diubah","success");
document.getElementById("oldPassword").value="";document.getElementById("newPassword").value="";document.getElementById("confirmPassword").value="";
}catch(e){hideLoader();showToast("Gagal mengubah password","error");}
};
window.changeAdminPassword=async function(){
const old=document.getElementById("adminOldPwd").value;
const nw=document.getElementById("adminNewPwd").value;
const conf=document.getElementById("adminConfirmPwd").value;
if(!old||!nw||!conf){showToast("Semua field wajib diisi","error");return;}
if(nw.length<4){showToast("Password minimal 4 karakter","error");return;}
if(nw!==conf){showToast("Konfirmasi tidak cocok","error");return;}
showLoader("Mengubah password...");
try{
const oldHash=await hashPassword(old);
const userDoc=await getDoc(doc(db,"users",currentUser.nis));
if(userDoc.data().password!==oldHash){hideLoader();showToast("Password lama salah","error");return;}
const newHash=await hashPassword(nw);
await updateDoc(doc(db,"users",currentUser.nis),{password:newHash});
hideLoader();showToast("Password berhasil diubah","success");
}catch(e){hideLoader();showToast("Gagal mengubah password","error");}
};
window.changePanitiaPassword=async function(){
const old=document.getElementById("panitiaOldPwd").value;
const nw=document.getElementById("panitiaNewPwd").value;
const conf=document.getElementById("panitiaConfirmPwd").value;
if(!old||!nw||!conf){showToast("Semua field wajib diisi","error");return;}
if(nw.length<4){showToast("Password minimal 4 karakter","error");return;}
if(nw!==conf){showToast("Konfirmasi tidak cocok","error");return;}
showLoader("Mengubah password...");
try{
const oldHash=await hashPassword(old);
const userDoc=await getDoc(doc(db,"users",currentUser.nis));
if(userDoc.data().password!==oldHash){hideLoader();showToast("Password lama salah","error");return;}
const newHash=await hashPassword(nw);
await updateDoc(doc(db,"users",currentUser.nis),{password:newHash});
hideLoader();showToast("Password berhasil diubah","success");
}catch(e){hideLoader();showToast("Gagal mengubah password","error");}
};
function switchAdminTab(tabId,el){
document.querySelectorAll(".admin-tab-content").forEach(t=>t.classList.add("hidden"));
document.querySelectorAll("#adminPage .nav-tab").forEach(t=>t.classList.remove("active"));
document.getElementById(tabId).classList.remove("hidden");
el.classList.add("active");
if(tabId==="admin-ranking")loadAdminRanking();
}
function switchStudentTab(tabId,el){
document.querySelectorAll(".student-tab-content").forEach(t=>t.classList.add("hidden"));
document.querySelectorAll("#studentPage .nav-tab").forEach(t=>t.classList.remove("active"));
document.getElementById(tabId).classList.remove("hidden");
el.classList.add("active");
if(tabId==="student-ranking")loadStudentRanking();
}
function switchPanitiaTab(tabId,el){
document.querySelectorAll(".panitia-tab-content").forEach(t=>t.classList.add("hidden"));
document.querySelectorAll("#panitiaPage .nav-tab").forEach(t=>t.classList.remove("active"));
document.getElementById(tabId).classList.remove("hidden");
el.classList.add("active");
if(tabId==="panitia-ranking")loadPanitiaRanking();
}
window.switchAdminTab=switchAdminTab;
window.switchStudentTab=switchStudentTab;
window.switchPanitiaTab=switchPanitiaTab;
function downloadCSV(rows,filename){
const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n");
const bom="\uFEFF";
const blob=new Blob([bom+csv],{type:"text/csv;charset=utf-8;"});
const url=URL.createObjectURL(blob);
const a=document.createElement("a");a.href=url;a.download=filename;a.click();
URL.revokeObjectURL(url);
}
window.logoutUser=async function(){
const ok=await showConfirm("Keluar dari Sistem","Yakin ingin keluar dari sistem?","Ya, Keluar","btn-danger","&#128682;");
if(!ok)return;
if(_notifInterval){clearInterval(_notifInterval);_notifInterval=null;}
currentUser=null;
localStorage.removeItem("patlas_session");
document.getElementById("nisInput").value="";
document.getElementById("passwordInput").value="";
document.getElementById("passwordGroup").style.display="none";
document.getElementById("rememberMe").checked=false;
hideAlert("loginAlert");
showPage("loginPage");
showToast("Berhasil keluar dari sistem","info");
};
window.openThemeModal=openThemeModal;
async function initApp(){
const theme=getTheme();
setTheme(theme);
const sessionRestored=await checkSession();
if(!sessionRestored){showPage("loginPage");hideLoader();}
await initAdminAccount();
}
async function initAdminAccount(){
try{
const adminDoc=await getDoc(doc(db,"users",ADMIN_NIS));
if(!adminDoc.exists()){
const hashed=await hashPassword(DEFAULT_PASSWORD);
await setDoc(doc(db,"users",ADMIN_NIS),{
nama_lengkap:"Administrator Utama",kelas:"admin",role:"admin",password:hashed,created_at:Timestamp.now()
});
}
}catch(e){}
}
document.getElementById("nisInput").addEventListener("keydown",e=>{if(e.key==="Enter")handleLogin();});
document.getElementById("passwordInput").addEventListener("keydown",e=>{if(e.key==="Enter")handleLogin();});
initApp();


(function(){
function blockDevTools(){
const threshold=160;
if(window.outerWidth-window.innerWidth>threshold||window.outerHeight-window.innerHeight>threshold){
document.body.innerHTML="Access Denied";
}
}
setInterval(blockDevTools,1000);
document.addEventListener("keydown",function(e){
if(e.key==="F12"||(e.ctrlKey&&e.shiftKey&&["I","J","C"].includes(e.key))||(e.ctrlKey&&e.key==="U")){
e.preventDefault();
document.body.innerHTML="Blocked";
}
});
document.addEventListener("contextmenu",function(e){e.preventDefault();});
})();

(function(){
let devtoolsOpen=false;
const element=new Image();
Object.defineProperty(element,"id",{get:function(){devtoolsOpen=true;document.body.innerHTML="Detected";}});
setInterval(function(){devtoolsOpen=false;console.log(element);if(devtoolsOpen){document.body.innerHTML="Blocked";}},1000);
console.log=function(){};
console.warn=function(){};
console.error=function(){};
})();

