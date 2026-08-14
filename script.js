(async function() {
  try {
    const { initializeApp, deleteApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
    const { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where,
             getDocs, orderBy, limit, updateDoc, deleteDoc, serverTimestamp,
             Timestamp, onSnapshot, documentId, deleteField } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
             setPersistence, browserLocalPersistence, updatePassword,
             reauthenticateWithCredential, EmailAuthProvider,
             createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js");
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-check.js");
    const FC={apiKey:"AIzaSyAOPrFTN60IBmgzumjBUWs44BdLgg3DmdU",authDomain:"ujian-patlas-209fa.firebaseapp.com",projectId:"ujian-patlas-209fa",storageBucket:"ujian-patlas-209fa.firebasestorage.app",messagingSenderId:"576325442611",appId:"1:576325442611:web:912f211ad990e103ca5746"};
    const APPCHECK_SITE_KEY="6Lf2RIItAAAAAOi-wWy3Z2ThbitgTKkv3tgl-jqp";
    const app=initializeApp(FC);
    if(location.hostname==="localhost"||location.hostname==="127.0.0.1"){ self.FIREBASE_APPCHECK_DEBUG_TOKEN=true; }
    try{
        initializeAppCheck(app,{provider:new ReCaptchaV3Provider(APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
    }catch(e){}
    const db=getFirestore(app);
    const auth=getAuth(app);
    try{ await setPersistence(auth, browserLocalPersistence); }catch(e){}

    const EMAIL_DOMAIN = "akun.patlas.local";
    function nisToEmail(nis){ return String(nis).trim().toLowerCase()+"@"+EMAIL_DOMAIN; }

    const USERNAME_REGEX = /^[a-z0-9_-]{4,20}$/;
    function isValidUsername(u){
        if(typeof u !== "string") return false;
        if(USERNAME_REGEX.test(u) === false) return false;
        const letterCount=(u.match(/[a-z]/g)||[]).length;
        if(letterCount<4) return false;
        return true;
    }
    function generateUsernameSuggestions(base,count){
        count=count||3;
        let cleaned=String(base||"").toLowerCase().replace(/[^a-z0-9_-]/g,"");
        const letterCount=(cleaned.match(/[a-z]/g)||[]).length;
        if(letterCount<4){
            const fillers=["user","acc","std","opt"];
            let i=0;
            while((cleaned.match(/[a-z]/g)||[]).length<4){
                cleaned=(cleaned+fillers[i%fillers.length]).slice(0,20);
                i++;
                if(i>10)break;
            }
        }
        if(cleaned.length>16)cleaned=cleaned.slice(0,16);
        const suggestions=[];
        const usedNums=new Set();
        let guard=0;
        while(suggestions.length<count&&guard<200){
            guard++;
            const n=Math.floor(Math.random()*9000)+1;
            if(usedNums.has(n))continue;
            usedNums.add(n);
            const candidate=(cleaned+n).slice(0,20);
            if(isValidUsername(candidate))suggestions.push(candidate);
        }
        return suggestions;
    }
    async function resolveLoginIdentifier(rawInput){
        const raw = String(rawInput||"").trim();
        if(!raw) return null;
        try{
            const roleDoc = await getDoc(doc(db,"user_roles",raw));
            if(roleDoc.exists()) return raw;
        }catch(e){}
        const uname = raw.toLowerCase();
        if(!isValidUsername(uname)) return null;
        try{
            const unameDoc = await getDoc(doc(db,"usernames",uname));
            if(unameDoc.exists()){
                const data = unameDoc.data();
                if(data && typeof data.nis === "string" && data.nis) return data.nis;
            }
        }catch(e){}
        return null;
    }

    function waitForAuthInit(){
        return new Promise(resolve=>{
            const unsub = onAuthStateChanged(auth, user=>{ unsub(); resolve(user); });
        });
    }

    async function resolveNisRole(nis){
        try{
            const rDoc = await getDoc(doc(db,"user_roles",nis));
            if(!rDoc.exists())return null;
            return rDoc.data();
        }catch(e){ return null; }
    }

    async function firebaseChangePassword(oldPwd,newPwd){
        if(!auth.currentUser)throw {code:"auth/no-session"};
        const cred=EmailAuthProvider.credential(auth.currentUser.email,oldPwd);
        await reauthenticateWithCredential(auth.currentUser,cred);
        await updatePassword(auth.currentUser,newPwd);
        const nisSelf=(auth.currentUser.email||"").split("@")[0];
        await updateDoc(doc(db,"users",nisSelf),{must_change_password:false,temp_password:deleteField()});
        if(currentUser)currentUser.must_change_password=false;
    }

    const BIO_DISMISS_PREFIX="patlas_bio_dismiss_";

    function biometricSupported(){
        try{
            return typeof PatlasAndroid!=="undefined"
                && typeof PatlasAndroid.isBiometricAvailable==="function"
                && PatlasAndroid.isBiometricAvailable()===true;
        }catch(e){ return false; }
    }
    function fingerprintSupported(){
        try{ return typeof PatlasAndroid!=="undefined" && PatlasAndroid.isFingerprintSupported()===true; }catch(e){ return false; }
    }
    function faceSupported(){
        try{ return typeof PatlasAndroid!=="undefined" && PatlasAndroid.isFaceSupported()===true; }catch(e){ return false; }
    }
    function biometricEnabledFor(nis){
        if(!biometricSupported())return false;
        try{ return PatlasAndroid.isBiometricEnabledForUser(nis)===true; }catch(e){ return false; }
    }
    function getActiveBiometricType(nis){
        if(!nis)return "";
        try{ return PatlasAndroid.getBiometricTypeForUser(nis)||""; }catch(e){ return ""; }
    }
    function bioTypeLabel(type){ return type==="face"?"Face ID":"Sidik Jari"; }
    const ICON_FINGERPRINT='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 1 8 8c0 4.5-1.5 7.5-2.5 9.5"/><path d="M12 2a8 8 0 0 0-8 8c0 5 2 8 3.5 10"/><path d="M12 6a4 4 0 0 1 4 4c0 4-.8 6.5-2 8.5"/><path d="M12 6a4 4 0 0 0-4 4c0 3.2.6 5.2 1.5 7"/><path d="M10 18c.6-1.4 1-2.8 1-4a1 1 0 0 1 2 0"/></svg>';
    const ICON_FACE='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/><circle cx="9" cy="10" r=".6" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r=".6" fill="currentColor" stroke="none"/><path d="M9 15c1 1 5 1 6 0"/></svg>';
    function bioTypeIcon(type){ return type==="face"?ICON_FACE:ICON_FINGERPRINT; }

    let _recentLoginPwd=null, _recentLoginNis=null, _recentLoginTs=0;
    function stashRecentLogin(nis,pwd){ _recentLoginNis=nis;_recentLoginPwd=pwd;_recentLoginTs=Date.now(); }
    function getRecentLoginPwd(nis){
        if(_recentLoginNis===nis && _recentLoginPwd && (Date.now()-_recentLoginTs)<5*60*1000) return _recentLoginPwd;
        return null;
    }

    function maybeOfferBiometricEnable(nis,pwd,role){
        stashRecentLogin(nis,pwd);
        try{
            if(!biometricSupported())return;
            if(biometricEnabledFor(nis))return;
            if(localStorage.getItem(BIO_DISMISS_PREFIX+nis)==="1")return;
            setTimeout(()=>showBiometricNudge(nis,role),1600);
        }catch(e){}
    }

    function showBiometricNudge(nis,role){
        const old=document.getElementById("bioNudgeBanner");
        if(old)old.remove();
        const fp=fingerprintSupported(),face=faceSupported();
        const jenis=fp&&face?"sidik jari atau Face ID":fp?"sidik jari":"Face ID";
        const el=document.createElement("div");
        el.id="bioNudgeBanner";
        el.style.cssText="position:fixed;left:14px;right:14px;bottom:14px;z-index:9999;background:var(--surface,#1b1b26);border:1px solid var(--border2,#333);border-radius:14px;padding:14px 16px;box-shadow:0 10px 28px rgba(0,0,0,.4);display:flex;gap:12px;align-items:center;max-width:460px;margin:0 auto;font-family:var(--font-mono)";
        el.innerHTML=`
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--surface2,#252533);display:flex;align-items:center;justify-content:center;color:var(--accent,#7c8cff)">${fp&&!face?ICON_FINGERPRINT:(!fp&&face?ICON_FACE:ICON_FINGERPRINT)}</div>
          <div style="flex:1;font-size:13px;line-height:1.45;color:var(--text1,#eee)">
            <strong>Login biometrik belum aktif</strong><br>
            <span style="color:var(--text3,#999);font-size:12px">Aktifkan ${jenis} biar login berikutnya gak perlu ketik password lagi.</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
            <button class="btn btn-primary btn-sm" id="bioNudgeEnableBtn">Aktifkan</button>
            <button class="btn btn-outline btn-sm" id="bioNudgeDismissBtn">Nanti</button>
          </div>`;
        document.body.appendChild(el);
        document.getElementById("bioNudgeEnableBtn").onclick=()=>{
            el.remove();
            goToSecuritySettings(role);
        };
        document.getElementById("bioNudgeDismissBtn").onclick=()=>{
            el.remove();
            try{localStorage.setItem(BIO_DISMISS_PREFIX+nis,"1");}catch(e){}
        };
        setTimeout(()=>{ if(document.getElementById("bioNudgeBanner")===el)el.remove(); },15000);
    }

    function goToSecuritySettings(role){
        const map={
            siswa:{fn:()=>switchStudentTab("student-settings",findNavEl("studentPage","student-settings"))},
            admin:{fn:()=>switchAdminTab("admin-settings",findNavEl("adminPage","admin-settings"))},
            panitia:{fn:()=>switchPanitiaTab("panitia-settings",findNavEl("panitiaPage","panitia-settings"))},
            guru:{fn:()=>switchGuruTab("guru-settings",findNavEl("guruPage","guru-settings"))}
        };
        const m=map[role];if(!m)return;
        try{ m.fn(); }catch(e){}
        setTimeout(()=>{
            const card=document.getElementById("bioSecurityCard-"+role);
            if(card)card.scrollIntoView({behavior:"smooth",block:"center"});
        },250);
    }
    function findNavEl(pageId,tabId){
        try{ return document.querySelector("#"+pageId+' .nav-tab[data-tab="'+tabId+'"]'); }catch(e){ return null; }
    }

    function startBiometricEnableFlow(nis,pwd,type){
        if(!biometricSupported()){showToast("Perangkat ini tidak mendukung sidik jari/Face ID, atau belum ada yang terdaftar di HP.","error");return;}
        try{ PatlasAndroid.enableBiometricLogin(nis,pwd,type); }
        catch(e){ showToast("Gagal memulai aktivasi biometrik","error"); }
    }

    let _bioModalResolve=null;
    function askPasswordForBiometric(){
        return new Promise(resolve=>{
            _bioModalResolve=resolve;
            document.getElementById("bioPasswordModalInput").value="";
            document.getElementById("bioPasswordModal").classList.remove("hidden");
            setTimeout(()=>document.getElementById("bioPasswordModalInput").focus(),100);
        });
    }
    window.confirmBioPasswordModal=function(){
        const pwd=document.getElementById("bioPasswordModalInput").value;
        document.getElementById("bioPasswordModal").classList.add("hidden");
        if(_bioModalResolve){_bioModalResolve(pwd);_bioModalResolve=null;}
    };
    window.closeBioPasswordModal=function(){
        document.getElementById("bioPasswordModal").classList.add("hidden");
        if(_bioModalResolve){_bioModalResolve(null);_bioModalResolve=null;}
    };
    window.requestEnableBiometric=async function(type){
        if(!currentUser){showToast("Sesi tidak valid","error");return;}
        if(!biometricSupported()){showToast("Perangkat ini tidak mendukung sidik jari/Face ID, atau belum ada yang terdaftar di pengaturan HP.","error");return;}
        let pwd=getRecentLoginPwd(currentUser.nis);
        if(!pwd){
            pwd=await askPasswordForBiometric();
            if(!pwd)return;
            showLoader("Memverifikasi password...");
            try{
                const cred=EmailAuthProvider.credential(auth.currentUser.email,pwd);
                await reauthenticateWithCredential(auth.currentUser,cred);
                hideLoader();
            }catch(e){
                hideLoader();
                showToast("Password salah","error");
                return;
            }
        }
        startBiometricEnableFlow(currentUser.nis,pwd,type);
    };
    window.disableBiometricLoginUI=function(){
        if(!currentUser)return;
        try{ PatlasAndroid.disableBiometricLogin(currentUser.nis); }catch(e){}
    };

    function renderBiometricCard(){
        if(!currentUser)return;
        const card=document.getElementById("bioSecurityCard-"+currentUser.role);
        if(!card)return;
        const fp=fingerprintSupported(),face=faceSupported();
        const activeType=getActiveBiometricType(currentUser.nis);
        if(activeType){
            card.innerHTML=`<div class="card-title">Keamanan · Login Biometrik</div>
              <div style="font-size:13px;color:var(--text3);font-family:var(--font-mono);margin-bottom:14px">
                Aktif: <strong>${bioTypeLabel(activeType)}</strong> di perangkat ini. Anda bisa login cukup dengan NIS/NIP + ${bioTypeLabel(activeType)}.
              </div>
              <button class="btn btn-danger btn-sm" onclick="disableBiometricLoginUI()">Nonaktifkan</button>`;
            return;
        }
        const fpHint=fp?"":" title=\"Perangkat ini tidak mendukung sidik jari\"";
        const faceHint=face?"":" title=\"Perangkat ini tidak mendukung Face ID\"";
        card.innerHTML=`<div class="card-title">Keamanan · Login Biometrik</div>
          <div style="font-size:13px;color:var(--text3);font-family:var(--font-mono);margin-bottom:14px">
            Pilih salah satu — cuma bisa satu jenis aktif dalam satu waktu di perangkat ini.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:6px" ${fp?"":"disabled"}${fpHint} onclick="requestEnableBiometric('fingerprint')">${ICON_FINGERPRINT}<span>Aktifkan Sidik Jari</span></button>
            <button class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:6px" ${face?"":"disabled"}${faceHint} onclick="requestEnableBiometric('face')">${ICON_FACE}<span>Aktifkan Face ID</span></button>
          </div>
          ${(!fp||!face)?`<div style="font-size:11px;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">${!fp?"Sidik jari tidak didukung perangkat ini. ":""}${!face?"Face ID tidak didukung perangkat ini.":""}</div>`:""}`;
    }

    window.onBiometricResult=function(action,success,message){
        if(action==="enable"){
            if(success){showToast("Login biometrik berhasil diaktifkan!","success");}
            else{showToast(message||"Gagal mengaktifkan login biometrik","error");}
            renderBiometricCard();
        }else if(action==="disable"){
            showToast("Login biometrik dinonaktifkan di perangkat ini","info");
            renderBiometricCard();
        }else if(action==="login"){
            if(!success){
                showToast(message||"Login biometrik gagal","error");
                hideLoader();
                updateBioLoginButtonState();
            }
        }
    };
    window.onBiometricLoginResult=async function(success,nis,password){
        updateBioLoginButtonState();
        if(!success)return;
        document.getElementById("nisInput").value=nis;
        document.getElementById("passwordInput").value=password;
        document.getElementById("passwordGroup").style.display="block";
        await handleLogin();
    };
    window.tryBiometricLogin=function(type){
        const nis=document.getElementById("nisInput").value.trim();
        const btn=document.getElementById(type==="face"?"bioLoginBtnFace":"bioLoginBtnFingerprint");
        if(!nis||!btn||btn.disabled)return;
        hideAlert("loginAlert");
        btn.disabled=true;
        try{ PatlasAndroid.loginWithBiometric(nis); }
        catch(e){ btn.disabled=false; showAlert("loginAlert","Gagal memulai login biometrik.","error"); }
    };
    function updateBioLoginButtonState(){
        const btnFp=document.getElementById("bioLoginBtnFingerprint");
        const btnFace=document.getElementById("bioLoginBtnFace");
        const hint=document.getElementById("bioLoginHint");
        if(!btnFp||!btnFace)return;
        const nis=document.getElementById("nisInput").value.trim();
        const activeType=nis?getActiveBiometricType(nis):"";
        const fpOk=fingerprintSupported()&&nis&&activeType==="fingerprint";
        const faceOk=faceSupported()&&nis&&activeType==="face";
        btnFp.disabled=!fpOk;
        btnFace.disabled=!faceOk;
        if(!biometricSupported()){
            if(hint)hint.textContent="Perangkat ini tidak mendukung sidik jari atau Face ID.";
        }else if(!nis){
            if(hint)hint.textContent="Masukkan NIS/NIP di atas dulu.";
        }else if(!activeType){
            if(hint)hint.textContent="Belum diaktifkan untuk NIS ini. Login pakai password dulu, lalu aktifkan lewat menu Akun.";
        }else if(hint){
            hint.textContent="";
        }
    }
    let _loginModeBio=false;
    window.toggleLoginMode=function(){
        _loginModeBio=!_loginModeBio;
        document.getElementById("loginModePassword").style.display=_loginModeBio?"none":"block";
        document.getElementById("loginModeBiometric").style.display=_loginModeBio?"block":"none";
        document.getElementById("loginModeToggleBtn").textContent=_loginModeBio?"Gunakan Password":"Coba Cara Lain";
        hideAlert("loginAlert");
        if(_loginModeBio)updateBioLoginButtonState();
    };
    function authErrorMessage(err){
        const code = (err && err.code) || "";
        if(code==="auth/invalid-credential"||code==="auth/wrong-password"||code==="auth/user-not-found"||code==="auth/invalid-email"){
            return "NIS/NIP atau password salah.";
        }
        if(code==="auth/too-many-requests"){
            return "Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.";
        }
        if(code==="auth/user-disabled"){
            return "Akun ini dinonaktifkan. Hubungi admin.";
        }
        if(code==="auth/network-request-failed"){
            return "Tidak ada koneksi internet.";
        }
        return "Terjadi kesalahan saat login. Coba lagi.";
    }

    let _secondaryApp=null, _secondaryAuth=null;
    function getSecondaryAuth(){
        if(!_secondaryApp){
            _secondaryApp = initializeApp(FC, "patlas-admin-secondary-"+Date.now());
            _secondaryAuth = getAuth(_secondaryApp);
        }
        return _secondaryAuth;
    }
    async function closeSecondaryAuth(){
        if(_secondaryApp){
            try{ await signOut(_secondaryAuth); }catch(e){}
            try{ await deleteApp(_secondaryApp); }catch(e){}
            _secondaryApp=null;_secondaryAuth=null;
        }
    }
    async function createAuthAccount(nis,password){
        const sAuth=getSecondaryAuth();
        const cred=await createUserWithEmailAndPassword(sAuth,nisToEmail(nis),password);
        return cred.user.uid;
    }

    // NIS admin sengaja TIDAK di-hardcode di sini lagi (dulu ADMIN_NIS).
    // Semua cek "apakah admin" sekarang lewat role di Firestore
    // (resolveNisRole / query user_roles), bukan identitas akun spesifik,
    // supaya source code publik tidak membocorkan siapa akun admin.
    function generateSecureTempPassword(){
        const bytes=new Uint32Array(1);
        crypto.getRandomValues(bytes);
        const n=bytes[0]%1000000;
        return String(n).padStart(6,"0");
    }

    const CLOUDINARY_CLOUD_NAME = "dasyz9xho";
    const CLOUDINARY_UPLOAD_PRESET = "cbt_upload";
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

    function showConfirm(title,msg,okLabel="Ya, Lanjutkan",okClass="btn-danger",icon='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'){
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
    async function deriveBackupKey(passphrase,saltBytes,usage){
        const baseKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),{name:"PBKDF2"},false,["deriveKey"]);
        return crypto.subtle.deriveKey(
            {name:"PBKDF2",salt:saltBytes,iterations:100000,hash:"SHA-256"},
            baseKey,{name:"AES-GCM",length:256},false,[usage]
        );
    }
    // hashPassword() (skema hash manual dengan salt statis, peninggalan
    // sebelum migrasi ke Firebase Auth) sudah dihapus — sudah tidak dipakai
    // untuk autentikasi nyata sama sekali (lihat firebaseLogin/
    // signInWithEmailAndPassword) dan berpotensi disalahgunakan/membingungkan
    // kalau dibiarkan.
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

    const nebulae=[
        {cx:W*0.15,cy:H*0.25,rx:W*0.30,ry:H*0.38,r:110,g:35,b:255,a:0.052,ph:0,sp:0.00028},
        {cx:W*0.80,cy:H*0.65,rx:W*0.34,ry:H*0.32,r:195,g:55,b:255,a:0.042,ph:1.3,sp:0.00022},
        {cx:W*0.50,cy:H*0.88,rx:W*0.32,ry:H*0.25,r:55,g:95,b:255,a:0.038,ph:2.5,sp:0.00038},
        {cx:W*0.88,cy:H*0.15,rx:W*0.24,ry:H*0.30,r:255,g:75,b:195,a:0.032,ph:3.9,sp:0.00030},
        {cx:W*0.33,cy:H*0.52,rx:W*0.26,ry:H*0.30,r:75,g:55,b:255,a:0.035,ph:0.8,sp:0.00025},
    ];

    const BH_X=W*0.68,BH_Y=H*0.38;
    const BH_R=Math.min(W,H)*0.058;
    const DISK_A=BH_R*2.8,DISK_B=BH_R*0.55;
    let bhAngle=0;

    const DISK_PARTICLES=600;
    const diskPart=[];
    for(let i=0;i<DISK_PARTICLES;i++){
        const angle=rng()*PI2;

        const t2=Math.pow(rng(),0.6);
        const dist=BH_R*1.05+t2*(DISK_A-BH_R*1.05);

        const heat=1-t2;
        diskPart.push({
            baseAngle:angle,
            dist,
            heat,
            speed:(0.008+heat*0.025)*(rng()<0.5?1:-1),
            wobble:rng()*PI2,
            wobbleSpeed:0.3+rng()*0.8,
            sz:0.5+heat*1.8+rng()*0.8,
            brightness:0.5+heat*0.5+rng()*0.15,
        });
    }

    const auroraLayers=[
        {amp:H*0.04,freq:0.0011,t:0,col:[80,40,255],op:0.038,spd:0.00014},
        {amp:H*0.055,freq:0.0014,t:1.8,col:[120,50,255],op:0.028,spd:0.00010},
        {amp:H*0.032,freq:0.0009,t:3.5,col:[50,110,255],op:0.022,spd:0.00018},
    ];

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

        ctx.save();
        ctx.translate(BH_X,BH_Y);

        const backParticles=[];
        const frontParticles=[];
        diskPart.forEach(p=>{
            const angle=p.baseAngle+bhAngle+now*p.speed*0.001;

            const ex=p.dist*Math.cos(angle);
            const ey=p.dist*Math.sin(angle)*(DISK_B/DISK_A);
            const inFront=ey>0;
            const heat=p.heat;

            let cr,cg,cb;
            if(heat>0.75){cr=255;cg=245;cb=220;}
            else if(heat>0.5){cr=255;cg=210;cb=120;}
            else if(heat>0.25){cr=255;cg=145;cb=40;}
            else{cr=220;cg=65;cb=15;}
            const op=p.brightness*(0.55+0.45*Math.abs(Math.sin(angle+p.wobble+now*p.wobbleSpeed*0.001)));
            const item={ex,ey,sz:p.sz,cr,cg,cb,op,inFront};
            inFront?frontParticles.push(item):backParticles.push(item);
        });

        backParticles.forEach(p=>{
            const grd=ctx.createRadialGradient(p.ex,p.ey,0,p.ex,p.ey,p.sz*2.2);
            grd.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${p.op.toFixed(3)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(p.ex,p.ey,p.sz*2.2,0,PI2);ctx.fillStyle=grd;ctx.fill();
        });
        ctx.restore();

        const shadowG=ctx.createRadialGradient(BH_X,BH_Y,0,BH_X,BH_Y,BH_R*1.35);
        shadowG.addColorStop(0,"rgba(0,0,0,1)");
        shadowG.addColorStop(0.78,"rgba(0,0,0,1)");
        shadowG.addColorStop(0.9,"rgba(5,0,20,0.85)");
        shadowG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R*1.35,0,PI2);ctx.fillStyle=shadowG;ctx.fill();

        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R,0,PI2);ctx.fillStyle="rgba(0,0,0,1)";ctx.fill();

        const pulse=0.6+0.4*Math.sin(now*0.0016);
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R,0,PI2);
        ctx.strokeStyle=`rgba(255,200,100,${(0.7*pulse).toFixed(2)})`;ctx.lineWidth=1.0;ctx.stroke();
        ctx.beginPath();ctx.arc(BH_X,BH_Y,BH_R*1.02,0,PI2);
        ctx.strokeStyle=`rgba(255,240,180,${(0.35*pulse).toFixed(2)})`;ctx.lineWidth=0.5;ctx.stroke();

        ctx.save();ctx.translate(BH_X,BH_Y);
        frontParticles.forEach(p=>{
            const grd=ctx.createRadialGradient(p.ex,p.ey,0,p.ex,p.ey,p.sz*2.2);
            grd.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${p.op.toFixed(3)})`);
            grd.addColorStop(1,"rgba(0,0,0,0)");
            ctx.beginPath();ctx.arc(p.ex,p.ey,p.sz*2.2,0,PI2);ctx.fillStyle=grd;ctx.fill();
        });

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
    document.querySelectorAll(".page").forEach(p=>{
      p.classList.remove("active");
      p.style.display="none";

      if(p.id==="examPage"){
        p.style.overflow="";
        p.style.position="";
        p.style.inset="";
      }
    });
    const p=document.getElementById(pageId);
    if(p){
      p.classList.add("active");
      p.style.display="flex";

      if(pageId==="examPage"){
        p.style.flexDirection="column";
        p.style.overflow="hidden";
        if(document.body.classList.contains("exam-mode")){

          p.style.webkitOverflowScrolling="touch";
        }
      }

      if(pageId==="homePage"||pageId==="studentPage"){
        window.scrollTo(0,0);
        p.scrollTop=0;
      }
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
    const r=await resolveNisRole(nis);
    if(!r)return null;
    return r.role||"siswa";
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
    const rawIdentifier=document.getElementById("nisInput").value.trim();
    const pwd=document.getElementById("passwordInput").value;
    hideAlert("loginAlert");
    if(!rawIdentifier){showAlert("loginAlert","Masukkan NIP / NIS / Username Anda.");return;}

    showLoader("Memverifikasi identitas...");
    const clientInfo=await getClientInfo();
    try{
    const nis=await resolveLoginIdentifier(rawIdentifier);
    if(nis===null){hideLoader();showAlert("loginAlert","NIS, NIP, Username, atau password salah.");return;}
    const role=await checkNisType(nis);
    if(role===null){hideLoader();showAlert("loginAlert","NIS atau password salah.");return;}

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
    let cred;
    try{ cred=await signInWithEmailAndPassword(auth,nisToEmail(nis),pwd); }
    catch(authErr){ hideLoader();showAlert("loginAlert",authErrorMessage(authErr));return; }
    const userDoc=await getDoc(doc(db,"users",nis));
    if(!userDoc.exists()){hideLoader();showAlert("loginAlert","Profil akun tidak ditemukan. Hubungi admin.");try{await signOut(auth);}catch(e){}return;}
    const userData=userDoc.data();
    currentUser={...userData,nis,role,clientInfo};
    await logLogin(currentUser);
    hideLoader();
    if(role==="admin")loadAdminPage();
    else if(role==="guru")loadGuruPage();
    else loadPanitiaPage();
    if(userData.must_change_password)setTimeout(()=>showToast("Password Anda masih password sementara — segera ganti password lewat menu Akun.","info"),1200);
    maybeOfferBiometricEnable(nis,pwd,role);
    }else{
    if(!pwd){
    hideLoader();
    document.getElementById("passwordGroup").style.display="block";
    document.getElementById("passwordInput").focus();
    showAlert("loginAlert","Masukkan password Anda.","info");
    return;
    }
    let cred;
    try{ cred=await signInWithEmailAndPassword(auth,nisToEmail(nis),pwd); }
    catch(authErr){ hideLoader();showAlert("loginAlert",authErrorMessage(authErr));return; }
    const userDoc=await getDoc(doc(db,"users",nis));
    if(!userDoc.exists()){hideLoader();showAlert("loginAlert","Profil akun tidak ditemukan. Hubungi admin.");try{await signOut(auth);}catch(e){}return;}
    const userData=userDoc.data();
    try{
    const modeSnap=await getDoc(doc(db,'settings','siswa_login_mode'));
    const allowWeb=modeSnap.exists()?(modeSnap.data().allow_web!==false):true;
    if(!allowWeb&&!(window.__PATLAS_IS_APK__===true||typeof PatlasAndroid!=='undefined')){hideLoader();showAlert('loginAlert','Akses website untuk siswa sedang dinonaktifkan oleh admin. Gunakan Aplikasi PATLAS.','error');try{await signOut(auth);}catch(e){}return;}
    }catch(e){}
    currentUser={...userData,nis,role:"siswa",clientInfo};
    await logLogin(currentUser);
    hideLoader();
    try{await checkAndApplyLock();}catch(e){return;}
    loadHomePage();
    if(userData.must_change_password)setTimeout(()=>showToast("Password Anda masih password sementara — segera ganti password lewat menu Akun.","info"),1200);
    maybeOfferBiometricEnable(nis,pwd,"siswa");
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
    showLoader("Memulihkan sesi...");
    let fbUser;
    try{ fbUser=await waitForAuthInit(); }catch(e){ fbUser=null; }
    if(!fbUser){ hideLoader(); return false; }
    const nis=(fbUser.email||"").split("@")[0];
    let userDoc;
    try{ userDoc=await getDoc(doc(db,"users",nis)); }
    catch(e){ hideLoader(); return false; }
    if(!userDoc.exists()){ hideLoader(); try{await signOut(auth);}catch(e){} return false; }
    const userData=userDoc.data();
    const role=userData.role||"siswa";
    currentUser={...userData,nis,role};
    if(role==="admin"){hideLoader();loadAdminPage();return true;}
    else if(role==="panitia"){

    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ulangan"){hideLoader();try{await signOut(auth);}catch(e){}showAlert("loginAlert","Sistem dalam Mode Ulangan Harian. Akun panitia tidak aktif.","error");return false;}
    }catch(e){}
    hideLoader();loadPanitiaPage();return true;
    }
    else if(role==="guru"){

    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ujian"){hideLoader();try{await signOut(auth);}catch(e){}showAlert("loginAlert","Sistem dalam Mode Ujian. Akun guru tidak dapat login.","error");return false;}
    }catch(e){}
    hideLoader();loadGuruPage();return true;
    }
    else{
    if(!(window.__PATLAS_IS_APK__===true||typeof PatlasAndroid!=='undefined')){
    try{
    const modeSnap=await getDoc(doc(db,'settings','siswa_login_mode'));
    const allowWeb=modeSnap.exists()?(modeSnap.data().allow_web!==false):true;
    if(!allowWeb){
    hideLoader();
    showPage('loginPage');
    showAlert('loginAlert','Akses website untuk siswa sedang dinonaktifkan oleh admin. Gunakan Aplikasi PATLAS.','error');
    return true;
    }
    }catch(e){
    }
    }

    const enc=localStorage.getItem("patlas_exam_sess");
    let localSess=null;
    if(enc){
    try{
    const dec=_decodeSession(enc);
    if(dec&&dec.nis===nis&&Date.now()-dec.ts<24*60*60*1000)localSess=dec;
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
    }
    function buildUserChip(containerId,user){
    const el=document.getElementById(containerId);if(!el)return;
    const initials=(user.nama_lengkap||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    el.innerHTML=`<div class="user-chip-avatar">${escapeHtml(initials)}</div><div class="user-chip-info"><div class="user-chip-name">${escapeHtml(user.nama_lengkap||user.nis)}</div><div class="user-chip-role">${escapeHtml(user.kelas||user.role)}</div></div>`;
    }
    function renderAccountInfo(containerId,user){
    const el=document.getElementById(containerId);if(!el)return;
    const fields=[
    {label:(["guru","panitia","admin"].includes(user.role)?"NIP":"NIS"),value:user.nis||"-"},
    {label:"Nama Lengkap",value:user.nama_lengkap||"-"},
    {label:"Kelas",value:user.kelas||"-"},
    {label:"Role",value:user.role||"-"},
    ];
    if(user.no_absen){fields.push({label:"No. Absen",value:user.no_absen});}
    fields.push({label:"Username Login",value:user.username?escapeHtml(user.username):"Belum diatur"});
    let html="";
    fields.forEach(f=>{html+=`<div class="account-info-row"><div class="account-info-label">${f.label}</div><div class="account-info-value">${f.value}</div></div>`;});
    el.innerHTML=html;
    }
    function loadStudentPage(){
    showPage("studentPage");
    buildUserChip("studentUserChip",currentUser);
    document.getElementById("studentGreeting").textContent=`Selamat datang, ${escapeHtml(currentUser.nama_lengkap)}!`;
    document.getElementById("studentInfo").textContent=`NIS: ${escapeHtml(currentUser.nis)} | Kelas: ${currentUser.kelas}`;
    renderAccountInfo("studentAccountInfo",currentUser);
    loadAppMode().then(()=>{
    loadStudentDashboard();
    loadStudentRoomMap();
    });
    buildThemeGrid("studentThemeGrid");
    }
    function loadHomePage(){

    document.body.classList.remove("exam-mode");
    document.body.style.pointerEvents="";
    document.body.style.overflow="";
    document.body.style.position="";
    document.body.style.width="";
    document.body.style.height="";
    showPage("homePage");

    const hp=document.getElementById("homePage");
    if(hp){
      hp.style.overflowY="auto";
      hp.style.webkitOverflowScrolling="touch";
      hp.style.minHeight="100vh";
      hp.style.position="";
      hp.style.display="flex";
      hp.style.flexDirection="column";

      hp.offsetHeight;
    }
    window.scrollTo(0,0);
    const nama=currentUser.nama_lengkap||currentUser.nis||"";
    const firstName=nama.split(" ")[0];
    const el=document.getElementById("homeHeroName");
    if(el){
    el.textContent="Halo, "+firstName+"!";
    el.style.animation="none";
    el.offsetHeight;
    el.style.animation="";
    }
    const nisEl=document.getElementById("homeChipNIS");
    if(nisEl)nisEl.textContent=(["guru","panitia","admin"].includes(currentUser.role)?"NIP: ":"NIS: ")+currentUser.nis;
    const kelasEl=document.getElementById("homeChipKelas");
    if(kelasEl)kelasEl.textContent="Kelas: "+(currentUser.kelas||"-");
    history.pushState({page:"home"},"","");
    }
    window.goToExamPage=function(){
    loadStudentPage();

    history.pushState({page:"studentExam"},"","");

    setTimeout(()=>{
    const examTab=document.querySelector('.nav-tab[data-tab="student-exam"]');
    if(examTab)examTab.click();
    },100);
    };

    window.addEventListener("popstate",function(e){
    const state=e.state;

    const studentPage=document.getElementById("studentPage");
    const examPage=document.getElementById("examPage");
    const homePage=document.getElementById("homePage");
    const isStudentActive=studentPage&&studentPage.classList.contains("active");
    const isExamActive=examPage&&examPage.classList.contains("active");
    const isHomeActive=homePage&&homePage.classList.contains("active");
    if(isExamActive){

    history.pushState({page:"exam"},"","");
    return;
    }
    if(isStudentActive&&currentUser&&currentUser.role==="siswa"){
    loadHomePage();
    return;
    }
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
                background-color: #999999;
                width: 320px;
                height: 320px;
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

    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    const q=query(collection(db,"jadwal"),where("kelas","==",kelasPrefix));
    const snap=await getDocs(q);
    const container=document.getElementById("todaySchedule");
    const todayItems=[];
    snap.forEach(d=>{
    const data=d.data();
    if(data.tanggal!==today)return;

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
    html+=`<div class="schedule-item"><div class="schedule-mapel">${escapeHtml(data.mapel)} ${modeLabel}</div><div class="schedule-time">${jam}:${mnt} ${data.ampm||""}</div><div class="schedule-class"><span class="badge badge-blue">Kelas ${escapeHtml(data.kelas)}</span></div></div>`;
    });
    html+="</div>";
    container.innerHTML=html;
    }catch(e){}
    }
    async function loadAvailableExams(){
    const kelasPrefix=currentUser.kelas?currentUser.kelas.split(".")[0]:"X";
    const kelasFull=currentUser.kelas||"";
    try{

    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}
    const container=document.getElementById("availableExams");
    let snap;
    if(sysMode==='ulangan'){

    snap=await getDocs(query(collection(db,"soal"),where("mode","==","ulangan")));
    }else{

    snap=await getDocs(query(collection(db,"soal"),where("kelas","==",kelasPrefix)));
    }
    const docs=[];
    snap.forEach(d=>{
    const data=d.data();
    if(sysMode==='ujian'){
    if(data.mode==='ulangan')return;
    docs.push({id:d.id,...data});
    }else{

    const targetKelas=data.kelas_exact||data.kelas||'';
    if(targetKelas!==kelasFull)return;
    docs.push({id:d.id,...data});
    }
    });
    if(!docs.length){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada ${sysMode==='ulangan'?'ulangan':'soal ujian'} tersedia untuk kelas ${escapeHtml(kelasFull||kelasPrefix)}</div></div>`;return;}
    let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">';
    docs.forEach(data=>{
    const docId=data.id;
    const modeLabel=data.mode==='ulangan'?'<span class="badge badge-yellow">Ulangan Harian</span>':'<span class="badge badge-blue">Ujian</span>';
    html+=`<div class="card" style="cursor:pointer" onclick="startExam('${docId}')">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
    ${modeLabel}
    <div class="badge badge-green">${data.jumlah_soal||0} Soal</div>
    </div>
    <div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:6px">${escapeHtml(data.mapel)}</div>
    <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">Kelas: ${escapeHtml(data.kelas_exact||data.kelas||'-')} | Durasi: ${data.durasi||90} menit</div>
    <div style="margin-top:16px"><button class="btn btn-primary" style="width:100%" onclick="event.stopPropagation();startExam('${docId}')">Mulai ${data.mode==='ulangan'?'Ulangan':'Ujian'}</button></div>
    </div>`;
    });
    html+="</div>";
    container.innerHTML=html;
    }catch(e){}
    }
    async function loadStudentScores(){
    try{

    let sysMode='ujian';
    try{const modeDoc=await getDoc(doc(db,'settings','app_mode'));if(modeDoc.exists())sysMode=modeDoc.data().mode||'ujian';}catch(e){}

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

    container.innerHTML='<div class="alert alert-warning">Nilai belum dipublikasikan oleh admin.</div>';
    return;
    }

    if(sysMode==='ulangan'){

    const filtered=[];
    for(const d of studentScoreCache){
        const jId=d.jadwal_id||d.soal_id;
        if(!jId){continue;}
        try{
            const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_nilai_${jId}`));
            if(pubSnap.exists()){
                const pd=pubSnap.data();

                if(pd.aktif&&pd.tanggal&&pd.tanggal!==today){

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
    html+=`<tr><td>${escapeHtml(d.mapel||"-")}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text2)">${formatNilai(asli)}</td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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

    const avgAsli=u.avg??0;
    const avgBulat=u.avgBulat!=null?u.avgBulat:Math.round(avgAsli);
    const avgAsliStr=formatNilai(avgAsli);
    const avgBulatStr=formatNilai(Math.round(avgBulat));
    const isSelf=isStudent&&window.currentUser&&u.nis===window.currentUser.nis;
    html+=`<div class="ranking-item"${isSelf?' style="border-color:var(--accent);background:rgba(79,142,247,0.08)"':''}>
    <div class="ranking-num ${numClass}">${i+1}</div>
    <div class="ranking-info">
    <div class="ranking-name">${u.nama}${isSelf?' <span style="font-size:10px;background:var(--accent);color:#fff;border-radius:10px;padding:1px 7px;font-family:var(--font-mono)">SAYA</span>':''}</div>
    <div class="ranking-detail">${escapeHtml(u.nis)} | ${escapeHtml(u.kelas)} | ${u.count} ujian</div>
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
    if(soalData.soal_enc){
        const decrypted=await decryptSoalData(soalData.soal_enc,soalId);
        if(!decrypted||!decrypted.length){hideLoader();showToast("Gagal mendekripsi soal","error");return;}
        soalData.soal=decrypted;
    }
    if(!soalData.soal||!soalData.soal.length){hideLoader();showToast("Soal belum tersedia","error");return;}
    const jadwalId=soalData.jadwal_id;
    if(jadwalId){
    const jadwalDoc=await getDoc(doc(db,"jadwal",jadwalId));
    if(jadwalDoc.exists()){
    const jd=jadwalDoc.data();
    const isUlangan=jd.mode==='ulangan'||soalData.mode==='ulangan';
    if(!jd.soal_ready){hideLoader();showToast("Soal untuk ujian ini belum siap","warning");return;}

    if(!isUlangan&&!jd.panitia_ready){hideLoader();showToast("Panitia jaga belum ditentukan untuk ujian ini","warning");return;}
    const now=Date.now();
    const mulai=jd.mulai_timestamp?.toMillis?.();
    const selesai=jd.selesai_timestamp?.toMillis?.();
    if(mulai&&selesai){
    if(now<mulai){const sisa=Math.ceil((mulai-now)/60000);hideLoader();showToast(`${isUlangan?'Ulangan':'Ujian'} belum dimulai. Mulai dalam ${sisa} menit.`,"warning");return;}
    if(now>selesai){hideLoader();showToast(`Waktu ${isUlangan?'ulangan':'ujian'} sudah berakhir`,"error");return;}
    }

    if(jd.selesai_timestamp){soalData.selesai_timestamp=jd.selesai_timestamp;}
    }
    }
    const nilaiQ=query(collection(db,"nilai"),where("nis","==",currentUser.nis),where("soal_id","==",soalId));
    const nilaiSnap=await getDocs(nilaiQ);
    if(!nilaiSnap.empty){hideLoader();showToast("Anda sudah mengerjakan ujian ini","warning");return;}
    try{await checkAndApplyLock();}catch(e){hideLoader();return;}
    currentExam={id:soalId,...soalData};

    const localSess=await loadLocalExamSessionAsync(currentUser.nis,soalId);
    if(localSess){
    examAnswers=localSess.jawaban||{};
    flaggedQuestions=new Set(localSess.flagged||[]);
    currentQuestion=localSess.currentQuestion||0;
    violationCount=localSess.violationCount||0;
    examViolations=localSess.violations||[];
    }else{

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

    saveProgressToServer().catch(()=>{});
    if(typeof PatlasAndroid!=="undefined")try{PatlasAndroid.onExamStart();}catch(e){}
    }catch(e){if(e.message!=="LOCKED"){hideLoader();showToast("Gagal memuat ujian","error");}}
    };
    function setupExamPage(){
    document.getElementById("examMapelTitle").textContent=currentExam.mapel;
    document.getElementById("examStudentInfo").textContent=`${escapeHtml(currentUser.nama_lengkap)} | ${currentUser.kelas}`;
    showPage("examPage");

    history.pushState({page:"exam"},"","");
    history.pushState({page:"exam"},"","");
    document.body.classList.add("exam-mode");

    const examPage=document.getElementById("examPage");
    if(examPage){
      examPage.style.display="flex";
      examPage.style.flexDirection="column";
      examPage.style.overflow="hidden";
      examPage.style.position="fixed";
      examPage.style.inset="0";
      examPage.style.width="100%";
      examPage.style.height="100%";
    }

    const questionArea=document.getElementById("questionAreaScroll")||document.querySelector("#examPage .question-area");
    if(questionArea){
      questionArea.style.flex="1";
      questionArea.style.minHeight="0";
      questionArea.style.overflowY="scroll";
      questionArea.style.webkitOverflowScrolling="touch";
      questionArea.style.overscrollBehavior="contain";
      questionArea.style.touchAction="pan-y pinch-zoom";
      questionArea.style.position="relative";

      questionArea.style.webkitTransform="translate3d(0,0,0)";
      questionArea.style.transform="translate3d(0,0,0)";
      questionArea.style.willChange="scroll-position";

      questionArea.scrollTop=0;
    }
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

    const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if(!isMobile&&document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
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
    const opts=Object.keys(q.pilihan||{}).filter(l=>q.pilihan[l]).sort();
    const fotoHtml=q.foto_url?`<div style="margin-bottom:16px;text-align:center"><img src="${sanitizeFotoUrl(q.foto_url)}" alt="Gambar soal ${idx+1}" style="max-width:100%;max-height:320px;border-radius:8px;border:1px solid var(--border);object-fit:contain;user-select:none;-webkit-user-drag:none" onerror="this.style.display='none'"></div>`:'';
    function renderPertanyaan(txt){
        if(!txt)return '';
        const escaped=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return escaped.replace(/\n\n/g,'</p><p style="margin-top:10px">').replace(/\n/g,'<br>');
    }
    const pertanyaanHtml='<p style="margin:0">'+renderPertanyaan(q.pertanyaan)+'</p>';
    let html=`<div class="question-card">
    <div class="question-number">Soal ${idx+1} dari ${soal.length}${flaggedQuestions.has(idx)?' <span class="badge badge-yellow">Ditandai</span>':''}</div>
    ${fotoHtml}<div class="question-text">${pertanyaanHtml}</div>
    <div class="options-list">`;
    opts.forEach((letter)=>{
    if(!q.pilihan||!q.pilihan[letter])return;
    const selected=examAnswers[idx]===letter;

    html+=`<div class="option-item${selected?" selected":""}" data-qidx="${idx}" data-letter="${letter}" role="button" tabindex="0" style="cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(79,142,247,0.2)">
    <div class="option-letter">${letter}</div>
    <div class="option-text">${escapeHtml(q.pilihan[letter])}</div>
    </div>`;
    });
    html+=`</div></div>`;
    container.innerHTML=html;

    container.querySelectorAll(".option-item").forEach(function(el){

      el.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        const qidx=parseInt(this.dataset.qidx);
        const letter=this.dataset.letter;
        selectAnswer(qidx,letter);
      },{passive:false});

      let touchStartY=0;
      el.addEventListener("touchstart",function(e){
        touchStartY=e.touches[0].clientY;
      },{passive:true});
      el.addEventListener("touchend",function(e){
        const touchEndY=e.changedTouches[0].clientY;
        const diff=Math.abs(touchEndY-touchStartY);

        if(diff<10){
          e.preventDefault();
          const qidx=parseInt(this.dataset.qidx);
          const letter=this.dataset.letter;
          selectAnswer(qidx,letter);
        }
      },{passive:false});
    });
    const total=soal.length;
    const answered=Object.keys(examAnswers).length;
    document.getElementById("examProgressFill").style.width=`${(answered/total)*100}%`;
    document.getElementById("examProgressText").textContent=`${answered} / ${total} terjawab`;
    document.getElementById("prevBtn").disabled=idx===0;
    document.getElementById("nextBtn").disabled=idx===total-1;
    document.getElementById("flagBtn").textContent=flaggedQuestions.has(idx)?"Hapus Tanda":"Tandai Ragu";

    const qa=document.querySelector(".question-area");
    if(qa)qa.scrollTop=0;
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
    let _examSubmitting=false;
    window.submitExam=async function(auto=false){
    if(_examSubmitting)return;
    _examSubmitting=true;
    try{
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
    const soal=currentExam.soal||[];
    let benar=0,salah=0,kosong=0;
    soal.forEach((q,i)=>{const ans=examAnswers[i];if(!ans)kosong++;else if(ans===q.kunci)benar++;else salah++;});
    const nilaiAsli=hitungNilaiAsli(benar,soal.length);
    const nilaiBulat=hitungNilaiDibulatkan(benar,soal.length);
    const nilai=nilaiAsli;
    const now=new Date();
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
    if(currentExam.mode==='ulangan'||currentExam.jadwal_id){
        try{await addDoc(collection(db,"nilai_ulangan"),{...nilaiDoc});}catch(e){}
    }
    try{const progressId=currentUser.nis+"_"+currentExam.id;await deleteDoc(doc(db,"exam_progress",progressId));}catch(e){}
    clearLocalExamSession();
    try{
    const lockDoc=await getDoc(doc(db,"siswa_lock",currentUser.nis));
    if(lockDoc.exists()&&lockDoc.data().locked)await updateDoc(doc(db,"siswa_lock",currentUser.nis),{locked:false,auto_unlocked_at:Timestamp.now(),unlock_reason:"Ujian selesai dikumpulkan"});
    }catch(e){}
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.onExamEnd();}catch(e){}}
    hideLoader();
    showResult(nilaiAsli,benar,salah,kosong,nilaiBulat,soal.length);
    }catch(e){hideLoader();showToast("Gagal mengirim jawaban","error");}
    finally{_examSubmitting=false;}
    };
    async function showResult(nilaiAsli,benar,salah,kosong,nilaiBulat,totalSoal){
    const nilai=nilaiAsli;
    document.getElementById("resultMapel").textContent=currentExam.mapel;
    document.getElementById("resultStudent").textContent=`${escapeHtml(currentUser.nama_lengkap)} | ${currentUser.kelas}`;

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
    vEl.innerHTML=`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:12px 16px;font-size:13px;font-family:var(--font-mono);margin-bottom:12px"><span style="background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">${violationCount} PELANGGARAN</span><div style="margin-top:8px;color:var(--text2)">${escapeHtml(examViolations.join(", "))}</div></div>`;
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

    loadHomePage();
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

    const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if(isMobile)return;
    if(!document.fullscreenElement&&!document.webkitFullscreenElement){
    document.getElementById("fullscreenWarning").classList.add("show");
    recordViolation("Exit fullscreen");
    setTimeout(()=>{
      if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});
      else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen().catch(()=>{});
      document.getElementById("fullscreenWarning").classList.remove("show");
    },3000);
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

    if(warn){
      warn.classList.remove("hidden");
      warn.style.zIndex="2147483647";

      warn.style.pointerEvents="auto";
      warn.style.touchAction="auto";
    }

    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.lockExam();}catch(e){}}

    notifyViolationOnly(reason,isExit===true);

    setupViolationBtn(isExit===true);
    }
    function setupViolationBtn(mustWaitPanitia){
    const btn=document.getElementById("violationRefreshBtn");
    if(!btn)return;

    const nb=btn.cloneNode(true);
    btn.parentNode.replaceChild(nb,btn);
    nb.style.pointerEvents="auto";

    nb.textContent="Refresh — Cek Status Kunci";
    nb.disabled=false;
    nb.style.opacity="1";
    nb.style.cursor="pointer";

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

    };
    window.refreshViolationCheck=function(){

    };
    async function loadPanitiaPage(){

    try{
    const modeDoc=await getDoc(doc(db,"settings","app_mode"));
    const sysMode=modeDoc.exists()?modeDoc.data().mode||"ujian":"ujian";
    if(sysMode==="ulangan"){
    showToast("Sistem dalam Mode Ulangan Harian. Akun panitia tidak aktif.","error",5000);
    currentUser=null;
    try{await signOut(auth);}catch(e){}
    setTimeout(()=>showPage("loginPage"),2000);
    return;
    }
    }catch(e){}
    showPage("panitiaPage");
    buildUserChip("panitiaUserChip",currentUser);
    document.getElementById("panitiaGreeting").textContent=`Selamat datang, ${escapeHtml(currentUser.nama_lengkap||currentUser.nis)}`;
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
    const safeNis=escapeHtml(String(n.nis||""));
    const safeName=escapeHtml(String(n.nama_lengkap||n.nis||""));
    const safeId=escapeHtml(String(n.id||""));
    return `<div class="notif-item">
    <div class="notif-title">[KUNCI] ${escapeHtml(n.nama_lengkap||n.nis||"-")} — Pelanggaran</div>
    <div class="notif-body">${escapeHtml(n.jenis||"-")} | ${escapeHtml(n.mapel||"-")} | Ruang ${escapeHtml(n.ruang||"-")} | ${escapeHtml(n.kelas||"-")}</div>
    <div class="notif-body">${n.timestamp?formatWIBShort(n.timestamp):"-"}</div>
    <button class="unlock-btn" onclick="openUnlockModal('${safeNis}','${safeName}','${safeId}')">Buka Kunci</button>
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
    document.getElementById("unlockInfo").textContent=`Membuka kunci untuk siswa: ${nama} (NIS: ${escapeHtml(nis)})`;
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
    activeHtml+=`<div class="schedule-item"><div class="schedule-mapel">${escapeHtml(data.mapel)}</div><div class="schedule-time">${String(data.jam).padStart(2,"0")}:${String(data.menit).padStart(2,"0")} ${data.ampm||""}</div><div class="schedule-class"><span class="badge badge-blue">Kelas ${escapeHtml(data.kelas)}</span></div></div>`;
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
    <div class="account-info-row"><div class="account-info-label">Ruang Jaga</div><div class="account-info-value" style="color:var(--yellow);font-size:18px;font-weight:800">Ruang ${escapeHtml(myRoom.ruang)}</div></div>
    <div class="account-info-row"><div class="account-info-label">Mata Pelajaran</div><div class="account-info-value">${escapeHtml(myRoom.mapel||"-")}</div></div>
    <div class="account-info-row"><div class="account-info-label">Target Kelas</div><div class="account-info-value">${escapeHtml(myRoom.kelas||"-")}</div></div>
    <div class="account-info-row"><div class="account-info-label">Ditetapkan Oleh</div><div class="account-info-value">${myRoom.assigned_by||"-"}</div></div>
    </div>`;
    if(alertEl&&alertTitle&&alertBody){
    alertEl.style.display="flex"; alertEl.style.flexDirection="row"; alertEl.style.alignItems="flex-start";
    alertTitle.textContent=`Anda ditugaskan menjaga Ruang ${escapeHtml(myRoom.ruang)}`;
    alertBody.innerHTML=`Mata Pelajaran: <strong>${escapeHtml(myRoom.mapel||"-")}</strong> &nbsp;|&nbsp; Kelas: <strong>${escapeHtml(myRoom.kelas||"-")}</strong><br>Pantau dan awasi siswa di ruangan Anda. Notifikasi pelanggaran akan masuk secara otomatis.`;
    }
    if(greetingEl){
    greetingEl.textContent=`Selamat bertugas, ${escapeHtml(currentUser.nama_lengkap||currentUser.nis)}! Anda menjaga Ruang ${escapeHtml(myRoom.ruang)} — ${escapeHtml(myRoom.mapel||"Ujian")} Kelas ${escapeHtml(myRoom.kelas||"-")}`;
    }
    }else{
    document.getElementById("panitiaMyRoom").innerHTML='<div class="empty-state"><div>Belum ada jadwal jaga ditetapkan oleh admin</div></div>';
    if(alertEl)alertEl.style.display="none";
    if(greetingEl)greetingEl.textContent=`Selamat datang, ${escapeHtml(currentUser.nama_lengkap||currentUser.nis)}`;
    }
    }catch(e){}
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
    html+=`<tr><td><strong>${escapeHtml(data.mapel||"-")}</strong></td><td><span class="badge badge-blue">${escapeHtml(data.kelas)}</span></td><td><span class="badge badge-green">${data.jumlah_soal||0}</span></td><td>${data.durasi||90} menit</td><td style="font-size:11px;color:var(--text3)">${data.timestamp?formatWIBShort(data.timestamp):"-"}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openKelolaSoalModal('${d.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Kelola Soal</button><button class="btn btn-danger btn-sm" onclick="deleteSoal('${d.id}')">Hapus</button></td></tr>`;
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
    q=query(collection(db,"jadwal"),where('mode','==','ulangan'));
    if(currentUser&&currentUser.role==='guru'){
    q=query(collection(db,"jadwal"),where('mode','==','ulangan'),where('assigned_guru','==',currentUser.nis));
    }
    }else{
    const snap2=await getDocs(collection(db,"jadwal"));
    select.innerHTML='<option value="">Pilih jadwal...</option>';
    snap2.forEach(d=>{
    const data=d.data();
    const jam=String(data.jam||0).padStart(2,"0");
    const mnt=String(data.menit||0).padStart(2,"0");
    const opt=document.createElement("option");
    opt.value=d.id;
    opt.textContent=`${escapeHtml(data.mapel)} - Kelas ${escapeHtml(data.kelas)} | ${jam}:${mnt} ${data.ampm||""} | ${data.tanggal||""}`;
    opt.dataset.mapel=data.mapel;
    opt.dataset.kelas=data.kelas;
    opt.dataset.durasi=data.durasi||90;
    select.appendChild(opt);
    });
    const promptEl=document.getElementById("aiPromptText");
    promptEl.textContent=`Kamu adalah asisten yang membantu mengkonversi soal ke format sistem CBT (Computer Based Test) sekolah.\n\nTUGASMU: Baca soal dan kunci jawaban yang saya berikan (dari file, foto, atau teks apapun), lalu konversi SELURUHNYA ke format yang bisa langsung di-paste ke sistem. Berapapun jumlah soal yang ada dalam file, semuanya harus dikonversi. Berapapun jumlah pilihan per soal (a-b, a-c, a-d, a-e, dst), ikuti persis sesuai isi file.\n\nFORMAT OUTPUT WAJIB (ikuti persis):\n1.teks pertanyaan di sini\na.pilihan A\nb.pilihan B\nc.pilihan C\nd.pilihan D\nkunci: b\n\n2.soal berikutnya (jika ada 5 pilihan, tampilkan a sampai e)\na.pilihan A\nb.pilihan B\nc.pilihan C\nd.pilihan D\ne.pilihan E\nkunci: c\n\nATURAN MUTLAK:\n- Nomor soal diikuti titik langsung tanpa spasi: "1.teks"\n- Pilihan huruf kecil diikuti titik langsung tanpa spasi: "a.teks"\n- Kunci: "kunci: x" (huruf kecil, ada spasi setelah titik dua)\n- JANGAN ubah teks pertanyaan, pilihan, atau kunci jawaban sama sekali — salin persis dari file\n- JANGAN tambah atau kurangi jumlah soal dari yang ada di file\n- JANGAN tambah atau kurangi jumlah pilihan per soal dari yang ada di file\n- TIDAK ada tanda kurung, strip, atau format lain\n- TIDAK ada penjelasan, catatan, atau teks di luar format soal\n- Pisahkan tiap soal dengan SATU baris kosong\n- Output dimulai langsung dari "1." tanpa kalimat pembuka\n\nSertakan file soal / kunci jawaban Anda, lalu saya akan mengkonversinya.`;
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
    opt.textContent=`${escapeHtml(data.mapel)} - Kelas ${escapeHtml(data.kelas)} | ${jam_str} | ${data.tanggal||""}`;
    opt.dataset.mapel=data.mapel;
    opt.dataset.kelas=data.kelas;
    opt.dataset.durasi=data.durasi||90;
    select.appendChild(opt);
    });
    }catch(e){}
    const promptEl=document.getElementById("aiPromptText");
    promptEl.textContent=`Kamu adalah asisten yang membantu mengkonversi soal ke format sistem CBT (Computer Based Test) sekolah.\n\nTUGASMU: Baca soal dan kunci jawaban yang saya berikan (dari file, foto, atau teks apapun), lalu konversi SELURUHNYA ke format yang bisa langsung di-paste ke sistem. Berapapun jumlah soal yang ada dalam file, semuanya harus dikonversi. Berapapun jumlah pilihan per soal (a-b, a-c, a-d, a-e, dst), ikuti persis sesuai isi file.\n\nFORMAT OUTPUT WAJIB (ikuti persis):\n1.teks pertanyaan di sini\na.pilihan A\nb.pilihan B\nc.pilihan C\nd.pilihan D\nkunci: b\n\n2.soal berikutnya (jika ada 5 pilihan, tampilkan a sampai e)\na.pilihan A\nb.pilihan B\nc.pilihan C\nd.pilihan D\ne.pilihan E\nkunci: c\n\nATURAN MUTLAK:\n- Nomor soal diikuti titik langsung tanpa spasi: "1.teks"\n- Pilihan huruf kecil diikuti titik langsung tanpa spasi: "a.teks"\n- Kunci: "kunci: x" (huruf kecil, ada spasi setelah titik dua)\n- JANGAN ubah teks pertanyaan, pilihan, atau kunci jawaban sama sekali — salin persis dari file\n- JANGAN tambah atau kurangi jumlah soal dari yang ada di file\n- JANGAN tambah atau kurangi jumlah pilihan per soal dari yang ada di file\n- TIDAK ada tanda kurung, strip, atau format lain\n- TIDAK ada penjelasan, catatan, atau teks di luar format soal\n- Pisahkan tiap soal dengan SATU baris kosong\n- Output dimulai langsung dari "1." tanpa kalimat pembuka\n\nSertakan file soal / kunci jawaban Anda, lalu saya akan mengkonversinya.`;
    document.getElementById("soalModal").classList.remove("hidden");
    };
    window.copyAiPrompt=function(){
    const text=document.getElementById("aiPromptText").textContent;
    navigator.clipboard.writeText(text).then(()=>showToast("Prompt disalin!","success")).catch(()=>showToast("Gagal menyalin","error"));
    };
    function parseSoalText(text){
    text=text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    text=text.replace(/```[\w]*\n?/g,"").trim();
    const lines=text.split("\n");
    const soal=[];
    let current=null;
    let pertanyaanLines=[];
    let pertanyaanFlushed=false;
    const PILIHAN_LETTERS='abcdefghijklmnopqrstuvwxyz';

    function flushPertanyaan(){
        if(!current||pertanyaanFlushed)return;
        if(!pertanyaanLines.length)return;
        let joined=pertanyaanLines.join("\n");
        joined=joined.replace(/^\n+|\n+$/g,"");
        joined=joined.replace(/\n{3,}/g,"\n\n");
        current.pertanyaan=joined;
        pertanyaanLines=[];
        pertanyaanFlushed=true;
    }

    for(let i=0;i<lines.length;i++){
        const rawLine=lines[i];
        const line=rawLine.trim();
        const qMatch=line.match(/^(\d+)\.\s*(.+)/);
        const pMatch=line.match(/^([a-z])\.\s*(.*)/i);
        const kMatch=line.match(/^(?:kunci|KUNCI|jawaban|JAWABAN|answer|ANSWER)[:\s]+([A-Za-z])/i);
        const isChoiceLine=pMatch&&PILIHAN_LETTERS.includes(pMatch[1].toLowerCase());

        if(qMatch&&!isChoiceLine&&!kMatch){
            if(current){flushPertanyaan();soal.push(current);}
            current={pertanyaan:"",pilihan:{},kunci:""};
            pertanyaanLines=[qMatch[2].trim()];
            pertanyaanFlushed=false;
        }else if(isChoiceLine&&current){
            if(!pertanyaanFlushed)flushPertanyaan();
            current.pilihan[pMatch[1].toUpperCase()]=pMatch[2].trim();
        }else if(kMatch&&current){
            if(!pertanyaanFlushed)flushPertanyaan();
            current.kunci=kMatch[1].toUpperCase();
        }else if(current&&!pertanyaanFlushed&&!kMatch){
            pertanyaanLines.push(rawLine.trim());
        }
    }
    if(current){flushPertanyaan();soal.push(current);}

    const valid=soal.filter(s=>s.kunci&&Object.keys(s.pilihan).length>=2);
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
    if(soalArr.length>200){showToast("Maksimal 200 soal per bank","error");return;}
    showLoader("Mengenkripsi dan menyimpan soal...");
    try{
    const pesanSiswaVal=(document.getElementById("soalPesanSiswa")?.value||"").trim();
    const pesanDariMode=document.getElementById("soalPesanDariMode")?.value||"anonymous";
    const pesanDariVal=pesanDariMode==="manual"?(document.getElementById("soalPesanDariManual")?.value||"").trim()||"Anonymous":"Anonymous";
    const soalMode=window._soalMode||'ujian';
    // ID dokumen dibuat dulu di client (fitur Firestore) supaya bisa dipakai
    // sebagai bagian derivasi kunci enkripsi per-dokumen (lihat encryptSoalData).
    const newSoalRef=doc(collection(db,"soal"));
    const encSoal=await encryptSoalData(soalArr,newSoalRef.id);
    if(!encSoal){hideLoader();showToast("Gagal mengenkripsi soal","error");return;}
    await setDoc(newSoalRef,{
        mapel,kelas,durasi,
        soal_enc:encSoal,
        jumlah_soal:soalArr.length,
        jadwal_id:jadwalId,mode:soalMode,
        created_by:currentUser.nis,timestamp:Timestamp.now(),
        pesan_siswa:pesanSiswaVal||"Jawaban Anda telah berhasil dikumpulkan. Terima kasih atas kejujuran Anda.",
        pesan_dari:pesanDariVal
    });
    await updateDoc(doc(db,"jadwal",jadwalId),{soal_ready:true,updated_at:Timestamp.now()});
    hideLoader();
    document.getElementById("soalModal").classList.add("hidden");
    showToast(`${soalArr.length} soal berhasil dienkripsi & disimpan!`,"success");
    await loadSoalList();
    await loadPanitiaDashboard();
    }catch(e){
    hideLoader();
    console.error("saveSoal gagal:",e);
    let msg="Gagal menyimpan soal";
    if(e&&e.code==="permission-denied")msg="Gagal menyimpan soal: akun Anda tidak punya izin (permission-denied). Cek Firestore Security Rules / App Check di Firebase Console.";
    else if(e&&(e.code==="unavailable"||e.code==="deadline-exceeded"))msg="Gagal menyimpan soal: koneksi bermasalah. Coba lagi.";
    else if(e&&e.message)msg="Gagal menyimpan soal: "+e.message;
    showToast(msg,"error");
    }
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
    html+=`<tr><td><strong>${escapeHtml(data.mapel)}</strong></td><td><span class="badge badge-blue">${escapeHtml(data.kelas)}</span></td><td><span class="badge badge-purple">Ruang ${data.ruang||"-"}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td style="font-family:var(--font-mono)">${selJam}:${selMnt}</td><td>${data.durasi||90} mnt</td><td>${soalBadge}</td><td>${jagaBadge}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openEditJadwalModal('${d.id}','${data.tanggal||""}',${data.jam||8},${data.menit||0},'${data.ampm||"AM"}',${data.durasi||90})">✎ Edit</button><button class="btn btn-danger btn-sm" onclick="deleteJadwal('${d.id}')">Hapus</button></td></tr>`;
    });
    html+="</tbody></table></div>";
    container.innerHTML=html;
    });
    }catch(e){}
    }
    window.openJadwalModal=async function(){
    document.getElementById("jadwalMapel").value="";
    if(window.patlasSelectSync) patlasSelectSync(document.getElementById("jadwalMapel"));
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
    }catch(e){
    hideLoader();
    console.error("saveJadwal gagal:",e);
    let msg="Gagal menyimpan jadwal";
    if(e&&e.code==="permission-denied")msg="Gagal menyimpan jadwal: akun Anda tidak punya izin (permission-denied). Cek Firestore Security Rules / App Check di Firebase Console.";
    else if(e&&(e.code==="unavailable"||e.code==="deadline-exceeded"))msg="Gagal menyimpan jadwal: koneksi bermasalah. Coba lagi.";
    else if(e&&e.message)msg="Gagal menyimpan jadwal: "+e.message;
    showToast(msg,"error");
    }
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
    html+=`<tr><td>${escapeHtml(d.nama_lengkap)}</td><td>${escapeHtml(d.nis)}</td><td>${escapeHtml(d.kelas)}</td><td>${escapeHtml(d.mapel)}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px">${formatNilai(asli)}</td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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
    const actionBtn=!d.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none" onclick="openUnlockModal('${escapeHtml(d.nis)}','${escapeHtml(d.nama_lengkap||d.nis)}','')">Buka</button>`:`<span style="font-size:11px;color:var(--text3)">${escapeHtml(d.unlock_reason||"-")}</span>`;
    html+=`<tr><td>${escapeHtml(d.nama_lengkap||"-")}</td><td>${escapeHtml(d.nis||"-")}</td><td>${escapeHtml(d.mapel||"-")}</td><td><span class="violation-badge">${escapeHtml(d.jenis_pelanggaran||"-")}</span></td><td><span class="badge badge-red">${d.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${d.timestamp?formatWIBShort(d.timestamp):"-"}</td><td>${actionBtn}</td></tr>`;
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
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS/NIP</th><th>Waktu Login (WIB)</th></tr></thead><tbody>';
    data.forEach(d=>{html+=`<tr><td>${escapeHtml(d.nama_lengkap)}</td><td>${escapeHtml(d.nis)}</td><td style="font-family:var(--font-mono);font-size:11px">${d.tanggal_login||"-"}</td></tr>`;});
    html+="</tbody></table></div>";
    container.innerHTML=html;
    };
    window.exportPanitiaHistory=function(){
    const rows=[["Nama","NIS/NIP","Waktu Login"]];
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
    opt.textContent=`${escapeHtml(data.mapel)} - Kelas ${escapeHtml(data.kelas)} | ${data.tanggal||"-"}`;
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
    absent.forEach(s=>{html+=`<tr><td>${escapeHtml(s.nama_lengkap||"-")}</td><td>${escapeHtml(s.nis)}</td><td>${escapeHtml(s.kelas||"-")}</td><td><span class="absent-badge">Belum Hadir</span></td></tr>`;});
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
    const users=[];usersSnap.forEach(d=>{const dd=d.data();users.push({...dd,id:dd.nis||d.id});});
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
    recent.forEach(u=>{recHtml+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:13px;font-weight:600">${escapeHtml(u.nama_lengkap||u.id)}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${escapeHtml(u.id)} | ${escapeHtml(u.kelas)}</div></div><span class="badge badge-blue">${escapeHtml(u.role)}</span></div>`;});
    document.getElementById("recentUsers").innerHTML=recHtml||'<div class="empty-state"><div>Tidak ada data</div></div>';
    let logHtml="";let cnt=0;
    histSnap.forEach(d=>{if(cnt>=5)return;cnt++;const data=d.data();logHtml+=`<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:13px;font-weight:600">${escapeHtml(data.nama_lengkap)}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${data.tanggal_login||"-"}</div></div>`;});
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
    html+=`<tr><td><strong>${escapeHtml(data.mapel)}</strong></td><td><span class="badge badge-blue">${escapeHtml(data.kelas)}</span></td><td>${data.tanggal||"-"}</td><td style="font-family:var(--font-mono)">${jam}:${mnt} ${data.ampm||""}</td><td>${data.soal_ready?'<span class="badge badge-green">Sudah Ada</span>':'<span class="badge badge-red">Belum Ada</span>'}</td><td>${jagaHtml}</td><td></td><td><button class="btn btn-primary btn-sm" onclick="openAssignJagaModal('${d.id}','${escapeHtml(data.mapel.replace(/'/g,"&#39;"))}','${escapeHtml(data.kelas)}')">+ Panitia</button></td></tr>`;
    });
    html+="</tbody></table></div>";
    container.innerHTML=html;
    }catch(e){}
    }
    window.openAssignJagaModal=async function(jadwalId,mapel,kelas){
    currentAssignJadwalId={jadwalId,mapel,kelas};
    document.getElementById("assignJagaTitle").textContent=`Atur Panitia Jaga — ${escapeHtml(mapel)} (Kelas ${kelas})`;
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
    opt.textContent=`${escapeHtml(data.nama_lengkap||d.id)} (${d.id})`;
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
    const users=[];snap.forEach(d=>{const dd=d.data();users.push({...dd,id:dd.nis||d.id});});
    allUsersCache=users;
    populateKelasFilterOptions();
    filterUsers();
    }catch(e){}
    }
    function populateKelasFilterOptions(){
    const sel=document.getElementById("userKelasFilter");
    if(!sel)return;
    const prev=sel.value;
    const kelasSet=new Set();
    allUsersCache.forEach(u=>{
    const k=(u.kelas||"").trim();
    if(k)kelasSet.add(k);
    });
    const kelasList=Array.from(kelasSet).sort((a,b)=>a.localeCompare(b,"id",{numeric:true,sensitivity:"base"}));
    let html='<option value="">Semua Kelas</option>';
    kelasList.forEach(k=>{
    const kEsc=escapeHtml(k);
    html+=`<option value="${kEsc}">${kEsc}</option>`;
    });
    sel.innerHTML=html;
    if(prev&&kelasList.includes(prev))sel.value=prev;
    }
    window.resetUserFilters=function(){
    const searchEl=document.getElementById("userSearchInput");
    const roleEl=document.getElementById("userRoleFilter");
    const kelasEl=document.getElementById("userKelasFilter");
    const sortEl=document.getElementById("userSortFilter");
    if(searchEl)searchEl.value="";
    if(roleEl)roleEl.value="";
    if(kelasEl)kelasEl.value="";
    if(sortEl)sortEl.value="nama";
    filterUsers();
    };
    window.filterUsers=function(){
    const q=(document.getElementById("userSearchInput")?.value||"").toLowerCase();
    const roleF=document.getElementById("userRoleFilter")?.value||"";
    const kelasF=document.getElementById("userKelasFilter")?.value||"";
    const sortF=document.getElementById("userSortFilter")?.value||"nama";
    let filtered=allUsersCache.filter(u=>{
    const matchQ=((u.nis||u.id||"")).includes(q)||(u.nama_lengkap||"").toLowerCase().includes(q)||(u.username||"").toLowerCase().includes(q);
    const matchRole=!roleF||u.role===roleF;
    const matchKelas=!kelasF||(u.kelas||"")===kelasF;
    return matchQ&&matchRole&&matchKelas;
    });
    if(sortF==="nis")filtered.sort((a,b)=>(a.nis||a.id).localeCompare(b.nis||b.id));
    else if(sortF==="kelas")filtered.sort((a,b)=>(a.kelas||"").localeCompare(b.kelas||""));
    else filtered.sort((a,b)=>(a.nama_lengkap||"").localeCompare(b.nama_lengkap||""));
    renderUserTable(filtered);
    };
    function renderUserTable(users){
    const container=document.getElementById("userList");
    if(!users.length){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">-</div><div>Belum ada akun terdaftar</div></div>';return;}
    const roleBadge=r=>r==="admin"?"badge-red":r==="panitia"?"badge-purple":r==="guru"?"badge-yellow":"badge-blue";
    let html='<div class="table-wrap"><table><thead><tr><th>NIS/NIP</th><th>Nama Lengkap</th><th>Kelas</th><th>Role</th><th>Username</th><th>Password Sementara</th></tr></thead><tbody>';
    users.forEach(u=>{
    const nisVal=u.nis||u.id;
    let pwdCell;
    if(u.must_change_password&&u.temp_password){
    const pwdEsc=escapeHtml(u.temp_password);
    pwdCell=`<span class="badge badge-yellow" style="font-family:var(--font-mono);cursor:pointer" onclick="this.textContent=this.textContent==='••••••'?'${pwdEsc}':'••••••'" title="Klik untuk lihat/sembunyikan">••••••</span>`;
    }else{
    pwdCell=`<span style="color:var(--text3);font-size:12px">sudah diganti</span>`;
    }
    const usernameCell=u.username?`<span class="badge badge-blue" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(u.username)}</span>`:`<span style="color:var(--text3);font-size:12px">belum diatur</span>`;
    html+=`<tr><td><span class="badge badge-green" style="font-size:11px">${escapeHtml(nisVal)}</span></td><td>${escapeHtml(u.nama_lengkap||"-")}</td><td>${escapeHtml(u.kelas||"-")}</td><td><span class="badge ${roleBadge(u.role)}">${escapeHtml(u.role)}</span></td><td>${usernameCell}</td><td>${pwdCell}</td></tr>`;
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
    if(!nis||!nama){showAlert("createUserAlert","NIS/NIP dan nama wajib diisi.");return;}
    if(!/^[a-zA-Z0-9]{3,20}$/.test(nis)){showAlert("createUserAlert","NIS/NIP hanya boleh huruf & angka (3-20 karakter).");return;}
    const namaSanitized=nama.replace(/[<>"'&]/g,'').trim();
    if(!namaSanitized){showAlert("createUserAlert","Nama mengandung karakter tidak valid.");return;}
    if(currentCreateRole==="siswa"&&(!kelas||!noAbsen||!ruang)){showAlert("createUserAlert","Kelas, no absen, dan ruang wajib untuk siswa.");return;}
    if(currentCreateRole==="panitia"&&!ruang){showAlert("createUserAlert","No ruang jaga wajib untuk panitia.");return;}
    document.getElementById("createUserBtn").disabled=true;
    showLoader("Membuat akun...");
    try{
    const existingRole=await resolveNisRole(nis);
    if(existingRole){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","NIS/NIP sudah terdaftar.");return;}
    if(currentCreateRole==="siswa"){
    const allSnap=await getDocs(query(collection(db,"users"),where("role","==","siswa")));
    let dupName=false,dupAbsen=false;
    allSnap.forEach(d=>{
    const u=d.data();
    if((u.nama_lengkap||"").toLowerCase()===namaSanitized.toLowerCase())dupName=true;
    if((u.kelas===kelas)&&(parseInt(u.no_absen||0)===noAbsen))dupAbsen=true;
    });
    if(dupName){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","Nama siswa sudah terdaftar.");return;}
    if(dupAbsen){hideLoader();document.getElementById("createUserBtn").disabled=false;showAlert("createUserAlert","No absen sudah terdaftar di kelas tersebut.");return;}
    }
    const tempPwd=generateSecureTempPassword();
    let uid;
    try{
    uid=await createAuthAccount(nis,tempPwd);
    }finally{
    await closeSecondaryAuth();
    }
    const userData={nis,uid,nama_lengkap:namaSanitized,kelas:currentCreateRole==="siswa"?kelas:currentCreateRole,role:currentCreateRole,created_at:Timestamp.now(),must_change_password:true,temp_password:tempPwd};
    if(currentCreateRole==="siswa"){userData.no_absen=noAbsen;userData.ruang=ruang;}else if(currentCreateRole==="panitia"){userData.ruang=ruang;}
    await setDoc(doc(db,"users",nis),userData);
    await setDoc(doc(db,"user_roles",nis),{role:currentCreateRole});
    hideLoader();
    document.getElementById("createUserBtn").disabled=false;
    document.getElementById("createUserModal").classList.add("hidden");
    showToast(`Akun ${currentCreateRole} berhasil dibuat. Password sementara: ${tempPwd} (juga bisa dilihat lagi kapan saja di Manajemen Akun selama belum diganti)`,"success");
    await loadAdminUserList();
    await loadAdminDashboard();
    }catch(e){
    hideLoader();document.getElementById("createUserBtn").disabled=false;
    showAlert("createUserAlert",e.code==="auth/email-already-in-use"?"NIS/NIP sudah terdaftar.":"Gagal membuat akun. Coba lagi.");
    }
    };
    window.deleteUser=async function(nis){
    // Dicek lewat role di Firestore (bukan NIS hardcode) supaya identitas
    // akun admin tidak perlu terekspos di source code publik. Ini juga
    // otomatis melindungi SEMUA akun admin, bukan cuma satu NIS tertentu.
    try{
        const targetRole=await resolveNisRole(nis);
        if(targetRole&&targetRole.role==='admin'){showToast("Tidak dapat menghapus akun admin","error");return;}
    }catch(e){showToast("Gagal memverifikasi role akun, coba lagi","error");return;}
    const ok=await showConfirm("Hapus Akun",`Hapus akun NIS/NIP ${escapeHtml(nis)}? Profil & akses akan langsung nonaktif. Catatan: entri login (Firebase Auth, email ${escapeHtml(nis)}@akun.patlas.local) akan tetap ada di daftar user Firebase Console sampai dihapus manual di sana atau lewat CLI (node cli.js delete-user ${escapeHtml(nis)}) — ini batasan Firebase versi gratis, tidak berpengaruh ke keamanan karena tanpa profil, akun itu tidak bisa lihat/lakukan apa pun di app.`,"Ya, Hapus","btn-danger","");
    if(!ok)return;
    showLoader("Menghapus akun...");
    try{
    await deleteDoc(doc(db,"users",nis));
    await deleteDoc(doc(db,"user_roles",nis));
    hideLoader();showToast("Akun berhasil dihapus","success");await loadAdminUserList();
    }
    catch(e){hideLoader();showToast("Gagal menghapus akun","error");}
    };
    window.resetUserPassword=async function(nis){
    await showConfirm("Reset Password lewat CLI",
      `Demi keamanan, Firebase (gratis) tidak mengizinkan reset password akun orang lain langsung dari aplikasi. Jalankan perintah berikut di laptop admin: node cli.js reset-password ${escapeHtml(nis)} — lihat SECURITY_UPDATE/09_MIGRASI_FIREBASE_AUTH/README.md untuk panduan lengkap.`,
      "Mengerti","btn-primary","");
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
    html+=`<tr><td>${escapeHtml(d.nama_lengkap||"-")}</td><td>${escapeHtml(d.nis||"-")}</td><td>${escapeHtml(d.kelas||"-")}</td><td>${escapeHtml(d.mapel||"-")}</td><td><span class="badge ${sc}">${formatNilai(bulat)}</span></td><td style="font-family:var(--font-mono);font-size:12px">${formatNilai(asli)}</td><td style="color:var(--green)">${d.benar||0}</td><td style="color:var(--red)">${d.salah||0}</td><td>${d.pelanggaran>0?`<span class="badge badge-red">${d.pelanggaran}</span>`:"<span class='badge badge-green'>0</span>"}</td><td style="font-size:11px;color:var(--text3)">${d.waktu_selesai||"-"}</td></tr>`;
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
    html+=`<tr><td>${escapeHtml(d.nama_lengkap||"-")}</td><td>${escapeHtml(d.nis||"-")}</td><td>${escapeHtml(d.mapel||"-")}</td><td><span class="violation-badge">${escapeHtml(d.jenis_pelanggaran||"-")}</span></td><td><span class="badge badge-red">${d.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${escapeHtml(d.unlock_reason||"-")}</td><td style="font-size:11px;color:var(--text3)">${d.timestamp?formatWIBShort(d.timestamp):"-"}</td></tr>`;
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
    const asli=typeof data.nilai_asli==="number"?data.nilai_asli:(typeof data.nilai==="number"?data.nilai:parseFloat(String(data.nilai).replace(",","."))||0);
    const total=(data.benar||0)+(data.salah||0)+(data.kosong||0);
    const bulat=typeof data.nilai_dibulatkan==="number"?data.nilai_dibulatkan:hitungNilaiDibulatkan(data.benar||0,total||1);
    nilaiMap[nis].totalAsli+=asli;
    nilaiMap[nis].totalBulat+=bulat;
    nilaiMap[nis].count++;
    });
    const ranked=Object.values(nilaiMap).map(u=>({
        ...u,
        avg:u.count?(u.totalAsli/u.count):0,
        avgBulat:u.count?(u.totalBulat/u.count):0
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
    const avgAsliStr=formatNilai(u.avg);
    const avgBulatStr=formatNilai(Math.round(u.avgBulat));
    html+=`<div class="ranking-item">
    <div class="ranking-num ${numClass}">${i+1}</div>
    <div class="ranking-info">
    <div class="ranking-name">${u.nama}</div>
    <div class="ranking-detail">${escapeHtml(u.nis)} | ${escapeHtml(u.kelas)} | ${u.count} ujian</div>
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
    let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS/NIP</th><th>Kelas</th><th>Role</th><th>Waktu Login (WIB)</th></tr></thead><tbody>';
    data.forEach(d=>{html+=`<tr><td>${escapeHtml(d.nama_lengkap||"-")}</td><td>${escapeHtml(d.nis||"-")}</td><td>${escapeHtml(d.kelas||"-")}</td><td><span class="badge ${d.role==="admin"?"badge-red":d.role==="panitia"?"badge-purple":"badge-blue"}">${escapeHtml(d.role)}</span></td><td style="font-size:11px;color:var(--text3)">${d.tanggal_login||"-"}</td></tr>`;});
    html+="</tbody></table></div>";
    container.innerHTML=html;
    };
    window.exportAdminHistory=function(){
    const rows=[["Nama","NIS/NIP","Kelas","Role","Waktu Login"]];
    allHistoryCache.forEach(d=>rows.push([d.nama_lengkap||"",d.nis||"",d.kelas||"",d.role||"",d.tanggal_login||""]));
    downloadCSV(rows,"log_akses_admin.csv");
    };
    window.createBackup=async function(){
    const passphrase=document.getElementById("backupPassphrase").value;
    if(!passphrase||passphrase.length<8){showToast("Isi passphrase enkripsi backup (minimal 8 karakter) dulu.","error");return;}
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
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const hashData=await sha256(jsonStr+passphrase);
    const backupKey=await deriveBackupKey(passphrase,salt,"encrypt");
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const encBuf=await crypto.subtle.encrypt({name:"AES-GCM",iv},backupKey,new TextEncoder().encode(jsonStr));
    const combined=new Uint8Array(iv.length+encBuf.byteLength);
    combined.set(iv,0);combined.set(new Uint8Array(encBuf),iv.length);
    const encoded=btoa(String.fromCharCode(...combined));
    const saltB64=btoa(String.fromCharCode(...salt));
    const backupId="backup_"+new Date().toISOString().replace(/[:.]/g,"-");
    await setDoc(doc(db,"backups",backupId),{
    hash:hashData,data:encoded,salt:saltB64,kdf:"pbkdf2-sha256-100000",timestamp:Timestamp.now(),
    tanggal:formatWIBShort(new Date()),created_by:currentUser.nis
    });
    hideLoader();
    document.getElementById("backupPassphrase").value="";
    document.getElementById("backupStatus").innerHTML=`<div class="alert alert-success">Backup berhasil dibuat: ${backupId}. Passphrase TIDAK disimpan di mana pun — simpan sendiri untuk restore nanti.</div>`;
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
    if(!pwd){showToast("Masukkan passphrase backup","error");return;}
    const ok=await showConfirm("Restore Data","PERHATIAN: Restore akan menimpa semua data saat ini dengan data backup yang dipilih. Tindakan ini tidak dapat dibatalkan.","Ya, Restore","btn-danger",'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>');
    if(!ok)return;
    showLoader("Memvalidasi dan me-restore data...");
    try{
    const backupDoc=await getDoc(doc(db,"backups",backupId));
    if(!backupDoc.exists()){hideLoader();showToast("Backup tidak ditemukan","error");return;}
    const bData=backupDoc.data();
    if(!bData.salt||bData.kdf!=="pbkdf2-sha256-100000"){
    hideLoader();
    showToast("Backup ini dibuat dengan versi app lama (sebelum update keamanan) dan tidak bisa dibuka lagi lewat versi ini karena kunci lamanya sudah dihapus dari kode. Buat backup baru dengan versi ini.","error");
    return;
    }
    let jsonStr;
    try{
    const salt=Uint8Array.from(atob(bData.salt),c=>c.charCodeAt(0));
    const backupKey=await deriveBackupKey(pwd,salt,"decrypt");
    const combined=Uint8Array.from(atob(bData.data),c=>c.charCodeAt(0));
    const iv=combined.slice(0,12);
    const enc=combined.slice(12);
    const dec=await crypto.subtle.decrypt({name:"AES-GCM",iv},backupKey,enc);
    jsonStr=new TextDecoder().decode(dec);
    }catch(decErr){
    hideLoader();showToast("Passphrase salah atau data backup rusak.","error");return;
    }
    const expectedHash=await sha256(jsonStr+pwd);
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
    showLoader("Memverifikasi...");
    try{
    const cred=EmailAuthProvider.credential(auth.currentUser.email,pwd);
    await reauthenticateWithCredential(auth.currentUser,cred);
    }catch(e){hideLoader();showToast("Password salah","error");return;}
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
    usersSnap.forEach(d=>{
    const u=d.data();
    if(u.role==="admin")return;
    deletes.push(deleteDoc(doc(db,"users",d.id)));
    const nisVal=u.nis||d.id;
    deletes.push(deleteDoc(doc(db,"user_roles",nisVal)));
    });
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
    if(nw.length<6){showToast("Password minimal 6 karakter","error");return;}
    if(nw!==conf){showToast("Konfirmasi password tidak cocok","error");return;}
    showLoader("Mengubah password...");
    try{
    await firebaseChangePassword(old,nw);
    hideLoader();showToast("Password berhasil diubah","success");
    document.getElementById("oldPassword").value="";document.getElementById("newPassword").value="";document.getElementById("confirmPassword").value="";
    }catch(e){hideLoader();showToast(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential"?"Password lama salah":"Gagal mengubah password","error");}
    };

    const USERNAME_INPUT_MAP={
        siswa:{input:"studentUsernameInput",container:"studentAccountInfo"},
        guru:{input:"guruUsernameInput",container:"guruAccountInfo"},
        panitia:{input:"panitiaUsernameInput",container:"panitiaAccountInfo"},
        admin:{input:"adminUsernameInput",container:"adminAccountInfo"}
    };
    let _usernameSaveInFlight=false;
    window.saveUsername=async function(role){
        if(_usernameSaveInFlight)return;
        const map=USERNAME_INPUT_MAP[role];
        if(!map)return;
        const inputEl=document.getElementById(map.input);
        if(!inputEl)return;
        const raw=inputEl.value.trim().toLowerCase();
        if(!isValidUsername(raw)){
            showToast("Username minimal 4 karakter dengan minimal 4 huruf, hanya boleh huruf/angka/underscore/strip, tidak boleh hanya angka atau simbol.","error");
            return;
        }
        if(!currentUser||!currentUser.nis||!auth.currentUser){
            showToast("Sesi tidak valid. Silakan login ulang.","error");
            return;
        }
        _usernameSaveInFlight=true;
        showLoader("Menyimpan username...");
        try{
            const nis=currentUser.nis;
            let existing;
            try{
                existing=await getDoc(doc(db,"usernames",raw));
            }catch(readErr){
                hideLoader();_usernameSaveInFlight=false;
                showToast("Tidak bisa memeriksa ketersediaan username saat ini. Coba lagi nanti.","error");
                return;
            }
            if(existing.exists()){
                const existingData=existing.data();
                if(!existingData||existingData.nis!==nis){
                    hideLoader();_usernameSaveInFlight=false;
                    showUsernameTakenWithSuggestions(map,raw);
                    return;
                }
                hideLoader();_usernameSaveInFlight=false;
                showToast("Username ini sudah menjadi username Anda.","info");
                inputEl.value="";
                return;
            }
            await setDoc(doc(db,"usernames",raw),{nis:nis,createdAt:serverTimestamp()});
            const oldUsername=currentUser.username;
            if(oldUsername&&oldUsername!==raw){
                try{ await deleteDoc(doc(db,"usernames",oldUsername)); }catch(e){}
            }
            await updateDoc(doc(db,"users",nis),{username:raw});
            currentUser.username=raw;
            hideLoader();_usernameSaveInFlight=false;
            showToast("Username berhasil disimpan. Sekarang Anda bisa login memakai username ini.","success");
            inputEl.value="";
            hideUsernameSuggestions(map);
            renderAccountInfo(map.container,currentUser);
        }catch(e){
            hideLoader();_usernameSaveInFlight=false;
            if(e&&e.code==="permission-denied"){
                showToast("Penyimpanan username ditolak sistem. Username ini mungkin baru saja diambil orang lain, coba username lain.","error");
            }else{
                showToast("Gagal menyimpan username. Coba lagi.","error");
            }
        }
    };
    function usernameSuggestionBoxId(map){ return map.input+"_suggestions"; }
    function hideUsernameSuggestions(map){
        const box=document.getElementById(usernameSuggestionBoxId(map));
        if(box)box.remove();
    }
    function renderUsernameSuggestions(map,base){
        hideUsernameSuggestions(map);
        const inputEl=document.getElementById(map.input);
        if(!inputEl)return;
        const suggestions=generateUsernameSuggestions(base,3);
        const box=document.createElement("div");
        box.id=usernameSuggestionBoxId(map);
        box.style.cssText="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center";
        let inner='<span style="font-size:12px;color:var(--text3)">Coba:</span>';
        suggestions.forEach(s=>{
            const sEsc=escapeHtml(s);
            inner+=`<button type="button" class="btn btn-outline btn-sm" onclick="applyUsernameSuggestion('${map.input}','${sEsc}')">${sEsc}</button>`;
        });
        inner+=`<button type="button" class="btn btn-outline btn-sm" title="Muat rekomendasi lain" onclick="refreshUsernameSuggestions('${map.input}','${escapeHtml(base)}')">&#8635; Refresh</button>`;
        box.innerHTML=inner;
        inputEl.insertAdjacentElement("afterend",box);
    }
    function showUsernameTakenWithSuggestions(map,raw){
        showToast("Username sudah digunakan, coba yang lain.","error");
        renderUsernameSuggestions(map,raw);
    }
    window.applyUsernameSuggestion=function(inputId,value){
        const inputEl=document.getElementById(inputId);
        if(!inputEl)return;
        inputEl.value=value;
        inputEl.focus();
        const map=Object.values(USERNAME_INPUT_MAP).find(m=>m.input===inputId);
        if(map)hideUsernameSuggestions(map);
    };
    window.refreshUsernameSuggestions=function(inputId,base){
        const map=Object.values(USERNAME_INPUT_MAP).find(m=>m.input===inputId);
        if(!map)return;
        renderUsernameSuggestions(map,base);
    };
    window.changeAdminPassword=async function(){
    const old=document.getElementById("adminOldPwd").value;
    const nw=document.getElementById("adminNewPwd").value;
    const conf=document.getElementById("adminConfirmPwd").value;
    if(!old||!nw||!conf){showToast("Semua field wajib diisi","error");return;}
    if(nw.length<6){showToast("Password minimal 6 karakter","error");return;}
    if(nw!==conf){showToast("Konfirmasi tidak cocok","error");return;}
    showLoader("Mengubah password...");
    try{
    await firebaseChangePassword(old,nw);
    hideLoader();showToast("Password berhasil diubah","success");
    }catch(e){hideLoader();showToast(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential"?"Password lama salah":"Gagal mengubah password","error");}
    };
    window.changePanitiaPassword=async function(){
    const old=document.getElementById("panitiaOldPwd").value;
    const nw=document.getElementById("panitiaNewPwd").value;
    const conf=document.getElementById("panitiaConfirmPwd").value;
    if(!old||!nw||!conf){showToast("Semua field wajib diisi","error");return;}
    if(nw.length<6){showToast("Password minimal 6 karakter","error");return;}
    if(nw!==conf){showToast("Konfirmasi tidak cocok","error");return;}
    showLoader("Mengubah password...");
    try{
    await firebaseChangePassword(old,nw);
    hideLoader();showToast("Password berhasil diubah","success");
    }catch(e){hideLoader();showToast(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential"?"Password lama salah":"Gagal mengubah password","error");}
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
    if(tabId==="admin-settings")renderBiometricCard();
    }
    function switchStudentTab(tabId,el){
    document.querySelectorAll(".student-tab-content").forEach(t=>t.classList.add("hidden"));
    document.querySelectorAll("#studentPage .nav-tab").forEach(t=>t.classList.remove("active"));
    document.getElementById(tabId).classList.remove("hidden");
    el.classList.add("active");
    if(tabId==="student-ranking")loadStudentRanking();
    if(tabId==="student-settings")renderBiometricCard();
    }
    function switchPanitiaTab(tabId,el){
    document.querySelectorAll(".panitia-tab-content").forEach(t=>t.classList.add("hidden"));
    document.querySelectorAll("#panitiaPage .nav-tab").forEach(t=>t.classList.remove("active"));
    document.getElementById(tabId).classList.remove("hidden");
    el.classList.add("active");
    if(tabId==="panitia-ranking"){loadPanitiaRanking();loadRankingPublishState();}
    if(tabId==="panitia-control")loadControlRuang();
    if(tabId==="panitia-settings")renderBiometricCard();
    }
    window.switchAdminTab=switchAdminTab;
    window.switchStudentTab=switchStudentTab;
    window.switchPanitiaTab=switchPanitiaTab;

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
    const GRACE=10*60*1000;

    if(mulai&&selesai){
    if(now>=mulai&&now<=(selesai+GRACE)){
    _controlRuangRoom=room;
    if(labelEl)labelEl.textContent=`(Ruang ${room.ruang})`;
    tabBtn.style.display="";
    if(_controlRuangHideTimer)clearTimeout(_controlRuangHideTimer);
    const remaining=(selesai+GRACE)-now;
    _controlRuangHideTimer=setTimeout(()=>{
    tabBtn.style.display="none";
    _controlRuangRoom=null;
    if(document.getElementById("panitia-control")&&!document.getElementById("panitia-control").classList.contains("hidden")){
    const dashBtn=document.querySelector("#panitiaPage .nav-tab[data-tab='panitia-dashboard']");
    if(dashBtn)switchPanitiaTab("panitia-dashboard",dashBtn);
    }
    showToast("Tab Control Ruang disembunyikan (ujian selesai + 10 menit)","info");
    },remaining);
    return;
    }
    }
    tabBtn.style.display="none";
    _controlRuangRoom=null;
    }else if(room&&!room.jadwal){
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
    if(subtitleEl)subtitleEl.textContent=`${escapeHtml(jd?.mapel||"-")} — Kelas ${jd?.kelas||"-"} | Ruang ${ruang}`;

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
    statusHtml=`<span class="badge badge-green">● UJIAN BERLANGSUNG — Sisa ${sisa} menit</span>`;
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
    bannerEl.textContent=`Ruang ${ruang} | ${escapeHtml(jd?.mapel||"-")} | Kelas ${jd?.kelas||"-"}`;
    bannerEl.style.display="block";
    }

    try{
    const ruangInt=parseInt(ruang)||0;
    const ruangStr=String(ruang);
    const [snapInt,snapStr]=await Promise.all([
    getDocs(query(collection(db,"users"),where("ruang","==",ruangInt),where("role","==","siswa"))),
    getDocs(query(collection(db,"users"),where("ruang","==",ruangStr),where("role","==","siswa")))
    ]);
    const seenNis=new Set();
    const siswaList=[];
    [...snapInt.docs,...snapStr.docs].forEach(d=>{
    const nis=d.id||(d.data().nis)||null;
    const userData={...d.data(),nis:nis};
    if(nis&&!seenNis.has(nis)){seenNis.add(nis);siswaList.push(userData);}
    });
    if(siswaList.length===0){
    if(siswaEl)siswaEl.innerHTML='<div class="empty-state"><div>Tidak ada siswa terdaftar di ruang ini</div></div>';
    }else{
    const jadwalId=jd?.id||room?.jadwal_id||null;
    const nisArrCR=Array.from(seenNis);
    const chunkCR=(arr,size)=>{const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out;};
    const lockChunksCR=chunkCR(nisArrCR,30);
    const [nilaiSnap,progSnap,...lockSnapsCR]=await Promise.all([
    jadwalId?getDocs(query(collection(db,"nilai"),where("jadwal_id","==",jadwalId))):getDocs(collection(db,"nilai")),
    jadwalId?getDocs(query(collection(db,"exam_progress"),where("jadwal_id","==",jadwalId))):getDocs(collection(db,"exam_progress")),
    ...(nisArrCR.length?lockChunksCR.map(ids=>getDocs(query(collection(db,"siswa_lock"),where(documentId(),"in",ids)))):[getDocs(collection(db,"siswa_lock"))])
    ]);
    const nilaiMap={};
    nilaiSnap.forEach(d=>{const nd=d.data();if(seenNis.has(nd.nis))nilaiMap[nd.nis]=nd;});
    const progMap={};
    progSnap.forEach(d=>{
    const docNis=d.data().nis||(d.id.includes("_")?d.id.split("_")[0]:d.id);
    if(seenNis.has(docNis))progMap[docNis]=d.data();
    });
    const lockMap={};
    lockSnapsCR.forEach(snap=>snap.forEach(d=>{lockMap[d.id]=d.data();}));
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
    const lockReason=lock.reason||"";
    const isExit=lockReason.toLowerCase().includes("keluar")||lockReason.toLowerCase().includes("exit")||lockReason.toLowerCase().includes("minimize");
    if(isExit){
    statusBadge='<span class="badge badge-red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Keluar App</span>';
    }else{
    statusBadge='<span class="badge badge-red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Terkunci</span>';
    }
    }else if(nilai){
    statusBadge='<span class="badge badge-green">✓ Selesai</span>';
    }else if(prog){
    statusBadge='<span class="badge badge-blue">● Sedang Mengerjakan</span>';
    }else{
    statusBadge='<span class="badge" style="color:var(--text3)">○ Belum Mulai</span>';
    }
    const pelCount=nilai?.pelanggaran||prog?.violation_count||0;
    const pelBadge=pelCount>0?`<span class="badge badge-red">${pelCount}</span>`:'<span class="badge badge-green">0</span>';
    html+=`<tr><td>${escapeHtml(u.nama_lengkap||"-")}</td><td>${escapeHtml(u.nis||"-")}</td><td>${escapeHtml(u.kelas||"-")}</td><td>${statusBadge}</td><td>${pelBadge}</td></tr>`;
    });
    html+="</tbody></table></div>";
    if(siswaEl)siswaEl.innerHTML=html;
    }
    }catch(e){console.error("loadControlRuang siswa error:",e);if(siswaEl)siswaEl.innerHTML=`<div class="empty-state"><div>Gagal memuat data siswa.</div></div>`;}

    try{
    const qNum=query(collection(db,"pelanggaran"),where("ruang","==",ruang));
    const qStr=query(collection(db,"pelanggaran"),where("ruang","==",String(ruang)));
    const [snapNum,snapStr]=await Promise.all([getDocs(qNum),getDocs(qStr)]);
    const seenIds=new Set();
    const allDocs=[];
    [...snapNum.docs,...snapStr.docs].forEach(d=>{if(!seenIds.has(d.id)){seenIds.add(d.id);allDocs.push(d);}});
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
    const actionBtn=!data.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none" onclick="openUnlockModal('${escapeHtml(data.nis)}','${escapeHtml(data.nama_lengkap||data.nis)}','')">Buka Kunci</button>`:'<span style="font-size:11px;color:var(--text3)">-</span>';
    html+=`<tr><td>${escapeHtml(data.nama_lengkap||"-")}</td><td><span class="violation-badge">${escapeHtml(data.jenis_pelanggaran||"-")}</span></td><td><span class="badge badge-red">${data.jumlah||0}</span></td><td>${statusBadge}</td><td style="font-size:11px;color:var(--text3)">${waktu}</td><td>${actionBtn}</td></tr>`;
    });
    html+="</tbody></table></div>";
    if(violEl)violEl.innerHTML=html;
    }
    }catch(e){
    console.error("loadControlRuang violation error:",e);
    if(violEl)violEl.innerHTML=`<div class="empty-state"><div>Gagal memuat pelanggaran.</div></div>`;
    }
    }
    window.loadControlRuang=loadControlRuang;
    window.refreshControlRuang=loadControlRuang;
    function hitungPointPerSoal(total){
        if(!total||total===0)return 0;
        const p=Math.floor(100/total);
        return p<1?1:p;
    }
    function hitungNilaiAsli(benar,total){
        if(!total||total===0)return 0;
        const pps=hitungPointPerSoal(total);
        return benar*pps;
    }
    function hitungNilai(benar,total){
        return hitungNilaiAsli(benar,total);
    }
    function hitungNilaiDibulatkan(benar,total){
        const asli=hitungNilaiAsli(benar,total);
        if(asli===0)return 0;
        const mod=asli%5;
        return mod===0?asli:asli+(5-mod);
    }
    function formatNilaiAsliDisplay(benar,total){
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

    const INSTALLATION_SECRET = "oFIqCmD5-JlLRjNDQ1tcxDp1yQzv4JxPSK8vy4-TdqWsdK4lQmSxqA";

    if(INSTALLATION_SECRET==="GANTI_INI_DENGAN_STRING_ACAK_UNIK_SEKOLAH_ANDA_MIN_32_KARAKTER"){
        console.warn("[PATLAS][SECURITY] INSTALLATION_SECRET masih nilai default! Enkripsi soal tidak benar-benar unik per instalasi. Ganti di script.js sebelum dipakai untuk ujian sungguhan.");
    }

    async function _getSoalEncKey(examId){
        if(!examId) throw new Error("_getSoalEncKey: examId wajib diisi untuk derivasi kunci per-dokumen");
        const keyHash = await sha256(`${examId}:${INSTALLATION_SECRET}`);
        const keyBytes = new Uint8Array(32);
        for(let i=0;i<32;i++) keyBytes[i]=parseInt(keyHash.slice(i*2,i*2+2),16);
        return crypto.subtle.importKey("raw",keyBytes,{name:"AES-GCM"},false,["encrypt","decrypt"]);
    }
    async function encryptSoalData(soalArr,examId){
        try{
            const key=await _getSoalEncKey(examId);
            const iv=crypto.getRandomValues(new Uint8Array(12));
            const plain=new TextEncoder().encode(JSON.stringify(soalArr));
            const enc=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
            const combined=new Uint8Array(12+enc.byteLength);
            combined.set(iv,0);combined.set(new Uint8Array(enc),12);
            return {
                encrypted:true,
                v:2,
                data:btoa(String.fromCharCode(...combined))
            };
        }catch(e){console.error("[PATLAS] encryptSoalData error:",e);return null;}
    }
    async function decryptSoalData(encObj,examId){
        try{
            if(!encObj||!encObj.encrypted||!encObj.data)return null;
            const combined=Uint8Array.from(atob(encObj.data),c=>c.charCodeAt(0));
            const iv=combined.slice(0,12);
            const enc=combined.slice(12);
            const version=encObj.v||1;
            const key=version>=2
                ? await _getSoalEncKey(examId)
                : await _getSoalEncKeyLegacyV1(); // dokumen lama, migrasi otomatis di bawah
            const dec=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,enc);
            return JSON.parse(new TextDecoder().decode(dec));
        }catch(e){console.error("[PATLAS] decryptSoalData error:",e);return null;}
    }
    // Kunci lama (v1, global) — HANYA dipertahankan supaya dokumen soal yang
    // dibuat sebelum patch ini masih bisa dibaca sekali untuk dimigrasi ke
    // v2. Jangan pernah dipakai untuk enkripsi baru.
    async function _getSoalEncKeyLegacyV1(){
        const LEGACY_SALT_V1 = "PATLAS_SOAL_KUNCI_ENCRYPT_14DPK_2025";
        const keyHash = await sha256(LEGACY_SALT_V1);
        const keyBytes = new Uint8Array(32);
        for(let i=0;i<32;i++) keyBytes[i]=parseInt(keyHash.slice(i*2,i*2+2),16);
        return crypto.subtle.importKey("raw",keyBytes,{name:"AES-GCM"},false,["encrypt","decrypt"]);
    }
    // Panggil sekali per dokumen soal lama (v1) saat dibuka oleh guru/admin
    // di halaman kelola soal, supaya otomatis ditulis ulang sebagai v2
    // dengan kunci per-dokumen. Aman dipanggil berkali-kali (no-op kalau
    // sudah v2).
    async function migrateSoalEncV1ToV2(soalDocId,soalData){
        try{
            if(!soalData||!soalData.soal_enc) return false;
            if((soalData.soal_enc.v||1)>=2) return false; // sudah v2
            const dec=await decryptSoalData(soalData.soal_enc,soalDocId);
            if(!dec) return false;
            const reEnc=await encryptSoalData(dec,soalDocId);
            if(!reEnc) return false;
            await updateDoc(doc(db,"soal",soalDocId),{soal_enc:reEnc,updated_at:Timestamp.now()});
            console.info(`[PATLAS] Soal ${soalDocId} dimigrasi ke enkripsi v2 (kunci per-dokumen).`);
            return true;
        }catch(e){console.error("[PATLAS] migrateSoalEncV1ToV2 error:",e);return false;}
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
      style="margin-top:8px;padding:8px 20px;background:transparent;color:#555;border:1px solid #333;border-radius:8px;font-size:12px;font-family:monospace;cursor:pointer;transition:all 0.3s;pointer-events:auto">↻ Cek ulang status kunci</button>`;
    document.body.style.pointerEvents="";
    document.body.style.removeProperty("pointer-events");
    document.body.classList.remove("exam-mode");
    document.body.appendChild(lockDiv);
    const _lockBtn=document.getElementById("lockReturnBtn");
    if(_lockBtn)_lockBtn.addEventListener("click",function(){if(!this.disabled)_doResumeAfterUnlock();});
    const _refreshBtn=document.getElementById("lockRefreshBtn");
    if(_refreshBtn)_refreshBtn.addEventListener("click",async function(){
      _refreshBtn.textContent="Mengecek...";_refreshBtn.style.color="#fff";_refreshBtn.disabled=true;
      try{
        let snap;
        try{snap=await getDoc(doc(db,"siswa_lock",currentUser.nis));}catch(e2){snap=null;}
        const isUnlocked=!snap||!snap.exists()||snap.data().locked===false;
        if(isUnlocked){
          if(_lockListener){_lockListener();_lockListener=null;}
          const lockDiv=document.getElementById("lockScreen");
          if(lockDiv)lockDiv.remove();
          document.querySelectorAll(".page").forEach(p=>{p.style.display="";});
          _doResumeAfterUnlock();
        }else{
          _refreshBtn.disabled=false;
          _refreshBtn.textContent="↻ Cek ulang status kunci";
          const pembuka=appMode==='ulangan'?'guru':'panitia';
          showToast(`Masih terkunci. Hubungi ${pembuka} untuk membuka kunci.`,"error",3500);
        }
      }catch(e){
        _refreshBtn.disabled=false;
        _refreshBtn.textContent="↻ Cek ulang status kunci";
        showToast("Gagal mengecek status. Coba lagi.","error",3000);
      }
    });
    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.lockExam();}catch(e){}}
    }
    let _lockListener = null;
    function startLockListener(nis){
    if(_lockListener)_lockListener();
    try{
    _lockListener=onSnapshot(doc(db,"siswa_lock",nis),snap=>{
    if(snap.exists()&&snap.data().locked===false){
    if(_lockListener){_lockListener();_lockListener=null;}
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

    document.body.style.pointerEvents="";
    document.body.style.removeProperty("pointer-events");

    if(typeof PatlasAndroid!=="undefined"){try{PatlasAndroid.onScreenUnlocked();}catch(e){}}
    showToast("Kunci dibuka. Anda dapat melanjutkan ujian.","success");
    if(currentExam&&currentUser){
    renderQuestion(currentQuestion);
    document.body.classList.add("exam-mode");

    const examPage=document.getElementById("examPage");
    if(examPage){
      examPage.style.display="flex";
      examPage.style.flexDirection="column";
      examPage.style.overflow="hidden";
      examPage.style.position="fixed";
      examPage.style.inset="0";
      examPage.style.width="100%";
      examPage.style.height="100%";
    }
    const questionArea=document.querySelector(".question-area");
    if(questionArea){
      questionArea.style.flex="1";
      questionArea.style.overflowY="auto";
      questionArea.style.webkitOverflowScrolling="touch";
      questionArea.style.overscrollBehavior="contain";
      questionArea.style.touchAction="pan-y pinch-zoom";
    }
    setupAntiCheat();
    saveLocalExamSession();
    }
    }
    let _progressSaveDebounce=null;
    function scheduleProgressSave(){
    saveLocalExamSession();

    if(_progressSaveDebounce)clearTimeout(_progressSaveDebounce);
    _progressSaveDebounce=setTimeout(()=>saveProgressToServer(),3000);
    }

    window.showOverlayWarning=function(appNames){
    showToast("App overlay terdeteksi: "+appNames+". Pastikan tidak ada floating window aktif.","warning",10000);
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
        document.getElementById("adminGreeting").textContent=`Login sebagai ${escapeHtml(currentUser.nama_lengkap||currentUser.nis)}`;
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
    const ok=await showConfirm("Keluar dari Sistem","Yakin ingin keluar dari sistem?","Ya, Keluar","btn-danger",'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>');
    if(!ok)return;
    if(_notifInterval){clearInterval(_notifInterval);_notifInterval=null;}
    currentUser=null;
    try{await signOut(auth);}catch(e){}
    document.getElementById("nisInput").value="";
    document.getElementById("passwordInput").value="";
    document.getElementById("passwordGroup").style.display="none";
    hideAlert("loginAlert");
    showPage("loginPage");
    showToast("Berhasil keluar dari sistem","info");
    };
    window.openThemeModal=openThemeModal;
    async function initApp(){
    const theme=getTheme();
    setTheme(theme);
    window._patlasDB=db;
    window._patlasFirestore={getDoc,setDoc,doc,addDoc,collection,query,where,getDocs,orderBy,limit,updateDoc,deleteDoc};
    window.loadHomePage=loadHomePage;
    window.showPage=showPage;
    window.hideLoader=hideLoader;
    window.showToast=showToast;
    const sessionRestored=await checkSession();
    if(!sessionRestored){showPage("loginPage");hideLoader();}
    await checkAdminAccountExists();
    }
    async function checkAdminAccountExists(){
    try{
    // Query berbasis role (bukan NIS spesifik hardcode) — cukup untuk
    // sanity-check "apakah minimal ada satu admin", tanpa perlu menyimpan
    // identitas akun admin di source code publik. Query ini valid karena
    // rules "user_roles" memang public-read by design (cuma expose {role}).
    const snap=await getDocs(query(collection(db,"user_roles"),where("role","==","admin"),limit(1)));
    if(snap.empty){
    console.warn("[PATLAS] Belum ada akun admin. Buat lewat admin-cli (lihat SECURITY_UPDATE/09_MIGRASI_FIREBASE_AUTH), BUKAN otomatis dari sini.");
    }
    }catch(e){}
    }
    document.getElementById("nisInput").addEventListener("keydown",e=>{if(e.key==="Enter"){ _loginModeBio?tryBiometricLogin():handleLogin(); }});
    document.getElementById("passwordInput").addEventListener("keydown",e=>{if(e.key==="Enter")handleLogin();});
    document.getElementById("nisInput").addEventListener("input",updateBioLoginButtonState);
    document.getElementById("bioPasswordModalInput").addEventListener("keydown",e=>{if(e.key==="Enter")confirmBioPasswordModal();});
    updateBioLoginButtonState();
    initApp();

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

    let appMode='ujian';
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
            'Ya, Aktifkan','btn-primary','⚙'
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
        const ujianOnlyAdminTabs=['admin-soal','admin-jadwal-ujian','admin-jadwal','admin-violations'];
        ujianOnlyAdminTabs.forEach(tid=>{
            const btn=document.querySelector(`#adminPage .nav-tab[data-tab="${tid}"]`);
            if(btn)btn.style.display=appMode==='ujian'?'':'none';
        });
        const studentModeBadge=document.getElementById('studentModeBadge');
        if(studentModeBadge){
            studentModeBadge.style.display='';
            studentModeBadge.textContent='MODE: '+(appMode==='ujian'?'UJIAN':'ULANGAN HARIAN');
            studentModeBadge.className='badge '+(appMode==='ujian'?'badge-blue':'badge-yellow');
        }
        const studentExamTab=document.querySelector('#studentPage .nav-tab[data-tab="student-exam"]');
        if(studentExamTab){
            studentExamTab.textContent=appMode==='ulangan'?'Ulangan':'Ujian';
        }
        const guruControlTabBtn=document.getElementById('guruControlTab');
        if(guruControlTabBtn){
            if(appMode==='ujian')guruControlTabBtn.style.display='none';
        }
        if(appMode==='ulangan'&&currentUser&&currentUser.role==='panitia'){
            showToast('Mode sistem berubah ke Ulangan Harian. Akun panitia tidak aktif.','warning',5000);
            setTimeout(()=>{currentUser=null;signOut(auth).catch(()=>{});showPage('loginPage');},3000);
        }
        if(appMode==='ujian'&&currentUser&&currentUser.role==='guru'){
            showToast('Mode sistem berubah ke Mode Ujian. Akun guru tidak aktif saat ini.','warning',5000);
            setTimeout(()=>{currentUser=null;signOut(auth).catch(()=>{});showPage('loginPage');},3000);
        }
    }
    window.setAppMode=setAppMode;

    async function loadGuruPage(){
        await loadAppMode();
        if(appMode==='ujian'){
            showToast('Sistem dalam Mode Ujian. Akun guru tidak aktif.','error',4000);
            setTimeout(()=>{currentUser=null;signOut(auth).catch(()=>{});showPage('loginPage');},2000);
            return;
        }
        showPage('guruPage');
        buildUserChip('guruUserChip',currentUser);
        buildThemeGrid('guruThemeGrid');
        renderAccountInfo('guruAccountInfo',currentUser);
        await loadGuruDashboard();
        await loadGuruSoal();
        await loadGuruJadwal();
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
                if(dt.tanggal===today)todayHtml+=`<div style="padding:10px;border-bottom:1px solid var(--border)"><strong>${escapeHtml(dt.mapel)}</strong> — ${escapeHtml(dt.kelas)} — ${dt.jam_mulai||'-'} — Durasi: ${dt.durasi||90} mnt</div>`;
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
        else if(tabId==='guru-settings')renderBiometricCard();
    }

    async function loadGuruControlInit(){
        const sel=document.getElementById('guruControlJadwalSelect');
        const tabBtn=document.getElementById('guruControlTab');
        if(!sel)return;
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            const now=Date.now();
            const EARLY=5*60*1000;
            const GRACE=10*60*1000;
            const jadwals=[];
            snap.forEach(d=>{jadwals.push({id:d.id,...d.data()});});
            const visibleJadwals=jadwals.filter(jd=>{
                const mulai=jd.mulai_timestamp?.toMillis?.();
                const selesai=jd.selesai_timestamp?.toMillis?.();
                if(!mulai||!selesai)return false;
                return now>=(mulai-EARLY)&&now<=(selesai+GRACE);
            });
            if(!visibleJadwals.length){
                if(tabBtn)tabBtn.style.display='none';
                sel.innerHTML='<option value="">Tidak ada ulangan aktif saat ini</option>';
                return;
            }
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
                opt.textContent=`${prefix}${escapeHtml(jd.mapel||'-')} — ${escapeHtml(kelasFull)} — ${jd.tanggal||'-'}`;
                sel.appendChild(opt);
            });
            const firstJd=visibleJadwals[0];
            const kelasFull=firstJd.kelas_exact||firstJd.kelas||'-';
            if(tabBtn){
                tabBtn.style.display='';
                tabBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Monitor Ruang (${escapeHtml(kelasFull)})`;
            }
            const activeJd=visibleJadwals.find(jd=>{const m=jd.mulai_timestamp?.toMillis?.();const s=jd.selesai_timestamp?.toMillis?.();return m&&s&&now>=m&&now<=s;});
            const toSelect=activeJd||visibleJadwals[0];
            if(toSelect){
                sel.value=toSelect.id;
                if(window.patlasSelectSync) patlasSelectSync(sel);
                const k=toSelect.kelas_exact||toSelect.kelas||'-';
                if(tabBtn)tabBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Monitor Ruang (${k})`;
                loadGuruControlRuang();
            }
        }catch(e){if(tabBtn)tabBtn.style.display='none';}
    }

    window.onGuruControlJadwalChange=async function(){
        const sel=document.getElementById('guruControlJadwalSelect');
        const tabBtn=document.getElementById('guruControlTab');
        if(sel&&tabBtn&&sel.value){
            try{
                const jdSnap=await getDoc(doc(db,'jadwal',sel.value));
                if(jdSnap.exists()){
                    const jd=jdSnap.data();
                    const k=jd.kelas_exact||jd.kelas||'-';
                    tabBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Monitor Ruang (${k})`;
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
        if(_guruControlAutoRefresh){clearInterval(_guruControlAutoRefresh);_guruControlAutoRefresh=null;}
        showLoader('Memuat data monitor...');
        try{
            const jdSnap=await getDoc(doc(db,'jadwal',jadwalId));
            if(!jdSnap.exists()){hideLoader();return;}
            const jd=jdSnap.data();
            const kelasFull=jd.kelas_exact||jd.kelas||'';
            if(statusCard)statusCard.style.display='';
            const now=Date.now();
            const mulai=jd.mulai_timestamp?.toMillis?.();
            const selesai=jd.selesai_timestamp?.toMillis?.();
            if(statusEl){
                if(mulai&&selesai){
                    if(now<mulai){
                        const sisaMnt=Math.ceil((mulai-now)/60000);
                        statusEl.innerHTML=`<span class="badge badge-blue">⏳ Belum Mulai — Mulai dalam ${sisaMnt} menit</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: <strong>${escapeHtml(kelasFull)}</strong></span>`;
                    }else if(now>=mulai&&now<=selesai){
                        const sisaMnt=Math.ceil((selesai-now)/60000);
                        statusEl.innerHTML=`<span class="badge badge-green">● BERLANGSUNG — Sisa ${sisaMnt} menit</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: <strong>${escapeHtml(kelasFull)}</strong> | ${escapeHtml(jd.mapel||'-')}</span>`;
                    }else{
                        statusEl.innerHTML=`<span class="badge badge-red">✓ Selesai</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: ${escapeHtml(kelasFull)}</span>`;
                    }
                }else{statusEl.innerHTML=`<span class="badge">Waktu tidak ditentukan</span> <span style="font-size:11px;color:var(--text3);margin-left:8px">Kelas: ${escapeHtml(kelasFull)}</span>`;}
            }
            const studSnap=await getDocs(query(collection(db,'users'),where('role','==','siswa'),where('kelas','==',kelasFull)));
            const siswaList=[];
            const nisSet=new Set();
            studSnap.forEach(d=>{const u={...d.data(),nis:d.id};siswaList.push(u);nisSet.add(d.id);});
            const nisArrGC=Array.from(nisSet);
            const chunkGC=(arr,size)=>{const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out;};
            const lockChunksGC=chunkGC(nisArrGC,30);
            const [nilaiSnap,progSnap,...lockSnapsGC]=await Promise.all([
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jadwalId))),
                getDocs(query(collection(db,'exam_progress'),where('jadwal_id','==',jadwalId))),
                ...(nisArrGC.length?lockChunksGC.map(ids=>getDocs(query(collection(db,'siswa_lock'),where(documentId(),'in',ids)))):[])
            ]);
            const nilaiMap={};
            nilaiSnap.forEach(d=>{const nd=d.data();if(nisSet.has(nd.nis))nilaiMap[nd.nis]=nd;});
            const progMap={};
            progSnap.forEach(d=>{const nis=d.data().nis||(d.id.includes('_')?d.id.split('_')[0]:d.id);if(nisSet.has(nis))progMap[nis]=d.data();});
            const lockMap={};
            lockSnapsGC.forEach(snap=>snap.forEach(d=>{if(nisSet.has(d.id))lockMap[d.id]=d.data();}));
            if(!siswaList.length){
                if(siswaEl)siswaEl.innerHTML=`<div class="empty-state"><div>Tidak ada siswa di kelas ${escapeHtml(kelasFull)}</div></div>`;
            }else{
                siswaList.sort((a,b)=>{
                    const ord=u=>{const l=lockMap[u.nis];const n=nilaiMap[u.nis];const p=progMap[u.nis];
                    if(l?.locked)return 0;if(p&&!n)return 1;if(!p&&!n)return 2;return 3;};
                    return ord(a)-ord(b);
                });
                const selesai_count=Object.keys(nilaiMap).length;
                const mengerjakan_count=Object.values(progMap).filter(p=>!nilaiMap[p.nis||'']).length;
                const terkunci_count=Object.values(lockMap).filter(l=>l.locked).length;
                let html=`<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
                    <span class="badge badge-green">✓ Selesai: ${selesai_count}</span>
                    <span class="badge badge-blue">● Mengerjakan: ${mengerjakan_count}</span>
                    <span class="badge badge-red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Terkunci: ${terkunci_count}</span>
                    <span class="badge">Total: ${siswaList.length} siswa</span>
                </div>`;
                html+='<div class="table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>NIS</th><th>Status</th><th>Pelanggaran</th><th>Aksi</th></tr></thead><tbody>';
                siswaList.forEach((u,idx)=>{
                    const nilai=nilaiMap[u.nis];const prog=progMap[u.nis];const lock=lockMap[u.nis];
                    let statusBadge;
                    if(lock?.locked){
                        const r=(lock.reason||'').toLowerCase();
                        const isExit=r.includes('keluar')||r.includes('exit')||r.includes('minimize');
                        statusBadge=isExit?'<span class="badge badge-red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Keluar App</span>':'<span class="badge badge-red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Terkunci</span>';
                    }else if(nilai){statusBadge='<span class="badge badge-green">✓ Selesai</span>';}
                    else if(prog){statusBadge='<span class="badge badge-blue">● Mengerjakan</span>';}
                    else{statusBadge='<span class="badge" style="color:var(--text3)">○ Belum Mulai</span>';}
                    const pelCount=nilai?.pelanggaran||prog?.violation_count||0;
                    const pelBadge=pelCount>0?`<span class="badge badge-red">${pelCount}</span>`:'<span style="color:var(--text3)">-</span>';
                    const aksiBtn=lock?.locked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="openGuruUnlockModal('${escapeHtml(u.nis)}','${escapeHtml(u.nama_lengkap||u.nis)}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Buka Kunci</button>`:'-';
                    html+=`<tr><td style="color:var(--text3);font-size:12px">${u.no_absen||idx+1}</td><td>${escapeHtml(u.nama_lengkap||'-')}</td><td style="font-family:var(--font-mono);font-size:12px">${escapeHtml(u.nis)}</td><td>${statusBadge}</td><td>${pelBadge}</td><td>${aksiBtn}</td></tr>`;
                });
                html+='</tbody></table></div>';
                if(siswaEl)siswaEl.innerHTML=html;
            }
            const violSnap=await getDocs(query(collection(db,'pelanggaran'),where('jadwal_id','==',jadwalId)));
            if(violSnap.empty){
                if(violEl)violEl.innerHTML='<div class="empty-state"><div>Tidak ada pelanggaran tercatat</div></div>';
            }else{
                let html='<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jenis</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
                violSnap.forEach(d=>{
                    const vd=d.data();
                    if(!nisSet.has(vd.nis))return;
                    const statusBadge=vd.unlocked?'<span class="badge badge-green">Dibuka</span>':'<span class="badge badge-red">Terkunci</span>';
                    const btn=!vd.unlocked?`<button class="btn btn-sm" style="background:var(--yellow);color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="openGuruUnlockModal('${escapeHtml(vd.nis)}','${escapeHtml(vd.nama_lengkap||vd.nis)}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Buka Kunci</button>`:'-';
                    html+=`<tr><td>${escapeHtml(vd.nama_lengkap||'-')}</td><td><span class="violation-badge">${escapeHtml(vd.jenis_pelanggaran||'-')}</span></td><td><span class="badge badge-red">${vd.jumlah||0}</span></td><td>${statusBadge}</td><td>${btn}</td></tr>`;
                });
                html+='</tbody></table></div>';
                if(violEl)violEl.innerHTML=html;
            }
            hideLoader();
            if(mulai&&selesai&&now>=mulai&&now<=selesai){
                _guruControlAutoRefresh=setInterval(()=>{
                    if(document.getElementById('guru-control')&&!document.getElementById('guru-control').classList.contains('hidden')){
                        loadGuruControlRuang();
                    }else{
                        clearInterval(_guruControlAutoRefresh);_guruControlAutoRefresh=null;
                    }
                },60000);
            }
        }catch(e){hideLoader();showToast('Gagal memuat monitor: '+e.message,'error');}
    };

    let _guruUnlockTarget=null;
    window.openGuruUnlockModal=function(nis,nama){
        _guruUnlockTarget={nis,nama};
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
            hideLoader();showToast(`Kunci dibuka untuk ${escapeHtml(nis)}`,'success');
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
                html+=`<tr><td>${escapeHtml(dt.mapel||'-')}</td><td>${escapeHtml(dt.kelas||'-')}</td><td>${dt.jumlah_soal||0}</td><td>${modeBadge}</td><td>${formatWIBShort(dt.timestamp)}</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="openKelolaSoalModal('${d.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Kelola</button><button class="btn btn-danger btn-sm" onclick="deleteSoal('${d.id}')">Hapus</button></td></tr>`;
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
                html+=`<tr><td>${escapeHtml(dt.mapel||'-')}</td><td>${escapeHtml(dt.kelas||'-')}</td><td>${dt.tanggal||'-'}</td><td>${dt.jam_mulai||'-'}</td><td>${dt.durasi||90} mnt</td><td style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" onclick="openEditJadwalModal('${d.id}','${dt.tanggal||''}',${dt.jam||8},${dt.menit||0},'${dt.ampm||'AM'}',${dt.durasi||90})">✎ Edit</button><button class="btn btn-danger btn-sm" onclick="deleteJadwal('${d.id}')">Hapus</button></td></tr>`;
            });
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat jadwal</div>';}
    }
    let _guruNilaiCurrentJadwal=null;
    let _guruNilaiCache=[];
    let _guruNilaiPublished=false;

    async function loadGuruNilaiJadwalFilter(){
        const container=document.getElementById('guruNilaiUlanganList');
        const detail=document.getElementById('guruNilaiDetail');
        if(detail)detail.style.display='none';
        if(!container)return;
        container.style.display='';
        container.innerHTML='<div style="color:var(--text3);font-family:var(--font-mono);font-size:12px;padding:8px">Memuat daftar ulangan...</div>';
        try{
            const snap=await getDocs(query(collection(db,'jadwal'),where('assigned_guru','==',currentUser.nis),where('mode','==','ulangan')));
            const activeJadwalIds=new Set();
            snap.forEach(d=>activeJadwalIds.add(d.id));

            const [nilaiUlSnap, allJadwalSnap]=await Promise.all([
                getDocs(collection(db,'nilai_ulangan')),
                getDocs(collection(db,'jadwal'))
            ]);
            const allExistingJadwalIds=new Set();
            allJadwalSnap.forEach(d=>allExistingJadwalIds.add(d.id));

            const orphanJadwalMap={};
            const processOrphan=(d)=>{
                const dt=d.data();
                const jid=dt.jadwal_id;
                if(!jid)return;
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

            if(hasActive){
                html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">';
                snap.forEach(d=>{
                    const dt=d.data();
                    const isToday=dt.tanggal===today;
                    html+=`<div class="card" style="cursor:pointer;border-color:${isToday?'var(--accent)':'var(--border)'}" onclick="guruSelectNilaiJadwal('${d.id}',false)">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                            <span class="badge ${isToday?'badge-green':'badge-blue'}">${isToday?'Hari Ini':dt.tanggal||'-'}</span>
                            <span class="badge badge-yellow" style="font-size:10px">${escapeHtml(dt.kelas||'-')}</span>
                        </div>
                        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${escapeHtml(dt.mapel||'-')}</div>
                        <div style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${dt.jam_mulai||'-'} | ${dt.durasi||90} mnt</div>
                        <div style="margin-top:12px"><button class="btn btn-primary btn-sm" style="width:100%">Lihat Nilai &rarr;</button></div>
                    </div>`;
                });
                html+='</div>';
            }

            if(hasOrphan){
                html+=`<div style="margin-bottom:12px;padding:10px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius);font-size:12px;font-family:var(--font-mono);color:var(--yellow)">
                    Nilai berikut berasal dari jadwal/soal yang sudah dihapus. Nilai tetap tersimpan dan bisa di-export CSV.
                </div>`;
                html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">';
                Object.entries(orphanJadwalMap).forEach(([jid,info])=>{
                    html+=`<div class="card" style="cursor:pointer;border-color:var(--yellow);" onclick="guruSelectNilaiJadwal('${jid}',true)">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                            <span class="badge badge-yellow"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Jadwal Dihapus</span>
                            <span class="badge badge-yellow" style="font-size:10px">${info.kelas}</span>
                        </div>
                        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${escapeHtml(info.mapel)}</div>
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
                const jSnap=await getDoc(doc(db,'jadwal',jadwalId));
                if(!jSnap.exists()){
                    isOrphan=true;
                } else {
                    jd=jSnap.data();
                    _guruNilaiCurrentJadwal={id:jadwalId,data:jd};
                    const titleEl=document.getElementById('guruNilaiDetailTitle');
                    if(titleEl)titleEl.textContent=`${escapeHtml(jd.mapel)} — ${escapeHtml(jd.kelas)} — ${jd.tanggal||'-'}`;
                }
            }

            const [snap1,snap2]=await Promise.all([
                getDocs(query(collection(db,'nilai_ulangan'),where('jadwal_id','==',jadwalId))),
                getDocs(query(collection(db,'nilai'),where('jadwal_id','==',jadwalId),where('mode','==','ulangan')))
            ]);
            const nilaiMap={};
            snap1.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={id:d.id,...dt};});
            snap2.forEach(d=>{const dt=d.data();if(dt.nis&&!nilaiMap[dt.nis])nilaiMap[dt.nis]={id:d.id,...dt};});
            _guruNilaiCache=Object.values(nilaiMap).sort((a,b)=>(b.nilai_asli??b.nilai??0)-(a.nilai_asli??a.nilai??0));

            if(isOrphan){
                const sample=_guruNilaiCache[0]||{};
                const jadwalInfo={
                    mapel:sample.mapel||sample.mata_pelajaran||'(Mapel tidak diketahui)',
                    kelas:sample.kelas||'-',
                    tanggal:sample.waktu_selesai?String(sample.waktu_selesai).slice(0,10):(sample.tanggal||'-'),
                    deleted:true
                };
                _guruNilaiCurrentJadwal={id:jadwalId,data:jadwalInfo};
                const titleEl=document.getElementById('guruNilaiDetailTitle');
                if(titleEl)titleEl.textContent=`${escapeHtml(jadwalInfo.mapel)} — ${jadwalInfo.kelas} — ${jadwalInfo.tanggal} (Jadwal Dihapus)`;
            }

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
        const sample=_guruNilaiCache[0];
        const totalSoal=(sample.benar||0)+(sample.salah||0)+(sample.kosong||0);
        const pps=totalSoal?hitungPointPerSoal(totalSoal):'-';
        let html='';
        if(isDeleted){
            html+=`<div class="alert alert-warning" style="margin-bottom:12px;font-size:12px">
                <span style="font-family:var(--font-mono)">Catatan: Jadwal/soal asli sudah dihapus. Nilai siswa tetap tersimpan di server dan dapat di-export. Klik <strong>Export CSV</strong> di atas untuk menyimpan data.</span>
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
                <td>${escapeHtml(dt.nis||'-')}</td>
                <td>${escapeHtml(dt.nama_lengkap||'-')}</td>
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
                tanggal:today,
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
        downloadCSV(rows,`nilai_${escapeHtml(jd.mapel||'ulangan')}_${jd.tanggal||'export'}.csv`);
    };
    async function loadGuruNilai(){await loadGuruNilaiJadwalFilter();}

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
                        <span class="badge badge-yellow" style="font-size:10px">${escapeHtml(dt.kelas||'-')}</span>
                    </div>
                    <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:6px">${escapeHtml(dt.mapel||'-')}</div>
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
            if(titleEl)titleEl.textContent=`${escapeHtml(jd.mapel)} — ${escapeHtml(jd.kelas)} — ${jd.tanggal||'-'}`;
            try{
                const pubSnap=await getDoc(doc(db,'settings',`guru_publikasi_ranking_${jadwalId}`));
                if(pubSnap.exists()){
                    const pd=pubSnap.data();
                    if(pd.aktif&&pd.tanggal&&pd.tanggal!==today){
                        await setDoc(doc(db,'settings',`guru_publikasi_ranking_${jadwalId}`),{...pd,aktif:false,auto_hidden:true});
                        _guruRankingPublished=false;
                    }else{
                        _guruRankingPublished=Boolean(pd.aktif);
                    }
                }else{_guruRankingPublished=false;}
            }catch(e){_guruRankingPublished=false;}
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
                    <div class="ranking-name">${escapeHtml(u.nama_lengkap||u.nama||'-')}</div>
                    <div class="ranking-detail">${escapeHtml(u.nis||'-')} | ${escapeHtml(u.kelas||'-')}</div>
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
                tanggal:today,
                updated_at:Timestamp.now()
            });
            _guruRankingPublished=newState;
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
            snap.forEach(d=>{const dt=d.data();const o=document.createElement('option');o.value=d.id;o.textContent=`${escapeHtml(dt.mapel||'-')} — ${escapeHtml(dt.kelas||'-')} — ${dt.tanggal||'-'}`;sel.appendChild(o);});
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
            absent.forEach(s=>{html+=`<tr><td>${s.no_absen||'-'}</td><td>${escapeHtml(s.nama_lengkap||'-')}</td><td>${escapeHtml(s.kelas||'-')}</td></tr>`;});
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
            snap.forEach(d=>{const dt=d.data();html+=`<tr><td>${escapeHtml(dt.tanggal_login||'-')}</td><td>${escapeHtml(dt.device_model||'-')}</td></tr>`;});
            html+='</tbody></table></div>';
            container.innerHTML=html;
        }catch(e){container.innerHTML='<div class="empty-state">Gagal memuat riwayat</div>';}
    }
    async function changeGuruPassword(){
        const old=document.getElementById('guruOldPwd').value;
        const nw=document.getElementById('guruNewPwd').value;
        const cf=document.getElementById('guruConfirmPwd').value;
        if(!old||!nw||!cf){showToast('Semua field wajib diisi','error');return;}
        if(nw.length<6){showToast('Password minimal 6 karakter','error');return;}
        if(nw!==cf){showToast('Password baru tidak cocok','error');return;}
        showLoader('Mengubah password...');
        try{
            await firebaseChangePassword(old,nw);
            hideLoader();showToast('Password berhasil diubah','success');
            document.getElementById('guruOldPwd').value='';
            document.getElementById('guruNewPwd').value='';
            document.getElementById('guruConfirmPwd').value='';
        }catch(e){hideLoader();showToast(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'?'Password lama salah':'Gagal mengubah password','error');}
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
    window.guruSelectNilaiJadwal=window.guruSelectNilaiJadwal;
    window.loadGuruRanking=loadGuruRanking;

    window.openGuruJadwalModal=async function(){
        const today=new Date().toISOString().split('T')[0];
        document.getElementById('guruJadwalMapel').value='';
        if(window.patlasSelectSync) patlasSelectSync(document.getElementById('guruJadwalMapel'));
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
        try{
            const snap=await getDocs(query(collection(db,'users'),where('role','==','siswa')));
            const kelasSet=new Set();
            snap.forEach(d=>{const k=d.data().kelas;if(k)kelasSet.add(k);});
            const kelasList=Array.from(kelasSet).sort((a,b)=>{
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
        }catch(e){
            hideLoader();
            console.error("saveGuruJadwal gagal:",e);
            let msg="Gagal menyimpan jadwal";
            if(e&&e.code==="permission-denied")msg="Gagal menyimpan jadwal: akun Anda tidak punya izin (permission-denied). Cek Firestore Security Rules / App Check di Firebase Console.";
            else if(e&&(e.code==="unavailable"||e.code==="deadline-exceeded"))msg="Gagal menyimpan jadwal: koneksi bermasalah. Coba lagi.";
            else if(e&&e.message)msg="Gagal menyimpan jadwal: "+e.message;
            showToast(msg,"error");
        }
    };

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

    let _kelolaSoalId=null;
    let _kelolaSoalData=null;
    let _kelolaPendingPhotos={};

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
            if(_kelolaSoalData.soal_enc && !_kelolaSoalData.soal){
                const decArr=await decryptSoalData(_kelolaSoalData.soal_enc,soalDocId);
                if(decArr) _kelolaSoalData.soal=decArr;
                // Dokumen lama (v1, kunci global) otomatis ditulis ulang jadi
                // v2 (kunci per-dokumen) begitu guru/admin membukanya di sini.
                await migrateSoalEncV1ToV2(soalDocId,_kelolaSoalData);
            }
            const soalArr=_kelolaSoalData.soal||[];
            titleEl.textContent=`Kelola Soal — ${escapeHtml(_kelolaSoalData.mapel||'-')} (${soalArr.length} Soal)`;
            if(!soalArr.length){container.innerHTML='<div class="empty-state"><div>Tidak ada soal dalam bank ini</div></div>';return;}
            let html='';
            soalArr.forEach((s,i)=>{
                const existingImg=s.foto_url?`<img src="${sanitizeFotoUrl(s.foto_url)}" alt="Foto soal ${i+1}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;object-fit:contain">`: '';
                html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
                    <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Soal ${i+1}</div>
                    <div style="font-size:14px;color:var(--text);margin-bottom:12px;line-height:1.6;white-space:pre-wrap">${escapeHtml(s.pertanyaan||'-')}</div>
                    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
                        ${Object.keys(s.pilihan||{}).filter(l=>s.pilihan[l]).sort().map(l=>`<div style="display:flex;gap:10px;padding:6px 10px;background:var(--surface3);border-radius:6px;font-size:13px"><span style="font-family:var(--font-mono);font-weight:700;color:var(--text3);min-width:20px">${l}.</span><span style="color:var(--text2)">${escapeHtml(s.pilihan[l])}</span></div>`).join('')}
                    </div>
                    <div style="border-top:1px solid var(--border);padding-top:12px">
                        <div style="font-size:12px;font-family:var(--font-mono);color:var(--text3);margin-bottom:8px">FOTO PENDUKUNG SOAL</div>
                        ${existingImg}
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                            <label class="btn btn-outline btn-sm" style="cursor:pointer">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> ${s.foto_url?'Ganti Foto':'Tambah Foto'}
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

    function sanitizeFotoUrl(url){
        if(!url||typeof url!=='string')return '';
        const u=url.trim();
        if(u.startsWith('https://')||u.startsWith('data:image/'))return u;
        return '';
    }
    function escapeHtml(str){
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
            const reEnc=await encryptSoalData(soalArr,_kelolaSoalId);
            if(!reEnc){hideLoader();showToast('Gagal mengenkripsi ulang soal','error');return;}
            await updateDoc(doc(db,'soal',_kelolaSoalId),{soal_enc:reEnc,updated_at:Timestamp.now()});
            _kelolaSoalData={..._kelolaSoalData,soal:soalArr};
            delete _kelolaPendingPhotos[soalIndex];
            hideLoader();
            showToast('Foto dihapus','success');
            await openKelolaSoalModal(_kelolaSoalId);
        }catch(e){hideLoader();showToast('Gagal menghapus foto','error');}
    };

    // ---------------------------------------------------------------------
    // CATATAN KEAMANAN — upload_preset ini "unsigned" (lihat definisi
    // CLOUDINARY_UPLOAD_PRESET di atas), artinya nilainya WAJIB terlihat di
    // client JS supaya browser bisa upload langsung tanpa server. Konsekuensi:
    // siapa pun yang membaca nama preset ini dari JS bisa POST langsung ke
    // endpoint Cloudinary dari luar aplikasi (curl/script), TANPA lewat
    // validasi client di bawah ini sama sekali — jadi validasi di sini hanya
    // mencegah kesalahan pengguna biasa lewat UI, BUKAN proteksi keamanan.
    //
    // Perbaikan yang WAJIB dilakukan di Cloudinary Console (gratis, tidak
    // butuh Blaze/kartu kredit sama sekali — ini di luar Firebase):
    //   Settings → Upload → pilih preset "cbt_upload" → set:
    //     - "Signing Mode": tetap Unsigned (karena tidak ada server), TAPI
    //     - Aktifkan "Allowed formats": batasi ke jpg,png,webp saja
    //     - Aktifkan "Max file size" (misal 5 MB)
    //     - Aktifkan "Max image width/height" kalau perlu
    //     - Pertimbangkan aktifkan "Eager transformations" / moderation
    //       add-on bawaan Cloudinary (ada tier gratis) untuk auto-cek
    //       konten upload
    //     - Set folder tujuan preset ini spesifik (misal "patlas_soal/")
    //       supaya mudah dipantau/dibersihkan terpisah dari resource lain
    //   Ini satu-satunya cara membatasi upload preset unsigned tanpa server;
    //   validasi JS di bawah cuma lapisan UX, bukan pengganti langkah ini.
    // ---------------------------------------------------------------------
    async function uploadToCloudinary(file){
        if(CLOUDINARY_CLOUD_NAME==='YOUR_CLOUD_NAME'||CLOUDINARY_UPLOAD_PRESET==='YOUR_UPLOAD_PRESET'){
            throw new Error('Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di kode.');
        }
        if(!file.type.startsWith('image/')){
            throw new Error('File harus berupa gambar (jpg, png, webp, dst).');
        }
        const MAX_BYTES=5*1024*1024; // 5 MB — samakan dengan limit di Cloudinary preset
        if(file.size>MAX_BYTES){
            throw new Error('Ukuran file terlalu besar (maks 5 MB).');
        }
        // Cek magic bytes (bukan cuma file.type dari browser, yang gampang
        // dipalsu lewat DevTools/extension) supaya UI kita sendiri tidak
        // ikut-ikutan mengirim file yang jelas bukan gambar.
        const isValidImage=await _sniffImageMagicBytes(file);
        if(!isValidImage){
            throw new Error('File tidak terdeteksi sebagai gambar valid (jpg/png/webp/gif).');
        }
        const formData=new FormData();
        formData.append('file',file);
        formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);
        const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:formData});
        if(!res.ok)throw new Error('Upload gagal: '+res.status);
        const data=await res.json();
        return data.secure_url;
    }
    async function _sniffImageMagicBytes(file){
        const buf=new Uint8Array(await file.slice(0,12).arrayBuffer());
        const hex=Array.from(buf).map(b=>b.toString(16).padStart(2,'0')).join('');
        return hex.startsWith('ffd8ff')                          // JPEG
            || hex.startsWith('89504e470d0a1a0a')                // PNG
            || (hex.startsWith('52494646')&&hex.slice(16,24)==='57454250') // WEBP (RIFF....WEBP)
            || hex.startsWith('474946383761') || hex.startsWith('474946383961'); // GIF87a/89a
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
                    const rawUrl=await uploadToCloudinary(file);
                    const url=sanitizeFotoUrl(rawUrl);
                    if(!url)throw new Error("URL foto tidak valid");
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
        const reEncR=await encryptSoalData(soalArr,_kelolaSoalId);
        if(!reEncR){hideLoader();showToast('Gagal mengenkripsi ulang soal','error');return;}
        await updateDoc(doc(db,'soal',_kelolaSoalId),{soal_enc:reEncR,updated_at:Timestamp.now()});
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

    window.openImportAkunModal=function(){
        document.getElementById('importAkunText').value='';
        document.getElementById('importAkunProgress').classList.add('hidden');
        document.getElementById('importAkunResult').classList.add('hidden');
        document.getElementById('importAkunModal').classList.remove('hidden');
    };
    function parseImportLine(line){
        const parts=line.split(',').map(p=>p.trim()).filter(p=>p.length>0);
        if(parts.length<3)return null;
        const role=parts[parts.length-1].toLowerCase();
        if(role==='siswa'&&parts.length>=6){
            const nis=parts[0];
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

        const parsed=[];
        const errors=[];
        const kelasAbsenMap={};
        lines.forEach((line,i)=>{
            const obj=parseImportLine(line);
            if(!obj){errors.push(`Baris ${i+1}: format tidak valid — "${escapeHtml(line.slice(0,60))}"`);return;}

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
        const generatedCreds=[];

        let existSiswa=[];
        try{
            const ss=await getDocs(query(collection(db,'users'),where('role','==','siswa')));
            ss.forEach(d=>{existSiswa.push({...d.data(),id:d.id});});
        }catch(e){}

        const BATCH_SIZE=100;
        for(let i=0;i<parsed.length;i++){
            const u=parsed[i];
            progBar.style.width=Math.round((i+1)/parsed.length*100)+'%';
            progStatus.textContent=`Memproses ${i+1}/${parsed.length}: ${escapeHtml(u.nama_lengkap)}`;
            try{
                const existing=await resolveNisRole(u.nis);
                if(existing){skip++;continue;}
                if(u.role==='siswa'){
                    const dup=existSiswa.find(e=>e.kelas===u.kelas&&parseInt(e.no_absen||0)===u.no_absen);
                    if(dup){fail++;errors.push(`NIS/NIP ${escapeHtml(u.nis)}: No absen ${u.no_absen} di kelas ${escapeHtml(u.kelas)} sudah ada`);continue;}
                }
                const tempPwd=generateSecureTempPassword();
                let uid;
                try{
                    uid=await createAuthAccount(u.nis,tempPwd);
                }catch(authErr){
                    fail++;errors.push(`NIS/NIP ${escapeHtml(u.nis)}: ${authErr.code==='auth/email-already-in-use'?'akun sudah pernah dibuat sebelumnya':(authErr.message||'gagal membuat akun')}`);continue;
                }
                const data={nis:u.nis,uid,nama_lengkap:u.nama_lengkap,role:u.role,created_at:Timestamp.now(),must_change_password:true,temp_password:tempPwd};
                if(u.role==='siswa'){data.kelas=u.kelas;data.no_absen=u.no_absen;data.ruang=u.ruang;}
                else{data.kelas=u.role;}
                await setDoc(doc(db,'users',u.nis),data);
                await setDoc(doc(db,'user_roles',u.nis),{role:u.role});
                if(u.role==='siswa')existSiswa.push({...data,id:u.nis});
                generatedCreds.push({nis:u.nis,nama_lengkap:u.nama_lengkap,password:tempPwd});
                success++;
            }catch(e){fail++;errors.push(`NIS/NIP ${escapeHtml(u.nis)}: ${e.message||'error'}`);}

            if(i%50===49)await new Promise(r=>setTimeout(r,10));
        }
        await closeSecondaryAuth();
        progBar.style.width='100%';
        progStatus.textContent='Selesai!';
        btn.disabled=false;
        resultEl.classList.remove('hidden');
        resultEl.innerHTML=`<div class="alert ${fail?'alert-warning':'alert-success'}">
            <strong>Import selesai!</strong><br>
            <span style="color:var(--green)">✓</span> Berhasil: ${success} akun<br>
            ⏭ Dilewati (sudah ada): ${skip} akun<br>
            <span style="color:var(--red)">✗</span> Gagal: ${fail} akun
            ${errors.length?'<br><br><strong>Detail error:</strong><br>'+errors.slice(0,5).map(e=>`<div style="font-size:11px">${e}</div>`).join('')+(errors.length>5?`<div style="font-size:11px">... dan ${errors.length-5} lainnya</div>`:''):''}
            ${generatedCreds.length?'<br><br><button class="btn btn-primary btn-sm" onclick="downloadImportedCreds()">Unduh Daftar Password (sekali saja, tidak disimpan)</button>':''}
        </div>`;
        window.__patlasLastImportCreds=generatedCreds;
        if(success>0)await loadAdminUserList();
    };
    window.downloadImportedCreds=function(){
        const creds=window.__patlasLastImportCreds||[];
        if(!creds.length){showToast('Tidak ada data untuk diunduh','error');return;}
        let txt='NIS/NIP,Nama Lengkap,Password Sementara\n';
        creds.forEach(c=>{txt+=`${c.nis},"${(c.nama_lengkap||'').replace(/"/g,'""')}",${c.password}\n`;});
        const blob=new Blob([txt],{type:'text/csv'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;a.download='patlas_password_import_'+Date.now()+'.csv';
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('File terunduh. Bagikan lewat jalur aman lalu hapus file ini.','info');
    };
    window.generateImportPrompt=function(){
        const promptEl=document.getElementById('importAiPromptText');
        promptEl.textContent=`Kamu adalah asisten yang membantu memformat data akun siswa untuk sistem CBT (Computer Based Test) sekolah.\n\nTUGASMU: Baca data yang saya berikan (bisa dari file Excel, tabel Word, teks acak, atau format apapun), lalu konversi SELURUHNYA ke format teks yang bisa langsung di-paste ke sistem.\n\nFORMAT OUTPUT YANG HARUS DIIKUTI:\n\nUntuk siswa:\nnis, nama_lengkap, kelas, no_absen, no_ruang, siswa\n\nUntuk panitia:\nnis, nama_lengkap, panitia\n\nUntuk guru:\nnis, nama_lengkap, guru\n\nUntuk admin:\nnis, nama_lengkap, admin\n\nATURAN KELAS (ikuti persis):\n- Kelas 10: X.1, X.2, X.3, X.4 (bukan \"10A\" atau \"Kelas X1\")\n- Kelas 11 IPA: XI IPA.1, XI IPA.2, XI IPA.3 (bukan \"11 IPA1\")\n- Kelas 11 IPS: XI IPS.1, XI IPS.2, XI IPS.3 (bukan \"11IPS1\")\n- Kelas 12 IPA: XII IPA.1, XII IPA.2 dll\n- Kelas 12 IPS: XII IPS.1, XII IPS.2 dll\n- Jika tidak ada jurusan (X): gunakan X.1, X.2 dll\n\nATURAN LAIN:\n- no_absen harus angka, unik per kelas (tidak boleh ada dua siswa dengan absen sama di kelas yang sama)\n- no_ruang hanya angka (1-99)\n- NIS boleh angka panjang berapapun\n- Nama tidak disingkat, tulis lengkap sesuai data\n\nATURAN OUTPUT:\n- OUTPUT HANYA berisi baris-baris data, TIDAK ADA kalimat pembuka, penjelasan, catatan, atau basa-basi\n- TIDAK ADA header tabel\n- TIDAK ADA penomoran baris\n- TIDAK ADA markdown (tidak ada **, tidak ada \`\`\`)\n- Satu akun = satu baris\n- Jika ada data yang ambigu atau tidak lengkap, gunakan nilai default yang masuk akal\n- Jika ada duplikasi no absen dalam satu kelas, tambahkan nomor unik secara berurutan\n\nCONTOH OUTPUT:\n14551563624, Trio Lesnar Poe, X.2, 12, 1, siswa\n76543673626, Brock Lesnar, XI IPA.1, 11, 5, siswa\n74647827832, Obama Marack, XI IPS.3, 1, 1, siswa\n11, Leonardo Boim, panitia\n162, Joko Suli, guru\n\nSekarang proses data berikut ini:`;
        document.getElementById('importPromptModal').classList.remove('hidden');
    };
    window.copyImportPrompt=function(){
        const text=document.getElementById('importAiPromptText').textContent;
        navigator.clipboard.writeText(text).then(()=>showToast('Prompt disalin!','success')).catch(()=>showToast('Gagal menyalin','error'));
    };
    window.generateImportPrompt=generateImportPrompt;

    const _origLoadAdminPage=loadAdminPage;
    async function loadAdminPagePatched(){
        await _origLoadAdminPage();
        await loadAppMode();
        initNavScrollBtns('admin');
    }

    const _origLoadPanitiaPage=loadPanitiaPage;
    async function loadPanitiaPagePatched(){
        await _origLoadPanitiaPage();
        initNavScrollBtns('panitia');
    }

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

    const _origOpenSoalModal=window.openSoalModal;
    window.openSoalModal=async function(mode){
        if(_origOpenSoalModal)await _origOpenSoalModal();
        window._soalMode=mode||'ujian';
    };

(function(){
    function isSiswaExamActive(){
        const ep=document.getElementById('examPage');
        return ep&&!ep.classList.contains('hidden')&&document.body.classList.contains('exam-mode');
    }
    function blockDevTools(){
        if(!isSiswaExamActive())return;
        const threshold=160;
        if(window.outerWidth-window.innerWidth>threshold||window.outerHeight-window.innerHeight>threshold){
        document.body.innerHTML="Access Denied";
        }
    }
    setInterval(blockDevTools,1000);
    document.addEventListener("keydown",function(e){
        if(!isSiswaExamActive())return;
        if(e.key==="F12"||(e.ctrlKey&&e.shiftKey&&["I","J","C"].includes(e.key))||(e.ctrlKey&&e.key==="U")){
        e.preventDefault();
        document.body.innerHTML="Blocked";
        }
    });
    document.addEventListener("contextmenu",function(e){
        if(isSiswaExamActive())e.preventDefault();
    });
    })();

(function(){
    let devtoolsOpen=false;
    const element=new Image();
    Object.defineProperty(element,"id",{get:function(){
        if(document.body.classList.contains('exam-mode')){
            devtoolsOpen=true;document.body.innerHTML="Detected";
        }
    }});
    setInterval(function(){
        devtoolsOpen=false;
        if(document.body.classList.contains('exam-mode')){
            console.log(element);
            if(devtoolsOpen){document.body.innerHTML="Blocked";}
        }
    },1000);
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
            showToast(`Peringatan: Jangan berpindah tab/jendela saat ujian! (${blurCount}x)`, 'error');
          }
        }
      });

      document.addEventListener('visibilitychange', function() {
        const examPage = document.getElementById('examPage');
        if (!examPage || !examPage.classList.contains('active')) return;

        if (document.hidden) {

          console.warn('[PATLAS] Tab disembunyikan saat ujian');
          if (typeof showToast === 'function') {
            showToast('Tab berpindah terdeteksi! Aktivitas ini dicatat.', 'error');
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

          if(typeof recordViolation === 'function' && typeof currentUser !== 'undefined' && currentUser){
            var label = method==='BACK_BUTTON'?'Tombol kembali ditekan':
                        method==='APP_MINIMIZED'?'Aplikasi diminimize':
                        'Keluar aplikasi ('+method+')';
            recordViolation(label, true);
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

    window.isApkContext=function(){
    if(window.__PATLAS_IS_APK__===true)return true;
    if(typeof PatlasAndroid!=='undefined')return true;
    return false;
    };

    (function applyiOSFixes(){
      const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||
        (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      if(!isIOS)return;
      function setVh(){
        document.documentElement.style.setProperty('--vh',(window.innerHeight*0.01)+'px');
      }
      setVh();
      window.addEventListener('resize',setVh);
      window.addEventListener('orientationchange',function(){setTimeout(setVh,200);});
      const s=document.createElement('style');
      s.textContent=`
        .page{min-height:calc(var(--vh,1vh)*100)!important;}
        #examPage{height:calc(var(--vh,1vh)*100)!important;}
        input,select,textarea{font-size:max(16px,1em)!important;}
        body.exam-mode #examPage .question-area{
          -webkit-overflow-scrolling:touch!important;
          overflow-y:scroll!important;
        }
        .option-item{touch-action:manipulation!important;-webkit-tap-highlight-color:rgba(79,142,247,0.15);}
        .exam-header{padding-top:max(14px,env(safe-area-inset-top,14px));}
        .home-wrap{padding-bottom:max(48px,calc(48px + env(safe-area-inset-bottom,0px)));}
      `;
      document.head.appendChild(s);
      window.addEventListener('focusin',function(e){
        if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'){
          setTimeout(function(){e.target.scrollIntoView({behavior:'smooth',block:'center'});},300);
        }
      });
    })();

    function fixExamScroll(){
      const qa=document.getElementById('questionAreaScroll')||document.querySelector('#examPage .question-area');
      if(!qa)return;
      qa.style.overflowY='scroll';
      qa.style.webkitOverflowScrolling='touch';
      qa.style.overscrollBehavior='contain';
      qa.style.touchAction='pan-y pinch-zoom';
      qa.style.pointerEvents='auto';
      qa.style.flex='1';
      qa.style.minHeight='0';
      qa.style.position='relative';
      qa.style.webkitTransform='translate3d(0,0,0)';
      qa.style.transform='translate3d(0,0,0)';
      qa.style.paddingBottom='max(16px,env(safe-area-inset-bottom,16px))';

      void qa.offsetHeight;
      const qn=document.getElementById('questionNav');
      if(qn){
        qn.style.touchAction='pan-x';
        qn.style.overflowX='auto';
        qn.style.overflowY='hidden';
        qn.style.webkitOverflowScrolling='touch';
        qn.style.flexShrink='0';
      }

      if(!qa._touchFixed){
        qa._touchFixed=true;
        qa.addEventListener('touchend',function(e){
          const item=e.target.closest('.option-item');
          if(!item)return;
          const dy=Math.abs((e.changedTouches[0].clientY)-(e._startY||0));
          if(dy<10){
            e.preventDefault();
            item.click();
          }
        },{passive:false});
        qa.addEventListener('touchstart',function(e){
          const item=e.target.closest('.option-item');
          if(item)e._startY=e.touches[0].clientY;
        },{passive:true});
      }
    }

    (function(){
      const ep=document.getElementById('examPage');
      if(!ep)return;
      new MutationObserver(function(muts){
        muts.forEach(function(m){
          if(m.attributeName==='class'&&ep.classList.contains('active')){
            setTimeout(fixExamScroll,100);
            setTimeout(fixExamScroll,600);
          }
        });
      }).observe(ep,{attributes:true,attributeFilter:['class']});
    })();

    const _TOGGLE_CARD=`
      <div class="card" id="siswaLoginModeCard" style="border:2px solid var(--accent)">
        <div class="card-title" style="display:flex;align-items:center;gap:10px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:rgba(79,142,247,0.12);border:1px solid rgba(79,142,247,0.25);border-radius:8px;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span> Akses Login Siswa
        </div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.6">
          Atur apakah siswa boleh login melalui <strong>website browser</strong> atau hanya melalui <strong>Aplikasi (APK)</strong>.
          Jika dinonaktifkan, siswa yang login dari website akan diblokir.
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--surface2);border-radius:var(--radius);border:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:14px">Siswa boleh login di Website</div>
            <div id="siswaLoginModeDesc" style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">Memuat...</div>
          </div>
          <button id="siswaLoginModeToggle" onclick="window.toggleSiswaWebLogin()"
            style="position:relative;width:52px;height:28px;border-radius:14px;border:none;cursor:pointer;transition:background 0.25s;flex-shrink:0;outline:none;background:var(--text3)">
            <span id="siswaLoginModeThumb" style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left 0.25s;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></span>
          </button>
        </div>
        <div id="siswaLoginModeStatus" style="margin-top:10px;font-size:11px;font-family:var(--font-mono);color:var(--text3)"></div>
      </div>
    `;

    function _updateToggleUI(allowWeb){
      document.querySelectorAll('#siswaLoginModeToggle').forEach(function(btn){
        btn.style.background=allowWeb?'var(--green)':'var(--red)';
      });
      document.querySelectorAll('#siswaLoginModeThumb').forEach(function(thumb){
        thumb.style.left=allowWeb?'27px':'3px';
      });
      document.querySelectorAll('#siswaLoginModeDesc').forEach(function(el){
        el.textContent=allowWeb
          ?'AKTIF — Siswa dapat login dari website maupun APK'
          :'NONAKTIF — Siswa hanya dapat login dari Aplikasi (APK)';
      });
      document.querySelectorAll('#siswaLoginModeStatus').forEach(function(el){
        el.textContent=allowWeb
          ?'✓ Mode bebas: website & APK sama-sama diizinkan'
          :'! Mode ketat: hanya APK yang diizinkan untuk siswa';
        el.style.color=allowWeb?'var(--green)':'var(--yellow)';
      });
    }

    async function _loadToggleState(){
      try{
        const snap=await getDoc(doc(db,'settings','siswa_login_mode'));
        const v=snap.exists()?(snap.data().allow_web!==false):true;
        _updateToggleUI(v);
      }catch(e){_updateToggleUI(true);}
    }

    function _injectToggleCards(){
      ['panitia-settings','guru-settings','admin-settings'].forEach(function(id){
        const tab=document.getElementById(id);
        if(!tab||tab.querySelector('#siswaLoginModeCard'))return;
        const grid=tab.querySelector('.settings-grid');
        if(!grid)return;
        const div=document.createElement('div');
        div.innerHTML=_TOGGLE_CARD;
        grid.insertBefore(div.firstElementChild,grid.firstChild);
        _loadToggleState();
      });
    }

    window.toggleSiswaWebLogin=async function(){
      try{
        const snap=await getDoc(doc(db,'settings','siswa_login_mode'));
        const cur=snap.exists()?(snap.data().allow_web!==false):true;
        const nv=!cur;
        await setDoc(doc(db,'settings','siswa_login_mode'),{allow_web:nv});
        _updateToggleUI(nv);
        showToast(nv?'Siswa sekarang boleh login di website':'Siswa hanya boleh login di APK',nv?'success':'warning');
      }catch(e){showToast('Gagal menyimpan pengaturan','error');}
    };

    new MutationObserver(function(){_injectToggleCards();}).observe(document.body,{childList:true,subtree:true});
    _injectToggleCards();

  } catch(e) {
    console.error('[PATLAS] Init error:', e);
    document.body.innerHTML = '<div style="font-family:monospace;color:#ef4444;padding:40px;text-align:center"><h2>Gagal memuat</h2><pre>' + e + '</pre></div>';
  }
})();
