export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const systemPrompt = `You are an AI recruitment assistant for an Applicant Tracking System (ATS). 
Your role is to help recruiters and hiring managers with:

1. Answering questions about recruitment best practices
2. Suggesting interview questions for specific roles
3. Giving tips for writing better job descriptions
4. Explaining how to evaluate candidates
5. Providing advice on candidate screening and assessment

Keep responses concise, professional, and helpful (2-4 sentences max unless asked for more detail).`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        return NextResponse.json({ reply: completion.choices[0].message.content });

    } catch (error) {
        console.error('Chatbot error:', error);
        return NextResponse.json(
            { error: 'Failed to get response from AI' },
            { status: 500 }
        );
    }
}