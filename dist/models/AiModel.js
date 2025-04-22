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
const mongoose_1 = __importStar(require("mongoose"));
const AIModelSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    business: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Business', required: true },
    trainedFiles: { type: [String], required: true },
    fileIndexingStatus: [
        {
            fileName: { type: String, required: true },
            status: { type: String, enum: ['pending', 'processing', 'indexed', 'failed'], default: 'pending' },
            errorMessage: { type: String }
        }
    ],
    modelType: { type: String, enum: ['GPT-3.5', 'GPT-4'], required: true },
    parameters: { type: mongoose_1.Schema.Types.Mixed, required: true },
    embeddingModel: { type: String, enum: ['OpenAI', 'Cohere', 'Custom'], default: 'OpenAI' },
    vectorStore: { type: String, enum: ['Pinecone', 'Qdrant', 'Redis', 'Weaviate'], default: 'Pinecone' },
    chunkingStrategy: {
        size: { type: Number, default: 500 },
        overlap: { type: Number, default: 50 },
        method: { type: String, enum: ['recursive', 'semantic'], default: 'recursive' }
    },
    vectorNamespace: { type: String },
    status: { type: String, enum: ['training', 'deployed', 'failed'], default: 'training' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('AIModel', AIModelSchema);
