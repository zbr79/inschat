# Phase 1: Document support

Status: implemented on 2026-09-13.

## What is included

InsChat can attach up to three documents to a message:

- `.txt`
- `.pdf`
- `.docx`
- `.xlsx`

The composer shows the filename, file size, upload progress, processing
errors, and a remove button. Documents can be sent without additional text.
The same flow is available on the main chat and OpenCode chat pages.

## Processing flow

1. The browser uploads selected files as multipart form data to
   `POST /api/documents`.
2. The Node.js route validates the extension, MIME type, file size, and file
   count.
3. The server extracts text:
   - TXT: UTF-8 line ranges.
   - PDF: page ranges.
   - DOCX: paragraph ranges.
   - XLSX: worksheet and row ranges.
4. The route returns a `DocumentAttachment` containing the display metadata,
   bounded extracted text, and source locators.
5. The attachment is stored with the user message for guest local sessions
   and authenticated MongoDB sessions.
6. `lib/opencode.ts` injects the labeled extracted text into the existing
   OpenAI-compatible message content. Binary document data is never sent to
   the model.

## Limits

| Limit | Value |
|---|---:|
| Documents per message | 3 |
| Maximum file size | 12 MB |
| Maximum extracted text per document | 80,000 characters |
| Maximum extracted text per message | 160,000 characters |
| Maximum source block | 24,000 characters |
| Maximum source locators per document | 400 |

These limits protect request size, browser storage, model context, and parser
runtime. A file that contains no readable text is rejected without sending the
chat message.

## Citation behavior

Extracted text is labeled with source headers such as:

- `[report.pdf — Page 2]`
- `[notes.docx — Paragraph 4]`
- `[budget.xlsx — Sheet1, row 7]`
- `[notes.txt — Lines 1-80]`

The system prompt instructs the model to cite the exact header when making a
document-based claim. The user message also retains the source metadata so it
survives chat reloads.

This phase does not perform OCR. Scanned or image-only PDFs may be rejected as
having no readable text.

## Files and endpoints

- `app/api/documents/route.ts`: multipart upload and extraction endpoint.
- `lib/documents/extract.ts`: format dispatch and source extraction.
- `lib/documents/limits.ts`: shared server/client limits.
- `lib/documents/types.ts`: document and source types.
- `lib/documentUpload.ts`: browser upload with progress reporting.
- `components/DocumentPicker.tsx`: composer picker and document chips.
- `components/Composer.tsx`: sends document attachments with the message.

## Verification completed

- `npm run build` passes.
- Local `POST /api/documents` extraction checks passed for TXT line ranges, PDF
  page references, DOCX paragraph references, and XLSX worksheet/row
  references.
- Mixed valid/invalid selections preserve valid documents and report the
  invalid file without discarding the batch.
- Guest mobile-width browser check displayed the document picker and processed
  filename chip.
- Public `POST https://inschat.renstoolbox.com/api/documents` returned HTTP 200
  with extracted PDF text after adding the nginx proxy route.
- Public mobile browser upload displayed the PDF chip without horizontal
  overflow.
- PM2 restarted only `inschat`, and the production app route returned HTTP 200
  after the build.

## Follow-up work

- Add OCR for scanned PDFs.
- Add a durable attachment store if message-embedded extracted text becomes too
  large.
- Revisit the spreadsheet parser dependency after a maintained security fix
  is available.
- Add richer citation rendering that links answer citations back to document
  source blocks.
