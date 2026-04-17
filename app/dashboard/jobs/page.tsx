'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type AppUser = {
    id: string
    email?: string | null
}

type AppProfile = {
    id: string
    role?: string | null
    email?: string | null
    full_name?: string | null
    company_name?: string | null
}

type JobRecord = {
    id: string
    title: string
    description?: string | null
    customer_id: string
    created_at?: string | null
    updated_at?: string | null
}

const ALL_CUSTOMERS = '__all__'

export default function JobsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<AppUser | null>(null)
    const [profile, setProfile] = useState<AppProfile | null>(null)
    const [customers, setCustomers] = useState<AppProfile[]>([])
    const [jobs, setJobs] = useState<JobRecord[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState(ALL_CUSTOMERS)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [editingJob, setEditingJob] = useState<JobRecord | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')

    const isAdmin = profile?.role === 'admin'

    const activeCustomerId = useMemo(() => {
        if (!user) {
            return null
        }

        if (!isAdmin) {
            return user.id
        }

        return selectedCustomerId === ALL_CUSTOMERS ? null : selectedCustomerId
    }, [isAdmin, selectedCustomerId, user])

    useEffect(() => {
        const bootstrap = async () => {
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser()

            if (!authUser) {
                router.push('/login')
                return
            }

            const currentUser: AppUser = {
                id: authUser.id,
                email: authUser.email,
            }

            setUser(currentUser)

            const { data: currentProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (profileError) {
                console.error('Profile error:', profileError)
                setError(profileError.message)
                setLoading(false)
                return
            }

            setProfile(currentProfile)

            if (currentProfile?.role === 'admin') {
                const { data: customerProfiles, error: customersError } = await supabase
                    .from('profiles')
                    .select('id, email, role, company_name, full_name')
                    .eq('role', 'customer')

                if (customersError) {
                    console.error('Customers error:', customersError)
                    setError(customersError.message)
                } else {
                    setCustomers(customerProfiles || [])
                }
            } else {
                setSelectedCustomerId(authUser.id)
            }

            setLoading(false)
        }

        bootstrap()
    }, [router, supabase])

    const loadJobs = async () => {
        setError('')

        let query = supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })

        if (!isAdmin) {
            query = query.eq('customer_id', user?.id)
        } else if (selectedCustomerId !== ALL_CUSTOMERS) {
            query = query.eq('customer_id', selectedCustomerId)
        }

        const { data, error: jobsError } = await query

        if (jobsError) {
            console.error('Jobs error:', jobsError)
            setError(jobsError.message)
            return
        }

        setJobs(data || [])
    }

    useEffect(() => {
        if (!user || !profile) {
            return
        }
        loadJobs()
    }, [isAdmin, profile, selectedCustomerId, supabase, user])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleCreateJob = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!user) {
            return
        }

        const customerId = isAdmin ? activeCustomerId : user.id

        if (!customerId) {
            setError('Select a customer before creating a job.')
            return
        }

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const payload = {
            title: title.trim(),
            description: description.trim(),
            customer_id: customerId,
        }

        const { error: insertError } = await supabase.from('jobs').insert(payload)

        if (insertError) {
            console.error('Insert error:', insertError)
            setError(insertError.message)
            setSaving(false)
            return
        }

        setTitle('')
        setDescription('')
        setSuccessMessage('Job created successfully!')
        await loadJobs()
        setSaving(false)

        setTimeout(() => setSuccessMessage(''), 3000)
    }

    const handleEditClick = (job: JobRecord) => {
        setEditingJob(job)
        setEditTitle(job.title)
        setEditDescription(job.description || '')
    }

    const handleUpdateJob = async () => {
        if (!editingJob) return

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                title: editTitle.trim(),
                description: editDescription.trim(),
            })
            .eq('id', editingJob.id)

        if (updateError) {
            console.error('Update error:', updateError)
            setError(updateError.message)
        } else {
            setSuccessMessage('Job updated successfully!')
            await loadJobs()
            setEditingJob(null)
            setEditTitle('')
            setEditDescription('')
            setTimeout(() => setSuccessMessage(''), 3000)
        }
        setSaving(false)
    }

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this job? This will also delete all candidates connected to this job.')) {
            return
        }

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const { error: deleteError } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId)

        if (deleteError) {
            console.error('Delete error:', deleteError)
            setError(deleteError.message)
        } else {
            setSuccessMessage('Job deleted successfully!')
            await loadJobs()
            setTimeout(() => setSuccessMessage(''), 3000)
        }
        setSaving(false)
    }

    const cancelEdit = () => {
        setEditingJob(null)
        setEditTitle('')
        setEditDescription('')
    }

    const navItems = [
        { name: 'Overview', href: '/dashboard' },
        { name: 'Jobs', href: '/dashboard/jobs' },
        { name: 'Candidates', href: '/dashboard/candidates' },
        { name: 'Kanban', href: '/dashboard/kanban' },
        { name: 'AI Screening', href: '/dashboard/ai' },
    ]

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-2xl bg-white/70 p-8 text-center backdrop-blur-xl">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-600"></div>
                        <p className="mt-4 text-gray-600">Loading jobs...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 top-1/2 h-96 w-96 rounded-full bg-gray-500/30 blur-3xl"></div>
                <div className="absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-gray-500/30 blur-3xl"></div>
            </div>

            <nav className="relative z-20 fixed left-0 right-0 top-0 border-b border-gray-300/50 bg-white/60 shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <span className="text-lg font-semibold text-gray-800">Mini ATS</span>
                        <div className="hidden items-center gap-1 md:flex">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`rounded-lg px-3 py-2 text-sm transition-all ${
                                        item.href === '/dashboard/jobs'
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="hidden text-sm text-gray-500 md:block">
                            {user?.email} ({isAdmin ? 'Admin' : 'Customer'})
                        </span>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm text-white shadow-md transition-all hover:from-gray-600 hover:to-gray-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Jobs</h1>
                            <p className="mt-1 text-gray-500">
                                {isAdmin
                                    ? 'View all jobs, filter by customer, and create jobs for a selected customer.'
                                    : 'Create and manage jobs connected to your customer account.'}
                            </p>
                        </div>

                        {isAdmin && (
                            <div className="min-w-72 rounded-2xl border border-gray-300 bg-white/70 p-4 shadow-xl backdrop-blur-xl">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Customers
                                </label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-300"
                                >
                                    <option value={ALL_CUSTOMERS}>All customers</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.company_name || customer.full_name || customer.email || customer.id}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-500">
                                    Choose a customer to create jobs for them. Leave on all to review every job.
                                </p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-6 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">
                            {successMessage}
                        </div>
                    )}

                    <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
                        <section className="rounded-2xl border border-gray-300 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
                            <h2 className="text-xl font-semibold text-gray-800">Create new job</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {isAdmin
                                    ? 'New jobs will be saved to the selected customer.'
                                    : 'New jobs will automatically be saved to your account.'}
                            </p>

                            <form onSubmit={handleCreateJob} className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Job title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-gray-100/80 px-3 py-2.5 text-gray-800 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-300"
                                        placeholder="Senior Full Stack Developer"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-gray-100/80 px-3 py-2.5 text-gray-800 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-300"
                                        placeholder="Write the role summary, requirements, and responsibilities."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving || (isAdmin && !activeCustomerId)}
                                    className="w-full rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2.5 font-medium text-white shadow-md transition-all hover:from-gray-600 hover:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save job'}
                                </button>

                                {isAdmin && !activeCustomerId && (
                                    <p className="text-xs text-gray-500">
                                        Select a specific customer above before creating a new job.
                                    </p>
                                )}
                            </form>
                        </section>

                        <section className="rounded-2xl border border-gray-300 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Job list</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {isAdmin && selectedCustomerId === ALL_CUSTOMERS
                                            ? 'Showing jobs for every customer.'
                                            : 'Showing jobs connected to the active customer.'}
                                    </p>
                                </div>
                                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">
                                    {jobs.length} jobs
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {jobs.map((job) => {
                                    const customerLabel =
                                        customers.find((customer) => customer.id === job.customer_id)
                                            ?.company_name ||
                                        customers.find((customer) => customer.id === job.customer_id)
                                            ?.full_name ||
                                        customers.find((customer) => customer.id === job.customer_id)
                                            ?.email ||
                                        job.customer_id

                                    if (editingJob?.id === job.id) {
                                        return (
                                            <div key={job.id} className="rounded-2xl border border-gray-300 bg-white/80 p-4 shadow-sm">
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        placeholder="Job title"
                                                    />
                                                    <textarea
                                                        rows={3}
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        placeholder="Job description"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleUpdateJob}
                                                            disabled={saving}
                                                            className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            {saving ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-2.5 py-1 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <article
                                            key={job.id}
                                            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-md font-semibold text-gray-800">
                                                        {job.title}
                                                    </h3>
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        {job.description ? job.description.substring(0, 150) + (job.description.length > 150 ? '...' : '') : 'No description provided.'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        Created: {new Date(job.created_at).toLocaleDateString()}
                                                        {job.updated_at && job.updated_at !== job.created_at && (
                                                            <> · Updated: {new Date(job.updated_at).toLocaleDateString()}</>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleEditClick(job)}
                                                        className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all shadow-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 shrink-0 rounded-xl bg-gray-100 px-2 py-1.5 text-xs text-gray-500">
                                                <p>Customer</p>
                                                <p className="mt-0.5 font-medium text-gray-700">
                                                    {isAdmin ? customerLabel : user?.email || job.customer_id}
                                                </p>
                                            </div>
                                        </article>
                                    )
                                })}

                                {jobs.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 px-6 py-12 text-center text-gray-500">
                                        No jobs found for this view yet.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    )
}