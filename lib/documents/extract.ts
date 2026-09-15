import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_SOURCE_TEXT,
  MAX_DOCUMENT_SOURCES,
  MAX_DOCUMENT_TEXT,
} from "./limits";
import type { DocumentSource, ExtractedDocument } from "./types";

export class DocumentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

function extensionOf(name: string): string {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  return DOCUMENT_EXTENSIONS.has(extension) ? extension : "";
}

function mimeFor(name: string, mimeType: string): string {
  if (mimeType && (Object.hasOwn(DOCUMENT_TYPES, mimeType) || mimeType === "text/plain")) {
    return mimeType;
  }
  const extension = extensionOf(name);
  const match = Object.entries(DOCUMENT_TYPES).find(([, value]) => value === extension);
  return match?.[0] ?? "";
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();
}

function makeSource(locator: string, label: string, text: string): DocumentSource | null {
  const cleaned = cleanText(text).slice(0, MAX_DOCUMENT_SOURCE_TEXT);
  return cleaned ? { locator, label, text: cleaned } : null;
}

function withDocumentLabels(name: string, sources: DocumentSource[]): ExtractedDocument {
  const boundedSources: DocumentSource[] = [];
  let used = 0;
  for (const source of sources) {
    if (boundedSources.length >= MAX_DOCUMENT_SOURCES || used >= MAX_DOCUMENT_TEXT) break;
    const header = `[${name} — ${source.label}]\n`;
    const remaining = MAX_DOCUMENT_TEXT - used - header.length;
    if (remaining <= 0) break;
    const text = source.text.slice(0, remaining).trim();
    if (!text) continue;
    boundedSources.push({ ...source, text });
    used += header.length + text.length + 2;
  }
  const text = boundedSources
    .map((source) => `[${name} — ${source.label}]\n${source.text}`)
    .join("\n\n");
  return { text, sources: boundedSources };
}

function extractText(name: string, buffer: Uint8Array): ExtractedDocument {
  const raw = Buffer.from(buffer).toString("utf8");
  const lines = cleanText(raw).split("\n");
  const sources: DocumentSource[] = [];
  for (let index = 0; index < lines.length; index += 80) {
    const source = makeSource(
      `L${index + 1}-L${Math.min(index + 80, lines.length)}`,
      `Lines ${index + 1}-${Math.min(index + 80, lines.length)}`,
      lines.slice(index, index + 80).join("\n")
    );
    if (source) sources.push(source);
  }
  return withDocumentLabels(name, sources);
}

async function extractPdf(name: string, buffer: Uint8Array): Promise<ExtractedDocument> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const pages = (result as { pages?: Array<{ text?: string }> }).pages;
    const pageTexts =
      pages?.length
        ? pages.map((page) => page.text ?? "")
        : result.text.split(/\f/);
    const sources = pageTexts
      .map((text, index) => makeSource(`P${index + 1}`, `Page ${index + 1}`, text))
      .filter((source): source is DocumentSource => Boolean(source));
    return withDocumentLabels(name, sources);
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(name: string, buffer: Uint8Array): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const paragraphs = cleanText(result.value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sources = paragraphs
    .map((paragraph, index) =>
      makeSource(`PARA${index + 1}`, `Paragraph ${index + 1}`, paragraph)
    )
    .filter((source): source is DocumentSource => Boolean(source));
  return withDocumentLabels(name, sources);
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as { result?: unknown; text?: unknown };
    if (record.result !== undefined) return cellValue(record.result);
    if (record.text !== undefined) return cellValue(record.text);
  }
  return String(value);
}

async function extractXlsx(name: string, buffer: Uint8Array): Promise<ExtractedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer) as any);
  const sources: DocumentSource[] = [];
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as unknown[];
      const cells = values
        .slice(1)
        .map(cellValue)
        .map((value) => value.trim())
        .filter(Boolean);
      const source = makeSource(
        `SHEET:${worksheet.name}:R${rowNumber}`,
        `${worksheet.name}, row ${rowNumber}`,
        cells.join(" | ")
      );
      if (source) sources.push(source);
    });
  }
  return withDocumentLabels(name, sources);
}

export async function extractDocument(
  name: string,
  mimeType: string,
  buffer: Uint8Array
): Promise<ExtractedDocument> {
  const mime = mimeFor(name, mimeType);
  if (!mime) {
    throw new DocumentExtractionError("Unsupported document type.");
  }
  try {
    if (mime === "text/plain") return extractText(name, buffer);
    if (mime === "application/pdf") return extractPdf(name, buffer);
    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return extractDocx(name, buffer);
    }
    return extractXlsx(name, buffer);
  } catch (error) {
    if (error instanceof DocumentExtractionError) throw error;
    throw new DocumentExtractionError(
      error instanceof Error ? `Could not read ${name}.` : `Could not read ${name}.`
    );
  }
}
