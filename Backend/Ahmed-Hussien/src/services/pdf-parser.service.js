// src/services/pdf-parser.service.js
const pdfParse = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

async function extractPDFMetadata(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return {
            text: data.text,
            numPages: data.numpages,
            info: data.info,
            metadata: data.metadata
        };
    } catch (error) {
        console.error('Error extracting PDF metadata:', error);
        throw error;
    }
}

module.exports = { extractTextFromPDF, extractPDFMetadata };