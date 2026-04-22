export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            max_tokens: 200,
        });

        return NextResponse.json({ analysis: completion.choices[0].message.content });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze interview notes' },
            { status: 500 }
        );
    }
}