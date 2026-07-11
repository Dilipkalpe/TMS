# TMS Pro API

ASP.NET Core 8 REST API with PostgreSQL for TMS Pro.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- PostgreSQL 14+

## Database setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE tms_pro;"

# Apply schema and seed
psql -U postgres -d tms_pro -f ../../database/schema.sql
psql -U postgres -d tms_pro -f ../../database/seed.sql
```

Update connection string in `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=tms_pro;Username=postgres;Password=YOUR_PASSWORD"
}
```

## Run API

```bash
cd backend/Tms.Api
dotnet restore
dotnet run
```

API: `http://localhost:5000` (or `https://localhost:5001`)  
Swagger: `http://localhost:5000/swagger`

## Default login

- Username: `admin`
- Password: `admin123`

## API endpoints

| Module | Base route |
|--------|------------|
| Auth | `POST /api/auth/login` |
| Bookings | `/api/bookings` |
| LR | `/api/lr` |
| Vehicles | `/api/vehicles` |
| Drivers | `/api/drivers` |
| Customers | `/api/customers` |
| Vendors | `/api/vendors` |
| Expenses | `/api/expenses` |
| Dashboard | `/api/dashboard/*` |
| Reports | `/api/reports/*` |
| Accounting | `/api/accounting/*` |
| Lookups | `/api/lookups/*` |

All routes except `/api/auth/login` and `/api/health` require `Authorization: Bearer {token}`.
