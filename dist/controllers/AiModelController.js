"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAiModelsByBusinessId = exports.createAndTrainAIModel = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const crypto_1 = require("crypto");
const text_splitter_1 = require("langchain/text_splitter");
const zod_1 = require("zod");
const AiModel_1 = __importDefault(require("../models/AiModel"));
const Business_1 = __importDefault(require("../models/Business"));
const fileProcessor_1 = require("../utils/fileProcessor");
const vectorStore_1 = require("../utils/vectorStore");
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const response_1 = require("../utils/response");
const languageDetection_1 = require("../utils/languageDetection");
const User_1 = __importDefault(require("../models/User"));
const redis_1 = __importDefault(require("../config/redis"));
const defaultParameters = {
    temperature: 0.7,
    maxTokens: 512,
    systemPrompt: 'You are a helpful assistant. Use the provided context to answer accurately.'
};
const defaultChunking = {
    size: 500,
    overlap: 100,
    method: 'recursive'
};
const aiModelSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Model name is required'),
    modelType: zod_1.z.enum(['GPT-3.5', 'GPT-4']),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
    embeddingModel: zod_1.z.enum(['OpenAI', 'Cohere', 'Custom']).optional(),
    vectorStore: zod_1.z.enum(['Pinecone', 'Qdrant', 'Redis', 'Weaviate']).optional(),
    chunkingStrategy: zod_1.z
        .object({
        size: zod_1.z.number(),
        overlap: zod_1.z.number(),
        method: zod_1.z.enum(['recursive', 'semantic'])
    })
        .optional()
});
const createAndTrainAIModel = async (req, res) => {
    try {
        const cleanedBody = {};
        Object.keys(req.body).forEach(key => {
            cleanedBody[key.trim()] = req.body[key];
        });
        const parsed = aiModelSchema.safeParse(cleanedBody);
        if (!parsed.success) {
            return (0, response_1.sendError)(res, 400, 'Invalid request data', parsed.error.flatten());
        }
        const { name, modelType, parameters = defaultParameters, embeddingModel = 'OpenAI', vectorStore = 'Pinecone', chunkingStrategy = defaultChunking, } = parsed.data;
        const user = await User_1.default.findById(req.user?.userId);
        if (!user)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const businessId = user.businessId;
        if (!businessId)
            return (0, response_1.sendError)(res, 404, 'Business not found');
        const businessData = await Business_1.default.findById(businessId);
        if (!businessData)
            return (0, response_1.sendError)(res, 404, 'Business not found');
        const files = req?.files;
        if (!files || files.length === 0) {
            return (0, response_1.sendError)(res, 400, 'No files uploaded');
        }
        const allowedExtensions = ['.pdf', '.txt', '.docx', '.zip'];
        const uploadedFiles = [];
        const localTempPaths = [];
        for (const file of files) {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                await promises_1.default.unlink(file.path);
                return (0, response_1.sendError)(res, 400, `Invalid file type: ${ext}. Only PDF, TXT, DOCX, and ZIP are allowed.`);
            }
            if (ext === '.zip') {
                const zip = new adm_zip_1.default(file.path);
                const entries = zip.getEntries();
                for (const entry of entries) {
                    const entryExt = path_1.default.extname(entry.entryName).toLowerCase();
                    if (!['.pdf', '.txt', '.docx'].includes(entryExt))
                        continue;
                    const entryBuffer = entry.getData();
                    const tmpFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, crypto_1.randomUUID)()}-${entry.name}`);
                    await promises_1.default.writeFile(tmpFilePath, entryBuffer);
                    const cloudinaryUrl = await (0, cloudinaryUpload_1.uploadToCloudinary)(tmpFilePath);
                    uploadedFiles.push(cloudinaryUrl);
                    await promises_1.default.unlink(tmpFilePath);
                }
                await promises_1.default.unlink(file.path);
                continue;
            }
            const cloudinaryUrl = await (0, cloudinaryUpload_1.uploadToCloudinary)(file.path);
            uploadedFiles.push(cloudinaryUrl);
            await promises_1.default.unlink(file.path);
        }
        let vectorNamespace = `model-${(0, uuid_1.v4)()}`;
        while (await AiModel_1.default.findOne({ vectorNamespace })) {
            vectorNamespace = `model-${(0, uuid_1.v4)()}`;
        }
        const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: chunkingStrategy.size,
            chunkOverlap: chunkingStrategy.overlap,
        });
        const fileIndexingStatus = [];
        const documents = [];
        for (const fileUrl of uploadedFiles) {
            const fileName = path_1.default.basename(fileUrl);
            let tmpFile = '';
            try {
                const response = await axios_1.default.get(fileUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                tmpFile = path_1.default.join(os_1.default.tmpdir(), `${(0, crypto_1.randomUUID)()}-${fileName}`);
                await promises_1.default.writeFile(tmpFile, buffer);
                localTempPaths.push(tmpFile);
                const rawText = await (0, fileProcessor_1.parseFileToText)(tmpFile);
                if (!rawText || rawText.trim().length === 0) {
                    throw new Error(`No readable content found in ${fileName}`);
                }
                const language = (0, languageDetection_1.detectLanguage)(rawText);
                const docs = await splitter.createDocuments([rawText]);
                documents.push(...docs.map(doc => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        businessId: businessData._id.toString(),
                        businessName: businessData.name,
                        language
                    }
                })));
                fileIndexingStatus.push({ fileName, status: 'indexed' });
            }
            catch (err) {
                console.error(`❌ Failed to parse file ${tmpFile}:`, err.message);
                fileIndexingStatus.push({ fileName, status: 'failed', errorMessage: err.message });
            }
        }
        await Promise.all(localTempPaths.map(p => promises_1.default.unlink(p).catch(() => { })));
        if (documents.length === 0) {
            return (0, response_1.sendError)(res, 500, 'Model training failed. No files were successfully processed.');
        }
        await (0, vectorStore_1.embedChunksAndStore)(documents, vectorNamespace);
        //check Ai Model name exists for this business
        const aiModelNameExists = await AiModel_1.default.findOne({ name, business: businessData._id });
        if (aiModelNameExists) {
            return (0, response_1.sendError)(res, 400, 'AI Model name already exists for this business');
        }
        const finalModel = await AiModel_1.default.create({
            name,
            business: businessData._id,
            trainedFiles: uploadedFiles,
            modelType,
            parameters: {
                ...parameters,
                systemPrompt: generateSystemPrompt(businessData, parameters.systemPrompt || defaultParameters.systemPrompt),
            },
            embeddingModel,
            vectorStore,
            chunkingStrategy,
            vectorNamespace,
            status: fileIndexingStatus.some(f => f.status === 'failed') ? 'deployed' : 'deployed',
            fileIndexingStatus
        });
        if (fileIndexingStatus.some(f => f.status === 'failed')) {
            return (0, response_1.sendSuccess)(res, 207, 'Model trained with partial success (some files failed)', finalModel);
        }
        //reset redis cache
        const cacheKey = `aiModelsByBusinessId-${businessId}`;
        await redis_1.default.del(cacheKey);
        return (0, response_1.sendSuccess)(res, 201, 'AI model trained successfully', finalModel);
    }
    catch (error) {
        console.error('❌ Error in createAndTrainAIModel:', error);
        return (0, response_1.sendError)(res, 500, 'Error creating/training AI model', error.message || 'Unknown error');
    }
};
exports.createAndTrainAIModel = createAndTrainAIModel;
//fetch AiModels by businessId and caching by redis
const fetchAiModelsByBusinessId = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId).select('businessId').lean();
        const businessId = user?.businessId;
        const cacheKey = `aiModelsByBusinessId-${businessId}`;
        if (!businessId) {
            return (0, response_1.sendError)(res, 400, 'Business ID is required');
        }
        const business = await Business_1.default.findById(businessId).lean();
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found');
        }
        const cachedData = await redis_1.default.get(cacheKey);
        if (cachedData) {
            return (0, response_1.sendSuccess)(res, 200, 'Fetched AI models from cache', JSON.parse(cachedData));
        }
        const aiModels = await AiModel_1.default.find({ business: businessId }).lean();
        await redis_1.default.set(cacheKey, JSON.stringify(aiModels), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched AI models successfully', aiModels);
    }
    catch (error) {
        console.log(error);
        console.error('❌ Error in fetchAiModelsByBusinessId:', error);
        return (0, response_1.sendError)(res, 500, 'Error fetching AI models', error.message || 'Unknown error');
    }
};
exports.fetchAiModelsByBusinessId = fetchAiModelsByBusinessId;
const generateSystemPrompt = (business, fallback) => {
    const { name, industry, businessType, supportSize, supportChannels, goals, } = business;
    return `
You are a smart, multilingual AI assistant supporting English, Spanish, and Bangla.

Business Summary:
- Name: ${name}
- Industry: ${industry}
- Type: ${businessType}
- Support Size: ${supportSize}
- Channels: ${(supportChannels || []).join(', ')}
- Goals: ${(goals || []).join(', ')}

Instructions:
- Understand and respond in the user's language (English, Español, বাংলা).
- Use uploaded documents as your only source of truth.
- Provide precise, relevant, and business-context-aware responses.
- When asked about business details, always align with the provided metadata.
`.trim();
};
