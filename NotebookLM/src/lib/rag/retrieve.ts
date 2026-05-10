import { getSupabaseClient } from '../supabase';
import type { RetrievedChunk } from './prompt';

export async function retrieveTopChunks(documentId: string, queryEmbedding: number[], limit = 5): Promise<RetrievedChunk[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_document_id: documentId,
    match_threshold: 0.2,
    match_count: limit
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RetrievedChunk[];
}