// Lädt ein PDF im Browser und erkennt das Grobprogramm.
import { extractPages } from './extract'
import { parseProgram, type ParseResult } from './ecamp'

export async function programFromPdf(file: File): Promise<ParseResult> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise
  try {
    const pages = await extractPages(doc, pdfjs.OPS as unknown as Record<string, number>)
    return parseProgram(pages)
  } finally {
    await doc.destroy()
  }
}
