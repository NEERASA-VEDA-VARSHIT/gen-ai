import { NextResponse } from 'next/server';
import { generateGeminiAnswer } from '@/lib/gemini';
import { buildGroundedPrompt } from '@/lib/rag/prompt';
import { createEmbedding } from '@/lib/rag/embed';
import { retrieveTopChunks } from '@/lib/rag/retrieve';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = String(body.question ?? '').trim();
    const documentId = String(body.documentId ?? '').trim();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required. Upload a document first.' }, { status: 400 });
    }

    const questionEmbedding = await createEmbedding(question);
    const chunks = await retrieveTopChunks(documentId, questionEmbedding, 5);
    const prompt = buildGroundedPrompt(question, chunks);
    const answer = await generateGeminiAnswer(prompt);

    return NextResponse.json({
      answer,
      sources: chunks
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}