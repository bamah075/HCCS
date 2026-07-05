// Merges two PDF buffers into one: Document A's pages first, then the
// standard document's pages appended. Produces "Document C" for the admin
// panel's compliance_document history — never shown to the public user.

import "server-only";
import { PDFDocument } from "pdf-lib";

export async function mergePdfBuffers(documentABuffer: Buffer, documentBBuffer: Buffer): Promise<Buffer> {
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
