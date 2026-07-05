// Merges two PDF buffers into one: Document A's pages first, then
// Document B's pages appended. Used to produce "Document C" — the standard
// compliance report plus a staff-attached supplementary review, combined.

import "server-only";
import { PDFDocument } from "pdf-lib";

export async function mergePdfBuffers(documentABuffer, documentBBuffer) {
    const merged = await PDFDocument.create();

    const docA = await PDFDocument.load(documentABuffer);
    const docAPages = await merged.copyPages(docA, docA.getPageIndices());
    docAPages.forEach((page) => merged.addPage(page));

    const docB = await PDFDocument.load(documentBBuffer);
    const docBPages = await merged.copyPages(docB, docB.getPageIndices());
    docBPages.forEach((page) => merged.addPage(page));

    const bytes = await merged.save();
    return Buffer.from(bytes);
}
