'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AppUser = { id: string; email?: string | null }
type AppProfile = { id: string; role?: string | null; email?: string | null; full_name?: string | null; company_name?: string | null }
type JobRecord = { id: string; title: string; description?: string | null; customer_id: string }

type CandidateRecord = {
    id: string
    name: string
    email?: string | null
    linkedin_url?: string | null
    cv_text?: string | null
    cv_url?: string | null
    title?: string | null
    status: string
    job_id: string
    customer_id: string
    created_at?: string | null
    updated_at?: string | null
    ai_analysis?: {
        matchScore?: number
        strengths?: string[]
        gaps?: string[]
        questions?: string[]
    } | null
    jobs?: { title: string }
}

const ALL_CUSTOMERS = '__all__'

export default function CandidatesPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<AppUser | null>(null)
    const [profile, setProfile] = useState<AppProfile | null>(null)
    const [customers, setCustomers] = useState<AppProfile[]>([])
    const [jobs, setJobs] = useState<JobRecord[]>([])
    const [candidates, setCandidates] = useState<CandidateRecord[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState(ALL_CUSTOMERS)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [candidateTitle, setCandidateTitle] = useState('')
    const [cvText, setCvText] = useState('')
    const [selectedJobId, setSelectedJobId] = useState('')

    const [cvFile, setCvFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const [analyzing, setAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<CandidateRecord['ai_analysis'] | null>(null)

    const [editingCandidate, setEditingCandidate] = useState<CandidateRecord | null>(null)
    const [editName, setEditName] = useState('')
    const [editEmail, setEditEmail] = useState('')
    const [editLinkedinUrl, setEditLinkedinUrl] = useState('')
    const [editTitle, setEditTitle] = useState('')
    const [editJobId, setEditJobId] = useState('')
    const [editStatus, setEditStatus] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null)

    const isAdmin = profile?.role === 'admin'

    const activeCustomerId = useMemo(() => {
        if (!user) return null
        if (!isAdmin) return user.id
        return selectedCustomerId === ALL_CUSTOMERS ? null : selectedCustomerId
    }, [isAdmin, selectedCustomerId, user])

    useEffect(() => {
        const bootstrap = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) { router.push('/login'); return }

            setUser({ id: authUser.id, email: authUser.email })

            const { data: currentProfile } = await supabase
                .from('profiles').select('*').eq('id', authUser.id).single()
            setProfile(currentProfile)

            if (currentProfile?.role === 'admin') {
                const { data: customerProfiles } = await supabase
                    .from('profiles').select('id, email, role, company_name, full_name').eq('role', 'customer')
                setCustomers(customerProfiles || [])
            } else {
                setSelectedCustomerId(authUser.id)
            }
            setLoading(false)
        }
        bootstrap()
    }, [])

    const loadJobs = async () => {
        if (!user) return
        let query = supabase.from('jobs').select('id, title, description, customer_id')
        if (!isAdmin) {
            query = query.eq('customer_id', user.id)
        } else if (activeCustomerId) {
            query = query.eq('customer_id', activeCustomerId)
        }
        const { data } = await query
        setJobs(data || [])
    }

    const loadCandidates = async () => {
        if (!user) return
        let query = supabase.from('candidates').select('*, jobs(title)')
        if (!isAdmin) {
            query = query.eq('customer_id', user.id)
        } else if (activeCustomerId) {
            query = query.eq('customer_id', activeCustomerId)
        }
        const { data } = await query.order('created_at', { ascending: false })
        setCandidates(data || [])
    }

    useEffect(() => {
        if (user) {
            loadJobs()
            loadCandidates()
        }
    }, [user, activeCustomerId])

    const handleAnalyzeCV = async () => {
        if (!cvText && !cvFile) {
            setError('Please paste CV text or upload a file to analyze')
            return
        }

        setAnalyzing(true)
        setError('')

        try {
            const selectedJob = jobs.find(j => j.id === selectedJobId)

            const formData = new FormData()
            if (cvFile) {
                formData.append('file', cvFile)
            }
            if (cvText) {
                formData.append('cvText', cvText)
            }
            formData.append('jobTitle', selectedJob?.title || '')
            formData.append('jobDescription', selectedJob?.description || '')

            const response = await fetch('/api/analyze-cv', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (data.error) {
                setError(data.error)
            } else if (data.analysis) {
                setAnalysisResult(data.analysis)
                setSuccessMessage('AI analysis completed!')
                setTimeout(() => setSuccessMessage(''), 3000)
            }
        } catch (err) {
            setError('Failed to analyze CV. Please try again.')
            console.error(err)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleCreateCandidate = async (e: FormEvent) => {
        e.preventDefault()
        if (!user || !selectedJobId || !name) return

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const customerId = isAdmin ? activeCustomerId : user.id

        let cvUrl = null

        if (cvFile) {
            try {
                setUploading(true)
                const fileExt = cvFile.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}_${name.replace(/\s/g, '_')}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('cvs')
                    .upload(fileName, cvFile)

                if (uploadError) {
                    throw new Error(uploadError.message)
                }

                const { data: urlData } = supabase.storage
                    .from('cvs')
                    .getPublicUrl(uploadData.path)

                cvUrl = urlData.publicUrl
                setUploading(false)
            } catch (err: any) {
                setError(`Failed to upload CV: ${err.message}`)
                setSaving(false)
                return
            }
        }

        const payload = {
            name: name.trim(),
            email: email.trim() || null,
            linkedin_url: linkedinUrl.trim() || null,
            title: candidateTitle.trim() || null,
            cv_text: cvText.trim() || null,
            cv_url: cvUrl,
            job_id: selectedJobId,
            customer_id: customerId,
            status: 'new',
            ai_analysis: analysisResult
        }

        const { error } = await supabase.from('candidates').insert(payload)

        if (error) {
            setError(error.message)
        } else {
            setName(''); setEmail(''); setLinkedinUrl(''); setCandidateTitle('')
            setCvText(''); setSelectedJobId(''); setCvFile(null); setAnalysisResult(null)
            setSuccessMessage('Candidate added successfully!')
            loadCandidates()
            setTimeout(() => setSuccessMessage(''), 3000)
        }
        setSaving(false)
    }

    const handleUpdateCandidate = async () => {
        if (!editingCandidate) return

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const { error } = await supabase
            .from('candidates')
            .update({
                name: editName.trim(),
                email: editEmail.trim() || null,
                linkedin_url: editLinkedinUrl.trim() || null,
                title: editTitle.trim() || null,
                job_id: editJobId,
                status: editStatus
            })
            .eq('id', editingCandidate.id)

        if (error) {
            setError(error.message)
        } else {
            setSuccessMessage('Candidate updated successfully!')
            loadCandidates()
            setEditingCandidate(null)
            setTimeout(() => setSuccessMessage(''), 3000)
        }
        setSaving(false)
    }

    const handleDeleteCandidate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this candidate?')) return

        setSaving(true)
        const { error } = await supabase.from('candidates').delete().eq('id', id)
        if (error) {
            setError(error.message)
        } else {
            setSuccessMessage('Candidate deleted successfully!')
            loadCandidates()
            setTimeout(() => setSuccessMessage(''), 3000)
        }
        setSaving(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { name: 'Overview', href: '/dashboard' },
        { name: 'Jobs', href: '/dashboard/jobs' },
        { name: 'Candidates', href: '/dashboard/candidates' },
        { name: 'Kanban', href: '/dashboard/kanban' },
        { name: 'AI Screening', href: '/dashboard/ai' },
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
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-gray-800 text-gray-100 border border-gray-600'
            case 'reviewed':
                return 'bg-gray-700 text-gray-200 border border-gray-500'
            case 'interview':
                return 'bg-gray-600 text-gray-100 border border-gray-500'
            case 'hired':
                return 'bg-gray-800 text-green-300 border border-green-800/50'
            case 'rejected':
                return 'bg-gray-800 text-red-300 border border-red-800/50'
            default:
                return 'bg-gray-700 text-gray-200 border border-gray-500'
        }
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
                                <Link key={item.name} href={item.href} className={`rounded-lg px-3 py-2 text-sm transition-all ${item.href === '/dashboard/candidates' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden text-sm text-gray-500 md:block">{user?.email} ({isAdmin ? 'Admin' : 'Customer'})</span>
                        <button onClick={handleLogout} className="rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm text-white shadow-md hover:from-gray-600 hover:to-gray-700">Logout</button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Candidates</h1>
                            <p className="mt-1 text-gray-500">Manage candidates and analyze CVs with AI</p>
                        </div>
                        {isAdmin && (
                            <div className="min-w-72 rounded-2xl border border-gray-300 bg-white/70 p-4 shadow-xl backdrop-blur-xl">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Customers</label>
                                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800">
                                    <option value={ALL_CUSTOMERS}>All customers</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.full_name || c.email || c.id}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                    {successMessage && <div className="mb-6 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">{successMessage}</div>}

                    <div className="grid gap-8 lg:grid-cols-[480px_minmax(0,1fr)]">
                        <section className="rounded-2xl border border-gray-600 bg-gray-800/80 backdrop-blur-xl p-6 shadow-xl overflow-y-auto max-h-[80vh]">
                            <h2 className="text-xl font-semibold text-white mb-4">Add New Candidate</h2>

                            <form onSubmit={handleCreateCandidate} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Full Name *</label>
                                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" placeholder="Anna Johansson" />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" placeholder="anna@example.com" />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Professional Title</label>
                                    <input type="text" value={candidateTitle} onChange={(e) => setCandidateTitle(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" placeholder="Senior Software Engineer" />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">LinkedIn URL</label>
                                    <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" placeholder="https://linkedin.com/in/anna" />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">Select Job *</label>
                                    <select required value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gray-500">
                                        <option value="">Select a job</option>
                                        {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                                    </select>
                                </div>

                                <div className="border-t border-gray-700 pt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-md font-semibold text-white">AI-Powered CV Analysis</h3>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Automatically screen, score, and rank candidates against your job requirements using AI.
                                    </p>

                                    <div className="mb-3">
                                        <label className="mb-1 block text-sm font-medium text-gray-300">Upload CV (PDF, DOCX, or TXT)</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="cv-upload"
                                                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="cv-upload"
                                                className="flex items-center justify-between w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-white cursor-pointer hover:bg-gray-600 transition-colors"
                                            >
                                                <span className="text-gray-300">
                                                    {cvFile ? cvFile.name : 'Choose file...'}
                                                </span>
                                                <span className="px-3 py-1 text-sm bg-gray-600 rounded-md text-gray-200">
                                                    Browse
                                                </span>
                                            </label>
                                        </div>
                                        {!cvFile && (
                                            <p className="text-xs text-gray-500 mt-2">No file uploaded</p>
                                        )}
                                        {cvFile && (
                                            <div className="text-xs mt-2">
                                                <p className="text-green-400">Selected: {cvFile.name} ({Math.round(cvFile.size / 1024)} KB)</p>
                                                {uploading && <p className="text-blue-400">Uploading to storage...</p>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative my-3">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-600"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-gray-800 text-gray-400">OR</span>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="mb-1 block text-sm font-medium text-gray-300">Paste CV Text</label>
                                        <textarea rows={6} value={cvText} onChange={(e) => setCvText(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" placeholder="Paste CV content or key experience..."></textarea>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={handleAnalyzeCV}
                                            disabled={analyzing || (!cvText && !cvFile)}
                                            className="w-full py-3 text-base bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {analyzing ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    Analyze CV with AI
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {analysisResult && (
                                        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-white">Analysis Result</span>
                                            </div>

                                            <div className="mb-3">
                                                <span className="text-sm text-gray-300">Match Score:</span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                                            style={{ width: `${analysisResult.matchScore}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-bold text-white">{analysisResult.matchScore}%</span>
                                                </div>
                                            </div>

                                            {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-green-400 mb-1">✓ Strengths</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
                                                        {analysisResult.strengths.map((s, i) => (
                                                            <li key={i} className="text-gray-300">{s}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {analysisResult.gaps && analysisResult.gaps.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-yellow-400 mb-1">⚠ Areas to improve</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
                                                        {analysisResult.gaps.map((g, i) => (
                                                            <li key={i} className="text-gray-300">{g}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {analysisResult.questions && analysisResult.questions.length > 0 && (
                                                <div className="mt-3">
                                                    <details className="cursor-pointer">
                                                        <summary className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                                            Suggested Interview Questions
                                                        </summary>
                                                        <ul className="list-decimal list-inside text-sm text-gray-300 space-y-1 mt-2 pl-2">
                                                            {analysisResult.questions.map((q, i) => (
                                                                <li key={i} className="text-gray-300">{q}</li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium py-2.5 shadow-md hover:from-gray-500 hover:to-gray-600 disabled:opacity-50">
                                    {saving ? 'Adding...' : 'Add Candidate'}
                                </button>
                            </form>
                        </section>

                        <section className="rounded-2xl border border-gray-300 bg-white/70 backdrop-blur-xl p-6 shadow-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-800">Candidates</h2>
                                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">{candidates.length} candidates</span>
                            </div>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                {candidates.map((candidate) => {
                                    if (editingCandidate?.id === candidate.id) {
                                        return (
                                            <div key={candidate.id} className="rounded-2xl border border-gray-300 bg-white/90 p-4 shadow-sm">
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="Full name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                                        <input
                                                            type="email"
                                                            value={editEmail}
                                                            onChange={(e) => setEditEmail(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="Email address"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                                        <input
                                                            type="text"
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="Professional title"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                                        <input
                                                            type="url"
                                                            value={editLinkedinUrl}
                                                            onChange={(e) => setEditLinkedinUrl(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="https://linkedin.com/in/username"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Job</label>
                                                        <select
                                                            value={editJobId}
                                                            onChange={(e) => setEditJobId(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        >
                                                            {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                                        <select
                                                            value={editStatus}
                                                            onChange={(e) => setEditStatus(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        >
                                                            <option value="new">New</option>
                                                            <option value="reviewed">Reviewed</option>
                                                            <option value="interview">Interview</option>
                                                            <option value="hired">Hired</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={handleUpdateCandidate}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            Save changes
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCandidate(null)}
                                                            className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-sm"
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
                                            key={candidate.id}
                                            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => { setSelectedCandidate(candidate); setShowDetailModal(true); }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="text-md font-semibold text-gray-800">{candidate.name}</h3>
                                                    <p className="text-xs text-gray-600 mt-1">{candidate.title || candidate.jobs?.title}</p>
                                                    {candidate.email && <p className="text-xs text-gray-600 mt-1">{candidate.email}</p>}
                                                    {candidate.linkedin_url && (
                                                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">
                                                            LinkedIn →
                                                        </a>
                                                    )}
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            candidate.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                                candidate.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                                                                    candidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                                                                        candidate.status === 'hired' ? 'bg-green-100 text-green-800' :
                                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {candidate.status}
                                                        </span>
                                                        {candidate.ai_analysis?.matchScore && (
                                                            <span className="text-xs text-gray-500">
                                                                AI Match: <span className="font-medium text-gray-700">{candidate.ai_analysis.matchScore}%</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCandidate(candidate)
                                                            setEditName(candidate.name)
                                                            setEditEmail(candidate.email || '')
                                                            setEditTitle(candidate.title || '')
                                                            setEditLinkedinUrl(candidate.linkedin_url || '')
                                                            setEditJobId(candidate.job_id)
                                                            setEditStatus(candidate.status)
                                                        }}
                                                        className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all shadow-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCandidate(candidate.id)}
                                                        className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                                {candidates.length === 0 && <div className="text-center text-gray-500 py-8">No candidates added yet</div>}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 border-t border-gray-300 bg-white/40 backdrop-blur-sm py-4 text-center text-xs text-gray-500">
                Mini ATS
            </footer>

            {showDetailModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 border border-gray-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">{selectedCandidate.name}</h2>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-600">{selectedCandidate.email || '-'}</span></div>
                                <div><span className="font-semibold text-gray-700">Title:</span> <span className="text-gray-600">{selectedCandidate.title || '-'}</span></div>
                                <div className="col-span-2"><span className="font-semibold text-gray-700">LinkedIn:</span> {selectedCandidate.linkedin_url ? <a href={selectedCandidate.linkedin_url} target="_blank" className="text-blue-600 hover:underline">View Profile</a> : <span className="text-gray-500">-</span>}</div>
                                <div><span className="font-semibold text-gray-700">Job:</span> <span className="text-gray-600">{selectedCandidate.jobs?.title || '-'}</span></div>
                                <div><span className="font-semibold text-gray-700">Status:</span> <span className="text-gray-600">{selectedCandidate.status}</span></div>
                            </div>

                            {selectedCandidate.cv_text && (
                                <div className="border-t border-gray-200 pt-3">
                                    <h3 className="font-semibold text-gray-700 text-sm mb-2">CV Text</h3>
                                    <div className="bg-gray-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedCandidate.cv_text}</p>
                                    </div>
                                </div>
                            )}

                            {selectedCandidate.cv_url && (
                                <div className="border-t border-gray-200 pt-3">
                                    <span className="font-semibold text-gray-700 text-sm">CV File:</span>
                                    <a href={selectedCandidate.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm ml-2">
                                        Download CV
                                    </a>
                                </div>
                            )}

                            {selectedCandidate.ai_analysis && (
                                <div className="border-t border-gray-200 pt-3">
                                    <h3 className="font-semibold text-gray-700 text-sm mb-3">AI Analysis</h3>

                                    <div className="mb-3">
                                        <span className="font-semibold text-gray-700">Match Score:</span>
                                        <span className="ml-2 px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-200 rounded-full">
                                            {selectedCandidate.ai_analysis.matchScore}%
                                        </span>
                                    </div>

                                    {selectedCandidate.ai_analysis.strengths && selectedCandidate.ai_analysis.strengths.length > 0 && (
                                        <div className="mb-3">
                                            <p className="font-semibold text-gray-700 mb-1">Strengths:</p>
                                            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                                {selectedCandidate.ai_analysis.strengths.map((s, i) => (
                                                    <li key={i} className="text-gray-700">{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {selectedCandidate.ai_analysis.gaps && selectedCandidate.ai_analysis.gaps.length > 0 && (
                                        <div className="mb-3">
                                            <p className="font-semibold text-gray-700 mb-1">Areas to improve:</p>
                                            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                                {selectedCandidate.ai_analysis.gaps.map((g, i) => (
                                                    <li key={i} className="text-gray-700">{g}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {selectedCandidate.ai_analysis.questions && selectedCandidate.ai_analysis.questions.length > 0 && (
                                        <div className="mt-3">
                                            <details className="cursor-pointer">
                                                <summary className="font-semibold text-gray-700 text-sm mb-2">Interview questions:</summary>
                                                <ul className="list-decimal list-inside text-gray-600 text-sm space-y-2 mt-2 pl-2">
                                                    {selectedCandidate.ai_analysis.questions.map((q, i) => (
                                                        <li key={i} className="text-gray-700">{q}</li>
                                                    ))}
                                                </ul>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
                .animate-scan {
                    animation: scan 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}