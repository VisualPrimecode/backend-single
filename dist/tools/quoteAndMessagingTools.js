"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendEmailTool = exports.GeneratePdfInvoiceTool = void 0;
const tools_1 = require("@langchain/core/tools");
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdf_lib_1 = require("pdf-lib");
const zod_1 = require("zod");
const GeneratePdfInvoiceToolInputSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        product: zod_1.z.string(),
        quantity: zod_1.z.number().optional(),
        price_per_unit: zod_1.z.number().optional(),
    })),
    subtotal: zod_1.z.number(),
    tax: zod_1.z.number(),
    total: zod_1.z.number(),
    customerEmail: zod_1.z.string().email().optional(),
    // You might want to pass business name, customer name here for the PDF itself
    // businessName: z.string().optional(),
    // customerNameToDisplay: z.string().optional(),
});
class GeneratePdfInvoiceTool extends tools_1.Tool {
    // schema = GeneratePdfInvoiceToolInputSchema; // If using structured input directly
    constructor() {
        super();
        this.name = "generatePdfInvoice";
        this.description = "Accepts a quote JSON object (output from adaptiveQuote tool usually) and returns a Base64-encoded PDF string.";
    }
    async _call(textOrObject) {
        if (!textOrObject) {
            throw new Error("generatePdfInvoice: no input provided");
        }
        let quote;
        try {
            const data = typeof textOrObject === 'string' ? JSON.parse(textOrObject) : textOrObject;
            quote = GeneratePdfInvoiceToolInputSchema.parse(data);
        }
        catch (err) {
            throw new Error(`generatePdfInvoice: invalid JSON or schema mismatch: ${err.message}. Input received: ${JSON.stringify(textOrObject)}`);
        }
        // Actual PDF generation
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        let page = pdfDoc.addPage([612, 792]); // Standard US Letter
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        let yPosition = height - 50;
        const margin = 50;
        const contentWidth = width - 2 * margin;
        page.drawText("INVOICE", { x: margin, y: yPosition, font: boldFont, size: 24 });
        yPosition -= 30;
        // Add more details like invoice number, date, business address, customer address if available in `quote`
        page.drawText(`To: ${quote.customerEmail || "Valued Customer"}`, { x: margin, y: yPosition, font, size: 12 });
        yPosition -= 40;
        // Table Header
        page.drawText("Product/Service", { x: margin, y: yPosition, font: boldFont, size: 10 });
        page.drawText("Qty", { x: margin + contentWidth * 0.5, y: yPosition, font: boldFont, size: 10 });
        page.drawText("Unit Price", { x: margin + contentWidth * 0.65, y: yPosition, font: boldFont, size: 10 });
        page.drawText("Total", { x: margin + contentWidth * 0.85, y: yPosition, font: boldFont, size: 10 });
        yPosition -= 20;
        quote.items.forEach(item => {
            if (yPosition < margin + 50) { // Add new page if not enough space
                page = pdfDoc.addPage([612, 792]);
                yPosition = height - margin;
            }
            const itemQty = item.quantity ?? 1;
            const itemPrice = item.price_per_unit ?? 0;
            const lineTotal = itemQty * itemPrice;
            page.drawText(item.product, { x: margin, y: yPosition, font, size: 10, maxWidth: contentWidth * 0.45 });
            page.drawText(itemQty.toString(), { x: margin + contentWidth * 0.5, y: yPosition, font, size: 10 });
            page.drawText(itemPrice.toFixed(2), { x: margin + contentWidth * 0.65, y: yPosition, font, size: 10 });
            page.drawText(lineTotal.toFixed(2), { x: margin + contentWidth * 0.85, y: yPosition, font, size: 10 });
            yPosition -= 15;
        });
        yPosition -= 10; // Gap before totals
        if (yPosition < margin + 100) { /* new page logic */ }
        page.drawText(`Subtotal:`, { x: margin + contentWidth * 0.65, y: yPosition, font, size: 10 });
        page.drawText(`${quote.subtotal.toFixed(2)}`, { x: margin + contentWidth * 0.85, y: yPosition, font: boldFont, size: 10 });
        yPosition -= 15;
        page.drawText(`Tax:`, { x: margin + contentWidth * 0.65, y: yPosition, font, size: 10 });
        page.drawText(`${quote.tax.toFixed(2)}`, { x: margin + contentWidth * 0.85, y: yPosition, font: boldFont, size: 10 });
        yPosition -= 20;
        page.drawText(`TOTAL:`, { x: margin + contentWidth * 0.65, y: yPosition, font: boldFont, size: 12 });
        page.drawText(`${quote.total.toFixed(2)}`, { x: margin + contentWidth * 0.85, y: yPosition, font: boldFont, size: 12 });
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes).toString("base64");
    }
}
exports.GeneratePdfInvoiceTool = GeneratePdfInvoiceTool;
const SendEmailToolInputSchema = zod_1.z.object({
    to: zod_1.z.string().email(),
    subject: zod_1.z.string(),
    body: zod_1.z.string(), // HTML body
    pdfBase64: zod_1.z.string(), // Base64 encoded PDF
    filename: zod_1.z.string(),
    businessId: zod_1.z.string(), // Injected by executor
    customerId: zod_1.z.string(), // Injected by executor
});
class SendEmailTool extends tools_1.Tool {
    // schema = SendEmailToolInputSchema; // For structured input
    constructor() {
        super();
        this.name = "sendEmail";
        this.description = "Sends an email with a Base64 PDF attachment. Input must be valid JSON with keys { to, subject, body, pdfBase64, filename }. businessId and customerId are injected.";
    }
    async _call(input) {
        if (!input) {
            throw new Error("sendEmail: no input provided");
        }
        let params;
        try {
            const data = typeof input === 'string' ? JSON.parse(input) : input;
            params = SendEmailToolInputSchema.parse(data);
        }
        catch (err) {
            throw new Error(`sendEmail: invalid JSON or schema mismatch: ${err.message}. Input received: ${JSON.stringify(input)}`);
        }
        // IMPORTANT: Configure your Nodemailer transporter
        // This is a placeholder - use environment variables for sensitive data
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST, // e.g., 'smtp.example.com'
            port: parseInt(process.env.SMTP_PORT || "587"), // e.g., 587 or 465
            secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER, // your SMTP username
                pass: process.env.SMTP_PASS, // your SMTP password
            },
        });
        try {
            await transporter.sendMail({
                from: `"${(params.subject.split('from ')[1] || 'Your Business').replace(/[^a-zA-Z0-9\s]/g, '')}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`, // e.g. "Invoice from ACME" <noreply@acme.com>
                to: params.to,
                subject: params.subject,
                html: params.body, // Use html for better formatting
                attachments: [
                    {
                        filename: params.filename,
                        content: Buffer.from(params.pdfBase64, "base64"),
                        contentType: "application/pdf",
                    },
                ],
            });
            // TODO: Log email sending (params.businessId, params.customerId)
            return `Email successfully sent to ${params.to} with subject "${params.subject}".`;
        }
        catch (error) {
            console.error("SendEmailTool Error:", error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}
exports.SendEmailTool = SendEmailTool;
