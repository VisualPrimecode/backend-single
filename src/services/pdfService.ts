// src/services/pdfService.ts

import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

export const generatePDFQuote = async ({
  items,
  total,

}: {
  items: { product: string; quantity: number; unitPrice: number; total: number }[];
  total: number;

}): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: any[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.fontSize(18).text("Quote Summary", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text("Product Details:");
    doc.moveDown(0.5);

    // Table header
    doc.font("Helvetica-Bold");
    doc.text("Product", { continued: true, width: 120 });
    doc.text("Qty", { continued: true, width: 50 });
    doc.text("Unit Price", { continued: true, width: 80 });
    doc.text("Total", { width: 80 });
    doc.moveDown(0.5);

    doc.font("Helvetica");
    items.forEach(item => {
      doc.text(item.product, { continued: true, width: 120 });
      doc.text(item.quantity.toString(), { continued: true, width: 50 });
      doc.text(`$${item.unitPrice.toLocaleString()}`, { continued: true, width: 80 });
      doc.text(`$${item.total.toLocaleString()}`, { width: 80 });
    });

    doc.moveDown(1);
    doc.font("Helvetica-Bold").text(`Grand Total: $${total.toLocaleString()}`);


    doc.end();
  });
};