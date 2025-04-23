"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileToText = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mammoth_1 = __importDefault(require("mammoth"));
const parseFileToText = async (filePath) => {
    const ext = path_1.default.extname(filePath).toLowerCase();
    try {
        if (ext === '.pdf') {
            const buffer = await promises_1.default.readFile(filePath);
            const result = await (0, pdf_parse_1.default)(buffer);
            if (!result.text.trim()) {
                throw new Error('PDF has no extractable text');
            }
            return result.text;
        }
        if (ext === '.txt') {
            return await promises_1.default.readFile(filePath, 'utf-8');
        }
        if (ext === '.docx') {
            const buffer = await promises_1.default.readFile(filePath);
            const result = await mammoth_1.default.extractRawText({ buffer });
            if (!result.value.trim()) {
                throw new Error('DOCX has no extractable text');
            }
            return result.value;
        }
        throw new Error(`Unsupported file type: ${ext}`);
    }
    catch (err) {
        if (ext === '.pdf') {
            throw new Error(`Could not extract text from ${path_1.default.basename(filePath)} (${ext}). ` +
                'This often happens with scanned/image-based or password-protected PDFs. ' +
                'Please use a PDF containing selectable text.');
        }
        throw new Error(`Could not extract text from ${path_1.default.basename(filePath)} (${ext})`);
    }
};
exports.parseFileToText = parseFileToText;
