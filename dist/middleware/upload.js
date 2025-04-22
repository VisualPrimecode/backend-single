"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const fileFilter = (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.docx', '.zip'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
};
exports.upload = (0, multer_1.default)({ storage, fileFilter });
