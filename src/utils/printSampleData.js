/** Realistic sample rows for optional list print by module. */
export function getSampleListRows(moduleCode) {
  const base = {
    lrNumber: 'LR-2026-004521',
    lrDate: '2026-08-10',
    customer: 'ABC Logistics Pvt Ltd',
    consignor: 'Shree Traders, Mumbai',
    consignee: 'Global Retail, Pune',
    from: 'Mumbai',
    to: 'Pune',
    vehicle: 'MH12AB1234',
    driver: 'Ramesh Patil',
    packages: 24,
    weight: 1250,
    freight: 18500,
    status: 'In Transit',
  }

  const rows = [base, {
    ...base,
    lrNumber: 'LR-2026-004522',
    consignee: 'Metro Stores, Nashik',
    to: 'Nashik',
    vehicle: 'MH14CD5678',
    packages: 12,
    weight: 680,
    freight: 9200,
    status: 'Delivered',
  }]

  switch (moduleCode) {
    case 'LOADING_SLIP':
      return rows.map((r) => ({
        sheetNumber: 'LS-2026-0891',
        loadingDate: r.lrDate,
        lrNumber: r.lrNumber,
        vehicle: r.vehicle,
        driver: r.driver,
        fromCity: r.from,
        toCity: r.to,
        totalPackages: r.packages,
        totalWeight: r.weight,
        status: 'Loaded',
      }))
    case 'TRANSIT_PASS':
      return rows.map((r) => ({
        passNumber: 'TP-2026-1204',
        passDate: r.lrDate,
        lrNumber: r.lrNumber,
        tripNo: 'TRP-8891',
        vehicle: r.vehicle,
        driver: r.driver,
        fromBranch: r.from,
        toBranch: r.to,
        status: 'Active',
      }))
    case 'DISPATCH':
      return rows.map((r) => ({
        dispatchNo: 'DSP-2026-0456',
        transitPassNo: 'TP-2026-1204',
        lrNumber: r.lrNumber,
        vehicle: r.vehicle,
        driver: r.driver,
        status: 'Pending',
      }))
    case 'IN_TRANSIT':
      return rows.map((r) => ({
        tripNo: 'TRP-8891',
        lrNumber: r.lrNumber,
        vehicle: r.vehicle,
        driver: r.driver,
        dispatchTime: `${r.lrDate} 14:30`,
        status: 'In Transit',
      }))
    case 'DELIVERY_COMPLETE':
      return rows.map((r) => ({
        lrNumber: r.lrNumber,
        tripNo: 'TRP-8891',
        customer: r.customer,
        deliveryDate: r.lrDate,
        vehicle: r.vehicle,
        podStatus: 'Received',
        status: 'Delivered',
      }))
    case 'POD':
      return rows.map((r) => ({
        lrNumber: r.lrNumber,
        tripNo: 'TRP-8891',
        customer: r.customer,
        deliveryDate: r.lrDate,
        receiverName: 'Store Manager',
        podStatus: 'Verified',
        verificationStatus: 'Verified',
      }))
    case 'BILLING':
      return rows.map((r) => ({
        invoiceNo: 'INV-2026-7781',
        invoiceDate: r.lrDate,
        lrNumber: r.lrNumber,
        customer: r.customer,
        taxableAmount: 15678,
        gstAmount: 2822,
        grandTotal: 18500,
        paymentStatus: 'Unpaid',
        outstanding: 18500,
      }))
    default:
      return rows.map((r) => ({
        lrNumber: r.lrNumber,
        lrDate: r.lrDate,
        customer: r.customer,
        consignee: r.consignee,
        route: `${r.from} to ${r.to}`,
        packages: r.packages,
        weight: r.weight,
        freight: r.freight,
        vehicle: r.vehicle,
        deliveryStatus: r.status,
        billingStatus: 'Pending',
        podStatus: 'Pending',
        amount: r.freight,
      }))
  }
}

export function getSampleListColumns(moduleCode) {
  const rows = getSampleListRows(moduleCode)
  if (!rows.length) return []
  return Object.keys(rows[0]).map((key) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
  }))
}

