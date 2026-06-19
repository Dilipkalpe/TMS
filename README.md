# TMS Pro — Transport Management System

Enterprise-grade Transport Management System with integrated Accounting module. Built with **React.js**, **Tailwind CSS**, and **Vite** — fully static with realistic dummy data.

## Features

- Dashboard with KPIs, charts, and recent activity
- Booking Management (New, List, Details, Status, Payment)
- LR (Lorry Receipt) Generation with print/PDF actions
- Vehicle, Driver, Customer & Vendor Management
- Expense Management with category filters
- Full Accounting Module (Chart of Accounts, Ledgers, Vouchers, Registers)
- Financial Reports (Trial Balance, P&L, Balance Sheet, GST, Outstanding)
- Operational Reports (Trips, Vehicles, Drivers, Income, Expenses, Cash Flow)
- Settings (Company, Financial Year, GST, Roles, Theme, Security, Backup)
- Light & Dark mode
- Responsive design (Desktop, Tablet, Mobile)
- Collapsible sidebar with enterprise blue theme

## Tech Stack

- React 19
- React Router 7
- Tailwind CSS 4
- Lucide React (icons)
- Vite 8

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/     # Sidebar, Navbar, MainLayout
│   └── ui/         # Reusable UI components
├── config/         # Navigation config
├── context/        # Theme & Sidebar context
├── data/           # Dummy data for all modules
└── pages/          # All module pages
```

## Theme

| Token     | Value     |
|-----------|-----------|
| Primary   | `#2563EB` |
| Secondary | `#0F172A` |
| Background| `#F8FAFC` |
| Radius    | `12px`    |
| Font      | Inter     |
