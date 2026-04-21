'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NotificationBell from '@/components/NotificationBell'
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<any[]>([])
    const [candidates, setCandidates] = useState<any[]>([])
    const [stats, setStats] = useState({ totalJobs: 0, totalCandidates: 0, hired: 0, active: 0 })
    const [monthlyData, setMonthlyData] = useState<any[]>([])
    const [statusData, setStatusData] = useState<any[]>([])
    const [trendData, setTrendData] = useState<any[]>([])

    const router = useRouter()
    const supabase = createClient()

    const getAllStats = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return { totalJobs: 0, totalCandidates: 0, hired: 0, active: 0 }

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()

        const customerId = profileData?.role === 'admin' ? null : authUser.id

        let jobsQuery = supabase.from('jobs').select('id', { count: 'exact', head: false })
        if (customerId) {
            jobsQuery = jobsQuery.eq('customer_id', customerId)
        }
        const { count: totalJobs } = await jobsQuery

        let candidatesQuery = supabase.from('candidates').select('status, created_at', { count: 'exact', head: false })
        if (customerId) {
            candidatesQuery = candidatesQuery.eq('customer_id', customerId)
        }
        const { data: allCandidates } = await candidatesQuery

        const totalCandidates = allCandidates?.length || 0
        const hired = allCandidates?.filter(c => c.status === 'hired').length || 0
        const active = allCandidates?.filter(c => ['new', 'reviewed', 'interview'].includes(c.status)).length || 0

        if (allCandidates && allCandidates.length > 0) {
            const last6Months = []
            const today = new Date()
            for (let i = 5; i >= 0; i--) {
                const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
                const monthName = month.toLocaleString('default', { month: 'short' })
                const candidatesInMonth = allCandidates.filter(c => {
                    const createdAt = new Date(c.created_at)
                    return createdAt.getMonth() === month.getMonth() &&
                        createdAt.getFullYear() === month.getFullYear()
                })
                last6Months.push({
                    month: monthName,
                    candidates: candidatesInMonth.length,
                    hired: candidatesInMonth.filter(c => c.status === 'hired').length
                })
            }
            setMonthlyData(last6Months)

            const hiredCount = allCandidates.filter(c => c.status === 'hired').length || 0
            const rejectedCount = allCandidates.filter(c => c.status === 'rejected').length || 0
            const activeCount = allCandidates.filter(c => ['new', 'reviewed', 'interview'].includes(c.status)).length || 0

            const statusCounts = [
                { name: 'Active', value: activeCount, color: '#6b7280' },
                { name: 'Hired', value: hiredCount, color: '#374151' },
                { name: 'Rejected', value: rejectedCount, color: '#9ca3af' }
            ].filter(s => s.value > 0)
            setStatusData(statusCounts)

            const last30Days = []
            for (let i = 29; i >= 0; i--) {
                const date = new Date()
                date.setDate(date.getDate() - i)
                const dayStr = date.toLocaleDateString('default', { month: 'short', day: 'numeric' })
                const candidatesOnDay = allCandidates.filter(c => {
                    const createdAt = new Date(c.created_at)
                    return createdAt.toDateString() === date.toDateString()
                })
                last30Days.push({
                    day: dayStr,
                    count: candidatesOnDay.length
                })
            }
            setTrendData(last30Days)
        }

        return { totalJobs: totalJobs || 0, totalCandidates, hired, active }
    }

    const loadData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()

        const customerId = profileData?.role === 'admin' ? null : authUser.id

        let jobsQuery = supabase.from('jobs').select('*')
        if (customerId) {
            jobsQuery = jobsQuery.eq('customer_id', customerId)
        }
        const { data: jobsData } = await jobsQuery.limit(5)
        setJobs(jobsData || [])

        let candidatesQuery = supabase
            .from('candidates')
            .select('*, jobs(title)')
        if (customerId) {
            candidatesQuery = candidatesQuery.eq('customer_id', customerId)
        }
        const { data: candidatesData } = await candidatesQuery.limit(5)
        setCandidates(candidatesData || [])
    }

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single()
            setProfile(profileData)

            await loadData()

            const statsData = await getAllStats()
            setStats(statsData)

            setLoading(false)
        }
        checkUser()
    }, [])

    useEffect(() => {
        const handleRefresh = async () => {
            await loadData()
            const statsData = await getAllStats()
            setStats(statsData)
        }

        window.addEventListener('refreshKanban', handleRefresh)

        return () => {
            window.removeEventListener('refreshKanban', handleRefresh)
        }
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    {payload.map((p: any, idx: number) => (
                        <p key={idx} className="text-sm text-gray-600">
                            {p.name}: {p.value}
                        </p>
                    ))}
                </div>
            )
        }
        return null
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

    const navItems = [
        { name: 'Overview', href: '/dashboard' },
        { name: 'Jobs', href: '/dashboard/jobs' },
        { name: 'Candidates', href: '/dashboard/candidates' },
        { name: 'Kanban', href: '/dashboard/kanban' },
        { name: 'Calendar', href: '/dashboard/calendar' },
        { name: 'AI Screening', href: '/dashboard/ai' },
        { name: 'Interview Notes', href: '/dashboard/notes' },
    ]

    if (profile?.role === 'admin') {
        navItems.push({ name: 'Admin', href: '/dashboard/admin' })
    }

    const displayName = profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'User'

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
                            <NotificationBell />
                            <span className="text-sm text-gray-500 hidden md:block">
                                {displayName} ({profile?.role === 'admin' ? 'Admin' : 'Customer'})
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
                        <p className="text-gray-500 mt-1">Welcome back, {displayName}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <p className="text-sm text-gray-500">Total Jobs</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.totalJobs}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <p className="text-sm text-gray-500">Total Candidates</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.totalCandidates}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <p className="text-sm text-gray-500">Active Process</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.active}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <p className="text-sm text-gray-500">Hired</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.hired}</p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h3 className="text-gray-800 font-semibold mb-4">Monthly Candidate Trends</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                                    <XAxis dataKey="month" stroke="#6b7280" />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="candidates"
                                        name="Total Candidates"
                                        stroke="#6b7280"
                                        fill="#9ca3af"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="hired"
                                        name="Hired"
                                        stroke="#374151"
                                        strokeWidth={2}
                                        dot={{ fill: '#374151', r: 4 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <h3 className="text-gray-800 font-semibold mb-4">Candidate Pipeline</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                        labelLine={false}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-4 text-sm">
                                {statusData.map(s => (
                                    <div key={s.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                                        <span className="text-gray-600">{s.name}: {s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {trendData.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl mb-8">
                            <h3 className="text-gray-800 font-semibold mb-4">30-Day Candidate Activity</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                                    <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 10 }} interval={5} />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="New Candidates" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-800">Recent Jobs</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {jobs.slice(0, 5).map(job => (
                                    <div key={job.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
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
                                    <div key={candidate.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <p className="font-medium text-gray-800">{candidate.name}</p>
                                        <p className="text-sm text-gray-500">{candidate.jobs?.title}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                                            candidate.status === 'hired' ? 'bg-green-100 text-green-700' :
                                                candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-200 text-gray-700'
                                        }`}>
                                            {candidate.status === 'new' ? 'New' :
                                                candidate.status === 'reviewed' ? 'Reviewed' :
                                                    candidate.status === 'interview' ? 'Interview' :
                                                        candidate.status}
                                        </span>
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
                        <p className="text-xs text-gray-500">© 2026 Mini ATS — Smart recruitment for modern teams</p>
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