const AppConfig = {
  AUTH_EMAIL_DOMAIN: "auth.patsec.local",
  PLATFORM_TAG: "web",
  SCHOOL_NAME_FALLBACK: "SMA Negeri 14 Depok",
  SCHOOL_ADDRESS: "Jl. Buni Raya, Kelurahan Beji, Kecamatan Beji, Kota Depok, Jawa Barat",
  SCHOOL_PHONE: "0852-8074-2225",
  SCHOOL_EMAIL: "sman14depok@gmail.com",
  SCHOOL_WEBSITE: "https://sman14depok.sch.id",
  SCHOOL_INSTAGRAM_HANDLE: "@sman14depok",
  SCHOOL_INSTAGRAM_URL: "https://www.instagram.com/sman14depok",
  OSIS_INSTAGRAM_HANDLE: "@mpos.smanpathlas",
  OSIS_INSTAGRAM_URL: "https://www.instagram.com/mpos.smanpathlas",
  DEVELOPER_NAME: "Raffael Putra Hermawan",
  DEVELOPER_PORTFOLIO_URL: "https://raffaelhub.my.id",
  CLOUDINARY_CLOUD_NAME: "dasyz9xho",
  CLOUDINARY_UPLOAD_PRESET: "patsec_unsigned",
  DEFAULT_PASSWORD_SISWA: "141414",
  DEFAULT_PASSWORD_STAFF: "121212",

  syntheticEmail(nisOrNip) {
    return nisOrNip.trim().toLowerCase() + "@" + this.AUTH_EMAIL_DOMAIN;
  }
};

const AuthRepository = (() => {
  function fb() {
    return window.PatSecFirebase;
  }

  async function resolveUsername(usernameRaw) {
    const { db, doc, getDoc } = fb();
    const key = usernameRaw.trim().toLowerCase();
    let snap;
    try {
      snap = await getDoc(doc(db, "usernames", key));
    } catch (e) {
      throw { code: "NETWORK_ERROR" };
    }
    if (!snap.exists()) throw { code: "USER_NOT_FOUND" };
    const nisNip = snap.data().nisNip;
    if (!nisNip) throw { code: "USER_NOT_FOUND" };
    return nisNip;
  }

  async function checkPlatformAccessAllowed() {
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "system_config", "access"));
      if (snap.exists()) {
        const webEnabled = snap.data().webLoginEnabled;
        if (webEnabled === false) throw { code: "LOGIN_DISABLED_PLATFORM" };
      }
    } catch (e) {
      if (e && e.code === "LOGIN_DISABLED_PLATFORM") throw e;
      // Config unreadable: fail open so setup issues don't lock everyone out.
    }
  }

  function collectDeviceContext() {
    return {
      deviceModel: navigator.userAgent.slice(0, 120),
      androidVersion: "Web/" + (navigator.userAgentData?.platform || navigator.platform || "unknown"),
      platform: AppConfig.PLATFORM_TAG,
      ipAddress: null,
      timestamp: new Date().toISOString().slice(0, 19),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  async function logLoginHistory(uid) {
    const { db, doc, setDoc, collection } = fb();
    try {
      const ctx = collectDeviceContext();
      const ref = doc(collection(db, "users", uid, "login_history"));
      await setDoc(ref, ctx);
    } catch (e) {
      // Non-fatal: login should not fail just because history logging failed.
    }
  }

  async function login(identifierType, identifierRaw, password) {
    const { auth, signInWithEmailAndPassword, doc, getDoc } = fb();

    const nisNip = identifierType === "username"
      ? await resolveUsername(identifierRaw)
      : identifierRaw.trim();

    await checkPlatformAccessAllowed();

    const email = AppConfig.syntheticEmail(nisNip);

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
        throw { code: "USER_NOT_FOUND" };
      }
      if (e.code === "auth/wrong-password") {
        throw { code: "WRONG_PASSWORD" };
      }
      if (e.code === "auth/network-request-failed") {
        throw { code: "NETWORK_ERROR" };
      }
      throw { code: "UNKNOWN_ERROR" };
    }

    const uid = userCredential.user.uid;

    let profileSnap;
    try {
      profileSnap = await getDoc(doc(fb().db, "users", uid));
    } catch (e) {
      throw { code: "NETWORK_ERROR" };
    }

    if (!profileSnap.exists()) {
      await fb().signOut(auth);
      throw { code: "USER_NOT_FOUND" };
    }

    const data = profileSnap.data();
    if (data.disabled === true) {
      await fb().signOut(auth);
      throw { code: "ACCOUNT_DISABLED" };
    }

    logLoginHistory(uid);

    return {
      uid,
      fullName: data.fullName || "",
      role: data.role || "siswa",
      kelas: data.kelas || null,
      nisNip: data.nisNip || nisNip,
      noAbsen: data.noAbsen ?? null,
      avgScore: data.avgScore ?? null,
      avgScorePublished: data.avgScorePublished || false
    };
  }

  function logout() {
    return fb().signOut(fb().auth);
  }

  return { login, logout, resolveUsername };
})();