/** Sample single LR / consignment note (standard transport document). */
export function getSampleLrDocument() {
  return {
    lrNumber: 'LR-2026-004521',
    lrDate: '2026-08-10',
    consignor: 'Shree Traders, Mumbai',
    consignee: 'Global Retail, Pune',
    from: 'Mumbai',
    to: 'Pune',
    vehicle: 'MH12AB1234',
    driver: 'Ramesh Patil',
    material: 'Electronics — Cartons',
    quantity: '24 Pkgs / 1250 Kg',
    freight: 18500,
    gst: 0,
    hamali: 500,
    loadingCharges: 200,
    unloadingCharges: 300,
    insurance: 0,
    advance: 5000,
    balance: 13500,
    paymentType: 'To Pay',
  }
}

/**
 * Sample payload for individual document preview / print by module.
 * Used by Print Template settings (not list tables).
 */
export function getSampleDocumentData(moduleCode) {
  const lr = getSampleLrDocument()

  switch (moduleCode) {
    case 'LOADING_SLIP':
      return {
        lr,
        slip: {
          sheetNumber: 'LS-2026-0891',
          slipNo: 'LS-2026-0891',
          loadingDate: lr.lrDate,
          lrNumber: lr.lrNumber,
          vehicle: lr.vehicle,
          driver: lr.driver,
          fromCity: lr.from,
          toCity: lr.to,
          totalPackages: 24,
          totalWeight: 1250,
          loaderName: 'Suresh More',
          supervisorName: 'Anil Deshmukh',
        },
      }
    case 'TRANSIT_PASS':
      return {
        lr,
        pass: {
          passNumber: 'TP-2026-1204',
          issueDate: lr.lrDate,
          vehicleNumber: lr.vehicle,
          driverName: lr.driver,
          routeFrom: lr.from,
          routeTo: lr.to,
          tripNo: 'TRP-8891',
        },
        loadingItems: [
          { lrNumber: lr.lrNumber, packages: 24, weight: 1250, material: lr.material },
        ],
      }
    case 'DISPATCH':
      return {
        lr,
        dispatch: {
          dispatchNo: 'DSP-2026-0456',
          dispatchDate: lr.lrDate,
          vehicleNumber: lr.vehicle,
          driverName: lr.driver,
          startKm: 45210,
          fuelLitres: 40,
          gateOfficer: 'Gate-2 / Patil',
        },
      }
    case 'IN_TRANSIT':
      return {
        lr,
        transit: {
          tripNo: 'TRP-8891',
          lrNumber: lr.lrNumber,
          status: 'In Transit',
          lastLocation: 'Lonavala Toll',
          updatedAt: `${lr.lrDate} 16:45`,
        },
      }
    case 'DELIVERY_COMPLETE':
      return {
        lr,
        delivery: {
          deliveryNo: 'DLV-2026-3310',
          lrNumber: lr.lrNumber,
          dispatchNo: 'DSP-2026-0456',
          tripNo: 'TRP-8891',
          deliveryDate: lr.lrDate,
          consignor: lr.consignor,
          consignee: lr.consignee,
          from: lr.from,
          to: lr.to,
          vehicle: lr.vehicle,
          driver: lr.driver,
          packagesReceived: 24,
          packagesDamaged: 0,
          deliveryStatus: 'Delivered',
          receiverName: 'Store Manager',
        },
      }
    case 'POD':
      return {
        lr,
        pod: {
          podNo: 'POD-2026-2201',
          deliveryNo: 'DLV-2026-3310',
          lrNumber: lr.lrNumber,
          deliveryDate: lr.lrDate,
          consignor: lr.consignor,
          consignee: lr.consignee,
          from: lr.from,
          to: lr.to,
          vehicle: lr.vehicle,
          receiverName: 'Store Manager',
          receiverMobile: '9876543210',
          verificationStatus: 'Verified',
          remarks: 'All packages received in good condition.',
        },
      }
    case 'BILLING':
      return {
        lr,
        bill: {
          billNo: 'INV-2026-7781',
          billType: 'FC',
          billDate: lr.lrDate,
          bookingId: 'BK-2026-1102',
          customerName: 'ABC Logistics Pvt Ltd',
          gstin: '27AABCU9603R1ZM',
          placeOfSupply: 'Maharashtra',
          taxableAmount: 15678,
          gstAmount: 2822,
          totalAmount: 18500,
          grossTotal: 18500,
          netPayable: 13500,
          advance: 5000,
          lines: [
            {
              description: `Transport freight ${lr.from} → ${lr.to} (LR ${lr.lrNumber})`,
              amount: 15678,
            },
          ],
        },
      }
    default:
      // LR_LIST and unknown → consignment note
      return { lr }
  }
}
