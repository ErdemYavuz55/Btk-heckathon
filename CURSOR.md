Below is a **complete, copy-ready `CURSOR.md`** for your repository root.
Save it as `CURSOR.md`, commit, then run Cursor / GitHub Copilot-Chat over the repo; they will read this file, scaffold every package, and fill the `TODO:` stubs.

---

````markdown
---
title: Interactive-Edu • AI-Driven Visual Simulator
description: Monorepo (pnpm+turbo) with Node / TypeScript micro-services that turn Gemini prompts into live, sandboxed browser simulations for Math, Physics, Chemistry & History.
cursor_version: 1
---

## 💡 What Cursor must build
1. **generator-api** – Fastify → LangChain.js → Gemini Pro  
2. **gateway-frontend** – Next.js 14 (React + Tailwind) with an `/api/visualize` proxy, a single page UI and an iframe sandbox loader  
3. **sandbox-runner** – Static bundle that executes Gemini-generated ES modules safely inside `<iframe sandbox="allow-scripts">`  
4. **shared-schema** – Reusable Zod spec & TypeScript types

Everything must compile & run with:

```bash
pnpm install
pnpm dev        # turbo:  • frontend http://localhost:3000
                #         • generator-api http://localhost:4000
````

---

## 📂 Folder map

```text
.
├─ apps/
│  ├─ gateway-frontend/        # Next.js 14 (App Router, Server Actions)
│  ├─ generator-api/           # Fastify 4, LangChain.js, Zod
│  └─ sandbox-runner/          # Public html/js (iframe bundle)
├─ packages/
│  └─ shared-schema/           # Zod spec + exported types
├─ infra/
│  ├─ docker-compose.yml       # nginx reverse proxy + two Node images
│  └─ k8s/                     # helm charts (OPTIONAL – leave empty)
├─ scripts/                    # helper bash / ts-node scripts
└─ CURSOR.md                   # ← this file
```

---

## 🛠️ Stack & versions (lock, do not upgrade)

| Layer      | Choice                 | Version |
| ---------- | ---------------------- | ------- |
| Runtime    | **node:18-alpine**     | 18.20.x |
| Package    | **pnpm**               | 8.x     |
| Monorepo   | **turborepo**          | ^1.13   |
| API        | **Fastify**            | ^4.25   |
| AI         | **LangChain.js**       | ^0.2    |
| Frontend   | **Next.js**            | 14.2.x  |
| Styles     | **TailwindCSS**        | 3.x     |
| Types      | **TypeScript**         | 5.5.x   |
| Validation | **zod**                | ^3.22   |
| Charts     | **Plotly.js** (cdn)    | 2.32.1  |
| Timeline   | **vis-timeline** (cdn) | 7.7.0   |

---

## 🔑 Environment variables (`.env` at repo root)

```
GEMINI_API_KEY=your_key_here
GEN_API_URL=http://localhost:4000
```

---

## 🧭 User journey (one request)

```mermaid
sequenceDiagram
    actor User
    participant Front as Next.js UI
    participant GW   as /api/visualize (edge / server action)
    participant Gen  as generator-api
    participant Gem  as Gemini Pro (LangChain)
    participant Img  as Unsplash | Wikimedia | Gemini Image
    participant Box  as sandbox-runner

    User->>Front: prompt + topic
    Front->>GW: fetch /api/visualize
    GW->>Gen: POST /generate
    Gen->>Gem: prompt+schema
    Gem-->>Gen: { uiInputs, code, image? }
    Gen->>Img: optional fetch
    Gen-->>GW: spec payload
    GW-->>Front: 200 OK json
    Front->>Box: load iframe + postMessage({code,uiInputs})
    Box-->>User: live chart + sliders
```

---

## 📑 API contracts

### 1. POST `/generate` (generator-api)

```http
REQUEST JSON
{
  "prompt": "20 m/s ilk hızla atış simüle et",
  "topic":  "physics",
  "lang":   "tr"
}

