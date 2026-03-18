/**
 * Instagram Data Fetcher
 * Instagram'in dahili GraphQL API'sini kullanarak
 * takipci ve takip edilen listelerini ceker.
 */

const https = require("https");

const FOLLOWING_HASH = "d04b0a864b4b54837c0d870b0e77e076";
const FOLLOWERS_HASH = "c76146de99bb02f6415203be841dd25a";

// ── Gender / Business Classifier ──
const maleNames = new Set(["ahmet","mehmet","mustafa","ali","hasan","huseyin","ibrahim","ismail","osman","murat","omer","yusuf","mahmut","halil","suleyman","abdullah","ramazan","recep","kadir","yasin","emre","burak","serkan","fatih","kemal","cem","can","berk","tolga","sinan","selim","oguz","volkan","baris","tuna","arda","kaan","onur","furkan","umut","eren","enes","baran","alp","taha","ilker","caner","ugur","gokhan","erkan","okan","adem","salih","bilal","sedat","mesut","ferhat","cengiz","yilmaz","metin","bayram","bekir","ilhan","cemil","hikmet","turan","celal","hamza","emin","sefa","erdem","mert","koray","serdar","yigit","batuhan","berkay","eray","doruk","atakan","tayfun","bulent","necati","orhan","nihat","samet","taner","zafer","vedat","remzi","sahin","bahadir","alican","polat","deniz"]);
const femaleNames = new Set(["ayse","fatma","emine","hatice","zeynep","elif","merve","busra","esra","derya","seda","gamze","gul","gulsen","havva","hanife","hulya","leyla","mine","muge","nur","nuray","ozlem","pinar","rabia","sevgi","sibel","sultan","serife","tulay","yasemin","zehra","zuleyha","asli","basak","burcu","ceren","dilara","ebru","eda","gizem","hilal","irmak","kubra","melike","naz","neslihan","nihal","oya","ozge","pelin","selin","simge","seyma","tugba","yagmur","beril","cansu","damla","duygu","irem","lale","nisa","ruya","senem","sinem","sude","melis","buse","beyza","ada","azra","defne","ecrin","nehir","nurgul","sevda","songul","aylin","fulya","ilknur","serpil","dilek","filiz","nurcan","selma","aynur","hacer","cemile","fadime","nermin","serap"]);
const bizWords = ["dijital","ajans","agency","media","medya","shop","store","market","emlak","mobilya","furniture","home","design","tasarim","reklam","danisma","hukuk","avukat","doktor","dr.","klinik","cafe","restaurant","hotel","otel","turizm","insaat","gayrimenkul","sigorta","nakliyat","matbaa","foto","video","yazilim","software","teknoloji","tech","web","seo","kurumsal","holding","tic","ltd","org","vakf","dernek","spor","kulub","muhendis","mimari","elektrik","enerji","gida","tarim","tekstil","moda","butik","kozmetik","guzellik","kuafor","oto","pet","eczane","optik","cicek","pastane","firin","lokanta","kitap","muzik","sanat","galeri","atolye","studio","akademi","egitim","kurs"];

function classifyGender(fullName, username) {
  const n = (fullName || "").toLowerCase().replace(/[^a-zçğıöşü ]/g, " ").trim();
  const u = (username || "").toLowerCase();
  const all = n + " " + u;
  if (bizWords.some((w) => all.includes(w))) return "business";
  const first = n.split(/\s+/)[0];
  if (maleNames.has(first)) return "male";
  if (femaleNames.has(first)) return "female";
  return "unknown";
}

