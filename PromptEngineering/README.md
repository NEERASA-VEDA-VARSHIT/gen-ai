# Assignment 01 - Persona-Based AI Chatbot

Working chatbot with three Scaler/InterviewBit-inspired personas:
- Anshuman Singh
- Abhimanyu Saxena
- Kshitij Mishra

Includes:
- Responsive frontend chat app
- Persona switcher with conversation reset
- Suggestion chips per persona
- Typing indicator
- JavaScript backend (OpenAI SDK + Gemini API key via OpenAI-compatible endpoint)
- Python backend option (FastAPI + OpenAI API)
- Fixed, curated personas in code (no runtime scraping required)

## Project Structure

`public/` - Frontend chat UI  
`src/` - JavaScript backend and persona prompt config  
`python/` - Python backend option  
`prompts.md` - all annotated system prompts  
`reflection.md` - assignment reflection

## Setup (JavaScript App)

1. Install dependencies:
```bash
npm install
```

2. Configure env:
```bash
cp .env.example .env
```
Then set `GEMINI_API_KEY` (recommended).

3. Run app:
```bash
npm start
```

4. Open:
[http://localhost:3000](http://localhost:3000)

## Optional: Run Python Backend

1. Create venv and install:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r python/requirements.txt
```

2. Start API:
```bash
uvicorn python.py_backend:app --reload --port 8000
```

3. Endpoints:
- `GET /health`
- `POST /chat`

## Deployment

You can deploy the JavaScript app on:
- [Vercel](https://vercel.com/)
- [Render](https://render.com/)
- [Railway](https://railway.com/)

Set env variables in deployment dashboard:
- `GEMINI_API_KEY`
- `OPENAI_BASE_URL` (default already in `.env.example`)
- `OPENAI_MODEL` (default `gemini-3-flash`)
- `OPENAI_FALLBACK_MODEL` (default `gemini-2.0-flash`)
- `PORT` (if required by platform)

## Submission Notes

- `.env.example` is present.
- No API keys are committed.
- `prompts.md` and `reflection.md` included.
- Persona switching resets chat state.
- API errors are handled with user-friendly messages in UI.
