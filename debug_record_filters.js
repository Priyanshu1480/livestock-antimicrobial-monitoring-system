const fs = require('fs');
const path = require('path');
const recordsPath = path.join(__dirname, 'backend', 'data', 'records.json');
const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
const getRecordState = (record) => {
  const raw = (record.status || record.vet_status || record.compliance_status || record.mrl_status || '').toString().trim().toLowerCase();
  if (raw === 'approved' || raw === 'safe' || raw === 'compliant' || raw === 'completed') return 'Approved';
  if (raw === 'rejected' || raw === 'not safe' || raw === 'unsafe' || raw === 'violation' || raw === 'exceeds mrl') return 'Rejected';
  if (raw === 'pending' || raw === 'not reviewed' || raw === '') return 'Pending';
  return 'Pending';
};
const isPendingRecord = (record) => getRecordState(record) === 'Pending';
const isApprovedRecord = (record) => getRecordState(record) === 'Approved';
const isRejectedRecord = (record) => getRecordState(record) === 'Rejected';
const isSafeRecord = (record) => {
  if (isPendingRecord(record)) return false;
  if (isApprovedRecord(record)) return true;
  const raw = (record.status || record.vet_status || record.compliance_status || record.mrl_status || '').toString().toLowerCase();
  return /(safe|approved|compliant|completed)/i.test(raw);
};
const total = records.length;
const safeCount = records.filter(isSafeRecord).length;
const rejectedCount = records.filter(isRejectedRecord).length;
const pendingCount = records.filter(isPendingRecord).length;
console.log(JSON.stringify({ total, safeCount, rejectedCount, pendingCount }, null, 2));
const sample = records.slice(0, 10).map(r => ({
  id: r.record_id,
  status: r.status,
  mrl_status: r.mrl_status,
  compliance_status: r.compliance_status,
  recordState: getRecordState(r),
  safe: isSafeRecord(r),
  rejected: isRejectedRecord(r),
  pending: isPendingRecord(r)
}));
console.log(JSON.stringify(sample, null, 2));
