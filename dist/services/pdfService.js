"use strict";
// src/services/pdfService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFQuote = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const buffer_1 = require("buffer");
const generatePDFQuote = async ({ items, total, }) => {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40 });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(buffer_1.Buffer.concat(chunks)));
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
exports.generatePDFQuote = generatePDFQuote;
