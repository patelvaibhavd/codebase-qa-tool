# CodeQ - Codebase Q&A Tool

<div align="center">

![CodeQ Logo](https://via.placeholder.com/120x120/0d1117/00d4aa?text=CodeQ)

**AI-powered developer tool for natural language Q&A about any codebase**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular)](https://angular.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Configuration](#-configuration)

</div>

---

## 📋 Overview

CodeQ allows you to upload any codebase (GitHub repo or ZIP file) and ask questions in plain English. Get accurate answers with precise file and line references, powered by AI.

**Example Questions:**
- "What does the authentication middleware do?"
- "Where is the database connection configured?"
- "How does the routing system work?"
- "What are the main components in this project?"

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗣️ **Natural Language Q&A** | Ask questions in plain English |
| 🐙 **GitHub Integration** | Clone public repos directly via URL |
| 📦 **ZIP Upload** | Upload codebase archives |
| 📍 **File References** | Get exact file paths and line numbers |
| 🔍 **Language Filter** | Filter queries by programming language |
| 📁 **Folder Indexing** | Navigate and explore codebase structure |
| 🎯 **Confidence Scoring** | See AI confidence in answers |
| 🌓 **Dark/Light Theme** | Toggle between themes |
| 🤖 **Multiple AI Providers** | OpenAI, Ollama (free), Groq, Demo mode |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** 
- **npm** or **yarn**
- (Optional) **Ollama** for free local AI

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```bash
# Demo Mode (no API key needed)
AI_PROVIDER=demo
PORT=3000

# OR use Ollama (free, local)
# AI_PROVIDER=ollama

# OR use OpenAI (paid)
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key
```

### 3. Start the Application

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm start
```

### 4. Open the App

Navigate to **http://localhost:4200** 🎉

---

## 🏗️ Project Structure

```
developer-codebase-qa/
├── backend/                      # Node.js Express API
│   ├── src/
│   │   ├── server.js            # Express server entry
│   │   ├── routes/
│   │   │   ├── upload.routes.js # Upload endpoints
│   │   │   ├── qa.routes.js     # Q&A endpoints
│   │   │   └── project.routes.js# Project management
│   │   └── services/
│   │       ├── aiProvider.service.js  # AI abstraction layer
│   │       ├── parser.service.js      # Code file parsing
│   │       ├── vectorStore.service.js # Embeddings & search
│   │       ├── qa.service.js          # Q&A logic
│   │       └── cleanup.service.js     # Storage cleanup
│   ├── scripts/
│   │   └── cleanup.js           # Manual cleanup script
│   ├── CodeQ-API.postman_collection.json
│   ├── package.json
│   └── env.example.txt          # Environment setup guide
│
├── frontend/                     # Angular 17 Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts # Main component
│   │   │   ├── components/
│   │   │   │   ├── upload/      # File upload UI
│   │   │   │   ├── chat/        # Q&A chat interface
│   │   │   │   └── file-browser/# File tree navigation
│   │   │   └── services/
│   │   │       └── api.service.ts
│   │   ├── styles.scss          # Global styles & themes
│   │   └── index.html
│   ├── angular.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🔧 Backend Documentation

### Tech Stack

- **Express.js** - REST API framework
- **OpenAI SDK** - AI completions & embeddings
- **Multer** - File upload handling
- **simple-git** - GitHub cloning
- **adm-zip** - ZIP extraction

### Available Scripts

```bash
npm start      # Start production server
npm run dev    # Start with hot reload
npm run cleanup # Delete all project files
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | No | `demo` | AI provider: `demo`, `ollama`, `groq`, `openai` |
| `OPENAI_API_KEY` | If OpenAI | - | OpenAI API key |
| `GROQ_API_KEY` | If Groq | - | Groq API key |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL |
| `PORT` | No | `3000` | Server port |
| `MAX_FILE_SIZE` | No | `100000000` | Max upload size (bytes) |

### AI Provider Options

| Provider | Cost | Setup | Best For |
|----------|------|-------|----------|
| **Demo** | Free | None required | Testing, no AI needed |
| **Ollama** | Free | Install locally | Privacy, offline use |
| **Groq** | Free tier | API key | Fast responses |
| **OpenAI** | Paid | API key | Best quality |

#### Setting up Ollama (Free)

```bash
# Install
brew install ollama  # macOS
# or download from ollama.ai

# Start server & pull models
ollama serve
ollama pull llama3.2
ollama pull nomic-embed-text

# Update .env
AI_PROVIDER=ollama
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Postman Collection
Import `backend/CodeQ-API.postman_collection.json` into Postman for ready-to-use requests.

---

### Health & Status

#### GET `/health`
Check API status and AI provider info.

**Response:**
```json
{
  "status": "ok",
  "message": "Codebase Q&A API is running",
  "aiProvider": {
    "provider": "ollama",
    "name": "Ollama (Local)",
    "isConfigured": true
  }
}
```

#### GET `/provider`
Get current AI provider configuration.

**Response:**
```json
{
  "provider": "ollama",
  "name": "Ollama (Local)",
  "chatModel": "llama3.2",
  "embeddingModel": "nomic-embed-text",
  "isConfigured": true
}
```

---

### Upload Endpoints

#### POST `/upload/github`
Clone and index a GitHub repository.

**Request:**
```json
{
  "repoUrl": "https://github.com/expressjs/express"
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Repository cloned and indexed successfully",
  "stats": {
    "totalFiles": 142,
    "totalChunks": 1250,
    "languages": ["javascript", "markdown", "json"]
  }
}
```

#### POST `/upload/zip`
Upload a ZIP file.

**Request:** `multipart/form-data`
- `codebase`: ZIP file

**Response:** Same as GitHub upload

#### POST `/upload/direct`
Upload files as JSON (for small codebases).

**Request:**
```json
{
  "projectName": "My Project",
  "files": [
    { "path": "src/index.js", "content": "console.log('Hello');" },
    { "path": "README.md", "content": "# My Project" }
  ]
}
```

---

### Q&A Endpoints

#### POST `/qa/ask`
Ask a question about the codebase.

**Request:**
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "How does the routing system work?",
  "options": {
    "language": "javascript",
    "folder": "lib"
  }
}
```

**Response:**
```json
{
  "success": true,
  "answer": "The routing system in Express works through...",
  "references": [
    {
      "file": "lib/router/index.js",
      "fileName": "index.js",
      "startLine": 45,
      "endLine": 95,
      "language": "javascript",
      "similarity": 87,
      "preview": "..."
    }
  ],
  "confidence": "high",
  "relevantFiles": ["lib/router/index.js", "lib/router/route.js"],
  "provider": "Ollama (Local)"
}
```

#### GET `/qa/suggestions/:projectId`
Get suggested questions.

**Response:**
```json
{
  "success": true,
  "suggestions": [
    "What is the overall architecture of this codebase?",
    "Where is authentication handled?",
    "What are the main entry points?"
  ]
}
```

#### POST `/qa/explain-file`
Get AI explanation of a file.

**Request:**
```json
{
  "projectId": "...",
  "filePath": "lib/router/index.js"
}
```

---

### Project Endpoints

#### GET `/project/:projectId/stats`
Get project statistics.

#### GET `/project/:projectId/files`
List all files. Query params: `language`, `folder`

#### GET `/project/:projectId/folders`
Get folder structure.

#### GET `/project/:projectId/file?path=...`
Get specific file content.

#### DELETE `/project/:projectId`
Delete project (memory + disk).

---

### Storage Management

#### GET `/project/storage/usage`
Get disk usage statistics.

**Response:**
```json
{
  "success": true,
  "usage": {
    "projects": {
      "count": 3,
      "totalSize": 52428800,
      "totalSizeFormatted": "50 MB"
    },
    "uploads": {
      "count": 1,
      "totalSizeFormatted": "10 MB"
    },
    "totalSizeFormatted": "60 MB"
  }
}
```

#### DELETE `/project/storage/cleanup`
Delete ALL projects and uploads.

---

## 🎨 Frontend Documentation

### Tech Stack

- **Angular 17** - Standalone components
- **Signals** - Reactive state management
- **SCSS** - Custom styling with CSS variables
- **RxJS** - HTTP and async operations

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| `AppComponent` | `app.component.ts` | Main layout, theme toggle |
| `UploadComponent` | `components/upload/` | GitHub URL & ZIP upload |
| `ChatComponent` | `components/chat/` | Q&A interface with references |
| `FileBrowserComponent` | `components/file-browser/` | File tree navigation |

### Theming

The app supports **Dark** and **Light** themes:

- Toggle via sun/moon button in header
- Preference saved to `localStorage`
- Respects system preference on first visit

CSS variables are defined in `styles.scss`:
```scss
:root, [data-theme="dark"] { /* Dark theme */ }
[data-theme="light"] { /* Light theme */ }
```

### API Service

`api.service.ts` provides typed methods:

```typescript
// Upload
uploadZip(file: File): Observable<UploadResponse>
uploadGithub(repoUrl: string): Observable<UploadResponse>

