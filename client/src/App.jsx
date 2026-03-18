import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const C = {
  blue: "#3B82F6", green: "#10B981", orange: "#F59E0B", red: "#EF4444",
  purple: "#8B5CF6", pink: "#EC4899", cyan: "#06B6D4", slate: "#64748B",
  ig1: "#E1306C", ig2: "#F77737", ig3: "#FCAF45", ig4: "#833AB4",
};
const PAGE = 40;
const BRAND = "Balp Instagram Analiz";

/* ── Gender / Business Classifier ── */
const maleNames = new Set(["ahmet","mehmet","mustafa","ali","hasan","huseyin","ibrahim","ismail","osman","murat","omer","yusuf","mahmut","halil","suleyman","abdullah","ramazan","recep","kadir","yasin","emre","burak","serkan","fatih","kemal","cem","can","berk","tolga","sinan","selim","oguz","volkan","baris","tuna","arda","kaan","onur","furkan","umut","eren","enes","baran","alp","taha","ilker","caner","ugur","gokhan","erkan","okan","adem","salih","bilal","sedat","mesut","ferhat","cengiz","yilmaz","metin","bayram","bekir","ilhan","cemil","hikmet","turan","celal","hamza","emin","sefa","erdem","mert","koray","serdar","yigit","batuhan","berkay","eray","doruk","atakan","tayfun","bulent","necati","orhan","nihat","samet","taner","zafer","vedat","remzi","sahin","bahadir","alican","polat","deniz"]);
const femaleNames = new Set(["ayse","fatma","emine","hatice","zeynep","elif","merve","busra","esra","derya","seda","gamze","gul","gulsen","havva","hanife","hulya","leyla","mine","muge","nur","nuray","ozlem","pinar","rabia","sevgi","sibel","sultan","serife","tulay","yasemin","zehra","zuleyha","asli","basak","burcu","ceren","dilara","ebru","eda","gizem","hilal","irmak","kubra","melike","naz","neslihan","nihal","oya","ozge","pelin","selin","simge","seyma","tugba","yagmur","beril","cansu","damla","duygu","irem","lale","nisa","ruya","senem","sinem","sude","melis","buse","beyza","ada","azra","defne","ecrin","nehir","nurgul","sevda","songul","aylin","fulya","ilknur","serpil","dilek","filiz","nurcan","selma","aynur","hacer","cemile","fadime","nermin","serap"]);
const bizWords = ["dijital","ajans","agency","media","medya","shop","store","market","emlak","mobilya","furniture","home","design","tasarim","reklam","danisma","hukuk","avukat","doktor","dr.","klinik","cafe","restaurant","hotel","otel","turizm","insaat","gayrimenkul","sigorta","nakliyat","matbaa","foto","video","yazilim","software","teknoloji","tech","web","seo","kurumsal","holding","tic","ltd","org","vakf","dernek","spor","kulub","muhendis","mimari","elektrik","enerji","gida","tarim","tekstil","moda","butik","kozmetik","guzellik","kuafor","oto","pet","eczane","optik","cicek","pastane","firin","lokanta","kitap","muzik","sanat","galeri","atolye","studio","akademi","egitim","kurs"];
function classify(n, u) {
  const nm = (n||"").toLowerCase().replace(/[^a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc ]/g," ").trim();
  const un = (u||"").toLowerCase();
  if (bizWords.some(w => (nm+" "+un).includes(w))) return "business";
  const f = nm.split(/\s+/)[0];
  if (maleNames.has(f)) return "male";
  if (femaleNames.has(f)) return "female";
  return "unknown";
}

