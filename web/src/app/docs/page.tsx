import { Header } from "@/components/Header";

export default function Docs() {
  return (
    <div className="min-h-screen relative">
      {/* Organic flowing background */}
      <div className="organic-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <Header />
      
      <main className="relative z-10 pt-28">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 py-8 lg:py-12">
          <h1 className="text-4xl lg:text-5xl font-display tracking-tight mb-3">
            How it <span className="hero-gradient">works</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Understanding the self-sustaining liquidity engine
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-5 pb-16 space-y-10">
          
          {/* Overview */}
          <div className="opacity-0 animate-fade-in-up">
            <h2 className="text-2xl font-display mb-4">Overview</h2>
            <div className="glass rounded-[24px] p-6 lg:p-8">
              <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                Surge is a self-sustaining liquidity engine for PumpFun tokens. When you launch through Surge, 
                we automatically claim your creator fees and use them to buyback your token and add liquidity.
              </p>
              <p className="text-[var(--coral)] font-medium leading-relaxed">
                The result: constant buy pressure, growing liquidity, and a more stable token.
              </p>
            </div>
          </div>

          {/* Two Phases */}
          <div className="opacity-0 animate-fade-in-up delay-100">
            <h2 className="text-2xl font-display mb-4">Two phases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-[24px] bg-gradient-to-br from-[var(--peach)]/40 to-[var(--coral-soft)]/20 border border-[var(--coral)]/15">
                <div className="text-[var(--coral)] font-semibold text-lg mb-2">Bonding Curve</div>
                <p className="text-xs text-[var(--text-muted)] mb-4">Before $55k market cap</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3"><Check /> <span>Claim creator fees</span></li>
                  <li className="flex items-center gap-3"><Check /> <span>100% to buybacks</span></li>
                  <li className="flex items-center gap-3 text-[var(--text-muted)]"><XMark /> <span>No LP yet</span></li>
                </ul>
              </div>
              <div className="p-6 rounded-[24px] bg-gradient-to-br from-[var(--success)]/10 to-[var(--success)]/5 border border-[var(--success)]/20">
                <div className="text-[var(--success)] font-semibold text-lg mb-2">Graduated</div>
                <p className="text-xs text-[var(--text-muted)] mb-4">On PumpSwap</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3"><Check success /> <span>Claim fees</span></li>
                  <li className="flex items-center gap-3"><Check success /> <span>Buyback tokens</span></li>
                  <li className="flex items-center gap-3"><Check success accent /> <span>Add to LP</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* The Loop */}
          <div className="opacity-0 animate-fade-in-up delay-200">
            <h2 className="text-2xl font-display mb-4">The 1-minute loop</h2>
            <div className="p-6 lg:p-8 rounded-[24px] bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] text-white shadow-xl shadow-[var(--coral)]/20">
              <div className="space-y-5">
                <LoopStep num="1" text="Claim all creator fees" />
                <LoopStep num="2" text="Buyback tokens via Jupiter" />
                <LoopStep num="3" text="Add tokens + SOL to LP" />
              </div>
              <div className="mt-6 pt-5 border-t border-white/15 text-center text-white/70">
                Repeats every 60 seconds, forever ∞
              </div>
            </div>
          </div>

          {/* How to use */}
          <div className="opacity-0 animate-fade-in-up delay-300">
            <h2 className="text-2xl font-display mb-4">Getting started</h2>
            <div className="space-y-3">
              <Step num="1" title="Connect wallet" desc="Connect the wallet you want to use" />
              <Step num="2" title="Create token" desc="Fill in your token details" />
              <Step num="3" title="Paste private key" desc="Key of your connected wallet" />
              <Step num="4" title="Done" desc="Everything runs automatically" />
            </div>
          </div>

          {/* Why Liquidity */}
          <div className="opacity-0 animate-fade-in-up delay-400">
            <h2 className="text-2xl font-display mb-4">Why liquidity matters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Point icon={<ChartIcon />} text="Deeper liquidity, less slippage" />
              <Point icon={<TrendIcon />} text="Constant buy pressure" />
              <Point icon={<BalanceIcon />} text="More stable price action" />
              <Point icon={<InfinityIcon />} text="LP grows forever" />
            </div>
          </div>

          {/* FAQ */}
          <div className="opacity-0 animate-fade-in-up delay-500">
            <h2 className="text-2xl font-display mb-4">FAQ</h2>
            <div className="space-y-4">
              <FAQ q="Why do I need my private key?" a="Your wallet signs all transactions. We need the key to automate buybacks and LP." />
              <FAQ q="Which wallet receives fees?" a="The wallet you connected. That's why the private key must be from that wallet." />
              <FAQ q="When does LP get added?" a="Only after graduation (~$55k mcap). Before that, all fees go to buybacks." />
              <FAQ q="Is it fully automatic?" a="Yes. Once you paste your private key, you don't need to do anything else." />
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

function Check({ accent, success }: { accent?: boolean; success?: boolean }) {
  const bgColor = accent 
    ? 'bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] shadow-md shadow-[var(--coral)]/20' 
    : success 
    ? 'bg-[var(--success)]' 
    : 'bg-gradient-to-br from-[var(--coral)] to-[var(--orange)]';
  
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bgColor}`}>
      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function XMark() {
  return (
    <div className="w-6 h-6 rounded-full bg-white/60 border border-[var(--border)] flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function LoopStep({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-base font-semibold">{num}</div>
      <span className="text-lg font-medium">{text}</span>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="glass p-5 rounded-[20px] flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] text-white flex items-center justify-center font-semibold flex-shrink-0 shadow-md shadow-[var(--coral)]/20">{num}</div>
      <div>
        <div className="font-semibold text-lg">{title}</div>
        <div className="text-sm text-[var(--text-muted)]">{desc}</div>
      </div>
    </div>
  );
}

function Point({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass p-5 rounded-[20px] flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--peach)] to-[var(--coral-soft)] flex items-center justify-center text-[var(--coral)]">
        {icon}
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="glass p-5 rounded-[20px]">
      <div className="font-semibold text-lg mb-2">{q}</div>
      <div className="text-[var(--text-secondary)] leading-relaxed">{a}</div>
    </div>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function BalanceIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
    </svg>
  );
}
