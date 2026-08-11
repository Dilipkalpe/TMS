import { lrApi } from '../services/api'
import { printModuleDocument } from '../services/printService'
import { PRINT_MODULE_CODES } from '../config/printModules'

function vehicleOf(row) {
  return row?.vehicleNumber || row?.vehicle || ''
}

function routeFrom(row) {
  return row?.from || row?.fromBranch || row?.fromCity || row?.origin || ''
}

function routeTo(row) {
  return row?.to || row?.toBranch || row?.toCity || row?.destination || ''
}

/**
 * Map a grid/list row into documentData for the module's print template.
 */
export function buildDocumentDataFromGridRow(moduleCode, row, lr) {
  const baseLr = lr || {
    lrNumber: row?.lrNumber,
    lrDate: row?.lrDate || row?.loadingDate || row?.passDate || row?.dispatchDate
      || row?.deliveryDate || row?.invoiceDate,
    consignor: row?.consignor || row?.customer,
    consignee: row?.consignee,
    customerName: row?.customer,
    from: routeFrom(row),
    to: routeTo(row),
    vehicle: vehicleOf(row),
    driver: row?.driver,
    material: row?.material,
    quantity: row?.quantity || row?.packages,
    freight: row?.freight ?? row?.totalAmount,
    paymentType: row?.paymentType,
  }

  switch (moduleCode) {
    case PRINT_MODULE_CODES.LOADING_SLIP:
      return {
        lr: baseLr,
        slip: {
          sheetNumber: row.sheetNumber || row.slipNo,
          slipNo: row.sheetNumber || row.slipNo,
          loadingDate: row.loadingDate,
          lrNumber: row.lrNumber,
          vehicle: vehicleOf(row),
          driver: row.driver,
          fromCity: routeFrom(row),
          toCity: routeTo(row),
          tripNo: row.tripNo,
          totalPackages: row.totalPackages ?? row.lrCount,
          totalWeight: row.totalWeight,
          status: row.loadingStatus || row.status,
          loaderName: row.loaderName || row.loader,
          supervisorName: row.supervisorName || row.supervisor,
        },
      }
    case PRINT_MODULE_CODES.TRANSIT_PASS:
      return {
        lr: baseLr,
        pass: {
          passNumber: row.passNumber,
          issueDate: row.passDate || row.issueDate,
          vehicleNumber: vehicleOf(row),
          driverName: row.driver,
          routeFrom: routeFrom(row),
          routeTo: routeTo(row),
          tripNo: row.tripNo,
          status: row.status,
        },
      }
    case PRINT_MODULE_CODES.DISPATCH:
      return {
        lr: baseLr,
        dispatch: {
          dispatchNo: row.dispatchNo || row.transitPassNo,
          dispatchDate: row.dispatchDate,
          vehicleNumber: vehicleOf(row),
          driverName: row.driver,
          transitPassNo: row.transitPassNo,
          status: row.status,
          startKm: row.startKm,
          fuelLitres: row.fuelLitres,
          gateOfficer: row.gateOfficer,
        },
      }
    case PRINT_MODULE_CODES.IN_TRANSIT:
      return {
        lr: baseLr,
        transit: {
          tripNo: row.tripNo || row.dispatchNo,
          lrNumber: row.lrNumber,
          status: row.status || 'In Transit',
          lastLocation: row.lastLocation || routeFrom(row),
          updatedAt: row.dispatchTime || row.updatedAt,
          vehicleNumber: vehicleOf(row),
          driverName: row.driver,
        },
      }
    case PRINT_MODULE_CODES.DELIVERY_COMPLETE:
      return {
        lr: baseLr,
        delivery: {
          deliveryNo: row.deliveryNo || row.podRefNo,
          lrNumber: row.lrNumber,
          dispatchNo: row.dispatchNo,
          tripNo: row.tripNo,
          deliveryDate: row.deliveryDate,
          consignor: baseLr.consignor,
          consignee: row.consignee || baseLr.consignee,
          from: routeFrom(row),
          to: routeTo(row),
          vehicle: vehicleOf(row),
          driver: row.driver,
          packagesReceived: row.packagesReceived ?? row.packages,
          packagesDamaged: row.packagesDamaged ?? 0,
          deliveryStatus: row.deliveryStatus || 'Delivered',
          receiverName: row.receiverName,
          podStatus: row.podStatus,
        },
      }
    case PRINT_MODULE_CODES.POD:
      return {
        lr: baseLr,
        pod: {
          podNo: row.podNo || row.podRefNo,
          deliveryNo: row.deliveryNo,
          lrNumber: row.lrNumber,
          deliveryDate: row.deliveryDate,
          consignor: baseLr.consignor,
          consignee: row.consignee || baseLr.consignee,
          from: routeFrom(row),
          to: routeTo(row),
          vehicle: vehicleOf(row),
          receiverName: row.receiverName || row.receivedBy,
          receiverMobile: row.receiverMobile,
          verificationStatus: row.verificationStatus,
          podStatus: row.podStatus,
          remarks: row.remarks,
        },
      }
    case PRINT_MODULE_CODES.BILLING:
      return {
        lr: baseLr,
        bill: {
          billNo: row.invoiceNo || row.billNo,
          billType: row.billType || 'FC',
          billDate: row.invoiceDate || row.billDate,
          bookingId: row.bookingId,
          customerName: row.customer || row.customerName,
          gstin: row.gstin,
          placeOfSupply: row.placeOfSupply,
          taxableAmount: row.freight ?? row.taxableAmount,
          gstAmount: row.gst ?? row.gstAmount,
          totalAmount: row.totalAmount,
          grossTotal: row.totalAmount,
          netPayable: row.outstanding ?? row.netPayable ?? row.totalAmount,
          advance: row.receivedAmount ?? row.advance,
          lines: row.lines,
        },
      }
    case PRINT_MODULE_CODES.LR_LIST:
    default:
      return { lr: baseLr }
  }
}

/**
 * Print a single grid row using the user's configured document template for the module.
 */
export async function printGridRowDocument({
  moduleCode,
  row,
  company,
  print,
  toast,
}) {
  if (!row) {
    toast?.({ title: 'Nothing to print', message: 'Select a record first.', type: 'warning' })
    return false
  }

  try {
    let lr = null
    if (row.lrNumber) {
      try {
        lr = await lrApi.get(row.lrNumber)
      } catch {
        /* use mapped row fields */
      }
    }

    await printModuleDocument({
      moduleCode,
      company,
      print,
      documentData: buildDocumentDataFromGridRow(moduleCode, row, lr),
    })
    return true
  } catch (err) {
    toast?.({ title: 'Print failed', message: err.message, type: 'error' })
    return false
  }
}
