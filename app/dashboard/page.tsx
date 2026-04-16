'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<any[]>([])
    const [candidates, setCandidates] = useState<any[]>([])
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            setProfile(profile)

            const customerId = profile?.role === 'admin' ? null : user.id

            if (customerId) {
                const { data: jobs } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('customer_id', customerId)
                    .limit(5)
                setJobs(jobs || [])

                const { data: candidates } = await supabase
                    .from('candidates')
                    .select('*, jobs(title)')
                    .eq('customer_id', customerId)
                    .limit(5)
                setCandidates(candidates || [])
            } else if (profile?.role === 'admin') {
                const { data: jobs } = await supabase
                    .from('jobs')
                    .select('*')
                    .limit(5)
                setJobs(jobs || [])

                const { data: candidates } = await supabase
                    .from('candidates')
                    .select('*, jobs(title)')
                    .limit(5)
                setCandidates(candidates || [])
            }

            setLoading(false)
        }
        checkUser()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            </div>
        )
    }

    const stats = {
        totalJobs: jobs.length,
        totalCandidates: candidates.length,
        hired: candidates.filter(c => c.status === 'hired').length,
        interview: candidates.filter(c => c.status === 'interview').length
    }

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { name: 'Jobs', href: '/dashboard/jobs', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { name: 'Candidates', href: '/dashboard/candidates', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
        { name: 'Kanban', href: '/dashboard/kanban', icon: 'M4 6h16M4 12h16M4 18h16' },
        { name: 'AI Screening', href: '/dashboard/ai', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    ]

    if (profile?.role === 'admin') {
        navItems.push({ name: 'Admin', href: '/dashboard/admin/users', icon: 'M12 4v16m8-8H4' })
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">

            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 top-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute -right-40 top-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse delay-700"></div>
                <div className="absolute top-20 right-20 w-48 h-48 rounded-full border-2 border-gray-500/30 animate-spin-slow"></div>
                <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full border-2 border-gray-600/25 animate-spin-slow delay-2000"></div>
            </div>

            <nav className="relative z-20 fixed top-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-b border-gray-300/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            <span className="font-semibold text-gray-800 text-lg">Mini ATS</span>
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-3 py-2 text-sm rounded-lg transition-all ${
                                            item.href === '/dashboard'
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
                            <span className="text-sm text-gray-500 hidden md:block">
                                {user?.email} ({profile?.role === 'admin' ? 'Admin' : 'Customer'})
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-md"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
                <div className="max-w-7xl mx-auto">

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
                        <p className="text-gray-500 mt-1">Welcome back, {user?.email}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6">
                            <p className="text-sm text-gray-500">Total Jobs</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalJobs}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6">
                            <p className="text-sm text-gray-500">Total Candidates</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalCandidates}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6">
                            <p className="text-sm text-gray-500">In Interview</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.interview}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6">
                            <p className="text-sm text-gray-500">Hired</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.hired}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-800">Recent Jobs</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {jobs.slice(0, 5).map(job => (
                                    <div key={job.id} className="px-6 py-4">
                                        <p className="font-medium text-gray-800">{job.title}</p>
                                        <p className="text-sm text-gray-500 mt-1">{job.description?.substring(0, 100)}...</p>
                                    </div>
                                ))}
                                {jobs.length === 0 && (
                                    <div className="px-6 py-8 text-center text-gray-500">No jobs posted yet</div>
                                )}
                            </div>
                            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/50">
                                <Link href="/dashboard/jobs" className="text-sm text-gray-600 hover:text-gray-800">View all jobs →</Link>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-800">Recent Candidates</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {candidates.slice(0, 5).map(candidate => (
                                    <div key={candidate.id} className="px-6 py-4">
                                        <p className="font-medium text-gray-800">{candidate.name}</p>
                                        <p className="text-sm text-gray-500">{candidate.jobs?.title}</p>
                                    </div>
                                ))}
                                {candidates.length === 0 && (
                                    <div className="px-6 py-8 text-center text-gray-500">No candidates added yet</div>
                                )}
                            </div>
                            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/50">
                                <Link href="/dashboard/candidates" className="text-sm text-gray-600 hover:text-gray-800">View all candidates →</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="relative z-10 border-t border-gray-300 bg-white/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-500">© 2026 Mini ATS</p>
                        <div className="flex gap-6">
                            <span className="text-xs text-gray-400">Powered by Next.js + Supabase</span>
                        </div>
                    </div>
                </div>
            </footer>

            <style jsx>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
            `}</style>
        </div>
    )
}