function analyzeData(jsonData) {
  let following=[], followers=[];
  if (jsonData.followingWithNames) following = jsonData.followingWithNames.map(x=>({u:x.u,n:x.n}));
  else if (jsonData.relationships_following) following = jsonData.relationships_following.map(x=>({u:x.string_list_data?.[0]?.value||"",n:""}));
  if (jsonData.fmnfb && jsonData.ifnfm && jsonData.mutual) {
    if (!jsonData.followingWithNames) following = [...jsonData.ifnfm,...jsonData.mutual].map(u=>({u,n:""}));
    followers = [...jsonData.fmnfb,...jsonData.mutual].map(u=>({u,n:""}));
  }
  if (jsonData.relationships_followers) followers = jsonData.relationships_followers.map(x=>({u:x.string_list_data?.[0]?.value||"",n:""}));
  const fgSet = new Set(following.map(x=>x.u)), frSet = new Set(followers.map(x=>x.u));
  const fmnfb = followers.filter(x=>!fgSet.has(x.u)).map(x=>x.u);
  const ifnfm = following.filter(x=>!frSet.has(x.u)).map(x=>x.u);
  const mutual = following.filter(x=>frSet.has(x.u)).map(x=>x.u);
  const gender = {male:0,female:0,business:0,unknown:0};
  following.forEach(x=>{gender[classify(x.n,x.u)]++});
  return {totalFollowers:followers.length,totalFollowing:following.length,mutual:mutual.length,fmnfbCount:fmnfb.length,ifnfmCount:ifnfm.length,fmnfbList:fmnfb,ifnfmList:ifnfm,mutualList:mutual,gender};
}

/* ── Logo ── */
function BalpLogo({size="md"}) {
  const s = size==="lg"?"w-16 h-16 text-2xl":"w-9 h-9 text-sm";
  return <div className={"rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg "+s}>B</div>;
}

/* ── Stat Card ── */
function StatCard({title,value,subtitle,color,icon}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-0.5 hover:shadow-md transition-shadow">
      <span className="text-2xl">{icon}</span>
      <div className="text-2xl font-bold" style={{color}}>{typeof value==="number"?value.toLocaleString("tr-TR"):value}</div>
      <div className="text-xs font-semibold text-gray-700">{title}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}

/* ── User List ── */
function UserList({title,users,color,icon}) {
  const [q,setQ]=useState(""); const [pg,setPg]=useState(1);
  const f = q ? users.filter(u=>u.toLowerCase().includes(q.toLowerCase())) : users;
  const tp = Math.ceil(f.length/PAGE);
  const sl = f.slice((pg-1)*PAGE, pg*PAGE);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-3 border-b" style={{background:color+"0D"}}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <div>
              <h3 className="text-sm font-bold" style={{color}}>{title}</h3>
              <p className="text-xs text-gray-400">{f.length.toLocaleString("tr-TR")} kisi</p>
            </div>
          </div>
          <input type="text" placeholder="Ara..." value={q} onChange={e=>{setQ(e.target.value);setPg(1)}}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {sl.map((u,i)=>(
          <div key={u} className={"flex items-center justify-between px-3 py-1.5 text-xs "+(i%2?"bg-gray-50":"")}>
            <span className="text-gray-400 w-8">{(pg-1)*PAGE+i+1}</span>
            <span className="flex-1 font-medium text-gray-700">@{u}</span>
            <a href={"https://instagram.com/"+u} target="_blank" rel="noopener noreferrer"
              className="px-2 py-0.5 rounded text-white text-xs" style={{background:color}}>Git</a>
          </div>
        ))}
        {sl.length===0 && <p className="text-center py-6 text-xs text-gray-400">Sonuc bulunamadi</p>}
      </div>
      {tp>1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-xs">
          <button onClick={()=>setPg(Math.max(1,pg-1))} disabled={pg===1} className="px-2 py-0.5 rounded bg-white border disabled:opacity-30 cursor-pointer">Onceki</button>
          <span className="text-gray-500">{pg}/{tp}</span>
          <button onClick={()=>setPg(Math.min(tp,pg+1))} disabled={pg===tp} className="px-2 py-0.5 rounded bg-white border disabled:opacity-30 cursor-pointer">Sonraki</button>
        </div>
      )}
    </div>
  );
}

/* ══════════ APP LOGIN (Balp account) ══════════ */
function AppLoginPage({onLogin, onGoRegister, usersDb}) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState("");
  const handle = () => {
    const u = usersDb[email];
    if (u && u.password===pass) onLogin({email,name:u.name,igData:u.igData||null});
    else setErr("Email veya sifre hatali!");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-r from-indigo-600 to-violet-500">
          <BalpLogo size="lg" />
          <h1 className="text-2xl font-bold text-white mt-3">{BRAND}</h1>
          <p className="text-indigo-200 text-sm mt-1">Hesabina giris yap</p>
        </div>
        <div className="p-8 space-y-4">
          {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{err}</div>}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("")}}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ornek@email.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Sifre</label>
            <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr("")}}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Sifreniz" />
          </div>
          <button onClick={handle}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition cursor-pointer">
            Giris Yap
          </button>
          <p className="text-center text-sm text-gray-500">
            Hesabiniz yok mu? <button onClick={onGoRegister} className="text-indigo-600 font-semibold cursor-pointer hover:underline">Kayit Ol</button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════ REGISTER ══════════ */
