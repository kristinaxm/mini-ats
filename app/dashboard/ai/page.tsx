'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

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

type BatchCandidate = {
    id: string
    name: string
    cvText: string
    fileName?: string
    file?: File
    analysis?: {
        matchScore: number
        strengths: string[]
        gaps: string[]
        questions: string[]
    }
}

type GapAnalysis = {
    missingSkills: string[]
    weakAreas: string[]
    recommendations: string[]
    trainingSuggestions: string[]
    matchScore: number
}

export default function AIScreeningPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<Job[]>([])

    const [selectedJobId, setSelectedJobId] = useState('')
    const [rankedCandidates, setRankedCandidates] = useState<any[]>([])

    const [jobForQuestions, setJobForQuestions] = useState<Job | null>(null)
    const [generatedQuestions, setGeneratedQuestions] = useState<{
        technical: string[]
        behavioral: string[]
        roleSpecific: string[]
    } | null>(null)
    const [generatingQuestions, setGeneratingQuestions] = useState(false)

    const [batchFiles, setBatchFiles] = useState<File[]>([])
    const [batchTexts, setBatchTexts] = useState<{ id: string; text: string; name: string }[]>([])
    const [batchCandidates, setBatchCandidates] = useState<BatchCandidate[]>([])
    const [batchAnalyzing, setBatchAnalyzing] = useState(false)
    const [newTextCv, setNewTextCv] = useState({ name: '', text: '' })
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

    const [selectedCandidateForGap, setSelectedCandidateForGap] = useState<Candidate | null>(null)
    const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null)
    const [analyzingGap, setAnalyzingGap] = useState(false)
    const [candidatesForGap, setCandidatesForGap] = useState<Candidate[]>([])

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
            const ranked = [...data].sort((a, b) =>
                (b.ai_analysis?.matchScore || 0) - (a.ai_analysis?.matchScore || 0)
            )
            setRankedCandidates(ranked)
            setCandidatesForGap(ranked)
        }
    }

    const handleJobSelect = (jobId: string) => {
        setSelectedJobId(jobId)
        loadCandidatesForJob(jobId)
        setSelectedCandidateForGap(null)
        setGapAnalysis(null)
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

    const analyzeGap = async () => {
        if (!selectedCandidateForGap || !selectedJobId) {
            alert('Please select both a candidate and a job first')
            return
        }

        const selectedJob = jobs.find(j => j.id === selectedJobId)
        if (!selectedJob) return

        setAnalyzingGap(true)
        setGapAnalysis(null)

        try {
            const response = await fetch('/api/ai/gap-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvText: selectedCandidateForGap.cv_text,
                    jobTitle: selectedJob.title,
                    jobDescription: selectedJob.description,
                    currentMatchScore: selectedCandidateForGap.ai_analysis?.matchScore || 0
                })
            })
            const data = await response.json()
            setGapAnalysis(data.analysis)
        } catch (error) {
            console.error('Error analyzing gap:', error)
            alert('Failed to analyze gap. Please try again.')
        } finally {
            setAnalyzingGap(false)
        }
    }

    const addTextCV = () => {
        if (!newTextCv.name.trim() || !newTextCv.text.trim()) {
            alert('Please enter both name and CV text')
            return
        }

        setBatchTexts(prev => [...prev, {
            id: Date.now().toString(),
            name: newTextCv.name,
            text: newTextCv.text
        }])
        setNewTextCv({ name: '', text: '' })
    }

    const removeTextCV = (id: string) => {
        setBatchTexts(prev => prev.filter(t => t.id !== id))
    }

    const removeFile = (index: number) => {
        setBatchFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleBatchScreening = async () => {
        if (batchFiles.length === 0 && batchTexts.length === 0) {
            alert('Please add at least one CV (file or text)')
            return
        }

        if (!selectedJobId) {
            alert('Please select a job first')
            return
        }

        setBatchAnalyzing(true)
        setBatchCandidates([])

        const selectedJob = jobs.find(j => j.id === selectedJobId)
        const allCandidates: BatchCandidate[] = []

        for (const textCv of batchTexts) {
            allCandidates.push({
                id: textCv.id,
                name: textCv.name,
                cvText: textCv.text
            })
        }

        for (let i = 0; i < batchFiles.length; i++) {
            const file = batchFiles[i]
            allCandidates.push({
                id: `file-${Date.now()}-${i}`,
                name: file.name.replace(/\.[^/.]+$/, ''),
                cvText: '',
                fileName: file.name,
                file: file
            })
        }

        setBatchCandidates(allCandidates.map(c => ({ ...c, analysis: undefined })))
        setBatchProgress({ current: 0, total: allCandidates.length })

        for (let i = 0; i < allCandidates.length; i++) {
            const candidate = allCandidates[i]

            const formData = new FormData()

            if (candidate.file) {
                formData.append('file', candidate.file)
            } else if (candidate.cvText) {
                formData.append('cvText', candidate.cvText)
            }

            formData.append('jobTitle', selectedJob?.title || '')
            formData.append('jobDescription', selectedJob?.description || '')

            try {
                const response = await fetch('/api/analyze-cv', {
                    method: 'POST',
                    body: formData
                })
                const data = await response.json()

                setBatchCandidates(prev => prev.map((c, idx) =>
                    idx === i ? { ...c, analysis: data.analysis } : c
                ))
            } catch (error) {
                console.error('Error analyzing:', error)
                setBatchCandidates(prev => prev.map((c, idx) =>
                    idx === i ? { ...c, analysis: { matchScore: 0, strengths: ['Error analyzing'], gaps: ['Could not process this CV'], questions: [] } } : c
                ))
            }

            setBatchProgress({ current: i + 1, total: allCandidates.length })
        }

        setBatchAnalyzing(false)
        setBatchProgress({ current: 0, total: 0 })
    }

    const clearBatchResults = () => {
        setBatchCandidates([])
        setBatchFiles([])
        setBatchTexts([])
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
        { name: 'Calendar', href: '/dashboard/calendar' },
        { name: 'AI Screening', href: '/dashboard/ai' },
        { name: 'Interview Notes', href: '/dashboard/notes' },
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
                            <NotificationBell />
                            <span className="hidden md:block text-sm text-gray-500">
                            {profile?.full_name || user?.email?.split('@')[0] || 'User'} ({isAdmin ? 'Admin' : 'Customer'})
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                <option value="">Select a job</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            {rankedCandidates.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {rankedCandidates.map((candidate, index) => (
                                        <div key={candidate.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
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
                                                    <p className="text-xs text-gray-400 mt-1">{candidate.status}</p>
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
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No candidates yet. Upload some CVs to get started.
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Match Gap Analysis</h2>
                            <p className="text-sm text-gray-500 mb-4">Understand why a candidate doesn't match and get actionable improvement suggestions</p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select a candidate</label>
                                <select
                                    value={selectedCandidateForGap?.id || ''}
                                    onChange={(e) => {
                                        const candidate = candidatesForGap.find(c => c.id === e.target.value)
                                        setSelectedCandidateForGap(candidate || null)
                                        setGapAnalysis(null)
                                    }}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    disabled={candidatesForGap.length === 0}
                                >
                                    <option value="">{candidatesForGap.length === 0 ? 'No candidates available - upload some first' : 'Select a candidate to analyze'}</option>
                                    {candidatesForGap.map(candidate => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {candidate.name} - {candidate.ai_analysis?.matchScore || 0}% match
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={analyzeGap}
                                disabled={!selectedCandidateForGap || !selectedJobId || analyzingGap}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg mb-4 hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50"
                            >
                                {analyzingGap ? 'Analyzing Gap...' : 'Analyze Skill Gaps'}
                            </button>

                            {gapAnalysis && (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Missing Skills</h4>
                                        {gapAnalysis.missingSkills.length > 0 ? (
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                {gapAnalysis.missingSkills.map((skill, i) => (
                                                    <li key={i}>{skill}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No major missing skills identified</p>
                                        )}
                                    </div>

                                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Weak Areas</h4>
                                        {gapAnalysis.weakAreas.length > 0 ? (
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                {gapAnalysis.weakAreas.map((area, i) => (
                                                    <li key={i}>{area}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No significant weak areas identified</p>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <h4 className="font-semibold text-gray-700 text-sm mb-2">Training Suggestions</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {gapAnalysis.trainingSuggestions.map((suggestion, i) => (
                                                <li key={i}>{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <h4 className="font-semibold text-gray-700 text-sm mb-2">Recommendations</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {gapAnalysis.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
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

                    <div className="mt-8 bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Batch CV Screening</h2>
                        <p className="text-sm text-gray-500 mb-4">Upload multiple CVs AND/OR paste CV texts for one-time analysis against a job</p>

                        {(batchFiles.length > 0 || batchTexts.length > 0) && (
                            <div className="mb-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-700">Ready to analyze:</p>
                                <div className="flex gap-4 mt-1 text-xs text-gray-600">
                                    <span>Files: {batchFiles.length}</span>
                                    <span>Text CVs: {batchTexts.length}</span>
                                    <span>Total: {batchFiles.length + batchTexts.length}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CV Files (PDF, DOCX, TXT)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.txt"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || [])
                                        setBatchFiles(prev => [...prev, ...files])
                                    }}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                />

                                {batchFiles.length > 0 && (
                                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                                        <p className="text-xs font-medium text-gray-600">Selected files ({batchFiles.length}):</p>
                                        {batchFiles.map((file, index) => (
                                            <div key={index} className="flex justify-between items-center text-xs bg-gray-100 rounded p-2">
                                                <span className="text-gray-600 truncate flex-1">{file.name}</span>
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className="text-gray-500 hover:text-red-600 ml-2 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Paste CV Texts</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Candidate name"
                                        value={newTextCv.name}
                                        onChange={(e) => setNewTextCv({ ...newTextCv, name: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    />
                                    <textarea
                                        rows={3}
                                        placeholder="Paste CV text here..."
                                        value={newTextCv.text}
                                        onChange={(e) => setNewTextCv({ ...newTextCv, text: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTextCV}
                                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 rounded-lg text-sm transition-all"
                                    >
                                        + Add CV Text
                                    </button>
                                </div>

                                {batchTexts.length > 0 && (
                                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                                        <p className="text-xs font-medium text-gray-600">Added texts ({batchTexts.length}):</p>
                                        {batchTexts.map(text => (
                                            <div key={text.id} className="flex justify-between items-center text-xs bg-gray-100 rounded p-2">
                                                <span className="text-gray-600 truncate flex-1">{text.name}</span>
                                                <button
                                                    onClick={() => removeTextCV(text.id)}
                                                    className="text-gray-500 hover:text-red-600 ml-2 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                <option value="">Select a job to screen against</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBatchScreening}
                                    disabled={(batchFiles.length === 0 && batchTexts.length === 0) || !selectedJobId || batchAnalyzing}
                                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50"
                                >
                                    {batchAnalyzing ? `Analyzing... (${batchProgress.current}/${batchProgress.total})` : `Screen ${batchFiles.length + batchTexts.length} CV(s)`}
                                </button>

                                {batchCandidates.length > 0 && batchCandidates.every(c => c.analysis) && (
                                    <button
                                        onClick={clearBatchResults}
                                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all"
                                    >
                                        Clear Results
                                    </button>
                                )}
                            </div>
                        </div>

                        {batchCandidates.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                                <h4 className="font-semibold text-gray-700 text-sm">Analysis Results</h4>
                                {batchCandidates.map((candidate, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-800">{candidate.name}</p>
                                                    {candidate.fileName && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">File</span>
                                                    )}
                                                    {candidate.cvText && !candidate.fileName && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Text</span>
                                                    )}
                                                </div>
                                                {candidate.analysis ? (
                                                    <>
                                                        <p className="text-gray-600 text-sm mt-1">
                                                            Match Score: <span className={`font-bold ${
                                                            candidate.analysis.matchScore >= 80 ? 'text-green-600' :
                                                                candidate.analysis.matchScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>{candidate.analysis.matchScore}%</span>
                                                        </p>
                                                        {candidate.analysis.strengths && candidate.analysis.strengths.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-gray-600">Strengths:</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {candidate.analysis.strengths.slice(0, 3).join(', ')}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {candidate.analysis.gaps && candidate.analysis.gaps.length > 0 && (
                                                            <div className="mt-1">
                                                                <p className="text-xs font-medium text-gray-600">Gaps:</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {candidate.analysis.gaps.slice(0, 2).join(', ')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-400 text-sm italic">Analyzing...</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
        </div>
    )
}