// Q&A
askQuestion(projectId, question, options?): Observable<QAResponse>
getSuggestions(projectId): Observable<{ suggestions: string[] }>
explainFile(projectId, filePath): Observable<...>

// Project
getProjectStats(projectId): Observable<ProjectStats>
getProjectFiles(projectId, language?, folder?): Observable<FileInfo[]>
getProjectFolders(projectId): Observable<FolderInfo[]>
deleteProject(projectId): Observable<void>

// Provider
getProviderInfo(): Observable<ProviderInfo>
```

---

## 🧹 Storage Management

Projects are stored in `backend/projects/` and uploads in `backend/uploads/`.

### Cleanup Options

**1. Via API:**
```bash
# Check usage
curl http://localhost:3000/api/project/storage/usage

# Delete all
curl -X DELETE http://localhost:3000/api/project/storage/cleanup
```

**2. Via Script:**
```bash
cd backend
npm run cleanup
```

**3. Manual:**
```bash
rm -rf backend/projects/*
rm -rf backend/uploads/*
```

---

## 📁 Supported File Types

| Type | Extensions |
|------|------------|
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Markdown | `.md` |
| JSON | `.json` |
| HTML | `.html` |
| CSS | `.css`, `.scss` |

---

## 🚧 Production Considerations

This is a **Proof of Concept**. For production:

1. **Vector Database** - Replace in-memory store with Pinecone, Weaviate, or ChromaDB
2. **Authentication** - Add user auth and project ownership
3. **Rate Limiting** - Implement API rate limits
4. **Caching** - Cache embeddings and frequent queries
5. **File Storage** - Use cloud storage (S3, GCS)
6. **Database** - Add persistent storage for projects

---

## 📄 License

MIT License - feel free to use and modify.

---

<div align="center">

Built with ❤️ using **Angular** + **Node.js** + **AI**

[Report Bug](../../issues) • [Request Feature](../../issues)

</div>
