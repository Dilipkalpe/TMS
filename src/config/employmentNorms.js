/** Default statutory norms when employment type changes */
export const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Daily']

export const EMPLOYMENT_NORMS = {
  Permanent: {
    pfApplicable: true,
    esiApplicable: true,
    insuranceApplicable: true,
    insuranceAmount: 500,
    hint: 'Full monthly salary · PF 12% · ESI 0.75% (if gross ≤ ceiling) · Insurance · Professional Tax',
  },
  Contract: {
    pfApplicable: false,
    esiApplicable: false,
    insuranceApplicable: true,
    insuranceAmount: 300,
    hint: 'Fixed contract pay · 50% HRA/DA · Insurance · PT if gross ≥ ₹15,000 · PF only if enabled in settings',
  },
  Daily: {
    pfApplicable: false,
    esiApplicable: false,
    insuranceApplicable: true,
    insuranceAmount: 0,
    hint: 'Daily wage × days present · Insurance per day worked · No PF/ESI by default',
  },
}

export function applyEmploymentNorms(employmentType) {
  return EMPLOYMENT_NORMS[employmentType] ?? EMPLOYMENT_NORMS.Permanent
}

export function employeeTotalPay(form) {
  if (form.employmentType === 'Daily') return Number(form.dailyWage || 0)
  return Number(form.basicSalary || 0) + Number(form.hra || 0) + Number(form.da || 0)
    + Number(form.conveyance || 0) + Number(form.otherAllowance || 0)
}
