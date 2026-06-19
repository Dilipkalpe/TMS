export const vehicles = [
  { id: 'V-001', number: 'MH-12-AB-1234', type: '32 FT Container', model: 'Tata Prima 4928', capacity: '32 MT', owner: 'Self', status: 'Active', insurance: '2026-12-15', fitness: '2026-09-20', permit: '2027-03-10', puc: '2026-08-05', lastMaintenance: '2026-05-28', trips: 142, revenue: 2850000 },
  { id: 'V-002', number: 'MH-14-CD-5678', type: '20 FT Container', model: 'Ashok Leyland 3718', capacity: '20 MT', owner: 'Self', status: 'Active', insurance: '2026-11-08', fitness: '2026-10-12', permit: '2027-01-25', puc: '2026-07-18', lastMaintenance: '2026-06-02', trips: 118, revenue: 2240000 },
  { id: 'V-003', number: 'GJ-01-EF-9012', type: 'Trailer', model: 'Mahindra Blazo X 49', capacity: '40 MT', owner: 'Self', status: 'Active', insurance: '2027-01-20', fitness: '2026-11-30', permit: '2027-06-15', puc: '2026-09-10', lastMaintenance: '2026-04-15', trips: 95, revenue: 1980000 },
  { id: 'V-004', number: 'DL-01-GH-3456', type: '16 FT Truck', model: 'Eicher Pro 3015', capacity: '12 MT', owner: 'Hired', status: 'Maintenance', insurance: '2026-08-22', fitness: '2026-07-05', permit: '2026-12-01', puc: '2026-06-25', lastMaintenance: '2026-06-10', trips: 76, revenue: 1120000 },
  { id: 'V-005', number: 'KA-05-IJ-7890', type: '32 FT Container', model: 'Tata Signa 5530', capacity: '32 MT', owner: 'Self', status: 'Active', insurance: '2026-10-30', fitness: '2027-02-14', permit: '2027-04-08', puc: '2026-08-20', lastMaintenance: '2026-05-10', trips: 134, revenue: 2680000 },
  { id: 'V-006', number: 'WB-02-KL-1122', type: '20 FT Container', model: 'BharatBenz 3723', capacity: '20 MT', owner: 'Self', status: 'Active', insurance: '2026-09-18', fitness: '2026-08-28', permit: '2027-02-20', puc: '2026-07-12', lastMaintenance: '2026-03-22', trips: 89, revenue: 1560000 },
]

export const maintenanceRecords = [
  { vehicle: 'MH-12-AB-1234', date: '2026-05-28', type: 'Engine Service', cost: 18500, vendor: 'Tata Motors Service', remarks: 'Oil change, filter replacement' },
  { vehicle: 'DL-01-GH-3456', date: '2026-06-10', type: 'Tyre Replacement', cost: 42000, vendor: 'MRF Tyres', remarks: '4 tyres replaced' },
  { vehicle: 'MH-14-CD-5678', date: '2026-06-02', type: 'Brake Service', cost: 8500, vendor: 'Ashok Leyland Service', remarks: 'Brake pads replaced' },
]
