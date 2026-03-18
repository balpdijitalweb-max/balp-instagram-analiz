const API = "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("balp_token");
}

function setToken(token) {
  localStorage.setItem("balp_token", token);
}

function clearToken() {
  localStorage.removeItem("balp_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Bir hata olustu");
  return data;
}

// Auth
export async function register(name, email, password) {
  const data = await request("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  const data = await request("/me");
  return data.user;
}

export function logout() {
  clearToken();
}

export function isLoggedIn() {
  return !!getToken();
}

// Instagram Analysis
export async function analyzeInstagram(igUsername, igPassword) {
  const data = await request("/analyze", {
    method: "POST",
    body: JSON.stringify({ igUsername, igPassword }),
  });
  return data.data;
}

// SSE ile canli ilerleme
export function analyzeInstagramStream(igUsername, igPassword, onProgress, onDone, onError) {
  const token = getToken();

  fetch(`${API}/analyze-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ igUsername, igPassword }),
  }).then((res) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventName = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventName = line.slice(7);
          else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventName === "progress") onProgress(data);
              else if (eventName === "done") onDone(data);
              else if (eventName === "error") onError(data.message);
            } catch {}
          }
        }
        read();
      });
    }
    read();
  }).catch((err) => onError(err.message));
}

// JSON ile analiz
export async function analyzeJson(jsonData) {
  const data = await request("/analyze-json", {
    method: "POST",
    body: JSON.stringify(jsonData),
  });
  return data.data;
}

// Gecmis analizler
export async function getAnalyses() {
  const data = await request("/analyses");
  return data.analyses;
}

export async function getAnalysis(id) {
  const data = await request(`/analyses/${id}`);
  return data.data;
}
