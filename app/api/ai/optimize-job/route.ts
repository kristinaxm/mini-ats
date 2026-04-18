import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    try {
        const { jobTitle, jobDescription } = await request.json()

        if (!jobTitle) {
            return NextResponse.json({ error: 'Job title is required' }, { status: 400 })
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
The description should be professional, warm, and inviting while remaining factual.
`

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert recruitment consultant and copywriter who specializes in creating inclusive, engaging job descriptions that attract diverse talent.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        })

        const optimizedDescription = response.choices[0].message.content

        return NextResponse.json({ optimizedDescription })

    } catch (error) {
        console.error('OpenAI API error:', error)
        return NextResponse.json(
            { error: 'Failed to optimize job description' },
            { status: 500 }
        )
    }
}
