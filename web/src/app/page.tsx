"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { motion, useInView, useSpring, useTransform, useScroll } from "framer-motion";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const spring = useSpring(0, { duration: 2000, bounce: 0 });
  const display = useTransform(spring, (v) => {
    if (value.includes("%")) return `${Math.floor(v)}%`;
    if (value.includes("/")) return value;
    return Math.floor(v).toString();
  });

  useEffect(() => {
    if (isInView) {
      spring.set(numericValue);
    }
  }, [isInView, numericValue, spring]);

  if (value.includes("/")) {
    return <span ref={ref}>{value}</span>;
  }

  return <motion.span ref={ref}>{display}</motion.span>;
}

// Fade up animation variant
const fadeUpVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

// Stagger container
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] relative overflow-x-hidden">
      {/* Floating accent orb */}
      <div 
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{ 
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          top: '10%', 
          right: '-10%',
          filter: 'blur(60px)',
        }}
      />
      
      <Header />

      <main className="relative z-10">
        {/* Hero */}
        <section ref={heroRef} className="pt-36 md:pt-40 pb-12 px-4 md:px-6 lg:px-8">
          {/* Hero Card Container - Banner style like lumen.onl */}
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="max-w-[1400px] mx-auto rounded-[2rem] bg-[var(--bg-warm)]/95 backdrop-blur-sm relative overflow-hidden shadow-[0_8px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-white/50"
          >
            {/* Decorative background image */}
            <div className="absolute inset-0 pointer-events-none">
              <img 
                src="/banner.png" 
                alt="" 
                className="absolute left-0 top-0 w-full h-full object-cover opacity-60"
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-warm)]/80 via-[var(--bg-warm)]/40 to-transparent" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Left - Text */}
                <motion.div 
                  initial="hidden"
                  animate={mounted ? "visible" : "hidden"}
                  variants={staggerContainer}
                >
                  <motion.div variants={fadeUpVariant} className="flex items-center gap-4 mb-8">
                    <motion.div 
                      className="w-8 h-[2px] bg-[var(--accent)]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    />
                    <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                      Universal Launchpad
                    </span>
                  </motion.div>
                  
                  <motion.h1 variants={fadeUpVariant} className="heading-xl mb-10">
                    Launch tokens
                    <br />
                    <span className="text-italic">anywhere</span>
                    <span className="text-[var(--accent)]">.</span>
                  </motion.h1>
                  
                  <motion.p variants={fadeUpVariant} className="text-body max-w-lg mb-14">
                    A unified launchpad that connects you to every platform. 
                    Deploy on Pump.fun, configure tokenomics, and let automation 
                    handle the rest.
                  </motion.p>
                  
                  <motion.div variants={fadeUpVariant} className="flex flex-wrap items-center gap-12">
                    <Link 
                      href="/launch" 
                      className="group inline-block"
                    >
                      <span className="text-lg font-medium text-[var(--accent)]">Start launching</span>
                      <motion.span 
                        className="block h-[2px] bg-[var(--accent)] mt-1"
                        whileHover={{ x: 10 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      />
                    </Link>
                    
                    <Link 
                      href="/tokens" 
                      className="group inline-block"
                    >
                      <span className="text-lg font-medium text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors duration-300">Explore tokens</span>
                      <span className="block h-[2px] bg-transparent group-hover:bg-[var(--ink)] mt-1 transition-all duration-300" />
                    </Link>
                  </motion.div>
                </motion.div>
                
                {/* Right - Video in Frame */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={mounted ? { opacity: 1, scale: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  {/* White frame */}
                  <div className="bg-white rounded-2xl p-3 shadow-2xl hover:shadow-[0_20px_80px_-20px_rgba(0,0,0,0.2)] transition-shadow duration-500">
                    <div 
                      className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black cursor-pointer group"
                      onClick={togglePlay}
                    >
                      {/* Video */}
                      <video 
                        ref={videoRef}
                        autoPlay 
                        loop 
                        muted={isMuted}
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-10"
                      >
                        <source src="/hero-video.mp4" type="video/mp4" />
                      </video>
                      
                      {/* Minimal Play indicator - only when paused */}
                      {!isPlaying && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
                          <motion.div 
                            className="px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-2"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span className="text-sm text-white font-medium">Play</span>
                          </motion.div>
                        </div>
                      )}
                      
                      {/* Minimal sound toggle - bottom right corner only */}
                      <motion.button 
                        onClick={toggleMute}
                        className="absolute bottom-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        whileTap={{ scale: 0.9 }}
                      >
                        <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm flex items-center gap-2">
                          {isMuted ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                              <span className="text-xs text-white/80 font-medium">Sound off</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              <span className="text-xs text-white/80 font-medium">Sound on</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* About - Interactive features */}
        <section className="py-32 md:py-48">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-20 md:gap-32 items-start">
              <motion.div 
                className="md:sticky md:top-32"
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="w-8 h-[2px] bg-[var(--accent)]"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                  <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                    The Platform
                  </span>
                </div>
                <h2 className="heading-lg mb-10">
                  One dashboard,
                  <br />
                  <span className="text-italic">infinite reach</span>
                </h2>
                <p className="text-body mb-12 max-w-md">
                  Stop juggling between platforms. Crosspad gives you a 
                  single interface to launch across any launchpad, with built-in 
                  automation for everything.
                </p>
                
                <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400 }}>
                  <Link 
                    href="/docs" 
                    className="text-[var(--accent)] font-medium border-b-2 border-[var(--accent)] pb-1 hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors duration-300"
                  >
                    Learn how it works
                  </Link>
                </motion.div>
              </motion.div>
              
              <div className="space-y-0">
                {[
                  { label: "Buyback & Burn", desc: "Automatic deflation. Tokens become scarcer with every trade." },
                  { label: "Auto-Liquidity", desc: "Fees flow into LP. Depth grows continuously." },
                  { label: "Holder Rewards", desc: "Distribute revenue or run jackpot draws." },
                  { label: "24/7 Automation", desc: "Set it once. Runs forever without intervention." },
                ].map((item, i) => (
                  <div 
                    key={item.label}
                    className="group py-8 border-b border-[var(--ink)]/10 cursor-pointer relative"
                    onMouseEnter={() => setActiveFeature(i)}
                    onMouseLeave={() => setActiveFeature(null)}
                  >
                    {/* Active indicator */}
                    <div 
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[var(--accent)] rounded-full transition-all duration-300 ${
                        activeFeature === i ? 'h-12 opacity-100' : 'h-0 opacity-0'
                      }`}
                    />
                    
                    <div className={`flex items-start justify-between gap-8 transition-all duration-300 ${
                      activeFeature === i ? 'pl-6' : 'pl-0'
                    }`}>
                      <div>
                        <h3 className={`text-xl font-medium mb-2 transition-colors duration-300 ${
                          activeFeature === i ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                        }`}>
                          {item.label}
                        </h3>
                        <p className="text-[var(--ink-muted)] max-w-sm">
                          {item.desc}
                        </p>
                      </div>
                      <span className={`text-sm font-mono mt-1 transition-colors duration-300 ${
                        activeFeature === i ? 'text-[var(--accent)]' : 'text-[var(--ink-faded)]'
                      }`}>
                        0{i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats with banner card */}
        <motion.section 
          className="py-12 px-4 md:px-6 lg:px-8"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Stats Card Container - Same style as hero */}
          <div className="max-w-[1400px] mx-auto rounded-[2rem] bg-[var(--bg-warm)]/95 backdrop-blur-sm relative overflow-hidden shadow-[0_8px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-white/50">
            {/* Decorative background image */}
            <div className="absolute inset-0 pointer-events-none">
              <img 
                src="/banner.png" 
                alt="" 
                className="absolute left-0 top-0 w-full h-full object-cover opacity-40"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-[var(--bg-warm)]/60" />
            </div>
            
            {/* Stats Content */}
            <div className="relative z-10 py-12 md:py-16 px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
                {[
                  { value: "3", label: "Platforms" },
                  { value: "0", label: "Fees", suffix: "%" },
                  { value: "24/7", label: "Automation" },
                  { value: "99.9%", label: "Uptime" },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label} 
                    className={`group py-6 md:py-8 text-center cursor-default ${i < 3 ? 'md:border-r md:border-[var(--ink)]/10' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="font-serif text-4xl md:text-6xl text-[var(--ink)] mb-3 group-hover:text-[var(--accent)] transition-colors duration-300">
                      <AnimatedCounter value={stat.value} />
                      {stat.suffix || ""}
                    </p>
                    <p className="text-sm text-[var(--ink-muted)] uppercase tracking-widest group-hover:text-[var(--ink)] transition-colors duration-300">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Platforms - Interactive list */}
        <section className="py-32 md:py-48">
          <div className="container">
            <div className="max-w-xl mb-20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-[2px] bg-[var(--accent)]" />
                <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                  Integrations
                </span>
              </div>
              <h2 className="heading-lg">
                Every major
                <br />
                <span className="text-italic">launchpad</span>
              </h2>
            </div>
            
            <div className="space-y-0">
              {[
                { name: "Pump.fun", desc: "The original meme token launchpad", status: "live" },
                { name: "Bags", desc: "Next-gen token launches", status: "soon" },
                { name: "Bonk", desc: "Community-powered launchpad", status: "soon" },
              ].map((platform, i) => (
                <div 
                  key={platform.name}
                  className="group relative py-10 border-b border-[var(--ink)]/10 cursor-pointer overflow-hidden"
                >
                  {/* Hover background sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-8 md:gap-16">
                      <span className="text-[var(--ink-faded)] group-hover:text-[var(--accent)] text-sm font-mono w-8 transition-colors duration-300">
                        0{i + 1}
                      </span>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-serif group-hover:text-[var(--accent)] transition-colors duration-300">
                          {platform.name}
                        </h3>
                        <p className="text-[var(--ink-muted)] mt-1 hidden md:block">
                          {platform.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {platform.status === "live" ? (
                        <span className="text-sm text-[var(--accent)] italic">Ready</span>
                      ) : (
                        <span className="text-sm text-[var(--ink-faded)] italic">Soon</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA with accent glow */}
        <section className="py-32 md:py-48 relative">
          <div className="container">
            {/* Background glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
            
            <div className="text-center max-w-3xl mx-auto relative">
              <h2 className="heading-xl mb-8">
                Ready to
                <br />
                <span className="text-italic">launch</span>
                <span className="text-[var(--accent)]">?</span>
              </h2>
              <p className="text-body mb-14 max-w-md mx-auto">
                No subscriptions. No hidden fees. Connect your wallet and 
                deploy your token in minutes.
              </p>
              
              <Link 
                href="/launch" 
                className="group inline-block"
              >
                <span className="text-2xl md:text-3xl font-serif text-[var(--accent)] group-hover:text-[var(--ink)] transition-colors duration-300">
                  Open App
                </span>
                <span className="block h-[2px] w-full bg-[var(--accent)] mt-2 group-hover:bg-[var(--ink)] transition-all duration-300" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[var(--ink)]/5">
          <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="font-serif text-xl text-[var(--ink)]">Crosspad</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-[var(--ink-muted)]">
              <Link href="/docs" className="hover:text-[var(--accent)] transition-colors">
                Docs
              </Link>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener"
                className="hover:text-[var(--accent)] transition-colors"
              >
                Twitter
              </a>
              <span>© 2025</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
