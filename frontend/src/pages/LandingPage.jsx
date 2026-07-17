import React, { useEffect, useState, useRef } from 'react'

// Module-level flag: plays intro on every fresh browser load (F5/first open),
// but skips it on React client-side navigation (login → home, etc.)
let introHasPlayed = false
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  HiCloud, HiFolder, HiSparkles, HiShieldCheck, 
  HiClipboardList, HiOutlineArrowRight,
  HiLightningBolt, HiLockClosed, HiSearchCircle,
  HiMail, HiPhone, HiChevronDown
} from 'react-icons/hi'

/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL – triggers animation when element enters viewport
═══════════════════════════════════════════════════════════ */
function useScrollReveal(options = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: options.threshold || 0.15, rootMargin: options.rootMargin || '0px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function ScrollReveal({ children, animation = 'reveal-up', delay = 0, className = '' }) {
  const [ref, isVisible] = useScrollReveal()

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? animation : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER – counts up from 0 to target on scroll
═══════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = performance.now()
          const step = (now) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════════════════
   FLOATING PARTICLES
═══════════════════════════════════════════════════════════ */
function FloatingParticles({ count = 20 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${Math.random() * 3 + 1.5}px`,
            height: `${Math.random() * 3 + 1.5}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? 'rgba(168,85,247,0.5)' : i % 3 === 1 ? 'rgba(99,102,241,0.5)' : 'rgba(139,92,246,0.4)',
            animation: `float ${3 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
            boxShadow: '0 0 6px currentColor',
          }}
        />
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   GLOW CARD – cursor-tracking spotlight hover effect
═══════════════════════════════════════════════════════════ */
function GlowCard({ children, icon: Icon, title, description, colorClass, gradient }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden p-8 rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500 space-y-5 group hover:-translate-y-1"
    >
      {/* Spotlight glow */}
      <div 
        className="pointer-events-none absolute -inset-px rounded-3xl transition duration-500 opacity-0 group-hover:opacity-100"
        style={{ background: `radial-gradient(280px circle at ${coords.x}px ${coords.y}px, rgba(168, 85, 247, 0.12), transparent 80%)` }}
      />

      {/* Icon with gradient bg */}
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-purple-500/25 group-hover:rotate-3 icon-pulse-glow`}>
        <Icon className="group-hover:animate-[iconWiggle_0.5s_ease-in-out]" />
      </div>
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-[13px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
        {description}
      </p>

      {/* Bottom shine line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // Intro Sequence Phases
  const [logoDropped, setLogoDropped] = useState(false)
  const [showText, setShowText] = useState(false)
  const [hudVisible, setHudVisible] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isIntroActive, setIsIntroActive] = useState(() => {
    const authenticated = useAuthStore.getState().isAuthenticated
    if (authenticated) return false
    if (introHasPlayed) return false
    return true
  })

  // FAQ state
  const [activeFaq, setActiveFaq] = useState(null)

  // Auto-redirect to dashboard if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      introHasPlayed = true
      setIsIntroActive(false)
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // Intro Animation Timing Sequence
  useEffect(() => {
    if (!isIntroActive) return
    introHasPlayed = true

    const t1 = setTimeout(() => setLogoDropped(true), 150)
    const t2 = setTimeout(() => setShowText(true), 850)
    const t3 = setTimeout(() => setHudVisible(true), 2000)
    const t4 = setTimeout(() => setAnimationDone(true), 2100)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [isIntroActive])

  // Holographic Loader Progress
  useEffect(() => {
    if (!hudVisible || !isIntroActive) return
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 3
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        introHasPlayed = true
        setTimeout(() => setIsIntroActive(false), 650)
      }
      setLoadingProgress(progress)
    }, 85)
    return () => clearInterval(interval)
  }, [hudVisible, isIntroActive])

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-purple-600/40 selection:text-white">
      
      {/* ═══ CINEMATIC INTRO OVERLAY ═══ */}
      <div 
        className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-all duration-750 ease-out ${
          isIntroActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none scale-95'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06),transparent_65%)] pointer-events-none" />
        
        <div className="flex flex-col items-center justify-center space-y-10 w-full max-w-[620px] px-6">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className={`w-20 h-20 rounded-[24px] bg-gradient-to-tr from-purple-650 to-indigo-650 flex items-center justify-center text-white shadow-2xl shadow-purple-500/30 transform transition-all duration-[900ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
                logoDropped ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-48 opacity-0 scale-90'
              } ${animationDone ? 'animate-gentle-float' : ''}`}
            >
              <HiCloud className="text-4xl text-white" />
            </div>

            <div 
              className={`flex items-center gap-[2px] transform transition-all duration-1000 ease-out font-black text-2xl md:text-3xl tracking-tight text-white uppercase font-mono ${
                showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              } ${animationDone ? 'animate-light-shake' : ''}`}
            >
              {"SMARTCLOUD".split("").map((char, index) => (
                <span
                  key={index}
                  className={`inline-block opacity-0 ${showText ? 'animate-letter-reveal' : ''}`}
                  style={{ animationDelay: `${index * 50 + 850}ms`, whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                >
                  {char}
                </span>
              ))}
              <span className="inline-block" style={{ width: '8px' }} />
              {"AI".split("").map((char, index) => (
                <span
                  key={index}
                  className={`inline-block text-purple-400 opacity-0 ${showText ? 'animate-letter-reveal' : ''}`}
                  style={{ animationDelay: `${(index + 10) * 50 + 850}ms` }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* HUD Frame */}
          <div 
            className={`relative w-full aspect-[2.4/1] border border-cyan-500/20 rounded-[36px] bg-slate-950/75 shadow-[0_0_50px_rgba(6,182,212,0.1)] p-6 flex flex-col justify-between overflow-hidden transition-all duration-700 ease-out ${
              hudVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
          >
            <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-pink-500/40 rounded-tl-[30px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-pink-500/40 rounded-tr-[30px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyan-500/40 rounded-bl-[30px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyan-500/40 rounded-br-[30px] pointer-events-none" />

            <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-cyan-400">
              <span>SECURE CORES: SYNCING</span>
              <span className="animate-pulse text-pink-500 font-bold">INITIALIZING CORE STORAGE DATABASE...</span>
            </div>

            <div className="space-y-3.5 text-center">
              <div className="w-full bg-slate-900 border border-cyan-500/15 rounded-full h-3 p-0.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-100 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="text-xl md:text-2xl font-black font-mono text-cyan-300">
                {loadingProgress} %
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex gap-[3px] items-end h-3">
                <span className="w-[1.5px] bg-cyan-400 h-1.5 animate-[pulse_0.8s_infinite]" />
                <span className="w-[1.5px] bg-cyan-400 h-3 animate-[pulse_0.5s_infinite]" />
                <span className="w-[1.5px] bg-cyan-400 h-1 animate-[pulse_0.9s_infinite]" />
                <span className="w-[1.5px] bg-cyan-400 h-2 animate-[pulse_0.6s_infinite]" />
              </div>
              <div className="text-[10px] font-black text-white/30 tracking-wider font-mono">[ SYS_CONNECT ]</div>
              <div className="text-[8px] font-mono text-slate-500 text-right">VERIFYING HANDSHAKE...</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STICKY HEADER ═══ */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <HiCloud className="text-2xl" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              SmartCloud <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent font-bold">AI</span>
            </span>
          </div>

          {/* Center links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors duration-200">Features</button>
            <button onClick={() => scrollToSection('neural-search')} className="hover:text-white transition-colors duration-200">AI Engine</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors duration-200">FAQ</button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors duration-200">
              Sign In
            </Link>
            <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/20 active:scale-[0.97] hover:shadow-purple-500/30">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ HERO SECTION – Massive, cinematic, gradient mesh ═══ */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/[0.07] blur-[120px] animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.06] blur-[100px] animate-[float_10s_ease-in-out_infinite_2s]" />
          <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.05] blur-[100px] animate-[float_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Floating particles */}
        <FloatingParticles count={25} />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left – Text */}
            <div className="lg:col-span-7 text-left space-y-8">
              {/* Badge */}
              <ScrollReveal animation="reveal-up" delay={100}>
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-purple-500/[0.08] border border-purple-500/20 backdrop-blur-sm animate-border-glow">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                  </span>
                  <span className="text-[11px] text-purple-300 font-bold tracking-widest uppercase">AI-Powered Cloud Platform</span>
                </div>
              </ScrollReveal>
              
              {/* Headline */}
              <ScrollReveal animation="reveal-up" delay={200}>
                <h1 className="text-5xl md:text-[4.2rem] font-black tracking-tight leading-[1.08]">
                  <span className="text-white">The future of</span><br />
                  <span className="text-white">file storage is </span>
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent animate-gradient-text">
                      intelligent.
                    </span>
                    <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-full opacity-60 blur-sm animate-pulse" />
                  </span>
                </h1>
              </ScrollReveal>
              
              {/* Subtext */}
              <ScrollReveal animation="reveal-up" delay={350}>
                <p className="text-base text-slate-400 leading-relaxed max-w-xl">
                  SmartCloud AI organizes, classifies, and protects your documents using advanced AI. Semantic search, automatic categorization, and real-time PII detection — all in one secure platform.
                </p>
              </ScrollReveal>

              {/* CTA Buttons */}
              <ScrollReveal animation="reveal-up" delay={500}>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link 
                    to="/register" 
                    className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-sm uppercase tracking-wider shadow-2xl shadow-purple-600/25 active:scale-[0.97] transition-all duration-300 flex items-center gap-3 hover:shadow-purple-500/35 hover:gap-4"
                  >
                    Start Free <HiOutlineArrowRight className="text-lg transition-all duration-300 group-hover:translate-x-1" />
                  </Link>
                  <button 
                    onClick={() => scrollToSection('features')}
                    className="px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white font-bold text-sm uppercase tracking-wider transition-all duration-300"
                  >
                    Explore Features
                  </button>
                </div>
              </ScrollReveal>

              {/* Trust signals */}
              <ScrollReveal animation="reveal-up" delay={650}>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 group/trust cursor-default">
                    <HiLockClosed className="text-emerald-400 text-base icon-bounce" />
                    <span className="group-hover/trust:text-slate-300 transition-colors">AES-256 Encrypted</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 group/trust cursor-default">
                    <HiLightningBolt className="text-amber-400 text-base icon-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="group-hover/trust:text-slate-300 transition-colors">Instant AI Processing</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 group/trust cursor-default">
                    <HiShieldCheck className="text-blue-400 text-base icon-bounce" style={{ animationDelay: '0.6s' }} />
                    <span className="group-hover/trust:text-slate-300 transition-colors">PII Detection</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right – Hero Visual */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              {/* Multi-layer glow */}
              <div className="absolute w-[320px] h-[320px] rounded-full bg-purple-600/15 blur-[80px] animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
              <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-[60px] animate-pulse pointer-events-none" style={{ animationDuration: '5s', animationDelay: '1s' }} />
              
              {/* Orbital rings */}
              <div className="absolute w-[340px] h-[340px] rounded-full border border-purple-500/[0.08] animate-[spin_25s_linear_infinite] pointer-events-none" />
              <div className="absolute w-[280px] h-[280px] rounded-full border border-indigo-500/[0.06] animate-[spin_20s_linear_infinite_reverse] pointer-events-none" />

              {/* Orbital dots */}
              <div className="absolute w-[340px] h-[340px] animate-[spin_25s_linear_infinite] pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
              </div>

              <ScrollReveal animation="reveal-scale" delay={300}>
                <img 
                  src="/isometric_cloud.png" 
                  alt="SmartCloud AI" 
                  className="w-[300px] md:w-[360px] h-auto object-contain transition-transform duration-700 hover:scale-105 drop-shadow-[0_20px_50px_rgba(168,85,247,0.2)] relative z-10 animate-hero-float" 
                />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <ScrollReveal animation="reveal-up">
          <div className="text-center space-y-4 mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/[0.08] border border-purple-500/20 text-[10px] text-purple-300 font-bold tracking-[0.25em] uppercase">
              Core Capabilities
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Everything you need to<br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent animate-gradient-text">manage files smarter</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Built with enterprise-grade security and AI intelligence. SmartCloud transforms how you store, organize, and discover your documents.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto stagger-children">
          <ScrollReveal animation="reveal-up" delay={0}>
            <GlowCard 
              icon={HiFolder}
              title="Smart File Organization"
              description="Create nested folder trees with custom color coding. Upload files in parallel with real-time progress tracking. Automatic AI-powered categorization sorts your documents into meaningful groups."
              colorClass="text-blue-400"
              gradient="from-blue-600 to-cyan-500"
            />
          </ScrollReveal>
          <ScrollReveal animation="reveal-up" delay={120}>
            <GlowCard 
              icon={HiSparkles}
              title="AI Assistant Studio"
              description="Chat with your documents using natural language. Get instant summaries, extract key dates, identify important clauses, and ask follow-up questions — all powered by Gemini AI."
              colorClass="text-purple-400"
              gradient="from-purple-600 to-violet-500"
            />
          </ScrollReveal>
          <ScrollReveal animation="reveal-up" delay={240}>
            <GlowCard 
              icon={HiShieldCheck}
              title="SafeShield Protection"
              description="Real-time scanning detects Aadhaar numbers, PAN cards, passport IDs, and bank details automatically. Sensitive files are flagged and public sharing is restricted to prevent data leaks."
              colorClass="text-amber-400"
              gradient="from-amber-500 to-orange-500"
            />
          </ScrollReveal>
          <ScrollReveal animation="reveal-up" delay={360}>
            <GlowCard 
              icon={HiClipboardList}
              title="Admin Intelligence"
              description="Full admin dashboard with user analytics, storage metrics, file activity timelines, and system health monitoring. Manage users, quotas, and subscriptions from one central panel."
              colorClass="text-rose-400"
              gradient="from-rose-500 to-pink-500"
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ SEMANTIC VECTOR ENGINE ═══ */}
      <section id="neural-search" className="relative py-28 overflow-hidden">
        {/* Subtle bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/[0.03] to-slate-950 pointer-events-none" />
        <FloatingParticles count={12} />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center max-w-6xl mx-auto">
            
            {/* Left Text */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <ScrollReveal animation="reveal-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/[0.08] border border-indigo-500/20">
                  <HiSearchCircle className="text-indigo-400 text-sm icon-wiggle" />
                  <span className="text-[10px] text-indigo-300 font-bold tracking-[0.25em] uppercase">Neural Search</span>
                </div>
              </ScrollReveal>

              <ScrollReveal animation="reveal-left" delay={150}>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  Search by <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient-text">meaning</span>,<br />
                  not just keywords
                </h2>
              </ScrollReveal>
              
              <ScrollReveal animation="reveal-left" delay={300}>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                  Our vector engine transforms documents into high-dimensional embeddings. Search for concepts like "financial agreements" and discover relevant contracts, invoices, and statements — even if the filename doesn't match.
                </p>
              </ScrollReveal>

              <div className="space-y-5">
                {[
                  { title: 'Gemini Embedding Integration', desc: 'Uses text-embedding-004 to create precise multidimensional document vectors.' },
                  { title: 'Cosine Similarity Matching', desc: 'Finds conceptually related documents using mathematical similarity scoring.' },
                  { title: 'Hybrid Search Modes', desc: 'Combines semantic AI search with traditional filename matching for maximum coverage.' }
                ].map((item, i) => (
                  <ScrollReveal key={i} animation="reveal-left" delay={400 + i * 120}>
                    <div className="flex gap-4 items-start group">
                      <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shrink-0 group-hover:scale-[1.8] transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors duration-300">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {/* Right – Tech Image */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              <div className="absolute w-[250px] h-[250px] rounded-full bg-indigo-600/10 blur-[70px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
              <ScrollReveal animation="reveal-right" delay={200}>
                <img 
                  src="/network_nodes.png" 
                  alt="Vector Network" 
                  className="w-[280px] md:w-[340px] h-auto object-contain rounded-3xl border border-white/[0.06] shadow-2xl shadow-indigo-900/20 transition-all duration-500 hover:scale-105 hover:shadow-indigo-800/30 relative z-10 animate-hero-float" 
                />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ METRICS BANNER ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {[
            { value: 99, suffix: '.9%', icon: HiLockClosed, iconColor: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.15)', label: 'Encrypted Storage', sublabel: 'AES-256 Standard' },
            { value: 2, suffix: '.5s', prefix: '< ', icon: HiLightningBolt, iconColor: 'text-amber-400', glowColor: 'rgba(251,191,36,0.15)', label: 'AI Processing', sublabel: 'Average Speed' },
            { value: 100, suffix: '%', icon: HiShieldCheck, iconColor: 'text-blue-400', glowColor: 'rgba(96,165,250,0.15)', label: 'PII Detection', sublabel: 'Accuracy Rate' },
            { value: 3, suffix: '', icon: HiSearchCircle, iconColor: 'text-purple-400', glowColor: 'rgba(168,85,247,0.15)', label: 'Search Modes', sublabel: 'Standard · Semantic · AI' },
          ].map((metric, i) => (
            <ScrollReveal key={i} animation="reveal-up" delay={i * 120}>
              <div className="text-center space-y-3 group p-6 rounded-2xl hover:bg-white/[0.02] transition-all duration-500">
                <div 
                  className="w-12 h-12 rounded-2xl mx-auto mb-1 flex items-center justify-center group-hover:scale-110 transition-all duration-500 icon-bounce"
                  style={{ background: metric.glowColor, animationDelay: `${i * 0.2}s` }}
                >
                  <metric.icon className={`${metric.iconColor} text-xl`} />
                </div>
                <p className="text-3xl md:text-4xl font-black text-white">
                  <AnimatedCounter target={metric.value} prefix={metric.prefix || ''} suffix={metric.suffix} />
                </p>
                <p className="text-xs text-white/70 font-bold uppercase tracking-wider">{metric.label}</p>
                <p className="text-[10px] text-slate-500">{metric.sublabel}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <ScrollReveal animation="reveal-up">
          <div className="text-center space-y-4 mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/[0.08] border border-violet-500/20 text-[10px] text-violet-300 font-bold tracking-[0.25em] uppercase">
              Getting Started
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Three steps to <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-text">smarter storage</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { step: '01', title: 'Upload Your Files', desc: 'Drag and drop documents, images, or any file type. Our system processes them instantly with parallel upload support.', gradient: 'from-purple-600 to-violet-600' },
            { step: '02', title: 'AI Analyzes Everything', desc: 'Gemini AI extracts text, classifies categories, generates summaries, detects sensitive data, and creates search embeddings automatically.', gradient: 'from-violet-600 to-indigo-600' },
            { step: '03', title: 'Search & Discover', desc: 'Find any document by concept, not just filename. Chat with your files, get instant answers, and share securely with one click.', gradient: 'from-indigo-600 to-blue-600' },
          ].map((item, i) => (
            <ScrollReveal key={i} animation="reveal-up" delay={i * 180}>
              <div className="relative group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+60px)] right-[-calc(50%-60px)] h-px bg-gradient-to-r from-purple-500/20 to-transparent" style={{ width: 'calc(100% - 60px)' }} />
                )}
                
                <div className="text-center space-y-5 p-8 rounded-3xl bg-slate-900/30 border border-white/[0.04] hover:border-purple-500/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-900/10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 icon-pulse-glow`}>
                    <span className="text-white font-black text-lg">{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors duration-300">{item.title}</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      {/* ═══ FAQ ═══ */}
      <section id="faq" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center space-y-4 mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/[0.08] border border-purple-500/20 text-[10px] text-purple-300 font-bold tracking-[0.25em] uppercase">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Got questions?
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Everything you need to know about SmartCloud AI.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { q: 'Is my data encrypted and secure?', a: 'Absolutely. Every file is encrypted at rest using AES-256 encryption. Access is controlled via JWT sessions, preventing unauthorized cross-tenant access. Your data never leaves our secure storage layer without verification.' },
            { q: 'How does semantic search differ from standard search?', a: 'Standard search matches filenames character by character. Semantic search transforms your document content into mathematical vectors and finds conceptually related files. For example, searching "financial agreements" will surface contracts and invoices even if those words aren\'t in the filename.' },
            { q: 'Does SafeShield automatically block sensitive file sharing?', a: 'Yes. When our AI detects PII patterns like Aadhaar numbers, PAN cards, or bank account details, the file is flagged in the database. Public share links are automatically restricted to prevent accidental data exposure.' },
            { q: 'What file types does the AI support?', a: 'SmartCloud AI can analyze PDFs, Word documents, text files, images (JPG, PNG — using vision AI), and more. It extracts text, generates summaries, identifies categories, and creates searchable embeddings for all supported formats.' },
            { q: 'Can I upgrade or downgrade my plan anytime?', a: 'Yes. You can upgrade to Pro or Premium at any time from your dashboard. Plan changes take effect immediately, and you\'ll have access to all the features of your new tier right away.' },
          ].map((faq, i) => (
            <div key={i} className="border border-white/[0.05] rounded-2xl bg-slate-900/20 overflow-hidden hover:border-white/[0.1] transition-all duration-300">
              <button 
                onClick={() => toggleFaq(i)}
                className="w-full p-6 flex items-center justify-between text-left font-bold text-sm text-white hover:bg-white/[0.02] transition-all duration-200"
              >
                <span>{faq.q}</span>
                <HiChevronDown className={`text-lg text-slate-400 transition-transform duration-300 shrink-0 ml-4 ${activeFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="px-6 pb-6 text-[13px] text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          
          {/* Left - Animated */}
          <ScrollReveal animation="reveal-left" delay={100}>
            <div className="space-y-3 group/footer-logo">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-650 to-indigo-650 flex items-center justify-center text-white shadow-md shadow-purple-600/15 group-hover/footer-logo:scale-115 group-hover/footer-logo:rotate-6 transition-all duration-300 icon-pulse-glow">
                  <HiCloud className="text-xl group-hover/footer-logo:animate-[iconWiggle_0.5s_ease-in-out]" />
                </div>
                <span className="font-bold text-sm text-white group-hover/footer-logo:text-purple-300 transition-colors duration-300 font-mono tracking-wide">SmartCloud AI</span>
              </div>
              <p className="text-xs text-slate-500 hover:text-slate-400 transition-colors duration-200 cursor-default">
                Karpagam College of Engineering (Karpagam Tech)
              </p>
              <p className="text-[10px] text-slate-600">
                &copy; {new Date().getFullYear()} SmartCloud AI. All rights reserved.
              </p>
            </div>
          </ScrollReveal>

          {/* Center Column - Cryptographic Security Key */}
          <ScrollReveal animation="reveal-scale" delay={120} className="mx-auto md:mx-0">
            <div className="flex flex-col items-center justify-center space-y-4 group cursor-default">
              <div className="relative w-20 h-20 flex items-center justify-center bg-slate-950 rounded-full border border-indigo-500/10 group-hover:border-purple-500/30 transition-colors duration-500 shadow-[0_0_15px_rgba(168,85,247,0.03)]">
                {/* Glowing Aura */}
                <div className="absolute w-12 h-12 rounded-full bg-purple-500/10 blur-xl group-hover:bg-indigo-500/25 transition-all duration-500" />
                
                {/* Outer lock dial ticks (SVG dash array rotating) */}
                <div className="absolute inset-1 rounded-full border border-dashed border-indigo-500/30 animate-[spin_12s_linear_infinite]" />
                
                {/* Secure Key SVG Icon */}
                <svg className="w-8 h-8 text-indigo-400 group-hover:text-purple-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>

                {/* Laser scan indicator dot */}
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold tracking-[0.25em] text-indigo-400 group-hover:text-purple-400 transition-colors duration-300 uppercase">
                  Crypto Access Key
                </span>
                <p className="text-[8px] text-slate-500 tracking-wider">SafeShield Verified</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right - Animated */}
          <ScrollReveal animation="reveal-right" delay={150}>
            <div className="space-y-2.5 text-xs text-slate-400">
              <p className="font-bold text-slate-500 uppercase tracking-widest text-[9px] cursor-default">System Administrator</p>
              <p className="font-bold text-white text-sm hover:text-purple-400 transition-colors duration-300 cursor-default">Shanmugapriyan S</p>
              <div className="flex items-center gap-2 pt-1 group/item">
                <HiMail className="text-purple-400 text-base group-hover/item:animate-bounce transition-all" />
                <a href="mailto:shanmugapriyans181@gmail.com" className="hover:text-white hover:underline transition-all duration-250">
                  shanmugapriyans181@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 group/item">
                <HiPhone className="text-purple-400 text-base group-hover/item:animate-[iconWiggle_0.5s_ease-in-out] transition-all" />
                <a href="tel:+919994642400" className="hover:text-white hover:underline transition-all duration-250">
                  +91 9994642400
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </footer>

    </div>
  )
}
