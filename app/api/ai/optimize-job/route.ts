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
You are an expert recruitment consultant and copywriter optimizing job descriptions.

Original Job Title: ${jobTitle}
Original Job Description: ${jobDescription || 'Not provided'}

Please optimize this job description by:
1. Making it more engaging and inclusive
2. Removing any unconscious bias
3. Adding key selling points for candidates
4. Making requirements more clear and realistic
5. Improving the overall structure and flow

Return ONLY the optimized job description as plain text, no JSON formatting.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return NextResponse.json({ optimizedDescription: completion.choices[0].message.content });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json(
            { error: 'Failed to optimize job description' },
            { status: 500 }
        );
    }
}