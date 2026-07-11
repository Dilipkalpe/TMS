# TMS Pro — Full Stack Transport Management System

Enterprise Transport Management System with **React.js** frontend, **C# .NET 8 REST API**, and **PostgreSQL** database.

## Architecture

```
React (Vite)  →  .NET 8 Web API  →  PostgreSQL
   :5173            :5000              :5432
```

## Quick Start

### 1. Database (PostgreSQL)

```bash
psql -U postgres -c "CREATE DATABASE tms_pro;"
psql -U postgres -d tms_pro -f database/schema.sql
psql -U postgres -d tms_pro -f database/seed.sql
psql -U postgres -d tms_pro -f database/seed_accounting.sql
```

Update `backend/Tms.Api/appsettings.json` with your PostgreSQL credentials.

### 2. Backend API

```bash
cd backend/Tms.Api
dotnet restore
dotnet run
```

- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger
- Login: `admin` / `admin123`

### 3. Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — API calls proxy to `localhost:5000` via Vite.

## Features

### Operations (full CRUD via API)
- Bookings — list, create, view, delete
- LR (Lorry Receipt) — list, create, delete
- Vehicles, Drivers, Customers, Vendors, Expenses

### Dashboard & Reports (read via API)
- Dashboard stats, recent bookings/trips, charts
- Trip, income, expense reports
- Accounting outstanding, trial balance

### Auth
- JWT bearer token authentication
- Protected routes on frontend and API

## API Modules

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Bookings | `/api/bookings` CRUD |
| LR | `/api/lr` CRUD |
| Vehicles | `/api/vehicles` CRUD |
| Drivers | `/api/drivers` CRUD |
| Customers | `/api/customers` CRUD |
| Vendors | `/api/vendors` CRUD |
| Expenses | `/api/expenses` CRUD |
| Dashboard | `/api/dashboard/*` |
| Reports | `/api/reports/*` |
| Accounting | `/api/accounting/*` |
| Lookups | `/api/lookups/*` |

## Project Structure

```
TMS/
├── database/           # PostgreSQL schema + seed
├── backend/Tms.Api/    # .NET 8 REST API
│   ├── Controllers/
│   ├── Models/
│   ├── Data/
│   ├── DTOs/
│   └── Services/
└── src/                # React frontend
    ├── services/api.js # API client
    ├── hooks/          # useApiResource
    └── pages/          # UI screens (API-integrated)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | ASP.NET Core 8, EF Core, JWT |
| Database | PostgreSQL 14+ |

## Theme

| Token | Value |
|-------|-------|
| Primary | `#2563EB` |
| Secondary | `#0F172A` |
| Font | Inter |
