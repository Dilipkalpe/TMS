/**
 * Generates TMS Pro Workflow Word document with flowchart diagrams
 * Run: node scripts/generate-workflow-doc.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'TMS_Pro_Workflow.docx')
const DIAGRAMS = path.join(ROOT, 'docs', 'diagrams')
const PNG_DIR = path.join(DIAGRAMS, 'png')
const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } })
}
function p(text) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } })
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } })
}
function numbered(text) {
  return new Paragraph({ text, numbering: { reference: 'steps', level: 0 }, spacing: { after: 60 } })
}

function tableRow(cells, header = false) {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: header })] })],
        }),
    ),
  })
}

function renderDiagrams() {
  fs.mkdirSync(PNG_DIR, { recursive: true })
  const files = fs.readdirSync(DIAGRAMS).filter((f) => f.endsWith('.mmd')).sort()
  console.log('Rendering flowchart diagrams…')
  for (const file of files) {
    const input = path.join(DIAGRAMS, file)
    const output = path.join(PNG_DIR, file.replace('.mmd', '.png'))
    execSync(
      `npx --yes @mermaid-js/mermaid-cli -i "${input}" -o "${output}" -b white -w 1400 -H 900 --scale 2`,
      { stdio: 'inherit', cwd: ROOT },
    )
    console.log(`  ✓ ${file}`)
  }
}

function diagram(name, caption, width = 620, height = 380) {
  const pngPath = path.join(PNG_DIR, `${name}.png`)
  if (!fs.existsSync(pngPath)) {
    return [p(`[Diagram ${name} not found]`), p('')]
  }
  const data = fs.readFileSync(pngPath)
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [
        new ImageRun({
          type: 'png',
          data,
          transformation: { width, height },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `Figure: ${caption}`, italics: true, size: 20, color: '64748B' })],
    }),
  ]
}

renderDiagrams()

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'steps',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: 'TMS Pro — System Workflow Document', bold: true, size: 36 })],
          spacing: { after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Transport Management System | Version 1.1 | ${today}`,
              italics: true,
              color: '64748B',
            }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Includes flowchart diagrams & module map', size: 20, color: '2563EB' })],
          spacing: { after: 300 },
        }),

        h1('1. Introduction'),
        p(
          'TMS Pro is an enterprise Transport Management System for logistics and transport companies. It covers booking, LR generation, fleet management, expenses, accounting, and reporting — all connected through a React frontend, .NET 8 API, and PostgreSQL database.',
        ),
        p('This document includes visual flowcharts for architecture, authentication, business processes, accounting, installation, data flow, and UI module navigation.'),

        h1('2. System Architecture'),
        p('Three-tier architecture with JWT-secured REST API between the React UI and PostgreSQL database.'),
        ...diagram('01-architecture', 'System Architecture — React → .NET API → PostgreSQL', 620, 420),
        bullet('Presentation Layer: React 19 + Vite + Tailwind CSS (Port 5173)'),
        bullet('Application Layer: ASP.NET Core 8 REST API (Port 5000)'),
        bullet('Data Layer: PostgreSQL tms_pro database (Port 5432)'),

        h1('3. Authentication Workflow'),
        p('All protected routes require a valid JWT bearer token. Session expires on 401 response.'),
        ...diagram('02-authentication', 'Authentication & JWT Token Flow', 620, 200),
        numbered('User opens http://localhost:5173 → redirected to /login if no token.'),
        numbered('POST /api/auth/login with username & password.'),
        numbered('Backend validates BCrypt hash → returns JWT stored in localStorage.'),
        numbered('All API calls include Authorization: Bearer {token}.'),

        h1('4. Application UI Module Map'),
        p('Navigation structure showing how modules connect from the Dashboard sidebar.'),
        ...diagram('07-ui-modules', 'TMS Pro UI Module Navigation Map', 620, 480),

        h1('5. Master Data Setup'),
        p('Configure these records before daily operations:'),
        numbered('Settings → Company profile, GSTIN, financial year'),
        numbered('Customers, Vendors, Vehicles, Drivers'),
        numbered('Accounting → Ledger Master (Cash, Bank, Income, Expense accounts)'),

        h1('6. Core Business Workflow'),
        p('End-to-end transport operations from booking creation through payment collection.'),
        ...diagram('03-business-flow', 'Business Process — Setup → Operations → Finance', 620, 400),
        h2('6.1 Create Booking'),
        numbered('Bookings → Add New: customer, route, vehicle, driver, freight, payment status.'),
        h2('6.2 Generate LR'),
        numbered('LR → Generate: consignor/consignee, charges, GST, advance → auto LR number.'),
        h2('6.3 Trip & Expenses'),
        numbered('Update booking status through trip lifecycle; record fuel, toll, maintenance expenses.'),
        h2('6.4 Payment Collection'),
        numbered('Accounting → Receipt Voucher when customer pays freight balance.'),

        h1('7. Accounting Workflow'),
        p('Double-entry accounting with vouchers flowing into registers and financial statements.'),
        ...diagram('04-accounting', 'Accounting Flow — Vouchers → Registers → Financial Statements', 620, 520),
        bullet('Payment / Receipt / Journal / Contra vouchers'),
        bullet('Cash Book, Bank Book, Day Book, all registers'),
        bullet('Trial Balance → P&L → Balance Sheet → GST → Outstanding'),

        h1('8. End-to-End Data Flow'),
        p('How operational data feeds reports and accounting modules.'),
        ...diagram('06-data-flow', 'Database Tables → Reports & Accounting Outputs', 620, 320),

        h1('9. Dashboard & Reporting'),
        bullet('Dashboard: 11 KPI cards, 14 analytics charts, alerts panel'),
        bullet('Reports Hub: trips, vehicles, drivers, income, expenses, cash flow'),
        bullet('Accounting Hub: 21 screens for books, registers, and statements'),

        h1('10. Installation Workflow'),
        p('Step-by-step setup for local development environment.'),
        ...diagram('05-installation', 'Installation & Deployment Steps', 620, 400),
        h2('10.1 Database'),
        numbered('CREATE DATABASE tms_pro;'),
        numbered('Run schema.sql → seed.sql → seed_accounting.sql'),
        h2('10.2 Application'),
        numbered('Configure appsettings.json connection string'),
        numbered('dotnet run (backend :5000) + npm run dev (frontend :5173)'),
        numbered('Login: admin / admin123'),

        h1('11. User Roles'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(['Role', 'Access', 'Modules'], true),
            tableRow(['Super Admin', 'Full access', 'All + Settings']),
            tableRow(['Accountant', 'Accounting', 'Accounting, Reports, Vouchers']),
            tableRow(['Operations Manager', 'Operations', 'Bookings, LR, Fleet, Expenses']),
            tableRow(['Driver Coordinator', 'Fleet', 'Drivers, Vehicles, LR']),
            tableRow(['Viewer', 'Read-only', 'Dashboard, Reports']),
          ],
        }),

        h1('12. API Module Reference'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(['Module', 'Endpoints'], true),
            tableRow(['Auth', 'POST /api/auth/login, GET /api/auth/me']),
            tableRow(['Operations', '/api/bookings, /api/lr']),
            tableRow(['Fleet & Masters', '/api/vehicles, /api/drivers, /api/customers, /api/vendors, /api/expenses']),
            tableRow(['Dashboard', '/api/dashboard/stats, charts, alerts']),
            tableRow(['Reports', '/api/reports/*']),
            tableRow(['Accounting', '/api/accounting/*']),
            tableRow(['Settings', 'GET/PUT /api/settings']),
          ],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '— End of Document —', italics: true, color: '94A3B8' })],
          spacing: { before: 400 },
        }),
      ],
    },
  ],
})

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(OUT, buffer)
console.log(`\nCreated: ${OUT}`)
console.log(`Diagrams: ${PNG_DIR}`)
