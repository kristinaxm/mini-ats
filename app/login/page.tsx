'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showAIDemo, setShowAIDemo] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        } else {
            router.push('/dashboard')
        }
        setLoading(false)
    }

    const scrollToLogin = () => {
        const loginCard = document.getElementById('login-card')
        loginCard?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">

            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 top-1/2 transform -translate-y-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute -left-20 bottom-20 w-80 h-80 bg-gray-600/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute left-10 top-10 w-60 h-60 bg-gray-400/25 rounded-full filter blur-3xl animate-pulse delay-500"></div>
                <div className="absolute -right-40 top-1/2 transform -translate-y-1/2 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl animate-pulse delay-700"></div>
                <div className="absolute -right-20 top-20 w-80 h-80 bg-gray-600/20 rounded-full filter blur-3xl animate-pulse delay-1500"></div>
                <div className="absolute right-10 bottom-10 w-60 h-60 bg-gray-400/25 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gray-300/20 rounded-full filter blur-3xl"></div>

                <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
                <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/25 to-transparent"></div>
                <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>

                <div className="absolute top-0 bottom-0 left-1/4 w-px bg-gradient-to-b from-transparent via-gray-600/25 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-2/4 w-px bg-gradient-to-b from-transparent via-gray-600/30 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-3/4 w-px bg-gradient-to-b from-transparent via-gray-600/25 to-transparent"></div>

                <div className="absolute top-20 right-20 w-48 h-48 rounded-full border-2 border-gray-500/30 animate-spin-slow animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full border-2 border-gray-600/25 animate-spin-slow delay-2000 animate-pulse"></div>
                <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full border-2 border-gray-500/20 animate-spin-slow delay-1000 animate-pulse"></div>
                <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full border-2 border-gray-400/20 animate-spin-slow delay-3000 animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full border-2 border-gray-500/25 animate-spin-slow delay-2500 animate-pulse"></div>

                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-400/10 to-transparent animate-scan"></div>
            </div>

            <nav className="relative z-20 fixed top-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-b border-gray-300/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <span className="font-semibold text-gray-800 text-lg">Mini ATS</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={scrollToLogin}
                                className="px-4 py-2 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-md cursor-pointer"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">

                        <div className="text-center lg:text-left">

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                                <span className="text-gray-900">Recruitment</span>
                                <span className="block bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-clip-text text-transparent">
                                    Made Simple
                                </span>
                            </h1>

                            <p className="text-lg text-gray-700 mb-6 max-w-lg mx-auto lg:mx-0">
                                Track candidates, manage jobs, and make better hires — all in one place.
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="group px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-300 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default text-center">
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Post jobs</span>
                                </div>
                                <div className="group px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-300 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default text-center">
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Add candidates</span>
                                </div>
                                <div className="group px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-300 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default text-center">
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Kanban view</span>
                                </div>
                                <div className="group px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-300 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default text-center">
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">AI screening</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 mb-4 text-center lg:text-left">
                                Admins can create accounts and manage everything. Customers post jobs and track candidates.
                            </p>

                            <div className="mb-6">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500/30 via-gray-600/30 to-gray-500/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>

                                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-5 shadow-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-md font-semibold text-white">AI-Powered CV Analysis</h3>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-300 mb-3">
                                            Automatically screen, score, and rank candidates against your job requirements.
                                        </p>

                                        <div className="flex gap-4 mb-3 text-center">
                                            <div className="flex-1">
                                                <div className="text-xl font-bold text-white">90%</div>
                                                <div className="text-[10px] text-gray-400">Time saved</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xl font-bold text-white">2.5x</div>
                                                <div className="text-[10px] text-gray-400">Faster hiring</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xl font-bold text-white">98%</div>
                                                <div className="text-[10px] text-gray-400">Match accuracy</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowAIDemo(!showAIDemo)}
                                            className="w-full text-sm bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            {showAIDemo ? (
                                                <>
                                                    Hide
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    How it works
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>

                                        {showAIDemo && (
                                            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                                <ul className="space-y-2">
                                                    <li className="flex items-start gap-2 text-xs text-gray-300">
                                                        <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Upload CV or paste text — AI extracts key skills and experience</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 text-xs text-gray-300">
                                                        <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Matches against your job description with intelligent scoring</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 text-xs text-gray-300">
                                                        <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Get instant recommendations: Strong match, Good fit, or Review</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 text-xs text-gray-300">
                                                        <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>AI generates custom interview questions based on gaps</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start text-xs text-gray-500">
                                <span className="flex items-center gap-1">Secure & private</span>
                                <span className="flex items-center gap-1">Real-time updates</span>
                                <span className="flex items-center gap-1">Cloud-based</span>
                            </div>
                        </div>

                        <div id="login-card" className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-400/50 via-gray-500/50 to-gray-400/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>

                                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 shadow-xl p-8">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-800">Welcome back</h2>
                                        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                                    </div>

                                    {error && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-red-600 text-sm text-center">{error}</p>
                                        </div>
                                    )}

                                    <form className="space-y-4" onSubmit={handleLogin}>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-gray-100/80 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-300 transition-all"
                                                placeholder="name@company.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-gray-100/80 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-300 transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-400 text-gray-600 focus:ring-gray-500" />
                                                <span className="text-sm text-gray-600">Remember me</span>
                                            </label>
                                            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Forgot password?</a>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="relative w-full py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-medium rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden shadow-md"
                                        >
                                            <span className="absolute inset-0 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-gray-600 to-gray-700 blur-md"></span>
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {loading ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Signing in...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Sign in</span>
                                                        <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    </>
                                                )}
                                            </span>
                                        </button>
                                    </form>

                                    <div className="mt-6 text-center">
                                        <p className="text-xs text-gray-400">
                                            Demo — full access
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            New here? Contact your admin for credentials
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="relative z-10 border-t border-gray-300 bg-white/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-500">
                            © 2026 Mini ATS — Smart recruitment for modern teams
                        </p>
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