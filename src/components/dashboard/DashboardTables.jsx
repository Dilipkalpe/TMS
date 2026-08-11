import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../ui/Card'
import Badge, { statusVariant } from '../ui/Badge'
import AnalyticsChart from '../ui/AnalyticsChart'
import { lrDetailPath } from '../../utils/docPath'

const DONUT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function DashboardChartsRow({ lrTrend = [], lrStatusSummary = [], lrStatusTotal = 0, topDestinations = [], loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  const trendData = lrTrend.map((p) => ({
    label: p.label,
    created: p.created,
    delivered: p.delivered,
    pending: p.pending,
  }))

  const donutData = lrStatusSummary.map((s, i) => ({
    label: s.label,
    value: s.value,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  const destData = topDestinations.map((d) => ({
    label: d.name,
    value: d.count,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4">
        <CardHeader title="LR Trend" subtitle="Created · Delivered · Pending (last 31 days when range is wider)" />
        <div className="mt-2 h-52">
          <AnalyticsChart
            title=""
            type="multiLine"
            data={trendData.length ? trendData : [{ label: '—', created: 0, delivered: 0, pending: 0 }]}
          />
        </div>
      </Card>

      <Card className="p-4">
        <CardHeader title="LR Status Summary" subtitle={`Total ${lrStatusTotal.toLocaleString('en-IN')} LR`} />
        <div className="mt-2 h-52">
          <AnalyticsChart
            title=""
            type="donut"
            data={donutData.length ? donutData : [{ label: 'No data', value: 1 }]}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {lrStatusSummary.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{s.percent}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <CardHeader title="Top 5 Destinations" />
          <Link to="/reports" className="text-xs font-medium text-primary hover:underline">View All</Link>
        </div>
        <div className="mt-2 h-52">
          <AnalyticsChart
            title=""
            type="horizontal"
            data={destData.length ? destData : [{ label: '—', value: 0 }]}
            color="#1e5a8a"
          />
        </div>
      </Card>
    </div>
  )
}

export function DashboardTablesRow({ recentLrs = [], pendingDeliveries = [], notifications = [], loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card padding={false} className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CardHeader title="Recent LR" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2">LR No</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLrs.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No LR records</td></tr>
              ) : recentLrs.map((r) => (
                <tr key={r.lrNumber} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <Link to={lrDetailPath(r.lrNumber)} className="font-medium text-primary hover:underline">
                      {r.lrNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.date}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.from} → {r.to}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CardHeader title="Pending Deliveries" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2">LR No</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {pendingDeliveries.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No pending deliveries</td></tr>
              ) : pendingDeliveries.map((r) => (
                <tr key={r.lrNumber} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <Link to={lrDetailPath(r.lrNumber)} className="font-medium text-primary hover:underline">
                      {r.lrNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.destination}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2 font-medium text-red-600">{r.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CardHeader title="Recent Notifications" />
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>
          ) : notifications.map((n) => (
            <li key={n.id}>
              {n.path ? (
                <Link to={n.path} className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <NotificationItem notification={n} />
                </Link>
              ) : (
                <div className="px-4 py-3"><NotificationItem notification={n} /></div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function NotificationItem({ notification: n }) {
  return (
    <>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
      <p className="text-xs text-slate-500">{n.message}</p>
      {n.time && <p className="mt-0.5 text-[10px] text-slate-400">{n.time}</p>}
    </>
  )
}
