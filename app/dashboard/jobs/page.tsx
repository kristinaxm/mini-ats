'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

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

type CandidateInfo = {
    id: string
    name: string
    status: string
    email?: string
    linkedin_url?: string
    title?: string
    cv_text?: string
    cv_url?: string
    created_at?: string
    ai_analysis?: {
        matchScore?: number
        strengths?: string[]
        gaps?: string[]
        questions?: string[]
    }
}

type JobRecord = {
    id: string
    title: string
    description?: string | null
    customer_id: string
    created_at?: string | null
    updated_at?: string | null
    candidates?: CandidateInfo[]
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

    const [showJobModal, setShowJobModal] = useState(false)
    const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null)

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
        if (jobs.length > 0) {
            const selectedId = sessionStorage.getItem('selectedJobId')
            if (selectedId) {
                setTimeout(() => {
                    const element = document.getElementById(`job-${selectedId}`)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        element.classList.add('ring-2', 'ring-gray-600', 'bg-gray-100', 'transition-all', 'duration-500')
                        setTimeout(() => {
                            element.classList.remove('ring-2', 'ring-gray-600', 'bg-gray-100')
                        }, 3000)
                    }
                }, 500)
                sessionStorage.removeItem('selectedJobId')
            }
        }
    }, [jobs])

    useEffect(() => {
        const bootstrap = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
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
            .select('*, candidates(id, name, status, email, linkedin_url, title, cv_text, cv_url, created_at, ai_analysis)')
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

    const handleCreateJob = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user) return

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

    const handleEditClick = (job: JobRecord, e: React.MouseEvent) => {
        e.stopPropagation()
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

    const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
        e.stopPropagation()
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

    const openJobModal = (job: JobRecord) => {
        setSelectedJob(job)
        setShowJobModal(true)
    }

    const navItems = [
        { name: 'Overview', href: '/dashboard' },
        { name: 'Jobs', href: '/dashboard/jobs' },
        { name: 'Candidates', href: '/dashboard/candidates' },
        { name: 'Kanban', href: '/dashboard/kanban' },
        { name: 'Calendar', href: '/dashboard/calendar' },
        { name: 'AI Screening', href: '/dashboard/ai' },
        { name: 'Interview Notes', href: '/dashboard/notes' },
    ]

    if (isAdmin) {
        navItems.push({ name: 'Admin', href: '/dashboard/admin' })
    }

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
                <div className="absolute -left-40 top-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute -right-40 top-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse delay-700"></div>
                <div className="absolute -left-20 bottom-20 w-80 h-80 bg-gray-600/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute -right-20 top-20 w-80 h-80 bg-gray-600/20 rounded-full filter blur-3xl animate-pulse delay-1500"></div>
                <div className="absolute top-20 right-20 w-48 h-48 rounded-full border-2 border-gray-500/30 animate-spin-slow"></div>
                <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full border-2 border-gray-600/25 animate-spin-slow delay-2000"></div>
                <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full border-2 border-gray-500/20 animate-spin-slow delay-1000"></div>
                <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full border-2 border-gray-400/20 animate-spin-slow delay-3000"></div>
                <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full border-2 border-gray-500/25 animate-spin-slow delay-2500"></div>
                <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
                <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/25 to-transparent"></div>
                <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-1/4 w-px bg-gradient-to-b from-transparent via-gray-600/25 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-2/4 w-px bg-gradient-to-b from-transparent via-gray-600/30 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-3/4 w-px bg-gradient-to-b from-transparent via-gray-600/25 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-400/10 to-transparent animate-scan"></div>
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
                        <NotificationBell />
                        <span className="hidden text-sm text-gray-500 md:block">
                            {profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'User'} ({isAdmin ? 'Admin' : 'Customer'})
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
                                <label className="mb-2 block text-sm font-medium text-gray-700">Customers</label>
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
                                <p className="mt-2 text-xs text-gray-500">Choose a customer to create jobs for them. Leave on all to review every job.</p>
                            </div>
                        )}
                    </div>

                    {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                    {successMessage && <div className="mb-6 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">{successMessage}</div>}

                    <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
                        <section className="rounded-2xl border border-gray-600 bg-gray-800/80 backdrop-blur-xl p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-white">Create new job</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                {isAdmin
                                    ? 'New jobs will be saved to the selected customer.'
                                    : 'New jobs will automatically be saved to your account.'}
                            </p>
                            <form onSubmit={handleCreateJob} className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Job title</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white placeholder-gray-400 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
                                        placeholder="Senior Full Stack Developer"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white placeholder-gray-400 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
                                        placeholder="Write the role summary, requirements, and responsibilities."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving || (isAdmin && !activeCustomerId)}
                                    className="w-full rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium py-2.5 shadow-md transition-all hover:from-gray-500 hover:to-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save job'}
                                </button>
                                {isAdmin && !activeCustomerId && (
                                    <p className="text-xs text-gray-400">Select a specific customer above before creating a new job.</p>
                                )}
                            </form>
                        </section>

                        <section className="rounded-2xl border border-gray-300 bg-white/70 backdrop-blur-xl p-6 shadow-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Job list</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {isAdmin && selectedCustomerId === ALL_CUSTOMERS
                                            ? 'Showing jobs for every customer.'
                                            : 'Showing jobs connected to the active customer.'}
                                    </p>
                                </div>
                                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">{jobs.length} jobs</span>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {jobs.map((job) => {
                                    const customerLabel = customers.find((customer) => customer.id === job.customer_id)?.company_name ||
                                        customers.find((customer) => customer.id === job.customer_id)?.full_name ||
                                        customers.find((customer) => customer.id === job.customer_id)?.email ||
                                        job.customer_id

                                    if (editingJob?.id === job.id) {
                                        return (
                                            <div key={job.id} className="rounded-2xl border border-gray-300 bg-white/80 p-4 shadow-sm">
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        placeholder="Job title"
                                                    />
                                                    <textarea
                                                        rows={3}
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                                            id={`job-${job.id}`}
                                            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => openJobModal(job)}
                                        >
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-md font-semibold text-gray-800">{job.title}</h3>
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        {job.description ? job.description.substring(0, 150) + (job.description.length > 150 ? '...' : '') : 'No description provided.'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        Created: {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                                                        {job.updated_at && job.updated_at !== job.created_at && (
                                                            <> · Updated: {job.updated_at ? new Date(job.updated_at).toLocaleDateString() : 'N/A'}</>
                                                        )}
                                                    </p>
                                                    {job.candidates && job.candidates.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-medium text-gray-500">Candidates ({job.candidates.length})</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {job.candidates.slice(0, 3).map((candidate) => (
                                                                    <span
                                                                        key={candidate.id}
                                                                        className={`px-1.5 py-0.5 text-xs rounded-full ${
                                                                            candidate.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                                                candidate.status === 'reviewed' ? 'bg-yellow-100 text-yellow-700' :
                                                                                    candidate.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                                                                                        candidate.status === 'hired' ? 'bg-green-100 text-green-700' :
                                                                                            'bg-red-100 text-red-700'
                                                                        }`}
                                                                    >
                                                                        {candidate.name}
                                                                    </span>
                                                                ))}
                                                                {job.candidates.length > 3 && (
                                                                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                                                        +{job.candidates.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => handleEditClick(job, e)} className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all shadow-sm">Edit</button>
                                                    <button onClick={(e) => handleDeleteJob(job.id, e)} className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm">Delete</button>
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

            <footer className="relative z-10 border-t border-gray-300 bg-white/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-500">© 2026 Mini ATS — Smart recruitment for modern teams</p>
                        <div className="flex gap-6">
                            <span className="text-xs text-gray-400">Powered by Next.js + Supabase</span>
                        </div>
                    </div>
                </div>
            </footer>

            {showJobModal && selectedJob && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowJobModal(false)}>
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 border border-gray-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Created: {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}
                                    {selectedJob.updated_at && selectedJob.updated_at !== selectedJob.created_at && (
                                        <> · Updated: {selectedJob.updated_at ? new Date(selectedJob.updated_at).toLocaleDateString() : 'N/A'}</>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => setShowJobModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <div className="space-y-6">
                            <div className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-700 text-sm mb-2">Description</h3>
                                <p className="text-gray-600 text-sm whitespace-pre-wrap">{selectedJob.description || 'No description provided.'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="font-semibold text-gray-700">Customer:</span> <span className="text-gray-600">
                                    {customers.find(c => c.id === selectedJob.customer_id)?.company_name ||
                                        customers.find(c => c.id === selectedJob.customer_id)?.email ||
                                        selectedJob.customer_id}
                                </span></div>
                                <div><span className="font-semibold text-gray-700">Total Candidates:</span> <span className="text-gray-600">{selectedJob.candidates?.length || 0}</span></div>
                            </div>
                            <div className="border-t border-gray-200 pt-4">
                                <h3 className="font-semibold text-gray-700 text-sm mb-3">Candidates ({selectedJob.candidates?.length || 0})</h3>
                                {selectedJob.candidates && selectedJob.candidates.length > 0 ? (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {selectedJob.candidates.map((candidate) => (
                                            <div key={candidate.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{candidate.name}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{candidate.title || 'No title'}</p>
                                                        {candidate.email && <p className="text-xs text-gray-400 mt-0.5">{candidate.email}</p>}
                                                        {candidate.linkedin_url && (
                                                            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">LinkedIn Profile →</a>
                                                        )}
                                                        {candidate.cv_url && (
                                                            <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">Download CV →</a>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            candidate.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                                candidate.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                                                                    candidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                                                                        candidate.status === 'hired' ? 'bg-green-100 text-green-800' :
                                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {candidate.status}
                                                        </span>
                                                        <Link href={`/dashboard/candidates`} className="text-xs text-gray-500 hover:text-gray-700">Edit →</Link>
                                                    </div>
                                                </div>
                                                {candidate.ai_analysis?.matchScore && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <span className="text-xs text-gray-500">AI Match: </span>
                                                        <span className="text-xs font-semibold text-gray-700">{candidate.ai_analysis.matchScore}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">No candidates added to this job yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                .animate-scan { animation: scan 8s ease-in-out infinite; }
            `}</style>
        </div>
    )
}