function RegisterPage({onRegister, onGoLogin}) {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState("");
  const handle = () => {
    if (!name||!email||!pass) {setErr("Tum alanlari doldurun"); return;}
    if (pass.length<4) {setErr("Sifre en az 4 karakter"); return;}
    onRegister({name,email,password:pass});
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-r from-indigo-600 to-violet-500">
          <BalpLogo size="lg" />
          <h1 className="text-2xl font-bold text-white mt-3">{BRAND}</h1>
          <p className="text-indigo-200 text-sm mt-1">Yeni hesap olustur</p>
        </div>
        <div className="p-8 space-y-4">
          {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{err}</div>}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Ad Soyad</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Adiniz Soyadiniz" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ornek@email.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Sifre</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="En az 4 karakter" />
          </div>
          <button onClick={handle}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition cursor-pointer">Kayit Ol</button>
          <p className="text-center text-sm text-gray-500">
            Zaten hesabiniz var mi? <button onClick={onGoLogin} className="text-indigo-600 font-semibold cursor-pointer hover:underline">Giris Yap</button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════ INSTAGRAM CONNECT PAGE ══════════ */
function InstagramConnectPage({user, onConnected, onLogout, onManualUpload}) {
  const [igUser,setIgUser]=useState("");
  const [igPass,setIgPass]=useState("");
  const [step,setStep]=useState("form"); // form | loading | error
  const [progress,setProgress]=useState(0);
  const [statusText,setStatusText]=useState("");
  const [err,setErr]=useState("");

  const steps = [
    "Instagram'a baglaniliyor...",
    "Kimlik dogrulaniyor...",
    "Profil bilgileri aliniyor...",
    "Takipci listesi cekiliyor...",
    "Takip edilen listesi cekiliyor...",
    "Cinsiyet analizi yapiliyor...",
    "Firma hesaplari tespit ediliyor...",
    "Rapor hazirlaniyor...",
  ];

  const simulateFetch = useCallback(() => {
    setStep("loading");
    setProgress(0);
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        setStatusText(steps[i]);
        setProgress(Math.round(((i+1)/steps.length)*100));
        i++;
      } else {
        clearInterval(timer);
        // Simulate completed - in production this would be real API data
        const demoData = {
          totalFollowers: 4411, totalFollowing: 3834, mutual: 2032,
          fmnfbCount: 2379, ifnfmCount: 1802,
          fmnfbList: generateDemoList(2379, "follower"),
          ifnfmList: generateDemoList(1802, "following"),
          mutualList: [],
          gender: {male:728, female:183, business:636, unknown:2287},
          igUsername: igUser || "erkankekecoglu",
          igFullName: "Erkan Kekecoglu",
        };
        onConnected(demoData);
      }
    }, 600);
    return () => clearInterval(timer);
  }, [igUser, onConnected]);

  const handleConnect = () => {
    if (!igUser) {setErr("Instagram kullanici adini girin"); return;}
    if (!igPass) {setErr("Instagram sifresini girin"); return;}
    setErr("");
    simulateFetch();
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border p-10 max-w-md w-full text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="6" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad)" strokeWidth="6"
                strokeDasharray={`${progress * 2.83} 283`} strokeLinecap="round" />
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-600">{progress}%</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Veriler Cekiliyor</h2>
          <p className="text-sm text-indigo-600 font-medium">{statusText}</p>
          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500" style={{width:progress+"%"}} />
          </div>
          <p className="text-xs text-gray-400 mt-4">@{igUser || "kullanici"} hesabi analiz ediliyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BalpLogo />
            <div>
              <h1 className="text-lg font-bold text-gray-800">{BRAND}</h1>
              <p className="text-xs text-gray-400">Hos geldin, {user.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-500 cursor-pointer">Cikis</button>
        </div>

        {/* Instagram Login Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 text-center" style={{background:"linear-gradient(135deg, #833AB4, #E1306C, #F77737)"}}>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2"/>
                <circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2"/>
                <circle cx="18" cy="6" r="1.5" fill="#E1306C"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mt-3">Instagram Hesabini Bagla</h2>
            <p className="text-white/80 text-sm mt-1">Takipci analizin icin giris yap</p>
          </div>

          <div className="p-8 space-y-4">
            {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{err}</div>}

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Instagram Kullanici Adi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input type="text" value={igUser} onChange={e=>{setIgUser(e.target.value);setErr("")}}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="kullaniciadi" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Instagram Sifre</label>
              <input type="password" value={igPass} onChange={e=>{setIgPass(e.target.value);setErr("")}}
                onKeyDown={e=>e.key==="Enter"&&handleConnect()}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Instagram sifreniz" />
            </div>

            <button onClick={handleConnect}
              className="w-full py-3 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition cursor-pointer"
              style={{background:"linear-gradient(135deg, #833AB4, #E1306C, #F77737)"}}>
              Baglan ve Analiz Et
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">veya</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button onClick={onManualUpload}
              className="w-full py-2.5 bg-gray-50 text-gray-600 rounded-xl font-medium text-sm border border-gray-200 hover:bg-gray-100 transition cursor-pointer">
              JSON Dosyasi Yukle
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex gap-2">
            <span className="text-lg">🔒</span>
            <div>
              <h4 className="text-xs font-bold text-amber-700">Guvenlik Notu</h4>
              <p className="text-xs text-amber-600 mt-0.5">Sifreniz sadece Instagram API baglantisi icin kullanilir, kaydedilmez. Verileriniz sadece sizin cihazinizda islenir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ MANUAL UPLOAD PAGE ══════════ */
function UploadPage({user, onAnalyzed, onBack, onLogout}) {
  const [dragging,setDragging]=useState(false); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const processFile = useCallback((file) => {
    if (!file||!file.name.endsWith(".json")) {setErr("Lutfen .json dosyasi yukleyin"); return;}
    setLoading(true); setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const result = analyzeData(json);
        if (result.totalFollowing===0 && result.totalFollowers===0) {setErr("Gecerli veri bulunamadi"); setLoading(false); return;}
        onAnalyzed(result);
      } catch(ex) {setErr("Dosya okunamadi: "+ex.message);}
      setLoading(false);
    };
    reader.readAsText(file);
  }, [onAnalyzed]);
  const onDrop = useCallback((e) => {e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]);}, [processFile]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BalpLogo />
            <div>
              <h1 className="text-lg font-bold text-gray-800">{BRAND}</h1>
              <p className="text-xs text-gray-400">{user.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="text-sm text-indigo-500 hover:underline cursor-pointer">Geri</button>
            <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-500 cursor-pointer">Cikis</button>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-8">
          <div className="text-center mb-6">
            <p className="text-4xl">📁</p>
            <h2 className="text-xl font-bold text-gray-800 mt-3">JSON Dosyasi Yukle</h2>
            <p className="text-sm text-gray-500 mt-1">Instagram export dosyani sec</p>
          </div>
          {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{err}</div>}
          <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
            className={"border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer "+(dragging?"border-indigo-400 bg-indigo-50":"border-gray-200 hover:border-indigo-300")}
            onClick={()=>document.getElementById("fInput").click()}>
            {loading ? (
              <div><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"/><p className="text-sm text-indigo-600 mt-2">Analiz ediliyor...</p></div>
            ) : (
              <div><p className="text-3xl text-indigo-300">+</p><p className="text-sm font-medium text-gray-600 mt-2">Surukle birak veya tikla</p></div>
            )}
            <input id="fInput" type="file" accept=".json" className="hidden" onChange={e=>processFile(e.target.files[0])} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ DASHBOARD ══════════ */
function DashboardPage({user, data, onLogout, onNewAnalysis}) {
  const [tab,setTab]=useState("overview");
  const followPie = [
    {name:"Karsilikli Takip",value:data.mutual,color:C.green},
    {name:"Sadece Beni Takip Eden",value:data.fmnfbCount,color:C.orange},
    {name:"Sadece Ben Takip Ediyorum",value:data.ifnfmCount,color:C.red},
  ];
  const genderPie = [
    {name:"Erkek",value:data.gender.male,color:C.blue},
    {name:"Kadin",value:data.gender.female,color:C.pink},
    {name:"Firma/Marka",value:data.gender.business,color:C.purple},
    {name:"Tespit Edilemedi",value:data.gender.unknown,color:C.slate},
  ];
  const genderBar = [
    {name:"Erkek",count:data.gender.male,fill:C.blue},
    {name:"Kadin",count:data.gender.female,fill:C.pink},
    {name:"Firma",count:data.gender.business,fill:C.purple},
    {name:"Diger",count:data.gender.unknown,fill:C.slate},
  ];
  const rate = ((data.mutual/Math.max(data.totalFollowing,1))*100).toFixed(1);
  const ratio = (data.totalFollowers/Math.max(data.totalFollowing,1)).toFixed(2);
  const RADIAN = Math.PI/180;
  const rl = ({cx,cy,midAngle,innerRadius,outerRadius,percent}) => {
    if (percent<0.04) return null;
    const r=innerRadius+(outerRadius-innerRadius)*0.5;
    return <text x={cx+r*Math.cos(-midAngle*RADIAN)} y={cy+r*Math.sin(-midAngle*RADIAN)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">{(percent*100).toFixed(0)+"%"}</text>;
  };
  const Tip = ({active,payload}) => {
    if (!active||!payload?.length) return null;
    return <div className="bg-white px-3 py-2 shadow-lg rounded-lg border text-xs">
      <p className="font-semibold">{payload[0].name}</p>
      <p style={{color:payload[0].payload.color||payload[0].color}}>{payload[0].value.toLocaleString("tr-TR")}</p>
    </div>;
  };
  const tabs = [{id:"overview",label:"Genel Bakis",em:"📊"},{id:"lists",label:"Takip Listeleri",em:"📋"},{id:"gender",label:"Cinsiyet Analizi",em:"👤"}];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BalpLogo />
            <div>
              <h1 className="text-lg font-bold text-gray-800">{BRAND}</h1>
              <p className="text-xs text-gray-400">{user.name} {data.igUsername ? "- @"+data.igUsername : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onNewAnalysis} className="px-3 py-1.5 text-xs font-medium bg-white border rounded-lg hover:bg-gray-50 cursor-pointer">Yeni Analiz</button>
            <button onClick={onLogout} className="px-3 py-1.5 text-xs font-medium text-red-500 bg-white border rounded-lg hover:bg-red-50 cursor-pointer">Cikis</button>
          </div>
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={"px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all "+(tab===t.id?"bg-indigo-600 text-white shadow":"bg-white text-gray-600 border hover:bg-gray-50")}>
              {t.em+" "+t.label}
            </button>
          ))}
        </div>

        {tab==="overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard title="Takipci" value={data.totalFollowers} icon="👥" color={C.blue} subtitle="Seni takip edenler" />
              <StatCard title="Takip" value={data.totalFollowing} icon="➡️" color={C.cyan} subtitle="Senin takip ettiklerin" />
              <StatCard title="Karsilikli" value={data.mutual} icon="🤝" color={C.green} subtitle={"%"+rate+" oran"} />
              <StatCard title="Oran" value={ratio} icon="⚖️" color={C.purple} subtitle="Takipci/Takip" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard title="Seni Takip Eden, Sen Etmiyorsun" value={data.fmnfbCount} icon="👋" color={C.orange} subtitle="Potansiyel geri takip" />
              <StatCard title="Sen Takip Ediyorsun, O Etmiyor" value={data.ifnfmCount} icon="💔" color={C.red} subtitle="Temizlik adayi" />
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Takip Iliskisi Dagilimi</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={followPie} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" labelLine={false} label={rl}>
                  {followPie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                  <Tooltip content={<Tip/>}/><Legend formatter={v=><span className="text-xs text-gray-600">{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab==="lists" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <UserList title="Seni Takip Eden, Sen Etmiyorsun" users={data.fmnfbList} color={C.orange} icon="👋" />
            <UserList title="Sen Takip Ediyorsun, O Etmiyor" users={data.ifnfmList} color={C.red} icon="💔" />
          </div>
        )}

        {tab==="gender" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard title="Erkek" value={data.gender.male} icon="👨" color={C.blue} subtitle={"%"+((data.gender.male/Math.max(data.totalFollowing,1))*100).toFixed(1)} />
              <StatCard title="Kadin" value={data.gender.female} icon="👩" color={C.pink} subtitle={"%"+((data.gender.female/Math.max(data.totalFollowing,1))*100).toFixed(1)} />
              <StatCard title="Firma/Marka" value={data.gender.business} icon="🏢" color={C.purple} subtitle={"%"+((data.gender.business/Math.max(data.totalFollowing,1))*100).toFixed(1)} />
              <StatCard title="Bilinmiyor" value={data.gender.unknown} icon="❓" color={C.slate} subtitle={"%"+((data.gender.unknown/Math.max(data.totalFollowing,1))*100).toFixed(1)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 shadow-sm border">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Cinsiyet Dagilimi</h3>
                <ResponsiveContainer width="100%" height={260}><PieChart>
                  <Pie data={genderPie} cx="50%" cy="50%" outerRadius={95} innerRadius={40} dataKey="value" labelLine={false} label={rl}>
                    {genderPie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                  <Tooltip content={<Tip/>}/><Legend formatter={v=><span className="text-xs text-gray-600">{v}</span>}/>
                </PieChart></ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Hesap Turu Dagilimi</h3>
                <ResponsiveContainer width="100%" height={260}><BarChart data={genderBar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" tick={{fontSize:11}}/><YAxis dataKey="name" type="category" width={50} tick={{fontSize:11}}/>
                  <Tooltip formatter={v=>[v.toLocaleString("tr-TR"),"Kisi"]}/>
                  <Bar dataKey="count" radius={[0,6,6,0]} barSize={25}>{genderBar.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        <div className="text-center mt-8 text-xs text-gray-400">{BRAND} - Balp Dijital</div>
      </div>
    </div>
  );
}

/* ── Demo list generator ── */
function generateDemoList(count, type) {
  const prefixes = type==="follower" ? ["user","fan","follow","insta","real"] : ["brand","shop","store","page","biz"];
  const list = [];
  for (let i=0; i<count; i++) list.push(prefixes[i%prefixes.length]+"_"+(1000+i));
  return list;
}

/* ══════════ MAIN APP ══════════ */
export default function App() {
  const [page,setPage]=useState("login");
  const [user,setUser]=useState(null);
  const [analysisData,setAnalysisData]=useState(null);
  const [usersDb,setUsersDb]=useState({
    "demo@balp.com": {name:"Demo Kullanici", password:"1234", igData:null}
  });

  const handleLogin = (u) => {
    setUser(u);
    if (u.igData) {setAnalysisData(u.igData); setPage("dashboard");}
    else setPage("connect");
  };

  const handleRegister = ({name,email,password}) => {
    if (usersDb[email]) return;
    setUsersDb(prev=>({...prev,[email]:{name,password,igData:null}}));
    setUser({email,name,igData:null});
    setPage("connect");
  };

  const handleConnected = (d) => {
    setAnalysisData(d);
    if (user) setUsersDb(prev=>({...prev,[user.email]:{...prev[user.email],igData:d}}));
    setPage("dashboard");
  };

  const handleLogout = () => {setUser(null);setAnalysisData(null);setPage("login");};

  if (page==="login") return <AppLoginPage usersDb={usersDb} onLogin={handleLogin} onGoRegister={()=>setPage("register")} />;
  if (page==="register") return <RegisterPage onRegister={handleRegister} onGoLogin={()=>setPage("login")} />;
  if (page==="connect") return <InstagramConnectPage user={user} onConnected={handleConnected} onLogout={handleLogout} onManualUpload={()=>setPage("upload")} />;
  if (page==="upload") return <UploadPage user={user} onAnalyzed={handleConnected} onBack={()=>setPage("connect")} onLogout={handleLogout} />;
  if (page==="dashboard" && analysisData) return <DashboardPage user={user} data={analysisData} onLogout={handleLogout} onNewAnalysis={()=>setPage("connect")} />;
  return null;
}
