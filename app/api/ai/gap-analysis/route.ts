export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const { cvText, jobTitle, jobDescription, currentMatchScore } = await request.json();

        if (!cvText || !jobTitle) {
            return NextResponse.json(
                { error: 'CV text and job title are required' },
                { status: 400 }
            );
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

Respond with ONLY the JSON, no other text.`;

        const { text } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: prompt,
            temperature: 0.4,
        });

        const analysis = JSON.parse(text);
        const validatedAnalysis = {
            missingSkills: analysis.missingSkills || [],
            weakAreas: analysis.weakAreas || [],
            trainingSuggestions: analysis.trainingSuggestions || [],
            recommendations: analysis.recommendations || [],
            matchScore: currentMatchScore || 0
        };

        return NextResponse.json({ analysis: validatedAnalysis });

    } catch (error) {
        console.error('Gap analysis API error:', error);

        return NextResponse.json({
            analysis: {
                missingSkills: ['Unable to analyze - API error'],
                weakAreas: ['Please try again'],
                trainingSuggestions: ['Contact support if issue persists'],
                recommendations: ['Refresh and retry'],
                matchScore: 0
            }
        });
    }
}