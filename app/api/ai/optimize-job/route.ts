export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const { jobTitle, jobDescription } = await request.json();

        if (!jobTitle) {
            return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
        }

        const prompt = `
You are an expert recruitment consultant and copywriter optimizing job descriptions to attract the best candidates.

Original Job Title: ${jobTitle}
Original Job Description: ${jobDescription || 'Not provided'}

Please optimize this job description by:
1. Making it more engaging and inclusive
2. Removing any unconscious bias (gender, age, cultural bias)
3. Adding key selling points for candidates (growth opportunities, culture, benefits)
4. Making requirements more clear and realistic
5. Improving the overall structure and flow
6. Adding a compelling "About the role" section if missing
7. Adding a "What we're looking for" section
8. Adding a "What we offer" section

Return ONLY the optimized job description as plain text, no JSON formatting, no extra comments.
The description should be professional, warm, and inviting while remaining factual.`;

        const { text } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: prompt,
            temperature: 0.7,
            maxTokens: 1500,
        });

        return NextResponse.json({ optimizedDescription: text });

    } catch (error) {
        console.error('Groq API error:', error);
        return NextResponse.json(
            { error: 'Failed to optimize job description' },
            { status: 500 }
        );
    }
}