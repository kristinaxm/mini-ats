'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Interview = {
    id: string
    candidate_id: string
    candidate_name: string
    candidate_status: string
    candidate_job_id?: string
    job_id?: string
    job_title: string
    interview_date: string
    interview_type: string
    meeting_link: string
    notes: string
    status: string
    cv_text?: string
}

type Candidate = {
    id: string
    name: string
    job_id: string
    title?: string
    status?: string
}

type Job = {
    id: string
    title: string
}

export default function Calendar() {
    const router = useRouter()
    const supabase = createClient()

    const [interviews, setInterviews] = useState<Interview[]>([])
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [showModal, setShowModal] = useState(false)
    const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [newInterview, setNewInterview] = useState({
        candidate_id: '',
        interview_date: '',
        interview_type: 'online',
        meeting_link: '',
        notes: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: interviewsData } = await supabase
            .from('interviews')
            .select(`
                *,
                candidates(name, title, status, job_id),
                jobs(title)
            `)
            .order('interview_date', { ascending: true })

        if (interviewsData) {
            const formatted = interviewsData.map((i: any) => ({
                ...i,
                candidate_name: i.candidates?.name,
                candidate_status: i.candidates?.status,
                candidate_job_id: i.candidates?.job_id,
                job_title: i.jobs?.title
            }))
            setInterviews(formatted)
        }

        const { data: candidatesData } = await supabase
            .from('candidates')
            .select('id, name, job_id, title, status')
        setCandidates(candidatesData || [])

        const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title')
        setJobs(jobsData || [])
    }

    const addInterview = async () => {
        if (!newInterview.candidate_id || !newInterview.interview_date) {
            alert('Please select a candidate and date/time')
            return
        }

        setLoading(true)

        const selectedCandidate = candidates.find(c => c.id === newInterview.candidate_id)

        const { error: interviewError } = await supabase
            .from('interviews')
            .insert({
                candidate_id: newInterview.candidate_id,
                job_id: selectedCandidate?.job_id,
                interview_date: newInterview.interview_date,
                interview_type: newInterview.interview_type,
                meeting_link: newInterview.meeting_link || null,
                notes: newInterview.notes || null,
                status: 'scheduled'
            })

        if (interviewError) {
            console.error('Error adding interview:', interviewError)
            alert('Failed to schedule interview: ' + interviewError.message)
            setLoading(false)
            return
        }

        await supabase
            .from('candidates')
            .update({
                status: 'interview',
                updated_at: new Date().toISOString()
            })
            .eq('id', newInterview.candidate_id)

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'Interview Scheduled',
                message: `Interview with ${selectedCandidate?.name} scheduled for ${new Date(newInterview.interview_date).toLocaleString()}`,
                type: 'interview'
            })
        }

        setShowAddModal(false)
        setNewInterview({
            candidate_id: '',
            interview_date: '',
            interview_type: 'online',
            meeting_link: '',
            notes: ''
        })
        await loadData()
        window.dispatchEvent(new CustomEvent('refreshKanban'))
        setLoading(false)
        alert('Interview scheduled and candidate moved to Interview stage!')
    }

    const updateCandidateStatusAndInterview = async (candidateId: string, newStatus: string, interviewId: string) => {
        setUpdatingStatus(true)

        const { error: candidateError } = await supabase
            .from('candidates')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', candidateId)

        if (candidateError) {
            console.error('Error updating candidate:', candidateError)
            alert('Failed to update candidate status: ' + candidateError.message)
            setUpdatingStatus(false)
            return
        }

        await supabase
            .from('interviews')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', interviewId)

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase.from('notifications').insert({
                user_id: user.id,
                title: newStatus === 'hired' ? 'Candidate Hired!' : 'Candidate Rejected',
                message: `Candidate has been ${newStatus} after interview`,
                type: newStatus === 'hired' ? 'success' : 'warning'
            })
        }

        await loadData()
        window.dispatchEvent(new CustomEvent('refreshKanban'))
        setShowModal(false)
        setUpdatingStatus(false)
        alert(`Candidate marked as ${newStatus}!`)
    }

    const deleteInterview = async (id: string, candidateId: string) => {
        if (!confirm('Are you sure you want to delete this interview? This will move the candidate back to Reviewed status.')) return

        const { error: candidateError } = await supabase
            .from('candidates')
            .update({
                status: 'reviewed',
                updated_at: new Date().toISOString()
            })
            .eq('id', candidateId)

        if (candidateError) {
            console.error('Error resetting candidate:', candidateError)
            alert('Failed to reset candidate status: ' + candidateError.message)
            return
        }

        const { error } = await supabase
            .from('interviews')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting interview:', error)
            alert('Failed to delete interview: ' + error.message)
        } else {
            await loadData()
            setShowModal(false)
            window.dispatchEvent(new CustomEvent('refreshKanban'))
            alert('Interview deleted and candidate moved back to Reviewed!')
        }
    }

    const goToInterviewNotes = () => {
        if (selectedInterview) {
            sessionStorage.setItem('selectedCandidateId', selectedInterview.candidate_id)
            sessionStorage.setItem('selectedCandidateName', selectedInterview.candidate_name)
            sessionStorage.setItem('selectedCandidateJob', selectedInterview.job_title)
            setShowModal(false)
            router.push('/dashboard/notes')
        }
    }

    const goToCandidateProfile = () => {
        if (selectedInterview) {
            sessionStorage.setItem('selectedCandidateId', selectedInterview.candidate_id)
            setShowModal(false)
            router.push('/dashboard/candidates')
        }
    }

    const goToJobDetails = () => {
        if (selectedInterview) {
            const jobId = selectedInterview.job_id || selectedInterview.candidate_job_id
            if (jobId) {
                sessionStorage.setItem('selectedJobId', jobId)
            }
            setShowModal(false)
            router.push('/dashboard/jobs')
        }
    }

    const getFirstDayOfMonth = (date: Date) => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const dayOfWeek = firstDay.getDay()
        return dayOfWeek === 0 ? 6 : dayOfWeek - 1
    }

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const hasInterviewOnDate = (day: number) => {
        const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
        return interviews.some(i => new Date(i.interview_date).toDateString() === checkDate.toDateString())
    }

    const getInterviewsOnDate = (day: number) => {
        const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
        return interviews.filter(i => new Date(i.interview_date).toDateString() === checkDate.toDateString())
    }

    const changeMonth = (increment: number) => {
        const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + increment, 1)
        setSelectedDate(newDate)
    }

    const goToToday = () => {
        setSelectedDate(new Date())
    }

    const daysInMonth = getDaysInMonth(selectedDate)
    const firstDay = getFirstDayOfMonth(selectedDate)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const blanks = Array.from({ length: firstDay }, (_, i) => i)

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const now = new Date()
    const upcomingInterviews = interviews.filter(i => new Date(i.interview_date) > now && i.status !== 'completed')
    const waitingForDecision = interviews.filter(i => new Date(i.interview_date) <= now && i.status !== 'completed' && i.candidate_status === 'interview')
    const completedInterviews = interviews.filter(i => i.status === 'completed' || i.candidate_status === 'hired' || i.candidate_status === 'rejected')

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Interview Calendar</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:from-gray-500 hover:to-gray-600 transition-all shadow-md"
                    >
                        + Schedule Interview
                    </button>
                    <div className="flex items-center gap-1 bg-gray-100/80 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-2 bg-white hover:bg-gray-200 rounded-md transition-colors shadow-sm text-gray-700 font-bold"
                            aria-label="Previous month"
                        >
                            ◀
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-md transition-colors font-medium"
                        >
                            Today
                        </button>
                        <span className="text-lg font-semibold text-gray-800 min-w-[160px] text-center px-2">
                            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                        </span>
                        <button
                            onClick={() => changeMonth(1)}
                            className="p-2 bg-white hover:bg-gray-200 rounded-md transition-colors shadow-sm text-gray-700 font-bold"
                            aria-label="Next month"
                        >
                            ▶
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2 bg-gray-100/50 rounded-lg">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mb-8">
                {blanks.map((_, i) => (
                    <div key={`blank-${i}`} className="bg-gray-50/50 rounded-lg p-2 min-h-[100px]" />
                ))}

                {days.map(day => {
                    const hasInterview = hasInterviewOnDate(day)
                    const dayInterviews = getInterviewsOnDate(day)

                    return (
                        <div
                            key={day}
                            className={`bg-white border rounded-lg p-2 min-h-[100px] hover:shadow-md transition-all cursor-pointer ${
                                hasInterview ? 'border-gray-400 shadow-sm bg-gray-50' : 'border-gray-200'
                            }`}
                            onClick={() => {
                                if (dayInterviews.length > 0) {
                                    setSelectedInterview(dayInterviews[0])
                                    setShowModal(true)
                                }
                            }}
                        >
                            <span className={`text-sm font-medium ${hasInterview ? 'text-gray-800' : 'text-gray-500'}`}>
                                {day}
                            </span>
                            {dayInterviews.slice(0, 2).map(interview => (
                                <div key={interview.id} className="mt-1 text-xs">
                                    <p className="text-gray-700 truncate font-medium">{interview.candidate_name}</p>
                                    <p className="text-gray-400 text-xs">{interview.interview_type}</p>
                                </div>
                            ))}
                            {dayInterviews.length > 2 && (
                                <p className="text-xs text-gray-500 mt-1 font-medium">+{dayInterviews.length - 2} more</p>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                        Upcoming Interviews
                        <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full">{upcomingInterviews.length}</span>
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {upcomingInterviews.length > 0 ? (
                            upcomingInterviews.map(interview => (
                                <div
                                    key={interview.id}
                                    onClick={() => {
                                        setSelectedInterview(interview)
                                        setShowModal(true)
                                    }}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200 shadow-sm"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800">{interview.candidate_name}</p>
                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-700 font-medium">
                                            {new Date(interview.interview_date).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-400 capitalize">{interview.interview_type}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-4 bg-gray-50 rounded-lg">No upcoming interviews</p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                        Waiting for Decision
                        <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full">{waitingForDecision.length}</span>
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {waitingForDecision.length > 0 ? (
                            waitingForDecision.map(interview => (
                                <div
                                    key={interview.id}
                                    onClick={() => {
                                        setSelectedInterview(interview)
                                        setShowModal(true)
                                    }}
                                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 cursor-pointer transition-colors border border-yellow-200 shadow-sm"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800">{interview.candidate_name}</p>
                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-700 font-medium">
                                            {new Date(interview.interview_date).toLocaleDateString()}
                                        </p>
                                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                                            Pending
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-4 bg-gray-50 rounded-lg">No interviews waiting for decision</p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                        Completed
                        <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full">{completedInterviews.length}</span>
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {completedInterviews.length > 0 ? (
                            completedInterviews.map(interview => (
                                <div
                                    key={interview.id}
                                    className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200 opacity-75"
                                >
                                    <div>
                                        <p className="font-medium text-gray-700">{interview.candidate_name}</p>
                                        <p className="text-xs text-gray-500">{interview.job_title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">
                                            {new Date(interview.interview_date).toLocaleDateString()}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            interview.candidate_status === 'hired'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {interview.candidate_status === 'hired' ? 'Hired' : 'Rejected'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-4 bg-gray-50 rounded-lg">No completed interviews</p>
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Schedule Interview</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                                <select
                                    value={newInterview.candidate_id}
                                    onChange={(e) => setNewInterview({...newInterview, candidate_id: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                    <option value="">Select candidate</option>
                                    {candidates.map(c => (
                                        <option key={c.id} value={c.id} className="text-gray-900">
                                            {c.name} {c.title ? `- ${c.title}` : ''} {c.status ? `(${c.status})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    value={newInterview.interview_date}
                                    onChange={(e) => setNewInterview({...newInterview, interview_date: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type</label>
                                <select
                                    value={newInterview.interview_type}
                                    onChange={(e) => setNewInterview({...newInterview, interview_type: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                    <option value="online">Online (Video Call)</option>
                                    <option value="phone">Phone Call</option>
                                    <option value="onsite">Onsite (In-person)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                                <input
                                    type="url"
                                    value={newInterview.meeting_link}
                                    onChange={(e) => setNewInterview({...newInterview, meeting_link: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
                                    placeholder="https://meet.google.com/..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newInterview.notes}
                                    onChange={(e) => setNewInterview({...newInterview, notes: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
                                    rows={3}
                                    placeholder="Additional notes about the interview..."
                                />
                            </div>
                            <button
                                onClick={addInterview}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Scheduling...' : 'Schedule Interview'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && selectedInterview && selectedInterview.candidate_status !== 'hired' && selectedInterview.candidate_status !== 'rejected' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Interview Details</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Candidate</p>
                                <p className="font-medium text-gray-900">{selectedInterview.candidate_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Job Position</p>
                                <p className="text-gray-900">{selectedInterview.job_title}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Date & Time</p>
                                <p className="text-gray-900">{new Date(selectedInterview.interview_date).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Interview Type</p>
                                <p className="text-gray-900 capitalize">{selectedInterview.interview_type}</p>
                            </div>
                            {selectedInterview.meeting_link && (
                                <div>
                                    <p className="text-sm text-gray-500">Meeting Link</p>
                                    <a href={selectedInterview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        Join Meeting →
                                    </a>
                                </div>
                            )}
                            {selectedInterview.notes && (
                                <div>
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="text-sm text-gray-700">{selectedInterview.notes}</p>
                                </div>
                            )}

                            <div className="border-t pt-3 mt-2 space-y-2">
                                <button
                                    onClick={goToInterviewNotes}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-all hover:from-gray-500 hover:to-gray-600"
                                >
                                    Interview Notes
                                </button>
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

                            <div className="border-t pt-3 mt-2">
                                <p className="text-sm font-medium text-gray-700 mb-2">Quick Decision</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateCandidateStatusAndInterview(selectedInterview.candidate_id, 'hired', selectedInterview.id)}
                                        disabled={updatingStatus}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        Hire
                                    </button>
                                    <button
                                        onClick={() => updateCandidateStatusAndInterview(selectedInterview.candidate_id, 'rejected', selectedInterview.id)}
                                        disabled={updatingStatus}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    onClick={() => deleteInterview(selectedInterview.id, selectedInterview.candidate_id)}
                                    className="w-full text-red-600 hover:text-red-800 text-sm py-1"
                                >
                                    Delete Interview
                                </button>
                                <p className="text-xs text-gray-400 text-center mt-1">
                                    This will move the candidate back to Reviewed status
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}