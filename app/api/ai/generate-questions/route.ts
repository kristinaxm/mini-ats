export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { jobTitle, jobDescription } = await request.json();

        if (!jobTitle) {
            return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
        }

        const prompt = `
You are an expert recruitment consultant creating interview questions for a job position.

Job Title: ${jobTitle}
Job Description: ${jobDescription || 'Not provided'}

Generate interview questions in EXACTLY this JSON format:
{
    "technical": ["technical question 1", "technical question 2", "technical question 3"],
    "behavioral": ["behavioral question 1", "behavioral question 2", "behavioral question 3"],
    "roleSpecific": ["role-specific question 1", "role-specific question 2", "role-specific question 3"]
}

Requirements:
- Technical questions: Test hard skills, tools, and technologies relevant to the role
- Behavioral questions: Assess soft skills, teamwork, problem-solving, and cultural fit
- Role-specific questions: Focus on responsibilities and challenges specific to this position
- Make questions challenging but fair
- Tailor all questions specifically to the job title and description

Respond with ONLY the JSON, no other text.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const questions = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json({ questions });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate interview questions' },
            { status: 500 }
        );
    }
}