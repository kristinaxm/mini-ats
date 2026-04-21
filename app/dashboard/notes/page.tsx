'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

type Interview = {
    id: string
    candidate_id: string
    candidate_name: string
    candidate_title?: string
    candidate_status: string
    job_title: string
    interview_date: string
    interview_type: string
    meeting_link: string
    notes?: string
    rating?: number
    strengths?: string
    weaknesses?: string
    recommendation?: string
    ai_analysis?: string
    cv_text?: string
    status: string
    created_at?: string
    updated_at?: string
}

type Candidate = {
    id: string
    name: string
    title: string
    job_id: string
    status: string
    jobs?: { title: string }
    cv_text?: string
}

export default function InterviewNotesPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [interviews, setInterviews] = useState<Interview[]>([])
    const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
    const [candidateDetails, setCandidateDetails] = useState<Candidate | null>(null)

    const [notes, setNotes] = useState('')
    const [rating, setRating] = useState<number>(3)
    const [strengths, setStrengths] = useState('')
    const [weaknesses, setWeaknesses] = useState('')
    const [recommendation, setRecommendation] = useState('')
    const [aiAnalysis, setAiAnalysis] = useState('')

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

            await loadInterviews()

            setLoading(false)
        }
        bootstrap()
    }, [])

    useEffect(() => {
        if (interviews.length > 0 && !selectedInterview) {
            const selectedId = sessionStorage.getItem('selectedCandidateId')
            if (selectedId) {
                const interview = interviews.find(i => i.candidate_id === selectedId)
                if (interview) {
                    selectInterview(interview)
                }
                sessionStorage.removeItem('selectedCandidateId')
                sessionStorage.removeItem('selectedCandidateName')
                sessionStorage.removeItem('selectedCandidateJob')
            }
        }
    }, [interviews])

    const loadInterviews = async () => {
        let query = supabase
            .from('interviews')
            .select(`
                *,
                candidates(id, name, title, status, cv_text, jobs(title))
            `)
            .order('interview_date', { ascending: true })

        if (!isAdmin && user) {
            query = query.eq('user_id', user.id)
        }

        const { data } = await query

        if (data) {
            const formatted = data.map((i: any) => ({
                ...i,
                candidate_name: i.candidates?.name,
                candidate_status: i.candidates?.status,
                candidate_title: i.candidates?.title,
                job_title: i.candidates?.jobs?.title,
                cv_text: i.candidates?.cv_text
            }))
            setInterviews(formatted)
        }
    }

    const selectInterview = async (interview: Interview) => {
        setSelectedInterview(interview)
        setCandidateDetails({
            id: interview.candidate_id,
            name: interview.candidate_name || '',
            title: interview.candidate_title || '',
            job_id: '',
            status: interview.candidate_status || '',
            cv_text: interview.cv_text
        })

        const { data: noteData } = await supabase
            .from('interview_notes')
            .select('*')
            .eq('interview_id', interview.id)
            .single()

        if (noteData) {
            setNotes(noteData.notes || '')
            setRating(noteData.rating || 3)
            setStrengths(noteData.strengths || '')
            setWeaknesses(noteData.weaknesses || '')
            setRecommendation(noteData.recommendation || '')
            setAiAnalysis(noteData.ai_analysis || '')
        } else {
            setNotes('')
            setRating(3)
            setStrengths('')
            setWeaknesses('')
            setRecommendation('')
            setAiAnalysis('')
        }
    }

    const analyzeWithAI = async () => {
        if (!notes && !strengths && !weaknesses) {
            setError('Please add some notes before AI analysis')
            return
        }

        setAnalyzing(true)
        setError('')

        try {
            const response = await fetch('/api/analyze-interview-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes,
                    strengths,
                    weaknesses,
                    jobTitle: selectedInterview?.job_title,
                    candidateName: selectedInterview?.candidate_name
                })
            })

            const data = await response.json()

            if (data.error) {
                setError(data.error)
            } else if (data.analysis) {
                setAiAnalysis(data.analysis)
                setSuccessMessage('AI analysis completed')
                setTimeout(() => setSuccessMessage(''), 3000)
            }
        } catch (err) {
            setError('Failed to analyze. Please try again.')
            console.error(err)
        } finally {
            setAnalyzing(false)
        }
    }

    const saveNoteAndDecision = async () => {
        if (!selectedInterview) return

        setSaving(true)
        setError('')
        setSuccessMessage('')

        const noteData = {
            interview_id: selectedInterview.id,
            candidate_id: selectedInterview.candidate_id,
            user_id: user?.id,
            notes: notes || null,
            rating: rating,
            strengths: strengths || null,
            weaknesses: weaknesses || null,
            recommendation: recommendation || null,
            ai_analysis: aiAnalysis || null,
            updated_at: new Date().toISOString()
        }

        const { error: noteError } = await supabase
            .from('interview_notes')
            .upsert(noteData, { onConflict: 'interview_id' })

        if (noteError) {
            setError(noteError.message)
            setSaving(false)
            return
        }

        if (recommendation === 'hire') {
            await supabase
                .from('candidates')
                .update({ status: 'hired', updated_at: new Date().toISOString() })
                .eq('id', selectedInterview.candidate_id)

            await supabase
                .from('interviews')
                .update({ status: 'completed' })
                .eq('id', selectedInterview.id)

            await supabase.from('notifications').insert({
                user_id: user?.id,
                title: 'Candidate Hired',
                message: `${selectedInterview.candidate_name} has been hired for ${selectedInterview.job_title}`,
                type: 'success'
            })

            setSuccessMessage('Candidate hired - decision saved')
        }
        else if (recommendation === 'reject') {
            await supabase
                .from('candidates')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', selectedInterview.candidate_id)

            await supabase
                .from('interviews')
                .update({ status: 'completed' })
                .eq('id', selectedInterview.id)

            await supabase.from('notifications').insert({
                user_id: user?.id,
                title: 'Candidate Rejected',
                message: `${selectedInterview.candidate_name} has been rejected for ${selectedInterview.job_title}`,
                type: 'warning'
            })

            setSuccessMessage('Candidate rejected - decision saved')
        }
        else {
            setSuccessMessage('Notes saved successfully')
        }

        await loadInterviews()

        setTimeout(() => setSuccessMessage(''), 3000)
        setSaving(false)

        window.dispatchEvent(new CustomEvent('refreshKanban'))
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const now = new Date()
    const upcomingInterviews = interviews.filter(i => new Date(i.interview_date) > now && i.status !== 'completed')
    const waitingForDecision = interviews.filter(i => new Date(i.interview_date) <= now && i.status !== 'completed' && i.candidate_status === 'interview')
    const completedInterviews = interviews.filter(i => i.status === 'completed' || i.candidate_status === 'hired' || i.candidate_status === 'rejected')

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
                        <p className="mt-4 text-gray-600">Loading...</p>
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

            <nav className="relative z-20 fixed top-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-b border-gray-300/50 shadow-sm">
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
                                            item.href === '/dashboard/notes'
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
                                {profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'User'} ({isAdmin ? 'Admin' : 'Customer'})
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

            <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Interview Management</h1>
                        <p className="text-gray-500 mt-1">Review interviews, take notes, and make hiring decisions</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                            {successMessage}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                                <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-600">
                                    <h3 className="font-semibold text-white text-sm flex justify-between items-center">
                                        Upcoming Interviews
                                        <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">{upcomingInterviews.length}</span>
                                    </h3>
                                </div>
                                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                    {upcomingInterviews.length > 0 ? (
                                        upcomingInterviews.map(interview => (
                                            <div
                                                key={interview.id}
                                                onClick={() => selectInterview(interview)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all ${
                                                    selectedInterview?.id === interview.id
                                                        ? 'bg-gray-200 border-l-4 border-l-gray-600 shadow-sm'
                                                        : 'bg-white border border-gray-200 hover:shadow-md hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{interview.candidate_name}</p>
                                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-600">
                                                            {new Date(interview.interview_date).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-gray-400 capitalize">{interview.interview_type}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 text-sm py-8">No upcoming interviews</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                                <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-600">
                                    <h3 className="font-semibold text-white text-sm flex justify-between items-center">
                                        Waiting for Decision
                                        <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full">{waitingForDecision.length}</span>
                                    </h3>
                                </div>
                                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                    {waitingForDecision.length > 0 ? (
                                        waitingForDecision.map(interview => (
                                            <div
                                                key={interview.id}
                                                onClick={() => selectInterview(interview)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all ${
                                                    selectedInterview?.id === interview.id
                                                        ? 'bg-yellow-50 border-l-4 border-l-yellow-600 shadow-sm'
                                                        : 'bg-white border border-gray-200 hover:shadow-md hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{interview.candidate_name}</p>
                                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-600">
                                                            {new Date(interview.interview_date).toLocaleDateString()}
                                                        </p>
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                            Pending
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 text-sm py-8">No interviews waiting for decision</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                                <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-600">
                                    <h3 className="font-semibold text-white text-sm flex justify-between items-center">
                                        Completed
                                        <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">{completedInterviews.length}</span>
                                    </h3>
                                </div>
                                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                                    {completedInterviews.length > 0 ? (
                                        completedInterviews.map(interview => (
                                            <div
                                                key={interview.id}
                                                onClick={() => selectInterview(interview)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all ${
                                                    selectedInterview?.id === interview.id
                                                        ? 'bg-gray-200 border-l-4 border-l-gray-600 shadow-sm'
                                                        : 'bg-white border border-gray-200 hover:shadow-md hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{interview.candidate_name}</p>
                                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            interview.candidate_status === 'hired'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {interview.candidate_status === 'hired' ? 'Hired' : 'Rejected'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 text-sm py-8">No completed interviews</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                            {!selectedInterview ? (
                                <div className="text-center text-gray-500 py-16">
                                    <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    <p className="text-lg font-medium">No interview selected</p>
                                    <p className="text-sm mt-2">Select an interview from the left to view details</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    <div className={`p-6 ${
                                        selectedInterview.candidate_status === 'interview'
                                            ? 'bg-gradient-to-r from-gray-100 to-gray-50'
                                            : 'bg-white'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-800">{selectedInterview.candidate_name}</h2>
                                                <p className="text-gray-500 text-sm mt-1">{selectedInterview.job_title}</p>
                                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(selectedInterview.interview_date).toLocaleString()}
                </span>
                                                    <span className="capitalize flex items-center gap-1">
                    {selectedInterview.interview_type === 'online' && (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.5-4.5M15 10l-4.5-4.5M15 10l4.5 4.5M15 10l-4.5 4.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Video Call
                        </>
                    )}
                                                        {selectedInterview.interview_type === 'phone' && (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                Phone Call
                                                            </>
                                                        )}
                                                        {selectedInterview.interview_type === 'onsite' && (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                                In-person
                                                            </>
                                                        )}
                                                     </span>
                                                </div>
                                            </div>
                                            {selectedInterview.candidate_status === 'interview' && (
                                                <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                                                   Ready for decision
                                               </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Overall Rating
                                            </label>
                                            <div className="flex gap-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setRating(star)}
                                                        className={`text-3xl transition-all ${
                                                            star <= rating ? 'text-gray-700' : 'text-gray-200'
                                                        } hover:scale-110 hover:text-gray-600`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Strengths
                                                </label>
                                                <textarea
                                                    value={strengths}
                                                    onChange={(e) => setStrengths(e.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                    placeholder="What went well?"
                                                />
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Areas to improve
                                                </label>
                                                <textarea
                                                    value={weaknesses}
                                                    onChange={(e) => setWeaknesses(e.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                    placeholder="What could be better?"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Detailed Notes
                                            </label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                placeholder="Write your detailed interview notes here..."
                                            />
                                        </div>

                                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-white font-semibold">AI Analysis</h3>
                                                <button
                                                    onClick={analyzeWithAI}
                                                    disabled={analyzing || (!notes && !strengths && !weaknesses)}
                                                    className="px-5 py-2 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all disabled:opacity-50 shadow-md"
                                                >
                                                    {analyzing ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Analyzing...
                                                        </>
                                                    ) : (
                                                        "Generate AI Analysis"
                                                    )}
                                                </button>
                                            </div>
                                            {aiAnalysis ? (
                                                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                                                    <p className="text-sm text-white leading-relaxed">{aiAnalysis}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-300 italic">
                                                    Click the button above to get AI-powered insights about this interview
                                                </p>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                                Final Decision
                                            </label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => setRecommendation('hire')}
                                                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                        recommendation === 'hire'
                                                            ? 'bg-green-600 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                                                    }`}
                                                >
                                                    Hire
                                                </button>
                                                <button
                                                    onClick={() => setRecommendation('further_review')}
                                                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                        recommendation === 'further_review'
                                                            ? 'bg-yellow-600 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700'
                                                    }`}
                                                >
                                                    Further Review
                                                </button>
                                                <button
                                                    onClick={() => setRecommendation('reject')}
                                                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                        recommendation === 'reject'
                                                            ? 'bg-red-600 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                                                    }`}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={saveNoteAndDecision}
                                            disabled={saving}
                                            className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-3 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 shadow-md"
                                        >
                                            {saving ? 'Saving...' : 'Save Notes & Decision'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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