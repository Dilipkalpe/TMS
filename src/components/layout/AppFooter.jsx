export default function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="app-footer shrink-0 border-t border-primary/20 bg-gradient-to-r from-primary/12 via-white to-accent/5 px-3 py-2 dark:border-primary/25 dark:from-primary/20 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-col items-center justify-between gap-1 text-[11px] leading-snug text-slate-500 sm:flex-row dark:text-slate-400">
        <span className="text-center sm:text-left">
          © {year} TMS Pro · Enterprise Transport Management · India
        </span>
        <a
          href="https://codeestack.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline dark:text-blue-300"
        >
          Powered by Codeestack
        </a>
      </div>
    </footer>
  )
}
