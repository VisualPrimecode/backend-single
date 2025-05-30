"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/quoteLog.model.ts
const mongoose_1 = __importStar(require("mongoose"));
// Mongoose Schema
const QuoteLogSchema = new mongoose_1.Schema({
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId, // Or String if you don't use ObjectId refs
        ref: 'Customer', // Assuming you have a Customer model
        required: true,
        index: true,
    },
    customerName: {
        type: String,
        required: true,
    },
    businessId: {
        type: mongoose_1.Schema.Types.ObjectId, // Or String
        ref: 'Business', // Assuming you have a Business model
        required: true,
        index: true,
    },
    productName: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    pdfLocalPath: {
        type: String,
    },
    pdfCloudinaryUrl: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['generated_local', 'uploaded_cloud', 'emailed', 'failed_parsing', 'failed_generation', 'failed_upload', 'failed_email'],
        required: true,
    },
    errorMessage: {
        type: String,
    },
    operationId: {
        type: String,
        required: true,
        index: true,
    },
    emailSentTo: {
        type: String,
        trim: true,
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
});
// Create the model
// Check if the model already exists to prevent OverwriteModelError in Next.js/HMR environments
const QuoteLog = mongoose_1.default.models.QuoteLog || mongoose_1.default.model('QuoteLog', QuoteLogSchema);
exports.default = QuoteLog;
