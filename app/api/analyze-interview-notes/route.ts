export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const { notes, strengths, weaknesses, jobTitle, candidateName } = await request.json();

        const prompt = `
You are an expert recruitment consultant analyzing interview notes.

Candidate: ${candidateName || 'Unknown'}
Position: ${jobTitle || 'Not specified'}

Interviewer's notes:
Strengths: ${strengths || 'Not specified'}
Weaknesses: ${weaknesses || 'Not specified'}
Detailed notes: ${notes || 'Not specified'}

Based on these interview notes, provide a brief analysis (2-3 sentences) that:
1. Summarizes the candidate's overall fit
2. Highlights key concerns or strengths
3. Gives a clear recommendation (Hire / Further Review / Reject)

Keep it professional, concise, and actionable.`;

        const { text } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: prompt,
            temperature: 0.5,
        });

        return NextResponse.json({ analysis: text });

    } catch (error) {
        console.error('Groq API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze interview notes' },
            { status: 500 }
        );
    }
}