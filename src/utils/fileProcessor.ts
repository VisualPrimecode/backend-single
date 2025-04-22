import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

export const parseFileToText = async (filePath: string): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const buffer = await fs.readFile(filePath);
      const result = await pdfParse(buffer);

      if (!result.text.trim()) {
        throw new Error('PDF has no readable text (possibly scanned or corrupted)');
      }

      return result.text;
    }

    if (ext === '.txt') {
      return await fs.readFile(filePath, 'utf-8');
    }

    if (ext === '.docx') {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });

      if (!result.value.trim()) {
        throw new Error('DOCX has no extractable text');
      }

      return result.value;
    }
    

    throw new Error(`Unsupported file type: ${ext}`);
  } catch (err: any) {
    throw new Error(`Could not extract text from ${path.basename(filePath)} (${ext})`);
  }
};
