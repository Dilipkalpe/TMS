import { Container, MapPin, ShieldCheck, Truck } from 'lucide-react'

export default function LoginBackground() {
  return (
    <div className="login-scene pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />

      {/* Sun glow */}
      <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />
      <div className="absolute left-1/4 top-12 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />

      {/* Grid map overlay */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30,90,138,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,90,138,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Highway perspective */}
      <svg
        className="absolute bottom-0 left-0 w-full text-primary/90 dark:text-primary/70"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        style={{ height: '55%', minHeight: 280 }}
      >
        <defs>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        {/* Road surface */}
        <path d="M0 180 L720 120 L1440 180 L1440 420 L0 420 Z" fill="url(#roadGrad)" opacity="0.95" />
        {/* Road edges */}
        <path d="M0 180 L720 120 L1440 180" fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.9" />
        <path d="M200 200 L720 140 L1240 200" fill="none" stroke="white" strokeWidth="2" strokeDasharray="20 16" opacity="0.7" />
        {/* Lane divider center */}
        <path d="M360 195 L720 135 L1080 195" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="12 10" opacity="0.5" />
      </svg>

      {/* Truck convoy */}
      <div className="login-truck absolute bottom-[14%] left-[8%] hidden opacity-90 sm:block">
        <Truck className="h-16 w-16 text-primary drop-shadow-lg sm:h-20 sm:w-20" strokeWidth={1.5} />
      </div>
      <div className="login-truck-delay absolute bottom-[18%] left-[22%] hidden opacity-60 md:block">
        <Truck className="h-12 w-12 text-slate-600 dark:text-slate-400" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-[12%] right-[10%] hidden opacity-80 lg:block">
        <Container className="h-14 w-14 text-orange-500 drop-shadow-md" strokeWidth={1.5} />
      </div>

      {/* Floating location pins */}
      <div className="absolute left-[15%] top-[28%] flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur dark:bg-slate-800/80 dark:text-slate-200">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        Mumbai Hub
      </div>
      <div className="absolute right-[12%] top-[32%] hidden items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur dark:bg-slate-800/80 dark:text-slate-200 sm:flex">
        <MapPin className="h-3.5 w-3.5 text-green-600" />
        Delhi Depot
      </div>
      <div className="absolute left-[38%] top-[22%] hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-lg lg:flex">
        <ShieldCheck className="h-3.5 w-3.5" />
        GST Ready ERP
      </div>

      {/* Horizon line */}
      <div className="absolute left-0 right-0 top-[45%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  )
}
