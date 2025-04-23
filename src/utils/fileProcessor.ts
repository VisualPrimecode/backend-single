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
        throw new Error('PDF has no extractable text');
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
    if (ext === '.pdf') {
      throw new Error(
        `Could not extract text from ${path.basename(filePath)} (${ext}). ` +
        'This often happens with scanned/image-based or password-protected PDFs. ' +
        'Please use a PDF containing selectable text.'
      );
    }
    throw new Error(`Could not extract text from ${path.basename(filePath)} (${ext})`);
  }
};
