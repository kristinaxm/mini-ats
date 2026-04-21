'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, DragEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

type Candidate = {
    id: string
    name: string
    title: string
    status: string
    email?: string
    job_id: string
    jobs?: { title: string }
    interview_date?: string
}

type Job = {
    id: string
    title: string
}

const STATUS_COLUMNS = [
    { id: 'new', title: 'New', color: 'border-gray-500', headerColor: 'bg-gray-700 text-white', canDragTo: ['reviewed'] },
    { id: 'reviewed', title: 'Reviewed', color: 'border-gray-500', headerColor: 'bg-gray-700 text-white', canDragTo: [] },
    { id: 'interview', title: 'Interview', color: 'border-gray-500', headerColor: 'bg-gray-700 text-white', canDragTo: [] },
    { id: 'hired', title: 'Hired', color: 'border-gray-500', headerColor: 'bg-gray-800 text-green-300', canDragTo: [] },
    { id: 'rejected', title: 'Rejected', color: 'border-gray-500', headerColor: 'bg-gray-800 text-red-300', canDragTo: [] },
]

export default function KanbanPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedJobId, setSelectedJobId] = useState<string>('all')
    const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null)
    const [showCandidateModal, setShowCandidateModal] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

    const isAdmin = profile?.role === 'admin'

    const loadJobs = async () => {
        let query = supabase.from('jobs').select('id, title')
        if (!isAdmin && user) {
            query = query.eq('customer_id', user.id)
        }
        const { data } = await query
        setJobs(data || [])
    }

    const loadCandidates = async () => {
        let query = supabase
            .from('candidates')
            .select('*, jobs(title)')
            .order('created_at', { ascending: false })

        if (!isAdmin && user) {
            query = query.eq('customer_id', user.id)
        }

        const { data } = await query
        setCandidates(data || [])
    }

    const refreshData = async () => {
        await loadCandidates()
        await loadJobs()
    }

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

            await loadJobs()
            await loadCandidates()

            setLoading(false)
        }
        bootstrap()
    }, [])

    useEffect(() => {
        const handleRefresh = () => {
            refreshData()
        }

        window.addEventListener('refreshKanban', handleRefresh)

        return () => {
            window.removeEventListener('refreshKanban', handleRefresh)
        }
    }, [])

    const handleDragStart = (e: DragEvent, candidate: Candidate) => {
        if (candidate.status !== 'new') {
            e.preventDefault()
            if (candidate.status === 'reviewed') {
                alert('Reviewed candidates must be scheduled for an interview via the Calendar page.')
            } else if (candidate.status === 'interview') {
                alert('Interview candidates cannot be moved. Please use Interview Notes to make a decision.')
            } else {
                e.preventDefault()
            }
            return
        }
        setDraggedCandidate(candidate)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e: DragEvent, targetStatus: string) => {
        e.preventDefault()
        if (!draggedCandidate) return

        if (draggedCandidate.status !== 'new' || targetStatus !== 'reviewed') {
            alert('You can only move candidates from New to Reviewed.')
            setDraggedCandidate(null)
            return
        }

        const { error } = await supabase
            .from('candidates')
            .update({
                status: targetStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', draggedCandidate.id)

        if (!error) {
            setCandidates(prev => prev.map(c =>
                c.id === draggedCandidate.id ? { ...c, status: targetStatus } : c
            ))
        }

        setDraggedCandidate(null)
    }

    const openCandidateModal = (candidate: Candidate) => {
        setSelectedCandidate(candidate)
        setShowCandidateModal(true)
    }

    const goToInterviewNotes = () => {
        if (selectedCandidate) {
            sessionStorage.setItem('selectedCandidateId', selectedCandidate.id)
            sessionStorage.setItem('selectedCandidateName', selectedCandidate.name)
            sessionStorage.setItem('selectedCandidateJob', selectedCandidate.jobs?.title || '')
            setShowCandidateModal(false)
            router.push('/dashboard/notes')
        }
    }

    const goToCandidateProfile = () => {
        if (selectedCandidate) {
            sessionStorage.setItem('selectedCandidateId', selectedCandidate.id)
            setShowCandidateModal(false)
            router.push('/dashboard/candidates')
        }
    }

    const goToJobDetails = () => {
        if (selectedCandidate && selectedCandidate.job_id) {
            sessionStorage.setItem('selectedJobId', selectedCandidate.job_id)
            setShowCandidateModal(false)
            router.push('/dashboard/jobs')
        }
    }

    const getFilteredCandidates = () => {
        if (selectedJobId === 'all') return candidates
        return candidates.filter(c => c.job_id === selectedJobId)
    }

    const getCandidatesByStatus = (status: string) => {
        return getFilteredCandidates().filter(c => c.status === status)
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
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-2xl bg-white/70 p-8 text-center backdrop-blur-xl">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-600"></div>
                        <p className="mt-4 text-gray-600">Loading kanban board...</p>
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
                                            item.href === '/dashboard/kanban'
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
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Pipeline Overview</h1>
                            <p className="text-gray-500 mt-1 text-sm">
                                Drag to move candidates from New to Reviewed
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                To schedule interviews, go to the Calendar page. Final decisions are made in Interview Notes.
                            </p>
                        </div>

                        <div className="min-w-64">
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                <option value="all">All Jobs</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {STATUS_COLUMNS.map(column => {
                            const columnCandidates = getCandidatesByStatus(column.id)

                            return (
                                <div
                                    key={column.id}
                                    className={`rounded-xl border ${column.color} bg-white/50 backdrop-blur-sm shadow-lg`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, column.id)}
                                >
                                    <div className={`px-3 py-2 rounded-t-xl ${column.headerColor} border-b border-gray-600 text-sm font-medium`}>
                                        <div className="flex justify-between items-center">
                                            <h3>{column.title}</h3>
                                            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                                                {columnCandidates.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-2 space-y-2 min-h-[500px] max-h-[600px] overflow-y-auto">
                                        {columnCandidates.map(candidate => {
                                            const isDraggable = candidate.status === 'new'

                                            return (
                                                <div
                                                    key={candidate.id}
                                                    draggable={isDraggable}
                                                    onDragStart={(e) => handleDragStart(e, candidate)}
                                                    onClick={() => openCandidateModal(candidate)}
                                                    className={`bg-white rounded-lg p-2 shadow-sm border border-gray-200 transition-all ${
                                                        isDraggable ? 'cursor-move hover:shadow-md' : 'cursor-pointer hover:shadow-md'
                                                    } ${candidate.status === 'interview' ? 'border-l-4 border-l-gray-600' : ''}`}
                                                >
                                                    <h4 className="font-medium text-gray-800 text-sm">{candidate.name}</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">{candidate.title || 'No title'}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{candidate.jobs?.title}</p>

                                                    {candidate.interview_date && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Interview: {new Date(candidate.interview_date).toLocaleDateString()}
                                                        </p>
                                                    )}

                                                    {candidate.status === 'interview' && (
                                                        <div className="mt-1 text-xs text-gray-600">
                                                            Ready for decision
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {columnCandidates.length === 0 && (
                                            <div className="text-center text-gray-400 text-xs py-6">
                                                No candidates
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 bg-gray-100/80 border border-gray-300 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600">
                            <span className="font-medium">Workflow:</span> New → Reviewed →
                            <span className="text-gray-700 font-medium"> Calendar</span> (schedule interview) →
                            <span className="text-gray-700 font-medium"> Interview Notes</span> (make final decision).
                        </p>
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

            {showCandidateModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Candidate Details</h2>
                            <button onClick={() => setShowCandidateModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium text-gray-900">{selectedCandidate.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Title</p>
                                <p className="text-gray-900">{selectedCandidate.title || 'Not specified'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Job Position</p>
                                <p className="text-gray-900">{selectedCandidate.jobs?.title || 'Not assigned'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    selectedCandidate.status === 'new' ? 'bg-gray-100 text-gray-700' :
                                        selectedCandidate.status === 'reviewed' ? 'bg-gray-200 text-gray-700' :
                                            selectedCandidate.status === 'interview' ? 'bg-gray-300 text-gray-800' :
                                                selectedCandidate.status === 'hired' ? 'bg-green-100 text-green-700' :
                                                    'bg-red-100 text-red-700'
                                }`}>
                                    {selectedCandidate.status}
                                </span>
                            </div>
                            {selectedCandidate.interview_date && (
                                <div>
                                    <p className="text-sm text-gray-500">Interview Date</p>
                                    <p className="text-gray-900">{new Date(selectedCandidate.interview_date).toLocaleString()}</p>
                                </div>
                            )}

                            <div className="border-t pt-3 mt-2 space-y-2">
                                {selectedCandidate.status === 'interview' && (
                                    <button
                                        onClick={goToInterviewNotes}
                                        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-all hover:from-gray-500 hover:to-gray-600"
                                    >
                                        Interview Notes
                                    </button>
                                )}
                                <button
                                    onClick={goToCandidateProfile}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-all hover:from-gray-500 hover:to-gray-600"
                                >
                                    Candidate Profile
                                </button>
                                <button
                                    onClick={goToJobDetails}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-all hover:from-gray-500 hover:to-gray-600"
                                >
                                    Job Details
                                </button>
                            </div>

                            {selectedCandidate.status === 'interview' && (
                                <div className="mt-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                                    <p className="text-xs text-gray-600 text-center">
                                        This candidate is ready for a decision. Go to Interview Notes to hire or reject.
                                    </p>
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