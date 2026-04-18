import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const { userId, email } = await request.json()

        if (!userId || !email) {
            return NextResponse.json({ error: 'User ID and email required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: email
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating email:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}