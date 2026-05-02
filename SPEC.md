# vokabeltest-app3 v1.2 — Backend Fixes Applied

## Overview

A vocabulary learning application that uses AI to extract vocabulary from photos of English textbook pages, store them in SQLite, and provide quiz-based practice. This iteration refreshes the pipeline around two backend constraints: a strict `4 MB` upload limit and a functional `30 s` timeout for KI extraction requests.

## Technical Requirements

### Stack
- **Backend:** Express.js (Node.js) + SQLite
- **Frontend:** React + Vite
- **AI Integration:** Support for Claude, OpenAI, and Gemini APIs
- **Image Processing:** Photo upload and AI-powered text extraction

### Key Features

1. **API Key Management (Web UI)**
   - User provides API keys for Claude, OpenAI, or Gemini
   - Keys stored **session-only** (not persisted to database)
   - Selection of preferred provider

2. **Photo Upload & AI Extraction**
   - Upload image of English textbook page
   - Send to selected AI provider via API
   - Extract vocabulary terms and definitions
   - Validate extraction quality
   - Reject payloads larger than `4 MB`
   - Abort upstream KI extraction requests after `30 s`

3. **Vocabulary Database**
   - Store extracted vocabulary (term, definition, source, timestamp)
   - SQLite persistence
   - CRUD API endpoints

4. **Testing Module**
   - Interactive quiz interface
   - Randomized vocabulary from database
   - Score tracking (in-session)

## API Endpoints

### Backend Routes

```
POST   /api/extract       - Submit image for vocabulary extraction
GET    /api/vocab         - List all stored vocabulary
POST   /api/vocab         - Add new vocabulary entry
PUT    /api/vocab/:id     - Update vocabulary entry
DELETE /api/vocab/:id     - Delete vocabulary entry
GET    /api/test/random   - Get random vocabulary for testing
GET    /health            - Health check
```

## Deployment

- **Port:** 3120
- **PM2 Configuration:** Standard node deployment
- **Environment:** Production deployment

## Acceptance Criteria

- [x] Spec complete and reviewed
- [ ] Build: Backend enforces `4 MB` upload limit and `30 s` KI extraction timeout
- [ ] Verify: `npm audit` passes and runtime smoke checks stay green on port `3120`
- [ ] Review: Code gate passed
- [ ] Deploy: GitHub push successful, PM2 deployment live on port 3120
- [ ] Report: Pipeline artifacts complete, status = completed

## Notes

- API keys are session-based only (no persistence)
- Image upload size limit: 4MB
- AI extraction timeout: 30s per request
- SQLite database: stored in `data/vocab.db`
- This start run is a pipeline refresh for iteration `v1.2`, not a greenfield scaffold
