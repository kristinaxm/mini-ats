'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'
import Calendar from '@/components/Calendar'

export default function CalendarPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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
            setLoading(false)
        }
        bootstrap()
    }, [])

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
                                            item.href === '/dashboard/calendar'
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

            <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Interview Calendar</h1>
                        <p className="text-gray-500 mt-1">Schedule and manage candidate interviews</p>
                    </div>

                    <Calendar />
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