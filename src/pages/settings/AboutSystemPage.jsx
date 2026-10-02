import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import BrandLogo from '../../components/brand/BrandLogo'
import { APP_VERSION, BRAND, brandCopyright } from '../../config/brand'

export default function AboutSystemPage() {
  return (
    <ERPContentPage module="Settings" title="About / System Information">
      <Card className="mx-auto max-w-2xl">
        <CardHeader title="Product information" subtitle="Software provider details" />
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="hero" imgClassName="h-14 w-auto max-w-[280px]" />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Product</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-100">{BRAND.productName}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Developed By</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-100">{BRAND.companyName}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Website</dt>
            <dd>
              <a href={BRAND.websiteUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                {BRAND.website}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Version</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-100">{APP_VERSION}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Tagline</dt>
            <dd className="font-medium text-slate-700 dark:text-slate-200">{BRAND.tagline}</dd>
          </div>
        </dl>
        <p className="mt-6 border-t pt-4 text-xs text-slate-400 dark:border-slate-700">
          {brandCopyright()}
        </p>
      </Card>
    </ERPContentPage>
  )
}
