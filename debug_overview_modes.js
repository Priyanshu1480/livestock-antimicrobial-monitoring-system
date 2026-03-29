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
const modes = ['all', 'safe', 'unsafe', 'pending'];
const result = {};
for (const mode of modes) {
  const filtered = records.filter((r) => {
    if (mode === 'safe') return isSafeRecord(r);
    if (mode === 'unsafe') return isRejectedRecord(r);
    if (mode === 'pending') return isPendingRecord(r);
    return true;
  });
  result[mode] = filtered.length;
}
console.log(result);
