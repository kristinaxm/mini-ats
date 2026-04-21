export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import PDFParser from 'pdf2json';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', (err: any) => {
            reject(new Error(err.parserError));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            let text = '';
            if (pdfData && pdfData.Pages) {
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
    const mammoth = await import('mammoth');
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
            const fileType = file.type;
            const fileName = file.name;

            if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                textToAnalyze = await extractTextFromPDF(buffer);
            }
            else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
                textToAnalyze = await extractTextFromDOCX(buffer);
            }
            else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
                textToAnalyze = buffer.toString('utf-8');
            }
            else {
                return NextResponse.json(
                    { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' },
                    { status: 400 }
                );
            }
        }

        if (!textToAnalyze) {
            return NextResponse.json(
                { error: 'CV text or file is required' },
                { status: 400 }
            );
        }

        const prompt = `
You are an expert recruitment consultant analyzing a candidate's CV against a job description.

Job Title: ${jobTitle || 'Not specified'}
Job Description: ${jobDescription || 'Not specified'}

Candidate CV:
${textToAnalyze.substring(0, 8000)}

Analyze the CV and respond in EXACTLY this JSON format:
{
    "matchScore": 75,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "gaps": ["gap 1", "gap 2"],
    "questions": ["interview question 1", "question 2", "question 3"]
}

Guidelines for scoring:
- 90-100: Excellent match, top candidate
- 70-89: Good match, strong potential
- 50-69: Partial match, some gaps
- 0-49: Poor match, significant gaps

Respond with ONLY the JSON, no other text.`;

        const { text } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: prompt,
            temperature: 0.3,
        });

        const analysis = JSON.parse(text);

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('Groq API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze CV' },
            { status: 500 }
        );
    }
}