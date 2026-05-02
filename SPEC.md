# vokabeltest-app3 — Advanced Vocabulary Learning Platform

## Overview

A sophisticated vocabulary learning application that leverages AI to extract vocabulary from photographs of English textbook pages, store them in a database, and provide interactive testing capabilities.

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

- **Port:** 3115
- **PM2 Configuration:** Standard node deployment
- **Environment:** Production deployment (real PM2, not dry-run)

## Acceptance Criteria

- [x] Spec complete and reviewed
- [ ] Build: npm install, npm run build successful
- [ ] Verify: All tests passing, health check OK, API endpoints functional
- [ ] Review: Code gate passed
- [ ] Deploy: GitHub push successful, PM2 deployment live on port 3115
- [ ] Report: Pipeline artifacts complete, status = completed

## Notes

- API keys are session-based only (no persistence)
- Image upload size limit: 5MB
- AI extraction timeout: 30s per request
- SQLite database: stored in `data/vocab.db`
