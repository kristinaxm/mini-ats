'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
    id: string
    text: string
    sender: 'user' | 'bot'
    timestamp: Date
}

const allSuggestions = [
    "How to write a good job description?",
    "Interview questions for a developer",
    "How to assess soft skills?",
    "Best recruitment practices",
    "What makes a good candidate?",
    "How to reduce hiring bias?",
    "Tips for remote interviews",
    "How to screen CVs effectively?",
    "What salary range for a senior developer?",
    "How to structure a technical interview?",
    "What are red flags in a CV?",
    "How to write a rejection email?"
]

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSuggestionsMinimized, setIsSuggestionsMinimized] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi! I\'m your AI recruitment assistant. I can help you with:\n\n• Answering questions about candidates\n• Suggesting interview questions\n• Giving tips for job descriptions\n• Explaining recruitment best practices\n\nHow can I help you today?',
            sender: 'bot',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    const sendMessage = async (messageText?: string) => {
        const textToSend = messageText || input
        if (!textToSend.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        if (!messageText) {
            setInput('')
        }
        setIsLoading(true)

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: textToSend })
            })

            const data = await response.json()

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || 'Sorry, I had trouble processing that. Please try again.',
                sender: 'bot',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, botMessage])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, something went wrong. Please try again.',
                sender: 'bot',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([
            {
                id: Date.now().toString(),
                text: 'Chat cleared! How can I help you today?',
                sender: 'bot',
                timestamp: new Date()
            }
        ])
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-full p-4 shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 group"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[480px] h-[650px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up">
                    {/* Header - No icon/lamp */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">AI Recruitment Assistant</h3>
                                <p className="text-xs text-gray-300">Online • Ready to help</p>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={clearChat}
                                className="text-gray-300 hover:text-white transition-colors"
                                title="Clear chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-300 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg p-3 ${
                                        message.sender === 'user'
                                            ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
                                            : 'bg-white border border-gray-200 text-gray-800'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-gray-200 bg-white">
                        <div
                            onClick={() => setIsSuggestionsMinimized(!isSuggestionsMinimized)}
                            className="flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <p className="text-xs text-gray-500">Suggested questions:</p>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg
                                    className={`w-4 h-4 transition-transform ${isSuggestionsMinimized ? '' : 'rotate-180'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {!isSuggestionsMinimized && (
                            <div className="px-4 pb-3">
                                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                    {allSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => sendMessage(suggestion)}
                                            className="text-xs bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-200 hover:border-gray-300 transition-colors text-gray-700"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 p-3 bg-white">
                        <div className="flex gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything about recruitment..."
                                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
                                rows={1}
                                style={{ minHeight: '36px', maxHeight: '80px' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg px-3 py-2 hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes bounce {
                    0%, 60%, 100% {
                        transform: translateY(0);
                    }
                    30% {
                        transform: translateY(-10px);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .animate-bounce {
                    animation: bounce 1.4s ease-in-out infinite;
                }
            `}</style>
        </>
    )
}