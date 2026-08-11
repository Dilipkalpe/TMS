import { formatPrintDate } from './printUtils'

/** Build a consistent print payload from LR process + form state. */
export function buildDeliveryPrintModel({ lr, delivery, form, process }) {
  const ext = delivery?.extendedData || {}
  const outcome = form?.deliveryStatus || ext.deliveryOutcome || 'Delivered'
  return {
    deliveryNo: delivery?.sheetNumber || '—',
    tripNo: form?.tripNo || delivery?.tripNo || delivery?.dispatchNo,
    dispatchNo: delivery?.dispatchNo || delivery?.tripNo,
    transitPassNo: process?.transitPass?.passNumber,
    lrNumber: lr?.lrNumber,
    lrDate: lr?.lrDate,
    deliveryDate: form?.deliveryDate || delivery?.deliveryDate,
    deliveryTime: form?.deliveryTime || delivery?.deliveryTime,
    deliveryBranch: form?.deliveryBranch || lr?.branchName,
    deliveryLocation: delivery?.deliveryLocation || lr?.to,
    deliveryStatus: outcome,
    consignor: lr?.customerName || lr?.consignor,
    consignee: lr?.consignee,
    receiverName: form?.receiverName || delivery?.receiverName,
    receiverDesignation: form?.receiverDesignation || delivery?.receiverDesignation,
    receiverMobile: form?.receiverMobile || delivery?.receiverMobile,
    vehicle: lr?.vehicle || process?.transitPass?.vehicleNumber,
    driver: lr?.driver || process?.transitPass?.driverName,
    from: lr?.from,
    to: lr?.to,
    material: lr?.material,
    quantity: lr?.quantity,
    packagesTotal: form?.packagesTotal ?? delivery?.packagesTotal,
    packagesReceived: form?.packagesReceived ?? delivery?.packagesReceived,
    packagesDamaged: form?.packagesDamaged ?? delivery?.packagesDamaged,
    actualWeight: form?.actualWeight ?? delivery?.actualWeight,
    chargedWeight: form?.chargedWeight ?? delivery?.chargedWeight,
    shortPackages: form?.shortPackages ?? ext.shortPackages,
    shortWeight: form?.shortWeight ?? ext.shortWeight,
    shortReason: form?.shortReason ?? ext.shortReason,
    failureReason: form?.failureReason ?? ext.failureReason,
    nextAttemptDate: form?.nextAttemptDate ?? ext.nextAttemptDate,
    remarks: form?.remarks || delivery?.remarks,
    printedAt: formatPrintDate(new Date()),
  }
}

export function buildPodPrintModel({ lr, delivery, form, process, documents = [] }) {
  const ext = delivery?.extendedData || {}
  const sigs = ext.signatures || form?.signatures || {}
  const podDocs = documents.filter((d) => d.docType === 'POD' || d.docType === 'Photo' || d.docType === 'Delivery Photo')
  const verification = delivery?.podVerificationStatus
    || ext.podVerification?.status
    || (delivery?.shipmentStatus === 'POD Received' ? 'Verified' : 'Pending')

  return {
    podNo: form?.podNo || delivery?.podNo || delivery?.sheetNumber,
    deliveryNo: delivery?.sheetNumber,
    deliveryNoteNo: form?.deliveryNoteNo || delivery?.deliveryNoteNo,
    lrNumber: lr?.lrNumber,
    lrDate: lr?.lrDate,
    deliveryDate: form?.deliveryDate || delivery?.deliveryDate,
    deliveryTime: delivery?.deliveryTime,
    deliveryLocation: form?.deliveryLocation || delivery?.deliveryLocation || lr?.to,
    shipmentStatus: form?.shipmentStatus || delivery?.shipmentStatus,
    verificationStatus: verification,
    consignor: lr?.customerName || lr?.consignor,
    consignee: lr?.consignee,
    receiverName: form?.receiverName || delivery?.receiverName,
    vehicle: lr?.vehicle || process?.transitPass?.vehicleNumber,
    driver: lr?.driver || process?.transitPass?.driverName,
    from: lr?.from,
    to: lr?.to,
    packages: form?.packages ?? delivery?.packagesTotal,
    actualWeight: form?.actualWeight ?? delivery?.actualWeight,
    chargedWeight: form?.chargedWeight ?? delivery?.chargedWeight,
    condition: form?.condition || delivery?.condition,
    remarks: form?.remarks || delivery?.remarks,
    receiverSignature: sigs.receiver,
    receiverStamp: ext.receiverStamp || form?.receiverStamp,
    attachments: podDocs.map((d) => ({ title: d.title, docType: d.docType, fileUrl: d.fileUrl })),
    photoCount: documents.filter((d) => /photo|image/i.test(d.docType || d.title || '')).length,
    printedAt: formatPrintDate(new Date()),
  }
}
