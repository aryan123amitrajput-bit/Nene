import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Use the GitHub token from environment
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";

  // API to append a message to a gist
  // Creates a new gist if none exists or if it's too large
  app.post("/api/messages/:chatId", async (req, res) => {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
