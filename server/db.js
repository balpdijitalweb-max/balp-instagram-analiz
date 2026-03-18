const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data.json");

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {}
  return { users: [], analyses: [], nextUserId: 1, nextAnalysisId: 1 };
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const db = {
  // Users
  findUserByEmail(email) {
    const data = loadDb();
    return data.users.find((u) => u.email === email) || null;
  },
  findUserById(id) {
    const data = loadDb();
    return data.users.find((u) => u.id === id) || null;
  },
  createUser(name, email, passwordHash) {
    const data = loadDb();
    const user = { id: data.nextUserId++, name, email, password: passwordHash, createdAt: new Date().toISOString() };
    data.users.push(user);
    saveDb(data);
    return user;
  },

  // Analyses
  createAnalysis(userId, result) {
    const data = loadDb();
    const analysis = {
      id: data.nextAnalysisId++,
      userId,
      igUsername: result.igUsername || "",
      igUserId: result.igUserId || "",
      totalFollowers: result.totalFollowers,
      totalFollowing: result.totalFollowing,
      mutual: result.mutual,
      fmnfbCount: result.fmnfbCount,
      ifnfmCount: result.ifnfmCount,
      gender: result.gender,
      fmnfbList: result.fmnfbList,
      ifnfmList: result.ifnfmList,
      mutualList: result.mutualList,
      createdAt: new Date().toISOString(),
    };
    data.analyses.push(analysis);
    saveDb(data);
    return analysis;
  },
  getAnalysesByUser(userId) {
    const data = loadDb();
    return data.analyses
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getAnalysisById(id, userId) {
    const data = loadDb();
    return data.analyses.find((a) => a.id === id && a.userId === userId) || null;
  },
};

module.exports = db;
