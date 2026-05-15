import express from "express";
import path from "path";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

class DBWrapper {
  private db: any;
  constructor(url: string, authToken?: string) {
    this.db = createClient({ url, authToken });
  }
  async exec(sql: string) { return this.db.execute(sql); }
  async get(sql: string, params: any[] = []) { 
    const result = await this.db.execute({ sql, args: params });
    return result.rows[0];
  }
  async all(sql: string, params: any[] = []) { 
    const result = await this.db.execute({ sql, args: params });
    return result.rows;
  }
  async run(sql: string, params: any[] = []) { 
    const result = await this.db.execute({ sql, args: params });
    return { lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0, changes: result.rowsAffected };
  }
}

const app = express();

app.use(express.json());

// Use the GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";
const JWT_SECRET = process.env.JWT_SECRET || "nudgel-super-secret-key-123";

// Setup rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // limit each IP to 20 auth requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

let db: DBWrapper;
let dbInitPromise: Promise<void> | null = null;

async function setupDB() {
  const dbUrl = process.env.DATABASE_URL || (process.env.VERCEL ? "file:/tmp/nudgel.db" : "file:nudgel.db");
  const dbAuthToken = process.env.DATABASE_AUTH_TOKEN;
  
  db = new DBWrapper(dbUrl, dbAuthToken);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_picture TEXT,
      bio TEXT,
      unique_token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gist_ids TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_participants (
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY(chat_id) REFERENCES chats(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      PRIMARY KEY (chat_id, user_id)
    );
  `);
}

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    try {
      if (!dbInitPromise) {
        dbInitPromise = setupDB();
      }
      await dbInitPromise;
    } catch (err: any) {
      console.error("DB Initialization Error:", err);
      return res.status(500).json({ error: "Failed to connect to the database", details: err.message });
    }
  }
  next();
});

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ error: "Access denied, no token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

app.post("/api/signup", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: "Invalid username or password length. Username min 3, Password min 6." });
    }

    const existingUser = await db.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const unique_token = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.run(
      "INSERT INTO users (username, password_hash, unique_token) VALUES (?, ?, ?)",
      [username, password_hash, unique_token]
    );

    const user = { id: result.lastID, username, unique_token };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const tokenPayload = { id: user.id, username: user.username, unique_token: user.unique_token };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: tokenPayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/logout", (req, res) => {
   // Assuming client will just drop the token
   res.json({ success: true });
});

app.get("/api/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await db.get("SELECT id, username, profile_picture, bio, unique_token, created_at FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", authenticateToken, async (req: any, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });
    
    const user = await db.get("SELECT id, username, unique_token FROM users WHERE unique_token = ? COLLATE NOCASE", [token]);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", authenticateToken, async (req: any, res) => {
  try {
    const { username } = req.body;
    await db.run("UPDATE users SET username = ? WHERE id = ?", [username, req.user.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chats", authenticateToken, async (req: any, res) => {
  try {
    const chats = await db.all(`
      SELECT c.id, c.gist_ids, u.id as other_user_id, u.username as other_username
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      JOIN chat_participants cp_other ON c.id = cp_other.chat_id
      JOIN users u ON cp_other.user_id = u.id
      WHERE cp.user_id = ? AND cp_other.user_id != ?
    `, [req.user.id, req.user.id]);
    
    const mappedChats = chats.map((c) => ({
      id: c.id.toString(),
      gistIds: JSON.parse(c.gist_ids || "[]"),
      otherUser: { id: c.other_user_id.toString(), displayName: c.other_username }
    }));
    
    res.json({ chats: mappedChats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chats/:chatId", authenticateToken, async (req: any, res) => {
  try {
    const chat = await db.get(`SELECT * FROM chats c JOIN chat_participants cp ON c.id = cp.chat_id WHERE c.id = ? AND cp.user_id = ?`, [req.params.chatId, req.user.id]);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json({ id: chat.id.toString(), gistIds: JSON.parse(chat.gist_ids || "[]") });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chats", authenticateToken, async (req: any, res) => {
  try {
    const { targetUserId } = req.body;
    // check if chat exists
    const existing = await db.get(`
      SELECT c.id FROM chats c
      JOIN chat_participants cp1 ON c.id = cp1.chat_id
      JOIN chat_participants cp2 ON c.id = cp2.chat_id
      WHERE cp1.user_id = ? AND cp2.user_id = ?
    `, [req.user.id, targetUserId]);
    
    if (existing) {
       return res.json({ id: existing.id.toString() });
    }

    const result = await db.run("INSERT INTO chats DEFAULT VALUES");
    const chatId = result.lastID;
    
    await db.run("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?), (?, ?)", [
      chatId, req.user.id, chatId, targetUserId
    ]);

    res.json({ id: chatId.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/chats/:chatId", authenticateToken, async (req: any, res: any) => {
  try {
     const { gistId } = req.body;
     const chat = await db.get(`SELECT * FROM chats c JOIN chat_participants cp ON c.id = cp.chat_id WHERE c.id = ? AND cp.user_id = ?`, [req.params.chatId, req.user.id]);
     if (!chat) return res.status(404).json({ error: "Chat not found" });
     
     const gistIds = JSON.parse(chat.gist_ids || "[]");
     if (!gistIds.includes(gistId)) {
        gistIds.push(gistId);
        await db.run("UPDATE chats SET gist_ids = ? WHERE id = ?", [JSON.stringify(gistIds), chat.id]);
     }
     res.json({ success: true });
  } catch (err: any) {
     res.status(500).json({ error: err.message });
  }
});

// API to append a message to a gist
// Creates a new gist if none exists or if it's too large
app.post("/api/messages/:chatId", authenticateToken, async (req: any, res: any) => {
    try {
      const { chatId } = req.params;
      const { message, currentGistId } = req.body; // message: {u: senderId, m: text, t: timestamp}

      if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: "GitHub token missing" });
      }

      const conciseMsg = { u: message.senderId, m: message.text, t: message.createdAt };

      const appendToGist = async (gistId: string, msg: any) => {
        // Fetch current gist
        const maxLines = 1000; // threshold
        const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AI-Studio-Applet"
          }
        });
        if (!gistRes.ok) throw new Error("Failed to fetch gist");
        const gistData = await gistRes.json();
        
        const fileName = `messages.jsonl`;
        let content = gistData.files[fileName]?.content || "";
        
        // Count lines
        const lines = content.split('\n').filter(Boolean);
        if (lines.length >= maxLines) {
           return null; // Signals needing a new gist
        }

        const newContent = content + (content ? '\n' : '') + JSON.stringify(msg);

        // Update gist
        const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AI-Studio-Applet",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            files: {
              [fileName]: {
                content: newContent
              }
            }
          })
        });

        if (!patchRes.ok) throw new Error("Failed to patch gist");
        return gistId; // Still on the same gist
      };

      const createNewGist = async (msg: any) => {
        const fileName = `messages.jsonl`;
        const initialContent = JSON.stringify(msg);
        const postRes = await fetch(`https://api.github.com/gists`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AI-Studio-Applet",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            description: `Chat ${chatId} messages`,
            public: false,
            files: {
              [fileName]: {
                content: initialContent
              }
            }
          })
        });

        if (!postRes.ok) {
           const e = await postRes.text();
           if (e.includes("Resource not accessible by personal access token")) {
              throw new Error("Your GitHub Personal Access Token (PAT) does not have the 'gist' scope. Please create a new Classic PAT with the 'gist' scope, or a Fine-grained PAT with 'gists' read/write permissions, and update it in AI Studio Secrets.");
           }
           throw new Error("Failed to create gist: " + e);
        }
        const createdData = await postRes.json();
        return createdData.id;
      };

      let finalGistId = currentGistId;
      if (currentGistId) {
         const resGist = await appendToGist(currentGistId, conciseMsg);
         if (!resGist) {
           // Create a new one
           finalGistId = await createNewGist(conciseMsg);
         }
      } else {
         finalGistId = await createNewGist(conciseMsg);
      }

      res.json({ gistId: finalGistId });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/messages/:gistId", async (req, res) => {
     try {
        if (!GITHUB_TOKEN) {
           return res.status(500).json({ error: "GitHub token missing" });
        }
        const gistRes = await fetch(`https://api.github.com/gists/${req.params.gistId}`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AI-Studio-Applet"
          }
        });
        if (!gistRes.ok) throw new Error("Failed to fetch gist");
        const gistData = await gistRes.json();
        const content = gistData.files['messages.jsonl']?.content || "";
        
        const messages = content.split('\n').filter(Boolean).map((line: string) => {
           try { 
             const parsed = JSON.parse(line); 
             if (parsed.u) {
               return { senderId: parsed.u, text: parsed.m, createdAt: parsed.t };
             }
             return parsed; // legacy or optimistic format
           } catch (err) { return null; }
        }).filter(Boolean);

        res.json({ messages });
     } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
     }
  });

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if we are not in a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
