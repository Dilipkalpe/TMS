/** Sample LR operational workflow entries — one object per stage (for tests & docs). */

export const SAMPLE_LR_NUMBER = 'TC/PN/2026-27/LR/00001'

const baseLr = {
  lrNumber: SAMPLE_LR_NUMBER,
  from: 'Mumbai',
  to: 'Pune',
  consignor: 'ABC Logistics',
  consignee: 'XYZ Traders',
  vehicle: 'MH12AB1234',
  driver: 'Ramesh Kumar',
  quantity: '10 Pkgs / 500 Kg',
}

export const workflowStageSamples = {
  lrCreated: {
    lr: { ...baseLr, status: 'LR Created' },
    process: {},
    expectedStep: 'lr',
  },
  loadingCompleted: {
    lr: { ...baseLr, status: 'Loading Completed' },
    process: {
      loadingSheet: {
        sheetNumber: 'TC/PN/2026-27/LS/00001',
        loadingStatus: 'Completed',
        loadingLocation: 'Mumbai Warehouse',
      },
    },
    expectedStep: 'transit',
  },
  transitPassGenerated: {
    lr: { ...baseLr, status: 'Transit Pass Generated' },
    process: {
      loadingSheet: { sheetNumber: 'TC/PN/2026-27/LS/00001', loadingStatus: 'Completed' },
      transitPass: {
        passNumber: 'TC/PN/2026-27/TP/00001',
        extendedData: { passStatus: 'Ready for Dispatch' },
      },
    },
    expectedStep: 'dispatch',
  },
  inTransit: {
    lr: { ...baseLr, status: 'In Transit' },
    process: {
      transitPass: { passNumber: 'TC/PN/2026-27/TP/00001', extendedData: { passStatus: 'Dispatched' } },
      deliverySheet: {
        shipmentStatus: 'In Transit',
        tripNo: 'TC/PN/2026-27/TRP/00001',
        dispatchNo: 'TC/PN/2026-27/TRP/00001',
        inTransitStatus: 'In Transit',
        extendedData: {
          dispatch: { dispatchNo: 'TC/PN/2026-27/TRP/00001', startingKm: 1200 },
          checkpoints: [
            { id: 'cp1', location: 'Lonavala', date: '2026-08-08', status: 'Passed' },
          ],
        },
      },
    },
    expectedStep: 'in-transit',
  },
  deliveryCompleted: {
    lr: { ...baseLr, status: 'Delivery Completed' },
    process: {
      deliverySheet: {
        shipmentStatus: 'Delivered',
        deliveryDate: '2026-08-08',
        packagesTotal: 10,
        packagesReceived: 10,
        extendedData: { deliveryOutcome: 'Delivered' },
      },
    },
    expectedStep: 'pod',
  },
  podUploaded: {
    lr: { ...baseLr, status: 'POD Uploaded' },
    process: {
      deliverySheet: {
        shipmentStatus: 'POD Received',
        podVerificationStatus: 'Verified',
        extendedData: { podVerification: { status: 'Verified' } },
      },
    },
    expectedStep: 'pod',
  },
}

/** Ordered steps for end-to-end flow assertions */
export const WORKFLOW_STAGE_ORDER = [
  'lrCreated',
  'loadingCompleted',
  'transitPassGenerated',
  'inTransit',
  'deliveryCompleted',
  'podUploaded',
]
