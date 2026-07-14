# Company Document Flow Preference

Company-level setting that controls the **LR (Lorry Receipt) ↔ Booking** creation sequence.

## Options

| Value | Label | Sequence |
|-------|--------|----------|
| `FirstLRThenBooking` | First LR → Next Booking | Create LR first; Booking requires linked LR |
| `FirstBookingThenLR` | First Booking → Next LR | Create Booking first; LR requires linked Booking |

Default for new/existing companies: **`FirstBookingThenLR`** (preserves previous TMS behaviour).

## Storage

Column on `company_settings`:

```sql
document_flow VARCHAR(40) NOT NULL DEFAULT 'FirstBookingThenLR'
```

Scripts:

- `database/settings_extension.sql` (applied on API startup)
- `database/settings_document_flow.sql` (idempotent patch)

## APIs

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/settings` | Includes `documentFlow` + `documentFlowLabel` |
| `GET` | `/api/settings/document-flow` | Current flow + option list |
| `PUT` | `/api/settings/document-flow` | Body `{ "documentFlow": "FirstLRThenBooking" }` |
| `PUT` | `/api/settings` | Also accepts `documentFlow` in the settings body |
| `GET` | `/api/company/settings/document-flow` | Product alias → `{ "documentFlow": "..." }` |
| `PUT` | `/api/company/settings/document-flow` | Product alias update |

## Central service

`DocumentFlowService` (`backend/Tms.Api/Services/DocumentFlowService.cs`):

- `GetFlowAsync` / `SetFlowAsync`
- `EnsureCanCreateBookingAsync(lrNumber)` — enforces First LR → Booking
- `EnsureCanCreateLrAsync(bookingId)` — enforces First Booking → LR
- `EnsureCanClearLrBookingLinkAsync` — blocks unlinking LR from booking when First Booking → LR
- `GetPendingDocumentCountAsync` — dashboard/report pending metric follows the flow

All Booking/LR save paths must call these helpers (no hardcoded sequence).

## Validation messages

- **FirstLRThenBooking** creating booking without LR:  
  `Company Document Flow is set to First LR → Next Booking. Create an LR first, then create the Booking linked to that LR.`

- **FirstBookingThenLR** creating LR without booking:  
  `Company Document Flow is set to First Booking → Next LR. Create a Booking first, then generate the LR linked to that Booking.`

## Frontend

- **Settings → Document Flow** tab: radio buttons + save
- `useDocumentFlow()` hook for Booking / LR screens
- New Booking: requires LR select when First LR → Booking
- Generate LR: requires Booking select when First Booking → LR

## Reports / dashboard

Pending document count:

- First Booking → LR → count of bookings **without** an LR
- First LR → Booking → count of LRs **without** a booking

Alert title/message path switches with the same preference.
