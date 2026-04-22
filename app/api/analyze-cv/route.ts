export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        pdfParser.on('pdfParser_dataError', (err: any) => reject(new Error(err.parserError)));
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            let text = '';
            if (pdfData?.Pages) {
                for (const page of pdfData.Pages) {
                    if (page.Texts) {
                        for (const textItem of page.Texts) {
                            text += decodeURIComponent(textItem.R[0].T) + ' ';
                        }
                    }
                }
            }
            resolve(text);
        });
        pdfParser.parseBuffer(buffer);
    });
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const cvText = formData.get('cvText') as string;
        const jobTitle = formData.get('jobTitle') as string;
        const jobDescription = formData.get('jobDescription') as string;

        let textToAnalyze = cvText || '';

        if (file && !textToAnalyze) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = file.name;

            if (fileName.endsWith('.pdf')) {
                textToAnalyze = await extractTextFromPDF(buffer);
            } else if (fileName.endsWith('.docx')) {
                textToAnalyze = await extractTextFromDOCX(buffer);
            } else if (fileName.endsWith('.txt')) {
                textToAnalyze = buffer.toString('utf-8');
            } else {
                return NextResponse.json(
                    { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
                    { status: 400 }
                );
            }
        }

        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            return NextResponse.json(
                { error: 'CV text or file is required and could not be extracted' },
                { status: 400 }
            );
        }

        const prompt = `
You are an expert recruitment consultant and CV analyzer. Analyze this CV against the job description.

Job Title: ${jobTitle || 'Not specified'}
Job Description: ${jobDescription || 'Not specified'}

CV Text:
${textToAnalyze.substring(0, 8000)}

Analyze the CV and provide a response in EXACTLY this JSON format:
{
    "matchScore": 75,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "gaps": ["gap 1", "gap 2"],
    "questions": ["question 1", "question 2", "question 3"]
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze CV' },
            { status: 500 }
        );
    }
}