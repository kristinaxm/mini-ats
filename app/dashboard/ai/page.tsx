'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Job = {
    id: string
    title: string
    description: string
    customer_id: string
}

type Candidate = {
    id: string
    name: string
    title: string
    status: string
    cv_text: string
    ai_analysis?: {
        matchScore: number
        strengths: string[]
        gaps: string[]
        questions: string[]
    }
}

export default function AIScreeningPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<Job[]>([])
    const [candidates, setCandidates] = useState<Candidate[]>([])

    const [selectedJobId, setSelectedJobId] = useState('')
    const [rankedCandidates, setRankedCandidates] = useState<any[]>([])
    const [analyzing, setAnalyzing] = useState(false)

    const [jobForQuestions, setJobForQuestions] = useState<Job | null>(null)
    const [generatedQuestions, setGeneratedQuestions] = useState<{
        technical: string[]
        behavioral: string[]
        roleSpecific: string[]
    } | null>(null)
    const [generatingQuestions, setGeneratingQuestions] = useState(false)

    const [batchFiles, setBatchFiles] = useState<File[]>([])
    const [batchResults, setBatchResults] = useState<any[]>([])
    const [batchAnalyzing, setBatchAnalyzing] = useState(false)

    const [selectedJobForOptimization, setSelectedJobForOptimization] = useState<Job | null>(null)
    const [optimizedDescription, setOptimizedDescription] = useState('')
    const [optimizing, setOptimizing] = useState(false)

    const isAdmin = profile?.role === 'admin'

    useEffect(() => {
        const bootstrap = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }

            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single()

            setUser(authUser)
            setProfile(currentProfile)

            let query = supabase.from('jobs').select('*')
            if (currentProfile?.role !== 'admin') {
                query = query.eq('customer_id', authUser.id)
            }
            const { data: jobsData } = await query
            setJobs(jobsData || [])

            setLoading(false)
        }
        bootstrap()
    }, [])

    const loadCandidatesForJob = async (jobId: string) => {
        const { data } = await supabase
            .from('candidates')
            .select('*')
            .eq('job_id', jobId)

        if (data) {
            setCandidates(data)
            const ranked = [...data].sort((a, b) =>
                (b.ai_analysis?.matchScore || 0) - (a.ai_analysis?.matchScore || 0)
            )
            setRankedCandidates(ranked)
        }
    }

    const handleJobSelect = (jobId: string) => {
        setSelectedJobId(jobId)
        loadCandidatesForJob(jobId)
    }

    const generateInterviewQuestions = async () => {
        if (!jobForQuestions) return

        setGeneratingQuestions(true)
        try {
            const response = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: jobForQuestions.title,
                    jobDescription: jobForQuestions.description
                })
            })
            const data = await response.json()
            setGeneratedQuestions(data.questions)
        } catch (error) {
            console.error('Error generating questions:', error)
        } finally {
            setGeneratingQuestions(false)
        }
    }

    const optimizeJobDescription = async () => {
        if (!selectedJobForOptimization) return

        setOptimizing(true)
        try {
            const response = await fetch('/api/ai/optimize-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: selectedJobForOptimization.title,
                    jobDescription: selectedJobForOptimization.description
                })
            })
            const data = await response.json()
            setOptimizedDescription(data.optimizedDescription)
        } catch (error) {
            console.error('Error optimizing job:', error)
        } finally {
            setOptimizing(false)
        }
    }

    const handleBatchScreening = async () => {
        if (batchFiles.length === 0 || !selectedJobId) return

        setBatchAnalyzing(true)
        setBatchResults([])

        const selectedJob = jobs.find(j => j.id === selectedJobId)

        for (const file of batchFiles) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('jobTitle', selectedJob?.title || '')
            formData.append('jobDescription', selectedJob?.description || '')

            try {
                const response = await fetch('/api/analyze-cv', {
                    method: 'POST',
                    body: formData
                })
                const data = await response.json()
                setBatchResults(prev => [...prev, {
                    fileName: file.name,
                    analysis: data.analysis
                }])
            } catch (error) {
                console.error('Error analyzing:', error)
            }
        }

        setBatchAnalyzing(false)
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
                <div className="bg-white/70 rounded-2xl p-8 text-center backdrop-blur-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-b border-gray-300/50 shadow-sm z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            <span className="font-semibold text-gray-800 text-lg">Mini ATS</span>
                            <div className="hidden md:flex gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                            item.href === '/dashboard/ai'
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
                            <span className="hidden md:block text-sm text-gray-500">
                                {user?.email} ({isAdmin ? 'Admin' : 'Customer'})
                            </span>
                            <button
                                onClick={handleLogout}
                                className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-md hover:from-gray-600 hover:to-gray-700 transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">AI Screening</h1>
                        <p className="text-gray-500 mt-1">AI tools for recruitment</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Candidate Ranking</h2>
                            <p className="text-sm text-gray-500 mb-4">Rank candidates by AI match score</p>

                            <select
                                value={selectedJobId}
                                onChange={(e) => handleJobSelect(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4"
                            >
                                <option value="">Select a job</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            {rankedCandidates.length > 0 && (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {rankedCandidates.map((candidate, index) => (
                                        <div key={candidate.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                                                        <h3 className="font-semibold text-gray-800">{candidate.name}</h3>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{candidate.title}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${
                                                        (candidate.ai_analysis?.matchScore || 0) >= 80 ? 'text-green-600' :
                                                            (candidate.ai_analysis?.matchScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                        {candidate.ai_analysis?.matchScore || 0}% match
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {candidate.status}
                                                    </p>
                                                </div>
                                            </div>
                                            {candidate.ai_analysis?.strengths && (
                                                <div className="mt-2 text-xs text-gray-600">
                                                    <span className="font-medium">Strengths:</span> {candidate.ai_analysis.strengths.slice(0, 2).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Interview Questions</h2>
                            <p className="text-sm text-gray-500 mb-4">Generate custom interview questions for any job</p>

                            <select
                                value={jobForQuestions?.id || ''}
                                onChange={(e) => {
                                    const job = jobs.find(j => j.id === e.target.value)
                                    setJobForQuestions(job || null)
                                    setGeneratedQuestions(null)
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4"
                            >
                                <option value="">Select a job</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            <button
                                onClick={generateInterviewQuestions}
                                disabled={!jobForQuestions || generatingQuestions}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg mb-4 hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50"
                            >
                                {generatingQuestions ? 'Generating...' : 'Generate Questions'}
                            </button>

                            {generatedQuestions && (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    <div>
                                        <h4 className="font-semibold text-gray-700 text-sm mb-2">Technical Questions</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {generatedQuestions.technical?.map((q, i) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 text-sm mb-2 mt-3">Behavioral Questions</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {generatedQuestions.behavioral?.map((q, i) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 text-sm mb-2 mt-3">Role-Specific Questions</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {generatedQuestions.roleSpecific?.map((q, i) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">CV Screening</h2>
                            <p className="text-sm text-gray-500 mb-4">Upload multiple CVs and screen them against a job</p>

                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4"
                            >
                                <option value="">Select a job</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CVs (PDF, DOCX, TXT)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.txt"
                                    onChange={(e) => setBatchFiles(Array.from(e.target.files || []))}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                />
                            </div>

                            <button
                                onClick={handleBatchScreening}
                                disabled={batchFiles.length === 0 || !selectedJobId || batchAnalyzing}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg mb-4 hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50"
                            >
                                {batchAnalyzing ? 'Analyzing...' : `Screen ${batchFiles.length} CV(s)`}
                            </button>

                            {batchResults.length > 0 && (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    <h4 className="font-semibold text-gray-700 text-sm">Results</h4>
                                    {batchResults.map((result, i) => (
                                        <div key={i} className="bg-gray-50 rounded-lg p-2 text-sm">
                                            <p className="font-medium text-gray-800">{result.fileName}</p>
                                            <p className="text-gray-600">Match Score: {result.analysis?.matchScore || 0}%</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Job Description Optimizer</h2>
                            <p className="text-sm text-gray-500 mb-4">AI-powered job description improvement</p>

                            <select
                                value={selectedJobForOptimization?.id || ''}
                                onChange={(e) => {
                                    const job = jobs.find(j => j.id === e.target.value)
                                    setSelectedJobForOptimization(job || null)
                                    setOptimizedDescription('')
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4"
                            >
                                <option value="">Select a job to optimize</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            <button
                                onClick={optimizeJobDescription}
                                disabled={!selectedJobForOptimization || optimizing}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg mb-4 hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50"
                            >
                                {optimizing ? 'Optimizing...' : 'Optimize Description'}
                            </button>

                            {optimizedDescription && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-gray-700 text-sm mb-2">Optimized Version</h4>
                                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{optimizedDescription}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(optimizedDescription)
                                            alert('Copied to clipboard!')
                                        }}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Copy to clipboard →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-300 bg-white/40 backdrop-blur-sm py-4 text-center text-xs text-gray-500">
                Mini ATS
            </footer>
        </div>
    )
}