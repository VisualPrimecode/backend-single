"use strict";
// Filename: src/openaiHelper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnswerFromOpenAI = void 0;
const openai_1 = require("@langchain/openai");
const redis_1 = __importDefault(require("../config/redis"));
// Assuming fetchContextMemory and getMessageMemory are correctly imported elsewhere
// For this example, I'll use the mock structure you had if not fully defined.
const fetchContextMemory_1 = require("../services/fetchContextMemory");
const getMessageMemory_1 = require("../services/getMessageMemory");
const messages_1 = require("@langchain/core/messages");
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const agents_1 = require("langchain/agents");
const prompts_1 = require("@langchain/core/prompts");
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const cloudinary_1 = require("cloudinary");
const pdfmake_1 = __importDefault(require("pdfmake"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const quoteLog_model_1 = __importDefault(require("../models/quoteLog.model"));
// --- Custom Error Classes ---
class AppError extends Error {
    constructor(message, cause, context) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
        this.context = context;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
class RedisOperationError extends AppError {
}
class LLMInvocationError extends AppError {
}
class ContextFetchingError extends AppError {
}
class ToolExecutionError extends AppError {
}
// --- Logger Setup ---
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});
// --- Utility ---
const sanitizeInput = (input) => input?.replace(/[<>{}]/g, "").replace(/\n+/g, " ").trim() || "";
const sanitizeFilename = (name) => name.replace(/[\s\/\\?%*:|"<>]/g, '_');
// --- Cloudinary Configuration & Upload ---
if (process.env.CLOUDINARY_URL) {
    cloudinary_1.v2.config();
}
else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET, secure: true,
    });
}
else {
    logger.warn("Cloudinary credentials are not fully configured. Uploads will likely fail.");
}
async function uploadPdfToCloudinary(localFilePath, fileName, operationId) {
    if (!cloudinary_1.v2.config().cloud_name) {
        const errorMsg = "Cloudinary service is not configured for uploads.";
        logger.error({ operationId, localFilePath }, errorMsg);
        throw new Error(errorMsg);
    }
    try {
        const publicIdForUpload = fileName.replace(/\.pdf$/i, ''); // Keep this as is
        logger.info({ operationId, localFilePath, fileName }, "Attempting to upload PDF to Cloudinary.");
        const result = await cloudinary_1.v2.uploader.upload(localFilePath, {
            folder: 'ai-generated-quotes',
            public_id: publicIdForUpload, // public_id without extension
            resource_type: 'raw',
            format: 'pdf', // <--- ADD THIS LINE: Explicitly tell Cloudinary the format
            overwrite: true,
        });
        logger.info({ operationId, secure_url: result.secure_url }, "PDF successfully uploaded to Cloudinary.");
        try {
            fs_1.default.unlinkSync(localFilePath);
            logger.info({ operationId, localFilePath }, "Local PDF file deleted.");
        }
        catch (unlinkError) {
            logger.warn({ operationId, localFilePath, error: unlinkError.message }, "Failed to delete local PDF.");
        }
        return result.secure_url;
    }
    catch (error) {
        logger.error({ operationId, error: error.message, localFilePath }, 'Cloudinary upload failed');
        throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
    }
}
// --- Database Logging Function (Ensuring totalAmount is handled) ---
async function logPdfQuoteToDb(logData) {
    try {
        const payloadForDb = {
            customerId: logData.customerId,
            customerName: logData.customerName,
            businessId: logData.businessId,
            operationId: logData.operationId,
            status: logData.status,
            currency: logData.currency || 'USD',
            pdfLocalPath: logData.pdfLocalPath,
            pdfCloudinaryUrl: logData.pdfCloudinaryUrl, // This will log the URL passed to the email tool
            errorMessage: logData.errorMessage,
            emailSentTo: logData.emailSentTo,
            totalAmount: typeof logData.grandTotal === 'number' ? logData.grandTotal : 0,
        };
        if (logData.lineItems && logData.lineItems.length > 0) {
            payloadForDb.productName = logData.lineItems[0].description;
            payloadForDb.quantity = logData.lineItems[0].quantity || 1;
        }
        else {
            payloadForDb.productName = logData.quoteTitle || "N/A";
            payloadForDb.quantity = 0;
        }
        const newLog = new quoteLog_model_1.default(payloadForDb);
        await newLog.save();
    }
    catch (error) {
        logger.error({ error: error.message, logData }, "Failed to log PDF quote to database");
        throw new AppError("Database logging failed", error, { logData });
    }
}
// --- PDF Generation Tool Logic (Manual Font File Paths) ---
async function generatePdfQuoteToolLogic(toolInput, customerName, business, operationId, customerId) {
    const { lineItems, customerNotes, quoteTitle } = toolInput;
    logger.info({ operationId, lineItemsCount: lineItems.length, customerName, businessId: business._id.toString(), customerId }, "generatePdfQuoteToolLogic (flexible with manual fonts) invoked");
    const baseLogData = {
        customerId, customerName, businessId: business._id.toString(),
        quoteTitle: quoteTitle || "Service Quote",
        lineItems: lineItems.map(item => ({
            ...item,
            description: item.description ?? "",
            totalPrice: item.totalPrice !== undefined ? item.totalPrice : 0,
        })),
        grandTotal: 0,
        operationId, status: 'failed_generation'
    };
    if (!lineItems || lineItems.length === 0) {
        const errorMsg = `ERROR_INVALID_INPUT: At least one line item is required to generate a quote.`;
        logger.warn({ ...baseLogData, returnedMessage: errorMsg }, "No line items provided.");
        await logPdfQuoteToDb({ ...baseLogData, errorMessage: "No line items." });
        return errorMsg;
    }
    let subTotal = 0;
    const tableBody = [
        [{ text: "Description", style: "tableHeader" }, { text: "Qty", style: "tableHeader", alignment: 'center' },
            { text: "Unit", style: "tableHeader", alignment: 'center' }, { text: "Unit Price", style: "tableHeader", alignment: 'right' },
            { text: "Total Price", style: "tableHeader", alignment: 'right' }],
    ];
    for (const item of lineItems) {
        const qty = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
        const unit = item.unit || (item.totalPrice && !item.unitPrice ? 'service' : 'item');
        let itemTotal = item.totalPrice;
        let unitP = item.unitPrice;
        if (item.unitPrice !== undefined && qty > 0) {
            itemTotal = qty * item.unitPrice;
        }
        else if (item.totalPrice === undefined && item.unitPrice !== undefined) {
            itemTotal = qty * (item.unitPrice || 0);
        }
        else if (item.totalPrice !== undefined && item.unitPrice === undefined && qty > 0 && item.totalPrice > 0) {
            unitP = item.totalPrice / qty;
        }
        else if (item.totalPrice === undefined && item.unitPrice === undefined) {
            const errorMsg = `ERROR_INVALID_INPUT: Line item "${item.description}" is missing essential pricing information (neither unitPrice nor totalPrice provided).`;
            logger.error({ ...baseLogData, itemDescription: item.description }, errorMsg);
            await logPdfQuoteToDb({ ...baseLogData, errorMessage: errorMsg, grandTotal: 0 });
            return errorMsg;
        }
        tableBody.push([item.description + (item.notes ? `\n${item.notes}` : ''), { text: qty.toString(), alignment: 'center' },
            { text: unit, alignment: 'center' }, { text: unitP !== undefined ? `$${unitP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A', alignment: 'right' },
            { text: `$${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, alignment: 'right' },
        ]);
        subTotal += itemTotal;
    }
    const resolvedVatRate = business.defaultVatRate ?? 0.0;
    const vatAmount = subTotal * resolvedVatRate;
    const grandTotal = subTotal + vatAmount;
    baseLogData.grandTotal = grandTotal;
    let projectRoot = __dirname;
    for (let i = 0; i < 5; i++) {
        if (fs_1.default.existsSync(path_1.default.join(projectRoot, 'package.json'))) {
            break;
        }
        const parent = path_1.default.dirname(projectRoot);
        if (parent === projectRoot) {
            projectRoot = path_1.default.join(__dirname, '..', '..');
            logger.warn({ operationId, fallbackPathUsed: projectRoot, dirname: __dirname }, "Could not find package.json. Using fallback for fonts path.");
            break;
        }
        projectRoot = parent;
    }
    const fontsDir = path_1.default.join(projectRoot, 'public', 'fonts');
    logger.info({ operationId, resolvedFontsDir: fontsDir }, "Resolved fonts directory path for manual font loading.");
    const robotoPaths = {
        normal: path_1.default.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path_1.default.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path_1.default.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path_1.default.join(fontsDir, 'Roboto-MediumItalic.ttf')
    };
    for (const variantKey in robotoPaths) {
        const variant = variantKey;
        if (!fs_1.default.existsSync(robotoPaths[variant])) {
            const errorMsg = `ERROR_PDF_FONT_FILE_MISSING: Roboto font file for '${variant}' variant not found at ${robotoPaths[variant]}. Ensure TTF files are in '${fontsDir}'.`;
            logger.error({ operationId, missingFontPath: robotoPaths[variant], variant }, errorMsg);
            await logPdfQuoteToDb({ ...baseLogData, status: 'failed_generation', errorMessage: errorMsg });
            return errorMsg;
        }
    }
    const printer = new pdfmake_1.default({ Roboto: robotoPaths });
    const docDefinition = {
        content: [
            { text: quoteTitle || "Service Quote", style: "header" },
            { text: `Customer: ${sanitizeInput(customerName)}`, style: "subheader" },
            { text: `Date: ${new Date().toLocaleDateString()}`, style: "subheader" },
            { text: `Business: ${sanitizeInput(business.name || 'N/A')}`, style: "subheader" },
            { text: "\n" },
            { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body: tableBody, }, layout: 'lightHorizontalLines' },
            { text: "\n" },
            {
                columns: [{ width: "*", text: customerNotes ? `Notes:\n${customerNotes}` : "" },
                    {
                        width: "auto", table: {
                            body: [["Subtotal:", `$${subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                                [`VAT (${(resolvedVatRate * 100).toFixed(0)}%):`, `$${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                                [{ text: "Grand Total:", style: "bold" }, { text: `$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: "bold" }],
                            ],
                        }, layout: "noBorders",
                    },],
            },
        ],
        styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }, subheader: { fontSize: 12, margin: [0, 2, 0, 2] }, tableHeader: { bold: true, fontSize: 10, fillColor: '#eeeeee' }, bold: { bold: true }, },
        defaultStyle: { font: 'Roboto' }
    };
    let fileName = '';
    let filePath = '';
    try {
        logger.info({ operationId }, "Attempting to create PDF document with pdfmake using manual font file paths.");
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const quoteOutputDir = path_1.default.join(projectRoot, 'quotes');
        if (!fs_1.default.existsSync(quoteOutputDir)) {
            fs_1.default.mkdirSync(quoteOutputDir, { recursive: true });
        }
        const safeCustomerName = sanitizeFilename(customerName);
        const safeQuoteTitle = sanitizeFilename(quoteTitle || "Quote");
        fileName = `${safeQuoteTitle}_${safeCustomerName}_${Date.now()}.pdf`;
        filePath = path_1.default.join(quoteOutputDir, fileName);
        baseLogData.pdfLocalPath = filePath;
        await new Promise((resolve, reject) => {
            const stream = fs_1.default.createWriteStream(filePath);
            stream.on('error', (err) => { logger.error({ operationId, err: err.message, filePath }, "STREAM_ERROR_EVENT"); reject(new ToolExecutionError("Stream error", err, { filePath })); });
            stream.on('finish', () => { logger.info({ operationId, filePath }, "STREAM_FINISH_EVENT"); resolve(); });
            logger.info({ operationId, filePath }, "Piping pdfDoc to stream and calling end.");
            pdfDoc.pipe(stream);
            pdfDoc.end();
        });
        logger.info({ operationId }, "Local PDF save stream promise resolved.");
        await logPdfQuoteToDb({ ...baseLogData, status: 'generated_local' });
        let cloudinaryUrl = '';
        try {
            cloudinaryUrl = await uploadPdfToCloudinary(filePath, fileName, operationId);
            await logPdfQuoteToDb({ ...baseLogData, pdfCloudinaryUrl: cloudinaryUrl, status: 'uploaded_cloud' });
            // Ensure quoteTitle in the success message is the one used or a sensible default
            const finalQuoteTitle = quoteTitle || "Service Quote";
            const successMsg = `PDF_CLOUDINARY_URL:${cloudinaryUrl}:OK ${customerName}, I've prepared your quote titled "${finalQuoteTitle}". The PDF is available at the provided URL. I can email this link to you.`;
            logger.info({ operationId, returnedMessage: successMsg }, "PDF generated and uploaded successfully.");
            return successMsg;
        }
        catch (uploadError) {
            logger.error({ ...baseLogData, filePath, error: uploadError.message }, "Cloudinary upload failed.");
            await logPdfQuoteToDb({ ...baseLogData, status: 'failed_upload', errorMessage: `Cloudinary upload: ${uploadError.message}` });
            return `ERROR_UPLOAD_FAILED:PDF_GENERATED_FILENAME:${fileName}:OK ${customerName}, I generated the quote PDF ("${fileName}") but had trouble uploading it. Our team will look into it. The file is saved locally for now.`;
        }
    }
    catch (error) {
        const errorMsg = `ERROR_PDF_SAVE_PROCESS: I'm sorry, ${customerName}, I encountered an internal issue while trying to create or save the PDF document (details: ${error.message || 'Unknown PDF saving error'}). Our technical team has been alerted.`;
        logger.error({ ...baseLogData, error: error.message, returnedMessage: errorMsg, error_object: error }, "PDF generation/saving process failed.");
        await logPdfQuoteToDb({ ...baseLogData, status: 'failed_generation', errorMessage: `PDF save process: ${error.message}` });
        return errorMsg;
    }
}
// --- Zod Schemas for Tools ---
const flexiblePdfQuoteSchema = zod_1.z.object({
    lineItems: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string().describe("Detailed description of the product or service."),
        quantity: zod_1.z.number().positive().optional().default(1).describe("Quantity. Defaults to 1 if not applicable/specified."),
        unit: zod_1.z.string().optional().describe("Unit of measure (e.g., 'kg', 'hour', 'item', 'service')."),
        unitPrice: zod_1.z.number().nonnegative().optional().describe("Price per unit."),
        totalPrice: zod_1.z.number().nonnegative().describe("Total price for this line item. This is primary if unitPrice is missing for a service."),
        notes: zod_1.z.string().optional().describe("Any specific notes for this line item."),
    })).min(1).describe("An array of at least one line item for the quote."),
    customerNotes: zod_1.z.string().optional().describe("Overall notes for the customer on the quote."),
    quoteTitle: zod_1.z.string().optional().default("Service Quote").describe("A title for the quote document."),
});
const sendEmailWithLinkSchema = zod_1.z.object({
    recipientEmail: zod_1.z.string().email().describe("The customer's email address."),
    subject: zod_1.z.string().describe("The email subject."),
    bodyText: zod_1.z.string().describe("The main email content. You will compose this. If a PDF URL is available, you can mention it, but the URL will also be appended separately by the system if provided in pdfQuoteUrl."),
    pdfQuoteUrl: zod_1.z.string().url().optional().describe("CRITICAL: The EXACT, complete, and valid Cloudinary URL of the PDF generated in the previous step. Do NOT use placeholders."),
});
// --- Tool Classes ---
class PdfQuoteTool extends tools_1.StructuredTool {
    constructor(customerName, customerId, business, operationId) {
        super();
        this.schema = flexiblePdfQuoteSchema;
        this.name = "create_flexible_pdf_quote";
        this.customerName = customerName;
        this.customerId = customerId;
        this.business = business;
        this.operationId = operationId;
        this.description = `Generates a PDF quote from a list of line items, uploads it, and returns a URL. The LLM must extract/calculate product/service details from the Business Knowledge Base or conversation and structure them as line items. Business industry: '${sanitizeInput(this.business.industry || "General")}'.`;
    }
    async _call(arg) {
        if (!arg.lineItems || arg.lineItems.length === 0) {
            return "ERROR_INVALID_INPUT: No line items were provided for the quote.";
        }
        try {
            return await generatePdfQuoteToolLogic(arg, this.customerName, this.business, this.operationId, this.customerId);
        }
        catch (toolLogicError) {
            logger.error({ error: toolLogicError.message, toolName: this.name, args: arg, operationId: this.operationId, stack: toolLogicError.stack }, "Unhandled error in PdfQuoteTool _call");
            return `ERROR_TOOL_UNHANDLED: An unexpected error occurred in the PDF quote tool. Details: ${toolLogicError.message}`;
        }
    }
}
async function sendEmailWithLinkToolLogic(toolInput, operationId, customerId, customerName, businessId) {
    const { recipientEmail, subject, bodyText, pdfQuoteUrl } = toolInput;
    // Log the received pdfQuoteUrl to see what the LLM provided
    logger.info({ operationId, recipientEmail, subject, pdfQuoteUrlFromLLM: pdfQuoteUrl, customerId }, "sendEmailWithLinkToolLogic invoked with arguments");
    const baseLogData = {
        customerId, customerName, businessId, quoteTitle: `Email for quote: ${subject}`, lineItems: [], grandTotal: 0,
        operationId, status: 'failed_email', pdfCloudinaryUrl: pdfQuoteUrl, // Log the URL received from LLM
        emailSentTo: recipientEmail
    };
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        const errMsg = "Email sending is not configured: Gmail credentials missing.";
        logger.error({ operationId }, errMsg);
        await logPdfQuoteToDb({ ...baseLogData, errorMessage: errMsg });
        return `ERROR_EMAIL_CONFIG: ${errMsg}`;
    }
    const transporter = nodemailer_1.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
    let emailContent = bodyText;
    if (pdfQuoteUrl && pdfQuoteUrl.startsWith("https://res.cloudinary.com")) { // Basic check for a valid Cloudinary URL
        emailContent += `\n\nYou can view your quote here: ${pdfQuoteUrl}`;
    }
    else if (pdfQuoteUrl) { // A URL was provided, but it's not a valid Cloudinary one (e.g., the placeholder)
        emailContent += `\n\n(Note: A quote PDF was generated, but there was an issue with the link. Our team will look into it.)`;
        logger.warn({ operationId, invalidPdfUrlReceived: pdfQuoteUrl }, "sendEmailWithLinkToolLogic received an invalid or placeholder PDF URL.");
        // Update status for DB log if we detect a bad URL here specifically
        baseLogData.status = 'failed_email_bad_url';
        baseLogData.errorMessage = `Received invalid/placeholder PDF URL: ${pdfQuoteUrl}`;
    }
    else {
        emailContent += `\n\n(Note: A quote PDF was generated but the link could not be included.)`;
    }
    logger.info({ operationId, finalEmailContentPreview: emailContent.substring(0, 200) + "..." }, "Final email content constructed (preview)");
    const mailOptions = { from: GMAIL_USER, to: recipientEmail, subject: subject, text: emailContent };
    try {
        await transporter.sendMail(mailOptions);
        logger.info({ operationId, recipientEmail, sentPdfQuoteUrl: pdfQuoteUrl }, "Email with quote link sent successfully."); // Log the URL that was actually used
        // Only update status to 'emailed' if it wasn't already marked as 'failed_email_bad_url'
        if (baseLogData.status !== 'failed_email_bad_url') {
            baseLogData.status = 'emailed';
        }
        await logPdfQuoteToDb(baseLogData); // Use the potentially updated baseLogData
        return `Email with the quote link has been successfully sent to ${recipientEmail}.`;
    }
    catch (error) {
        const emailError = new ToolExecutionError("Failed to send email", error, { operationId, recipientEmail });
        const errorMsg = `ERROR_EMAIL_SEND: I encountered an issue sending email to ${recipientEmail} (details: ${error.message || 'Unknown email error'}).`;
        logger.error({ err: emailError, cause: emailError.cause, returnedMessage: errorMsg }, emailError.message);
        baseLogData.errorMessage = `Email send failed: ${error.message || 'Unknown'}`; // Overwrite previous error if send fails
        baseLogData.status = 'failed_email'; // General email failure
        await logPdfQuoteToDb(baseLogData);
        return errorMsg;
    }
}
class EmailQuoteLinkTool extends tools_1.StructuredTool {
    constructor(operationId, customerId, customerName, businessId, businessCloudinaryName) {
        super();
        this.schema = sendEmailWithLinkSchema;
        this.name = "send_quote_link_via_email";
        this.operationId = operationId;
        this.customerId = customerId;
        this.customerName = customerName;
        this.businessId = businessId;
        // Refined description for the tool
        this.description = `Emails a link to a previously generated and uploaded PDF quote.
    Requires:
    - recipientEmail: The customer's email address.
    - subject: The email subject.
    - bodyText: The main email content you compose.
    - pdfQuoteUrl: CRITICAL - This MUST be the exact, complete, and valid Cloudinary URL (e.g., starting with 'https://res.cloudinary.com/${businessCloudinaryName || "your_cloud_name"}/...') of the PDF that was generated by the 'create_flexible_pdf_quote' tool in the preceding step. DO NOT use placeholder URLs.`;
    }
    async _call(arg) {
        // Add logging to see what arguments the tool receives from the LLM
        logger.info({
            operationId: this.operationId,
            toolName: this.name,
            receivedArgs: arg
        }, `${this.name} _call invoked with arguments`);
        if (!arg.recipientEmail || !arg.subject || !arg.bodyText) {
            return `ERROR_INVALID_INPUT: Missing required fields for sending email (recipientEmail, subject, or bodyText).`;
        }
        // Optional: Add a check here for placeholder URL and return an error to LLM if desired
        if (arg.pdfQuoteUrl && !arg.pdfQuoteUrl.startsWith("https://res.cloudinary.com")) {
            logger.warn({ operationId: this.operationId, toolName: this.name, invalidUrl: arg.pdfQuoteUrl }, "Received potentially invalid or placeholder URL for pdfQuoteUrl.");
            // You could return a specific error to the LLM to prompt it to try again with a correct URL
            // return "ERROR_INVALID_URL: The provided pdfQuoteUrl does not appear to be a valid Cloudinary URL. Please provide the correct one from the PDF generation step.";
        }
        try {
            return await sendEmailWithLinkToolLogic(arg, this.operationId, this.customerId, this.customerName, this.businessId);
        }
        catch (toolLogicError) {
            logger.error({ error: toolLogicError.message, toolName: this.name, args: arg, operationId: this.operationId, stack: toolLogicError.stack }, "Unhandled error in EmailQuoteLinkTool _call");
            return `ERROR_TOOL_UNHANDLED: An unexpected error occurred in the email tool. Details: ${toolLogicError.message}`;
        }
    }
}
// --- Main Function ---
const generateAnswerFromOpenAI = async (query, context, parameters, business, aiAgentProfile, customerId, customerName, chatHistoryFromDb = []) => {
    const operationId = crypto_1.default.randomUUID();
    logger.info({ operationId, query, customerId, businessId: business?._id?.toString(), contextLength: context?.length }, "generateAnswerFromOpenAI started");
    const businessId = business._id?.toString();
    if (!businessId) {
        const err = new AppError("Business ID is missing from the business object.");
        logger.error({ operationId, err, business }, err.message);
        const logData = { customerId, customerName, businessId: "UNKNOWN", quoteTitle: "N/A - Missing Business ID", lineItems: [], grandTotal: 0, status: 'failed_generation', errorMessage: "Missing business ID", operationId };
        await logPdfQuoteToDb(logData);
        return "I encountered an issue processing your request due to missing business information.";
    }
    const sanitizedQuery = sanitizeInput(query);
    const replyCacheKey = `reply:${businessId}:${customerId}:${sanitizedQuery.substring(0, 100)}`;
    try {
        const cached = await redis_1.default.get(replyCacheKey);
        if (cached) {
            logger.info({ operationId, replyCacheKey, cacheHit: true }, "Reply cache hit");
            return cached;
        }
        logger.info({ operationId, replyCacheKey, cacheHit: false }, "Reply cache miss");
    }
    catch (err) {
        const redisError = new RedisOperationError("Redis cache fetch error", err, { operationId, replyCacheKey });
        logger.warn({ err: redisError, cause: redisError.cause, context: redisError.context }, redisError.message);
    }
    let longTermInteractionMemory;
    let customerProfileMemory;
    try {
        [longTermInteractionMemory, customerProfileMemory] = await Promise.all([
            (0, fetchContextMemory_1.fetchContextMemory)(sanitizedQuery, businessId, customerId),
            (0, getMessageMemory_1.getMessageMemory)(businessId, customerId, sanitizedQuery),
        ]);
    }
    catch (err) {
        const contextError = new ContextFetchingError("Failed to fetch supporting context/customer memory", err, { operationId, query: sanitizedQuery, businessId, customerId });
        logger.warn({ err: contextError, cause: contextError.cause, context: contextError.context }, contextError.message);
        longTermInteractionMemory = longTermInteractionMemory || "Long-term interaction memory unavailable.";
        customerProfileMemory = customerProfileMemory || "Customer profile notes unavailable.";
    }
    const chatKey = `chat_history:${businessId}:${customerId}`;
    let combinedChatHistory = [];
    let rawRedisHistory = [];
    try {
        const prevRedis = await redis_1.default.get(chatKey);
        if (prevRedis) {
            rawRedisHistory = JSON.parse(prevRedis);
            rawRedisHistory.forEach(msg => {
                if (msg.role === "user")
                    combinedChatHistory.push(new messages_1.HumanMessage(sanitizeInput(msg.content)));
                else if (msg.role === "assistant") {
                    let content = msg.content;
                    if (typeof content !== 'string') {
                        content = JSON.stringify(content);
                    }
                    combinedChatHistory.push(new messages_1.AIMessage(sanitizeInput(content)));
                }
            });
        }
    }
    catch (err) {
        const redisError = new RedisOperationError("Redis chat history GET error", err, { operationId, chatKey });
    }
    const dbHistoryArray = Array.isArray(chatHistoryFromDb) ? chatHistoryFromDb : [];
    dbHistoryArray.forEach(msg => {
        const role = msg.role || (msg.sender === 'customer' || msg.sender === 'user' ? 'user' : 'assistant');
        const content = sanitizeInput(msg.content || msg.message || '');
        if (role === "user")
            combinedChatHistory.unshift(new messages_1.HumanMessage(content));
        else if (role === "assistant")
            combinedChatHistory.unshift(new messages_1.AIMessage(content));
    });
    const MAX_HISTORY_MESSAGES = 20;
    const MAX_RAW_HISTORY_ITEMS = 40;
    if (combinedChatHistory.length > MAX_HISTORY_MESSAGES) {
        combinedChatHistory = combinedChatHistory.slice(-MAX_HISTORY_MESSAGES);
    }
    const llm = new openai_1.ChatOpenAI({
        modelName: parameters.modelName || "gpt-4o", // Ensure this is a model that supports tool calling well
        temperature: parameters.temperature ?? 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const actualCloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || business.cloudinaryCloudName || "your_actual_cloud_name"; // Get this from env or business profile
    const pdfQuoteToolInstance = new PdfQuoteTool(customerName, customerId, business, operationId);
    const emailQuoteToolInstance = new EmailQuoteLinkTool(operationId, customerId, customerName, businessId, actualCloudinaryCloudName);
    const tools = [pdfQuoteToolInstance, emailQuoteToolInstance];
    // VVVVVV THIS IS THE KEY CHANGE AREA VVVVVV
    const systemPromptString = `
You are ${sanitizeInput(aiAgentProfile.name || "AI Assistant")}, an expert AI assistant for ${sanitizeInput(business.name || "our company")}.
Your primary goal is to assist users knowledgeably and efficiently, utilizing the provided business information, conversation history, and available tools.

Reply always customer preferred Language.

Business Profile:
- Name: ${sanitizeInput(business.name || "N/A")}
- Industry: ${sanitizeInput(business.industry || "N/A")}
- Type: ${sanitizeInput(business.businessType || "N/A")}
- Domain: ${sanitizeInput(business.domainName || "N/A")}
${business.defaultVatRate !== undefined ? `- Standard VAT Rate (used if not product-specific): ${(business.defaultVatRate * 100).toFixed(0)}%` : ''}

Customer Information:
- Name: ${sanitizeInput(customerName)}
- Customer ID: ${sanitizeInput(customerId)}
- Profile Notes: ${sanitizeInput(customerProfileMemory || "No specific profile notes available.")}
- Long-term Interaction Memory: ${sanitizeInput(longTermInteractionMemory || "No long-term interaction memory with this customer.")}

--- BEGIN BUSINESS KNOWLEDGE BASE (Primary Context for Products & Services) ---
This section contains CRUCIAL information about our products, services, pricing, units, types (e.g., physical, digital, service), and potentially specific tax details.
You MUST use this information to extract details for the "create_flexible_pdf_quote" tool.
${context?.trim() ? sanitizeInput(context) : "No specific business information was retrieved for this query. Rely on general knowledge, conversation history, or state that you don't have the specific information."}
--- END BUSINESS KNOWLEDGE BASE ---

Tool: "create_flexible_pdf_quote":
- Purpose: Generates a PDF quote from a list of line items, uploads it to Cloudinary, and returns its public URL.
- WHEN TO USE: When a user requests a quote for one or more products or services and you have all necessary details for each line item.
- REQUIRED INPUT for the tool (you must construct this JSON object):
  \`\`\`json
  {{
    "lineItems": [
      {{
        "description": "string (e.g., 'Apples', 'Website Design - Basic Package', 'Monthly SEO Service')",
        "quantity": "number (e.g., 5 for 5kg, 1 for a package/service, 20 for 20 hours)",
        "unit": "string (e.g., 'kg', 'item', 'service', 'hour', 'month')",
        "unitPrice": "number (price per unit, e.g., 1200 for $1200/kg)",
        "totalPrice": "number (calculated as quantity * unitPrice, or the fixed total for a service)"
      }}
      // ... more lineItems if multiple products/services
    ],
    "quoteTitle": "string (e.g., 'Quote for Fresh Produce', 'Web Services Quotation')",
    "customerNotes": "string (optional, e.g., 'Discount applied as discussed.')"
  }}
  \`\`\`
- YOUR TASK before calling this tool:
    1. Understand the user's request.
    2. For EACH item/service: Extract/determine description, consult Business Knowledge Base for unitPrice & unit, determine quantity, calculate totalPrice.
    3. If pricing details for any item are missing from Business Knowledge Base or unclear, inform the user you lack pricing for that item. Ask how to proceed. Only call the tool for items with clear pricing.
    4. Compile successfully priced items into the \`lineItems\` array.
    5. Formulate a suitable \`quoteTitle\`.
- TOOL OUTPUT (This is what the tool will return to you, the LLM):
    - On success: A string formatted like "PDF_CLOUDINARY_URL:[ACTUAL_CLOUDINARY_LINK_HERE]:OK..." where [ACTUAL_CLOUDINARY_LINK_HERE] is the full, valid URL to the PDF on Cloudinary.
    - On various errors: Strings starting with "ERROR_...".
- ACTION ON TOOL ERRORS: Inform the user about the specific error. Do not blindly retry the tool call if it returns an error.

Tool: "send_quote_link_via_email":
- Purpose: To email a LINK to a generated PDF quote.
- WHEN TO USE: STRICTLY AFTER "create_flexible_pdf_quote" has successfully run AND returned a string starting with "PDF_CLOUDINARY_URL:", from which you have extracted the specific, complete, and valid URL of the generated PDF. Let's call this unique URL \`the_actual_live_pdf_url\`. Do NOT call this tool if \`the_actual_live_pdf_url\` is not available or if the PDF tool failed.
- REQUIRED INPUT:
  - \`recipientEmail\`: string (The customer's email address)
  - \`subject\`: string (A clear subject line for the email)
  - \`bodyText\`: string (The main content of the email you compose for the customer. You can mention the quote is available via a link.)
  - \`pdfQuoteUrl\`: string. **CRITICAL: This parameter MUST be set to \`the_actual_live_pdf_url\` that was directly extracted from the successful output string (e.g., "PDF_CLOUDINARY_URL:[THIS_PART_IS_THE_URL]:OK...") of the "create_flexible_pdf_quote" tool in the PREVIOUS step.**
    - It is the unique URL pointing to the PDF just created.
    - **DO NOT use any generic placeholder URLs (e.g., 'https://res.cloudinary.com/some-cloudinary-url' or 'https://res.cloudinary.com/some-placeholder/...'). Using a placeholder here will result in a failed email notification and a poor user experience.**
    - **Verify that the URL you pass to this \`pdfQuoteUrl\` parameter is the exact, full URL (e.g., starting with 'https://res.cloudinary.com/${actualCloudinaryCloudName}/raw/upload/...') obtained from the "create_flexible_pdf_quote" tool's output.**
- TOOL OUTPUT: Confirmation of email send or an error message starting with "ERROR_EMAIL_...".

Workflow for Quotes:
1. User requests quote. LLM determines all items.
2. For each item, LLM finds details in Business Knowledge Base. Gets quantity from user. Calculates totalPrice.
3. If any item's price is missing, LLM informs user and asks how to proceed.
4. LLM constructs \`lineItems\` for "create_flexible_pdf_quote" tool.
5. Use "create_flexible_pdf_quote".
6. AWAIT and INSPECT the result from "create_flexible_pdf_quote".
   If successful (output string contains "PDF_CLOUDINARY_URL:"), carefully extract the complete URL part. This is \`the_actual_live_pdf_url\`.
   If the result is an "ERROR_...", inform the user and STOP for failed items.
7. ONLY if you have a valid \`the_actual_live_pdf_url\`:
   Ask the customer for their email address if it's not already known (check Profile Notes: ${sanitizeInput(customerProfileMemory || "No email in profile.")}).
8. Once the customer's email and \`the_actual_live_pdf_url\` are available, use the "send_quote_link_via_email" tool. Ensure the \`pdfQuoteUrl\` parameter for this tool is set PRECISELY to \`the_actual_live_pdf_url\`.
9. Inform the customer about the outcome (e.g., PDF generated and link provided in chat, and/or email sent).

General Instructions:
- Always address customer by name: ${sanitizeInput(customerName)}.
- Prioritize "BUSINESS KNOWLEDGE BASE".
- If a user asks for multiple products (e.g., "5kg mangoes and 3kg apples"), you MUST call "create_flexible_pdf_quote" tool ONCE with ALL items in the \`lineItems\` array.
- Be clear and concise in your responses.
`.trim();
    // ^^^^^^ END OF KEY CHANGE AREA ^^^^^^
    const agentPrompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", systemPromptString],
        new prompts_1.MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new prompts_1.MessagesPlaceholder("agent_scratchpad"),
    ]);
    const agent = await (0, agents_1.createOpenAIToolsAgent)({ llm, tools, prompt: agentPrompt });
    const agentExecutor = new agents_1.AgentExecutor({
        agent,
        tools,
        verbose: process.env.NODE_ENV !== 'production', // Set to true for detailed console logs during dev
        handleParsingErrors: (err) => {
            logger.error({ type: "AgentOutputParsingError", error: err.message, stack: err.stack, err_object: err }, "Agent output parsing error");
            return "I encountered a slight difficulty processing that response. Could you please try rephrasing, or I can try again?";
        },
        maxIterations: 15,
        returnIntermediateSteps: true,
    });
    let agentResponseOutput = "I’m sorry, something went wrong. Please try again.";
    try {
        const agentResult = await agentExecutor.invoke({
            input: sanitizedQuery,
            chat_history: combinedChatHistory,
        });
        agentResponseOutput = typeof agentResult.output === 'string' ? agentResult.output : JSON.stringify(agentResult.output);
    }
    catch (err) {
        const redisError = new RedisOperationError("Redis SET error (history/reply)", err, { operationId, chatKey, replyCacheKey });
    }
    return agentResponseOutput;
};
exports.generateAnswerFromOpenAI = generateAnswerFromOpenAI;
// --- Placeholder/Mock Implementations (Ensure these are replaced with your actual service implementations) ---
// @ts-ignore
if (!global.redisClient && !(typeof redis_1.default !== 'undefined' && redis_1.default && typeof redis_1.default.get === 'function')) {
    console.warn("Using MOCK redisClient. Implement in ./config/redis.ts.");
    // @ts-ignore
    global.redisClient = {
        get: async (key) => { logger.debug({ key }, "MOCK redisClient.get"); return null; },
        set: async (key, value, options) => { logger.debug({ key, value, options }, "MOCK redisClient.set"); return "OK"; },
    };
    // @ts-ignore
    if (typeof redis_1.default === 'undefined' || (redis_1.default && typeof redis_1.default.get !== 'function')) {
        // @ts-ignore
        redis_1.default = global.redisClient;
    }
}
// @ts-ignore
const _mockFetchContextMemory = async (query, businessId, customerId) => {
    logger.debug({ query, businessId, customerId }, "MOCK fetchContextMemory");
    return "Mocked long-term interaction memory.";
};
// @ts-ignore
const _mockGetMessageMemory = async (businessId, customerId, query) => {
    logger.debug({ businessId, customerId, query }, "MOCK getMessageMemory");
    return "Mocked customer profile notes.";
};
// Check if the actual functions are available, otherwise use mocks
// This is a simplified check; your actual bundling/import process might make this unnecessary
const _fetchContextMemory = typeof fetchContextMemory_1.fetchContextMemory === 'function' && Object.keys(fetchContextMemory_1.fetchContextMemory).length > 0 ? fetchContextMemory_1.fetchContextMemory : _mockFetchContextMemory;
const _getMessageMemory = typeof getMessageMemory_1.getMessageMemory === 'function' && Object.keys(getMessageMemory_1.getMessageMemory).length > 0 ? getMessageMemory_1.getMessageMemory : _mockGetMessageMemory;
// Make sure to use these potentially mocked functions in your Promise.all call if the real ones aren't available at runtime
// For example:
// [longTermInteractionMemory, customerProfileMemory] = await Promise.all([
//   _fetchContextMemory(sanitizedQuery, businessId, customerId),
//   _getMessageMemory(businessId, customerId, sanitizedQuery),
// ]);
// The original code already imports them, so this is more for illustrating the mock fallback.
