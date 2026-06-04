(async function() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
    const { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where,
             getDocs, orderBy, limit, updateDoc, deleteDoc, serverTimestamp,
             Timestamp, onSnapshot } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
    const FC={apiKey:"AIzaSyAOPrFTN60IBmgzumjBUWs44BdLgg3DmdU",authDomain:"ujian-patlas-209fa.firebaseapp.com",projectId:"ujian-patlas-209fa",storageBucket:"ujian-patlas-209fa.firebasestorage.app",messagingSenderId:"576325442611",appId:"1:576325442611:web:912f211ad990e103ca5746"};
    const app=initializeApp(FC);
    const db=getFirestore(app);
    const ADMIN_NIS="140110";
    const DEFAULT_PASSWORD="141414";

    const CLOUDINARY_CLOUD_NAME = "dasyz9xho";
    const CLOUDINARY_UPLOAD_PRESET = "cbt_upload";
    const BACKUP_PASSWORD="https://14/pass#$shiy.oii:";
    const THEMES=[
    {id:"dark",label:"Dark",colors:["#0a0a0f","#1e1e2e","#4f8ef7"]},
    {id:"light",label:"Light",colors:["#f0f2f8","#ffffff","#2563eb"]},
    {id:"pinky",label:"Pinky",colors:["#fff0f8","#ffffff","#ff4da6"]},
    {id:"minecraft",label:"Minecraft",colors:["#1a1a00","#3d3d00","#00aa00"]},
    {id:"kemerdekaan",label:"Merdeka",colors:["#060606","#1a0000","#cc0000"]},
    {id:"hacker",label:"Hacker",colors:["#000000","#000800","#00ff00"]},
    {id:"galaxy",label:"Galaxy",colors:["#000008","#0d0d30","#7c6fff"]}
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
    window.togglePesanDariInput=function(){
    const mode=document.getElementById("soalPesanDariMode")?.value;
    const inp=document.getElementById("soalPesanDariManual");
    if(inp)inp.style.display=mode==="manual"?"block":"none";
    };

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
    document.querySelectorAll(".minecraft-bg,.pinky-field,.kemerdekaan-stars").forEach(el=>el.remove());
    const oldCanvas=document.getElementById("galaxy-canvas");if(oldCanvas){if(typeof oldCanvas._galaxyStop==="function")oldCanvas._galaxyStop();oldCanvas.remove();}const oldShoot=document.getElementById("galaxy-shooting");if(oldShoot)oldShoot.remove();
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
    for(let i=0;i<12;i++){
    const s=document.createElement("div");s.className="pinky-element";
    s.style.left=Math.random()*95+"%";
    s.style.top=Math.random()*95+"%";
    s.style.fontSize=(10+Math.random()*14)+"px";
    s.style.color=i%2===0?"#ff4da6":"#ff80c0";
    s.style.opacity="0.35";
    s.style.animationDuration=(2+Math.random()*3)+"s";
    s.style.animationDelay=Math.random()*2+"s";
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
    if(t==="galaxy"){
    const W=window.innerWidth,H=window.innerHeight;
    const canvas=document.createElement("canvas");
    canvas.id="galaxy-canvas";
    canvas.width=W;canvas.height=H;
    canvas.style.willChange="transform";
    canvas.style.transform="translateZ(0)";
    document.body.prepend(canvas);
    requestAnimationFrame(()=>{canvas.style.opacity="1";});
    const ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
    ctx.imageSmoothingEnabled=false;
    const PI2=Math.PI*2;
    const rng=()=>Math.random();

    // ── STARS ──────────────────────────────────────────────────────────
    const STAR_COUNT=180;
    const stars=[];
    const starPalette=[[255,255,255],[210,225,255],[180,200,255],[200,175,255],[255,240,200],[150,185,255],[255,185,230]];
    for(let i=0;i<STAR_COUNT;i++){
        const col=starPalette[Math.floor(rng()*starPalette.length)];
        const sz=rng()<0.78?0.3+rng()*1.1:1.5+rng()*2.4;
        const big=sz>2.0;
        stars.push({
            x:rng()*W,y:rng()*H,sz,
            r:col[0],g:col[1],b:col[2],
            phase:rng()*PI2,speed:0.35+rng()*0.75,
            minOp:0.08+rng()*0.2,maxOp:big?0.85+rng()*0.15:0.45+rng()*0.45,
            dx:(rng()-0.5)*0.1,dy:(rng()-0.5)*0.07,
            cross:big&&rng()<0.35
        });
    }

    // ── NEBULAE ────────────────────────────────────────────────────────
    const nebulae=[
        {cx:W*0.15,cy:H*0.25,rx:W*0.30,ry:H*0.38,r:110,g:35,b:255,a:0.052,ph:0,sp:0.00028},
        {cx:W*0.80,cy:H*0.65,rx:W*0.34,ry:H*0.32,r:195,g:55,b:255,a:0.042,ph:1.3,sp:0.00022},
        {cx:W*0.50,cy:H*0.88,rx:W*0.32,ry:H*0.25,r:55,g:95,b:255,a:0.038,ph:2.5,sp:0.00038},
        {cx:W*0.88,cy:H*0.15,rx:W*0.24,ry:H*0.30,r:255,g:75,b:195,a:0.032,ph:3.9,sp:0.00030},
        {cx:W*0.33,cy:H*0.52,rx:W*0.26,ry:H*0.30,r:75,g:55,b:255,a:0.035,ph:0.8,sp:0.00025},
    ];

    // ── SUPERMASSIVE BLACK HOLE ────────────────────────────────────────
    // Positioned center-right area, sizeable
    const BH_X=W*0.68,BH_Y=H*0.38;
    const BH_R=Math.min(W,H)*0.058;          // event horizon radius
    const DISK_A=BH_R*2.8,DISK_B=BH_R*0.55; // accretion disk ellipse axes
    let bhAngle=0;

    // Accretion disk particles — golden/white hot gas orbiting
    const DISK_PARTICLES=600;
    const diskPart=[];
    for(let i=0;i<DISK_PARTICLES;i++){
        const angle=rng()*PI2;
        // Distribute radially — more dense near BH
        const t2=Math.pow(rng(),0.6);
        const dist=BH_R*1.05+t2*(DISK_A-BH_R*1.05);
        // Temperature: inner = white-hot, outer = orange-red
        const heat=1-t2;
        diskPart.push({
            baseAngle:angle,
            dist,
            heat,
            speed:(0.008+heat*0.025)*(rng()<0.5?1:-1), // faster near center
            wobble:rng()*PI2,
            wobbleSpeed:0.3+rng()*0.8,
            sz:0.5+heat*1.8+rng()*0.8,
            brightness:0.5+heat*0.5+rng()*0.15,
        });
    }

    // ── AURORA ─────────────────────────────────────────────────────────
    const auroraLayers=[
        {amp:H*0.04,freq:0.0011,t:0,col:[80,40,255],op:0.038,spd:0.00014},
        {amp:H*0.055,freq:0.0014,t:1.8,col:[120,50,255],op:0.028,spd:0.00010},
        {amp:H*0.032,freq:0.0009,t:3.5,col:[50,110,255],op:0.022,spd:0.00018},
    ];

    // ── RENDER FUNCTIONS ───────────────────────────────────────────────
    function drawNebulae(now){
        nebulae.forEach(nc=>{
            const pulse=0.75+0.25*Math.sin(nc.ph+now*nc.sp);
            ctx.save();
            ctx.scale(1,nc.ry/nc.rx);
            const cy2=nc.cy*(nc.rx/nc.ry);
            const grd=ctx.createRadialGradient(nc.cx,cy2,0,nc.cx,cy2,nc.rx*pulse);
            const a=nc.a*pulse;
            grd.addColorStop(0,`rgba(${nc.r},${nc.g},${nc.b},${(a*1.7).toFixed(4)})`);
            grd.addColorStop(0.28,`rgba(${nc.r},${nc.g},${nc.b},${(a*0.95).toFixed(4)})`);
            grd.addColorStop(0.6,`rgba(${nc.r},${nc.g},${nc.b},${(a*0.32).toFixed(4)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(nc.cx,cy2,nc.rx*pulse,0,PI2);
            ctx.fillStyle=grd;ctx.fill();
            ctx.restore();
        });
    }

    function drawStars(now){
        const t=now*0.001;
        stars.forEach(s=>{
            const op=s.minOp+(s.maxOp-s.minOp)*(0.5+0.5*Math.sin(s.phase+t*s.speed));
            const x=s.x+Math.sin(s.phase+t*0.28)*s.dx*40;
            const y=s.y+Math.cos(s.phase+t*0.22)*s.dy*28;
            const grd=ctx.createRadialGradient(x,y,0,x,y,s.sz*2.5);
            grd.addColorStop(0,`rgba(${s.r},${s.g},${s.b},${op.toFixed(3)})`);
            grd.addColorStop(0.35,`rgba(${s.r},${s.g},${s.b},${(op*0.45).toFixed(3)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(x,y,s.sz*2.5,0,PI2);ctx.fillStyle=grd;ctx.fill();
            ctx.beginPath();ctx.arc(x,y,s.sz*0.45,0,PI2);
            ctx.fillStyle=`rgba(${s.r},${s.g},${s.b},${Math.min(op*1.4,1).toFixed(3)})`;ctx.fill();
            if(s.cross&&op>0.45){
                const gl=op*s.sz*5;
                ctx.save();ctx.globalAlpha=op*0.3;ctx.strokeStyle=`rgb(${s.r},${s.g},${s.b})`;ctx.lineWidth=0.45;
                ctx.beginPath();ctx.moveTo(x-gl,y);ctx.lineTo(x+gl,y);ctx.stroke();
                ctx.beginPath();ctx.moveTo(x,y-gl*0.65);ctx.lineTo(x,y+gl*0.65);ctx.stroke();
                ctx.restore();
            }
        });
    }

    function drawBlackHole(now){
        bhAngle+=0.003;

        // ── STEP 1: Gravitational lensing halos (outer glow rings) ──
        const lensData=[
            {r:BH_R*5.5,a:0.012,col:"90,50,200"},
            {r:BH_R*4.2,a:0.022,col:"70,35,180"},
            {r:BH_R*3.2,a:0.038,col:"100,55,220"},
            {r:BH_R*2.5,a:0.055,col:"130,70,240"},
        ];
        lensData.forEach(l=>{
            const g=ctx.createRadialGradient(BH_X,BH_Y,BH_R*0.9,BH_X,BH_Y,l.r);
            g.addColorStop(0,`rgba(0,0,0,0)`);
            g.addColorStop(0.65,`rgba(${l.col},${l.a})`);
            g.addColorStop(0.82,`rgba(${l.col},${l.a*1.4})`);
            g.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(BH_X,BH_Y,l.r,0,PI2);ctx.fillStyle=g;ctx.fill();
        });

        // ── STEP 2: Accretion disk — draw BEHIND event horizon ──
        // Back half of disk (below black hole visually = farther away)
        ctx.save();
        ctx.translate(BH_X,BH_Y);

        // Draw disk particles in two passes: back then front
        // "back" = angles pointing away (upper part in elliptical perspective)
        // "front" = angles pointing toward viewer (lower part, in front of BH)
        const backParticles=[];
        const frontParticles=[];
        diskPart.forEach(p=>{
            const angle=p.baseAngle+bhAngle+now*p.speed*0.001;
            // elliptical orbit: x=a*cos, y=b*sin (y squished for perspective)
            const ex=p.dist*Math.cos(angle);
            const ey=p.dist*Math.sin(angle)*(DISK_B/DISK_A);
            const inFront=ey>0; // positive y = front (toward viewer)
            const heat=p.heat;
            // Color: white-hot center → yellow → orange → deep red outer
            let cr,cg,cb;
            if(heat>0.75){cr=255;cg=245;cb=220;}       // near white
            else if(heat>0.5){cr=255;cg=210;cb=120;}   // bright yellow
            else if(heat>0.25){cr=255;cg=145;cb=40;}   // orange
            else{cr=220;cg=65;cb=15;}                  // deep orange-red
            const op=p.brightness*(0.55+0.45*Math.abs(Math.sin(angle+p.wobble+now*p.wobbleSpeed*0.001)));
            const item={ex,ey,sz:p.sz,cr,cg,cb,op,inFront};
            inFront?frontParticles.push(item):backParticles.push(item);
        });

        // Draw back particles first
        backParticles.forEach(p=>{
            const grd=ctx.createRadialGradient(p.ex,p.ey,0,p.ex,p.ey,p.sz*2.2);
            grd.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${p.op.toFixed(3)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(p.ex,p.ey,p.sz*2.2,0,PI2);ctx.fillStyle=grd;ctx.fill();
        });
        ctx.restore();

        // ── STEP 3: Event horizon — absolute black circle ──
        // Slightly larger lensing "shadow" gradient first
        const shadowG=ctx.createRadialGradient(BH_X,BH_Y,0,BH_X,BH_Y,BH_R*1.35);
        shadowG.addColorStop(0,"rgba(0,0,0,1)");
        shadowG.addColorStop(0.78,"rgba(0,0,0,1)");
        shadowG.addColorStop(0.9,"rgba(5,0,20,0.85)");
        shadowG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R*1.35,0,PI2);ctx.fillStyle=shadowG;ctx.fill();

        // Hard black event horizon
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R,0,PI2);ctx.fillStyle="rgba(0,0,0,1)";ctx.fill();

        // Photon ring — ultra-thin bright ring right at event horizon edge
        const pulse=0.6+0.4*Math.sin(now*0.0016);
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R,0,PI2);
        ctx.strokeStyle=`rgba(255,200,100,${(0.7*pulse).toFixed(2)})`;ctx.lineWidth=1.0;ctx.stroke();
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R*1.02,0,PI2);
        ctx.strokeStyle=`rgba(255,240,180,${(0.35*pulse).toFixed(2)})`;ctx.lineWidth=0.5;ctx.stroke();

        // ── STEP 4: Front accretion disk particles (on top of BH) ──
        ctx.save();ctx.translate(BH_X,BH_Y);
        frontParticles.forEach(p=>{
            const grd=ctx.createRadialGradient(p.ex,p.ey,0,p.ex,p.ey,p.sz*2.2);
            grd.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${p.op.toFixed(3)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(p.ex,p.ey,p.sz*2.2,0,PI2);ctx.fillStyle=grd;ctx.fill();
        });

        // Bright inner disk edge glow (top of disk arc visible above BH)
        const arcGlow=ctx.createLinearGradient(BH_X-DISK_A,BH_Y,BH_X+DISK_A,BH_Y);
        arcGlow.addColorStop(0,"rgba(0,0,0,0)");
        arcGlow.addColorStop(0.25,`rgba(255,200,80,${(0.08*pulse).toFixed(3)})`);
        arcGlow.addColorStop(0.5,`rgba(255,240,180,${(0.18*pulse).toFixed(3)})`);
        arcGlow.addColorStop(0.75,`rgba(255,200,80,${(0.08*pulse).toFixed(3)})`);
        arcGlow.addColorStop(1,"rgba(0,0,0,0)");
        ctx.restore();
    }

    function drawAurora(now){
        auroraLayers.forEach(al=>{
            const pts=80;
            ctx.save();ctx.beginPath();
            for(let i=0;i<=pts;i++){
                const x=(i/pts)*W;
                const y=al.amp*(Math.sin(x*al.freq+al.t+now*al.spd)+0.6*Math.sin(x*al.freq*2.3+al.t+now*al.spd*0.7)+0.3*Math.sin(x*al.freq*4.1+al.t+now*al.spd*0.4));
                i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
            }
            ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
            const ag=ctx.createLinearGradient(0,0,0,al.amp*3);
            ag.addColorStop(0,`rgba(${al.col[0]},${al.col[1]},${al.col[2]},${(al.op*1.6).toFixed(4)})`);
            ag.addColorStop(0.5,`rgba(${al.col[0]},${al.col[1]},${al.col[2]},${(al.op*0.5).toFixed(4)})`);
            ag.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=ag;ctx.fill();ctx.restore();
        });
    }

    // ── MAIN LOOP ──────────────────────────────────────────────────────
    let _gRAF,_lastT=performance.now();
    function galaxyFrame(now){
        const dt=now-_lastT;_lastT=now;
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle="#00000a";ctx.fillRect(0,0,W,H);
        drawAurora(now);
        drawNebulae(now);
        drawStars(now);
        drawBlackHole(now);
        _gRAF=requestAnimationFrame(galaxyFrame);
    }
    _gRAF=requestAnimationFrame(galaxyFrame);
    canvas._galaxyStop=()=>cancelAnimationFrame(_gRAF);
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
    const p=document.getElementById(pageId);
    if(p){
      p.classList.add("active");
      // Gunakan flex untuk semua halaman kecuali examPage yang sudah punya override
      p.style.display="flex";
      // Scroll ke atas saat ganti halaman (penting di HP)
      window.scrollTo(0,0);
      p.scrollTop=0;
    }
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
    if(nis===ADMIN_NIS){
    try{const snap=await getDoc(doc(db,"users",nis));if(snap.exists())return snap.data().role||"admin";}catch(e){}
    return "admin";
    }
    try{const snap=await getDoc(doc(db,"users",nis));if(snap.exists())return snap.data().role||"siswa";return null;}
    catch(e){return null;}
    }
    let pendingClientInfo=null;
    window.getClientInfo=async function(){
    try{
    const info={
    ip:"local",
    city:"unknown",
    country:"ID",
    org:"unknown",
    asn:"unknown",
    vpnRisk:false,
    blockedByCountry:false,
    device:navigator.userAgentData?.platform||navigator.platform||"Unknown",
    timestamp:serverTimestamp()
    };
    pendingClientInfo=info;
    return info;
    }catch(e){
    const fallback={ip:"local",city:"unknown",country:"ID",org:"unknown",asn:"unknown",vpnRisk:false,blockedByCountry:false,device:navigator.platform||"Unknown",timestamp:serverTimestamp()};
    pendingClientInfo=fallback;
    return fallback;
    }
    };

    window.validateVPN=async function(){
    return await getClientInfo();
    };

    window.handleLogin=async function(){
    const nis=document.getElementById("nisInput").value.trim();
    const pwd=document.getElementById("passwordInput").value;
    const remember=document.getElementById("rememberMe").checked;
    hideAlert("loginAlert");
    if(!nis){showAlert("loginAlert","Masukkan NIS Anda.");return;}

    showLoader("Memverifikasi identitas...");
    const clientInfo=await getClientInfo();
    try{
    const role=await checkNisType(nis);
    if(role===null){hideLoader();showAlert("loginAlert","NIS tidak ditemukan dalam sistem.");return;}
    // Cek mode sistem — blokir akun yang tidak relevan per mode
    if(role==="panitia"||role==="guru"){
    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(role==="panitia"&&sysMode==="ulangan"){hideLoader();showAlert("loginAlert","Sistem sedang dalam Mode Ulangan Harian. Akun panitia tidak aktif saat ini.");return;}
    if(role==="guru"&&sysMode==="ujian"){hideLoader();showAlert("loginAlert","Sistem sedang dalam Mode Ujian. Akun guru tidak dapat login saat ini.");return;}
    }catch(e){}
    }
    if(role==="admin"||role==="panitia"||role==="guru"){
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
    currentUser={...userData,nis,role,clientInfo};
    await logLogin(currentUser);
    localStorage.setItem("patlas_session",JSON.stringify({nis,role,ts:Date.now()}));
    hideLoader();
    // Semua role → home dulu
    loadHomePage();
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
    currentUser={...userData,nis,role:"siswa",clientInfo};
    await logLogin(currentUser);
    localStorage.setItem("patlas_session",JSON.stringify({nis,role:"siswa",ts:Date.now()}));
    hideLoader();
    try{await checkAndApplyLock();}catch(e){return;}
    loadHomePage();
    }
    }catch(err){hideLoader();showAlert("loginAlert","Terjadi kesalahan. Coba lagi.");}
    };
    async function logLogin(user){
    try{
    const now=new Date();
    await addDoc(collection(db,"login_history"),{
    nis:user.nis,nama_lengkap:user.nama_lengkap||"",kelas:user.kelas||"",role:user.role||"siswa",
    ip_address:user.clientInfo?.ip||"unknown",
    device_model:user.clientInfo?.device||"unknown",
    city:user.clientInfo?.city||"unknown",
    country:user.clientInfo?.country||"ID",
    network_org:user.clientInfo?.org||"unknown",
    network_asn:user.clientInfo?.asn||"unknown",
    vpn_risk:Boolean(user.clientInfo?.vpnRisk),
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
    if(s.role==="admin"&&s.nis===ADMIN_NIS&&!userDoc.exists()){
    currentUser={nis:s.nis,role:"admin",nama_lengkap:"Administrator Utama",kelas:"admin"};
    hideLoader();loadHomePage();return true;
    }
    if(!userDoc.exists()){hideLoader();localStorage.removeItem("patlas_session");return false;}
    currentUser={...userDoc.data(),nis:s.nis,role:s.role};
    if(s.role==="admin"){hideLoader();loadHomePage();return true;}
    else if(s.role==="panitia"){
    // Cek mode — jangan restore sesi panitia saat mode ulangan
    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ulangan"){hideLoader();localStorage.removeItem("patlas_session");showAlert("loginAlert","Sistem dalam Mode Ulangan Harian. Akun panitia tidak aktif.","error");return false;}
    }catch(e){}
    hideLoader();loadHomePage();return true;
    }
    else if(s.role==="guru"){
    // Cek mode — jangan restore sesi guru saat mode ujian
    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ujian"){hideLoader();localStorage.removeItem("patlas_session");showAlert("loginAlert","Sistem dalam Mode Ujian. Akun guru tidak dapat login.","error");return false;}
    }catch(e){}
    hideLoader();loadHomePage();return true;
    }
    else{
    // Cek apakah ada sesi ujian lokal yang belum selesai
    const enc=localStorage.getItem("patlas_exam_sess");
    let localSess=null;
    if(enc){
    try{
    const dec=_decodeSession(enc);
    if(dec&&dec.nis===s.nis&&Date.now()-dec.ts<24*60*60*1000)localSess=dec;
    }catch(e){}
    }
    if(localSess){
    try{
    const soalDoc=await getDoc(doc(db,"soal",localSess.examId));
    if(soalDoc.exists()){
    const jd=soalDoc.data();
    const selesaiMs=jd.selesai_timestamp?.toMillis?.();
    if(!selesaiMs||Date.now()<selesaiMs){
    currentExam={id:localSess.examId,...jd};
    examAnswers=localSess.jawaban||{};
    flaggedQuestions=new Set(localSess.flagged||[]);
    currentQuestion=localSess.currentQuestion||0;
    violationCount=localSess.violationCount||0;
    examViolations=localSess.violations||[];
    hideLoader();
    try{await checkAndApplyLock();}catch(e){return true;}
    setupExamPage();
    setupAntiCheat();
    if(typeof PatlasAndroid!=="undefined")try{PatlasAndroid.onExamStart();}catch(e){}
    return true;
    }
    }
    }catch(e){}
    }
    hideLoader();
    try{await checkAndApplyLock();}catch(e){return true;}
    loadHomePage();
    return true;
    }
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
    loadAppMode().then(()=>{
    loadStudentDashboard();
    loadStudentRoomMap();
    });
    buildThemeGrid("studentThemeGrid");
    }
    function loadHomePage(){
    showPage("homePage");
    const role=currentUser.role||"siswa";
    const nama=currentUser.nama_lengkap||currentUser.nis||"";
    const firstName=nama.split(" ")[0];

    // Hero name
    const el=document.getElementById("homeHeroName");
    if(el){el.textContent="Halo, "+firstName+"!";el.style.animation="none";el.offsetHeight;el.style.animation="";}

    // Chips
    const nisEl=document.getElementById("homeChipNIS");
    if(nisEl)nisEl.textContent="NIS: "+currentUser.nis;

    const kelasEl=document.getElementById("homeChipKelas");
    const roleBadge=document.getElementById("homeChipRoleBadge");
    const roleText=document.getElementById("homeChipRoleText");

    if(role==="siswa"){
      if(kelasEl)kelasEl.textContent="Kelas: "+(currentUser.kelas||"-");
      if(roleBadge)roleBadge.style.display="none";
    } else {
      const roleLabel={admin:"Administrator",panitia:"Panitia",guru:"Guru"}[role]||role;
      if(kelasEl)kelasEl.textContent=roleLabel;
      if(roleBadge){roleBadge.style.display="flex";}
      if(roleText)roleText.textContent=role.toUpperCase();
    }

    // Render kartu sesuai role
    _renderHomeCards(role);

    history.pushState({page:"home"},"","");
    }

    function _renderHomeCards(role){
    const grid=document.getElementById("homeCardsGrid");
    if(!grid)return;
    if(role==="siswa"){
      grid.innerHTML=`
      <div class="home-card" style="--card-color-a:#3a7af5;--card-color-b:#6ba3ff" onclick="goToExamPage()">
        <div class="home-card-icon">
          <svg viewBox="0 0 24 24"><path d="M9 12h6M9 16h6M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8L14 3z"/><polyline points="14 3 14 9 20 9"/><circle cx="9" cy="8" r="1" fill="#fff" stroke="none"/></svg>
        </div>
        <div class="home-card-body">
          <div class="home-card-badge home-card-badge-active"><span class="home-card-badge-dot"></span>TERSEDIA</div>
          <div class="home-card-title">Sistem Ulangan / Ujian</div>
          <div class="home-card-desc">Kerjakan soal ujian atau ulangan harian yang sudah dijadwalkan oleh guru dan panitia.</div>
        </div>
        <div class="home-card-cta"><span>Buka</span><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </div>`;
    } else if(role==="admin"){
      grid.innerHTML=`
      <div class="home-card" style="--card-color-a:#ef4444;--card-color-b:#f87171" onclick="goToPanel()">
        <div class="home-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div class="home-card-body">
          <div class="home-card-badge home-card-badge-active"><span class="home-card-badge-dot"></span>ADMIN</div>
          <div class="home-card-title">Panel Administrator</div>
          <div class="home-card-desc">Kelola seluruh sistem: akun, soal, jadwal, nilai, pelanggaran, dan pengaturan sistem PATLAS.</div>
        </div>
        <div class="home-card-cta"><span>Masuk</span><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </div>`;
    } else if(role==="panitia"){
      grid.innerHTML=`
      <div class="home-card" style="--card-color-a:#a855f7;--card-color-b:#c084fc" onclick="goToPanel()">
        <div class="home-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </div>
        <div class="home-card-body">
          <div class="home-card-badge home-card-badge-active"><span class="home-card-badge-dot"></span>PANITIA</div>
          <div class="home-card-title">Panel Panitia</div>
          <div class="home-card-desc">Pantau ujian, kelola soal dan jadwal, serta awasi ruang ujian yang ditugaskan kepada Anda.</div>
        </div>
        <div class="home-card-cta"><span>Masuk</span><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </div>`;
    } else if(role==="guru"){
      grid.innerHTML=`
      <div class="home-card" style="--card-color-a:#f59e0b;--card-color-b:#fbbf24" onclick="goToPanel()">
        <div class="home-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        </div>
        <div class="home-card-body">
          <div class="home-card-badge home-card-badge-active"><span class="home-card-badge-dot"></span>GURU</div>
          <div class="home-card-title">Panel Guru</div>
          <div class="home-card-desc">Kelola soal ulangan harian, atur jadwal, pantau nilai dan kehadiran siswa di kelas Anda.</div>
        </div>
        <div class="home-card-cta"><span>Masuk</span><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </div>`;
    }
    }

    // Masuk ke panel sesuai role (dari home)
    window.goToPanel=function(){
    if(!currentUser)return;
    const role=currentUser.role;
    if(role==="admin"){_doLoadAdminPage();}
    else if(role==="panitia"){_doLoadPanitiaPage();}
    else if(role==="guru"){_doLoadGuruPage();}
    };
    window.loadHomePage=loadHomePage;

    // Fungsi internal loader panel (tanpa ke home lagi)
    function _doLoadAdminPage(){
    loadAdminPage();
    history.pushState({page:"adminPanel"},"","");
    }
    function _doLoadPanitiaPage(){
    loadPanitiaPage();
    history.pushState({page:"panitiaPanel"},"","");
    }
    function _doLoadGuruPage(){
    loadGuruPage();
    history.pushState({page:"guruPanel"},"","");
    }

    window.goToExamPage=function(){
    loadStudentPage();
    history.pushState({page:"studentPanel"},"","");
    setTimeout(()=>{
    const examTab=document.querySelector('.nav-tab[data-tab="student-exam"]');
    if(examTab)examTab.click();
    },100);
    };

    // ── Back button — semua role kembali ke home, exam diblokir ──
    window.addEventListener("popstate",function(e){
    const examPage=document.getElementById("examPage");
    const isExamActive=examPage&&examPage.classList.contains("active");
    if(isExamActive){
    history.pushState({page:"exam"},"","");
    return;
    }
    // Halaman panel apa pun (student/admin/panitia/guru) → kembali ke home
    const pages=["studentPage","adminPage","panitiaPage","guruPage","resultPage"];
    const onPanel=pages.some(id=>{const p=document.getElementById(id);return p&&p.classList.contains("active");});
    if(onPanel&&currentUser){
    loadHomePage();
    return;
    }
    const homePage=document.getElementById("homePage");
    const isHomeActive=homePage&&homePage.classList.contains("active");
    if(isHomeActive&&currentUser){
    history.pushState({page:"home"},"","");
    return;
    }
    });

    function loadStudentRoomMap(){
        const container = document.getElementById("studentRoomMap");
        if(!container) return;

        const ruang = parseInt(currentUser?.ruang || 0);
        if(!ruang){
            container.innerHTML = '<div class="empty-state"><div>Ruang ujian belum ditentukan admin.</div></div>';
            return;
        }

        const gifSrc = '/R' + ruang + '.gif';

        container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%">
            <div class="badge badge-purple">Ruang ${ruang}</div>
            <div style="
                background-color: #999999;  /* warna abu-abu */
                width: 320px;                /* ukuran kotak, bisa disesuaikan */
                height: 320px;               /* memastikan ratio 1:1 */
                border-radius: 8px;
                border: 1px solid var(--border2);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            ">
                <img src="${gifSrc}" alt="Peta Ruang ${ruang}" style="
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    user-select: none;
                    -webkit-user-drag: none;
                "
                onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=&quot;color:#eee; font-size:14px; text-align:center; padding:20px;&quot;>Gambar tidak ditemukan<br>${gifSrc}</div>'"
                >
            </div>
        </div>`;
    }

    async function loadStudentDashboard(){
    try{
    const q=query(collection(db,"nilai"),where("nis","==",currentUser.nis));
    const snap=await getDocs(q);
    const scores=[];snap.forEach(d=>scores.push(d.data()));
    studentScoreCache=scores;
    const avg=scores.length?Math.round(scores.reduce((a,b)=>a+(b.nilai||0),0)/scores.length):0;
    let rankingPublished=false;
    try{const rcfg=await getDoc(doc(db,"settings","publikasi_ranking"));if(rcfg.exists())rankingPublished=Boolean(rcfg.data().aktif);}catch(e){}
    const avgDisplay=rankingPublished?avg:'<span style="font-size:16px;font-weight:600;color:var(--text3)">soon :)</span>';
    document.getElementById("studentStats").innerHTML=`
    <div class="stat-card"><div class="stat-value">${scores.length}</div><div class="stat-label">Ujian Selesai</div></div>
    <div class="stat-card"><div class="stat-value">${avgDisplay}</div><div class="stat-label">Rata-rata Nilai</div></div>
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
    // Ambil mode sistem
    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    const q=query(collection(db,"jadwal"),where("kelas","==",kelasPrefix));
    const snap=await getDocs(q);
    const container=document.getElementById("todaySchedule");
    const todayItems=[];
    snap.forEach(d=>{
    const data=d.data();
    if(data.tanggal!==today)return;
    // Di mode ujian: tampilkan jadwal ujian (bukan ulangan)
    // Di mode ulangan: tampilkan jadwal ulangan
    if(sysMode==='ulangan'&&data.mode!=='ulangan')return;
    if(sysMode==='ujian'&&data.mode==='ulangan')return;
    todayItems.push(data);
    });
    if(!todayItems.length){container.innerHTML=`<div class="empty-state"><div>Tidak ada ${sysMode==='ulangan'?'ulangan':'ujian'} hari ini</div></div>`;return;}
    let html='<div class="schedule-grid">';
    todayItems.forEach(data=>{
    const jam=String(data.jam).padStart(2,"0");
    const mnt=String(data.menit).padStart(2,"0");
    const modeLabel=data.mode==='ulangan'?'<span class="badge badge-yellow" style="font-size:10px">Ulangan</span>':'';
    html+=`<div class="schedule-item"><div class="schedule-mapel">${data.mapel} ${modeLabel}</div><div class="schedule-time">${jam}:${mnt} ${data.ampm||""}</div><div class="schedule-class"><span class="badge badge-blue">Kelas ${data.kelas}</span></div></div>`;
    });
    html+="</div>";
    container.innerHTML=html;
    }catch(e){}
    }
    async function loadAvailableExams(){
    const kelasPrefix=currentUser.kelas?currentUser.kelas.split(".")[0]:"X";
    const kelasFull=currentUser.kelas||"";
    try{
    // Ambil mode sistem
    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    const container=document.getElementById("availableExams");
    let snap;
    if(sysMode==='ulangan'){
    // Mode ulangan: ambil SEMUA soal mode ulangan, filter exact kelas di client
    snap=await getDocs(query(collection(db,"soal"),where("mode","==","ulangan")));
    }else{
    // Mode ujian: ambil soal berdasarkan prefix kelas (X, XI, XII)
    snap=await getDocs(query(collection(db,"soal"),where("kelas","==",kelasPrefix)));
    }
    const docs=[];
    snap.forEach(d=>{
    const data=d.data();
    if(sysMode==='ujian'){
    if(data.mode==='ulangan')return;
    docs.push({id:d.id,...data});
    }else{
    // Mode ulangan: kelas harus cocok PERSIS dengan kelas siswa
    const targetKelas=data.kelas_exact||data.kelas||'';
    if(targetKelas!==kelasFull)return;
    docs.push({id:d.id,...data});
    }
    });
    if(!docs.length){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada ${sysMode==='ulangan'?'ulangan':'soal ujian'} tersedia untuk kelas ${kelasFull||kelasPrefix}</div></div>`;return;}
    let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">';
    docs.forEach(data=>{
    const docId=data.id;
    const modeLabel=data.mode==='ulangan'?'<span class="badge badge-yellow">Ulangan Harian</span>':'<span class="badge badge-blue">Ujian</span>';
    html+=`<div class="card" style="cursor:pointer" onclick="startExam('${docId}')">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
    ${modeLabel}
    <div class="badge badge-green">${data.jumlah_soal||0} Soal</div>
    </div>
    <div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:6px">${data.mapel}</div>
    <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">Kelas: ${data.kelas_exact||data.kelas||'-'} | Durasi: ${data.durasi||90} menit</div>
    <div style="margin-top:16px"><button class="btn btn-primary" style="width:100%" onclick="event.stopPropagation();startExam('${docId}')">Mulai ${data.mode==='ulangan'?'Ulangan':'Ujian'}</button></div>
    </div>`;
    });
    html+="</div>";
    container.innerHTML=html;
    }catch(e){}
    }
    async function loadStudentScores(){
    try{
    // Ambil mode sistem
    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    // Cek apakah nilai dipublikasikan (admin level)
    const cfgDoc=await getDoc(doc(db,'settings','publikasi_nilai'));
    const adminPublished=cfgDoc.exists()?Boolean(cfgDoc.data().aktif):false;
    const container=document.getElementById('studentScoreList');
    const today=new Date().toISOString().slice(0,10);
    const q=query(collection(db,"nilai"),where("nis","==",currentUser.nis),orderBy("timestamp","desc"));
    const snap=await getDocs(q);
    studentScoreCache=[];
    snap.forEach(d=>{
    const data=d.data();
    if(sysMode==='ulangan'&&data.mode==='ujian')return;
    if(sysMode==='ujian'&&data.mode==='ulangan')return;
    studentScoreCache.push(data);
    });
    if(!adminPublished&&sysMode!=='ulangan'){
    // Mode ujian: admin harus publikasi
    container.innerHTML='<div class="alert alert-warning">Nilai belum dipublikasikan oleh admin.</div>';
    return;
    }
    // Mode ulangan: cek publikasi per-jadwal dari guru
    if(sysMode==='ulangan'){
    // Filter hanya nilai yang guru-nya sudah publikasi + hari ini (auto-hide ganti hari)
    const filtered=[];
    for(const d of studentScoreCache){
        const jId=d.jadwal_id||d.soal_id;
        if(!jId){continue;}
        try{
            const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_nilai_${jId}`));
            if(pubSnap.exists()){
                const pd=pubSnap.data();
                // Auto-hide jika sudah ganti hari
                if(pd.aktif&&pd.tanggal&&pd.tanggal!==today){
                    // sudah ganti hari → skip
                    continue;
                }
                if(pd.aktif)filtered.push(d);
            }
        }catch(e){}
    }
    if(!filtered.length&&studentScoreCache.length>0){
        container.innerHTML='<div class="alert alert-warning">Nilai belum dipublikasikan oleh guru.</div>';
        studentScoreCache=[];
        return;
    }
    studentScoreCache=filtered;
    }
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
    if(!data.length){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada nilai tercatat</div></div>';return;}
    let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Nilai (Bulat)</th><th>Nilai Asli</th><th>Benar</th><th>Salah</th><th>Waktu</th></tr></thead><tbody>';
    data.forEach(d=>{
    const asli=typeof d.nilai_asli==="number"?d.nilai_asli:d.nilai||0;
    const total=(d.benar||0)+(d.salah||0)+(d.kosong||0);
    const bulat=typeof d.nilai_dibulatkan==="number"?d.nilai_dibulatkan:hitungNilaiDibulatkan(d.benar||0,total||1);
    const sc=asli>=80?"badge-green":asli>=60?"badge-yellow":"badge-red";
    html+=`<tr><td>${d.mapel||"-"}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text2)">${formatNilai(asli)}</td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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
    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    const container=document.getElementById("studentRankingList");
    const today=new Date().toISOString().slice(0,10);

    if(sysMode==='ulangan'){
        // Mode ulangan: peringkat hanya dari ulangan guru yang dipublikasi HARI INI
        // Cari semua jadwal ulangan hari ini
        const jadwalSnap=await getDocs(query(collection(db,'jadwal'),where('tanggal','==',today),where('mode','==','ulangan')));
        const visibleJadwalIds=[];
        for(const jd of jadwalSnap.docs){
            const jId=jd.id;
            try{
                const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_ranking_${jId}`));
                if(pubSnap.exists()&&pubSnap.data().aktif&&pubSnap.data().tanggal===today)visibleJadwalIds.push(jId);
            }catch(e){}
        }
        if(!visibleJadwalIds.length){
            container.innerHTML='<div class="alert alert-warning" style="margin-top:16px">Peringkat belum dipublikasikan oleh guru hari ini.</div>';
            return;
        }
        // Ambil nilai untuk jadwal yang terpublikasi
        const nilaiMap={};
        for(const jId of visibleJadwalIds){
            const [ns1,ns2]=await Promise.all([
                getDocs(query(collection(db,'nilai_ulangan'),where('jadwal_id','==',jId))),
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jId),where('mode','==','ulangan')))
            ]);
            ns1.forEach(d=>{const dt=d.data();if(dt.nis){
                if(!nilaiMap[dt.nis])nilaiMap[dt.nis]={nama:dt.nama_lengkap,kelas:dt.kelas,nis:dt.nis,totalAsli:0,count:0};
                nilaiMap[dt.nis].totalAsli+=dt.nilai_asli??dt.nilai??0;nilaiMap[dt.nis].count++;
            }});
            ns2.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis]){
                nilaiMap[dt.nis]={nama:dt.nama_lengkap,kelas:dt.kelas,nis:dt.nis,totalAsli:0,count:0};
                nilaiMap[dt.nis].totalAsli+=dt.nilai_asli??dt.nilai??0;nilaiMap[dt.nis].count++;
            }});
        }
        if(kelas)Object.keys(nilaiMap).forEach(k=>{if(!nilaiMap[k].kelas?.startsWith(kelas))delete nilaiMap[k];});
        const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?u.totalAsli/u.count:0})).sort((a,b)=>b.avg-a.avg);
        renderRankingListFull("studentRankingList",ranked,kelas,true);
        return;
    }

    // Mode ujian: cek publikasi_ranking admin
    const cfgDoc=await getDoc(doc(db,"settings","publikasi_ranking"));
    const visible=cfgDoc.exists()?Boolean(cfgDoc.data().aktif):false;
    if(!visible){
    container.innerHTML='<div class="alert alert-warning" style="margin-top:16px">Peringkat belum dipublikasikan oleh panitia/admin.</div>';
    return;
    }
    const snap=await getDocs(collection(db,"nilai"));
    const nilaiMap={};
    snap.forEach(d=>{
    const data=d.data();
    if(kelas&&(!data.kelas||!data.kelas.startsWith(kelas)))return;
    if(sysMode==='ujian'&&data.mode==='ulangan')return;
    const nis=data.nis;
    if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,totalAsli:0,count:0};}
    nilaiMap[nis].totalAsli+=typeof data.nilai_asli==="number"?data.nilai_asli:(typeof data.nilai==="number"?data.nilai:parseFloat(String(data.nilai).replace(",","."))||0);
    nilaiMap[nis].count++;
    });
    const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?u.totalAsli/u.count:0})).sort((a,b)=>b.avg-a.avg);
    renderRankingListFull("studentRankingList",ranked,kelas,true);
    }catch(e){}
    }
    window.loadStudentRanking=loadStudentRanking;
    function renderRankingList(containerId,ranked){renderRankingListFull(containerId,ranked,"",false);}
    function renderRankingListFull(containerId,ranked,filterKelas,isStudent){
    const container=document.getElementById(containerId);if(!container)return;
    if(!ranked.length){container.innerHTML='<div class="empty-state"><div>Belum ada data peringkat</div></div>';return;}
    const levels=filterKelas?[filterKelas]:["X","XI","XII"];
    let html="";
    levels.forEach(lvl=>{
    const group=filterKelas?ranked:ranked.filter(u=>u.kelas&&u.kelas.startsWith(lvl));
    if(!group.length)return;
    html+=`<div style="margin-bottom:24px"><div style="font-family:var(--font-head);font-size:15px;font-weight:700;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 10px;font-size:12px">Tingkat ${lvl}</span><span style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${group.length} siswa</span></div>`;
    group.slice(0,isStudent?10:20).forEach((u,i)=>{
    const numClass=i===0?"gold":i===1?"silver":i===2?"bronze":"";
    // avg TIDAK dibulatkan (nilai asli)
    const avgAsli=u.avg??0;
    const avgBulat=u.avgBulat!=null?u.avgBulat:Math.round(avgAsli);
    const avgAsliStr=formatNilai(avgAsli);
    const avgBulatStr=formatNilai(Math.round(avgBulat));
    const isSelf=isStudent&&window.currentUser&&u.nis===window.currentUser.nis;
    html+=`<div class="ranking-item"${isSelf?' style="border-color:var(--accent);background:rgba(79,142,247,0.08)"':''}>
    <div class="ranking-num ${numClass}">${i+1}</div>
    <div class="ranking-info">
    <div class="ranking-name">${u.nama}${isSelf?' <span style="font-size:10px;background:var(--accent);color:#fff;border-radius:10px;padding:1px 7px;font-family:var(--font-mono)">SAYA</span>':''}</div>
    <div class="ranking-detail">${u.nis} | ${u.kelas} | ${u.count} ujian</div>
    </div>
    <div class="ranking-score">
        ${avgBulatStr}
        <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">avg asli: ${avgAsliStr}</div>
    </div>
    </div>`;
    });
    if(group.length>20&&!isStudent)html+=`<div style="text-align:center;font-size:11px;color:var(--text3);font-family:var(--font-mono);padding:8px">+${group.length-20} siswa lainnya</div>`;
    html+="</div>";
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
    const jadwalId=soalData.jadwal_id;
    if(jadwalId){
    const jadwalDoc=await getDoc(doc(db,"jadwal",jadwalId));
    if(jadwalDoc.exists()){
    const jd=jadwalDoc.data();
    const isUlangan=jd.mode==='ulangan'||soalData.mode==='ulangan';
    if(!jd.soal_ready){hideLoader();showToast("Soal untuk ujian ini belum siap","warning");return;}
    // Cek panitia_ready HANYA untuk mode ujian, bukan ulangan harian
    if(!isUlangan&&!jd.panitia_ready){hideLoader();showToast("Panitia jaga belum ditentukan untuk ujian ini","warning");return;}
    const now=Date.now();
    const mulai=jd.mulai_timestamp?.toMillis?.();
    const selesai=jd.selesai_timestamp?.toMillis?.();
    if(mulai&&selesai){
    if(now<mulai){const sisa=Math.ceil((mulai-now)/60000);hideLoader();showToast(`${isUlangan?'Ulangan':'Ujian'} belum dimulai. Mulai dalam ${sisa} menit.`,"warning");return;}
    if(now>selesai){hideLoader();showToast(`Waktu ${isUlangan?'ulangan':'ujian'} sudah berakhir`,"error");return;}
    }
    // Simpan selesai_timestamp dari jadwal ke soalData agar timer global (bukan per siswa)
    if(jd.selesai_timestamp){soalData.selesai_timestamp=jd.selesai_timestamp;}
    }
    }
    const nilaiQ=query(collection(db,"nilai"),where("nis","==",currentUser.nis),where("soal_id","==",soalId));
    const nilaiSnap=await getDocs(nilaiQ);
    if(!nilaiSnap.empty){hideLoader();showToast("Anda sudah mengerjakan ujian ini","warning");return;}
    try{await checkAndApplyLock();}catch(e){hideLoader();return;}
    currentExam={id:soalId,...soalData};
    // Coba restore local session AES dulu
    const localSess=await loadLocalExamSessionAsync(currentUser.nis,soalId);
    if(localSess){
    examAnswers=localSess.jawaban||{};
    flaggedQuestions=new Set(localSess.flagged||[]);
    currentQuestion=localSess.currentQuestion||0;
    violationCount=localSess.violationCount||0;
    examViolations=localSess.violations||[];
    }else{
    // Coba restore dari Firestore progress
    try{
    const progressId=currentUser.nis+"_"+soalId;
    const prog=await getDoc(doc(db,"exam_progress",progressId));
    if(prog.exists()){
    const pd=prog.data();
    examAnswers=pd.jawaban||{};
    flaggedQuestions=new Set(pd.flagged||[]);
    currentQuestion=pd.current_question||0;
    violationCount=pd.violation_count||0;
    examViolations=pd.violations||[];
    }else{
    examAnswers={};flaggedQuestions=new Set();currentQuestion=0;violationCount=0;examViolations=[];
    }
    }catch(e){
    examAnswers={};flaggedQuestions=new Set();currentQuestion=0;violationCount=0;examViolations=[];
    }
    }
    hideLoader();
    setupExamPage();
    setupAntiCheat();
    // Langsung simpan exam_progress ke Firestore agar status "Sedang Mengerjakan" muncul di control ruang
    saveProgressToServer().catch(()=>{});
    if(typeof PatlasAndroid!=="undefined")try{PatlasAndroid.onExamStart();}catch(e){}
    }catch(e){if(e.message!=="LOCKED"){hideLoader();showToast("Gagal memuat ujian","error");}}
    };
    function setupExamPage(){
    document.getElementById("examMapelTitle").textContent=currentExam.mapel;
    document.getElementById("examStudentInfo").textContent=`${currentUser.nama_lengkap} | ${currentUser.kelas}`;
    showPage("examPage");
    // Push state so back button won't leave exam accidentally
    history.pushState({page:"exam"},"","");
    history.pushState({page:"exam"},"",""); // push twice so one pop still stays on exam
    document.body.classList.add("exam-mode");
    renderQuestionNav();
    renderQuestion(0);
    if(currentExam.selesai_timestamp){
    const selesaiMs=currentExam.selesai_timestamp.toMillis?currentExam.selesai_timestamp.toMillis():Number(currentExam.selesai_timestamp);
    const sisaMs=selesaiMs-Date.now();
    if(sisaMs<=0){submitExam(true);return;}
    startExamTimer(Math.ceil(sisaMs/60000),selesaiMs);
    }else{
    startExamTimer(currentExam.durasi||90,null);
    }
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
    const opts=["A","B","C","D","E"];
    const fotoHtml=q.foto_url?`<div style="margin-bottom:16px;text-align:center"><img src="${q.foto_url}" alt="Gambar soal ${idx+1}" style="max-width:100%;max-height:320px;border-radius:8px;border:1px solid var(--border);object-fit:contain;user-select:none;-webkit-user-drag:none" onerror="this.style.display='none'"></div>`:'';
    let html=`<div class="question-card">
    <div class="question-number">Soal ${idx+1} dari ${soal.length}${flaggedQuestions.has(idx)?' <span class="badge badge-yellow">Ditandai</span>':''}</div>
    ${fotoHtml}<div class="question-text">${q.pertanyaan}</div>
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
    window.selectAnswer=function(idx,letter){examAnswers[idx]=letter;renderQuestion(idx);renderQuestionNav();saveLocalExamSession();scheduleProgressSave();};
    window.prevQuestion=function(){if(currentQuestion>0){currentQuestion--;renderQuestion(currentQuestion);renderQuestionNav();}};
    window.nextQuestion=function(){const total=(currentExam.soal||[]).length;if(currentQuestion<total-1){currentQuestion++;renderQuestion(currentQuestion);renderQuestionNav();}};
    window.toggleFlag=function(){if(flaggedQuestions.has(currentQuestion))flaggedQuestions.delete(currentQuestion);else flaggedQuestions.add(currentQuestion);renderQuestion(currentQuestion);renderQuestionNav();};
    function startExamTimer(minutes,selesaiMs){
    if(examTimer)clearInterval(examTimer);
    let secs=minutes*60;
    function tick(){
    if(selesaiMs){
    const sisaMs=selesaiMs-Date.now();
    secs=Math.max(0,Math.floor(sisaMs/1000));
    }
    const h=Math.floor(secs/3600);const m=Math.floor((secs%3600)/60);const s=secs%60;
    const display=`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    const el=document.getElementById("examTimer");
    if(el){el.textContent=display;el.className="exam-timer"+(secs<=300?" danger":secs<=600?" warning":"");}
    if(secs<=0){clearInterval(examTimer);submitExam(true);return;}
    if(!selesaiMs)secs--;
    }
    tick();
    examTimer=setInterval(tick,1000);
    }
    window.submitExam=async function(auto=false){
    if(!auto){
    const total=(currentExam.soal||[]).length;
    const answered=Object.keys(examAnswers).length;
    if(answered<total){
    const ok=await showConfirm("Kumpulkan Jawaban",`Masih ada ${total-answered} soal belum dijawab. Yakin ingin mengumpulkan?`,"Ya, Kumpulkan","btn-primary","");
    if(!ok)return;
    }
    }
    if(_progressSaveTimer)clearTimeout(_progressSaveTimer);
    if(examTimer)clearInterval(examTimer);
    document.body.classList.remove("exam-mode");
    removeAntiCheat();
    showLoader("Mengirim jawaban...");
    try{
    const soal=currentExam.soal||[];
    let benar=0,salah=0,kosong=0;
    soal.forEach((q,i)=>{const ans=examAnswers[i];if(!ans)kosong++;else if(ans===q.kunci)benar++;else salah++;});
    const nilaiAsli=hitungNilaiAsli(benar,soal.length);
    const nilaiBulat=hitungNilaiDibulatkan(benar,soal.length);
    const nilai=nilaiAsli; // simpan nilai asli sebagai nilai utama
    const now=new Date();
    // Simpan ke nilai_ulangan juga jika mode ulangan
    const nilaiDoc={
    nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,mapel:currentExam.mapel,
    soal_id:currentExam.id,ruang:parseInt(currentUser.ruang||0),jadwal_id:currentExam.jadwal_id||currentExam.id,
    nilai:nilaiAsli,nilai_asli:nilaiAsli,nilai_dibulatkan:nilaiBulat,
    benar,salah,kosong,jawaban:examAnswers,
    mode:currentExam.mode||'ujian',
    waktu_selesai:formatWIBShort(now),timestamp:Timestamp.fromDate(now),pelanggaran:violationCount,
    graded_by:"server",benar_server:benar,salah_server:salah,kosong_server:kosong,
    nilai_server:nilaiAsli,nilai_server_bulat:nilaiBulat,
    assigned_guru:currentExam.assigned_guru||null
    };
    await addDoc(collection(db,"nilai"),nilaiDoc);
    // Juga simpan ke nilai_ulangan untuk akses guru
    if(currentExam.mode==='ulangan'||currentExam.jadwal_id){
        try{await addDoc(collection(db,"nilai_ulangan"),{...nilaiDoc});}catch(e){}
    }
    try{const progressId=currentUser.nis+"_"+currentExam.id;await deleteDoc(doc(db,"exam_progress",progressId));}catch(e){}
    clearLocalExamSession();
    try{
    const lockDoc=await getDoc(doc(db,"siswa_lock",currentUser.nis));
    if(lockDoc.exists()&&lockDoc.data().locked)await updateDoc(doc(db,"siswa_lock",currentUser.nis),{locked:false,auto_unlocked_at:Timestamp.now(),unlock_reason:"Ujian selesai dikumpulkan"});
    }catch(e){}
    // Stop VPN setelah kumpul
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.onExamEnd();}catch(e){}}
    hideLoader();
    showResult(nilaiAsli,benar,salah,kosong,nilaiBulat,soal.length);
    }catch(e){hideLoader();showToast("Gagal mengirim jawaban","error");}
    };
    async function showResult(nilaiAsli,benar,salah,kosong,nilaiBulat,totalSoal){
    const nilai=nilaiAsli;
    document.getElementById("resultMapel").textContent=currentExam.mapel;
    document.getElementById("resultStudent").textContent=`${currentUser.nama_lengkap} | ${currentUser.kelas}`;
    // Ambil pesan dari data soal
    let pesanSiswa="Jawaban Anda telah berhasil dikumpulkan. Terima kasih atas kejujuran Anda dalam mengerjakan ujian ini.";
    let pesanDari="Panitia Ujian";
    try{
    const soalDoc=await getDoc(doc(db,"soal",currentExam.id));
    if(soalDoc.exists()){
    const sd=soalDoc.data();
    if(sd.pesan_siswa&&sd.pesan_siswa.trim())pesanSiswa=sd.pesan_siswa.trim();
    if(sd.pesan_dari&&sd.pesan_dari.trim())pesanDari=sd.pesan_dari.trim();
    }
    }catch(e){}
    document.getElementById("resultMessage").textContent=pesanSiswa;
    document.getElementById("resultMessageFrom").textContent=pesanDari;
    const vEl=document.getElementById("resultViolations");
    if(violationCount>0){
    vEl.innerHTML=`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:12px 16px;font-size:13px;font-family:var(--font-mono);margin-bottom:12px"><span style="background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">${violationCount} PELANGGARAN</span><div style="margin-top:8px;color:var(--text2)">${examViolations.join(", ")}</div></div>`;
    }else{vEl.innerHTML="";}
    showPage("resultPage");
    }
    window.goToDashboard=async function(){
    if(currentExam&&currentUser){
    try{
    const lockDoc=await getDoc(doc(db,"siswa_lock",currentUser.nis));
    if(lockDoc.exists()&&lockDoc.data().locked===true){showLockScreen(lockDoc.data().reason||"Akun Anda terkunci karena pelanggaran.");return;}
    }catch(e){}
    }
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.onExamEnd();}catch(e){}}
    clearLocalExamSession();
    currentExam=null;
    showPage("studentPage");loadStudentDashboard();
    };
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
    function recordViolation(reason,isExit){
    violationCount++;
    if(!examViolations.includes(reason))examViolations.push(reason);
    const el=document.getElementById("violationCount");
    const msg=document.getElementById("violationMsg");
    const warn=document.getElementById("violationWarning");
    const badge=document.getElementById("violationCountBadge");
    const typeLabel=document.getElementById("violationTypeLabel");
    if(el)el.textContent="!";
    if(badge)badge.textContent="#"+violationCount;
    if(msg)msg.textContent=reason;
    if(typeLabel){
    if(isExit)typeLabel.textContent="KELUAR APLIKASI TERDETEKSI";
    else if(reason.indexOf("VPN")>=0||reason.indexOf("proxy")>=0)typeLabel.textContent="VPN / PROXY TERDETEKSI";
    else if(reason.indexOf("screenshot")>=0||reason.indexOf("record")>=0)typeLabel.textContent="TANGKAPAN LAYAR TERDETEKSI";
    else typeLabel.textContent="PELANGGARAN TERDETEKSI";
    }
    // Tampilkan background merah
    if(warn){warn.classList.remove("hidden");warn.style.zIndex="2147483647";}
    document.body.style.pointerEvents="none";
    if(warn)warn.style.pointerEvents="auto";
    // Matikan VPN + tandai terkunci (lockExam) untuk semua jenis pelanggaran
    // - isExit=true: akun dikunci, tombol Refresh, harus tunggu panitia
    // - isExit=false: pelanggaran biasa, tombol Lanjutkan, VPN nyala kembali saat klik
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.lockExam();}catch(e){}}
    // Catat pelanggaran ke Firestore. Kunci akun hanya jika isExit=true
    notifyViolationOnly(reason,isExit===true);
    // Setup tombol di violation overlay (satu kali, tidak loop)
    setupViolationBtn(isExit===true);
    }
    function setupViolationBtn(mustWaitPanitia){
    const btn=document.getElementById("violationRefreshBtn");
    if(!btn)return;
    // Clone untuk hapus semua event listener lama
    const nb=btn.cloneNode(true);
    btn.parentNode.replaceChild(nb,btn);
    nb.style.pointerEvents="auto";
    // SEMUA pelanggaran → tombol Refresh, harus tunggu panitia buka kunci
    nb.textContent="Refresh — Cek Status Kunci";
    nb.disabled=false;
    nb.style.opacity="1";
    nb.style.cursor="pointer";
    // Pasang realtime listener (auto-unlock saat panitia buka)
    if(typeof currentUser!=="undefined"&&currentUser&&currentUser.nis)startLockListener(currentUser.nis);
    nb.addEventListener("click",async function(){
    const thisBtn=document.getElementById("violationRefreshBtn");
    if(thisBtn){thisBtn.disabled=true;thisBtn.textContent="Mengecek...";}
    try{
    const snap=await getDoc(doc(db,"siswa_lock",currentUser.nis));
    if(snap.exists()&&snap.data().locked===false){
    if(_lockListener){_lockListener();_lockListener=null;}
    _doResumeAfterUnlock();
    }else{
    if(thisBtn){thisBtn.disabled=false;thisBtn.textContent="Refresh — Cek Status Kunci";}
    showToast("Masih terkunci. Hubungi panitia jaga di ruangan Anda.","error",3500);
    }
    }catch(e){
    if(thisBtn){thisBtn.disabled=false;thisBtn.textContent="Refresh — Cek Status Kunci";}
    showToast("Gagal cek. Coba lagi.","error",2000);
    }
    },{once:false});
    }
    async function notifyViolationOnly(reason,lockAccount){
    try{
    const jadwalId=currentExam?.jadwal_id||null;
    // Selalu write siswa_lock agar tombol Refresh bisa cek status dari panitia
    await setDoc(doc(db,"siswa_lock",currentUser.nis),{
    locked:true,
    reason:lockAccount?`Keluar Aplikasi: ${reason}`:`Pelanggaran: ${reason}`,
    jadwal_id:jadwalId,
    locked_at:Timestamp.now(),nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas
    });
    if(_progressSaveTimer)clearTimeout(_progressSaveTimer);
    saveLocalExamSession();
    const ruangSiswa=parseInt(currentUser.ruang||0);
    let panitia_target=null;
    if(jadwalId&&ruangSiswa){
    try{
    const jagaQ=query(collection(db,"jaga_assignment"),where("jadwal_id","==",jadwalId),where("ruang","==",ruangSiswa));
    const jagaSnap=await getDocs(jagaQ);
    if(!jagaSnap.empty)panitia_target=jagaSnap.docs[0].data().panitia_nis||null;
    }catch(e){}
    }
    await addDoc(collection(db,"notifikasi"),{
    nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,
    ruang:ruangSiswa,mapel:currentExam?.mapel||"-",jenis:reason,jadwal_id:jadwalId,
    panitia_target,timestamp:Timestamp.now(),dibaca:false
    });
    await addDoc(collection(db,"pelanggaran"),{
    nis:currentUser.nis,nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,
    mapel:currentExam?.mapel||"-",jenis_pelanggaran:reason,jumlah:violationCount,
    jadwal_id:jadwalId,ruang:ruangSiswa,timestamp:Timestamp.now(),unlocked:false,unlock_reason:""
    });
    }catch(e){}
    }
    window.closeViolationWarning=function(){
    // Unlock hanya via realtime listener Firebase — bukan dari siswa
    };
    window.refreshViolationCheck=function(){
    // No-op: sekarang ditangani oleh setupViolationRefreshBtn
    };
    async function loadPanitiaPage(){
    // Cek mode sistem — panitia tidak boleh aktif saat mode ulangan
    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ulangan"){
    showToast("Sistem dalam Mode Ulangan Harian. Akun panitia tidak aktif.","error",5000);
    currentUser=null;
    localStorage.removeItem("patlas_session");
    setTimeout(()=>showPage("loginPage"),2000);
    return;
    }
    }catch(e){}
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
    await loadRankingPublishState();
    if(_notifInterval)clearInterval(_notifInterval);
    _notifInterval=setInterval(checkPanitiaNotifications,30000);
    }
    async function checkPanitiaNotifications(){
    try{
    const q=query(collection(db,"notifikasi"),where("dibaca","==",false),where("panitia_target","==",currentUser.nis),orderBy("timestamp","desc"),limit(50));
    const snap=await getDocs(q);
    let notifs=[];
    snap.forEach(d=>{notifs.push({id:d.id,...d.data()});});
    const panel=document.getElementById("notifPanel");
    const dot=document.getElementById("notifCount");
    if(!panel||!dot)return;
    if(notifs.length>0){dot.style.display="inline-block";dot.textContent=notifs.length<=9?notifs.length:"9+";}
    else{dot.style.display="none";}
    if(!notifs.length){panel.innerHTML='<div style="font-size:13px;font-family:var(--font-mono);color:var(--text3);padding:8px 0">Tidak ada notifikasi baru</div>';return;}
    panel.innerHTML=notifs.map(n=>{
    const safeNis=String(n.nis||"").replace(/'/g,"");
    const safeName=String(n.nama_lengkap||n.nis||"").replace(/'/g,"").replace(/"/g,"");
    const safeId=String(n.id||"").replace(/'/g,"");
    return `<div class="notif-item">
    <div class="notif-title">[KUNCI] ${n.nama_lengkap||n.nis||"-"} — Pelanggaran</div>
    <div class="notif-body">${n.jenis||"-"} | ${n.mapel||"-"} | Ruang ${n.ruang||"-"} | ${n.kelas||"-"}</div>
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
    const lockDoc=await getDoc(doc(db,"siswa_lock",pendingUnlockNis.nis));
    if(lockDoc.exists()){
    const lockData=lockDoc.data();
    const jadwalId=lockData.jadwal_id;
    if(jadwalId){
    const jagaQ=query(collection(db,"jaga_assignment"),where("jadwal_id","==",jadwalId),where("panitia_nis","==",currentUser.nis));
    const jagaSnap=await getDocs(jagaQ);
    if(jagaSnap.empty){hideLoader();showToast("Anda tidak berwenang membuka kunci siswa ini","error");return;}
    }
    await updateDoc(doc(db,"siswa_lock",pendingUnlockNis.nis),{locked:false,unlock_reason:reason,unlocked_by:currentUser.nis,unlocked_at:Timestamp.now()});
    }
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
    const now=Date.now();
    const q=query(collection(db,"jaga_assignment"),where("panitia_nis","==",currentUser.nis));
    const snap=await getDocs(q);
    if(snap.empty)return null;
    let activeRoom=null;
    const jadwalChecks=[];
    snap.forEach(d=>{jadwalChecks.push({id:d.id,...d.data()});});
    for(const a of jadwalChecks){
    if(a.jadwal_id){
    try{
    const jdDoc=await getDoc(doc(db,"jadwal",a.jadwal_id));
    if(jdDoc.exists()){
    const jd=jdDoc.data();
    const mulai=jd.mulai_timestamp?.toMillis?.();
    const selesai=jd.selesai_timestamp?.toMillis?.();
    if(mulai&&selesai&&now>=mulai&&now<=selesai){
    activeRoom={id:a.id,...a,jadwal:jd};
    break;
    }
    if(!mulai||!selesai){if(!activeRoom)activeRoom={id:a.id,...a,jadwal:jd};}
    }
    }catch(e){}
    }else{if(!activeRoom)activeRoom={id:a.id,...a};}
    }
    return activeRoom;
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
    const alertEl=document.getElementById("panitiaJagaAlert");
    const alertTitle=document.getElementById("panitiaJagaAlertTitle");
    const alertBody=document.getElementById("panitiaJagaAlertBody");
    const greetingEl=document.getElementById("panitiaGreeting");
    if(myRoom){
    document.getElementById("panitiaMyRoom").innerHTML=`<div class="account-info-card">
    <div class="account-info-row"><div class="account-info-label">Ruang Jaga</div><div class="account-info-value" style="color:var(--yellow);font-size:18px;font-weight:800">Ruang ${myRoom.ruang}</div></div>
    <div class="account-info-row"><div class="account-info-label">Mata Pelajaran</div><div class="account-info-value">${myRoom.mapel||"-"}</div></div>
    <div class="account-info-row"><div class="account-info-label">Target Kelas</div><div class="account-info-value">${myRoom.kelas||"-"}</div></div>
    <div class="account-info-row"><div class="account-info-label">Ditetapkan Oleh</div><div class="account-info-value">${myRoom.assigned_by||"-"}</div></div>
    </div>`;
    if(alertEl&&alertTitle&&alertBody){
    alertEl.style.display="flex"; alertEl.style.flexDirection="row"; alertEl.style.alignItems="flex-start";
    alertTitle.textContent=`⚠️ Anda ditugaskan menjaga Ruang ${myRoom.ruang}`;
    alertBody.innerHTML=`Mata Pelajaran: <strong>${myRoom.mapel||"-"}</strong> &nbsp;|&nbsp; Kelas: <strong>${myRoom.kelas||"-"}</strong><br>Pantau dan awasi siswa di ruangan Anda. Notifikasi pelanggaran akan masuk secara otomatis.`;
    }
    if(greetingEl){
    greetingEl.textContent=`Selamat bertugas, ${currentUser.nama_lengkap||currentUser.nis}! Anda menjaga Ruang ${myRoom.ruang} — ${myRoom.mapel||"Ujian"} Kelas ${myRoom.kelas||"-"}`;
    }
    }else{
    document.getElementById("panitiaMyRoom").innerHTML='<div class="empty-state"><div>Belum ada jadwal jaga ditetapkan oleh admin</div></div>';
    if(alertEl)alertEl.style.display="none";
    if(greetingEl)greetingEl.textContent=`Selamat datang, ${currentUser.nama_lengkap||currentUser.nis}`;
    }
    }catch(e){}
    // Cek & tampilkan tab Control Ruang jika jam jaga aktif
    checkAndShowControlRuangTab().catch(()=>{});
    }
    async function loadSoalList(){
    try{
    const snap=await getDocs(collection(db,"soal"));
    const targets=["soalList","adminSoalList"];
    targets.forEach(targetId=>{
    const container=document.getElementById(targetId);
    if(!container)return;
    if(snap.empty){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada soal. Klik + Tambah Soal ke Jadwal untuk mulai.</div></div>';return;}
    let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Jumlah Soal</th><th>Durasi</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>';
    snap.forEach(d=>{
    const data=d.data();
    html+=`<tr><td><strong>${data.mapel||"-"}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td><span class="badge badge-green">${data.jumlah_soal||0}</span></td><td>${data.durasi||90} menit</td><td style="font-size:11px;color:var(--text3)">${data.timestamp?formatWIBShort(data.timestamp):"-"}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openKelolaSoalModal('${d.id}')">&#128196; Kelola Soal</button><button class="btn btn-danger btn-sm" onclick="deleteSoal('${d.id}')">Hapus</button></td></tr>`;
    });
    html+="</tbody></table></div>";
    container.innerHTML=html;
    });
    }catch(e){}
    }
    window.openSoalModal=async function(mode){
    const soalMode=mode||'ujian';
    window._soalMode=soalMode;
    document.getElementById("soalImport").value="";
    const modalTitle=document.querySelector('#soalModal .modal-title');
    if(modalTitle)modalTitle.textContent=soalMode==='ulangan'?'Tambah Soal ke Jadwal Ulangan':'Tambah Soal ke Jadwal Ujian';
    const select=document.getElementById("soalJadwalSelect");
    select.innerHTML='<option value="">Memuat jadwal...</option>';
    try{
    let q;
    if(soalMode==='ulangan'){
    // Guru: tampilkan jadwal ulangan milik guru ini
    q=query(collection(db,"jadwal"),where('mode','==','ulangan'));
    if(currentUser&&currentUser.role==='guru'){
    q=query(collection(db,"jadwal"),where('mode','==','ulangan'),where('assigned_guru','==',currentUser.nis));
    }
    }else{
    // Admin/panitia: tampilkan semua jadwal ujian
    const snap2=await getDocs(collection(db,"jadwal"));
    select.innerHTML='<option value="">Pilih jadwal...</option>';
    snap2.forEach(d=>{
    const data=d.data();
    const jam=String(data.jam||0).padStart(2,"0");
    const mnt=String(data.menit||0).padStart(2,"0");
    const opt=document.createElement("option");
    opt.value=d.id;
    opt.textContent=`${data.mapel} - Kelas ${data.kelas} | ${jam}:${mnt} ${data.ampm||""} | ${data.tanggal||""}`;
    opt.dataset.mapel=data.mapel;
    opt.dataset.kelas=data.kelas;
    opt.dataset.durasi=data.durasi||90;
    select.appendChild(opt);
    });
    const promptEl=document.getElementById("aiPromptText");
    const jumlah=20;
    promptEl.textContent=`Kamu adalah pembuat soal ujian profesional untuk SMA.\n\nTugasmu: Buat ${jumlah} soal pilihan ganda.\n\nFORMAT OUTPUT WAJIB (ikuti persis tanpa variasi apapun):\n1.teks soal ditulis di sini\na.pilihan pertama\nb.pilihan kedua\nc.pilihan ketiga\nd.pilihan keempat\ne.pilihan kelima\nkunci: a\n\n2.teks soal berikutnya (4 pilihan juga valid)\na.pilihan pertama\nb.pilihan kedua\nc.pilihan ketiga\nd.pilihan keempat\nkunci: b\n\nATURAN KETAT:\n- Nomor soal diikuti titik langsung tanpa spasi: "1.teks"\n- Pilihan huruf kecil (a/b/c/d/e) diikuti titik langsung tanpa spasi: "a.teks"\n- Kunci: "kunci: x" (huruf kecil, spasi sebelum jawaban, boleh a/b/c/d/e)\n- Pilihan E opsional — boleh 4 atau 5 pilihan per soal\n- TIDAK ada tanda kurung, strip, atau format lain\n- TIDAK ada penjelasan, catatan, atau teks di luar format soal\n- Pisahkan tiap soal dengan SATU baris kosong\n- Mulai langsung dari "1." tanpa kalimat pembuka\n- Output harus bisa langsung di-paste ke sistem CBT\n\nSEKARANG BUAT ${jumlah} SOAL. MULAI LANGSUNG DARI "1."`;
    document.getElementById("soalModal").classList.remove("hidden");
    return;
    }
    const snap=await getDocs(q);
    select.innerHTML='<option value="">Pilih jadwal...</option>';
    snap.forEach(d=>{
    const data=d.data();
    const jam_str=data.jam_mulai||`${String(data.jam||0).padStart(2,"0")}:${String(data.menit||0).padStart(2,"0")} ${data.ampm||""}`;
    const opt=document.createElement("option");
    opt.value=d.id;
    opt.textContent=`${data.mapel} - Kelas ${data.kelas} | ${jam_str} | ${data.tanggal||""}`;
    opt.dataset.mapel=data.mapel;
    opt.dataset.kelas=data.kelas;
    opt.dataset.durasi=data.durasi||90;
    select.appendChild(opt);
    });
    }catch(e){}
    const promptEl=document.getElementById("aiPromptText");
    const jumlah=20;
    promptEl.textContent=`Kamu adalah pembuat soal ujian profesional untuk SMA.\n\nTugasmu: Buat ${jumlah} soal pilihan ganda.\n\nFORMAT OUTPUT WAJIB (ikuti persis tanpa variasi apapun):\n1.teks soal ditulis di sini\na.pilihan pertama\nb.pilihan kedua\nc.pilihan ketiga\nd.pilihan keempat\ne.pilihan kelima\nkunci: a\n\n2.teks soal berikutnya (4 pilihan juga valid)\na.pilihan pertama\nb.pilihan kedua\nc.pilihan ketiga\nd.pilihan keempat\nkunci: b\n\nATURAN KETAT:\n- Nomor soal diikuti titik langsung tanpa spasi: "1.teks"\n- Pilihan huruf kecil (a/b/c/d/e) diikuti titik langsung tanpa spasi: "a.teks"\n- Kunci: "kunci: x" (huruf kecil, spasi sebelum jawaban, boleh a/b/c/d/e)\n- Pilihan E opsional — boleh 4 atau 5 pilihan per soal\n- TIDAK ada tanda kurung, strip, atau format lain\n- TIDAK ada penjelasan, catatan, atau teks di luar format soal\n- Pisahkan tiap soal dengan SATU baris kosong\n- Mulai langsung dari "1." tanpa kalimat pembuka\n- Output harus bisa langsung di-paste ke sistem CBT\n\nSEKARANG BUAT ${jumlah} SOAL. MULAI LANGSUNG DARI "1."`;
    document.getElementById("soalModal").classList.remove("hidden");
    };
    window.copyAiPrompt=function(){
    const text=document.getElementById("aiPromptText").textContent;
    navigator.clipboard.writeText(text).then(()=>showToast("Prompt disalin!","success")).catch(()=>showToast("Gagal menyalin","error"));
    };
    function parseSoalText(text){
    text=text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    text=text.replace(/```[\w]*\n?/g,"").trim();
    const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
    const soal=[];let current=null;
    for(const line of lines){
    // Format: 1.soal atau 1. soal
    const qMatch=line.match(/^(\d+)\.\s*(.+)/);
    // Pilihan lowercase: a.jawab atau a. jawab (huruf a/b/c/d/e)
    const aMatch=line.match(/^a\.\s*(.*)/i);
    const bMatch=line.match(/^b\.\s*(.*)/i);
    const cMatch=line.match(/^c\.\s*(.*)/i);
    const dMatch=line.match(/^d\.\s*(.*)/i);
    const eMatch=line.match(/^e\.\s*(.*)/i);
    // Kunci: kunci: a (case insensitive, huruf kecil/kapital, support a-e)
    const kMatch=line.match(/^(?:kunci|KUNCI|jawaban|JAWABAN|answer|ANSWER)[:\s]+([A-Ea-e])/i);
    if(qMatch&&!aMatch&&!bMatch&&!cMatch&&!dMatch&&!eMatch&&!kMatch){
    if(current)soal.push(current);
    current={pertanyaan:qMatch[2].trim(),pilihan:{A:"",B:"",C:"",D:"",E:""},kunci:""};
    }else if(aMatch&&current)current.pilihan.A=aMatch[1].trim();
    else if(bMatch&&current)current.pilihan.B=bMatch[1].trim();
    else if(cMatch&&current)current.pilihan.C=cMatch[1].trim();
    else if(dMatch&&current)current.pilihan.D=dMatch[1].trim();
    else if(eMatch&&current)current.pilihan.E=eMatch[1].trim();
    else if(kMatch&&current)current.kunci=kMatch[1].toUpperCase();
    else if(current&&!current.kunci&&!aMatch&&!bMatch&&!cMatch&&!dMatch&&!eMatch&&!qMatch){
    if(current.pertanyaan&&!/^\d+\./.test(line))current.pertanyaan+=" "+line;
    }
    }
    if(current)soal.push(current);
    // Valid jika minimal ada A,B,C,D dan kunci (E opsional)
    const valid=soal.filter(s=>s.kunci&&s.pilihan.A&&s.pilihan.B&&s.pilihan.C&&s.pilihan.D);
    return valid.length>0?valid:soal;
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
    const pesanSiswaVal=(document.getElementById("soalPesanSiswa")?.value||"").trim();
    const pesanDariMode=document.getElementById("soalPesanDariMode")?.value||"anonymous";
    const pesanDariVal=pesanDariMode==="manual"?(document.getElementById("soalPesanDariManual")?.value||"").trim()||"Anonymous":"Anonymous";
    const soalMode=window._soalMode||'ujian';await addDoc(collection(db,"soal"),{mapel,kelas,durasi,soal:soalArr,jumlah_soal:soalArr.length,jadwal_id:jadwalId,mode:soalMode,created_by:currentUser.nis,timestamp:Timestamp.now(),pesan_siswa:pesanSiswaVal||"Jawaban Anda telah berhasil dikumpulkan. Terima kasih atas kejujuran Anda.",pesan_dari:pesanDariVal});
    await updateDoc(doc(db,"jadwal",jadwalId),{soal_ready:true,updated_at:Timestamp.now()});
    hideLoader();
    document.getElementById("soalModal").classList.add("hidden");
    showToast(`${soalArr.length} soal berhasil disimpan!`,"success");
    await loadSoalList();
    await loadPanitiaDashboard();
    }catch(e){hideLoader();showToast("Gagal menyimpan soal","error");}
    };
    window.deleteSoal=async function(id){
    const ok=await showConfirm("Hapus Soal","Hapus soal ini? Tindakan tidak dapat dibatalkan.","Ya, Hapus","btn-danger","");
    if(!ok)return;
    showLoader("Menghapus...");
    try{await deleteDoc(doc(db,"soal",id));hideLoader();showToast("Soal dihapus","success");await loadSoalList();}
    catch(e){hideLoader();showToast("Gagal menghapus","error");}
    };
    async function loadJadwalList(){
    try{
    const snap=await getDocs(collection(db,"jadwal"));
    const targets=["jadwalList","adminJadwalUjianList"];
    targets.forEach(targetId=>{
    const container=document.getElementById(targetId);
    if(!container)return;
    if(snap.empty){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada jadwal ujian</div></div>';return;}
    let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th><th>Tanggal</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th>Soal</th><th>Panitia</th><th>Aksi</th></tr></thead><tbody>';
    snap.forEach(d=>{
    const data=d.data();
    const jam=String(data.jam).padStart(2,"0");
    const mnt=String(data.menit).padStart(2,"0");
    const selJam=String(data.selesai_jam||0).padStart(2,"0");
    const selMnt=String(data.selesai_menit||0).padStart(2,"0");
    const soalBadge=data.soal_ready?'<span class="badge badge-green">Siap</span>':'<span class="badge badge-red">Belum</span>';
    const jagaBadge=data.panitia_ready?'<span class="badge badge-green">Ada</span>':'<span class="badge badge-red">Belum</span>';
    html+=`<tr><td><strong>${data.mapel}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td><span class="badge badge-purple">Ruang ${data.ruang||"-"}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td style="font-family:var(--font-mono)">${selJam}:${selMnt}</td><td>${data.durasi||90} mnt</td><td>${soalBadge}</td><td>${jagaBadge}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openEditJadwalModal('${d.id}','${data.tanggal||""}',${data.jam||8},${data.menit||0},'${data.ampm||"AM"}',${data.durasi||90})">&#9998; Edit</button><button class="btn btn-danger btn-sm" onclick="deleteJadwal('${d.id}')">Hapus</button></td></tr>`;
    });
    html+="</tbody></table></div>";
    container.innerHTML=html;
    });
    }catch(e){}
    }
    window.openJadwalModal=async function(){
    document.getElementById("jadwalMapel").value="";
    const today=new Date().toISOString().split("T")[0];
    document.getElementById("jadwalTanggal").value=today;
    document.getElementById("jadwalModal").classList.remove("hidden");
    await updateRuangOptions();
    };
    async function updateRuangOptions(){
    const kelas=document.getElementById("jadwalKelas").value;
    const select=document.getElementById("jadwalRuang");
    if(!select)return;
    select.innerHTML='<option value="">Memuat...</option>';
    try{
    const snap=await getDocs(query(collection(db,"users"),where("role","==","siswa")));
    const ruanganSet=new Set();
    const allRuanganSet=new Set();
    snap.forEach(d=>{
    const data=d.data();
    if(data.ruang)allRuanganSet.add(parseInt(data.ruang));
    if(data.kelas&&data.ruang){
    const kelasPrefix=data.kelas.split(".")[0];
    if(kelasPrefix===kelas)ruanganSet.add(parseInt(data.ruang));
    }
    });
    const finalRuangan=ruanganSet.size?ruanganSet:allRuanganSet;
    if(!finalRuangan.size){select.innerHTML='<option value="">Belum ada siswa terdaftar</option>';return;}
    const suffix=ruanganSet.size?"":" (semua kelas)";
    select.innerHTML='<option value="">Pilih ruangan'+suffix+'...</option>';
    Array.from(finalRuangan).sort((a,b)=>a-b).forEach(r=>{
    const opt=document.createElement("option");
    opt.value=r;opt.textContent="Ruang "+r;
    select.appendChild(opt);
    });
    }catch(e){select.innerHTML='<option value="">Gagal memuat</option>';}
    }
    window.updateRuangOptions=updateRuangOptions;
    window.openKelolaSoalModal=window.openKelolaSoalModal||function(){};
    window.handleSoalPhotoSelect=window.handleSoalPhotoSelect||function(){};
    window.removeSoalPhoto=window.removeSoalPhoto||function(){};
    window.saveJadwal=async function(){
    const mapel=document.getElementById("jadwalMapel").value.trim();
    const kelas=document.getElementById("jadwalKelas").value;
    const ruang=parseInt(document.getElementById("jadwalRuang").value)||0;
    const tanggal=document.getElementById("jadwalTanggal").value;
    const jam=parseInt(document.getElementById("jadwalJam").value)||8;
    const menit=parseInt(document.getElementById("jadwalMenit").value)||0;
    const ampm=document.getElementById("jadwalAmPm").value;
    const durasi=parseInt(document.getElementById("jadwalDurasi").value)||90;
    if(!mapel){showToast("Mata pelajaran wajib diisi","error");return;}
    if(!tanggal){showToast("Tanggal wajib diisi","error");return;}
    if(!ruang||ruang<1){showToast("Pilih nomor ruang terlebih dahulu","error");return;}
    let jam24=jam;
    if(ampm==="PM"&&jam<12)jam24=jam+12;
    if(ampm==="AM"&&jam===12)jam24=0;
    const mulaiMs=new Date(`${tanggal}T${String(jam24).padStart(2,"0")}:${String(menit).padStart(2,"0")}:00`).getTime();
    const selesaiMs=mulaiMs+(durasi*60*1000);
    const selesaiDate=new Date(selesaiMs);
    const selesai_jam=selesaiDate.getHours();
    const selesai_menit=selesaiDate.getMinutes();
    const hari=new Date(tanggal+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long"});
    showLoader("Menyimpan jadwal...");
    try{
    await addDoc(collection(db,"jadwal"),{
    mapel,kelas,ruang,tanggal,hari,jam,menit,ampm,durasi,
    jam24_mulai:jam24,selesai_jam,selesai_menit,
    mulai_timestamp:Timestamp.fromMillis(mulaiMs),
    selesai_timestamp:Timestamp.fromMillis(selesaiMs),
    soal_ready:false,panitia_ready:false,
    created_by:currentUser.nis,timestamp:Timestamp.now()
    });
    hideLoader();
    document.getElementById("jadwalModal").classList.add("hidden");
    showToast(`Jadwal Ruang ${ruang} berhasil disimpan`,"success");
    await loadJadwalList();
    await loadPanitiaDashboard();
    }catch(e){hideLoader();showToast("Gagal menyimpan jadwal","error");}
    };
    window.deleteJadwal=async function(id){
    const ok=await showConfirm("Hapus Jadwal","Hapus jadwal ini? Tindakan tidak dapat dibatalkan.","Ya, Hapus","btn-danger","");
    if(!ok)return;
    showLoader("Menghapus...");
    try{await deleteDoc(doc(db,"jadwal",id));hideLoader();showToast("Jadwal dihapus","success");await loadJadwalList();}
    catch(e){hideLoader();showToast("Gagal menghapus","error");}
    };
    async function loadPanitiaNilai(){
    const myRoom=await getPanitiaRoom();
    const myRuang=myRoom?myRoom.ruang:null;
    const myKelas=myRoom?myRoom.kelas:null;
    try{
    if(!myRuang&&!myKelas){
    document.getElementById("nilaiList").innerHTML='<div class="alert alert-warning">Anda belum ditetapkan sebagai panitia jaga. Hubungi admin untuk mendapatkan penugasan ruang.</div>';
    return;
    }
    const snap=await getDocs(query(collection(db,"nilai"),orderBy("timestamp","desc")));
    let allNilai=[];
    snap.forEach(d=>allNilai.push(d.data()));
    if(myRuang){
    // Filter berdasarkan ruang jaga panitia (int dan string fallback)
    const ruangNum=parseInt(myRuang)||0;
    const ruangStr=String(myRuang);
    allNilai=allNilai.filter(d=>d.ruang===ruangNum||String(d.ruang)===ruangStr);
    document.getElementById("panitiaRoomLabel").textContent=`Nilai siswa Ruang ${myRuang||"-"} — ${myKelas?"Kelas "+myKelas:"Semua Kelas"}`;
    }else if(myKelas){
    allNilai=allNilai.filter(d=>d.kelas&&d.kelas.startsWith(myKelas));
    document.getElementById("panitiaRoomLabel").textContent=`Nilai siswa kelas ${myKelas}`;
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
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Mapel</th><th>Nilai (Bulat)</th><th>Nilai Asli</th><th>Pelanggaran</th><th>Waktu</th></tr></thead><tbody>';
    data.forEach(d=>{
    const asli=typeof d.nilai_asli==="number"?d.nilai_asli:d.nilai||0;
    const total=(d.benar||0)+(d.salah||0)+(d.kosong||0);
    const bulat=typeof d.nilai_dibulatkan==="number"?d.nilai_dibulatkan:hitungNilaiDibulatkan(d.benar||0,total||1);
    const sc=asli>=80?"badge-green":asli>=60?"badge-yellow":"badge-red";
    html+=`<tr><td>${d.nama_lengkap}</td><td>${d.nis}</td><td>${d.kelas}</td><td>${d.mapel}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px">${formatNilai(asli)}</td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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
    if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,totalAsli:0,totalBulat:0,count:0};}
    const asli=typeof data.nilai_asli==="number"?data.nilai_asli:(typeof data.nilai==="number"?data.nilai:parseFloat(String(data.nilai).replace(",","."))||0);
    const total=(data.benar||0)+(data.salah||0)+(data.kosong||0);
    const bulat=typeof data.nilai_dibulatkan==="number"?data.nilai_dibulatkan:hitungNilaiDibulatkan(data.benar||0,total||1);
    nilaiMap[nis].totalAsli+=asli;
    nilaiMap[nis].totalBulat+=bulat;
    nilaiMap[nis].count++;
    });
    const ranked=Object.values(nilaiMap).map(u=>({...u,avg:u.count?u.totalAsli/u.count:0,avgBulat:u.count?u.totalBulat/u.count:0})).sort((a,b)=>b.avg-a.avg);
    renderRankingListFull("panitiaRankList",ranked,kelas);
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
    let html='<div class="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Kelas</th><th>Tanggal</th><th>Jam</th><th>Status Soal</th><th>Ruang Jaga</th><th>Panitia</th><th>Aksi</th></tr></thead><tbody>';
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
    html+=`<tr><td><strong>${data.mapel}</strong></td><td><span class="badge badge-blue">${data.kelas}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td>${data.soal_ready?'<span class="badge badge-green">Sudah Ada</span>':'<span class="badge badge-red">Belum Ada</span>'}</td><td>${jagaHtml}</td><td></td><td><button class="btn btn-primary btn-sm" onclick="openAssignJagaModal('${d.id}','${data.mapel}','${data.kelas}')">+ Panitia</button></td></tr>`;
    });
    html+="</tbody></table></div>";
    container.innerHTML=html;
    }catch(e){}
    }
    window.openAssignJagaModal=async function(jadwalId,mapel,kelas){
    currentAssignJadwalId={jadwalId,mapel,kelas};
    document.getElementById("assignJagaTitle").textContent=`Atur Panitia Jaga — ${mapel} (Kelas ${kelas})`;
    const ruangSelect=document.getElementById("jagaRuang");
    const panitiaSelect=document.getElementById("jagaPanitia");
    ruangSelect.innerHTML='<option value="">Memuat ruangan...</option>';
    panitiaSelect.innerHTML='<option value="">Memuat panitia...</option>';
    try{
    const [siswaSnap,panitiaSnapResult]=await Promise.all([
    getDocs(query(collection(db,"users"),where("role","==","siswa"))),
    getDocs(query(collection(db,"users"),where("role","==","panitia")))
    ]);
    const ruanganSet=new Set();
    const allRuanganSet=new Set();
    siswaSnap.forEach(d=>{
    const data=d.data();
    if(data.ruang)allRuanganSet.add(parseInt(data.ruang));
    if(data.kelas&&data.ruang){
    const kelasPrefix=data.kelas.split(".")[0];
    if(kelasPrefix===kelas)ruanganSet.add(parseInt(data.ruang));
    }
    });
    // Gunakan ruang dari kelas ini; jika tidak ada, tampilkan semua ruang terdaftar
    const finalRuangan=ruanganSet.size?ruanganSet:allRuanganSet;
    const labelSuffix=ruanganSet.size?"":" (semua kelas)";
    ruangSelect.innerHTML='<option value="">Pilih ruangan'+labelSuffix+'...</option>';
    if(!finalRuangan.size){
    ruangSelect.innerHTML='<option value="">Belum ada siswa terdaftar — tambah siswa dulu</option>';
    }else{
    Array.from(finalRuangan).sort((a,b)=>a-b).forEach(r=>{
    const opt=document.createElement("option");
    opt.value=r;opt.textContent="Ruang "+r;
    ruangSelect.appendChild(opt);
    });
    }
    panitiaSelect.innerHTML='<option value="">Pilih panitia...</option>';
    panitiaSnapResult.forEach(d=>{
    const data=d.data();
    const opt=document.createElement("option");
    opt.value=d.id;
    opt.dataset.nama=data.nama_lengkap||d.id;
    opt.textContent=`${data.nama_lengkap||d.id} (${d.id})`;
    panitiaSelect.appendChild(opt);
    });
    }catch(e){
    ruangSelect.innerHTML='<option value="">Gagal memuat</option>';
    panitiaSelect.innerHTML='<option value="">Gagal memuat</option>';
    }
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
    await updateDoc(doc(db,"jadwal",currentAssignJadwalId.jadwalId),{panitia_ready:true,updated_at:Timestamp.now()});
    hideLoader();
    document.getElementById("assignJagaModal").classList.add("hidden");
    showToast(`Panitia ${panitia_nama} ditetapkan di Ruang ${ruang}`,"success");
    await loadAdminJadwalJaga();
    await loadJadwalList();
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
    if(!users.length){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada akun terdaftar</div></div>';return;}
    const roleBadge=r=>r==="admin"?"badge-red":r==="panitia"?"badge-purple":r==="guru"?"badge-yellow":"badge-blue";
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
    document.getElementById("newUserRuangGroup").style.display=(role==="siswa"||role==="panitia")?"block":"none";
    document.getElementById("newUserRuangLabel").textContent=role==="panitia"?"No. Ruang Jaga":"No. Ruang";
    hideAlert("createUserAlert");
    document.getElementById("createUserModal").classList.remove("hidden");
    };
    window.createUser=async function(){
    const nis=document.getElementById("newUserNis").value.trim();
    const nama=document.getElementById("newUserName").value.trim();
    const kelas=document.getElementById("newUserKelas").value;
    const noAbsen=parseInt(document.getElementById("newUserNoAbsen").value||"0");
    const ruang=parseInt(document.getElementById("newUserRuang")?.value||"0");
    if(!nis||!nama){showAlert("createUserAlert","NIS dan nama wajib diisi.");return;}
    if(currentCreateRole==="siswa"&&(!kelas||!noAbsen||!ruang)){showAlert("createUserAlert","Kelas, no absen, dan ruang wajib untuk siswa.");return;}
    if(currentCreateRole==="panitia"&&!ruang){showAlert("createUserAlert","No ruang jaga wajib untuk panitia.");return;}
    document.getElementById("createUserBtn").disabled=true;
    showLoader("Membuat akun...");
    try{
    const existing=await getDoc(doc(db,"users",nis));
    if(existing.exists()){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","NIS sudah terdaftar.");return;}
    if(currentCreateRole==="siswa"){
    const allSnap=await getDocs(query(collection(db,"users"),where("role","==","siswa")));
    let dupName=false,dupAbsen=false;
    allSnap.forEach(d=>{
    const u=d.data();
    if((u.nama_lengkap||"").toLowerCase()===nama.toLowerCase())dupName=true;
    if((u.kelas===kelas)&&(parseInt(u.no_absen||0)===noAbsen))dupAbsen=true;
    });
    if(dupName){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","Nama siswa sudah terdaftar.");return;}
    if(dupAbsen){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","No absen sudah terdaftar di kelas tersebut.");return;}
    }
    const hashedPwd=await hashPassword(DEFAULT_PASSWORD);
    const userData={nama_lengkap:nama,kelas:currentCreateRole==="siswa"?kelas:currentCreateRole,role:currentCreateRole,password:hashedPwd,created_at:Timestamp.now()};
    if(currentCreateRole==="siswa"){userData.no_absen=noAbsen;userData.ruang=ruang;}else if(currentCreateRole==="panitia"){userData.ruang=ruang;}
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
    const ok=await showConfirm("Hapus Akun",`Hapus akun NIS ${nis}? Tindakan ini tidak dapat dibatalkan.`,"Ya, Hapus","btn-danger","");
    if(!ok)return;
    showLoader("Menghapus akun...");
    try{await deleteDoc(doc(db,"users",nis));hideLoader();showToast("Akun berhasil dihapus","success");await loadAdminUserList();}
    catch(e){hideLoader();showToast("Gagal menghapus akun","error");}
    };
    window.resetUserPassword=async function(nis){
    const ok=await showConfirm("Reset Password",`Reset password NIS ${nis} ke ${DEFAULT_PASSWORD}?`,"Ya, Reset","btn-primary","[KUNCI]");
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
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Mapel</th><th>Nilai (Bulat)</th><th>Nilai Asli</th><th>Benar</th><th>Salah</th><th>Pelanggaran</th><th>Waktu</th></tr></thead><tbody>';
    data.forEach(d=>{
    const asli=typeof d.nilai_asli==="number"?d.nilai_asli:d.nilai||0;
    const total=(d.benar||0)+(d.salah||0)+(d.kosong||0);
    const bulat=typeof d.nilai_dibulatkan==="number"?d.nilai_dibulatkan:hitungNilaiDibulatkan(d.benar||0,total||1);
    const sc=asli>=80?"badge-green":asli>=60?"badge-yellow":"badge-red";
    html+=`<tr><td>${d.nama_lengkap||"-"}</td><td>${d.nis||"-"}</td><td>${d.kelas||"-"}</td><td>${d.mapel||"-"}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px">${formatNilai(asli)}</td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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
    if(!nilaiMap[nis]){nilaiMap[nis]={nama:data.nama_lengkap,kelas:data.kelas,nis,totalAsli:0,totalBulat:0,count:0};}
    // Gunakan nilai_asli jika tersedia, fallback ke nilai
    const asli=typeof data.nilai_asli==="number"?data.nilai_asli:(typeof data.nilai==="number"?data.nilai:parseFloat(String(data.nilai).replace(",","."))||0);
    const total=(data.benar||0)+(data.salah||0)+(data.kosong||0);
    const bulat=typeof data.nilai_dibulatkan==="number"?data.nilai_dibulatkan:hitungNilaiDibulatkan(data.benar||0,total||1);
    nilaiMap[nis].totalAsli+=asli;
    nilaiMap[nis].totalBulat+=bulat;
    nilaiMap[nis].count++;
    });
    // avg dihitung TEPAT (tidak dibulatkan)
    const ranked=Object.values(nilaiMap).map(u=>({
        ...u,
        avg:u.count?(u.totalAsli/u.count):0, // nilai asli rata-rata
        avgBulat:u.count?(u.totalBulat/u.count):0 // nilai dibulatkan rata-rata
    })).sort((a,b)=>b.avg-a.avg);
    renderAdminRankingFull("adminRankList",ranked,kelas);
    }catch(e){}
    }
    function renderAdminRankingFull(containerId,ranked,filterKelas){
    const container=document.getElementById(containerId);if(!container)return;
    if(!ranked.length){container.innerHTML='<div class="empty-state"><div>Belum ada data peringkat</div></div>';return;}
    const levels=filterKelas?[filterKelas]:["X","XI","XII"];
    let html="";
    levels.forEach(lvl=>{
    const group=filterKelas?ranked:ranked.filter(u=>u.kelas&&u.kelas.startsWith(lvl));
    if(!group.length)return;
    html+=`<div style="margin-bottom:24px"><div style="font-family:var(--font-head);font-size:15px;font-weight:700;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 10px;font-size:12px">Tingkat ${lvl}</span><span style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${group.length} siswa</span></div>`;
    group.slice(0,50).forEach((u,i)=>{
    const numClass=i===0?"gold":i===1?"silver":i===2?"bronze":"";
    // Tampilkan rata-rata asli (tidak dibulatkan) dan rata-rata dibulatkan
    const avgAsliStr=formatNilai(u.avg); // tidak dibulatkan
    const avgBulatStr=formatNilai(Math.round(u.avgBulat)); // rata-rata nilai dibulatkan
    html+=`<div class="ranking-item">
    <div class="ranking-num ${numClass}">${i+1}</div>
    <div class="ranking-info">
    <div class="ranking-name">${u.nama}</div>
    <div class="ranking-detail">${u.nis} | ${u.kelas} | ${u.count} ujian</div>
    </div>
    <div class="ranking-score">
        ${avgBulatStr}
        <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">avg asli: ${avgAsliStr}</div>
    </div>
    </div>`;
    });
    if(group.length>50)html+=`<div style="text-align:center;font-size:11px;color:var(--text3);font-family:var(--font-mono);padding:8px">+${group.length-50} siswa lainnya</div>`;
    html+="</div>";
    });
    container.innerHTML=html;
    }
    window.loadAdminRanking=loadAdminRanking;
    window.renderAdminRankingFull=renderAdminRankingFull;
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
    const ok=await showConfirm("Reset Data","Data yang dipilih akan dihapus permanen. Admin utama tidak akan terpengaruh. Lanjutkan?","Hapus Sekarang","btn-danger","");
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
    if(document.getElementById("resetBackup")?.checked)collections.push("backups");
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
    if(tabId==="admin-ranking"){loadAdminRanking();loadRankingPublishState();}
    if(tabId==="admin-soal")loadSoalList();
    if(tabId==="admin-jadwal-ujian")loadJadwalList();
    if(tabId==="admin-jadwal")loadAdminJadwalJaga();
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
    if(tabId==="panitia-ranking"){loadPanitiaRanking();loadRankingPublishState();}
    if(tabId==="panitia-control")loadControlRuang();
    }
    window.switchAdminTab=switchAdminTab;
    window.switchStudentTab=switchStudentTab;
    window.switchPanitiaTab=switchPanitiaTab;

    // ══════════════════════════════════════════════════════════════════════
    // CONTROL RUANG — Tab khusus panitia saat jam jaga aktif
    // Muncul otomatis saat jam jaga dimulai, hilang 10 menit setelah ujian selesai
    // ══════════════════════════════════════════════════════════════════════
    let _controlRuangRoom=null;
    let _controlRuangHideTimer=null;

    async function checkAndShowControlRuangTab(){
    try{
    const room=await getPanitiaRoom();
    const tabBtn=document.getElementById("panitiaControlTab");
    const labelEl=document.getElementById("panitiaControlRuangLabel");
    if(!tabBtn)return;

    if(room&&room.jadwal){
    const jd=room.jadwal;
    const now=Date.now();
    const mulai=jd.mulai_timestamp?.toMillis?.();
    const selesai=jd.selesai_timestamp?.toMillis?.();
    const GRACE=10*60*1000; // 10 menit grace period

    if(mulai&&selesai){
    if(now>=mulai&&now<=(selesai+GRACE)){
    // Dalam jam jaga atau masih dalam grace 10 menit
    _controlRuangRoom=room;
    if(labelEl)labelEl.textContent=`(Ruang ${room.ruang})`;
    tabBtn.style.display="";
    // Jadwalkan hide tepat di selesai+10 menit
    if(_controlRuangHideTimer)clearTimeout(_controlRuangHideTimer);
    const remaining=(selesai+GRACE)-now;
    _controlRuangHideTimer=setTimeout(()=>{
    tabBtn.style.display="none";
    _controlRuangRoom=null;
    // Kalau tab ini sedang aktif, kembali ke dashboard
    if(document.getElementById("panitia-control")&&!document.getElementById("panitia-control").classList.contains("hidden")){
    const dashBtn=document.querySelector("#panitiaPage .nav-tab[data-tab='panitia-dashboard']");
    if(dashBtn)switchPanitiaTab("panitia-dashboard",dashBtn);
    }
    showToast("Tab Control Ruang disembunyikan (ujian selesai + 10 menit)","info");
    },remaining);
    return;
    }
    }
    // Jadwal ada tapi diluar jam jaga + grace
    tabBtn.style.display="none";
    _controlRuangRoom=null;
    }else if(room&&!room.jadwal){
    // Assignment ada tapi tidak ada timestamp → tampilkan saja
    _controlRuangRoom=room;
    if(labelEl)labelEl.textContent=`(Ruang ${room.ruang})`;
    tabBtn.style.display="";
    }else{
    tabBtn.style.display="none";
    _controlRuangRoom=null;
    }
    }catch(e){Log.w&&Log.w("checkAndShowControlRuangTab error: "+e);}
    }



    async function loadControlRuang(){
    if(!_controlRuangRoom){await checkAndShowControlRuangTab();}
    const room=_controlRuangRoom;
    const statusEl=document.getElementById("panitiaControlExamStatus");
    const siswaEl=document.getElementById("panitiaControlSiswaList");
    const violEl=document.getElementById("panitiaControlViolationList");
    const titleEl=document.getElementById("panitiaControlTitle");
    const subtitleEl=document.getElementById("panitiaControlSubtitle");
    const bannerEl=document.getElementById("panitiaControlBanner");
    if(!room){
    if(statusEl)statusEl.innerHTML='<div class="empty-state"><div>Anda tidak sedang dalam jam jaga aktif</div></div>';
    if(siswaEl)siswaEl.innerHTML="";
    if(violEl)violEl.innerHTML="";
    return;
    }
    const ruang=room.ruang;
    const jd=room.jadwal;
    if(titleEl)titleEl.textContent=`Control Ruang ${ruang}`;
    if(subtitleEl)subtitleEl.textContent=`${jd?.mapel||"-"} — Kelas ${jd?.kelas||"-"} | Ruang ${ruang}`;

    // Status ujian
    if(statusEl&&jd){
    const now=Date.now();
    const mulai=jd.mulai_timestamp?.toMillis?.();
    const selesai=jd.selesai_timestamp?.toMillis?.();
    const GRACE=10*60*1000;
    let statusHtml="";
    if(mulai&&selesai){
    if(now<mulai){
    const selisih=Math.ceil((mulai-now)/60000);
    statusHtml=`<span class="badge badge-blue">Belum Mulai — ${selisih} menit lagi</span>`;
    }else if(now>=mulai&&now<=selesai){
    const sisa=Math.ceil((selesai-now)/60000);
    statusHtml=`<span class="badge badge-green">&#9679; UJIAN BERLANGSUNG — Sisa ${sisa} menit</span>`;
    }else if(now<=selesai+GRACE){
    const sisa=Math.ceil((selesai+GRACE-now)/60000);
    statusHtml=`<span class="badge badge-red">Ujian Selesai — Tab hilang dalam ${sisa} menit</span>`;
    }else{
    statusHtml=`<span class="badge">Ujian Selesai</span>`;
    }
    }
    statusEl.innerHTML=statusHtml||"<span class='badge'>Status tidak diketahui</span>";
    }
    if(bannerEl){
    bannerEl.textContent=`Ruang ${ruang} | ${jd?.mapel||"-"} | Kelas ${jd?.kelas||"-"}`;
    bannerEl.style.display="block";
    }

    // Daftar siswa di ruang ini
    try{
    // Query siswa dengan int dan string fallback (type safety Firestore)
    const ruangInt=parseInt(ruang)||0;
    const ruangStr=String(ruang);
    const [snapInt,snapStr]=await Promise.all([
    getDocs(query(collection(db,"users"),where("ruang","==",ruangInt),where("role","==","siswa"))),
    getDocs(query(collection(db,"users"),where("ruang","==",ruangStr),where("role","==","siswa")))
    ]);
    const seenNis=new Set();
    const siswaList=[];
    [...snapInt.docs,...snapStr.docs].forEach(d=>{
    // NIS adalah document ID di Firestore, bukan field dalam data
    const nis=d.id||(d.data().nis)||null;
    const userData={...d.data(),nis:nis};
    if(nis&&!seenNis.has(nis)){seenNis.add(nis);siswaList.push(userData);}
    });
    if(siswaList.length===0){
    if(siswaEl)siswaEl.innerHTML='<div class="empty-state"><div>Tidak ada siswa terdaftar di ruang ini</div></div>';
    }else{
    // Ambil status: nilai (selesai), exam_progress (mengerjakan), siswa_lock (terkunci)
    // Query nilai by jadwal_id agar tidak tercampur data ujian lain
    const jadwalId=jd?.id||room?.jadwal_id||null;
    const [nilaiSnap,progSnap,lockSnap]=await Promise.all([
    jadwalId?getDocs(query(collection(db,"nilai"),where("jadwal_id","==",jadwalId))):getDocs(collection(db,"nilai")),
    getDocs(collection(db,"exam_progress")),
    getDocs(collection(db,"siswa_lock"))
    ]);
    const nilaiMap={};
    nilaiSnap.forEach(d=>{const nd=d.data();if(seenNis.has(nd.nis))nilaiMap[nd.nis]=nd;});
    const progMap={};
    progSnap.forEach(d=>{
    // doc ID format: "nis_soalId" - extract NIS dari doc ID
    const docNis=d.data().nis||(d.id.includes("_")?d.id.split("_")[0]:d.id);
    if(seenNis.has(docNis))progMap[docNis]=d.data();
    });
    const lockMap={};
    lockSnap.forEach(d=>{lockMap[d.id]=d.data();});
    // Urutkan: terkunci > mengerjakan > belum mulai > selesai
    siswaList.sort((a,b)=>{
    const ord=u=>{const l=lockMap[u.nis];const n=nilaiMap[u.nis];const p=progMap[u.nis];
    if(l?.locked)return 0;if(p&&!n)return 1;if(!p&&!n)return 2;return 3;};
    return ord(a)-ord(b);
    });
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Status</th><th>Pelanggaran</th></tr></thead><tbody>';
    siswaList.forEach(u=>{
    const nilai=nilaiMap[u.nis];
    const prog=progMap[u.nis];
    const lock=lockMap[u.nis];
    let statusBadge;
    if(lock?.locked){
    // Cek apakah ini karena keluar/exit atau pelanggaran biasa
    const lockReason=lock.reason||"";
    const isExit=lockReason.toLowerCase().includes("keluar")||lockReason.toLowerCase().includes("exit")||lockReason.toLowerCase().includes("minimize");
    if(isExit){
    statusBadge='<span class="badge badge-red">&#128683; Keluar Aplikasi</span>';
    }else{
    statusBadge='<span class="badge badge-red">&#128274; Terkunci</span>';
    }
    }else if(nilai){
    statusBadge='<span class="badge badge-green">&#10003; Selesai</span>';
    }else if(prog){
    statusBadge='<span class="badge badge-blue">&#9679; Sedang Mengerjakan</span>';
    }else{
    statusBadge='<span class="badge" style="color:var(--text3)">&#9711; Belum Mulai</span>';
    }
    const pelCount=nilai?.pelanggaran||prog?.violation_count||0;
    const pelBadge=pelCount>0?`<span class="badge badge-red">${pelCount}</span>`:'<span class="badge badge-green">0</span>';
    html+=`<tr><td>${u.nama_lengkap||"-"}</td><td>${u.nis||"-"}</td><td>${u.kelas||"-"}</td><td>${statusBadge}</td><td>${pelBadge}</td></tr>`;
    });
    html+="</tbody></table></div>";
    if(siswaEl)siswaEl.innerHTML=html;
    }
    }catch(e){console.error("loadControlRuang siswa error:",e);if(siswaEl)siswaEl.innerHTML=`<div class="empty-state"><div>Gagal memuat data siswa: ${e.message||e}</div></div>`;}

    // Pelanggaran di ruang ini
    try{
    // Ambil semua pelanggaran tanpa orderBy agar tidak butuh composite index Firestore
    // Filter & sort dilakukan di sisi klien
    const qNum=query(collection(db,"pelanggaran"),where("ruang","==",ruang));
    const qStr=query(collection(db,"pelanggaran"),where("ruang","==",String(ruang)));
    const [snapNum,snapStr]=await Promise.all([getDocs(qNum),getDocs(qStr)]);
    // Gabung hasil, deduplikasi by doc id
    const seenIds=new Set();
    const allDocs=[];
    [...snapNum.docs,...snapStr.docs].forEach(d=>{if(!seenIds.has(d.id)){seenIds.add(d.id);allDocs.push(d);}});
    // Sort by timestamp desc
    allDocs.sort((a,b)=>{
    const ta=a.data().timestamp?.toMillis?.()??0;
    const tb=b.data().timestamp?.toMillis?.()??0;
    return tb-ta;
    });
    const limited=allDocs.slice(0,20);
    if(limited.length===0){
    if(violEl)violEl.innerHTML='<div class="empty-state"><div>Tidak ada pelanggaran di ruang ini</div></div>';
    }else{
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jenis</th><th>Jumlah</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead><tbody>';
    limited.forEach(d=>{
    const data=d.data();
    const statusBadge=data.unlocked?'<span class="badge badge-green">Dibuka</span>':'<span class="badge badge-red">Terkunci</span>';
    const waktu=data.timestamp?formatWIBShort(data.timestamp):"-";
    const actionBtn=!data.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none" onclick="openUnlockModal('${data.nis}','${data.nama_lengkap||data.nis}','')">Buka Kunci</button>`:'<span style="font-size:11px;color:var(--text3)">-</span>';
    html+=`<tr><td>${data.nama_lengkap||"-"}</td><td><span class="violation-badge">${data.jenis_pelanggaran||"-"}</span></td><td><span class="badge badge-red">${data.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${waktu}</td><td>${actionBtn}</td></tr>`;
    });
    html+="</tbody></table></div>";
    if(violEl)violEl.innerHTML=html;
    }
    }catch(e){
    console.error("loadControlRuang violation error:",e);
    if(violEl)violEl.innerHTML=`<div class="empty-state"><div>Gagal memuat pelanggaran: ${e.message||e}</div></div>`;
    }
    }
    window.loadControlRuang=loadControlRuang;
    window.refreshControlRuang=loadControlRuang;
    // Hitung nilai asli (tidak dibulatkan) berdasarkan jumlah soal
    // Algoritma: cari point per soal agar nilai maks PALING DEKAT ke 100 tanpa melebihi
    // misal 10 soal → 10 poin/soal (maks=100), 11 soal → 9 poin/soal (maks=99), dst
    function hitungPointPerSoal(total){
        if(!total||total===0)return 0;
        // Cari bilangan bulat p sehingga p*total <= 100 dan p*total maksimal
        // p = floor(100/total)
        const p=Math.floor(100/total);
        return p<1?1:p;
    }
    function hitungNilaiAsli(benar,total){
        // Nilai asli: benar * pointPerSoal, TIDAK dibulatkan
        if(!total||total===0)return 0;
        const pps=hitungPointPerSoal(total);
        return benar*pps; // nilai asli, presisi penuh (bisa < 100 jika total tidak habis bagi 100)
    }
    function hitungNilai(benar,total){
        // Untuk backward compat: kembalikan nilai asli (tidak dibulatkan)
        return hitungNilaiAsli(benar,total);
    }
    function hitungNilaiDibulatkan(benar,total){
        // Nilai dibulatkan ke kelipatan 5 terdekat ke atas
        const asli=hitungNilaiAsli(benar,total);
        if(asli===0)return 0;
        const mod=asli%5;
        return mod===0?asli:asli+(5-mod);
    }
    function formatNilaiAsliDisplay(benar,total){
        // Tampilkan "nilai_dibulatkan (nilai_asli)" jika beda
        const asli=hitungNilaiAsli(benar,total);
        const bulat=hitungNilaiDibulatkan(benar,total);
        if(asli===bulat)return formatNilai(asli);
        return `${formatNilai(bulat)} <span style="font-size:10px;color:var(--text3)">(asli: ${formatNilai(asli)})</span>`;
    }
    function formatNilai(n){
    if(n===undefined||n===null)return "0";
    const s=String(n);
    return s.includes(".")?s.replace(".",","):s;
    }
    const _EXAM_ENC_KEY="PATLAS_14_DEPOK_2025_SECURE_KEY_";
    async function _getAESKey(){
    const raw=new TextEncoder().encode(_EXAM_ENC_KEY.padEnd(32,"0").slice(0,32));
    return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
    }
    async function _aesEncrypt(obj){
    try{
    const key=await _getAESKey();
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(obj));
    const enc=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,data);
    const combined=new Uint8Array(12+enc.byteLength);
    combined.set(iv,0);combined.set(new Uint8Array(enc),12);
    return btoa(String.fromCharCode(...combined));
    }catch(e){return null;}
    }
    async function _aesDecrypt(b64){
    try{
    const combined=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const iv=combined.slice(0,12);const enc=combined.slice(12);
    const key=await _getAESKey();
    const dec=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,enc);
    return JSON.parse(new TextDecoder().decode(dec));
    }catch(e){return null;}
    }
    let _progressSaveTimer=null;
    async function checkAndApplyLock(){
    try{
    const lockDoc=await getDoc(doc(db,"siswa_lock",currentUser.nis));
    if(lockDoc.exists()&&lockDoc.data().locked===true){
    const lockData=lockDoc.data();
    const jadwalId=lockData.jadwal_id;
    if(jadwalId){
    try{
    const jdDoc=await getDoc(doc(db,"jadwal",jadwalId));
    if(jdDoc.exists()){
    const jd=jdDoc.data();
    const selesaiMs=jd.selesai_timestamp?.toMillis?.();
    if(selesaiMs&&Date.now()>selesaiMs){
    await updateDoc(doc(db,"siswa_lock",currentUser.nis),{locked:false,auto_unlocked_at:Timestamp.now(),unlock_reason:"Waktu ujian telah berakhir"});
    return;
    }
    }
    }catch(e){}
    }
    showLockScreen(lockData.reason||"Akun Anda terkunci karena pelanggaran.");
    startLockListener(currentUser.nis);
    throw new Error("LOCKED");
    }
    }catch(e){if(e.message==="LOCKED")throw e;}
    }
    function showLockScreen(reason){
    if(examTimer)clearInterval(examTimer);
    document.body.classList.remove("exam-mode");
    removeAntiCheat();
    document.querySelectorAll(".page").forEach(p=>{p.classList.remove("active");p.style.display="none";});
    const lockDiv=document.createElement("div");
    lockDiv.id="lockScreen";
    lockDiv.style.cssText="position:fixed;inset:0;background:#0a0000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;font-family:monospace;color:#ef4444;text-align:center;padding:24px;z-index:2147483647;pointer-events:auto !important";
    lockDiv.innerHTML=`<div style="font-size:72px;animation:pulse 1.5s infinite">[KUNCI]</div>
    <div style="font-size:22px;font-weight:bold;letter-spacing:2px">AKUN TERKUNCI</div>
    <div style="font-size:13px;color:#aaa;max-width:360px;line-height:1.6">${reason}</div>
    <div style="font-size:11px;color:#666;margin-top:8px;border:1px solid #333;padding:10px 16px;border-radius:8px">Hubungi ${appMode==='ulangan'?'guru':'panitia jaga'} di ruangan Anda untuk membuka kunci.</div>
    <button id="lockReturnBtn" disabled
      style="margin-top:18px;padding:12px 28px;background:#222;color:#555;border:1px solid #444;border-radius:10px;font-size:14px;font-weight:600;cursor:not-allowed;transition:all 0.3s;pointer-events:auto">Menunggu ${appMode==='ulangan'?'guru':'panitia'} membuka...</button>
    <button id="lockRefreshBtn"
      style="margin-top:8px;padding:8px 20px;background:transparent;color:#555;border:1px solid #333;border-radius:8px;font-size:12px;font-family:monospace;cursor:pointer;transition:all 0.3s;pointer-events:auto">&#8635; Cek ulang status kunci</button>`;
    // FIX: Reset pointer-events body SEBELUM append lockDiv,
    // agar tombol di dalam lockDiv bisa diklik (body inline style override child)
    document.body.style.pointerEvents="";
    document.body.style.removeProperty("pointer-events");
    document.body.classList.remove("exam-mode");
    document.body.appendChild(lockDiv);
    // Pasang event listener setelah append (onclick inline tidak berfungsi jika body.pointerEvents=none)
    const _lockBtn=document.getElementById("lockReturnBtn");
    if(_lockBtn)_lockBtn.addEventListener("click",function(){if(!this.disabled)_doResumeAfterUnlock();});
    // Tombol refresh — cek ulang status kunci ke Firestore secara manual (real-time fresh read)
    const _refreshBtn=document.getElementById("lockRefreshBtn");
    if(_refreshBtn)_refreshBtn.addEventListener("click",async function(){
      _refreshBtn.textContent="Mengecek...";_refreshBtn.style.color="#fff";_refreshBtn.disabled=true;
      try{
        // Force fresh read (bypass cache) menggunakan getDocFromServer
        let snap;
        try{snap=await getDoc(doc(db,"siswa_lock",currentUser.nis));}catch(e2){snap=null;}
        // Cek: dokumen tidak ada (belum pernah dikunci) ATAU locked===false (sudah dibuka)
        const isUnlocked=!snap||!snap.exists()||snap.data().locked===false;
        if(isUnlocked){
          // Sudah dibuka — hentikan listener dan resume
          if(_lockListener){_lockListener();_lockListener=null;}
          const lockDiv=document.getElementById("lockScreen");
          if(lockDiv)lockDiv.remove();
          document.querySelectorAll(".page").forEach(p=>{p.style.display="";});
          _doResumeAfterUnlock();
        }else{
          _refreshBtn.disabled=false;
          _refreshBtn.textContent="&#8635; Cek ulang status kunci";
          const pembuka=appMode==='ulangan'?'guru':'panitia';
          showToast(`Masih terkunci. Hubungi ${pembuka} untuk membuka kunci.`,"error",3500);
        }
      }catch(e){
        _refreshBtn.disabled=false;
        _refreshBtn.textContent="&#8635; Cek ulang status kunci";
        showToast("Gagal mengecek status. Coba lagi.","error",3000);
      }
    });
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.lockExam();}catch(e){}}
    }
    // Realtime listener: pantau Firestore siswa_lock untuk auto-unlock saat panitia buka kunci
    let _lockListener = null;
    function startLockListener(nis){
    if(_lockListener)_lockListener();
    try{
    _lockListener=onSnapshot(doc(db,"siswa_lock",nis),snap=>{
    // Hanya unlock jika dokumen ada DAN locked sudah di-set false oleh panitia
    // Jika dokumen belum ada (!snap.exists()), berarti belum diproses — tetap terkunci
    if(snap.exists()&&snap.data().locked===false){
    if(_lockListener){_lockListener();_lockListener=null;}
    // Enable tombol di lockScreen (background hitam)
    const btn=document.getElementById("lockReturnBtn");
    if(btn){
    btn.disabled=false;
    btn.style.background="var(--accent,#3b82f6)";
    btn.style.color="#fff";
    btn.style.border="1px solid var(--accent,#3b82f6)";
    btn.style.cursor="pointer";
    btn.style.pointerEvents="auto";
    btn.textContent="Kembali ke Ujian";
    btn.onclick=null;
    btn.addEventListener("click",function _unlock(){
    btn.removeEventListener("click",_unlock);
    _doResumeAfterUnlock();
    },{once:true});
    }
    // Enable juga tombol Refresh di violationWarning (background merah)
    const vBtn=document.getElementById("violationRefreshBtn");
    if(vBtn){
    const nvBtn=vBtn.cloneNode(true);
    vBtn.parentNode.replaceChild(nvBtn,vBtn);
    nvBtn.style.pointerEvents="auto";
    nvBtn.textContent="Kembali ke Ujian";
    nvBtn.disabled=false;
    nvBtn.style.opacity="1";
    nvBtn.style.cursor="pointer";
    nvBtn.addEventListener("click",function(){
    const warn=document.getElementById("violationWarning");
    if(warn)warn.classList.add("hidden");
    document.body.style.pointerEvents="";
    _doResumeAfterUnlock();
    },{once:true});
    }
    showToast("Panitia telah membuka kunci. Klik \"Kembali ke Ujian\".","success",5000);
    if(!btn&&!vBtn){_doResumeAfterUnlock();}
    }
    });
    }catch(e){}
    }

    window.handleLockReturn=function(){
    _doResumeAfterUnlock();
    };
    function _doResumeAfterUnlock(){
    const lockScreen=document.getElementById("lockScreen");
    if(lockScreen)lockScreen.remove();
    const warn=document.getElementById("violationWarning");
    if(warn)warn.classList.add("hidden");
    // Reset pointerEvents — sempat di-none saat lockExam
    document.body.style.pointerEvents="";
    document.body.style.setProperty("pointer-events","","important");
    // Beritahu Android: restart VPN (ujian masih aktif) + buka kiosk
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.onScreenUnlocked();}catch(e){}}
    showToast("Kunci dibuka. Anda dapat melanjutkan ujian.","success");
    if(currentExam&&currentUser){
    renderQuestion(currentQuestion);
    document.body.classList.add("exam-mode");
    setupAntiCheat();
    saveLocalExamSession();
    }
    }
    let _progressSaveDebounce=null;
    function scheduleProgressSave(){
    saveLocalExamSession();
    // Debounce server save: simpan ke Firestore 3 detik setelah aktivitas terakhir
    if(_progressSaveDebounce)clearTimeout(_progressSaveDebounce);
    _progressSaveDebounce=setTimeout(()=>saveProgressToServer(),3000);
    }
    // Dipanggil dari Android saat deteksi overlay app aktif
    // FIX: Overlay TIDAK dianggap pelanggaran — hanya tampilkan peringatan.
    // Banyak app (Meet, Automate, GPS Palsu, dll) punya izin SYSTEM_ALERT_WINDOW
    // tanpa benar-benar menampilkan floating window — tidak boleh langsung dikunci.
    window.showOverlayWarning=function(appNames){
    showToast("⚠️ App overlay terdeteksi: "+appNames+". Pastikan tidak ada floating window aktif.","warning",10000);
    };
    function _encodeSession(obj){
    try{
    const str=JSON.stringify(obj);
    const b64=btoa(unescape(encodeURIComponent(str)));
    const rotated=b64.split("").map((c,i)=>String.fromCharCode(c.charCodeAt(0)^(0x5A^(i%7)))).join("");
    return btoa(rotated);
    }catch(e){return null;}
    }
    function _decodeSession(enc){
    try{
    const rotated=atob(enc);
    const b64=rotated.split("").map((c,i)=>String.fromCharCode(c.charCodeAt(0)^(0x5A^(i%7)))).join("");
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
    }catch(e){return null;}
    }
    function saveLocalExamSession(){
    if(!currentUser||!currentExam)return;
    try{
    const payload={
    nis:currentUser.nis,role:currentUser.role||"siswa",
    examId:currentExam.id,mapel:currentExam.mapel,
    jawaban:examAnswers,flagged:Array.from(flaggedQuestions),
    currentQuestion,violationCount,violations:examViolations,
    ts:Date.now()
    };
    _aesEncrypt(payload).then(enc=>{
    if(enc)localStorage.setItem("patlas_exam_sess_v2",enc);
    });
    try{
    const sess=localStorage.getItem("patlas_session");
    if(sess){const s=JSON.parse(sess);s.ts=Date.now();localStorage.setItem("patlas_session",JSON.stringify(s));}
    else{localStorage.setItem("patlas_session",JSON.stringify({nis:currentUser.nis,role:"siswa",ts:Date.now()}));}
    }catch(e){}
    }catch(e){}
    }
    function loadLocalExamSession(nis,examId){
    return null;
    }
    async function loadLocalExamSessionAsync(nis,examId){
    try{
    const enc=localStorage.getItem("patlas_exam_sess_v2");
    if(!enc)return null;
    const data=await _aesDecrypt(enc);
    if(!data)return null;
    if(data.nis!==nis||data.examId!==examId)return null;
    if(Date.now()-data.ts>24*60*60*1000){localStorage.removeItem("patlas_exam_sess_v2");return null;}
    return data;
    }catch(e){return null;}
    }
    function clearLocalExamSession(){
    try{localStorage.removeItem("patlas_exam_sess");localStorage.removeItem("patlas_exam_sess_v2");}catch(e){}
    }
    async function saveProgressToServer(){
    if(!currentUser||!currentExam)return;
    saveLocalExamSession();
    try{
    const progressId=currentUser.nis+"_"+currentExam.id;
    await setDoc(doc(db,"exam_progress",progressId),{
    nis:currentUser.nis,soal_id:currentExam.id,mapel:currentExam.mapel,
    ruang:parseInt(currentUser.ruang||0),jadwal_id:currentExam.jadwal_id||currentExam.id,
    nama_lengkap:currentUser.nama_lengkap,kelas:currentUser.kelas,
    jawaban:examAnswers,flagged:Array.from(flaggedQuestions),
    current_question:currentQuestion,violation_count:violationCount,
    violations:examViolations,updated_at:Timestamp.now()
    },{merge:true});
    }catch(e){}
    }
    window.refreshAdminPage=async function(){
    showLoader("Memuat ulang...");
    try{
    await loadAdminDashboard();
    await loadAdminJadwalJaga();
    await loadSoalList();
    await loadJadwalList();
    }catch(e){}
    hideLoader();showToast("Halaman diperbarui","info");
    };
    window.refreshPanitiaPage=async function(){
    showLoader("Memuat ulang...");
    try{
    await loadPanitiaDashboard();
    await loadSoalList();
    await loadJadwalList();
    await loadPanitiaNilai();
    await loadPanitiaViolations();
    await checkPanitiaNotifications();
    }catch(e){}
    hideLoader();showToast("Halaman diperbarui","info");
    };
    window.refreshGuruPage=async function(){
    showLoader("Memuat ulang...");
    try{
    await loadGuruDashboard();
    await loadGuruSoal();
    await loadGuruJadwal();
    if(appMode==='ulangan')await loadGuruControlInit();
    }catch(e){}
    hideLoader();showToast("Halaman diperbarui","info");
    };
    window.refreshStudentPage=async function(){
    showLoader("Memuat ulang...");
    try{
    if(currentUser)await checkAndApplyLock().catch(()=>{});
    await loadStudentDashboard();
    }catch(e){}
    hideLoader();showToast("Halaman diperbarui","info");
    };
    function downloadCSV(rows,filename){
    const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n");
    const bom="\uFEFF";
    const blob=new Blob([bom+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;a.click();
    URL.revokeObjectURL(url);
    }

    window.loadRankingPublishState=async function(){
    try{
    const cfg=await getDoc(doc(db,"settings","publikasi_ranking"));
    const today=new Date().toISOString().slice(0,10);
    let aktif=cfg.exists()?Boolean(cfg.data().aktif):false;
    // Auto-hide jika sudah ganti hari
    if(aktif&&cfg.data().tanggal&&cfg.data().tanggal!==today){
        aktif=false;
        await setDoc(doc(db,"settings","publikasi_ranking"),{...cfg.data(),aktif:false,auto_hidden:true,auto_hidden_at:Timestamp.now()});
    }
    ["rankPublishBtn","panitiaRankPublishBtn"].forEach(id=>{
    const btn=document.getElementById(id);
    if(!btn)return;
    btn.textContent=aktif?"Privat Peringkat":"Publikasi Peringkat";
    btn.className=aktif?"btn btn-secondary btn-sm":"btn btn-success btn-sm";
    });
    }catch(e){}
    };
    window.toggleRankingVisibility=async function(){
    showLoader("Mengubah status...");
    try{
    const cfg=await getDoc(doc(db,"settings","publikasi_ranking"));
    const curr=cfg.exists()?Boolean(cfg.data().aktif):false;
    const today=new Date().toISOString().slice(0,10);
    await setDoc(doc(db,"settings","publikasi_ranking"),{aktif:!curr,tanggal:today,updated_by:currentUser?.nis||"-",updated_at:Timestamp.now()});
    ["rankPublishBtn","panitiaRankPublishBtn"].forEach(id=>{
    const btn=document.getElementById(id);
    if(!btn)return;
    btn.textContent=!curr?"Privat Peringkat":"Publikasi Peringkat";
    btn.className=!curr?"btn btn-secondary btn-sm":"btn btn-success btn-sm";
    });
    hideLoader();
    showToast(!curr?"Peringkat dipublikasikan ke siswa":"Peringkat dinonaktifkan dari siswa","success");
    }catch(e){hideLoader();showToast("Gagal mengubah status peringkat","error");}
    };
    window.loadScorePublishingState=async function(){
        try{
            const cfg=await getDoc(doc(db,"settings","publikasi_nilai"));
            const today=new Date().toISOString().slice(0,10);
            let aktif=cfg.exists()?Boolean(cfg.data().aktif):false;
            // Auto-hide jika sudah ganti hari
            if(aktif&&cfg.exists()&&cfg.data().tanggal&&cfg.data().tanggal!==today){
                aktif=false;
                await setDoc(doc(db,"settings","publikasi_nilai"),{...cfg.data(),aktif:false,auto_hidden:true,auto_hidden_at:Timestamp.now()});
            }
            const btn=document.getElementById("publishBtn");
            if(btn){
                btn.textContent=aktif?"Privat Nilai":"Publikasi Nilai";
                btn.className=aktif?"btn btn-secondary":"btn btn-success";
            }
        }catch(e){console.log("Error loading publishing state");}
    };

    window.toggleScorePublishing=async function(){
        showLoader("Mengubah status...");
        try{
            const cfg=await getDoc(doc(db,"settings","publikasi_nilai"));
            const curr=cfg.exists()?Boolean(cfg.data().aktif):false;
            const today=new Date().toISOString().slice(0,10);
            await setDoc(doc(db,"settings","publikasi_nilai"),{aktif:!curr,tanggal:today,updated_by:currentUser?.nis||"-",updated_at:Timestamp.now()});
            const btn=document.getElementById("publishBtn");
            if(btn){
                btn.textContent=!curr?"Privat Nilai":"Publikasi Nilai";
                btn.className=!curr?"btn btn-secondary":"btn btn-success";
            }
            hideLoader();
            showToast(!curr?"Nilai dipublikasikan ke siswa":"Publikasi nilai dinonaktifkan","success");
        }catch(e){hideLoader();showToast("Gagal mengubah publikasi nilai","error");}
    };

    async function loadAdminPage(){
        showPage("adminPage");
        buildUserChip("adminUserChip",currentUser);
        document.getElementById("adminGreeting").textContent=`Login sebagai ${currentUser.nama_lengkap||currentUser.nis}`;
        buildThemeGrid("adminThemeGrid");
        renderAccountInfo("adminAccountInfo",currentUser);
        await loadAppMode();
        await loadScorePublishingState();
        await loadRankingPublishState();
        await loadAdminDashboard();
        await loadAdminJadwalJaga();
        await loadBackupList();
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
    // ══════════════════════════════════════════════════════════════
    // V2L — VERIFIKASI WAJAH SYSTEM
    // ══════════════════════════════════════════════════════════════

    // Deteksi mobile vs desktop
    function isMobileDevice(){
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||
             (navigator.maxTouchPoints>1&&/MacIntel/.test(navigator.platform));
    }

    // Generate token unik per akun + waktu (rotasi setiap 60 detik)
    function generateQrToken(nis,round){
      const base=nis+"_PATLAS_V2L_"+round+"_SECRET_14DEPOK";
      let h=0;
      for(let i=0;i<base.length;i++){h=((h<<5)-h)+base.charCodeAt(i);h|=0;}
      const hex=Math.abs(h).toString(16).padStart(8,"0");
      return "V2L-"+nis+"-"+round+"-"+hex.toUpperCase();
    }

    function getCurrentQrRound(){
      return Math.floor(Date.now()/60000);
    }

    // Draw QR code ke canvas (implementasi manual sederhana)
    function drawQrCanvas(canvasId, text){
      const canvas=document.getElementById(canvasId);
      if(!canvas)return;
      const ctx=canvas.getContext("2d");
      const W=canvas.width, H=canvas.height;
      ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#000";
      // Simple pattern based on text hash — visual QR-like
      const seed=Array.from(text).reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0),0);
      const CELLS=21;
      const cellW=Math.floor(W/CELLS);
      const cellH=Math.floor(H/CELLS);
      const mt=Math.floor((W-cellW*CELLS)/2);
      const ml=Math.floor((H-cellH*CELLS)/2);

      // Finder patterns
      function drawFinder(x,y){
        ctx.fillStyle="#000";
        ctx.fillRect(mt+x*cellW,ml+y*cellH,7*cellW,7*cellH);
        ctx.fillStyle="#fff";
        ctx.fillRect(mt+(x+1)*cellW,ml+(y+1)*cellH,5*cellW,5*cellH);
        ctx.fillStyle="#000";
        ctx.fillRect(mt+(x+2)*cellW,ml+(y+2)*cellH,3*cellW,3*cellH);
      }
      drawFinder(0,0);drawFinder(14,0);drawFinder(0,14);

      // Data modules from hash
      let rng=Math.abs(seed);
      for(let row=0;row<CELLS;row++){
        for(let col=0;col<CELLS;col++){
          if((row<8&&col<8)||(row<8&&col>12)||(row>12&&col<8))continue;
          rng=((rng*1664525)+1013904223)>>>0;
          if(rng%3===0){
            ctx.fillStyle="#000";
            ctx.fillRect(mt+col*cellW,ml+row*cellH,cellW,cellH);
          }
        }
      }
      // Border
      ctx.strokeStyle="#e5e7eb";ctx.lineWidth=1;
      ctx.strokeRect(0,0,W,H);
    }

    // Ambil V2L data akun dari Firestore
    async function getV2LData(nis){
      try{
        const d=await getDoc(doc(db,"v2l_faces",nis));
        if(d.exists())return d.data();
        return null;
      }catch(e){return null;}
    }

    // Simpan V2L data ke Firestore
    async function saveV2LData(nis, data){
      await setDoc(doc(db,"v2l_faces",nis),{...data,updated_at:Timestamp.now()});
    }

    // Render status V2L di halaman settings
    async function renderV2LSettings(role){
      if(!currentUser)return;
      const nis=currentUser.nis;
      const roleSuffix=role.charAt(0).toUpperCase()+role.slice(1);
      const dot=document.getElementById("v2lDot"+roleSuffix);
      const statusText=document.getElementById("v2lStatusText"+roleSuffix);
      const toggle=document.getElementById("v2lToggle"+roleSuffix);
      if(!dot||!statusText||!toggle)return;

      const v2l=await getV2LData(nis);
      const hasFace=v2l&&v2l.faces&&v2l.faces.length>0;
      const isEnabled=v2l&&v2l.enabled===true;

      dot.className="v2l-face-dot"+(hasFace?" stored":" empty");
      statusText.textContent=hasFace
        ?`✅ ${v2l.faces.length} data wajah tersimpan — terenkripsi`
        :"Belum ada data wajah tersimpan";

      toggle.disabled=!hasFace;
      toggle.checked=isEnabled&&hasFace;
    }

    // Toggle V2L on/off
    window.toggleV2L=async function(role, val){
      if(!currentUser)return;
      const nis=currentUser.nis;
      const v2l=await getV2LData(nis);
      if(!v2l||!v2l.faces||!v2l.faces.length){
        const roleSuffix=role.charAt(0).toUpperCase()+role.slice(1);
        const toggle=document.getElementById("v2lToggle"+roleSuffix);
        if(toggle){toggle.checked=false;toggle.disabled=true;}
        showToast("Tambahkan data wajah terlebih dahulu","warning");
        return;
      }
      await saveV2LData(nis,{...v2l,enabled:val});
      showToast(val?"Verifikasi wajah diaktifkan ✅":"Verifikasi wajah dinonaktifkan","info");
    };

    // Buka modal tambah wajah
    window.openAddFaceModal=function(role){
      // Cek apakah desktop
      if(!isMobileDevice()){
        // Desktop boleh tapi perlu peringatan
        const warn=document.getElementById("v2lDesktopWarn");
        if(warn)warn.style.display="block";
      } else {
        const warn=document.getElementById("v2lDesktopWarn");
        if(warn)warn.style.display="none";
      }
      document.getElementById("v2lConsentCheck").checked=false;
      document.getElementById("v2lConfirmPwd").value="";
      document.getElementById("v2lModalStep1").style.display="block";
      document.getElementById("v2lModalStep2").style.display="none";
      document.getElementById("v2lModal").classList.remove("hidden");
      document.getElementById("v2lModal")._role=role;
    };

    // Lanjutkan ke kamera setelah consent
    // ─── V2L AUTO-DETECT SYSTEM — face-api.js + TF.js ───
    let _v2lStream=null;
    let _v2lVerifyStream=null;
    let _v2lAutoDetectRAF=null;
    let _v2lVerifyAutoRAF=null;
    let _v2lCapturing=false;
    let _v2lVerifying=false;
    let _faceApiReady=false;
    let _faceApiLoading=false;

    // Deteksi base path secara otomatis (local file, APK assets, Vercel, dll)
    const _getBasePath=(()=>{
      const loc=window.location;
      // file:// protocol → APK/local
      if(loc.protocol==="file:"){
        // Ambil direktori dari path file
        const p=loc.pathname.replace(/\/[^\/]*$/,"")||"/";
        return "file://"+p;
      }
      // http/https → ambil base URL tanpa filename
      const base=loc.origin+loc.pathname.replace(/\/[^\/]*$/,"");
      return base;
    })();
    const FACEAPI_LOCAL=_getBasePath+"/face-api.min.js";
    const FACEAPI_CDN="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    const FACEAPI_MODELS_LOCAL=_getBasePath+"/models";
    const FACEAPI_MODELS_CDN="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
    // Akan diisi saat load — mana yang berhasil
    let FACEAPI_MODELS=FACEAPI_MODELS_LOCAL;

    // Load script helper dengan timeout
    function _loadScript(src,timeoutMs){
      return new Promise((res,rej)=>{
        const t=setTimeout(()=>rej(new Error("Timeout: "+src)),timeoutMs||15000);
        const s=document.createElement("script");
        s.src=src;
        s.onload=()=>{clearTimeout(t);res();};
        s.onerror=()=>{clearTimeout(t);rej(new Error("Load failed: "+src));};
        document.head.appendChild(s);
      });
    }

    // Load model dari URI dengan timeout per-model
    async function _loadModelsFrom(uri){
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error("Model timeout")),20000));
      await Promise.race([
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(uri),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(uri),
          faceapi.nets.faceRecognitionNet.loadFromUri(uri),
        ]),
        timeout
      ]);
    }

    async function _loadFaceApi(){
      if(_faceApiReady)return true;
      // Jika sedang loading, tunggu sampai selesai
      if(_faceApiLoading)return new Promise(r=>{
        const t=setInterval(()=>{if(_faceApiReady||!_faceApiLoading){clearInterval(t);r(_faceApiReady);}},200);
        setTimeout(()=>{clearInterval(t);r(false);},35000); // max 35s total wait
      });
      _faceApiLoading=true;
      console.log("[face-api] Memulai loading, basePath:",_getBasePath);

      // ── STEP 1: Pastikan face-api.js library tersedia ──
      if(!window.faceapi){
        // Tunggu preload dari index.html selesai (maks 5 detik)
        const preloaded=await new Promise(res=>{
          if(window.__faceApiPreloaded&&window.faceapi){res(true);return;}
          let waited=0;
          const poll=setInterval(()=>{
            waited+=200;
            if(window.faceapi){clearInterval(poll);res(true);}
            else if(waited>=5000){clearInterval(poll);res(false);}
          },200);
        });
        if(!preloaded){
          // Preload belum selesai atau gagal — coba eksplisit
          try{
            console.log("[face-api] Mencoba load eksplisit lokal:",FACEAPI_LOCAL);
            await _loadScript(FACEAPI_LOCAL,8000);
            console.log("[face-api] Library lokal OK");
          }catch(e1){
            console.warn("[face-api] Lokal gagal, coba CDN:",e1.message);
            try{
              await _loadScript(FACEAPI_CDN,15000);
              console.log("[face-api] Library CDN OK");
            }catch(e2){
              console.error("[face-api] Library CDN juga gagal:",e2.message);
              _faceApiLoading=false;
              return false;
            }
          }
        }else{
          console.log("[face-api] Library dari preload OK");
        }
      }else{
        console.log("[face-api] Library sudah ada di window");
      }

      // ── STEP 2: Load model weights ──
      // Coba lokal dulu
      try{
        console.log("[face-api] Mencoba model lokal:",FACEAPI_MODELS_LOCAL);
        await _loadModelsFrom(FACEAPI_MODELS_LOCAL);
        FACEAPI_MODELS=FACEAPI_MODELS_LOCAL;
        console.log("[face-api] Model lokal OK ✅");
        _faceApiReady=true;
        _faceApiLoading=false;
        return true;
      }catch(e1){
        console.warn("[face-api] Model lokal gagal:",e1.message);
        // Reset nets yang mungkin sudah ter-load sebagian
        try{
          faceapi.nets.tinyFaceDetector.dispose();
          faceapi.nets.faceLandmark68TinyNet.dispose();
          faceapi.nets.faceRecognitionNet.dispose();
        }catch(_){}
      }

      // Fallback ke CDN
      try{
        console.log("[face-api] Mencoba model CDN:",FACEAPI_MODELS_CDN);
        await _loadModelsFrom(FACEAPI_MODELS_CDN);
        FACEAPI_MODELS=FACEAPI_MODELS_CDN;
        console.log("[face-api] Model CDN OK ✅");
        _faceApiReady=true;
        _faceApiLoading=false;
        return true;
      }catch(e2){
        console.error("[face-api] Model CDN juga gagal:",e2.message);
        _faceApiLoading=false;
        return false;
      }
    }

    function _setRingProgress(progressEl,pct,color){
      if(!progressEl)return;
      const circumference=740;
      const offset=circumference-(pct*circumference);
      progressEl.style.strokeDashoffset=offset;
      progressEl.style.stroke=color||"#22c55e";
    }

    function _setStatus(ring,progress,badge,fill,state,msg){
      const isGood=state==="found"||state==="capturing"||state==="done"||state==="verifying";
      const isErr=state==="lost"||state==="error";
      if(ring)ring.className="v2l-face-ring"+(isGood?" scanning":isErr?" error":"");
      if(progress)progress.textContent=msg||"";
      if(badge){
        badge.style.borderColor=isGood?"rgba(34,197,94,0.5)":isErr?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.15)";
        badge.style.background=isGood?"rgba(34,197,94,0.25)":isErr?"rgba(239,68,68,0.25)":"rgba(0,0,0,0.75)";
        badge.textContent=msg||"";
      }
      // Hanya update warna fill, JANGAN reset width (biar caller yang urus width)
      if(fill){
        const curW=fill.style.width;
        fill.className="v2l-scan-fill"+(isErr?" error":"");
        fill.style.width=curW; // restore width setelah className change
      }
    }

    // Hitung EAR (Eye Aspect Ratio) untuk deteksi kedipan
    function _calcEAR(eye){
      if(!eye||eye.length<6)return 1;
      const p={};
      const pts=eye;
      const A=Math.hypot(pts[1].x-pts[5].x,pts[1].y-pts[5].y);
      const B=Math.hypot(pts[2].x-pts[4].x,pts[2].y-pts[4].y);
      const C=Math.hypot(pts[0].x-pts[3].x,pts[0].y-pts[3].y);
      return C>0?(A+B)/(2*C):1;
    }

    function _getLandmarkEyes(landmarks){
      if(!landmarks)return{left:null,right:null};
      const lm=landmarks.positions||landmarks._positions||[];
      if(lm.length<68)return{left:null,right:null};
      return{
        left:[lm[36],lm[37],lm[38],lm[39],lm[40],lm[41]],
        right:[lm[42],lm[43],lm[44],lm[45],lm[46],lm[47]]
      };
    }

    // ─── LIVENESS: deteksi kedip mata ───
    let _livenessRAF=null;
    async function _livenessCheck(vid,progress,badge){
      const EAR_THRESHOLD=0.27;
      const EAR_OPEN_THRESHOLD=0.30;
      const BLINK_NEEDED=1;
      let blinkCount=0;
      let eyeOpen=true;
      let resolved=false;
      let earHistory=[];
      const TIMEOUT_MS=15000;

      if(_livenessRAF){cancelAnimationFrame(_livenessRAF);_livenessRAF=null;}

      return new Promise(resolve=>{
        const deadline=Date.now()+TIMEOUT_MS;
        let countdown=15;
        const cdInterval=setInterval(()=>{
          countdown--;
          if(progress&&!resolved)progress.textContent=`👁️ Kedipkan mata sekali... (${countdown}s)`;
          if(countdown<=0){clearInterval(cdInterval);}
        },1000);

        async function tick(){
          if(resolved)return;
          if(Date.now()>deadline){
            clearInterval(cdInterval);
            resolved=true;
            resolve(false);
            return;
          }
          try{
            const det=await faceapi.detectSingleFace(vid,new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.35})).withFaceLandmarks(true);
            if(det){
              const eyes=_getLandmarkEyes(det.landmarks);
              let ear=1;
              if(eyes.left&&eyes.right){
                ear=(_calcEAR(eyes.left)+_calcEAR(eyes.right))/2;
              }
              earHistory.push(ear);
              if(earHistory.length>5)earHistory.shift();
              const avgEAR=earHistory.reduce((a,b)=>a+b,0)/earHistory.length;

              if(eyeOpen&&avgEAR<EAR_THRESHOLD){
                eyeOpen=false;
                if(badge)badge.textContent=`👁️ Mata tertutup terdeteksi...`;
              } else if(!eyeOpen&&avgEAR>=EAR_OPEN_THRESHOLD){
                eyeOpen=true;
                blinkCount++;
                earHistory=[];
                if(badge)badge.textContent=`✅ Kedipan ${blinkCount}/${BLINK_NEEDED} terdeteksi!`;
                if(blinkCount>=BLINK_NEEDED){
                  clearInterval(cdInterval);
                  resolved=true;
                  resolve(true);
                  return;
                }
              }
            } else {
              if(progress&&!resolved)progress.textContent="🔍 Wajah hilang — kembali ke lingkaran...";
              earHistory=[];
            }
          }catch(e){console.warn("[Liveness]",e);}
          if(!resolved){
            await new Promise(r=>setTimeout(r,80));
            if(!resolved)_livenessRAF=requestAnimationFrame(tick);
          }
        }
        _livenessRAF=requestAnimationFrame(tick);
      });
    }

    let _livenessVerifyRAF=null;
    async function _livenessCheckVerify(vid,progress,badge){
      const EAR_THRESHOLD=0.27;
      const EAR_OPEN_THRESHOLD=0.30;
      const BLINK_NEEDED=1;
      let blinkCount=0;
      let eyeOpen=true;
      let resolved=false;
      let earHistory=[];
      const TIMEOUT_MS=15000;

      if(_livenessVerifyRAF){cancelAnimationFrame(_livenessVerifyRAF);_livenessVerifyRAF=null;}

      return new Promise(resolve=>{
        const deadline=Date.now()+TIMEOUT_MS;
        let countdown=15;
        const cdInterval=setInterval(()=>{
          countdown--;
          if(progress&&!resolved)progress.textContent=`👁️ Kedipkan mata sekali... (${countdown}s)`;
          if(countdown<=0){clearInterval(cdInterval);}
        },1000);

        async function tick(){
          if(resolved)return;
          if(Date.now()>deadline){
            clearInterval(cdInterval);
            resolved=true;
            resolve(false);
            return;
          }
          try{
            const det=await faceapi.detectSingleFace(vid,new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.35})).withFaceLandmarks(true);
            if(det){
              const eyes=_getLandmarkEyes(det.landmarks);
              let ear=1;
              if(eyes.left&&eyes.right){
                ear=(_calcEAR(eyes.left)+_calcEAR(eyes.right))/2;
              }
              earHistory.push(ear);
              if(earHistory.length>5)earHistory.shift();
              const avgEAR=earHistory.reduce((a,b)=>a+b,0)/earHistory.length;

              if(eyeOpen&&avgEAR<EAR_THRESHOLD){
                eyeOpen=false;
                if(badge)badge.textContent=`👁️ Mata tertutup terdeteksi...`;
              } else if(!eyeOpen&&avgEAR>=EAR_OPEN_THRESHOLD){
                eyeOpen=true;
                blinkCount++;
                earHistory=[];
                if(badge)badge.textContent=`✅ Kedipan ${blinkCount}/${BLINK_NEEDED} terdeteksi!`;
                if(blinkCount>=BLINK_NEEDED){
                  clearInterval(cdInterval);
                  resolved=true;
                  resolve(true);
                  return;
                }
              }
            } else {
              if(progress&&!resolved)progress.textContent="🔍 Wajah hilang — kembali ke lingkaran...";
              earHistory=[];
            }
          }catch(e){console.warn("[LivenessVerify]",e);}
          if(!resolved){
            await new Promise(r=>setTimeout(r,80));
            if(!resolved)_livenessVerifyRAF=requestAnimationFrame(tick);
          }
        }
        _livenessVerifyRAF=requestAnimationFrame(tick);
      });
    }

    async function _startAutoCapture(videoId,canvasId,ringId,ringProgressId,fillId,progressId,badgeId,onComplete){
      const vid=document.getElementById(videoId);
      const canvas=document.getElementById(canvasId);
      const ring=document.getElementById(ringId);
      const ringProg=document.getElementById(ringProgressId);
      const fill=document.getElementById(fillId);
      const progress=document.getElementById(progressId);
      const badge=document.getElementById(badgeId);

      // Model sudah dimuat di proceedV2LCapture, langsung mulai deteksi
      _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");
      _setRingProgress(ringProg,0,"#22c55e");

      let stableFrames=0;
      const STABLE_NEEDED=8; // turunkan dari 12 → 8 agar lebih cepat terpenuhi
      let lostFrames=0;
      const LOST_THRESHOLD=10;
      let captureStarted=false;
      let loopBusy=false; // KUNCI: cegah concurrent async loop
      let lastRafTime=0;
      const TARGET_FPS=12; // sedikit lebih lambat agar await tidak overlap

      function scheduleLoop(){
        _v2lAutoDetectRAF=requestAnimationFrame(loop);
      }

      async function loop(timestamp){
        // Guard: jangan jalankan jika sedang proses atau sudah mulai capture
        if(captureStarted||loopBusy)return;
        if(!vid||!canvas)return;

        // Tunggu video benar-benar streaming
        if(vid.readyState<2||vid.videoWidth===0){
          scheduleLoop(); return;
        }

        const elapsed=timestamp-lastRafTime;
        if(elapsed<1000/TARGET_FPS){
          scheduleLoop(); return;
        }
        lastRafTime=timestamp;

        // KUNCI: set busy sebelum await
        loopBusy=true;
        let det=null;
        try{
          det=await faceapi.detectSingleFace(vid,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.4}));
        }catch(e){}
        loopBusy=false;

        // Setelah await — cek lagi sebelum update state
        if(captureStarted)return;

        if(det&&det.score>0.4){
          lostFrames=0;
          stableFrames++;
          const pct=Math.min(stableFrames/STABLE_NEEDED,1);
          _setRingProgress(ringProg,pct,"#22c55e");
          if(fill){fill.style.width=(pct*40)+"%";fill.className="v2l-scan-fill";}

          if(stableFrames<STABLE_NEEDED){
            // Belum cukup stabil — tampilkan progress dan lanjut loop
            _setStatus(ring,progress,badge,fill,"found","✅ Wajah terdeteksi! Tahan sebentar...");
            if(fill)fill.style.width=(pct*40)+"%";
            scheduleLoop();
          } else {
            // Cukup stabil — mulai liveness, STOP loop deteksi wajah
            captureStarted=true;
            _setStatus(ring,progress,badge,fill,"capturing","👁️ Kedipkan mata sekali sekarang!");
            _setRingProgress(ringProg,1,"#22c55e");
            if(fill){fill.style.width="40%";fill.className="v2l-scan-fill";}

            const isLive=await _livenessCheck(vid,progress,badge);
            if(!isLive){
              _setStatus(ring,progress,badge,fill,"error","❌ Waktu habis. Coba lagi — kedipkan mata sekali.");
              if(fill){fill.style.width="0%";fill.className="v2l-scan-fill";}
              _setRingProgress(ringProg,0,"#ef4444");
              await new Promise(r=>setTimeout(r,2000));
              // Reset semua state
              captureStarted=false;
              loopBusy=false;
              stableFrames=0;
              lostFrames=0;
              lastRafTime=0;
              _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");
              _setRingProgress(ringProg,0,"#22c55e");
              if(fill){fill.style.width="0%";fill.className="v2l-scan-fill";}
              scheduleLoop();
              return;
            }

            _setStatus(ring,progress,badge,fill,"capturing","📸 Liveness OK! Mengambil data wajah...");
            await _doCaptureSamples(vid,canvas,ringProg,fill,progress,badge,ring,onComplete);
          }
        } else {
          lostFrames++;
          if(stableFrames>0)stableFrames=Math.max(0,stableFrames-1);
          const pct=Math.min(stableFrames/STABLE_NEEDED,1);
          if(lostFrames>LOST_THRESHOLD){
            _setRingProgress(ringProg,0,"#ef4444");
            _setStatus(ring,progress,badge,fill,"lost","⚠️ Wajah hilang — dekatkan wajah ke kamera");
          } else {
            _setRingProgress(ringProg,pct,"#22c55e");
            _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");
          }
          if(fill){fill.style.width=(pct*40)+"%";}
          scheduleLoop();
        }
      }

      scheduleLoop();
    }

    async function _doCaptureSamples(vid,canvas,ringProg,fill,progress,badge,ring,onComplete){
      const SAMPLES=5;
      const descriptors=[];
      for(let i=0;i<SAMPLES;i++){
        await new Promise(r=>setTimeout(r,400));
        canvas.width=vid.videoWidth||320;
        canvas.height=vid.videoHeight||240;
        const ctx=canvas.getContext("2d");
        ctx.drawImage(vid,0,0,canvas.width,canvas.height);
        let desc=null;
        try{
          const det=await faceapi.detectSingleFace(canvas,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.4}))
            .withFaceLandmarks(true).withFaceDescriptor();
          if(det)desc=Array.from(det.descriptor);
        }catch(e){}
        if(desc)descriptors.push(desc);
        const pct=0.4+(0.6*((i+1)/SAMPLES));
        _setRingProgress(ringProg,pct,"#22c55e");
        if(fill)fill.style.width=(pct*100)+"%";
        if(progress)progress.textContent=`📸 Mengambil data wajah ${i+1}/${SAMPLES}...`;
        if(badge)badge.textContent=`📸 Frame ${i+1}/${SAMPLES}`;
      }
      if(!descriptors.length){
        if(progress)progress.textContent="❌ Gagal mengambil data wajah. Coba lagi.";
        return;
      }
      if(ring)ring.className="v2l-face-ring success";
      _setRingProgress(ringProg,1,"#22c55e");
      if(fill)fill.style.width="100%";
      if(progress)progress.textContent="✅ Berhasil! Menyimpan data...";
      if(badge){badge.textContent="✅ Tersimpan!";badge.style.background="rgba(34,197,94,0.35)";}
      if(onComplete)await onComplete(descriptors);
    }

    window.proceedV2LCapture=async function(){
      const consent=document.getElementById("v2lConsentCheck").checked;
      const pwd=document.getElementById("v2lConfirmPwd").value;
      if(!consent){showToast("Centang persetujuan terlebih dahulu","warning");return;}
      if(!pwd){showToast("Masukkan password akun Anda","warning");return;}

      const hashedPwd=await hashPassword(pwd);
      if(hashedPwd!==currentUser.password){showToast("Password salah","error");return;}

      document.getElementById("v2lModalStep1").style.display="none";
      document.getElementById("v2lModalStep2").style.display="block";

      // ── Tampilkan loading model SEBELUM kamera aktif ──
      const _captFill=document.getElementById("v2lScanFill");
      const _captProg=document.getElementById("v2lScanProgress");
      const _captBadge=document.getElementById("v2lFaceStatusBadge");
      const _captRingProg=document.getElementById("v2lRingProgress");
      if(_captProg)_captProg.textContent="⏳ Memuat model AI... harap tunggu";
      if(_captBadge){_captBadge.textContent="⏳ Memuat model...";_captBadge.style.background="rgba(79,142,247,0.25)";_captBadge.style.borderColor="rgba(79,142,247,0.5)";}
      if(_captFill){_captFill.style.width="0%";_captFill.className="v2l-scan-fill";}
      _setRingProgress(_captRingProg,0,"#4f8ef7");

      // Animasi loading bar saat memuat model
      if(_captFill){_captFill.className="v2l-scan-fill loading";_captFill.style.width="60%";}
      let _loadPct=0;
      const _loadAnim=setInterval(()=>{
        _loadPct=Math.min(_loadPct+1.5,75);
        _setRingProgress(_captRingProg,_loadPct/100,"#4f8ef7");
      },200);

      // Muat model DULU sebelum buka kamera
      const _captLoaded=await _loadFaceApi();
      clearInterval(_loadAnim);
      if(!_captLoaded){
        if(_captFill){_captFill.style.width="100%";_captFill.className="v2l-scan-fill error";}
        const _isOffline=!navigator.onLine;
        const _errMsg=_isOffline
          ?"❌ Tidak ada koneksi internet & model lokal tidak ditemukan."
          :"❌ Model gagal dimuat. Pastikan folder 'models' ada di direktori yang sama.";
        if(_captProg)_captProg.textContent=_errMsg;
        if(_captBadge){_captBadge.textContent="❌ Gagal";_captBadge.style.background="rgba(239,68,68,0.25)";}
        showToast(_isOffline?"Butuh koneksi atau model lokal":"Model AI gagal dimuat","error");
        setTimeout(()=>document.getElementById("v2lModal").classList.add("hidden"),3500);
        return;
      }
      if(_captFill){_captFill.className="v2l-scan-fill";_captFill.style.width="0%";}
      if(_captProg)_captProg.textContent="✅ Model siap — membuka kamera...";
      if(_captBadge){_captBadge.textContent="✅ Model siap";_captBadge.style.background="rgba(34,197,94,0.25)";}
      _setRingProgress(_captRingProg,0,"#22c55e");

      // Buka kamera setelah model siap
      try{
        if(_v2lStream)_v2lStream.getTracks().forEach(t=>t.stop());
        const stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}}
        });
        _v2lStream=stream;
        const vid=document.getElementById("v2lVideo");
        if(vid){
          vid.srcObject=stream;
          // Paksa tidak mirror — kamera biasa (bukan efek cermin)
          vid.style.transform="none";
          vid.style.webkitTransform="none";
          vid.removeAttribute("data-mirror");
        }

        // Cek kualitas
        const track=stream.getVideoTracks()[0];
        const settings=track.getSettings();
        const w=settings.width||0,h=settings.height||0;
        const qn=document.getElementById("v2lCameraQualityNotice");
        if(qn){
          qn.style.display="flex";
          const dot=qn.querySelector(".v2l-face-dot");
          const txt=document.getElementById("v2lCameraQualityText");
          if(w<320||h<240){
            if(dot)dot.style.background="var(--red)";
            if(txt)txt.textContent="⚠️ Kamera resolusi rendah ("+w+"×"+h+")";
          }else{
            if(dot)dot.style.background="var(--green)";
            if(txt)txt.textContent="✅ Kamera baik ("+w+"×"+h+")";
          }
        }

        // Tunggu video benar-benar siap sebelum start deteksi
        await new Promise(res=>{
          if(vid.readyState>=2){res();return;}
          vid.onloadeddata=()=>res();
          setTimeout(res,3000); // max wait 3s
        });

        // Start auto detection loop (model sudah siap)
        _startAutoCapture(
          "v2lVideo","v2lCanvas","v2lFaceRing","v2lRingProgress",
          "v2lScanFill","v2lScanProgress","v2lFaceStatusBadge",
          async function(descriptors){
            // Save to Firestore
            const nis=currentUser.nis;
            const existing=await getV2LData(nis)||{faces:[],enabled:false};
            const newFaceSet={
              id:"face_"+Date.now(),
              descriptors:descriptors,
              captured_at:new Date().toISOString(),
              device:navigator.userAgent.slice(0,60)
            };
            existing.faces=[...(existing.faces||[]),newFaceSet];
            await saveV2LData(nis,existing);
            await new Promise(r=>setTimeout(r,900));
            if(_v2lStream){_v2lStream.getTracks().forEach(t=>t.stop());_v2lStream=null;}
            if(_v2lAutoDetectRAF){cancelAnimationFrame(_v2lAutoDetectRAF);_v2lAutoDetectRAF=null;}
            document.getElementById("v2lModal").classList.add("hidden");
            const role=document.getElementById("v2lModal")._role||"student";
            showToast("Data wajah berhasil disimpan ✅","success");
            await renderV2LSettings(role);
            const v2l=await getV2LData(nis);
            if(v2l&&v2l.faces&&v2l.faces.length===1){
              const ok=await showConfirm("Aktifkan Verifikasi Wajah?","Data wajah telah tersimpan. Aktifkan verifikasi wajah untuk login sekarang?","Ya, Aktifkan","btn-primary","👁️");
              if(ok){await saveV2LData(nis,{...v2l,enabled:true});await renderV2LSettings(role);}
            }
          }
        );
      }catch(e){
        showToast("Gagal membuka kamera: "+e.message,"error");
        document.getElementById("v2lModal").classList.add("hidden");
      }
    };

    window.cancelV2LCapture=function(){
      if(_livenessRAF){cancelAnimationFrame(_livenessRAF);_livenessRAF=null;}
      if(_livenessVerifyRAF){cancelAnimationFrame(_livenessVerifyRAF);_livenessVerifyRAF=null;}
      if(_v2lAutoDetectRAF){cancelAnimationFrame(_v2lAutoDetectRAF);_v2lAutoDetectRAF=null;}
      if(_v2lVerifyAutoRAF){cancelAnimationFrame(_v2lVerifyAutoRAF);_v2lVerifyAutoRAF=null;}
      if(_v2lStream){_v2lStream.getTracks().forEach(t=>t.stop());_v2lStream=null;}
      document.getElementById("v2lModal").classList.add("hidden");
    };

    // Legacy — kept for compat but not triggered from UI anymore
    window.captureV2LFace=function(){return;};

    // Hitung Euclidean distance antara dua face-api descriptor (128-dim float32)
    function _faceDistance(a,b){
      if(!a||!b||a.length!==b.length)return 999;
      let sum=0;
      for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])*(a[i]-b[i]);
      return Math.sqrt(sum);
    }

    // Bandingkan live descriptor vs stored (ambil min distance — makin kecil makin mirip)
    function matchFaceDescriptors(liveDesc,storedFaces){
      let minDist=999;
      for(const faceSet of storedFaces){
        for(const storedDesc of (faceSet.descriptors||[])){
          const d=_faceDistance(liveDesc,storedDesc);
          if(d<minDist)minDist=d;
        }
      }
      return minDist;
    }

    // ─── V2L LOGIN VERIFICATION FLOW ───
    let _v2lVerifyResolve=null;
    let _v2lQrInterval=null;
    let _v2lQrAccepted=false;

    async function requireV2LVerification(nis){
      return new Promise(async(resolve)=>{
        _v2lVerifyResolve=resolve;
        _v2lQrAccepted=false;

        // Reset UI
        document.getElementById("v2lVerifyModal").classList.remove("hidden");
        document.getElementById("v2lVerifyProgress").textContent="Posisikan wajah Anda di dalam lingkaran";
        document.getElementById("v2lVerifyFill").style.width="0%";
        document.getElementById("v2lVerifyRing").className="v2l-face-ring";
        document.getElementById("v2lQrStatus").textContent="";
        document.getElementById("v2lCameraQualityAlert").style.display="none";

        // Aktifkan tab kamera by default
        switchV2LVerifyTab('camera', document.querySelector('#v2lVerifyModal .v2l-method-tab'));

        // Mulai kamera verifikasi
        await startVerifyCamera();

        // Setup QR
        setupVerifyQR(nis);
      });
    }

    async function startVerifyCamera(){
      // ── Tampilkan loading model sebelum kamera ──
      const _vFill=document.getElementById("v2lVerifyFill");
      const _vProg=document.getElementById("v2lVerifyProgress");
      const _vBadge=document.getElementById("v2lVerifyStatusBadge");
      const _vRingProg=document.getElementById("v2lVerifyRingProgress");
      const _vRing=document.getElementById("v2lVerifyRing");
      if(_vProg)_vProg.textContent="⏳ Memuat model AI... harap tunggu";
      if(_vBadge){_vBadge.textContent="⏳ Memuat model...";_vBadge.style.background="rgba(79,142,247,0.25)";_vBadge.style.borderColor="rgba(79,142,247,0.5)";}
      if(_vFill){_vFill.style.width="0%";_vFill.className="v2l-scan-fill";}
      _setRingProgress(_vRingProg,0,"#4f8ef7");

      // Animasi loading bar
      if(_vFill){_vFill.className="v2l-scan-fill loading";_vFill.style.width="60%";}
      let _vLoadPct=0;
      const _vLoadAnim=setInterval(()=>{
        _vLoadPct=Math.min(_vLoadPct+1.5,75);
        _setRingProgress(_vRingProg,_vLoadPct/100,"#4f8ef7");
      },200);

      // Load model dulu
      const _vLoaded=await _loadFaceApi();
      clearInterval(_vLoadAnim);
      if(!_vLoaded){
        if(_vFill){_vFill.style.width="100%";_vFill.className="v2l-scan-fill error";}
        const _vIsOffline=!navigator.onLine;
        const _vErrMsg=_vIsOffline
          ?"❌ Tidak ada koneksi & model lokal tidak ditemukan. Gunakan QR Code."
          :"❌ Model gagal dimuat. Pastikan folder 'models' ada. Atau gunakan QR Code.";
        if(_vProg)_vProg.textContent=_vErrMsg;
        if(_vBadge){_vBadge.textContent="❌ Gagal";_vBadge.style.background="rgba(239,68,68,0.25)";}
        return;
      }
      if(_vFill){_vFill.className="v2l-scan-fill";_vFill.style.width="0%";}
      if(_vProg)_vProg.textContent="✅ Model siap — membuka kamera...";
      _setRingProgress(_vRingProg,0,"#22c55e");

      // Buka kamera setelah model siap
      try{
        if(_v2lVerifyStream)_v2lVerifyStream.getTracks().forEach(t=>t.stop());
        if(_v2lVerifyAutoRAF){cancelAnimationFrame(_v2lVerifyAutoRAF);_v2lVerifyAutoRAF=null;}
        const stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}}
        });
        _v2lVerifyStream=stream;
        const vid=document.getElementById("v2lVerifyVideo");
        if(vid){
          vid.srcObject=stream;
          // Paksa tidak mirror — kamera biasa
          vid.style.transform="none";
          vid.style.webkitTransform="none";
          vid.removeAttribute("data-mirror");
        }

        // Cek kualitas
        const track=stream.getVideoTracks()[0];
        const settings=track.getSettings();
        const w=settings.width||0,h=settings.height||0;
        if(w<320||h<240){
          const alertEl=document.getElementById("v2lCameraQualityAlert");
          if(alertEl)alertEl.style.display="block";
        }

        // Tunggu video benar-benar siap sebelum start deteksi
        await new Promise(res=>{
          if(vid.readyState>=2){res();return;}
          vid.onloadeddata=()=>res();
          setTimeout(res,3000);
        });

        // Start auto verify loop (model sudah siap)
        _startAutoVerify();
      }catch(e){
        const alertEl=document.getElementById("v2lCameraQualityAlert");
        if(alertEl){alertEl.style.display="block";alertEl.textContent="Kamera tidak dapat dibuka. Gunakan metode QR Code.";}
      }
    }

    async function _startAutoVerify(){
      if(_v2lVerifyAutoRAF){cancelAnimationFrame(_v2lVerifyAutoRAF);_v2lVerifyAutoRAF=null;}
      if(_v2lVerifying)return;

      const vid=document.getElementById("v2lVerifyVideo");
      const canvas=document.getElementById("v2lVerifyCanvas");
      const ring=document.getElementById("v2lVerifyRing");
      const ringProg=document.getElementById("v2lVerifyRingProgress");
      const fill=document.getElementById("v2lVerifyFill");
      const progress=document.getElementById("v2lVerifyProgress");
      const badge=document.getElementById("v2lVerifyStatusBadge");

      // Model sudah dimuat di startVerifyCamera, langsung mulai deteksi
      _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah Anda di dalam lingkaran");
      _setRingProgress(ringProg,0,"#22c55e");

      let stableFrames=0;
      const STABLE_NEEDED=8;
      let lostFrames=0;
      const LOST_THRESHOLD=12;
      let verifyStarted=false;
      let loopBusy=false;
      let lastRafTime=0;
      const TARGET_FPS=12;

      _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");

      function scheduleLoop(){
        _v2lVerifyAutoRAF=requestAnimationFrame(loop);
      }

      async function loop(timestamp){
        if(verifyStarted||loopBusy)return;
        if(!vid||!canvas)return;
        if(vid.readyState<2||vid.videoWidth===0){scheduleLoop();return;}
        const elapsed=timestamp-lastRafTime;
        if(elapsed<1000/TARGET_FPS){scheduleLoop();return;}
        lastRafTime=timestamp;

        loopBusy=true;
        let det=null;
        try{
          det=await faceapi.detectSingleFace(vid,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.4}));
        }catch(e){}
        loopBusy=false;

        if(verifyStarted)return;

        if(det&&det.score>0.4){
          lostFrames=0;
          stableFrames++;
          const pct=Math.min(stableFrames/STABLE_NEEDED,1);
          _setRingProgress(ringProg,pct,"#22c55e");
          if(fill){fill.style.width=(pct*40)+"%";fill.className="v2l-scan-fill";}

          if(stableFrames<STABLE_NEEDED){
            _setStatus(ring,progress,badge,fill,"found","✅ Wajah terdeteksi! Tahan sebentar...");
            if(fill)fill.style.width=(pct*40)+"%";
            scheduleLoop();
          } else {
            verifyStarted=true;
            _setStatus(ring,progress,badge,fill,"verifying","👁️ Kedipkan mata sekali sekarang!");
            _setRingProgress(ringProg,1,"#22c55e");
            if(fill){fill.style.width="40%";fill.className="v2l-scan-fill";}

            const isLive=await _livenessCheckVerify(vid,progress,badge);
            if(!isLive){
              _setStatus(ring,progress,badge,fill,"error","❌ Waktu habis. Coba lagi — kedipkan mata sekali.");
              if(fill){fill.style.width="0%";fill.className="v2l-scan-fill";}
              _setRingProgress(ringProg,0,"#ef4444");
              await new Promise(r=>setTimeout(r,2000));
              verifyStarted=false;
              loopBusy=false;
              stableFrames=0;
              lostFrames=0;
              lastRafTime=0;
              _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");
              _setRingProgress(ringProg,0,"#22c55e");
              if(fill){fill.style.width="0%";fill.className="v2l-scan-fill";}
              scheduleLoop();
              return;
            }

            _setStatus(ring,progress,badge,fill,"verifying","🔍 Menganalisis wajah...");
            await _doAutoVerify(vid,canvas,ringProg,fill,progress,badge,ring);
          }
        } else {
          lostFrames++;
          if(stableFrames>0)stableFrames=Math.max(0,stableFrames-1);
          const pct=Math.min(stableFrames/STABLE_NEEDED,1);
          if(lostFrames>LOST_THRESHOLD){
            _setRingProgress(ringProg,0,"#ef4444");
            _setStatus(ring,progress,badge,fill,"error","⚠️ Wajah hilang — dekatkan wajah ke kamera");
          } else {
            _setRingProgress(ringProg,pct,"#22c55e");
            _setStatus(ring,progress,badge,fill,"idle","🔍 Posisikan wajah di dalam lingkaran");
          }
          if(fill)fill.style.width=(pct*40)+"%";
          scheduleLoop();
        }
      }

      scheduleLoop();
    }

    async function _doAutoVerify(vid,canvas,ringProg,fill,progress,badge,ring){
      _v2lVerifying=true;
      const samples=[];
      for(let i=0;i<4;i++){
        await new Promise(r=>setTimeout(r,300));
        let det=null;
        try{
          det=await faceapi.detectSingleFace(vid,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.4}))
            .withFaceLandmarks(true).withFaceDescriptor();
        }catch(e){}
        if(det)samples.push(Array.from(det.descriptor));
        const pct=0.4+(0.5*((i+1)/4));
        _setRingProgress(ringProg,pct,"#22c55e");
        if(fill)fill.style.width=(pct*100)+"%";
      }

      if(!samples.length){
        if(ring)ring.className="v2l-face-ring error";
        _setRingProgress(ringProg,1,"#ef4444");
        if(fill){fill.className="v2l-scan-fill error";fill.style.width="100%";}
        if(progress)progress.textContent="❌ Gagal mendeteksi wajah. Coba lagi.";
        await new Promise(r=>setTimeout(r,2000));
        _v2lVerifying=false;
        _startAutoVerify();
        return;
      }

      const nis=document.getElementById("nisInput")?.value?.trim()||currentUser?.nis;
      const v2l=await getV2LData(nis);
      if(!v2l||!v2l.faces||!v2l.faces.length){
        resolveV2LVerify(false,"Data wajah tidak ditemukan");
        _v2lVerifying=false;
        return;
      }

      let minDist=999;
      for(const sample of samples){
        const d=matchFaceDescriptors(sample,v2l.faces);
        if(d<minDist)minDist=d;
      }

      _setRingProgress(ringProg,1,"#22c55e");
      if(fill)fill.style.width="100%";
      const THRESHOLD=0.50;

      if(minDist<=THRESHOLD){
        if(ring)ring.className="v2l-face-ring success";
        const matchPct=Math.round(Math.max(0,1-minDist/THRESHOLD)*100);
        if(progress)progress.textContent="✅ Wajah terverifikasi! ("+matchPct+"% cocok)";
        if(badge){badge.textContent="✅ Terverifikasi!";badge.style.background="rgba(34,197,94,0.4)";}
        await new Promise(r=>setTimeout(r,800));
        resolveV2LVerify(true);
      } else {
        if(ring)ring.className="v2l-face-ring error";
        _setRingProgress(ringProg,1,"#ef4444");
        if(fill){fill.className="v2l-scan-fill error";fill.style.width="100%";}
        const matchPct=Math.round(Math.max(0,1-minDist/THRESHOLD)*100);
        if(progress)progress.textContent="❌ Wajah tidak cocok ("+matchPct+"%). Coba lagi atau gunakan QR.";
        if(badge){badge.textContent="❌ Tidak cocok — coba lagi";badge.style.background="rgba(239,68,68,0.35)";badge.style.borderColor="rgba(239,68,68,0.5)";}
        await new Promise(r=>setTimeout(r,2000));
        _v2lVerifying=false;
        if(ring)ring.className="v2l-face-ring";
        if(fill){fill.className="v2l-scan-fill";fill.style.width="0%";}
        _setRingProgress(ringProg,0,"#22c55e");
        _startAutoVerify(); // restart detection
      }
    }

    function setupVerifyQR(nis){
      if(_v2lQrInterval)clearInterval(_v2lQrInterval);

      function updateQR(){
        const round=getCurrentQrRound();
        const token=generateQrToken(nis,round);
        drawQrCanvas("v2lQrCanvas",token);
        const sisa=60-Math.floor((Date.now()%60000)/1000);
        const timerEl=document.getElementById("v2lQrTimer");
        if(timerEl){
          timerEl.textContent=sisa;
          timerEl.className="v2l-qr-timer"+(sisa<=10?" danger":"");
        }

        // Cek apakah ada konfirmasi QR dari device lain
        checkQRConfirmation(nis,token);
      }

      updateQR();
      _v2lQrInterval=setInterval(updateQR,1000);
    }

    async function checkQRConfirmation(nis,token){
      try{
        const d=await getDoc(doc(db,"v2l_qr_confirms",nis));
        if(d.exists()){
          const data=d.data();
          // Token harus cocok (round saat ini atau sebelumnya)
          const round=getCurrentQrRound();
          const validTokens=[generateQrToken(nis,round),generateQrToken(nis,round-1)];
          if(validTokens.includes(data.token)&&Date.now()-data.ts<120000){
            // Konfirmasi valid!
            _v2lQrAccepted=true;
            if(_v2lQrInterval)clearInterval(_v2lQrInterval);
            document.getElementById("v2lQrStatus").innerHTML='<span style="color:var(--green)">✅ QR berhasil dikonfirmasi!</span>';
            // Hapus konfirmasi
            await deleteDoc(doc(db,"v2l_qr_confirms",nis)).catch(()=>{});
            setTimeout(()=>{resolveV2LVerify(true);},1000);
          }
        }
      }catch(e){}
    }

    window.switchV2LVerifyTab=function(tab,el){
      document.querySelectorAll("#v2lVerifyModal .v2l-method-tab").forEach(t=>t.classList.remove("active"));
      if(el)el.classList.add("active");
      document.getElementById("v2lVerifyCamera").classList.toggle("active",tab==="camera");
      document.getElementById("v2lVerifyQR").classList.toggle("active",tab==="qr");
    };

    // Auto verify is now handled by _startAutoVerify — legacy function kept for compat
    window.verifyV2LFace=function(){return;};

    window.cancelV2LVerify=function(){
      if(_v2lVerifyAutoRAF){cancelAnimationFrame(_v2lVerifyAutoRAF);_v2lVerifyAutoRAF=null;}
      _v2lVerifying=false;
      resolveV2LVerify(false,"dibatalkan");
    };

    function resolveV2LVerify(success,reason){
      if(_v2lQrInterval){clearInterval(_v2lQrInterval);_v2lQrInterval=null;}
      if(_v2lVerifyAutoRAF){cancelAnimationFrame(_v2lVerifyAutoRAF);_v2lVerifyAutoRAF=null;}
      _v2lVerifying=false;
      if(_v2lVerifyStream){_v2lVerifyStream.getTracks().forEach(t=>t.stop());_v2lVerifyStream=null;}
      document.getElementById("v2lVerifyModal").classList.add("hidden");
      if(_v2lVerifyResolve){
        _v2lVerifyResolve({success,reason});
        _v2lVerifyResolve=null;
      }
    }

    // ─── QR SCAN dari pengaturan ───
    let _settingsQrInterval=null;

    window.openQrScanModal=function(role){
      if(!currentUser)return;
      const nis=currentUser.nis;
      document.getElementById("v2lQrScanModal").classList.remove("hidden");
      if(_settingsQrInterval)clearInterval(_settingsQrInterval);

      function updateSettingsQR(){
        const round=getCurrentQrRound();
        const token=generateQrToken(nis,round);
        drawQrCanvas("v2lSettingsQrCanvas",token);
        const sisa=60-Math.floor((Date.now()%60000)/1000);
        const timerEl=document.getElementById("v2lSettingsQrTimer");
        if(timerEl){
          timerEl.textContent=sisa;
          timerEl.className="v2l-qr-timer"+(sisa<=10?" danger":"");
        }
      }
      updateSettingsQR();
      _settingsQrInterval=setInterval(updateSettingsQR,1000);
    };

    window.closeQrScanModal=function(){
      if(_settingsQrInterval){clearInterval(_settingsQrInterval);_settingsQrInterval=null;}
      document.getElementById("v2lQrScanModal").classList.add("hidden");
    };

    // ─── Patch handleLogin untuk V2L ───
    const _origHandleLogin=window.handleLogin;
    window.handleLogin=async function(){
      const nis=document.getElementById("nisInput").value.trim();
      const pwd=document.getElementById("passwordInput").value;
      if(!nis||!pwd){
        // Jalankan login biasa dulu (tampilkan form)
        if(_origHandleLogin)await _origHandleLogin();
        return;
      }

      // Cek apakah V2L aktif untuk akun ini
      const v2l=await getV2LData(nis).catch(()=>null);
      if(v2l&&v2l.enabled&&v2l.faces&&v2l.faces.length>0){
        // Verifikasi password dulu (silent)
        const hashedPwd=await hashPassword(pwd);
        let userDataCheck=null;
        try{
          const userDoc=await getDoc(doc(db,"users",nis));
          if(userDoc.exists())userDataCheck=userDoc.data();
        }catch(e){}

        if(!userDataCheck||userDataCheck.password!==hashedPwd){
          // Password salah, biarkan login biasa handle error
          if(_origHandleLogin)await _origHandleLogin();
          return;
        }

        // Password benar, minta V2L
        const result=await requireV2LVerification(nis);
        if(!result.success){
          showAlert("loginAlert","Verifikasi wajah gagal atau dibatalkan. Login ditolak.","error");
          return;
        }
      }

      // Lanjutkan login normal
      if(_origHandleLogin)await _origHandleLogin();
    };

    // ─── Hook settings tab switches untuk load V2L status ───
    // Gunakan window.addEventListener agar tidak konflik dengan deklarasi const di bawah
    window._v2lTabHookInstalled=true;
    const _v2lOrigSwitchStudent=window.switchStudentTab;
    window.switchStudentTab=function(tab,el){
      if(_v2lOrigSwitchStudent)_v2lOrigSwitchStudent(tab,el);
      if(tab==="student-settings")renderV2LSettings("student");
    };
    const _v2lOrigSwitchPanitia=window.switchPanitiaTab;
    window.switchPanitiaTab=function(tab,el){
      if(_v2lOrigSwitchPanitia)_v2lOrigSwitchPanitia(tab,el);
      if(tab==="panitia-settings")renderV2LSettings("panitia");
    };
    const _v2lOrigSwitchGuru=window.switchGuruTab;
    window.switchGuruTab=function(tab,el){
      if(_v2lOrigSwitchGuru)_v2lOrigSwitchGuru(tab,el);
      if(tab==="guru-settings")renderV2LSettings("guru");
    };
    const _v2lOrigSwitchAdmin=window.switchAdminTab;
    window.switchAdminTab=function(tab,el){
      if(_v2lOrigSwitchAdmin)_v2lOrigSwitchAdmin(tab,el);
      if(tab==="admin-settings")renderV2LSettings("admin");
    };

    // ═══════════════════════════════════════════════════════════════
    // END V2L
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    // NAV TABS SCROLL
    // ═══════════════════════════════════════════════════════════
    function scrollNavLeft(id){
        const el=document.getElementById('navtabs-'+id)||document.querySelector('#ntw-'+id+' .nav-tabs');
        if(el)el.scrollBy({left:-200,behavior:'smooth'});
    }
    function scrollNavRight(id){
        const el=document.getElementById('navtabs-'+id)||document.querySelector('#ntw-'+id+' .nav-tabs');
        if(el)el.scrollBy({left:200,behavior:'smooth'});
    }
    function initNavScrollBtns(id){
        const wrapper=document.getElementById('ntw-'+id);
        if(!wrapper)return;
        const tabs=wrapper.querySelector('.nav-tabs');
        if(!tabs)return;
        const lBtn=document.getElementById('nsl-'+id);
        const rBtn=document.getElementById('nsr-'+id);
        if(!lBtn||!rBtn)return;
        function update(){
            const sl=tabs.scrollLeft,sw=tabs.scrollWidth,cw=tabs.clientWidth;
            lBtn.classList.toggle('show',sl>4);
            rBtn.classList.toggle('show',sw-sl-cw>4);
        }
        tabs.addEventListener('scroll',update,{passive:true});
        new ResizeObserver(update).observe(tabs);
        setTimeout(update,100);
    }
    window.scrollNavLeft=scrollNavLeft;
    window.scrollNavRight=scrollNavRight;

    // ═══════════════════════════════════════════════════════════
    // APP MODE (ujian / ulangan)
    // ═══════════════════════════════════════════════════════════
    let appMode='ujian'; // default
    async function loadAppMode(){
        try{
            const d=await getDoc(doc(db,'settings','app_mode'));
            if(d.exists())appMode=d.data().mode||'ujian';
        }catch(e){}
        applyAppModeUI();
    }
    async function setAppMode(mode){
        const ok=await showConfirm(
            mode==='ujian'?'Aktifkan Mode Ujian':'Aktifkan Mode Ulangan Harian',
            mode==='ujian'
                ?'Mode Ujian: panitia, siswa, dan admin akan beroperasi dengan semua fitur pengawasan aktif.'
                :'Mode Ulangan Harian: hanya guru dan siswa yang beroperasi. Tab Kelola Soal, Jadwal, Nilai, Peringkat, Absen, dan Pelanggaran pada panitia akan disembunyikan.',
            'Ya, Aktifkan','btn-primary','&#9881;'
        );
        if(!ok)return;
        showLoader('Mengubah mode...');
        try{
            await setDoc(doc(db,'settings','app_mode'),{mode,updated_by:currentUser.nis,updated_at:Timestamp.now()});
            appMode=mode;
            applyAppModeUI();
            hideLoader();
            showToast('Mode berhasil diubah ke: '+mode.toUpperCase(),'success');
        }catch(e){hideLoader();showToast('Gagal mengubah mode','error');}
    }
    function applyAppModeUI(){
        const badge=document.getElementById('modeBadge');
        const btnU=document.getElementById('btnModeUjian');
        const btnH=document.getElementById('btnModeUlangan');
        const info=document.getElementById('modeStatusInfo');
        if(badge){
            badge.textContent='MODE: '+(appMode==='ujian'?'UJIAN':'ULANGAN HARIAN');
            badge.className='badge '+(appMode==='ujian'?'badge-blue':'badge-yellow');
        }
        if(btnU)btnU.className='btn '+(appMode==='ujian'?'btn-primary':'btn-secondary');
        if(btnH)btnH.className='btn '+(appMode==='ujian'?'btn-secondary':'btn-primary');
        if(info)info.textContent=appMode==='ujian'
            ?'Mode Ujian aktif — Panitia, Siswa, dan Admin beroperasi penuh.'
            :'Mode Ulangan Harian aktif — Hanya Guru dan Siswa yang beroperasi. Panitia tidak dapat login.';
        // === ADMIN: Sembunyikan tab ujian saat mode ulangan ===
        const ujianOnlyAdminTabs=['admin-soal','admin-jadwal-ujian','admin-jadwal','admin-violations'];
        ujianOnlyAdminTabs.forEach(tid=>{
            const btn=document.querySelector(`#adminPage .nav-tab[data-tab="${tid}"]`);
            if(btn)btn.style.display=appMode==='ujian'?'':'none';
        });
        // === STUDENT: update badge mode dan label tab ujian ===
        const studentModeBadge=document.getElementById('studentModeBadge');
        if(studentModeBadge){
            studentModeBadge.style.display='';
            studentModeBadge.textContent='MODE: '+(appMode==='ujian'?'UJIAN':'ULANGAN HARIAN');
            studentModeBadge.className='badge '+(appMode==='ujian'?'badge-blue':'badge-yellow');
        }
        // Tab "Ujian/Ulangan" di student page
        const studentExamTab=document.querySelector('#studentPage .nav-tab[data-tab="student-exam"]');
        if(studentExamTab){
            studentExamTab.textContent=appMode==='ulangan'?'Ulangan':'Ujian';
        }
        // === GURU: tampilkan/sembunyikan tab Control sesuai mode ===
        // Tab monitor hanya muncul di mode ulangan
        const guruControlTabBtn=document.getElementById('guruControlTab');
        if(guruControlTabBtn){
            // Di mode ujian sembunyikan, di mode ulangan akan di-show oleh loadGuruControlInit
            if(appMode==='ujian')guruControlTabBtn.style.display='none';
        }
        // === PANITIA: kick saat mode berubah ke ulangan ===
        if(appMode==='ulangan'&&currentUser&&currentUser.role==='panitia'){
            showToast('Mode sistem berubah ke Ulangan Harian. Akun panitia tidak aktif.','warning',5000);
            setTimeout(()=>{currentUser=null;localStorage.removeItem('patlas_session');showPage('loginPage');},3000);
        }
        // === GURU: kick saat mode berubah ke ujian ===
        if(appMode==='ujian'&&currentUser&&currentUser.role==='guru'){
            showToast('Mode sistem berubah ke Mode Ujian. Akun guru tidak aktif saat ini.','warning',5000);
            setTimeout(()=>{currentUser=null;localStorage.removeItem('patlas_session');showPage('loginPage');},3000);
        }
    }
    window.setAppMode=setAppMode;

    // ═══════════════════════════════════════════════════════════
    // GURU PAGE
    // ═══════════════════════════════════════════════════════════
    async function loadGuruPage(){
        await loadAppMode();
        // Safety check: jangan load guru di mode ujian
        if(appMode==='ujian'){
            showToast('Sistem dalam Mode Ujian. Akun guru tidak aktif.','error',4000);
            setTimeout(()=>{currentUser=null;localStorage.removeItem('patlas_session');showPage('loginPage');},2000);
            return;
        }
        showPage('guruPage');
        buildUserChip('guruUserChip',currentUser);
        buildThemeGrid('guruThemeGrid');
        renderAccountInfo('guruAccountInfo',currentUser);
        await loadGuruDashboard();
        await loadGuruSoal();
        await loadGuruJadwal();
        // Init control tab (muncul otomatis jika ada jadwal aktif di mode ulangan, 5 mnt sebelum mulai)
        loadGuruControlInit();
        initNavScrollBtns('guru');
    }
    async function loadGuruDashboard(){
        const container=document.getElementById('guruDashboard');
        if(!container)return;
        try{
            const q=query(collection(db,'jadwal'),where('mode','==','ulangan'),where('assigned_guru','==',currentUser.nis));
            const snap=await getDocs(q);
            const today=new Date().toISOString().slice(0,10);
            let active=0,total=snap.size;
            snap.forEach(d=>{if(d.data().tanggal===today)active++;});
            container.innerHTML=`<div class="stat-grid">
                <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total Jadwal Ulangan</div></div>
                <div class="stat-card"><div class="stat-value">${active}</div><div class="stat-label">Ulangan Hari Ini</div></div>
            </div>
            <div class="card"><div class="card-title">Jadwal Ulangan Hari Ini</div><div id="guruTodayList"></div></div>`;
            let todayHtml='';
            snap.forEach(d=>{
                const dt=d.data();
                if(dt.tanggal===today)todayHtml+=`<div style="padding:10px;border-bottom:1px solid var(--border)"><strong>${dt.mapel}</strong> — ${dt.kelas} — ${dt.jam_mulai||'-'} — Durasi: ${dt.durasi||90} mnt</div>`;
            });
            const tl=document.getElementById('guruTodayList');
            if(tl)tl.innerHTML=todayHtml||'<div style="color:var(--text3);padding:12px">Tidak ada ulangan hari ini.</div>';
        }catch(e){if(container)container.innerHTML='<div class="empty-state">Gagal memuat dashboard</div>';}
    }
    function switchGuruTab(tabId,el){
        document.querySelectorAll('.guru-tab-content').forEach(t=>t.classList.add('hidden'));
        document.querySelectorAll('#guruPage .nav-tab').forEach(t=>t.classList.remove('active'));
        const tab=document.getElementById(tabId);if(tab)tab.classList.remove('hidden');
        if(el)el.classList.add('active');
        if(tabId==='guru-soal')loadGuruSoal();
        else if(tabId==='guru-jadwal')loadGuruJadwal();
        else if(tabId==='guru-nilai')loadGuruNilaiJadwalFilter();
        else if(tabId==='guru-ranking')loadGuruRanking();
        else if(tabId==='guru-absen')loadGuruAbsenFilter();
        else if(tabId==='guru-absen')loadGuruAbsenFilter();
        else if(tabId==='guru-history')loadGuruHistory();
        else if(tabId==='guru-control'){loadGuruControlInit();}
    }

    // ═══════════════════════════════════════════════════════════
    // GURU: MONITOR / CONTROL ULANGAN (pengganti control ruang panitia)
    // ═══════════════════════════════════════════════════════════
    async function loadGuruControlInit(){
        const sel=document.getElementById('guruControlJadwalSelect');
        const tabBtn=document.getElementById('guruControlTab');
        if(!sel)return;
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            const now=Date.now();
            const EARLY=5*60*1000; // 5 menit sebelum mulai
            const GRACE=10*60*1000; // 10 menit setelah selesai (grace period)
            const jadwals=[];
            snap.forEach(d=>{jadwals.push({id:d.id,...d.data()});});
            // Filter: hanya tampilkan jadwal yang dalam window aktif (5 mnt sebelum s/d 10 mnt sesudah)
            const visibleJadwals=jadwals.filter(jd=>{
                const mulai=jd.mulai_timestamp?.toMillis?.();
                const selesai=jd.selesai_timestamp?.toMillis?.();
                if(!mulai||!selesai)return false;
                return now>=(mulai-EARLY)&&now<=(selesai+GRACE);
            });
            if(!visibleJadwals.length){
                // Tidak ada jadwal dalam window aktif — sembunyikan tab
                if(tabBtn)tabBtn.style.display='none';
                sel.innerHTML='<option value="">Tidak ada ulangan aktif saat ini</option>';
                return;
            }
            // Urutkan: aktif dulu, lalu terbaru
            visibleJadwals.sort((a,b)=>{
                const isActive=jd=>{const m=jd.mulai_timestamp?.toMillis?.();const s=jd.selesai_timestamp?.toMillis?.();return m&&s&&now>=m&&now<=s;};
                if(isActive(a)&&!isActive(b))return -1;
                if(!isActive(a)&&isActive(b))return 1;
                return (b.timestamp?.seconds||0)-(a.timestamp?.seconds||0);
            });
            sel.innerHTML='<option value="">Pilih Jadwal Ulangan...</option>';
            visibleJadwals.forEach(jd=>{
                const opt=document.createElement('option');
                opt.value=jd.id;
                const mulai=jd.mulai_timestamp?.toMillis?.();
                const selesai=jd.selesai_timestamp?.toMillis?.();
                const isActive=mulai&&selesai&&now>=mulai&&now<=selesai;
                const isSoon=mulai&&now<mulai&&(mulai-now)<=EARLY;
                const prefix=isActive?'▶ ':isSoon?'⏳ ':'✓ ';
                const kelasFull=jd.kelas_exact||jd.kelas||'-';
                opt.textContent=`${prefix}${jd.mapel||'-'} — ${kelasFull} — ${jd.tanggal||'-'}`;
                sel.appendChild(opt);
            });
            // Update tab button label dengan nama kelas jadwal pertama (atau yang aktif)
            const firstJd=visibleJadwals[0];
            const kelasFull=firstJd.kelas_exact||firstJd.kelas||'-';
            if(tabBtn){
                tabBtn.style.display='';
                tabBtn.innerHTML=`&#128275; Monitor Ruang (${kelasFull})`;
            }
            // Auto-select jadwal aktif dan load
            const activeJd=visibleJadwals.find(jd=>{const m=jd.mulai_timestamp?.toMillis?.();const s=jd.selesai_timestamp?.toMillis?.();return m&&s&&now>=m&&now<=s;});
            const toSelect=activeJd||visibleJadwals[0];
            if(toSelect){
                sel.value=toSelect.id;
                // Update tab label ke kelas jadwal yang dipilih
                const k=toSelect.kelas_exact||toSelect.kelas||'-';
                if(tabBtn)tabBtn.innerHTML=`&#128275; Monitor Ruang (${k})`;
                loadGuruControlRuang();
            }
        }catch(e){if(tabBtn)tabBtn.style.display='none';}
    }

    window.onGuruControlJadwalChange=async function(){
        const sel=document.getElementById('guruControlJadwalSelect');
        const tabBtn=document.getElementById('guruControlTab');
        if(sel&&tabBtn&&sel.value){
            // Update tab label ke kelas jadwal terpilih
            try{
                const jdSnap=await getDoc(doc(db,'jadwal',sel.value));
                if(jdSnap.exists()){
                    const jd=jdSnap.data();
                    const k=jd.kelas_exact||jd.kelas||'-';
                    tabBtn.innerHTML=`&#128275; Monitor Ruang (${k})`;
                }
            }catch(e){}
        }
        loadGuruControlRuang();
    };
    let _guruControlAutoRefresh=null;
    window.loadGuruControlRuang=async function(){
        const jadwalId=document.getElementById('guruControlJadwalSelect')?.value;
        const siswaEl=document.getElementById('guruControlSiswaList');
        const violEl=document.getElementById('guruControlViolList');
        const statusCard=document.getElementById('guruControlStatusCard');
        const statusEl=document.getElementById('guruControlStatus');
        if(!jadwalId){
            if(siswaEl)siswaEl.innerHTML='<div class="empty-state"><div>Pilih jadwal ulangan terlebih dahulu</div></div>';
            if(violEl)violEl.innerHTML='<div class="empty-state"><div>Tidak ada data</div></div>';
            if(statusCard)statusCard.style.display='none';
            if(_guruControlAutoRefresh){clearInterval(_guruControlAutoRefresh);_guruControlAutoRefresh=null;}
            return;
        }
        // Stop previous auto-refresh
        if(_guruControlAutoRefresh){clearInterval(_guruControlAutoRefresh);_guruControlAutoRefresh=null;}
        showLoader('Memuat data monitor...');
        try{
            const jdSnap=await getDoc(doc(db,'jadwal',jadwalId));
            if(!jdSnap.exists()){hideLoader();return;}
            const jd=jdSnap.data();
            // Kelas target WAJIB exact match
            const kelasFull=jd.kelas_exact||jd.kelas||'';
            if(statusCard)statusCard.style.display='';
            // === Status ulangan ===
            const now=Date.now();
            const mulai=jd.mulai_timestamp?.toMillis?.();
            const selesai=jd.selesai_timestamp?.toMillis?.();
            if(statusEl){
                if(mulai&&selesai){
                    if(now<mulai){
                        const sisaMnt=Math.ceil((mulai-now)/60000);
                        statusEl.innerHTML=`<span class="badge badge-blue">⏳ Belum Mulai — Mulai dalam ${sisaMnt} menit</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: <strong>${kelasFull}</strong></span>`;
                    }else if(now>=mulai&&now<=selesai){
                        const sisaMnt=Math.ceil((selesai-now)/60000);
                        statusEl.innerHTML=`<span class="badge badge-green">&#9679; BERLANGSUNG — Sisa ${sisaMnt} menit</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: <strong>${kelasFull}</strong> | ${jd.mapel||'-'}</span>`;
                    }else{
                        statusEl.innerHTML=`<span class="badge badge-red">✓ Selesai</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: ${kelasFull}</span>`;
                    }
                }else{statusEl.innerHTML=`<span class="badge">Waktu tidak ditentukan</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: ${kelasFull}</span>`;}
            }
            // === Ambil HANYA siswa di kelas yang ditargetkan ===
            const studSnap=await getDocs(query(collection(db,'users'),where('role','==','siswa'),where('kelas','==',kelasFull)));
            const siswaList=[];
            const nisSet=new Set();
            studSnap.forEach(d=>{const u={...d.data(),nis:d.id};siswaList.push(u);nisSet.add(d.id);});
            // Ambil nilai (filter by jadwal_id), progress, dan lock
            const [nilaiSnap,progSnap,lockSnap]=await Promise.all([
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jadwalId))),
                getDocs(collection(db,'exam_progress')),
                getDocs(collection(db,'siswa_lock'))
            ]);
            const nilaiMap={};
            nilaiSnap.forEach(d=>{const nd=d.data();if(nisSet.has(nd.nis))nilaiMap[nd.nis]=nd;});
            const progMap={};
            progSnap.forEach(d=>{const nis=d.data().nis||(d.id.includes('_')?d.id.split('_')[0]:d.id);if(nisSet.has(nis))progMap[nis]=d.data();});
            const lockMap={};
            lockSnap.forEach(d=>{if(nisSet.has(d.id))lockMap[d.id]=d.data();});
            // === Render tabel siswa ===
            if(!siswaList.length){
                if(siswaEl)siswaEl.innerHTML=`<div class="empty-state"><div>Tidak ada siswa di kelas ${kelasFull}</div></div>`;
            }else{
                // Sort: terkunci > mengerjakan > belum mulai > selesai
                siswaList.sort((a,b)=>{
                    const ord=u=>{const l=lockMap[u.nis];const n=nilaiMap[u.nis];const p=progMap[u.nis];
                    if(l?.locked)return 0;if(p&&!n)return 1;if(!p&&!n)return 2;return 3;};
                    return ord(a)-ord(b);
                });
                const selesai_count=Object.keys(nilaiMap).length;
                const mengerjakan_count=Object.values(progMap).filter(p=>!nilaiMap[p.nis||'']).length;
                const terkunci_count=Object.values(lockMap).filter(l=>l.locked).length;
                let html=`<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
                    <span class="badge badge-green">&#10003; Selesai: ${selesai_count}</span>
                    <span class="badge badge-blue">&#9679; Mengerjakan: ${mengerjakan_count}</span>
                    <span class="badge badge-red">&#128274; Terkunci: ${terkunci_count}</span>
                    <span class="badge">Total: ${siswaList.length} siswa</span>
                </div>`;
                html+='<div class="table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>NIS</th><th>Status</th><th>Pelanggaran</th><th>Aksi</th></tr></thead><tbody>';
                siswaList.forEach((u,idx)=>{
                    const nilai=nilaiMap[u.nis];const prog=progMap[u.nis];const lock=lockMap[u.nis];
                    let statusBadge;
                    if(lock?.locked){
                        const r=(lock.reason||'').toLowerCase();
                        const isExit=r.includes('keluar')||r.includes('exit')||r.includes('minimize');
                        statusBadge=isExit?'<span class="badge badge-red">&#128683; Keluar Aplikasi</span>':'<span class="badge badge-red">&#128274; Terkunci</span>';
                    }else if(nilai){statusBadge='<span class="badge badge-green">&#10003; Selesai</span>';}
                    else if(prog){statusBadge='<span class="badge badge-blue">&#9679; Mengerjakan</span>';}
                    else{statusBadge='<span class="badge" style="color:var(--text3)">&#9711; Belum Mulai</span>';}
                    const pelCount=nilai?.pelanggaran||prog?.violation_count||0;
                    const pelBadge=pelCount>0?`<span class="badge badge-red">${pelCount}</span>`:'<span style="color:var(--text3)">-</span>';
                    const aksiBtn=lock?.locked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="openGuruUnlockModal('${u.nis}','${(u.nama_lengkap||u.nis).replace(/'/g,"")}')">&#128275; Buka Kunci</button>`:'-';
                    html+=`<tr><td style="color:var(--text3);font-size:12px">${u.no_absen||idx+1}</td><td>${u.nama_lengkap||'-'}</td><td style="font-family:var(--font-mono);font-size:12px">${u.nis}</td><td>${statusBadge}</td><td>${pelBadge}</td><td>${aksiBtn}</td></tr>`;
                });
                html+='</tbody></table></div>';
                if(siswaEl)siswaEl.innerHTML=html;
            }
            // === Pelanggaran di jadwal ini ===
            const violSnap=await getDocs(query(collection(db,'pelanggaran'),where('jadwal_id','==',jadwalId)));
            if(violSnap.empty){
                if(violEl)violEl.innerHTML='<div class="empty-state"><div>Tidak ada pelanggaran tercatat</div></div>';
            }else{
                let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jenis</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
                violSnap.forEach(d=>{
                    const vd=d.data();
                    if(!nisSet.has(vd.nis))return; // hanya siswa di kelas ini
                    const statusBadge=vd.unlocked?'<span class="badge badge-green">Dibuka</span>':'<span class="badge badge-red">Terkunci</span>';
                    const btn=!vd.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="openGuruUnlockModal('${vd.nis}','${(vd.nama_lengkap||vd.nis).replace(/'/g,"")}')">&#128275; Buka Kunci</button>`:'-';
                    html+=`<tr><td>${vd.nama_lengkap||'-'}</td><td><span class="violation-badge">${vd.jenis_pelanggaran||'-'}</span></td><td><span class="badge badge-red">${vd.jumlah||0}</span></td><td>${statusBadge}</td><td>${btn}</td></tr>`;
                });
                html+='</tbody></table></div>';
                if(violEl)violEl.innerHTML=html;
            }
            hideLoader();
            // Auto-refresh setiap 30 detik saat ulangan berlangsung
            if(mulai&&selesai&&now>=mulai&&now<=selesai){
                _guruControlAutoRefresh=setInterval(()=>{
                    if(document.getElementById('guru-control')&&!document.getElementById('guru-control').classList.contains('hidden')){
                        loadGuruControlRuang();
                    }else{
                        clearInterval(_guruControlAutoRefresh);_guruControlAutoRefresh=null;
                    }
                },30000);
            }
        }catch(e){hideLoader();showToast('Gagal memuat monitor: '+e.message,'error');}
    };

    let _guruUnlockTarget=null;
    window.openGuruUnlockModal=function(nis,nama){
        _guruUnlockTarget={nis,nama};
        // Reuse unlock modal panitia jika ada, atau buat sederhana
        const reason=prompt(`Buka kunci untuk ${nama}?\nMasukkan alasan:`);
        if(!reason)return;
        guruConfirmUnlock(nis,reason);
    };
    async function guruConfirmUnlock(nis,reason){
        showLoader('Membuka kunci...');
        try{
            const lockDoc=await getDoc(doc(db,'siswa_lock',nis));
            if(lockDoc.exists()){
                await updateDoc(doc(db,'siswa_lock',nis),{locked:false,unlock_reason:reason,unlocked_by:currentUser.nis,unlocked_at:Timestamp.now()});
            }
            const q=query(collection(db,'pelanggaran'),where('nis','==',nis),where('unlocked','==',false));
            const snap=await getDocs(q);
            const updates=[];
            snap.forEach(d=>updates.push(updateDoc(doc(db,'pelanggaran',d.id),{unlocked:true,unlock_reason:reason,unlocked_by:currentUser.nis,unlocked_at:Timestamp.now()})));
            await Promise.all(updates);
            hideLoader();showToast(`Kunci dibuka untuk ${nis}`,'success');
            loadGuruControlRuang();
        }catch(e){hideLoader();showToast('Gagal membuka kunci','error');}
    }
    async function loadGuruSoal(){
        const container=document.getElementById('guruSoalList');
        if(!container)return;
        try{
            const snap=await getDocs(query(collection(db,'soal'),where('created_by','==',currentUser.nis)));
            if(snap.empty){container.innerHTML='<div class="empty-state"><div>Belum ada soal yang Anda buat</div></div>';return;}
            let html='<div class="table-wrap"><table><thead><tr><th>Mapel</th><th>Kelas</th><th>Jumlah Soal</th><th>Mode</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>';
            snap.forEach(d=>{
                const dt=d.data();
                const modeBadge=dt.mode==='ulangan'?'<span class="badge badge-yellow">Ulangan</span>':'<span class="badge badge-blue">Ujian</span>';
                html+=`<tr><td>${dt.mapel||'-'}</td><td>${dt.kelas||'-'}</td><td>${dt.jumlah_soal||0}</td><td>${modeBadge}</td><td>${formatWIBShort(dt.timestamp)}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openKelolaSoalModal('${d.id}')">&#128196; Kelola</button><button class="btn btn-danger btn-sm" onclick="deleteSoal('${d.id}')">Hapus</button></td></tr>`;
            });
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat soal</div>';}
    }
    async function loadGuruJadwal(){
        const container=document.getElementById('guruJadwalList');
        if(!container)return;
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            if(snap.empty){container.innerHTML='<div class="empty-state"><div>Belum ada jadwal ulangan. Klik tombol Tambah Jadwal untuk membuat jadwal baru.</div></div>';return;}
            let html='<div class="table-wrap"><table><thead><tr><th>Mapel</th><th>Kelas</th><th>Tanggal</th><th>Jam</th><th>Durasi</th><th>Aksi</th></tr></thead><tbody>';
            snap.forEach(d=>{
                const dt=d.data();
                html+=`<tr><td>${dt.mapel||'-'}</td><td>${dt.kelas||'-'}</td><td>${dt.tanggal||'-'}</td><td>${dt.jam_mulai||'-'}</td><td>${dt.durasi||90} mnt</td><td style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" onclick="openEditJadwalModal('${d.id}','${dt.tanggal||''}',${dt.jam||8},${dt.menit||0},'${dt.ampm||'AM'}',${dt.durasi||90})">&#9998; Edit</button><button class="btn btn-danger btn-sm" onclick="deleteJadwal('${d.id}')">Hapus</button></td></tr>`;
            });
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat jadwal</div>';}
    }
    // ═══════════════════════════════════════════════════════════
    // GURU: NILAI — List per Ulangan, Nilai Asli + Dibulatkan, Publish/Private, Export
    // ═══════════════════════════════════════════════════════════
    let _guruNilaiCurrentJadwal=null; // {id, data}
    let _guruNilaiCache=[]; // nilai siswa untuk jadwal yang dipilih
    let _guruNilaiPublished=false;

    async function loadGuruNilaiJadwalFilter(){
        // Tampilkan list semua ulangan guru (card per ulangan), termasuk yang jadwalnya sudah dihapus
        const container=document.getElementById('guruNilaiUlanganList');
        const detail=document.getElementById('guruNilaiDetail');
        if(detail)detail.style.display='none';
        if(!container)return;
        container.style.display='';
        container.innerHTML='<div style="color:var(--text3);font-family:var(--font-mono);font-size:12px;padding:8px">Memuat daftar ulangan...</div>';
        try{
            // 1) Ambil jadwal yang masih ada milik guru ini
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            const activeJadwalIds=new Set();
            snap.forEach(d=>activeJadwalIds.add(d.id));

            // 2) Ambil semua nilai_ulangan — TANPA filter apapun karena:
            //    - assigned_guru bisa null di data lama
            //    - query dengan mode filter butuh composite index Firestore
            //    Filter dilakukan di client setelah data masuk.
            const [nilaiUlSnap, allJadwalSnap]=await Promise.all([
                getDocs(collection(db,'nilai_ulangan')),
                getDocs(collection(db,'jadwal'))
            ]);
            // Set semua jadwal yang masih ada (dari semua guru)
            const allExistingJadwalIds=new Set();
            allJadwalSnap.forEach(d=>allExistingJadwalIds.add(d.id));

            // Kumpulkan jadwal_id yang ada nilainya tapi jadwalnya sudah dihapus total
            const orphanJadwalMap={};
            const processOrphan=(d)=>{
                const dt=d.data();
                const jid=dt.jadwal_id;
                if(!jid)return;
                // Skip jika jadwal masih ada
                if(allExistingJadwalIds.has(jid))return;
                if(!orphanJadwalMap[jid]){
                    orphanJadwalMap[jid]={
                        mapel:dt.mapel||dt.mata_pelajaran||'(Mapel tidak diketahui)',
                        kelas:dt.kelas||'-',
                        tanggal:dt.waktu_selesai?String(dt.waktu_selesai).slice(0,10):(dt.tanggal||'-'),
                        nilaiCount:0
                    };
                }
                orphanJadwalMap[jid].nilaiCount++;
            };
            nilaiUlSnap.forEach(processOrphan);

            const today=new Date().toISOString().slice(0,10);
            const hasActive=!snap.empty;
            const hasOrphan=Object.keys(orphanJadwalMap).length>0;

            if(!hasActive&&!hasOrphan){
                container.innerHTML='<div class="empty-state"><div>Belum ada ulangan yang dibuat</div></div>';
                return;
            }

            let html='';

            // 3) Tampilkan jadwal aktif
            if(hasActive){
                html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">';
                snap.forEach(d=>{
                    const dt=d.data();
                    const isToday=dt.tanggal===today;
                    html+=`<div class="card" style="cursor:pointer;border-color:${isToday?'var(--accent)':'var(--border)'}" onclick="guruSelectNilaiJadwal('${d.id}',false)">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                            <span class="badge ${isToday?'badge-green':'badge-blue'}">${isToday?'Hari Ini':dt.tanggal||'-'}</span>
                            <span class="badge badge-yellow" style="font-size:10px">${dt.kelas||'-'}</span>
                        </div>
                        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${dt.mapel||'-'}</div>
                        <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${dt.jam_mulai||'-'} | ${dt.durasi||90} mnt</div>
                        <div style="margin-top:12px"><button class="btn btn-primary btn-sm" style="width:100%">Lihat Nilai &rarr;</button></div>
                    </div>`;
                });
                html+='</div>';
            }

            // 4) Tampilkan nilai dari jadwal yang sudah dihapus (orphaned)
            if(hasOrphan){
                html+=`<div style="margin-bottom:12px;padding:10px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius);font-size:12px;font-family:var(--font-mono);color:var(--yellow)">
                    &#9888; Nilai berikut berasal dari jadwal/soal yang sudah dihapus. Nilai tetap tersimpan dan bisa di-export CSV.
                </div>`;
                html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">';
                Object.entries(orphanJadwalMap).forEach(([jid,info])=>{
                    html+=`<div class="card" style="cursor:pointer;border-color:var(--yellow);" onclick="guruSelectNilaiJadwal('${jid}',true)">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                            <span class="badge badge-yellow">&#128465; Jadwal Dihapus</span>
                            <span class="badge badge-yellow" style="font-size:10px">${info.kelas}</span>
                        </div>
                        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${info.mapel}</div>
                        <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">Sekitar: ${info.tanggal} &nbsp;|&nbsp; ${info.nilaiCount} nilai tersimpan</div>
                        <div style="margin-top:12px"><button class="btn btn-sm" style="width:100%;background:var(--yellow);border-color:var(--yellow);color:#000">Lihat &amp; Export Nilai &rarr;</button></div>
                    </div>`;
                });
                html+='</div>';
            }

            container.innerHTML=html;
        }catch(e){console.error('loadGuruNilaiJadwalFilter error:',e);container.innerHTML=`<div class="empty-state"><div>Gagal memuat ulangan</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:8px">${e?.message||e}</div></div>`;}
    }
    window.guruSelectNilaiJadwal=async function(jadwalId,isOrphan=false){
        const container=document.getElementById('guruNilaiUlanganList');
        const detail=document.getElementById('guruNilaiDetail');
        if(container)container.style.display='none';
        if(detail)detail.style.display='';
        showLoader('Memuat nilai...');
        try{
            let jd=null;
            if(!isOrphan){
                // Jadwal masih ada — ambil info dari Firestore
                const jSnap=await getDoc(doc(db,'jadwal',jadwalId));
                if(!jSnap.exists()){
                    // Mungkin baru dihapus — fallback ke mode orphan
                    isOrphan=true;
                } else {
                    jd=jSnap.data();
                    _guruNilaiCurrentJadwal={id:jadwalId,data:jd};
                    const titleEl=document.getElementById('guruNilaiDetailTitle');
                    if(titleEl)titleEl.textContent=`${jd.mapel} — ${jd.kelas} — ${jd.tanggal||'-'}`;
                }
            }

            // Load nilai (selalu, baik orphan maupun tidak)
            const [snap1,snap2]=await Promise.all([
                getDocs(query(collection(db,'nilai_ulangan'),where('jadwal_id','==',jadwalId))),
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jadwalId),where('mode','==','ulangan')))
            ]);
            const nilaiMap={};
            snap1.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={id:d.id,...dt};});
            snap2.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={id:d.id,...dt};});
            _guruNilaiCache=Object.values(nilaiMap).sort((a,b)=>(b.nilai_asli??b.nilai??0)-(a.nilai_asli??a.nilai??0));

            if(isOrphan){
                // Rekonstruksi info jadwal dari data nilai itu sendiri
                const sample=_guruNilaiCache[0]||{};
                const jadwalInfo={
                    mapel:sample.mapel||sample.mata_pelajaran||'(Mapel tidak diketahui)',
                    kelas:sample.kelas||'-',
                    tanggal:sample.waktu_selesai?String(sample.waktu_selesai).slice(0,10):(sample.tanggal||'-'),
                    deleted:true
                };
                _guruNilaiCurrentJadwal={id:jadwalId,data:jadwalInfo};
                const titleEl=document.getElementById('guruNilaiDetailTitle');
                if(titleEl)titleEl.textContent=`${jadwalInfo.mapel} — ${jadwalInfo.kelas} — ${jadwalInfo.tanggal} (Jadwal Dihapus)`;
            }

            // Cek status publish nilai untuk jadwal ini
            try{
                const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_nilai_${jadwalId}`));
                _guruNilaiPublished=pubSnap.exists()?Boolean(pubSnap.data().aktif):false;
            }catch(e){_guruNilaiPublished=false;}
            renderGuruNilaiDetail();
            hideLoader();
        }catch(e){hideLoader();showToast('Gagal memuat nilai','error');console.error(e);}
    };
    function guruBackToUlanganList(){
        const container=document.getElementById('guruNilaiUlanganList');
        const detail=document.getElementById('guruNilaiDetail');
        if(container)container.style.display='';
        if(detail)detail.style.display='none';
        _guruNilaiCurrentJadwal=null;
        loadGuruNilaiJadwalFilter();
    }
    function renderGuruNilaiDetail(){
        const container=document.getElementById('guruNilaiDetailList');
        const btn=document.getElementById('guruPublishNilaiBtn');
        const isDeleted=_guruNilaiCurrentJadwal?.data?.deleted===true;
        if(btn){
            if(isDeleted){
                // Jadwal sudah dihapus — sembunyikan tombol publish, tampilkan info
                btn.textContent='Jadwal Dihapus';
                btn.className='btn btn-sm';
                btn.style='background:var(--yellow);border-color:var(--yellow);color:#000;cursor:default';
                btn.onclick=null;
            } else {
                btn.textContent=_guruNilaiPublished?'Privat Nilai':'Publikasi Nilai';
                btn.className=_guruNilaiPublished?'btn btn-secondary btn-sm':'btn btn-success btn-sm';
                btn.style='';
                btn.onclick=toggleGuruPublishNilai;
            }
        }
        if(!container)return;
        if(!_guruNilaiCache.length){container.innerHTML='<div class="empty-state"><div>Belum ada siswa yang mengerjakan ulangan ini</div></div>';return;}
        // Info poin per soal
        const sample=_guruNilaiCache[0];
        const totalSoal=(sample.benar||0)+(sample.salah||0)+(sample.kosong||0);
        const pps=totalSoal?hitungPointPerSoal(totalSoal):'-';
        let html='';
        if(isDeleted){
            html+=`<div class="alert alert-warning" style="margin-bottom:12px;font-size:12px">
                <span style="font-family:var(--font-mono)">&#9888; Jadwal/soal asli sudah dihapus. Nilai siswa tetap tersimpan di server dan dapat di-export. Klik <strong>Export CSV</strong> di atas untuk menyimpan data.</span>
            </div>`;
        }
        html+=`<div class="alert alert-info" style="margin-bottom:12px;font-size:12px">
            <span style="font-family:var(--font-mono)">Total soal: <strong>${totalSoal}</strong> &nbsp;|&nbsp; 
            Point per soal: <strong>${pps}</strong> &nbsp;|&nbsp; 
            Nilai maks asli: <strong>${totalSoal&&pps?totalSoal*pps:'-'}</strong> &nbsp;|&nbsp;
            Status: <strong>${isDeleted?'(Jadwal Dihapus)':_guruNilaiPublished?'✓ Dipublikasi':'Privat'}</strong></span>
        </div>`;
        html+='<div class="table-wrap"><table><thead><tr><th>No.</th><th>NIS</th><th>Nama</th><th>Nilai (Dibulatkan)</th><th>Nilai Asli</th><th>Benar</th><th>Salah</th><th>Kosong</th><th>Waktu</th></tr></thead><tbody>';
        _guruNilaiCache.forEach((dt,i)=>{
            const asli=dt.nilai_asli??dt.nilai_server??dt.nilai??0;
            const bulat=dt.nilai_dibulatkan??dt.nilai_server_bulat??hitungNilaiDibulatkan(dt.benar||0,(dt.benar||0)+(dt.salah||0)+(dt.kosong||0));
            const sc=asli>=80?"badge-green":asli>=60?"badge-yellow":"badge-red";
            html+=`<tr>
                <td style="font-family:var(--font-mono)">${i+1}</td>
                <td>${dt.nis||'-'}</td>
                <td>${dt.nama_lengkap||'-'}</td>
                <td><span class="badge ${sc}">${formatNilai(bulat)}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text2)">${formatNilai(asli)}</td>
                <td style="color:var(--green)">${dt.benar||dt.benar_server||0}</td>
                <td style="color:var(--red)">${dt.salah||dt.salah_server||0}</td>
                <td style="color:var(--text3)">${dt.kosong||dt.kosong_server||0}</td>
                <td style="font-size:11px;color:var(--text3)">${dt.waktu_selesai||'-'}</td>
            </tr>`;
        });
        html+='</tbody></table></div>';
        container.innerHTML=html;
    }
    window.toggleGuruPublishNilai=async function(){
        if(!_guruNilaiCurrentJadwal){return;}
        const jadwalId=_guruNilaiCurrentJadwal.id;
        showLoader('Mengubah status...');
        try{
            const newState=!_guruNilaiPublished;
            const today=new Date().toISOString().slice(0,10);
            await setDoc(doc(db,'settings',`guru_publikasi_nilai_${jadwalId}`),{
                aktif:newState,
                jadwal_id:jadwalId,
                guru_nis:currentUser.nis,
                tanggal:today, // untuk auto-hide ganti hari
                updated_at:Timestamp.now()
            });
            _guruNilaiPublished=newState;
            renderGuruNilaiDetail();
            hideLoader();
            showToast(newState?'Nilai dipublikasikan ke siswa':'Nilai dinonaktifkan dari siswa','success');
        }catch(e){hideLoader();showToast('Gagal mengubah status','error');}
    };
    window.exportGuruNilaiDetail=function(){
        if(!_guruNilaiCache.length){showToast('Belum ada data nilai','warning');return;}
        const jd=_guruNilaiCurrentJadwal?.data||{};
        const rows=[['No.','NIS','Nama','Kelas','Nilai Dibulatkan','Nilai Asli','Benar','Salah','Kosong','Waktu']];
        _guruNilaiCache.forEach((dt,i)=>{
            const asli=dt.nilai_asli??dt.nilai_server??dt.nilai??0;
            const total=(dt.benar||0)+(dt.salah||0)+(dt.kosong||0);
            const bulat=dt.nilai_dibulatkan??hitungNilaiDibulatkan(dt.benar||0,total);
            rows.push([i+1,dt.nis||'',dt.nama_lengkap||'',dt.kelas||'',bulat,asli,dt.benar||0,dt.salah||0,dt.kosong||0,dt.waktu_selesai||'']);
        });
        downloadCSV(rows,`nilai_${jd.mapel||'ulangan'}_${jd.tanggal||'export'}.csv`);
    };
    // Backward compat
    async function loadGuruNilai(){await loadGuruNilaiJadwalFilter();}

    // ═══════════════════════════════════════════════════════════
    // GURU: RANKING — Per Ulangan, auto-hide ganti hari, Publish/Private
    // ═══════════════════════════════════════════════════════════
    let _guruRankingCurrentJadwal=null;
    let _guruRankingPublished=false;

    async function loadGuruRanking(){
        const container=document.getElementById('guruRankingUlanganList');
        const detail=document.getElementById('guruRankingDetail');
        if(detail)detail.style.display='none';
        if(!container)return;
        container.innerHTML='<div style="color:var(--text3);font-family:var(--font-mono);font-size:12px;padding:8px">Memuat...</div>';
        const today=new Date().toISOString().slice(0,10);
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            if(snap.empty){container.innerHTML='<div class="empty-state"><div>Belum ada ulangan</div></div>';return;}
            let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">';
            snap.forEach(d=>{
                const dt=d.data();
                const isToday=dt.tanggal===today;
                html+=`<div class="card" style="cursor:pointer;border-color:${isToday?'var(--accent)':'var(--border)'}" onclick="guruSelectRankingJadwal('${d.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                        <span class="badge ${isToday?'badge-green':'badge-blue'}">${isToday?'Hari Ini':dt.tanggal||'-'}</span>
                        <span class="badge badge-yellow" style="font-size:10px">${dt.kelas||'-'}</span>
                    </div>
                    <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${dt.mapel||'-'}</div>
                    <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${dt.tanggal||'-'} | ${dt.durasi||90} mnt</div>
                    <div style="margin-top:12px"><button class="btn btn-primary btn-sm" style="width:100%">Lihat Peringkat &rarr;</button></div>
                </div>`;
            });
            html+='</div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat</div>';}
    }
    window.guruSelectRankingJadwal=async function(jadwalId){
        const listEl=document.getElementById('guruRankingUlanganList');
        const detail=document.getElementById('guruRankingDetail');
        if(listEl)listEl.style.display='none';
        if(detail)detail.style.display='';
        showLoader('Memuat peringkat...');
        const today=new Date().toISOString().slice(0,10);
        try{
            const jSnap=await getDoc(doc(db,'jadwal',jadwalId));
            if(!jSnap.exists()){hideLoader();return;}
            _guruRankingCurrentJadwal={id:jadwalId,data:jSnap.data()};
            const jd=jSnap.data();
            const titleEl=document.getElementById('guruRankingDetailTitle');
            if(titleEl)titleEl.textContent=`${jd.mapel} — ${jd.kelas} — ${jd.tanggal||'-'}`;
            // Cek publish state
            try{
                const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_ranking_${jadwalId}`));
                if(pubSnap.exists()){
                    const pd=pubSnap.data();
                    // Auto-hide jika sudah ganti hari
                    if(pd.aktif&&pd.tanggal&&pd.tanggal!==today){
                        // auto-off
                        await setDoc(doc(db,'settings',`guru_publikasi_ranking_${jadwalId}`),{...pd,aktif:false,auto_hidden:true});
                        _guruRankingPublished=false;
                    }else{
                        _guruRankingPublished=Boolean(pd.aktif);
                    }
                }else{_guruRankingPublished=false;}
            }catch(e){_guruRankingPublished=false;}
            // Load nilai siswa untuk jadwal ini
            const [snap1,snap2]=await Promise.all([
                getDocs(query(collection(db,'nilai_ulangan'),where('jadwal_id','==',jadwalId))),
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jadwalId),where('mode','==','ulangan')))
            ]);
            const nilaiMap={};
            snap1.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={...dt};});
            snap2.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={...dt};});
            const ranked=Object.values(nilaiMap).sort((a,b)=>(b.nilai_asli??b.nilai??0)-(a.nilai_asli??a.nilai??0));
            renderGuruRankingDetail(ranked);
            hideLoader();
        }catch(e){hideLoader();showToast('Gagal memuat peringkat','error');}
    };
    function renderGuruRankingDetail(ranked){
        const container=document.getElementById('guruRankingList');
        const btn=document.getElementById('guruPublishRankingBtn');
        if(btn){
            btn.textContent=_guruRankingPublished?'Privat Peringkat':'Publikasi Peringkat';
            btn.className=_guruRankingPublished?'btn btn-secondary btn-sm':'btn btn-success btn-sm';
        }
        if(!container)return;
        if(!ranked.length){container.innerHTML='<div class="empty-state"><div>Belum ada peserta</div></div>';return;}
        let html='<div>';
        ranked.forEach((u,i)=>{
            const asli=u.nilai_asli??u.nilai_server??u.nilai??0;
            const bulat=u.nilai_dibulatkan??u.nilai_server_bulat??hitungNilaiDibulatkan(u.benar||0,(u.benar||0)+(u.salah||0)+(u.kosong||0));
            const numClass=i===0?"gold":i===1?"silver":i===2?"bronze":"";
            html+=`<div class="ranking-item">
                <div class="ranking-num ${numClass}">${i+1}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${u.nama_lengkap||u.nama||'-'}</div>
                    <div class="ranking-detail">${u.nis||'-'} | ${u.kelas||'-'}</div>
                </div>
                <div class="ranking-score">
                    ${formatNilai(bulat)}
                    <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">asli: ${formatNilai(asli)}</div>
                </div>
            </div>`;
        });
        html+='</div>';
        container.innerHTML=html;
    }
    function guruBackToRankingList(){
        const listEl=document.getElementById('guruRankingUlanganList');
        const detail=document.getElementById('guruRankingDetail');
        if(listEl)listEl.style.display='';
        if(detail)detail.style.display='none';
        _guruRankingCurrentJadwal=null;
        loadGuruRanking();
    }
    window.guruBackToRankingList=guruBackToRankingList;
    window.toggleGuruPublishRanking=async function(){
        if(!_guruRankingCurrentJadwal)return;
        const jadwalId=_guruRankingCurrentJadwal.id;
        showLoader('Mengubah status...');
        try{
            const newState=!_guruRankingPublished;
            const today=new Date().toISOString().slice(0,10);
            await setDoc(doc(db,'settings',`guru_publikasi_ranking_${jadwalId}`),{
                aktif:newState,
                jadwal_id:jadwalId,
                guru_nis:currentUser.nis,
                tanggal:today, // untuk auto-hide ganti hari
                updated_at:Timestamp.now()
            });
            _guruRankingPublished=newState;
            // Re-render dengan data saat ini
            guruSelectRankingJadwal(jadwalId);
            hideLoader();
            showToast(newState?'Peringkat dipublikasikan':'Peringkat dinonaktifkan','success');
        }catch(e){hideLoader();showToast('Gagal mengubah status','error');}
    };
    async function loadGuruAbsenFilter(){
        const sel=document.getElementById('guruAbsenJadwalFilter');
        if(!sel)return;
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            sel.innerHTML='<option value="">Pilih Jadwal Ulangan...</option>';
            snap.forEach(d=>{const dt=d.data();const o=document.createElement('option');o.value=d.id;o.textContent=`${dt.mapel||'-'} — ${dt.kelas||'-'} — ${dt.tanggal||'-'}`;sel.appendChild(o);});
        }catch(e){}
    }
    async function loadGuruAbsen(){
        const jadwalId=document.getElementById('guruAbsenJadwalFilter')?.value;
        const container=document.getElementById('guruAbsenList');
        if(!container)return;
        if(!jadwalId){container.innerHTML='';return;}
        try{
            const jSnap=await getDoc(doc(db,'jadwal',jadwalId));
            if(!jSnap.exists())return;
            const jd=jSnap.data();
            const studSnap=await getDocs(query(collection(db,'users'),where('role','==','siswa'),where('kelas','==',jd.kelas)));
            const nilaiSnap=await getDocs(query(collection(db,'nilai_ulangan'),where('jadwal_id','==',jadwalId)));
            const worked=new Set();nilaiSnap.forEach(d=>worked.add(d.data().nis));
            const absent=[];studSnap.forEach(d=>{if(!worked.has(d.id)){const u=d.data();u.nis=d.id;absent.push(u);}});
            if(!absent.length){container.innerHTML='<div class="empty-state"><div>Semua siswa sudah mengerjakan</div></div>';return;}
            let html=`<div class="alert alert-warning">${absent.length} siswa belum mengerjakan ulangan ini.</div><div class="table-wrap"><table><thead><tr><th>No. Absen</th><th>Nama</th><th>Kelas</th></tr></thead><tbody>`;
            absent.forEach(s=>{html+=`<tr><td>${s.no_absen||'-'}</td><td>${s.nama_lengkap||'-'}</td><td>${s.kelas||'-'}</td></tr>`;});
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat absensi</div>';}
    }
    async function loadGuruHistory(){
        const container=document.getElementById('guruHistoryList');
        if(!container)return;
        try{
            const snap=await getDocs(query(collection(db,'login_history'),where('nis','==',currentUser.nis),orderBy('timestamp','desc'),limit(100)));
            if(snap.empty){container.innerHTML='<div class="empty-state"><div>Belum ada riwayat login</div></div>';return;}
            let html='<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Perangkat</th></tr></thead><tbody>';
            snap.forEach(d=>{const dt=d.data();html+=`<tr><td>${dt.tanggal_login||'-'}</td><td>${dt.device_model||'-'}</td></tr>`;});
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat riwayat</div>';}
    }
    async function changeGuruPassword(){
        const old=document.getElementById('guruOldPwd').value;
        const nw=document.getElementById('guruNewPwd').value;
        const cf=document.getElementById('guruConfirmPwd').value;
        if(!old||!nw||!cf){showToast('Semua field wajib diisi','error');return;}
        if(nw!==cf){showToast('Password baru tidak cocok','error');return;}
        const hashedOld=await hashPassword(old);
        if(hashedOld!==currentUser.password){showToast('Password lama salah','error');return;}
        showLoader('Mengubah password...');
        try{
            const hashedNew=await hashPassword(nw);
            await updateDoc(doc(db,'users',currentUser.nis),{password:hashedNew});
            currentUser.password=hashedNew;
            hideLoader();showToast('Password berhasil diubah','success');
            document.getElementById('guruOldPwd').value='';
            document.getElementById('guruNewPwd').value='';
            document.getElementById('guruConfirmPwd').value='';
        }catch(e){hideLoader();showToast('Gagal mengubah password','error');}
    }
    function exportGuruNilai(){exportGuruNilaiDetail();}
    function exportGuruHistory(){
        showToast('Export riwayat login...','info');
    }
    window.loadGuruPage=loadGuruPage;
    window.switchGuruTab=switchGuruTab;
    window.loadGuruNilai=loadGuruNilai;
    window.loadGuruAbsen=loadGuruAbsen;
    window.changeGuruPassword=changeGuruPassword;
    window.exportGuruNilai=exportGuruNilai;
    window.exportGuruHistory=exportGuruHistory;
    window.guruBackToUlanganList=guruBackToUlanganList;
    window.renderGuruNilaiDetail=renderGuruNilaiDetail;
    window.guruSelectNilaiJadwal=window.guruSelectNilaiJadwal; // already set above
    window.loadGuruRanking=loadGuruRanking;

    // ═══════════════════════════════════════════════════════════
    // GURU: TAMBAH JADWAL ULANGAN
    // ═══════════════════════════════════════════════════════════
    window.openGuruJadwalModal=async function(){
        const today=new Date().toISOString().split('T')[0];
        document.getElementById('guruJadwalMapel').value='';
        document.getElementById('guruJadwalTanggal').value=today;
        document.getElementById('guruJadwalJam').value=8;
        document.getElementById('guruJadwalMenit').value=0;
        document.getElementById('guruJadwalAmPm').value='AM';
        document.getElementById('guruJadwalDurasi').value=90;
        const sel=document.getElementById('guruJadwalKelas');
        const info=document.getElementById('guruJadwalKelasInfo');
        sel.innerHTML='<option value="">Memuat kelas...</option>';
        if(info)info.textContent='Mengambil data siswa terdaftar...';
        document.getElementById('guruJadwalModal').classList.remove('hidden');
        // Load kelas dari akun siswa terdaftar
        try{
            const snap=await getDocs(query(collection(db,'users'),where('role','==','siswa')));
            const kelasSet=new Set();
            snap.forEach(d=>{const k=d.data().kelas;if(k)kelasSet.add(k);});
            const kelasList=Array.from(kelasSet).sort((a,b)=>{
                // Sort: X < XI < XII, then by subclass
                const ord=k=>k.startsWith('XII')?3:k.startsWith('XI')?2:1;
                if(ord(a)!==ord(b))return ord(a)-ord(b);
                return a.localeCompare(b);
            });
            sel.innerHTML='<option value="">Pilih kelas target...</option>';
            kelasList.forEach(k=>{
                const opt=document.createElement('option');
                opt.value=k;opt.textContent=k;
                sel.appendChild(opt);
            });
            if(!kelasList.length){
                sel.innerHTML='<option value="">Belum ada siswa terdaftar</option>';
                if(info)info.textContent='Tambahkan akun siswa terlebih dahulu.';
            }else{
                if(info)info.textContent=`${kelasList.length} kelas ditemukan dari ${snap.size} siswa terdaftar.`;
            }
        }catch(e){
            sel.innerHTML='<option value="">Gagal memuat kelas</option>';
            if(info)info.textContent='Gagal mengambil data. Coba lagi.';
        }
    };
    window.saveGuruJadwal=async function(){
        const mapel=document.getElementById('guruJadwalMapel').value.trim();
        const kelas=document.getElementById('guruJadwalKelas').value;
        const tanggal=document.getElementById('guruJadwalTanggal').value;
        const jam=parseInt(document.getElementById('guruJadwalJam').value)||8;
        const menit=parseInt(document.getElementById('guruJadwalMenit').value)||0;
        const ampm=document.getElementById('guruJadwalAmPm').value;
        const durasi=parseInt(document.getElementById('guruJadwalDurasi').value)||90;
        if(!mapel){showToast('Mata pelajaran wajib diisi','error');return;}
        if(!kelas){showToast('Pilih kelas target terlebih dahulu','error');return;}
        if(!tanggal){showToast('Tanggal wajib diisi','error');return;}
        let jam24=jam;
        if(ampm==='PM'&&jam<12)jam24=jam+12;
        if(ampm==='AM'&&jam===12)jam24=0;
        const jam_mulai=`${String(jam24).padStart(2,'0')}:${String(menit).padStart(2,'0')}`;
        const mulaiMs=new Date(`${tanggal}T${String(jam24).padStart(2,'0')}:${String(menit).padStart(2,'0')}:00`).getTime();
        const selesaiMs=mulaiMs+(durasi*60*1000);
        const selesaiDate=new Date(selesaiMs);
        const hari=new Date(tanggal+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'});
        // kelas_prefix untuk backward compat (X, XI, XII)
        const kelas_prefix=kelas.startsWith('XII')?'XII':kelas.startsWith('XI')?'XI':'X';
        showLoader('Menyimpan jadwal...');
        try{
            await addDoc(collection(db,'jadwal'),{
                mapel,kelas,kelas_exact:kelas,kelas_prefix,tanggal,hari,jam,menit,ampm,durasi,jam_mulai,jam24_mulai:jam24,
                selesai_jam:selesaiDate.getHours(),selesai_menit:selesaiDate.getMinutes(),
                mulai_timestamp:Timestamp.fromMillis(mulaiMs),selesai_timestamp:Timestamp.fromMillis(selesaiMs),
                soal_ready:false,panitia_ready:true,mode:'ulangan',assigned_guru:currentUser.nis,
                created_by:currentUser.nis,timestamp:Timestamp.now()
            });
            hideLoader();
            document.getElementById('guruJadwalModal').classList.add('hidden');
            showToast(`Jadwal ulangan untuk kelas ${kelas} berhasil ditambahkan`,'success');
            await loadGuruJadwal();
            await loadGuruDashboard();
        }catch(e){hideLoader();showToast('Gagal menyimpan jadwal','error');}
    };

    // ═══════════════════════════════════════════════════════════
    // EDIT JADWAL (tanggal & waktu) — admin & guru
    // ═══════════════════════════════════════════════════════════
    window.openEditJadwalModal=function(id,tanggal,jam,menit,ampm,durasi){
        document.getElementById('editJadwalId').value=id;
        document.getElementById('editJadwalTanggal').value=tanggal||'';
        document.getElementById('editJadwalJam').value=jam||8;
        document.getElementById('editJadwalMenit').value=menit||0;
        document.getElementById('editJadwalAmPm').value=ampm||'AM';
        document.getElementById('editJadwalDurasi').value=durasi||90;
        document.getElementById('editJadwalModal').classList.remove('hidden');
    };
    window.saveEditJadwal=async function(){
        const id=document.getElementById('editJadwalId').value;
        const tanggal=document.getElementById('editJadwalTanggal').value;
        const jam=parseInt(document.getElementById('editJadwalJam').value)||8;
        const menit=parseInt(document.getElementById('editJadwalMenit').value)||0;
        const ampm=document.getElementById('editJadwalAmPm').value;
        const durasi=parseInt(document.getElementById('editJadwalDurasi').value)||90;
        if(!tanggal){showToast('Tanggal wajib diisi','error');return;}
        let jam24=jam;
        if(ampm==='PM'&&jam<12)jam24=jam+12;
        if(ampm==='AM'&&jam===12)jam24=0;
        const jam_mulai=`${String(jam24).padStart(2,'0')}:${String(menit).padStart(2,'0')}`;
        const mulaiMs=new Date(`${tanggal}T${String(jam24).padStart(2,'0')}:${String(menit).padStart(2,'0')}:00`).getTime();
        const selesaiMs=mulaiMs+(durasi*60*1000);
        const selesaiDate=new Date(selesaiMs);
        const hari=new Date(tanggal+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'});
        showLoader('Menyimpan perubahan...');
        try{
            await updateDoc(doc(db,'jadwal',id),{
                tanggal,hari,jam,menit,ampm,durasi,jam_mulai,jam24_mulai:jam24,
                selesai_jam:selesaiDate.getHours(),selesai_menit:selesaiDate.getMinutes(),
                mulai_timestamp:Timestamp.fromMillis(mulaiMs),selesai_timestamp:Timestamp.fromMillis(selesaiMs),
                updated_at:Timestamp.now()
            });
            hideLoader();
            document.getElementById('editJadwalModal').classList.add('hidden');
            showToast('Jadwal berhasil diperbarui','success');
            await loadJadwalList();
            await loadGuruJadwal();
        }catch(e){hideLoader();showToast('Gagal menyimpan perubahan','error');}
    };

    // ═══════════════════════════════════════════════════════════
    // KELOLA SOAL — Lihat soal + upload foto ke Cloudinary
    // ═══════════════════════════════════════════════════════════
    let _kelolaSoalId=null;
    let _kelolaSoalData=null;
    let _kelolaPendingPhotos={}; // {soalIndex: File}

    window.openKelolaSoalModal=async function(soalDocId){
        _kelolaSoalId=soalDocId;
        _kelolaPendingPhotos={};
        const container=document.getElementById('kelolaSoalContainer');
        const titleEl=document.getElementById('kelolaSoalTitle');
        container.innerHTML='<div class="empty-state"><div>Memuat soal...</div></div>';
        document.getElementById('kelolaSoalModal').classList.remove('hidden');
        try{
            const snap=await getDoc(doc(db,'soal',soalDocId));
            if(!snap.exists()){container.innerHTML='<div class="empty-state"><div>Soal tidak ditemukan</div></div>';return;}
            _kelolaSoalData=snap.data();
            const soalArr=_kelolaSoalData.soal||[];
            titleEl.textContent=`Kelola Soal — ${_kelolaSoalData.mapel||'-'} (${soalArr.length} Soal)`;
            if(!soalArr.length){container.innerHTML='<div class="empty-state"><div>Tidak ada soal dalam bank ini</div></div>';return;}
            let html='';
            soalArr.forEach((s,i)=>{
                const existingImg=s.foto_url?`<img src="${s.foto_url}" alt="Foto soal ${i+1}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;object-fit:contain">`: '';
                html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
                    <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Soal ${i+1}</div>
                    <div style="font-size:14px;color:var(--text);margin-bottom:12px;line-height:1.6">${escapeHtml(s.pertanyaan||'-')}</div>
                    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
                        ${['A','B','C','D'].map(l=>`<div style="display:flex;gap:10px;padding:6px 10px;background:var(--surface3);border-radius:6px;font-size:13px"><span style="font-family:var(--font-mono);font-weight:700;color:var(--text3);min-width:20px">${l}.</span><span style="color:var(--text2)">${escapeHtml((s.pilihan||{})[l]||'-')}</span></div>`).join('')}
                    </div>
                    <div style="border-top:1px solid var(--border);padding-top:12px">
                        <div style="font-size:12px;font-family:var(--font-mono);color:var(--text3);margin-bottom:8px">FOTO PENDUKUNG SOAL</div>
                        ${existingImg}
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                            <label class="btn btn-outline btn-sm" style="cursor:pointer">
                                &#128247; ${s.foto_url?'Ganti Foto':'Tambah Foto'}
                                <input type="file" accept="image/*" style="display:none" onchange="handleSoalPhotoSelect(event,${i})">
                            </label>
                            ${s.foto_url?`<button class="btn btn-danger btn-sm" onclick="removeSoalPhoto(${i})">Hapus Foto</button>`:''}
                        </div>
                        <div id="soalPhotoPreview_${i}" style="margin-top:8px"></div>
                        <div id="soalPhotoStatus_${i}" style="font-size:11px;font-family:var(--font-mono);color:var(--text3);margin-top:4px"></div>
                    </div>
                </div>`;
            });
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state"><div>Gagal memuat soal</div></div>';}
    };

    function escapeHtml(str){
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    window.handleSoalPhotoSelect=function(event,soalIndex){
        const file=event.target.files[0];
        if(!file)return;
        if(file.size>5*1024*1024){showToast('Ukuran foto maksimal 5MB','error');return;}
        _kelolaPendingPhotos[soalIndex]=file;
        const previewEl=document.getElementById(`soalPhotoPreview_${soalIndex}`);
        const statusEl=document.getElementById(`soalPhotoStatus_${soalIndex}`);
        if(previewEl){
            const url=URL.createObjectURL(file);
            previewEl.innerHTML=`<img src="${url}" alt="Preview" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--accent);object-fit:contain">`;
        }
        if(statusEl)statusEl.textContent=`Foto dipilih: ${file.name} (${(file.size/1024).toFixed(1)} KB) — Klik "Simpan Perubahan Foto" untuk upload`;
    };

    window.removeSoalPhoto=async function(soalIndex){
        const ok=await showConfirm('Hapus Foto','Hapus foto dari soal ini?','Ya, Hapus','btn-danger','');
        if(!ok)return;
        if(!_kelolaSoalId||!_kelolaSoalData)return;
        const soalArr=[..._kelolaSoalData.soal];
        soalArr[soalIndex]={...soalArr[soalIndex],foto_url:''};
        showLoader('Menghapus foto...');
        try{
            await updateDoc(doc(db,'soal',_kelolaSoalId),{soal:soalArr,updated_at:Timestamp.now()});
            _kelolaSoalData={..._kelolaSoalData,soal:soalArr};
            delete _kelolaPendingPhotos[soalIndex];
            hideLoader();
            showToast('Foto dihapus','success');
            await openKelolaSoalModal(_kelolaSoalId);
        }catch(e){hideLoader();showToast('Gagal menghapus foto','error');}
    };

    async function uploadToCloudinary(file){
        if(CLOUDINARY_CLOUD_NAME==='YOUR_CLOUD_NAME'||CLOUDINARY_UPLOAD_PRESET==='YOUR_UPLOAD_PRESET'){
            throw new Error('Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di kode.');
        }
        const formData=new FormData();
        formData.append('file',file);
        formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);
        const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:formData});
        if(!res.ok)throw new Error('Upload gagal: '+res.status);
        const data=await res.json();
        return data.secure_url;
    }

    window.saveKelolaSoalPhotos=async function(){
        if(!_kelolaSoalId||!_kelolaSoalData){showToast('Tidak ada soal yang dimuat','error');return;}
        const pendingKeys=Object.keys(_kelolaPendingPhotos);
        if(!pendingKeys.length){showToast('Tidak ada foto baru untuk disimpan','info');return;}
        const saveBtn=document.getElementById('kelolaSoalSaveBtn');
        if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Mengupload...';}
        showLoader('Mengupload foto ke Cloudinary...');
        try{
            const soalArr=[..._kelolaSoalData.soal];
            for(const idxStr of pendingKeys){
                const i=parseInt(idxStr);
                const file=_kelolaPendingPhotos[i];
                const statusEl=document.getElementById(`soalPhotoStatus_${i}`);
                if(statusEl)statusEl.textContent='Mengupload...';
                try{
                    const url=await uploadToCloudinary(file);
                    soalArr[i]={...soalArr[i],foto_url:url};
                    if(statusEl)statusEl.textContent='✓ Upload berhasil';
                }catch(uploadErr){
                    if(statusEl)statusEl.textContent='✗ Gagal upload: '+uploadErr.message;
                    hideLoader();
                    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Simpan Perubahan Foto';}
                    showToast('Upload foto gagal. '+uploadErr.message,'error');
                    return;
                }
            }
            await updateDoc(doc(db,'soal',_kelolaSoalId),{soal:soalArr,updated_at:Timestamp.now()});
            _kelolaSoalData={..._kelolaSoalData,soal:soalArr};
            _kelolaPendingPhotos={};
            hideLoader();
            if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Simpan Perubahan Foto';}
            showToast(`${pendingKeys.length} foto berhasil disimpan!`,'success');
            await loadSoalList();
            await loadGuruSoal();
        }catch(e){
            hideLoader();
            if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Simpan Perubahan Foto';}
            showToast('Gagal menyimpan foto: '+e.message,'error');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // IMPORT AKUN MASSAL
    // ═══════════════════════════════════════════════════════════
    window.openImportAkunModal=function(){
        document.getElementById('importAkunText').value='';
        document.getElementById('importAkunProgress').classList.add('hidden');
        document.getElementById('importAkunResult').classList.add('hidden');
        document.getElementById('importAkunModal').classList.remove('hidden');
    };
    function parseImportLine(line){
        // Split by comma, trim each part
        const parts=line.split(',').map(p=>p.trim()).filter(p=>p.length>0);
        if(parts.length<3)return null;
        const role=parts[parts.length-1].toLowerCase();
        if(role==='siswa'&&parts.length>=6){
            const nis=parts[0];
            // nama bisa mengandung koma — ambil semua parts antara index 1 dan length-5
            // Format: nis, nama..., kelas, no_absen, no_ruang, siswa
            const noRuang=parts[parts.length-2];
            const noAbsen=parts[parts.length-3];
            const kelas=parts[parts.length-4];
            const nama=parts.slice(1,parts.length-4).join(', ');
            if(!nis||!nama||!kelas||!noAbsen||!noRuang)return null;
            if(isNaN(parseInt(noAbsen))||isNaN(parseInt(noRuang)))return null;
            return{nis,nama_lengkap:nama,kelas,no_absen:parseInt(noAbsen),ruang:parseInt(noRuang),role:'siswa'};
        }
        if(role==='panitia'&&parts.length>=3){
            const nis=parts[0];
            const nama=parts.slice(1,parts.length-1).join(', ');
            return{nis,nama_lengkap:nama,role:'panitia'};
        }
        if(role==='admin'&&parts.length>=3){
            const nis=parts[0];
            const nama=parts.slice(1,parts.length-1).join(', ');
            return{nis,nama_lengkap:nama,role:'admin'};
        }
        if(role==='guru'&&parts.length>=3){
            const nis=parts[0];
            const nama=parts.slice(1,parts.length-1).join(', ');
            return{nis,nama_lengkap:nama,role:'guru'};
        }
        return null;
    }
    window.executeImportAkun=async function(){
        const raw=document.getElementById('importAkunText').value;
        const lines=raw.split('\n').map(l=>l.trim()).filter(l=>l.length>0&&!l.startsWith('//'));
        if(!lines.length){showToast('Data kosong','error');return;}
        // Parse all lines
        const parsed=[];
        const errors=[];
        const kelasAbsenMap={};
        lines.forEach((line,i)=>{
            const obj=parseImportLine(line);
            if(!obj){errors.push(`Baris ${i+1}: format tidak valid — "${line.slice(0,60)}"`);return;}
            // Cek duplikasi no absen per kelas dalam batch
            if(obj.role==='siswa'){
                const key=obj.kelas+'_'+obj.no_absen;
                if(kelasAbsenMap[key]){errors.push(`Baris ${i+1}: No absen ${obj.no_absen} di kelas ${obj.kelas} duplikat dalam import`);return;}
                kelasAbsenMap[key]=true;
            }
            parsed.push(obj);
        });
        if(errors.length){
            const resultEl=document.getElementById('importAkunResult');
            resultEl.classList.remove('hidden');
            resultEl.innerHTML=`<div class="alert alert-error"><strong>${errors.length} error ditemukan:</strong><br>${errors.slice(0,10).map(e=>`<div>${e}</div>`).join('')}${errors.length>10?`<div>... dan ${errors.length-10} error lainnya</div>`:''}</div>`;
            return;
        }
        const btn=document.getElementById('importAkunBtn');
        btn.disabled=true;
        const progDiv=document.getElementById('importAkunProgress');
        const progBar=document.getElementById('importAkunBar');
        const progStatus=document.getElementById('importAkunStatus');
        const resultEl=document.getElementById('importAkunResult');
        progDiv.classList.remove('hidden');
        resultEl.classList.add('hidden');
        let success=0,skip=0,fail=0;
        const hashedPwd=await hashPassword(DEFAULT_PASSWORD);
        // Ambil semua akun siswa existing untuk cek duplikasi no absen
        let existSiswa=[];
        try{
            const ss=await getDocs(query(collection(db,'users'),where('role','==','siswa')));
            ss.forEach(d=>{existSiswa.push({...d.data(),id:d.id});});
        }catch(e){}
        // Proses batch — Firestore max 500/batch, gunakan loop dengan delay
        const BATCH_SIZE=100;
        for(let i=0;i<parsed.length;i++){
            const u=parsed[i];
            progBar.style.width=Math.round((i+1)/parsed.length*100)+'%';
            progStatus.textContent=`Memproses ${i+1}/${parsed.length}: ${u.nama_lengkap}`;
            try{
                const existing=await getDoc(doc(db,'users',u.nis));
                if(existing.exists()){skip++;continue;}
                if(u.role==='siswa'){
                    const dup=existSiswa.find(e=>e.kelas===u.kelas&&parseInt(e.no_absen||0)===u.no_absen);
                    if(dup){fail++;errors.push(`NIS ${u.nis}: No absen ${u.no_absen} di kelas ${u.kelas} sudah ada (${dup.id})`);continue;}
                }
                const data={nama_lengkap:u.nama_lengkap,role:u.role,password:hashedPwd,created_at:Timestamp.now()};
                if(u.role==='siswa'){data.kelas=u.kelas;data.no_absen=u.no_absen;data.ruang=u.ruang;}
                else{data.kelas=u.role;}
                await setDoc(doc(db,'users',u.nis),data);
                if(u.role==='siswa')existSiswa.push({...data,id:u.nis});
                success++;
            }catch(e){fail++;errors.push(`NIS ${u.nis}: ${e.message||'error'}`);}
            // Micro delay tiap 50 akun agar UI tidak hang
            if(i%50===49)await new Promise(r=>setTimeout(r,10));
        }
        progBar.style.width='100%';
        progStatus.textContent='Selesai!';
        btn.disabled=false;
        resultEl.classList.remove('hidden');
        resultEl.innerHTML=`<div class="alert ${fail?'alert-warning':'alert-success'}">
            <strong>Import selesai!</strong><br>
            ✅ Berhasil: ${success} akun<br>
            ⏭ Dilewati (sudah ada): ${skip} akun<br>
            ❌ Gagal: ${fail} akun
            ${errors.length?'<br><br><strong>Detail error:</strong><br>'+errors.slice(0,5).map(e=>`<div style="font-size:11px">${e}</div>`).join('')+(errors.length>5?`<div style="font-size:11px">... dan ${errors.length-5} lainnya</div>`:''):''}
        </div>`;
        if(success>0)await loadAdminUserList();
    };
    window.generateImportPrompt=function(){
        const promptEl=document.getElementById('importAiPromptText');
        promptEl.textContent=`Kamu adalah asisten yang membantu memformat data akun siswa untuk sistem CBT (Computer Based Test) sekolah.

TUGASMU: Baca data yang saya berikan (bisa dari file Excel, tabel Word, teks acak, atau format apapun), lalu konversi SELURUHNYA ke format teks yang bisa langsung di-paste ke sistem.

FORMAT OUTPUT YANG HARUS DIIKUTI:

Untuk siswa:
nis, nama_lengkap, kelas, no_absen, no_ruang, siswa

Untuk panitia:
nis, nama_lengkap, panitia

Untuk guru:
nis, nama_lengkap, guru

Untuk admin:
nis, nama_lengkap, admin

ATURAN KELAS (ikuti persis):
- Kelas 10: X.1, X.2, X.3, X.4 (bukan "10A" atau "Kelas X1")
- Kelas 11 IPA: XI IPA.1, XI IPA.2, XI IPA.3 (bukan "11 IPA1")
- Kelas 11 IPS: XI IPS.1, XI IPS.2, XI IPS.3 (bukan "11IPS1")
- Kelas 12 IPA: XII IPA.1, XII IPA.2 dll
- Kelas 12 IPS: XII IPS.1, XII IPS.2 dll
- Jika tidak ada jurusan (X): gunakan X.1, X.2 dll

ATURAN LAIN:
- no_absen harus angka, unik per kelas (tidak boleh ada dua siswa dengan absen sama di kelas yang sama)
- no_ruang hanya angka (1-99)
- NIS boleh angka panjang berapapun
- Nama tidak disingkat, tulis lengkap sesuai data

ATURAN OUTPUT:
- OUTPUT HANYA berisi baris-baris data, TIDAK ADA kalimat pembuka, penjelasan, catatan, atau basa-basi
- TIDAK ADA header tabel
- TIDAK ADA penomoran baris
- TIDAK ADA markdown (tidak ada **, tidak ada \`\`\`)
- Satu akun = satu baris
- Jika ada data yang ambigu atau tidak lengkap, gunakan nilai default yang masuk akal
- Jika ada duplikasi no absen dalam satu kelas, tambahkan nomor unik secara berurutan

CONTOH OUTPUT:
14551563624, Trio Lesnar Poe, X.2, 12, 1, siswa
76543673626, Brock Lesnar, XI IPA.1, 11, 5, siswa
74647827832, Obama Marack, XI IPS.3, 1, 1, siswa
11, Leonardo Boim, panitia
162, Joko Suli, guru

Sekarang proses data berikut ini:`;
        document.getElementById('importPromptModal').classList.remove('hidden');
    };
    window.copyImportPrompt=function(){
        const text=document.getElementById('importAiPromptText').textContent;
        navigator.clipboard.writeText(text).then(()=>showToast('Prompt disalin!','success')).catch(()=>showToast('Gagal menyalin','error'));
    };
    window.generateImportPrompt=generateImportPrompt;

    // ═══════════════════════════════════════════════════════════
    // OVERRIDE loadAdminPage untuk inisialisasi mode dan scroll btns
    // ═══════════════════════════════════════════════════════════
    const _origLoadAdminPage=loadAdminPage;
    async function loadAdminPagePatched(){
        await _origLoadAdminPage();
        await loadAppMode();
        initNavScrollBtns('admin');
    }
    // Override loadPanitiaPage untuk scroll btns
    const _origLoadPanitiaPage=loadPanitiaPage;
    async function loadPanitiaPagePatched(){
        await _origLoadPanitiaPage();
        initNavScrollBtns('panitia');
    }
    // Override loadStudentPage untuk scroll btns
    const _origLoadStudentPage=loadStudentPage;
    function loadStudentPagePatched(){
        _origLoadStudentPage();
        setTimeout(()=>initNavScrollBtns('student'),200);
    }
    window.loadAdminPage=loadAdminPagePatched;
    window.loadPanitiaPage=loadPanitiaPagePatched;
    window.loadStudentPage=loadStudentPagePatched;
    loadAdminPage=loadAdminPagePatched;
    loadPanitiaPage=loadPanitiaPagePatched;
    loadStudentPage=loadStudentPagePatched;

    // ═══════════════════════════════════════════════════════════
    // openSoalModal — support mode param
    // ═══════════════════════════════════════════════════════════
    const _origOpenSoalModal=window.openSoalModal;
    window.openSoalModal=async function(mode){
        if(_origOpenSoalModal)await _origOpenSoalModal();
        window._soalMode=mode||'ujian';
    };

(function(){
    function blockDevTools(){
    // Hanya aktif saat ujian berlangsung, bukan saat loading/login
    const examPage=document.getElementById('examPage');
    if(!examPage||!examPage.classList.contains('active'))return;
    const threshold=160;
    if(window.outerWidth-window.innerWidth>threshold||window.outerHeight-window.innerHeight>threshold){
    document.body.innerHTML="Access Denied";
    }
    }
    setInterval(blockDevTools,1000);
    document.addEventListener("keydown",function(e){
    // Hanya blokir saat ujian
    const examPage=document.getElementById('examPage');
    if(!examPage||!examPage.classList.contains('active'))return;
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
    Object.defineProperty(element,"id",{get:function(){devtoolsOpen=true;}});
    setInterval(function(){
    const examPage=document.getElementById('examPage');
    if(!examPage||!examPage.classList.contains('active')){devtoolsOpen=false;return;}
    devtoolsOpen=false;console.log(element);
    if(devtoolsOpen){document.body.innerHTML="Blocked";}
    },1000);
    // Jangan disable console.error agar error saat init tetap terlihat untuk debug
    // console.log=function(){};
    // console.warn=function(){};
    // console.error=function(){};
    })();

(function(){
      'use strict';


      const overlay = document.createElement('div');
      overlay.id = 'ss-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: '#000',
        zIndex: '2147483647', display: 'none',
        pointerEvents: 'none'
      });
      document.body.appendChild(overlay);

      function blackout(ms = 800) {
        overlay.style.display = 'block';
        setTimeout(() => { overlay.style.display = 'none'; }, ms);
      }


      const SS_KEYS = new Set([
        'PrintScreen','F13','F14',

      ]);

      document.addEventListener('keydown', function(e) {

        if (SS_KEYS.has(e.key) || e.key === 'PrintScreen') {
          e.preventDefault();
          blackout(1500);
        }

        if (e.shiftKey && e.key === 'S' && (e.metaKey || e.getModifierState('OS'))) {
          blackout(1500);
        }

        if (e.metaKey && e.shiftKey && ['3','4','5','6'].includes(e.key)) {
          e.preventDefault();
          blackout(1500);
        }

        if (e.ctrlKey && e.key === 'PrintScreen') {
          e.preventDefault();
          blackout(1500);
        }
      }, true);


      const antiSS = document.createElement('style');
      antiSS.textContent = `
        /* Saat print: semua hitam */
        @media print {
          html, body, #app, .page, .card, * {
            visibility: hidden !important;
            background: #000 !important;
            color: #000 !important;
          }
          body::after {
            content: '' !important;
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            background: #000 !important;
            z-index: 99999 !important;
            visibility: visible !important;
          }
        }

        /* CSS Screenshot trick: elemen sensitif pakai ini */
        .exam-content, .question-text, .option-item, #examPage {
          -webkit-user-select: none;
          user-select: none;
        }
      `;
      document.head.appendChild(antiSS);


      window.addEventListener('beforeprint', function(e) {

        document.body.style.visibility = 'hidden';
        document.body.style.background = '#000';
        setTimeout(() => {
          document.body.style.visibility = '';
          document.body.style.background = '';
        }, 100);
      });
      window.addEventListener('afterprint', function() {
        document.body.style.visibility = '';
        document.body.style.background = '';
      });


      async function detectIncognito() {
        return new Promise((resolve) => {

          if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(({quota}) => {

              if (quota && quota < 120 * 1024 * 1024) {
                resolve(true);
              } else {
                resolve(false);
              }
            }).catch(() => resolve(false));
          } else {

            try {
              const db = indexedDB.open('test');
              db.onerror = () => resolve(true);
              db.onsuccess = () => resolve(false);
            } catch(e) {
              resolve(true);
            }
          }
        });
      }


      function isFirefoxPrivate() {
        try {
          localStorage.setItem('__prv_test__', '1');
          localStorage.removeItem('__prv_test__');
          return false;
        } catch(e) {
          return true;
        }
      }

      async function checkPrivacyMode() {
        const incognito = await detectIncognito();
        const ffPrivate = isFirefoxPrivate();

        if (incognito || ffPrivate) {
          showPrivacyWarning();
        }
      }

      function showPrivacyWarning() {

        const examPage = document.getElementById('examPage');
        if (!examPage || examPage.style.display === 'none' ||
            !examPage.classList.contains('active')) return;

        const warn = document.createElement('div');
        warn.innerHTML = `
          <div style="
            position:fixed;inset:0;background:#000;z-index:2147483646;
            display:flex;align-items:center;justify-content:center;
            flex-direction:column;gap:16px;font-family:monospace;color:#ef4444;
            text-align:center;padding:24px;
          ">
            <div style="font-size:48px;">[BLOKIR]</div>
            <div style="font-size:20px;font-weight:bold;">Mode Penyamaran Terdeteksi</div>
            <div style="font-size:14px;color:#aaa;max-width:400px;">
              Ujian tidak dapat dilanjutkan dalam mode Incognito/Private.<br>
              Buka browser biasa dan login kembali.
            </div>
          </div>
        `;
        document.body.appendChild(warn);
      }


      document.addEventListener('DOMContentLoaded', checkPrivacyMode);

      if (document.readyState !== 'loading') checkPrivacyMode();


      let blurCount = 0;
      let blurWarningShown = false;

      window.addEventListener('blur', function() {
        const examPage = document.getElementById('examPage');
        if (!examPage || !examPage.classList.contains('active')) return;

        blurCount++;
        if (blurCount >= 3 && !blurWarningShown) {
          blurWarningShown = true;

          if (typeof showToast === 'function') {
            showToast(`⚠️ Peringatan: Jangan berpindah tab/jendela saat ujian! (${blurCount}x)`, 'error');
          }
        }
      });


      document.addEventListener('visibilitychange', function() {
        const examPage = document.getElementById('examPage');
        if (!examPage || !examPage.classList.contains('active')) return;

        if (document.hidden) {

          console.warn('[PATLAS] Tab disembunyikan saat ujian');
          if (typeof showToast === 'function') {
            showToast('⚠️ Tab berpindah terdeteksi! Aktivitas ini dicatat.', 'error');
          }
        }
      });


      document.addEventListener('dragstart', function(e) { e.preventDefault(); });


      document.addEventListener('copy', function(e) {
        const examPage = document.getElementById('examPage');
        if (!examPage || !examPage.classList.contains('active')) return;
        e.clipboardData.setData('text/plain', '');
        e.preventDefault();
      });


      if ('getDisplayMedia' in navigator.mediaDevices) {
        const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = function(...args) {
          blackout(2000);
          if (typeof showToast === 'function') {
            showToast('[BLOKIR] Screen recording terdeteksi!', 'error');
          }
          return origGetDisplayMedia(...args);
        };
      }

      console.log('[PATLAS] Privacy Shield v2.0 aktif');

    })();

(function(){
      var isAndroid = typeof PatlasAndroid !== 'undefined';

      window.sendExitAttemptAlert = function(method){
        try {
          // Keluar app = pelanggaran yang mengunci akun
          if(typeof recordViolation === 'function' && typeof currentUser !== 'undefined' && currentUser){
            var label = method==='BACK_BUTTON'?'Tombol kembali ditekan':
                        method==='APP_MINIMIZED'?'Aplikasi diminimize':
                        'Keluar aplikasi ('+method+')';
            recordViolation(label, true); // isExit=true => kunci akun
          }
          if(typeof db !== 'undefined' && typeof addDoc !== 'undefined' && typeof collection !== 'undefined' && typeof currentUser !== 'undefined' && currentUser){
            addDoc(collection(db,'exit_attempts'),{
              nis: currentUser.nis||'?', nama: currentUser.nama_lengkap||'?', method: method,
              ts: new Date().toISOString()
            }).catch(function(){});
          }
        } catch(e){}
      };

      var _origStart = window.startExam;
      window.startExam = async function(){
        var result = _origStart ? await _origStart.apply(this, arguments) : undefined;
        return result;
      };

      var _origSubmit = window.submitExam;
      window.submitExam = async function(){
        var result = _origSubmit ? await _origSubmit.apply(this, arguments) : undefined;
        return result;
      };

    })();


  } catch(e) {
    console.error('[PATLAS] Init error:', e);
    document.body.innerHTML = '<div style="font-family:monospace;color:#ef4444;padding:40px;text-align:center"><h2>Gagal memuat</h2><pre>' + e + '</pre></div>';
  }
})();
