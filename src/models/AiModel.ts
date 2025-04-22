import mongoose, { Document, Schema } from 'mongoose';

export interface IAIModel extends Document {
  name: string;
  business: mongoose.Types.ObjectId;
  trainedFiles: string[];
  fileIndexingStatus: {
    fileName: string;
    status: 'pending' | 'processing' | 'indexed' | 'failed';
    errorMessage?: string;
  }[];
  modelType: 'GPT-3.5' | 'GPT-4';
  parameters: Record<string, any>;
  embeddingModel: 'OpenAI' | 'Cohere' | 'Custom';
  vectorStore: 'Pinecone' | 'Qdrant' | 'Redis' | 'Weaviate';
  chunkingStrategy: {
    size: number;
    overlap: number;
    method: 'recursive' | 'semantic';
  };
  vectorNamespace?: string;
  status: 'training' | 'deployed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const AIModelSchema = new Schema<IAIModel>(
  {
    name: { type: String, required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    trainedFiles: { type: [String], required: true },

    fileIndexingStatus: [
      {
        fileName: { type: String, required: true },
        status: { type: String, enum: ['pending', 'processing', 'indexed', 'failed'], default: 'pending' },
        errorMessage: { type: String }
      }
    ],

    modelType: { type: String, enum: ['GPT-3.5', 'GPT-4'], required: true },
    parameters: { type: Schema.Types.Mixed, required: true },

    embeddingModel: { type: String, enum: ['OpenAI', 'Cohere', 'Custom'], default: 'OpenAI' },
    vectorStore: { type: String, enum: ['Pinecone', 'Qdrant', 'Redis', 'Weaviate'], default: 'Pinecone' },
    chunkingStrategy: {
      size: { type: Number, default: 500 },
      overlap: { type: Number, default: 50 },
      method: { type: String, enum: ['recursive', 'semantic'], default: 'recursive' }
    },
    vectorNamespace: { type: String },

    status: { type: String, enum: ['training', 'deployed', 'failed'], default: 'training' },
  },
  { timestamps: true }
);

export default mongoose.model<IAIModel>('AIModel', AIModelSchema);
