import {
  AreaChart,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
} from 'lucide-react'

const CHART_ICONS = {
  bar: BarChart3,
  line: LineChart,
  area: AreaChart,
  donut: PieChart,
  pie: PieChart,
  horizontal: BarChart3,
  stacked: BarChart3,
  grouped: BarChart3,
  multiLine: TrendingUp,
  gauge: PieChart,
}

function ChartHeader({ title, subtitle, type, badge, badgePositive = true }) {
  const Icon = CHART_ICONS[type] || BarChart3
  const badgeClass = badgePositive
    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
  return (
    <div className="mb-3 flex items-start justify-between space-x-2">
      <div className="min-w-0">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        {subtitle && <p className="mt-0.5 pl-9 text-[10px] text-slate-500 sm:text-xs">{subtitle}</p>}
      </div>
      {badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
          {badge}
        </span>
      )}
    </div>
  )
}

function getMax(data, keys = ['value']) {
  return Math.max(...data.flatMap((d) => keys.map((k) => d[k] ?? 0)), 1)
}

/* ─── BAR CHART ─── */
function BarChart({ data, color = '#2563eb', gradientId = 'barGrad' }) {
  const max = getMax(data)
  return (
    <div className="flex h-full min-h-[140px] items-end gap-1.5 px-1 sm:gap-2">
      {data.map((d, i) => (
        <div key={d.month ?? d.label ?? i} className="group flex flex-1 flex-col items-center gap-1">
          <span className="text-[9px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            {d.value ?? d.utilization}
          </span>
          <div className="relative w-full flex-1 flex items-end">
            <div
              className="chart-bar w-full rounded-t-md transition-all duration-500 group-hover:opacity-90 sm:rounded-t-lg"
              style={{
                height: `${((d.value ?? d.utilization ?? 0) / max) * 100}%`,
                minHeight: 4,
                background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          </div>
          <span className="text-[9px] font-medium text-slate-500 sm:text-[10px]">{d.month ?? d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── LINE / AREA CHART ─── */
function LineAreaChart({ data, dataKey = 'value', color = '#2563eb', fill = true }) {
  const max = getMax(data, [dataKey])
  const w = 100
  const h = 60
  const pad = 2
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((d[dataKey] ?? 0) / max) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full min-h-[140px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && <polygon points={areaPoints} fill={`url(#area-${color.replace('#', '')})`} />}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = h - pad - ((d[dataKey] ?? 0) / max) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="1.8" fill="white" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      })}
    </svg>
  )
}

/* ─── MULTI LINE ─── */
function MultiLineChart({ data }) {
  const max = getMax(data, ['revenue', 'expense', 'profit'])
  const w = 100
  const h = 60
  const pad = 2
  const mkLine = (key, color) => {
    const pts = data.map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = h - pad - ((d[key] ?? 0) / max) * (h - pad * 2)
      return `${x},${y}`
    }).join(' ')
    return <polyline key={key} points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  }
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full min-h-[120px] w-full" preserveAspectRatio="none">
        {mkLine('revenue', '#2563eb')}
        {mkLine('expense', '#ef4444')}
        {mkLine('profit', '#10b981')}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px]">
        {[
          { label: 'Revenue', color: '#2563eb' },
          { label: 'Expense', color: '#ef4444' },
          { label: 'Profit', color: '#10b981' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── DONUT / PIE ─── */
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function DonutPieChart({ data, donut = true }) {
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0)
  const cx = 18
  const cy = 18
  let offset = 0

  if (!donut) {
    let angle = 0
    return (
      <div className="flex min-h-[140px] items-center justify-center gap-4 sm:gap-6">
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full">
            {data.map((d) => {
              const slice = ((d.value ?? 0) / total) * 360
              const path = describeArc(cx, cy, 16, angle, angle + slice)
              angle += slice
              return <path key={d.label} d={path} fill={d.color} stroke="white" strokeWidth="0.3" />
            })}
          </svg>
        </div>
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 shrink-0 rounded-sm shadow-sm" style={{ background: d.color }} />
              <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[140px] items-center justify-center gap-4 sm:gap-6">
      <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          {data.map((d) => {
            const pct = ((d.value ?? 0) / total) * 100
            const el = (
              <circle
                key={d.label}
                cx={cx}
                cy={cy}
                r={15.9}
                fill="none"
                stroke={d.color}
                strokeWidth="3.2"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300"
              />
            )
            offset += pct
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-800 dark:text-white">{total}%</span>
          <span className="text-[9px] text-slate-500">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 shrink-0 rounded-sm shadow-sm" style={{ background: d.color }} />
            <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── HORIZONTAL BAR ─── */
function HorizontalBarChart({ data, color = '#2563eb' }) {
  const max = getMax(data, ['utilization', 'value'])
  const colors = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b']
  return (
    <div className="flex min-h-[140px] flex-col justify-center gap-2.5">
      {data.map((d, i) => {
        const val = d.utilization ?? d.value ?? 0
        const c = colors[i % colors.length]
        return (
          <div key={d.vehicle ?? d.label ?? i}>
            <div className="mb-1 flex justify-between text-[10px] sm:text-xs">
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">{d.vehicle ?? d.label}</span>
              <span className="font-bold" style={{ color: c }}>{val}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${val}%`,
                  background: `linear-gradient(90deg, ${c}, ${c}88)`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── STACKED BAR ─── */
function StackedBarChart({ data }) {
  const max = getMax(data, ['revenue'])
  return (
    <div className="relative flex h-full min-h-[140px] items-end gap-1.5 sm:gap-2">
      {data.slice(-6).map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-md sm:rounded-t-lg">
            <div
              className="w-full bg-red-400/80"
              style={{ height: `${(d.expense / max) * 50}%`, minHeight: 2 }}
            />
            <div
              className="w-full bg-gradient-to-t from-primary to-blue-400"
              style={{ height: `${(d.revenue / max) * 50}%`, minHeight: 2 }}
            />
          </div>
          <span className="text-[9px] text-slate-500">{d.month}</span>
        </div>
      ))}
      <div className="absolute bottom-8 right-0 flex gap-2 text-[9px]">
        <span className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-sm bg-primary" />Rev</span>
        <span className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-sm bg-red-400" />Exp</span>
      </div>
    </div>
  )
}

/* ─── GAUGE ─── */
function GaugeChart({ value = 78, label = 'Fleet Utilization', color = '#2563eb' }) {
  const pct = Math.min(100, Math.max(0, value))
  const angle = (pct / 100) * 180
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center">
      <svg viewBox="0 0 120 70" className="h-28 w-44">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path d="M 15 65 A 45 45 0 0 1 105 65" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" className="dark:stroke-slate-700" />
        <path
          d="M 15 65 A 45 45 0 0 1 105 65"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 141} 141`}
        />
        <text x="60" y="58" textAnchor="middle" className="fill-slate-800 text-xl font-bold dark:fill-white" fontSize="18">{pct}%</text>
      </svg>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  )
}

/* ─── RADAR (simple polygon) ─── */
function RadarChart({ data }) {
  const max = getMax(data)
  const cx = 50
  const cy = 50
  const r = 38
  const n = data.length
  const pts = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const dist = ((d.value ?? 0) / max) * r
    return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`
  }).join(' ')

  const gridPts = data.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`
  }).join(' ')

  return (
    <div className="flex min-h-[140px] items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-36 w-36">
        <polygon points={gridPts} fill="none" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-700" />
        <polygon points={pts} fill="rgba(37,99,235,0.2)" stroke="#2563eb" strokeWidth="1.5" />
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          const lx = cx + Math.cos(angle) * (r + 8)
          const ly = cy + Math.sin(angle) * (r + 8)
          return (
            <text key={d.label} x={lx} y={ly} textAnchor="middle" fontSize="5" className="fill-slate-500">
              {d.label.slice(0, 6)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default function AnalyticsChart({
  title,
  subtitle,
  type = 'bar',
  data = [],
  badge,
  badgePositive = true,
  color = '#2563eb',
  gaugeValue,
  className = '',
}) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <LineAreaChart data={data} dataKey="value" color={color} />
      case 'area':
        return <LineAreaChart data={data} dataKey="value" color={color} fill />
      case 'donut':
        return <DonutPieChart data={data} donut />
      case 'pie':
        return <DonutPieChart data={data} donut={false} />
      case 'horizontal':
        return <HorizontalBarChart data={data} color={color} />
      case 'stacked':
        return <StackedBarChart data={data} />
      case 'multiLine':
        return <MultiLineChart data={data} />
      case 'gauge':
        return <GaugeChart value={gaugeValue ?? 78} label={subtitle} />
      case 'radar':
        return <RadarChart data={data} />
      case 'grouped':
        return <BarChart data={data} color="#8b5cf6" />
      default:
        return <BarChart data={data} color={color} />
    }
  }

  return (
    <div className={`analytics-chart-card flex h-full min-h-[200px] flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-4 ${className}`}>
      <ChartHeader title={title} subtitle={subtitle} type={type} badge={badge} badgePositive={badgePositive} />
      <div className="relative min-h-0 flex-1">{renderChart()}</div>
    </div>
  )
}
