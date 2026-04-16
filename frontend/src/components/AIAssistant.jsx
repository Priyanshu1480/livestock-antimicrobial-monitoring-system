import React, { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import Button from "./Button"

const AIAssistant = ({ auth: authProp }) => {
    const [auth, setAuth] = useState(authProp)
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [persona, setPersona] = useState({ name: "AgroLens AI", title: "Intelligence Hub" })
    const messagesEndRef = useRef(null)
    const prevUserRef = useRef(null) 
    const abortControllerRef = useRef(null)

    const location = useLocation()

    // Sync state when props change
    useEffect(() => {
        setAuth(authProp)
    }, [authProp])

    // Load auth and set initial greeting based on role
    useEffect(() => {
        const checkAuth = () => {
            const stored = auth || JSON.parse(localStorage.getItem("auth") || "null")
            const urlParams = new URLSearchParams(location.search)
            const urlRole = urlParams.get("role")
            
            const isLoginPage = location.pathname === "/login"
            const activeRole = (isLoginPage && urlRole) ? urlRole : (stored?.role || urlRole || "farmer")
            const currentUser = stored?.username || "guest_" + (urlRole || "farmer")

            const defaultNames = {
                farmer: { name: "AgroLens AI", title: "Farm Intelligence Assistant" },
                vet: { name: "AgroLens AI", title: "Clinical Assistant" },
                admin: { name: "AgroLens AI", title: "Systems Intelligence" }
            }
            const p = defaultNames[activeRole] || defaultNames.farmer

            // ONLY reset messages if the user session has actually changed
            if (prevUserRef.current !== currentUser) {
                if (stored && !isLoginPage) {
                    setPersona(p)
                    setMessages([
                        { role: "ai", text: `Connecting to ${p.name}... Initialized.` },
                        { role: "ai", text: `Greetings! I am ${p.name}, your ${p.title}. How can I assist you today?` }
                    ])
                } else {
                    setPersona(p)
                    setMessages([
                        { role: "ai", text: `Connecting to ${p.name} (Guest Mode)... Initialized.` },
                        { role: "ai", text: `Hello! I am ${p.name}. I'm here to help you get started or answer questions about our system. What would you like to know?` }
                    ])
                }
                prevUserRef.current = currentUser
            } else {
                setPersona(p)
            }
        }

        checkAuth()
        window.addEventListener("agroLensToggle", () => setIsOpen(prev => !prev))
        
        return () => {
            window.removeEventListener("agroLensToggle", () => setIsOpen(prev => !prev))
        }
    }, [location, auth])

    // Cancel speech when closed
    useEffect(() => {
        if (!isOpen && window.speechSynthesis) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        }
    }, [isOpen])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const speak = (text) => {
        if (!window.speechSynthesis) return
        window.speechSynthesis.cancel() 
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        window.speechSynthesis.speak(utterance)
    }

    const handleStop = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            setIsTyping(false)
            setMessages(prev => [...prev, { role: "ai", text: "[Generation Interrupted by User]" }])
        }
    }


    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input.trim()
        setMessages(prev => [...prev, { role: "user", text: userMsg }])
        setInput("")
        setIsTyping(true)

        abortControllerRef.current = new AbortController()

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({ 
                    message: userMsg, 
                    history: messages.slice(-10).map(m => ({ role: m.role, text: m.text })),
                    role: auth?.role || new URLSearchParams(window.location.search).get("role") || "farmer"
                })
            })
            const data = await res.json()

            setTimeout(() => {
                const aiMsg = { 
                    role: "ai", 
                    text: data.reply, 
                    analysis: data.analysis 
                }
                if (data.personaName) {
                    setPersona({ name: data.personaName, title: data.personaTitle })
                }
                setMessages(prev => [...prev, aiMsg])
                setIsTyping(false)
                speak(data.reply)
            }, 800)
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted')
            } else {
                console.error("AI Chat Error:", err)
                const errorMsg = {
                    role: "ai",
                    text: `[System Update]: I'm having a bit of trouble connecting to the records right now. It might be a momentary glitch in the network. Could you try sending that again?`
                }
                setMessages(prev => [...prev, errorMsg])
            }
            setIsTyping(false)
        }
    }

    const handleSync = (analysis) => {
        if (!analysis) return;
        
        // Final sanity check on role
        const activeRole = auth?.role || new URLSearchParams(window.location.search).get("role") || "farmer";
        
        // Merge analysis with role for the event
        const detail = { ...analysis, role: activeRole };
        
        console.log("Dispatching AI Sync:", detail);
        const event = new CustomEvent("agroLensSync", { detail });
        window.dispatchEvent(event);
        
        // Premium feedback before closing
        setMessages(prev => [...prev, { role: "ai", text: "⚡ Integration successful. Dashboard data synchronized." }]);
        setTimeout(() => setIsOpen(false), 800);
    }

    const noShowPaths = ["/", "/sel", "/login", "/register", "/404"]
    if (noShowPaths.includes(location.pathname)) {
        return null
    }

    return (
        <div className="fixed bottom-6 right-6 z-[999999] font-sans">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative group p-4 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
                    isOpen 
                    ? "bg-slate-800 text-rose-400 rotate-90" 
                    : "bg-gradient-to-br from-cyan-400 to-blue-600 text-white animate-pulse"
                }`}
                title="AgroLens AI Assistant"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                ) : (
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="m3.34 7 1.66 3"/><path d="M7 3h4"/><path d="M20.66 7 19 10"/><path d="M17 3h-4"/><path d="M3.1 14h17.8"/><path d="M4.5 14c-.9 3 0 5 2.5 5h10c2.5 0 3.4-2 2.5-5"/></svg>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-200"></span>
                        </span>
                    </div>
                )}
            </button>

            {/* Chat Window */}
            <div className={`absolute bottom-20 right-0 w-[400px] h-[600px] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl transition-all duration-500 border border-white/10 ${
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none"
            }`}
            style={{ 
                background: "rgba(10, 15, 25, 0.98)",
                backdropFilter: "blur(30px)"
            }}
            >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-cyan-500/10 to-transparent border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="m3.34 7 1.66 3"/><path d="M7 3h4"/><path d="M20.66 7 19 10"/><path d="M17 3h-4"/><path d="M3.1 14h17.8"/><path d="M4.5 14c-.9 3 0 5 2.5 5h10c2.5 0 3.4-2 2.5-5"/></svg>
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-[0.2em]">{persona.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-black uppercase tracking-widest opacity-80">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                                {persona.title}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                            <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-sm leading-relaxed shadow-xl ${
                                m.role === "user" 
                                ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-none shadow-cyan-500/10" 
                                : "bg-slate-800/80 text-slate-200 rounded-tl-none border border-white/5 backdrop-blur-md"
                            }`}>
                                {m.text}

                                {m.analysis && (
                                    <div className={`mt-4 p-4 rounded-2xl border space-y-3 transition-all hover:scale-[1.02] ${
                                        m.analysis.type === 'farmer_sync' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                        m.analysis.type === 'vet_sync' ? 'bg-amber-500/5 border-amber-500/20' :
                                        'bg-purple-500/5 border-purple-500/20'
                                    }`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${
                                            m.analysis.type === 'farmer_sync' ? 'text-emerald-400' :
                                            m.analysis.type === 'vet_sync' ? 'text-amber-400' :
                                            'text-purple-400'
                                        }`}>
                                            Intelligence Insight
                                            <span className="px-1.5 py-0.5 bg-black/20 rounded text-[8px]">PRO</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-white line-clamp-2">
                                            {m.analysis.type === 'farmer_sync' && `Detected: ${m.analysis.problem}`}
                                            {m.analysis.type === 'vet_sync' && `Target Case: ${m.analysis.caseId}`}
                                            {m.analysis.type === 'admin_sync' && `Filter Applied: ${m.analysis.filter}`}
                                        </div>
                                        <button 
                                            onClick={() => handleSync(m.analysis)}
                                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
                                                m.analysis.type === 'farmer_sync' ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20' :
                                                m.analysis.type === 'vet_sync' ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' :
                                                'bg-purple-500 text-white hover:bg-purple-400 shadow-purple-500/20'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 7 1.66 3"/><path d="M7 3h4"/><path d="M20.66 7 19 10"/><path d="M17 3h-4"/><path d="M3.1 14h17.8"/><path d="M4.5 14c-.9 3 0 5 2.5 5h10c2.5 0 3.4-2 2.5-5"/></svg>
                                            {m.analysis.type === 'farmer_sync' && '⚡ Sync Diagnosis'}
                                            {m.analysis.type === 'vet_sync' && '📋 Open Case File'}
                                            {m.analysis.type === 'admin_sync' && '🔍 Apply Global Filter'}
                                            {!['farmer_sync', 'vet_sync', 'admin_sync'].includes(m.analysis.type) && '💫 Synchronize'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/80 text-slate-100 rounded-[1.5rem] rounded-tl-none border border-white/5 px-5 py-4 text-sm flex gap-1.5 shadow-xl">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-slate-900 border-t border-white/5 space-y-4">

                    <div className="flex flex-wrap gap-2">
                        {(!auth || auth.role === 'farmer') && <button onClick={() => { setInput("Describe cow disease symptoms..."); }} className="text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-400/20 px-3 py-2 rounded-xl transition-all">Symptom Guide</button>}
                        {auth?.role === 'vet' && <button onClick={() => { setInput("Analyze Case TK-..."); }} className="text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-amber-400 border border-amber-400/20 px-3 py-2 rounded-xl transition-all">Clinical Review</button>}
                    </div>

                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend() }}
                        className="flex items-center gap-3 bg-slate-800/50 rounded-[1.5rem] p-2 border border-white/5 focus-within:border-cyan-500/50 transition-all shadow-inner"
                    >
                        
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isTyping ? "Generating..." : "Message AgroLens..."}
                            disabled={isTyping}
                            className="flex-1 bg-transparent border-none text-slate-100 text-sm px-2 focus:ring-0 outline-none placeholder:text-slate-500 font-medium"
                        />
                        
                        {isTyping ? (
                            <button 
                                type="button"
                                onClick={handleStop}
                                className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20 animate-in zoom-in"
                                title="Stop Generation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="5" y="5" rx="2"/></svg>
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AIAssistant
