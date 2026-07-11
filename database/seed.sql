-- TMS Pro — Seed Data (matches React mock data)
-- Admin user is created by the API DbSeeder on first startup (admin / admin123).

INSERT INTO customers VALUES
('C-001','Reliance Logistics','Mr. Anil Mehta','+91 98200 12345','logistics@ril.com','27AABCR1234F1Z5','Navi Mumbai, Maharashtra',125000,500000,48,125000,NOW(),NOW()),
('C-002','Tata Steel Ltd','Ms. Priya Sharma','+91 98200 23456','transport@tatasteel.com','20AABCT5678G1Z2','Jamshedpur, Jharkhand',85000,1000000,62,85000,NOW(),NOW()),
('C-003','Adani Ports','Mr. Vikram Shah','+91 98200 34567','cargo@adaniports.com','24AABCA9012H1Z8','Mundra, Gujarat',0,750000,35,0,NOW(),NOW()),
('C-004','Mahindra & Mahindra','Mr. Sunil Rao','+91 98200 45678','scm@mahindra.com','27AABCM3456I1Z3','Nashik, Maharashtra',45000,400000,28,45000,NOW(),NOW()),
('C-005','Asian Paints','Ms. Neha Gupta','+91 98200 56789','dispatch@asianpaints.com','27AABCA7890J1Z6','Mumbai, Maharashtra',32000,300000,41,32000,NOW(),NOW()),
('C-006','ITC Limited','Mr. Rahul Verma','+91 98200 67890','logistics@itc.in','19AABCI1234K1Z9','Kolkata, WB',68000,600000,52,68000,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors VALUES
('VN-001','Indian Oil Corporation','Mr. Deepak Joshi','+91 98100 11111','fuel@iocl.com','27AABCI0001A1Z5','Mumbai, Maharashtra',45000,'Fuel',124,NOW(),NOW()),
('VN-002','MRF Tyres Ltd','Ms. Kavita Nair','+91 98100 22222','sales@mrf.com','33AABCM0002B1Z3','Chennai, Tamil Nadu',28000,'Maintenance',18,NOW(),NOW()),
('VN-003','Tata Motors Service','Mr. Ravi Iyer','+91 98100 33333','service@tatamotors.com','27AABCT0003C1Z8','Pune, Maharashtra',18500,'Maintenance',32,NOW(),NOW()),
('VN-004','NHAI Toll Plaza','Toll Operations','+91 98100 44444','toll@nhai.gov.in','07AABCN0004D1Z2','Delhi NCR',12000,'Toll',256,NOW(),NOW()),
('VN-005','Office Supplies Co.','Mr. Sanjay Mehta','+91 98100 55555','orders@officesupplies.com','27AABCO0005E1Z6','Mumbai, Maharashtra',8500,'Office',45,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers VALUES
('D-001','Rajesh Kumar','MH-2020-1234567','2028-06-15','+91 98765 43210','rajesh.k@email.com','Pune, Maharashtra',25000,5000,'Active',142,4.8,NOW(),NOW()),
('D-002','Suresh Patel','GJ-2019-7654321','2027-12-20','+91 98765 43211','suresh.p@email.com','Ahmedabad, Gujarat',24000,3000,'Active',118,4.6,NOW(),NOW()),
('D-003','Amit Singh','DL-2021-3456789','2029-03-10','+91 98765 43212','amit.s@email.com','Delhi NCR',26000,8000,'Active',95,4.7,NOW(),NOW()),
('D-004','Vikram Sharma','RJ-2018-9876543','2026-11-05','+91 98765 43213','vikram.s@email.com','Jaipur, Rajasthan',23000,0,'On Leave',76,4.5,NOW(),NOW()),
('D-005','Ramesh Yadav','UP-2020-5678901','2028-08-22','+91 98765 43214','ramesh.y@email.com','Lucknow, UP',24500,2000,'Active',134,4.9,NOW(),NOW()),
('D-006','Pradeep Das','WB-2019-2345678','2027-05-18','+91 98765 43215','pradeep.d@email.com','Kolkata, WB',23500,4500,'Active',89,4.4,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles VALUES
('V-001','MH-12-AB-1234','32 FT Container','Tata Prima 4928','32 MT','Self','Active','2026-12-15','2026-09-20','2027-03-10','2026-08-05','2026-05-28',142,2850000,NOW(),NOW()),
('V-002','MH-14-CD-5678','20 FT Container','Ashok Leyland 3718','20 MT','Self','Active','2026-11-08','2026-10-12','2027-01-25','2026-07-18','2026-06-02',118,2240000,NOW(),NOW()),
('V-003','GJ-01-EF-9012','Trailer','Mahindra Blazo X 49','40 MT','Self','Active','2027-01-20','2026-11-30','2027-06-15','2026-09-10','2026-04-15',95,1980000,NOW(),NOW()),
('V-004','DL-01-GH-3456','16 FT Truck','Eicher Pro 3015','12 MT','Hired','Maintenance','2026-08-22','2026-07-05','2026-12-01','2026-06-25','2026-06-10',76,1120000,NOW(),NOW()),
('V-005','KA-05-IJ-7890','32 FT Container','Tata Signa 5530','32 MT','Self','Active','2026-10-30','2027-02-14','2027-04-08','2026-08-20','2026-05-10',134,2680000,NOW(),NOW()),
('V-006','WB-02-KL-1122','20 FT Container','BharatBenz 3723','20 MT','Self','Active','2026-09-18','2026-08-28','2027-02-20','2026-07-12','2026-03-22',89,1560000,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings VALUES
('BK-1042','2026-06-18','C-001','Reliance Logistics','Reliance Industries','Reliance Retail Pune','Mumbai','Pune','Electronics','12 MT','V-001','MH-12-AB-1234','D-001','Rajesh Kumar',28500,'Confirmed','Paid',10000,18500,NULL,NOW(),NOW()),
('BK-1041','2026-06-18','C-002','Tata Steel Ltd','Tata Steel Jamshedpur','Tata Motors Kolkata','Jamshedpur','Kolkata','Steel Coils','24 MT','V-002','MH-14-CD-5678','D-002','Suresh Patel',52000,'In Transit','Partial',20000,32000,NULL,NOW(),NOW()),
('BK-1040','2026-06-17','C-003','Adani Ports','Adani Mundra','Adani Ahmedabad','Mundra','Ahmedabad','Containers','2 Units','V-003','GJ-01-EF-9012','D-003','Amit Singh',38000,'Delivered','Paid',15000,0,NULL,NOW(),NOW()),
('BK-1039','2026-06-17','C-004','Mahindra & Mahindra','M&M Nashik','M&M Mumbai','Nashik','Mumbai','Auto Parts','8 MT','V-004','DL-01-GH-3456','D-004','Vikram Sharma',18500,'Pending','Unpaid',0,18500,NULL,NOW(),NOW()),
('BK-1038','2026-06-16','C-005','Asian Paints','Asian Paints Mumbai','Asian Paints Bangalore','Mumbai','Bangalore','Paint Drums','15 MT','V-005','KA-05-IJ-7890','D-005','Ramesh Yadav',42000,'Confirmed','Paid',20000,22000,NULL,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lorry_receipts VALUES
('LR-2026-0892','2026-06-18','BK-1042','Reliance Industries','Reliance Retail','Mumbai','Pune','V-001','MH-12-AB-1234','D-001','Rajesh Kumar','Electronics','12 MT',28500,5130,18500,'To Pay',0,0,0,0,10000,NULL,NOW(),NOW()),
('LR-2026-0891','2026-06-18','BK-1041','Tata Steel','Tata Motors','Jamshedpur','Kolkata','V-002','MH-14-CD-5678','D-002','Suresh Patel','Steel Coils','24 MT',52000,9360,32000,'To Pay',0,0,0,0,20000,NULL,NOW(),NOW()),
('LR-2026-0890','2026-06-17','BK-1040','Adani Mundra','Adani Ahmedabad','Mundra','Ahmedabad','V-003','GJ-01-EF-9012','D-003','Amit Singh','Containers','2 Units',38000,6840,0,'Paid',0,0,0,0,15000,NULL,NOW(),NOW())
ON CONFLICT (lr_number) DO NOTHING;

INSERT INTO expenses VALUES
('EXP-001','2026-06-18','Fuel','Diesel - MH-12-AB-1234','V-001','MH-12-AB-1234','VN-001','Indian Oil Corporation',12500,'Cash','Approved',NOW(),NOW()),
('EXP-002','2026-06-18','Toll','Mumbai-Pune Expressway Toll','V-001','MH-12-AB-1234','VN-004','NHAI Toll Plaza',1850,'FASTag','Approved',NOW(),NOW()),
('EXP-003','2026-06-17','Maintenance','Tyre Replacement','V-004','DL-01-GH-3456','VN-002','MRF Tyres Ltd',42000,'Bank Transfer','Approved',NOW(),NOW()),
('EXP-004','2026-06-17','Salary','June Salary - Rajesh Kumar',NULL,NULL,NULL,NULL,25000,'Bank Transfer','Approved',NOW(),NOW()),
('EXP-005','2026-06-16','Fuel','Diesel - MH-14-CD-5678','V-002','MH-14-CD-5678','VN-001','Indian Oil Corporation',9800,'Cash','Approved',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_settings (id, company_name, address, gstin, pan, financial_year, gst_rate) VALUES
(1, 'TMS Pro Logistics Pvt Ltd', 'Mumbai, Maharashtra', '27AABCT1234F1Z5', 'AABCT1234F', '2025-26', 18)
ON CONFLICT (id) DO NOTHING;
