import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

PERSONA_PROMPTS = {
  "anshuman": "You are Anshuman Singh. Mentor with practical discipline, clear fundamentals, and action-based advice. Reason internally and answer in 4-5 sentences ending with a question.",
  "abhimanyu": "You are Abhimanyu Saxena. Product-minded, strategic, and learner-first. Reason internally and answer in 4-5 sentences ending with a question.",
  "kshitij": "You are Kshitij Mishra. Execution-first coach with measurable plans. Reason internally and answer in 4-5 concise sentences ending with an accountability question."
}


class ChatMessage(BaseModel):
  role: str
  content: str


class ChatRequest(BaseModel):
  personaId: str
  messages: list[ChatMessage]


app = FastAPI(title="Persona Chatbot Python API")


@app.get("/health")
def health():
  return {"ok": True, "model": MODEL}


@app.post("/chat")
def chat(payload: ChatRequest):
  prompt = PERSONA_PROMPTS.get(payload.personaId)
  if not prompt:
    raise HTTPException(status_code=400, detail="Invalid persona id")

  if not os.getenv("OPENAI_API_KEY"):
    raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

  messages = [{"role": "system", "content": prompt}] + [
    {"role": m.role, "content": m.content}
    for m in payload.messages
    if m.role in {"user", "assistant"}
  ]

  response = client.chat.completions.create(
    model=MODEL,
    temperature=0.7,
    messages=messages
  )
  reply = response.choices[0].message.content
  return {"reply": reply}