// ── Instagram'a Login ──
async function instagramLogin(username, password) {
  const loginUrl = "https://www.instagram.com/accounts/login/ajax/";

  // Once ana sayfadan csrftoken al
  const csrfToken = await getCsrfToken();

  const postData = `username=${encodeURIComponent(username)}&enc_password=#PWD_INSTAGRAM_BROWSER:0:${Math.floor(Date.now() / 1000)}:${password}&queryParams={}&optIntoOneTap=false`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "www.instagram.com",
      path: "/accounts/login/ajax/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/accounts/login/",
        Cookie: `csrftoken=${csrfToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.authenticated) {
            // Session cookie'lerini al
            const cookies = (res.headers["set-cookie"] || []).join("; ");
            const sessionId = cookies.match(/sessionid=([^;]+)/)?.[1];
            const csrf = cookies.match(/csrftoken=([^;]+)/)?.[1] || csrfToken;
            const userId = json.userId;
            resolve({ sessionId, csrfToken: csrf, userId, cookies });
          } else {
            reject(new Error(json.message || "Giris basarisiz. Kullanici adi veya sifre hatali."));
          }
        } catch (e) {
          reject(new Error("Instagram yanit islenemedi"));
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// ── CSRF Token Al ──
function getCsrfToken() {
  return new Promise((resolve, reject) => {
    https.get("https://www.instagram.com/accounts/login/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }, (res) => {
      const cookies = (res.headers["set-cookie"] || []).join("; ");
      const csrf = cookies.match(/csrftoken=([^;]+)/)?.[1];
      if (csrf) resolve(csrf);
      else reject(new Error("CSRF token alinamadi"));
      res.resume(); // drain
    }).on("error", reject);
  });
}

// ── Kullanici ID Al ──
async function getUserId(username, session) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: {
        "X-CSRFToken": session.csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Cookie: `sessionid=${session.sessionId}; csrftoken=${session.csrfToken}`,
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const user = json.data?.user;
          if (user) resolve({ id: user.id, username: user.username, fullName: user.full_name, followers: user.edge_followed_by?.count, following: user.edge_follow?.count });
          else reject(new Error("Kullanici bulunamadi"));
        } catch (e) { reject(new Error("Profil bilgisi alinamadi")); }
      });
    }).on("error", reject);
  });
}

// ── Takipci / Takip Listesini Cek ──
async function fetchList(userId, queryHash, edgeName, session, onProgress) {
  const users = [];
  let hasNext = true;
  let cursor = null;
  let page = 0;

  while (hasNext) {
    const variables = JSON.stringify({
      id: userId, include_reel: false, fetch_mutual: false, first: 50,
      ...(cursor ? { after: cursor } : {}),
    });
    const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(variables)}`;

    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          "X-CSRFToken": session.csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Cookie: `sessionid=${session.sessionId}; csrftoken=${session.csrfToken}`,
        },
      }, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error("API yaniti islenemedi")); }
        });
      }).on("error", reject);
    });

    const edge = data.data?.user?.[edgeName];
    if (!edge) break;

    for (const e of edge.edges) {
      users.push({
        username: e.node.username,
        fullName: e.node.full_name,
        isVerified: e.node.is_verified,
        isPrivate: e.node.is_private,
      });
    }

    hasNext = edge.page_info.has_next_page;
    cursor = edge.page_info.end_cursor;
    page++;

    if (onProgress) onProgress(users.length);

    // Rate limit - her istekten sonra kisa bekleme
    await new Promise((r) => setTimeout(r, 400));
  }

  // Deduplicate
  const seen = new Set();
  return users.filter((u) => {
    if (seen.has(u.username)) return false;
    seen.add(u.username);
    return true;
  });
}

// ── Ana Analiz Fonksiyonu ──
async function analyzeAccount(username, password, onProgress) {
  // 1. Login
  onProgress?.({ step: "login", message: "Instagram'a giriliyor..." });
  const session = await instagramLogin(username, password);

  // 2. Profil bilgisi
  onProgress?.({ step: "profile", message: "Profil bilgileri aliniyor..." });
  const profile = await getUserId(username, session);

  // 3. Following listesi
  onProgress?.({ step: "following", message: "Takip edilen listesi cekiliyor...", total: profile.following });
  const following = await fetchList(profile.id, FOLLOWING_HASH, "edge_follow", session, (count) => {
    onProgress?.({ step: "following", message: `Takip edilenler: ${count}/${profile.following}`, count, total: profile.following });
  });

  // 4. Followers listesi
  onProgress?.({ step: "followers", message: "Takipci listesi cekiliyor...", total: profile.followers });
  const followers = await fetchList(profile.id, FOLLOWERS_HASH, "edge_followed_by", session, (count) => {
    onProgress?.({ step: "followers", message: `Takipciler: ${count}/${profile.followers}`, count, total: profile.followers });
  });

  // 5. Analiz
  onProgress?.({ step: "analyze", message: "Analiz yapiliyor..." });

  const followingSet = new Set(following.map((u) => u.username));
  const followersSet = new Set(followers.map((u) => u.username));

  const fmnfb = followers.filter((u) => !followingSet.has(u.username)).map((u) => u.username);
  const ifnfm = following.filter((u) => !followersSet.has(u.username)).map((u) => u.username);
  const mutual = following.filter((u) => followersSet.has(u.username)).map((u) => u.username);

  // Gender analizi
  const gender = { male: 0, female: 0, business: 0, unknown: 0 };
  following.forEach((u) => {
    gender[classifyGender(u.fullName, u.username)]++;
  });

  onProgress?.({ step: "done", message: "Tamamlandi!" });

  return {
    igUsername: profile.username,
    igUserId: profile.id,
    igFullName: profile.fullName,
    totalFollowers: followers.length,
    totalFollowing: following.length,
    mutual: mutual.length,
    fmnfbCount: fmnfb.length,
    ifnfmCount: ifnfm.length,
    fmnfbList: fmnfb,
    ifnfmList: ifnfm,
    mutualList: mutual,
    gender,
  };
}

module.exports = { analyzeAccount, classifyGender };
