require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");
const { analyzeAccount, classifyGender } = require("./instagram");

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "balp-secret-key-degistir";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));

// Production'da frontend'i serve et
app.use(express.static(path.join(__dirname, "../client/build")));

// ── JWT Middleware ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Giris yapmaniz gerekiyor" });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: "Oturum suresi doldu" }); }
}

// ══════════ AUTH ══════════

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Tum alanlari doldurun" });
    if (password.length < 4) return res.status(400).json({ error: "Sifre en az 4 karakter" });
    if (db.findUserByEmail(email)) return res.status(400).json({ error: "Bu email zaten kayitli" });

    const hash = await bcrypt.hash(password, 10);
    const user = db.createUser(name, email, hash);
    const token = jwt.sign({ id: user.id, name, email }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name, email } });
  } catch (err) { res.status(500).json({ error: "Kayit hatasi" }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Email veya sifre hatali" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Email veya sifre hatali" });
    const token = jwt.sign({ id: user.id, name: user.name, email }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email } });
  } catch (err) { res.status(500).json({ error: "Giris hatasi" }); }
});

app.get("/api/me", auth, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Kullanici bulunamadi" });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// ══════════ INSTAGRAM ══════════

app.post("/api/analyze", auth, async (req, res) => {
  try {
    const { igUsername, igPassword } = req.body;
    if (!igUsername || !igPassword) return res.status(400).json({ error: "Instagram bilgilerini girin" });

    const result = await analyzeAccount(igUsername, igPassword, (p) => {
      console.log(`[${igUsername}] ${p.message}`);
    });

    db.createAnalysis(req.user.id, result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Analiz hatasi:", err.message);
    res.status(400).json({ error: err.message || "Analiz basarisiz" });
  }
});

// SSE ile canli ilerleme
app.post("/api/analyze-stream", auth, (req, res) => {
  const { igUsername, igPassword } = req.body;
  if (!igUsername || !igPassword) return res.status(400).json({ error: "Instagram bilgilerini girin" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  analyzeAccount(igUsername, igPassword, (p) => send("progress", p))
    .then((result) => { db.createAnalysis(req.user.id, result); send("done", result); res.end(); })
    .catch((err) => { send("error", { message: err.message }); res.end(); });
});

// JSON ile analiz
app.post("/api/analyze-json", auth, (req, res) => {
  try {
    const jsonData = req.body;
    let following = [], followers = [];
    if (jsonData.followingWithNames) following = jsonData.followingWithNames.map((x) => ({ u: x.u, n: x.n }));
    if (jsonData.fmnfb && jsonData.ifnfm && jsonData.mutual) {
      if (!jsonData.followingWithNames) following = [...jsonData.ifnfm, ...jsonData.mutual].map((u) => ({ u, n: "" }));
      followers = [...jsonData.fmnfb, ...jsonData.mutual].map((u) => ({ u, n: "" }));
    }
    const fgSet = new Set(following.map((x) => x.u)), frSet = new Set(followers.map((x) => x.u));
    const fmnfb = followers.filter((x) => !fgSet.has(x.u)).map((x) => x.u);
    const ifnfm = following.filter((x) => !frSet.has(x.u)).map((x) => x.u);
    const mutual = following.filter((x) => frSet.has(x.u)).map((x) => x.u);
    const gender = { male: 0, female: 0, business: 0, unknown: 0 };
    following.forEach((x) => { gender[classifyGender(x.n, x.u)]++; });
    const result = { totalFollowers: followers.length, totalFollowing: following.length, mutual: mutual.length, fmnfbCount: fmnfb.length, ifnfmCount: ifnfm.length, fmnfbList: fmnfb, ifnfmList: ifnfm, mutualList: mutual, gender };
    db.createAnalysis(req.user.id, result);
    res.json({ success: true, data: result });
  } catch (err) { res.status(400).json({ error: "JSON analizi basarisiz" }); }
});

// Gecmis analizler
app.get("/api/analyses", auth, (req, res) => {
  const analyses = db.getAnalysesByUser(req.user.id).map((a) => ({
    id: a.id, igUsername: a.igUsername, totalFollowers: a.totalFollowers,
    totalFollowing: a.totalFollowing, mutual: a.mutual, fmnfbCount: a.fmnfbCount,
    ifnfmCount: a.ifnfmCount, gender: a.gender, createdAt: a.createdAt,
  }));
  res.json({ analyses });
});

app.get("/api/analyses/:id", auth, (req, res) => {
  const a = db.getAnalysisById(parseInt(req.params.id), req.user.id);
  if (!a) return res.status(404).json({ error: "Bulunamadi" });
  res.json({ data: a });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Balp Instagram Analiz - Backend    ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝`);
});
