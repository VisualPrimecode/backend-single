"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = void 0;
const detectLanguage = (text) => {
    const lowerText = text.toLowerCase();
    const banglaRegex = /[\u0980-\u09FF]/;
    if (banglaRegex.test(text))
        return 'ben';
    const spanishWords = ['hola', 'gracias', 'usted', 'cómo', 'por favor', 'buenos días'];
    const englishWords = ['hello', 'thanks', 'you', 'how', 'please', 'good morning'];
    const score = {
        eng: englishWords.filter(w => lowerText.includes(w)).length,
        spa: spanishWords.filter(w => lowerText.includes(w)).length,
    };
    if (score.eng > score.spa && score.eng > 0)
        return 'eng';
    if (score.spa > score.eng && score.spa > 0)
        return 'spa';
    return 'unknown';
};
exports.detectLanguage = detectLanguage;
