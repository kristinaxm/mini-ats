'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

type AppUser = {
    id: string
    email?: string | null
}

type AppProfile = {
    id: string
    email: string
    role: string
    full_name?: string | null
    company_name?: string | null
    created_at?: string
    updated_at?: string
}

export default function AdminPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<AppUser | null>(null)
    const [profile, setProfile] = useState<AppProfile | null>(null)
    const [users, setUsers] = useState<AppProfile[]>([])

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<'admin' | 'customer'>('customer')
    const [fullName, setFullName] = useState('')
    const [companyName, setCompanyName] = useState('')

    const [editingUser, setEditingUser] = useState<AppProfile | null>(null)
    const [editEmail, setEditEmail] = useState('')
    const [editRole, setEditRole] = useState<'admin' | 'customer'>('customer')
    const [editFullName, setEditFullName] = useState('')
    const [editCompanyName, setEditCompanyName] = useState('')
    const [editPassword, setEditPassword] = useState('')

    const [editingOwnProfile, setEditingOwnProfile] = useState(false)
    const [ownEditEmail, setOwnEditEmail] = useState('')
    const [ownEditFullName, setOwnEditFullName] = useState('')
    const [ownEditPassword, setOwnEditPassword] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

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

            if (currentProfile?.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            setUser({ id: authUser.id, email: authUser.email })
            setProfile(currentProfile)
            setOwnEditEmail(currentProfile.email)
            setOwnEditFullName(currentProfile.full_name || '')
            await loadUsers()
            setLoading(false)
        }

        bootstrap()
    }, [router, supabase])

    const loadUsers = async () => {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (profilesError) {
            console.error('Error loading users:', profilesError)
            setError('Could not load users')
        } else {
            setUsers(profiles || [])
        }
    }

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!email || !password) {
            setError('Email and password are required')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    full_name: fullName,
                    company_name: companyName
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            setSuccessMessage(`${role === 'admin' ? 'Admin' : 'Customer'} created successfully!`)
            setEmail('')
            setPassword('')
            setFullName('')
            setCompanyName('')
            await loadUsers()
            setTimeout(() => setSuccessMessage(''), 3000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return

        setSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            if (editEmail !== editingUser.email) {
                const emailResponse = await fetch('/api/admin/update-user-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: editingUser.id,
                        email: editEmail
                    })
                })

                if (!emailResponse.ok) {
                    const emailData = await emailResponse.json()
                    throw new Error(emailData.error || 'Failed to update email')
                }
            }

            if (editPassword && editPassword.length >= 6) {
                const passwordResponse = await fetch('/api/admin/update-user-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: editingUser.id,
                        password: editPassword
                    })
                })

                if (!passwordResponse.ok) {
                    const passwordData = await passwordResponse.json()
                    throw new Error(passwordData.error || 'Failed to update password')
                }
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    email: editEmail,
                    role: editRole,
                    full_name: editFullName || null,
                    company_name: editRole === 'customer' ? editCompanyName : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingUser.id)

            if (updateError) {
                throw new Error(updateError.message)
            }

            if (editingUser.id === profile?.id) {
                const { data: updatedProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', editingUser.id)
                    .single()
                setProfile(updatedProfile)
                setUser({ id: updatedProfile.id, email: updatedProfile.email })
                setOwnEditEmail(updatedProfile.email)
                setOwnEditFullName(updatedProfile.full_name || '')
            }

            setSuccessMessage('User updated successfully!')
            await loadUsers()
            setEditingUser(null)
            setEditEmail('')
            setEditRole('customer')
            setEditFullName('')
            setEditCompanyName('')
            setEditPassword('')
            setTimeout(() => setSuccessMessage(''), 3000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateOwnProfile = async () => {
        setSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            if (ownEditEmail !== profile?.email) {
                const emailResponse = await fetch('/api/admin/update-user-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: profile?.id,
                        email: ownEditEmail
                    })
                })

                if (!emailResponse.ok) {
                    const emailData = await emailResponse.json()
                    throw new Error(emailData.error || 'Failed to update email')
                }
            }

            if (ownEditPassword && ownEditPassword.length >= 6) {
                const passwordResponse = await fetch('/api/admin/update-user-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: profile?.id,
                        password: ownEditPassword
                    })
                })

                if (!passwordResponse.ok) {
                    const passwordData = await passwordResponse.json()
                    throw new Error(passwordData.error || 'Failed to update password')
                }
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    email: ownEditEmail,
                    full_name: ownEditFullName || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile?.id)

            if (updateError) {
                throw new Error(updateError.message)
            }

            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile?.id)
                .single()
            setProfile(updatedProfile)
            setUser({ id: updatedProfile.id, email: updatedProfile.email })

            setSuccessMessage('Your profile updated successfully! Please log in again with your new credentials.')
            setEditingOwnProfile(false)
            setOwnEditPassword('')
            await loadUsers()

            setTimeout(() => {
                supabase.auth.signOut()
                router.push('/login')
            }, 3000)

            setTimeout(() => setSuccessMessage(''), 3000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (userId === profile?.id) {
            setError('You cannot delete your own account')
            return
        }

        if (!confirm(`Are you sure you want to delete ${userEmail}? This will delete all jobs and candidates belonging to this user.`)) {
            return
        }

        setSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            const response = await fetch(`/api/admin/delete-user?id=${userId}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            setSuccessMessage(`User deleted successfully!`)
            await loadUsers()
            setTimeout(() => setSuccessMessage(''), 3000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
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
        { name: 'Interview Notes', href: '/dashboard/notes' },
        { name: 'Admin', href: '/dashboard/admin' },
    ]

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-400 via-gray-300 to-gray-400">
                <div className="bg-white/70 rounded-2xl p-8 text-center backdrop-blur-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin panel...</p>
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
                                            item.href === '/dashboard/admin'
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
                             {profile?.full_name || user?.email?.split('@')[0] || 'User'} (Admin)
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
                        <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                        <p className="text-gray-500 mt-1">Create, edit, and manage user accounts</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-6 bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg text-sm">
                            {successMessage}
                        </div>
                    )}

                    <div className="mb-8 bg-gradient-to-r from-gray-800 to-gray-700 backdrop-blur-xl rounded-2xl border border-gray-600 p-6 shadow-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-white text-lg font-semibold">Your Profile (Admin)</h3>
                                <p className="text-gray-300 text-sm mt-1">{profile?.email}</p>
                                {profile?.full_name && (
                                    <p className="text-gray-400 text-sm mt-1">{profile.full_name}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setEditingOwnProfile(true)}
                                className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all shadow-sm"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    {editingOwnProfile && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-gray-200 shadow-2xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">Edit Your Profile</h2>
                                    <button onClick={() => setEditingOwnProfile(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={ownEditEmail}
                                            onChange={(e) => setOwnEditEmail(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            placeholder="Your email address"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">You will need to log in again after changing email</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={ownEditFullName}
                                            onChange={(e) => setOwnEditFullName(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                                        <input
                                            type="password"
                                            value={ownEditPassword}
                                            onChange={(e) => setOwnEditPassword(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            placeholder="Leave blank to keep current"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={handleUpdateOwnProfile}
                                            disabled={saving}
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => setEditingOwnProfile(false)}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-8 lg:grid-cols-[480px_minmax(0,1fr)]">
                        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-600 p-6 shadow-xl">
                            <h2 className="text-white text-xl font-semibold mb-4">Create New User</h2>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                        placeholder="user@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                        placeholder="At least 6 characters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-1">
                                        Role *
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as 'admin' | 'customer')}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                        placeholder="John Doe"
                                    />
                                </div>

                                {role === 'customer' && (
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-1">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                            placeholder="Acme Inc."
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium py-2.5 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Creating...' : 'Create User'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-300 p-6 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-gray-800 text-xl font-semibold">Users</h2>
                                <span className="bg-gray-200 rounded-full px-3 py-1 text-sm font-medium text-gray-700">
                                    {users.length} users
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {users.map((userItem) => {
                                    if (editingUser?.id === userItem.id) {
                                        return (
                                            <div key={userItem.id} className="bg-white/90 rounded-2xl border border-gray-300 p-4 shadow-sm">
                                                <div className="space-y-3">
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
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">New Password (optional)</label>
                                                        <input
                                                            type="password"
                                                            value={editPassword}
                                                            onChange={(e) => setEditPassword(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="Leave blank to keep current"
                                                        />
                                                        <p className="text-xs text-gray-400 mt-1">Only enter if you want to change password</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                                        <select
                                                            value={editRole}
                                                            onChange={(e) => setEditRole(e.target.value as 'admin' | 'customer')}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                        >
                                                            <option value="customer">Customer</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                                                        <input
                                                            type="text"
                                                            value={editFullName}
                                                            onChange={(e) => setEditFullName(e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            placeholder="Full name"
                                                        />
                                                    </div>
                                                    {editRole === 'customer' && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                                                            <input
                                                                type="text"
                                                                value={editCompanyName}
                                                                onChange={(e) => setEditCompanyName(e.target.value)}
                                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                                placeholder="Company name"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={handleUpdateUser}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            Save changes
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUser(null)}
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
                                        <div
                                            key={userItem.id}
                                            className="bg-white/80 rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-gray-800">
                                                            {userItem.full_name || userItem.email.split('@')[0]}
                                                        </h3>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            userItem.role === 'admin'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : userItem.role === 'customer'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {userItem.role === 'disabled' ? 'Disabled' : userItem.role}
                                                        </span>
                                                        {userItem.id === profile?.id && (
                                                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 text-sm mt-1">{userItem.email}</p>
                                                    {userItem.company_name && (
                                                        <p className="text-gray-500 text-xs mt-1">
                                                            Company: {userItem.company_name}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        {userItem.created_at && (
                                                            <p className="text-gray-400 text-xs">
                                                                Created: {new Date(userItem.created_at).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                        {userItem.updated_at && userItem.updated_at !== userItem.created_at && (
                                                            <p className="text-gray-400 text-xs">
                                                                Updated: {new Date(userItem.updated_at).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {userItem.id !== profile?.id && userItem.role !== 'disabled' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(userItem)
                                                                setEditEmail(userItem.email)
                                                                setEditRole(userItem.role as 'admin' | 'customer')
                                                                setEditFullName(userItem.full_name || '')
                                                                setEditCompanyName(userItem.company_name || '')
                                                                setEditPassword('')
                                                            }}
                                                            className="px-2.5 py-1 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all shadow-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                                                            disabled={saving}
                                                            className="px-2.5 py-1 text-sm bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                {users.length === 0 && (
                                    <div className="text-center text-gray-500 py-12 bg-white/50 rounded-2xl border border-dashed border-gray-300">
                                        No users found. Create your first user above.
                                    </div>
                                )}
                            </div>
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