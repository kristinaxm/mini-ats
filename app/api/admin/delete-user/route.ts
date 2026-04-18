import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
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

        const { data: jobs, error: jobsError } = await supabaseAdmin
            .from('jobs')
            .select('id')
            .eq('customer_id', userId)

        if (jobsError) {
            console.error('Error fetching jobs:', jobsError)
        }

        if (jobs && jobs.length > 0) {
            const jobIds = jobs.map(job => job.id)

            const { error: candidatesError } = await supabaseAdmin
                .from('candidates')
                .delete()
                .in('job_id', jobIds)

            if (candidatesError) {
                console.error('Error deleting candidates:', candidatesError)
            }
        }

        const { error: deleteJobsError } = await supabaseAdmin
            .from('jobs')
            .delete()
            .eq('customer_id', userId)

        if (deleteJobsError) {
            console.error('Error deleting jobs:', deleteJobsError)
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('Error deleting profile:', profileError)
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}