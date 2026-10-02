#!/usr/bin/env python3
"""Seed + test daily ops/accounting workflow for Shree Sai Logistics on Contabo."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

API = "http://127.0.0.1:5000"
TODAY = date.today().isoformat()
CID = "81f469ac-1131-4625-9875-5252a52cedfc"
BRANCH_HO = "5fe7db5a-28a6-4a9c-bd10-72ad69fd69ca"

CASH = "991037f7-0f88-4eaa-a3c7-7a4291ab351c"
BANK = "5b7d9cd2-43aa-4f75-bec8-e08fc06d2a6c"
CAPITAL = "d0cb8d44-4e07-4ce3-8642-331d49a33159"

ISSUES: list[str] = []
LOG: list[str] = []


def log(msg: str) -> None:
    print(msg, flush=True)
    LOG.append(msg)


def issue(msg: str) -> None:
    ISSUES.append(msg)
    log(f"ISSUE: {msg}")


def enc_lr(lr: str) -> str:
    return lr.replace("/", "~")


class Api:
    def __init__(self) -> None:
        self.token = ""

    def login(self) -> None:
        body = self.post("/api/auth/login", {"username": "12345", "password": "admin123"}, auth=False)
        self.token = body["token"]
        log(f"LOGIN ok company={body.get('companyId')} branch={body.get('branchId')} role={body.get('role')}")

    def req(self, method: str, path: str, payload=None, auth=True):
        data = None
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if auth:
            headers["Authorization"] = f"Bearer {self.token}"
            headers["X-Company-Id"] = CID
            headers["X-Branch-Id"] = BRANCH_HO
        if payload is not None:
            data = json.dumps(payload).encode()
        req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read().decode()
                code = resp.status
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            code = e.code
            return code, raw, _try_json(raw)
        return code, raw, _try_json(raw)

    def post(self, path, payload, auth=True, expect=(200, 201)):
        code, raw, body = self.req("POST", path, payload, auth=auth)
        if code not in expect:
            raise RuntimeError(f"POST {path} => {code}: {raw[:500]}")
        return body

    def get(self, path, expect=(200,)):
        code, raw, body = self.req("GET", path)
        if code not in expect:
            raise RuntimeError(f"GET {path} => {code}: {raw[:500]}")
        return body

    def patch(self, path, payload=None, expect=(200,)):
        code, raw, body = self.req("PATCH", path, payload if payload is not None else {})
        if code not in expect:
            raise RuntimeError(f"PATCH {path} => {code}: {raw[:500]}")
        return body


def _try_json(raw: str):
    try:
        return json.loads(raw) if raw else None
    except Exception:
        return None


def main() -> int:
    api = Api()
    api.login()

    # --- Opening balances (capital injection) ---
    tb0 = api.get("/api/gl/reports/trial-balance")
    if float(tb0.get("totalDebit") or 0) == 0:
        log("STEP opening capital journal 7,00,000")
        api.post("/api/gl/journals", {
            "voucherType": "Journal",
            "transactionDate": TODAY,
            "narration": "Opening capital — Shree Sai Logistics sample seed",
            "referenceNo": "OPN-SSL-001",
            "lines": [
                {"ledgerAccountId": CASH, "ledgerName": "Cash in Hand", "debit": 200000, "credit": 0},
                {"ledgerAccountId": BANK, "ledgerName": "Bank Account - HDFC", "debit": 500000, "credit": 0},
                {"ledgerAccountId": CAPITAL, "ledgerName": "Owner Capital", "debit": 0, "credit": 700000},
            ],
        })
    else:
        log(f"SKIP opening capital — TB already has debit={tb0.get('totalDebit')}")

    # --- Masters ---
    drivers = api.get("/api/drivers?pageSize=50").get("items") or []
    if not drivers:
        d1 = api.post("/api/drivers", {
            "name": "Ramesh Patil", "license": "MH20A20210001234",
            "licenseExpiry": "2028-03-31", "phone": "9823011001",
            "address": "CIDCO, Chhatrapati Sambhajinagar", "salary": 22000, "status": "Active",
        })
        d2 = api.post("/api/drivers", {
            "name": "Suresh Jadhav", "license": "MH12B20190005678",
            "licenseExpiry": "2027-11-15", "phone": "9823011002",
            "address": "Hadapsar, Pune", "salary": 20000, "status": "Active",
        })
        drivers = [d1, d2]
        log(f"CREATED drivers {[d['id'] for d in drivers]}")
    else:
        log(f"EXISTING drivers {[d['id'] for d in drivers]}")

    vehicles = api.get("/api/vehicles?pageSize=50").get("items") or []
    if not vehicles:
        v1 = api.post("/api/vehicles", {
            "number": "MH20AB4521", "type": "Truck", "model": "Tata 4018",
            "capacity": "16 MT", "owner": "Self", "status": "Active",
            "insurance": "2027-06-30", "fitness": "2027-01-15", "permit": "2027-12-31", "puc": "2026-12-31",
        })
        v2 = api.post("/api/vehicles", {
            "number": "MH12CD7788", "type": "Truck", "model": "Ashok Leyland 1616",
            "capacity": "12 MT", "owner": "Self", "status": "Active",
            "insurance": "2027-04-30", "fitness": "2026-12-20", "permit": "2027-08-31", "puc": "2026-11-30",
        })
        vehicles = [v1, v2]
        log(f"CREATED vehicles {[v['id'] for v in vehicles]}")
    else:
        log(f"EXISTING vehicles {[v['id'] for v in vehicles]}")

    vendors = api.get("/api/vendors?pageSize=20").get("items") or []
    if not vendors:
        vendor = api.post("/api/vendors", {
            "name": "Bharat Fuel Station", "contact": "Anil More", "phone": "9876501122",
            "gst": "27AAACB1234D1Z5", "address": "Jalna Road, Chhatrapati Sambhajinagar",
            "category": "Fuel",
        })
        log(f"CREATED vendor {vendor['id']}")
    else:
        vendor = vendors[0]
        log(f"EXISTING vendor {vendor['id']}")

    customers = api.get("/api/customers?pageSize=20").get("items") or []
    if not customers:
        customers = [api.post("/api/customers", {
            "name": "ABC Engineering Pvt. Ltd.", "contact": "Dilip Kalpe",
            "phone": "9876500001", "gst": "27ABCDE1234F1Z5",
            "address": "Waluj MIDC, Chhatrapati Sambhajinagar", "creditLimit": 500000,
        })]
        log(f"CREATED customer {customers[0]['id']}")

    consignors = api.get("/api/consignors?pageSize=20").get("items") or []
    if not consignors:
        consignors = [api.post("/api/consignors", {
            "name": "ABC Engineering Pvt. Ltd.", "contact": "Dilip Kalpe",
            "phone": "9876500001", "gst": "27ABCDE1234F1Z5",
            "address": "Waluj MIDC, Chhatrapati Sambhajinagar", "city": "Chhatrapati Sambhajinagar",
            "state": "Maharashtra", "status": "Active",
        })]
        log(f"CREATED consignor {consignors[0]['id']}")

    consignees = api.get("/api/consignees?pageSize=20").get("items") or []
    if not consignees:
        consignees = [api.post("/api/consignees", {
            "name": "Sai Industries", "contact": "Store",
            "phone": "9876500003", "gst": "27ABCDE3456F1Z7",
            "address": "Pimpri, Pune", "city": "Pune", "state": "Maharashtra", "status": "Active",
        })]
        log(f"CREATED consignee {consignees[0]['id']}")

    items = api.get("/api/items?pageSize=20").get("items") or []
    if not items:
        items = [api.post("/api/items", {
            "name": "ELECTRICAL", "hsn": "HS12909", "defaultPackageType": "Box",
            "unit": "Kg", "status": "Active",
        })]
        log(f"CREATED item {items[0]['id']}")

    cust = next((c for c in customers if c.get("id") == "C-007"), customers[0])
    cr = next((c for c in consignors if c.get("id") == "CR-007"), consignors[0])
    ce = next((c for c in consignees if c.get("id") == "CE-009"), consignees[-1])
    item = items[0]
    driver = drivers[0]
    vehicle = vehicles[0]

    # --- Booking 1 (full daily trip) ---
    bookings = api.get("/api/bookings?pageSize=20").get("items") or []
    seed_booking = next(
        (b for b in bookings if (b.get("remarks") or "").startswith("SSL-SEED-DAY1 ")
         or (b.get("remarks") or "").startswith("SSL-SEED-DAY1 Aurangabad")),
        None)
    if seed_booking:
        booking = seed_booking
        log(f"EXISTING booking {booking['id']}")
    else:
        booking = api.post("/api/bookings", {
            "date": TODAY,
            "customer": cust["name"],
            "consignor": cr["name"],
            "consignee": ce["name"],
            "consignorId": cr["id"],
            "consigneeId": ce["id"],
            "from": "Chhatrapati Sambhajinagar",
            "to": "Pune",
            "material": item["name"] if item else "ELECTRICAL",
            "materialId": item["id"] if item else None,
            "quantity": "12 MT",
            "vehicle": vehicle["number"],
            "vehicleId": vehicle["id"],
            "driver": driver["name"],
            "driverId": driver["id"],
            "freight": 45000,
            "status": "Confirmed",
            "payment": "To Pay",
            "advance": 10000,
            "remarks": "SSL-SEED-DAY1 Aurangabad-Pune FTL electrical goods",
        })
        log(f"CREATED booking {booking['id']} freight={booking.get('freight')} advance={booking.get('advance')}")

    booking_id = booking["id"]

    # --- LR linked to booking ---
    lrs = api.get("/api/lr?pageSize=50").get("items") or []
    lr = next((x for x in lrs if x.get("bookingId") == booking_id), None)
    if not lr:
        lr = api.post("/api/lr", {
            "lrDate": TODAY,
            "bookingId": booking_id,
            "consignorId": cr["id"],
            "consigneeId": ce["id"],
            "consignor": cr["name"],
            "consignee": ce["name"],
            "from": "Chhatrapati Sambhajinagar",
            "to": "Pune",
            "vehicle": vehicle["number"],
            "vehicleId": vehicle["id"],
            "driver": driver["name"],
            "driverId": driver["id"],
            "material": item["name"] if item else "ELECTRICAL",
            "quantity": "12 MT",
            "freight": 45000,
            "gst": 8100,
            "advance": 10000,
            "paymentType": "To Pay",
            "businessType": "FTL",
            "customerId": cust["id"],
            "customerName": cust["name"],
            "status": "LR Created",
            "remarks": "SSL-SEED-DAY1 LR",
        })
        log(f"CREATED LR {lr.get('lrNumber')}")
    else:
        log(f"EXISTING LR {lr.get('lrNumber')}")

    lr_no = lr["lrNumber"]
    lr_path = enc_lr(lr_no)

    # --- Ops daily flow ---
    process = api.get(f"/api/lr/{lr_path}/process")
    status = process.get("status") or lr.get("status")
    log(f"LR status before ops: {status}")

    if status in ("LR Created", "Draft", None):
        api.post(f"/api/lr/{lr_path}/loading-sheet", {
            "loadingLocation": "Waluj MIDC Yard, Chhatrapati Sambhajinagar",
            "vehicleNumber": vehicle["number"],
            "vehicleId": vehicle["id"],
            "driverName": driver["name"],
            "driverId": driver["id"],
            "businessType": "FTL",
            "loadingStatus": "Completed",
            "materialQuantity": "12 MT",
            "loaderName": "Ganesh",
            "supervisorName": "JEET",
            "sealNumber": "SEAL-SSL-1001",
            "remarks": "Loaded electrical crates — sealed",
        })
        log("LOADING sheet completed")
        status = "Loading Completed"

    if status == "Loading Completed":
        api.post(f"/api/lr/{lr_path}/transit-pass", {
            "vehicleNumber": vehicle["number"],
            "driverName": driver["name"],
            "routeFrom": "Chhatrapati Sambhajinagar",
            "routeTo": "Pune",
            "viaPoints": "Ahmednagar",
            "sealNumber": "SEAL-SSL-1001",
            "sealCondition": "Intact",
            "transitType": "By Road",
            "expectedDelivery": (date.today() + timedelta(days=1)).isoformat(),
            "issueDate": TODAY,
            "remarks": "Transit pass for SSL-SEED-DAY1",
        })
        api.post(f"/api/lr/{lr_path}/transit-pass/ready", {})
        log("TRANSIT pass ready")
        status = "Transit Pass Generated"

    if status == "Transit Pass Generated":
        api.post(f"/api/lr/{lr_path}/dispatch/confirm", {
            "dispatchDate": TODAY,
            "dispatchTime": datetime.now().strftime("%H:%M"),
            "remarks": "Dispatched toward Pune",
        })
        log("DISPATCH confirmed")
        status = "In Transit"

    if status == "In Transit":
        try:
            api.post(f"/api/lr/{lr_path}/checkpoints", {
                "location": "Ahmednagar Bypass",
                "date": TODAY,
                "time": "11:30",
                "km": 110,
                "status": "Passed",
                "remarks": "On schedule",
            })
            log("CHECKPOINT added")
        except Exception as e:
            issue(f"checkpoint failed: {e}")

        api.post(f"/api/lr/{lr_path}/delivery-sheet", {
            "shipmentStatus": "Delivered",
            "deliveryDate": TODAY,
            "deliveryTime": "17:45",
            "packagesTotal": 48,
            "packagesReceived": 48,
            "packagesDamaged": 0,
            "receiverName": "Store Incharge - Sai Industries",
            "extendedData": {"deliveryOutcome": "Delivered"},
        })
        log("DELIVERY completed")
        status = "Delivery Completed"

    if status in ("Delivery Completed", "Delivered"):
        try:
            api.patch(f"/api/lr/{lr_path}/pod/verify", {})
            log("POD verified")
            status = "POD Uploaded"
        except Exception as e:
            issue(f"POD verify failed: {e}")

    process = api.get(f"/api/lr/{lr_path}/process")
    log(f"LR final process status={process.get('status')}")

    # --- Booking 2 (pending / confirmed, not fully ops-complete) ---
    bookings = api.get("/api/bookings?pageSize=50").get("items") or []
    if not any((b.get("remarks") or "").startswith("SSL-SEED-DAY1B") for b in bookings):
        b2 = api.post("/api/bookings", {
            "date": TODAY,
            "customer": "Mahindra Traders",
            "consignorId": "CR-008",
            "consigneeId": "CE-010",
            "consignor": "Mahindra Traders",
            "consignee": "Omkar Packaging",
            "from": "Chhatrapati Sambhajinagar",
            "to": "Nashik",
            "material": item["name"] if item else "ELECTRICAL",
            "materialId": item["id"] if item else None,
            "quantity": "8 MT",
            "vehicle": vehicles[1]["number"] if len(vehicles) > 1 else vehicle["number"],
            "vehicleId": vehicles[1]["id"] if len(vehicles) > 1 else vehicle["id"],
            "driver": drivers[1]["name"] if len(drivers) > 1 else driver["name"],
            "driverId": drivers[1]["id"] if len(drivers) > 1 else driver["id"],
            "freight": 28000,
            "status": "Confirmed",
            "payment": "To Pay",
            "advance": 5000,
            "remarks": "SSL-SEED-DAY1B Aurangabad-Nashik pending load",
        })
        log(f"CREATED booking2 {b2['id']}")

    # --- Freight invoice for completed trip ---
    invoices = api.get(f"/api/freight-invoices?bookingId={booking_id}&pageSize=10").get("items") or []
    inv = next((i for i in invoices if i.get("status") != "Cancelled"), None)
    if not inv:
        inv = api.post("/api/freight-invoices", {
            "bookingId": booking_id,
            "billType": "FC",
            "invoiceDate": TODAY,
            "customerName": cust["name"],
            "gstin": cust.get("gst"),
            "placeOfSupply": "Maharashtra",
            "dueDate": (date.today() + timedelta(days=15)).isoformat(),
        })
        log(f"CREATED invoice {inv.get('invoiceNo')} taxable={inv.get('taxableAmount')} gst={inv.get('gstAmount')} total={inv.get('totalAmount')} bal={inv.get('balance')}")
    else:
        log(f"EXISTING invoice {inv.get('invoiceNo')} bal={inv.get('balance')}")

    inv_id = inv["id"]
    bal = float(inv.get("balance") or 0)
    paid = float(inv.get("amountPaid") or 0)

    # --- Customer receipt against invoice ---
    if paid > 0:
        log(f"SKIP payment — invoice already has amountPaid={paid} bal={bal}")
    elif bal > 0:
        pay_amt = min(bal, 30000)
        pay = api.post(f"/api/freight-invoices/{inv_id}/payments", {
            "amount": pay_amt,
            "paymentDate": TODAY,
            "paymentMode": "Bank",
            "referenceNo": "NEFT-SSL-DAY1-001",
            "remarks": "Partial receipt against SSL-SEED-DAY1 invoice",
        })
        log(f"PAYMENT recorded receipt={pay.get('receiptNo')} amount={pay_amt} invBal={pay.get('invoice',{}).get('balance')}")
    else:
        log("SKIP payment — invoice already settled")

    # --- Cash fuel expense ---
    expenses = api.get("/api/expenses?pageSize=50").get("items") or []
    if not any((e.get("description") or "").startswith("SSL-SEED-DAY1 fuel") for e in expenses):
        exp = api.post("/api/expenses", {
            "date": TODAY,
            "category": "Fuel",
            "description": "SSL-SEED-DAY1 fuel MH20AB4521 Aurangabad-Pune",
            "vehicle": vehicle["number"],
            "vehicleId": vehicle["id"],
            "vendor": vendor["name"],
            "vendorId": vendor["id"],
            "amount": 8500,
            "paymentMode": "Cash",
            "status": "Approved",
        })
        log(f"CREATED expense {exp.get('id')} amount={exp.get('amount')}")
    else:
        log("EXISTING fuel expense")

    # Cash office expense (no vendor -> EXPENSE_CASH)
    if not any((e.get("description") or "").startswith("SSL-SEED-DAY1 toll") for e in expenses):
        exp2 = api.post("/api/expenses", {
            "date": TODAY,
            "category": "Toll",
            "description": "SSL-SEED-DAY1 toll Ahmednagar-Pune",
            "vehicle": vehicle["number"],
            "vehicleId": vehicle["id"],
            "amount": 1240,
            "paymentMode": "Cash",
            "status": "Approved",
        })
        log(f"CREATED toll expense {exp2.get('id')}")

    # --- Accounting verification ---
    vouchers = api.get("/api/gl/vouchers?pageSize=100").get("items") or []
    log(f"VOUCHERS count={len(vouchers)}")
    unbalanced = []
    for v in vouchers:
        vid = v.get("id")
        detail = api.get(f"/api/gl/vouchers/{vid}")
        lines = detail.get("lines") or detail.get("voucherLines") or []
        dr = sum(float(x.get("debit") or 0) for x in lines)
        cr = sum(float(x.get("credit") or 0) for x in lines)
        if abs(dr - cr) > 0.01:
            unbalanced.append((detail.get("voucherNo") or vid, dr, cr))
        log(f"  voucher {detail.get('voucherNo')} type={detail.get('voucherType')} src={detail.get('sourceType')} dr={dr:.2f} cr={cr:.2f} lines={len(lines)}")

    if unbalanced:
        for u in unbalanced:
            issue(f"unbalanced voucher {u[0]} dr={u[1]} cr={u[2]}")
    else:
        log("ALL vouchers balanced")

    tb = api.get("/api/gl/reports/trial-balance")
    td = float(tb.get("totalDebit") or 0)
    tc = float(tb.get("totalCredit") or 0)
    log(f"TRIAL BALANCE source={tb.get('source')} debit={td:.2f} credit={tc:.2f}")
    if abs(td - tc) > 0.05:
        issue(f"Trial Balance mismatch debit={td} credit={tc}")

    bs = api.get("/api/gl/reports/balance-sheet")
    log(f"BALANCE SHEET keys={list(bs.keys())[:20]}")
    # common shapes
    assets = bs.get("totalAssets") or bs.get("assetsTotal") or bs.get("assets", {}).get("total") if isinstance(bs.get("assets"), dict) else None
    liabilities = bs.get("totalLiabilities") or bs.get("liabilitiesTotal")
    log(f"BS snippet: {json.dumps(bs)[:600]}")

    pl = api.get(f"/api/gl/reports/profit-loss?from=2025-04-01&to={TODAY}")
    log(f"P&L snippet: {json.dumps(pl)[:500]}")

    coa = api.get("/api/accounting/chart-of-accounts")
    log(f"COA groups={list(coa.keys()) if isinstance(coa, dict) else type(coa)}")

    # Backfill any ops docs missing GL vouchers (e.g. invoice created before advance-balance fix).
    try:
        mig = api.post("/api/gl/migration/run", {})
        log(f"MIGRATION {json.dumps(mig)[:400]}")
    except Exception as e:
        issue(f"GL migration/run failed: {e}")

    # Refresh vouchers/reports after migration and re-check balance
    vouchers = api.get("/api/gl/vouchers?pageSize=100").get("items") or []
    for v in vouchers:
        detail = api.get(f"/api/gl/vouchers/{v['id']}")
        lines = detail.get("lines") or detail.get("voucherLines") or []
        dr = sum(float(x.get("debit") or 0) for x in lines)
        cr = sum(float(x.get("credit") or 0) for x in lines)
        log(f"  voucher {detail.get('voucherNo')} src={detail.get('sourceType')} dr={dr:.2f} cr={cr:.2f} lines={len(lines)}")
        if abs(dr - cr) > 0.01:
            issue(f"unbalanced voucher {detail.get('voucherNo')} dr={dr} cr={cr}")

    src_types = {(v.get("sourceType") or "").upper() for v in vouchers}
    log(f"SOURCE TYPES after migration: {sorted(src_types)}")
    if "CUSTOMER_INVOICE" not in src_types:
        issue("No CUSTOMER_INVOICE voucher after migration backfill")
    if "CUSTOMER_RECEIPT" not in src_types:
        issue("No CUSTOMER_RECEIPT voucher after invoice payment")

    tb = api.get("/api/gl/reports/trial-balance")
    td = float(tb.get("totalDebit") or 0)
    tc = float(tb.get("totalCredit") or 0)
    log(f"TRIAL BALANCE after migration debit={td:.2f} credit={tc:.2f}")
    if abs(td - tc) > 0.05:
        issue(f"Trial Balance mismatch after migration debit={td} credit={tc}")
    pl = api.get(f"/api/gl/reports/profit-loss?from=2025-04-01&to={TODAY}")
    bs = api.get("/api/gl/reports/balance-sheet")
    log(f"P&L after migration: {json.dumps(pl)[:400]}")
    log(f"BS after migration: {json.dumps(bs)[:500]}")

    ar_row = next((r for r in (tb.get("rows") or []) if (r.get("name") or "") == "Accounts Receivable"), None)
    if ar_row:
        ar_bal = float(ar_row["balance"]) if ar_row.get("balance") is not None else (
            float(ar_row.get("debit") or 0) - float(ar_row.get("credit") or 0))
        all_inv = api.get("/api/freight-invoices?pageSize=50").get("items") or []
        open_inv_bal = sum(float(i.get("balance") or 0) for i in all_inv if i.get("status") != "Cancelled")
        log(f"AR check ledgerBal={ar_bal:.2f} openInvoiceBal={open_inv_bal:.2f}")
        if abs(ar_bal - open_inv_bal) > 1:
            issue(f"AR ledger {ar_bal:.2f} != open invoice balances {open_inv_bal:.2f}")

    pl_income = float(pl.get("income") or 0)
    if pl_income <= 0:
        issue(f"P&L income is {pl_income} — freight invoice income not reflected")

    # Ops counts
    log(f"SUMMARY bookings={len(api.get('/api/bookings?pageSize=50').get('items') or [])} "
        f"lrs={len(api.get('/api/lr?pageSize=50').get('items') or [])} "
        f"invoices={len(api.get('/api/freight-invoices?pageSize=50').get('items') or [])} "
        f"expenses={len(api.get('/api/expenses?pageSize=50').get('items') or [])} "
        f"vouchers={len(vouchers)} issues={len(ISSUES)}")

    if ISSUES:
        log("RESULT FAIL")
        for i in ISSUES:
            log(f" - {i}")
        return 2
    log("RESULT PASS")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FATAL: {e}", flush=True)
        sys.exit(1)
