import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import PDFParser from 'pdf2json'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser()

        pdfParser.on('pdfParser_dataError', (err: any) => {
            reject(new Error(err.parserError))
        })

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            let text = ''
            if (pdfData && pdfData.Pages) {
                for (const page of pdfData.Pages) {
                    if (page.Texts) {
                        for (const textItem of page.Texts) {
                            text += decodeURIComponent(textItem.R[0].T) + ' '
                        }
                    }
                }
            }
            resolve(text)
        })

        pdfParser.parseBuffer(buffer)
    })
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const cvText = formData.get('cvText') as string
        const jobTitle = formData.get('jobTitle') as string
        const jobDescription = formData.get('jobDescription') as string

        let textToAnalyze = cvText || ''

        if (file && !textToAnalyze) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const fileType = file.type

            if (fileType === 'application/pdf') {
                textToAnalyze = await extractTextFromPDF(buffer)
            }
            else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const mammoth = await import('mammoth')
                const result = await mammoth.extractRawText({ buffer })
                textToAnalyze = result.value
            }
            else if (fileType === 'text/plain') {
                textToAnalyze = buffer.toString('utf-8')
            }
            else {
                return NextResponse.json(
                    { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' },
                    { status: 400 }
                )
            }
        }

        if (!textToAnalyze) {
            return NextResponse.json(
                { error: 'CV text or file is required' },
                { status: 400 }
            )
        }

        const prompt = `
You are an expert recruitment consultant analyzing a candidate's CV against a job description.

Job Title: ${jobTitle || 'Not specified'}
Job Description: ${jobDescription || 'Not specified'}

Candidate CV:
${textToAnalyze.substring(0, 8000)}

Analyze the CV and respond in EXACTLY this JSON format:
{
    "matchScore": (a number between 0-100),
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "gaps": ["gap 1", "gap 2"],
    "questions": ["interview question 1", "interview question 2", "interview question 3"]
}

Respond with ONLY the JSON, no other text.
`

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an experienced recruitment consultant. You always respond in valid JSON format only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
        })

        const content = response.choices[0].message.content
        const analysis = JSON.parse(content || '{}')

        return NextResponse.json({ analysis })

    } catch (error) {
        console.error('OpenAI API error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze CV' },
            { status: 500 }
        )
    }
}