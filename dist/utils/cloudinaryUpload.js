"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = async (localFilePath) => {
    try {
        const result = await cloudinary_1.v2.uploader.upload(localFilePath, {
            folder: 'ai-models',
            resource_type: 'raw',
            type: 'upload'
        });
        return result.secure_url;
    }
    catch (error) {
        console.error('Cloudinary upload failed:', error);
        throw new Error('Failed to upload file to Cloudinary');
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
