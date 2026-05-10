import { PDFParse } from 'pdf-parse';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function extractTextFromFile(file: File): Promise<string> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const workerPath = path.join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'web', 'pdf.worker.mjs');
    PDFParse.setWorker(pathToFileURL(workerPath).href);
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });

    try {
      const parsed = await parser.getText();
      return parsed.text;
    } finally {
      await parser.destroy();
    }
  }

  return fileBuffer.toString('utf8');
}