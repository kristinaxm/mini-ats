import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    try {
        const { cvText, jobTitle, jobDescription, currentMatchScore } = await request.json()

        if (!cvText || !jobTitle) {
            return NextResponse.json(
                { error: 'CV text and job title are required' },
                { status: 400 }
            )
        }

        const prompt = `
You are an expert recruitment consultant performing a detailed GAP ANALYSIS between a candidate's CV and a job description.

Job Title: ${jobTitle}
Job Description: ${jobDescription || 'Not provided'}
Current Match Score: ${currentMatchScore || 0}%

Candidate CV:
${cvText.substring(0, 6000)}

Analyze WHY this candidate may not be a perfect match and provide actionable insights.

Respond in EXACTLY this JSON format:
{
    "missingSkills": ["skill 1", "skill 2", "skill 3"],
    "weakAreas": ["area 1", "area 2", "area 3"],
    "trainingSuggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Guidelines:
- missingSkills: Specific technical or hard skills from the job description that the candidate lacks
- weakAreas: Soft skills, experience levels, or qualifications that need improvement
- trainingSuggestions: Specific courses, certifications, or learning paths to fill the gaps
- recommendations: Actionable advice for the candidate to become more competitive
- Be specific, honest, and constructive. Focus on gaps that actually matter.
- If the candidate is already a strong match (score > 80%), focus on minor improvements.

Respond with ONLY the JSON, no other text.
`

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert recruitment consultant specializing in skill gap analysis. You always respond in valid JSON format only. Be specific, honest, and constructive.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
        })

        const content = response.choices[0].message.content
        const analysis = JSON.parse(content || '{}')

        const validatedAnalysis = {
            missingSkills: analysis.missingSkills || [],
            weakAreas: analysis.weakAreas || [],
            trainingSuggestions: analysis.trainingSuggestions || [],
            recommendations: analysis.recommendations || [],
            matchScore: currentMatchScore || 0
        }

        return NextResponse.json({ analysis: validatedAnalysis })

    } catch (error) {
        console.error('Gap analysis API error:', error)

        return NextResponse.json({
            analysis: {
                missingSkills: ['Unable to analyze - API error'],
                weakAreas: ['Please try again'],
                trainingSuggestions: ['Contact support if issue persists'],
                recommendations: ['Refresh and retry'],
                matchScore: 0
            }
        })
    }
}