RESPONSE 200
{
  "uiInputs": [
    { "name":"v0","label":"İlk hız","min":1,"max":50,"step":1,"value":20 },
    { "name":"g", "label":"Yerçekimi","min":5,"max":15,"step":0.1,"value":9.81 }
  ],
  "code": "export function render(el,p){ /* plotly code */ }",
  "image":"https://upload.wikimedia.org/..."      // optional
}
```

`uiInputs` slider tanımlarının, `code` ise **ES module** biçiminde **tek export** (`render(el, params)`) fonksiyonunun gelmesi zorunludur.

### 2. shared schema (Zod → JSON schema)

```ts
const uiInput = z.object({
  name: z.string(),
  label: z.string(),
  min: z.number(), max: z.number(),
  step: z.number(), value: z.number()
});
export const specSchema = z.object({
  uiInputs: z.array(uiInput),
  code: z.string(),
  image: z.string().url().optional()
});
```

---

## 🔮 Prompt templates (LangChain)

```txt
SYSTEM:
You are an assistant that converts educational prompts (Math, Physics, Chemistry, History) into
**JSON objects** matching a provided schema.  
Return ONLY valid JSON – no markdown, no commentary.  
`code` must be a pure ES2020 module, single export named `render(el, params)`,
and may import Plotly (https://cdn.plot.ly/plotly-2.32.1.min.js) or p5.js from a CDN.
Do NOT call fetch, WebSocket, document.cookie, or localStorage.

USER:
{USER_PROMPT}
```

---

## 🖼️ Image service rules

*If* Gemini sets `imageNeeded=true`, generator-api:

1. Looks up Wikimedia summary → `thumbnail.source` (public domain check)
2. Fallback Unsplash `/search/photos` (`client_id` via env)
3. Otherwise call **Gemini Image** with a short prompt `"line-art diagram of ..."`.
   Cache URL → 24 h in memory LRU.

---

## 🔐 Security checklist

| Risk                | Mitigation                                                       |
| ------------------- | ---------------------------------------------------------------- |
| XSS / DOM injection | run code **inside sandboxed iframe** (`sandbox="allow-scripts"`) |
| Network abuse       | Regex-block forbids `fetch`, `WebSocket`, etc. in generated code |
| Infinite loop       | Wrap `render()` calls in `AbortController`, 2 s timeout          |
| Large payload       | body-limit 10 KB on Fastify                                      |

---

## 🗂️ TODO blocks (Cursor must fill)

```ts
// apps/generator-api/src/routes/generate.ts
/** TODO: 1) parse body, 2) call Gemini via LangChain, 
    3) validate with specSchema, 4) optional image fetch, 5) return JSON **/

// apps/gateway-frontend/app/(api)/visualize/route.ts
/** TODO: Proxy POST body to process.env.GEN_API_URL + '/generate' and stream back **/

// apps/gateway-frontend/app/page.tsx
/** TODO: UI:
    - Textarea + topic select
    - On submit → fetch('/api/visualize')
    - Create sliders from uiInputs
    - iframe <Sandbox /> loading code + params **/

// apps/sandbox-runner/public/sandbox.js
/** TODO: receive {code,uiInputs}, dynamic import, call render(el,params);
    on 'params' message → re-render **/
```

Cursor, when generating code:

* Use **TypeScript** everywhere except sandbox JS bundle.
* Keep every CI green (`pnpm run build`).
* Read `shared-schema` types to avoid drift.

---

## 🏇 72-hour sprint plan

| Hours | Goal                                                           |
| ----- | -------------------------------------------------------------- |
| 0-4   | Scaffold monorepo, env vars, run `pnpm dev` OK                 |
| 4-12  | Implement generator-api ➜ Gemini call & validation             |
| 12-20 | Build basic UI page, post prompt, show raw JSON                |
| 20-28 | Finish sandbox runner + Plotly example                         |
| 28-40 | Add Wikimedia/Unsplash service, image display                  |
| 40-56 | Polish sliders, error toasts, dark-mode styles                 |
| 56-68 | Dockerfiles, docker-compose, README badges                     |
| 68-72 | Record 1-min demo video, push to GitHub, Vercel/Railway deploy |

---

## 📋 Commit message convention

```
feat(generator-api): initial Gemini call
fix(gateway): proxy error handling
chore(ci): add docker build test
```

---

## 🚦 Definition of Done

1. `pnpm dev` launches both services, open [http://localhost:3000](http://localhost:3000), enter prompt, see interactive chart.
2. ESLint & TypeScript pass, `turbo run build` succeeds.
3. `docker compose up --build` exposes `localhost`, same behaviour.
4. README contains deploy URL + demo GIF.

*(End of CURSOR.md)*

```

---
```
Aşağıdaki bölümü **CURSOR.md** dosyanın en altına ( “End of CURSOR.md” satırından hemen ÖNCE ) ekle; böylece Cursor/GPT repo’yu oluştururken `.gitignore` dosyasını da yaratır ve ilk commit’i yapar.

```markdown
---

## 🗂️ Version-Control • Git

### .gitignore  – create at repo root
```

# Node / pnpm

node\_modules
.pnpm
.env
.DS\_Store

# Next.js

.next
out

# Turbo / pnpm store

turbo
dist
build

# Logs & reports

\*.log
\*.tsbuildinfo
coverage

# Docker

\*.local
docker-compose.override.yml

````

### Initial commands (Cursor may run automatically)

```bash
git init
git add .
git commit -m "chore: scaffold monorepo skeleton"
# optional – replace URL with your repo
# git remote add origin https://github.com/yourname/interactive-edu.git
# git push -u origin main
````

### Commit convention recap

Use angular-style prefixes (`feat:`, `fix:`, `chore:` …) as shown above.
CI must stay green (`pnpm build`) before pushing.

*(End of Git section)*

```

Bu eklemeyle **.gitignore**, ilk `git init`/`commit` yönergeleri ve konvansiyon tek dosyada birleşmiş oldu. Cursor dosyayı okuduğunda `.gitignore`’u oluşturup depoyu temiz bir şekilde başlatacaktır.
```
