import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FS      from 'expo-file-system/legacy';
import { AttendanceRecord, LectureSession } from './types';


export type ExportFormat = 'csv' | 'pdf';

export async function exportSessionReport(
    format:  ExportFormat,
    records: AttendanceRecord[],
    session: LectureSession,
): Promise<void> {
    if (format === 'csv') {
        await exportAsCSV(records, session);
    } else {
        await exportAsPDF(records, session);
    }
}

function buildCSV(records: AttendanceRecord[], session: LectureSession): string {
    const stats = computeStats(records, session.totalStudents);

    const header = [
        `# Attendance Report — ${session.courseName} (${session.courseCode})`,
        `# Date: ${formatDate(session.startTime)}  |  Room: ${session.room || '—'}`,
        `# Present: ${stats.present}  Absent: ${stats.absent}  Late: ${stats.late}  Total: ${session.totalStudents}  Rate: ${stats.rate}%`,
        '',
        'No,Student Name,Student ID,Status,Time',
    ].join('\n');

    const rows = [...records]
        .sort((a, b) => a.studentName.localeCompare(b.studentName))
        .map((r, i) =>
            `${i + 1},${escapeCsv(r.studentName)},${r.studentId},${r.status},${formatTime(r.timestamp)}`
        );

    return [header, ...rows].join('\n');
}

async function exportAsCSV(records: AttendanceRecord[], session: LectureSession): Promise<void> {
    const csv      = buildCSV(records, session);
    const filename = safeFilename(`attendance_${session.courseCode}_${dateSlug(session.startTime)}.csv`);
    const uri      = FS.cacheDirectory + filename;

    await FS.writeAsStringAsync(uri, csv, { encoding: FS.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export Attendance CSV' });
    } else {
        throw new Error('Sharing is not available on this device');
    }
}

function buildHTML(records: AttendanceRecord[], session: LectureSession): string {
    const stats    = computeStats(records, session.totalStudents);
    const sorted   = [...records].sort((a, b) => a.studentName.localeCompare(b.studentName));

    const statusColor = (s: string) =>
        s === 'present' ? '#10B981' : s === 'late' ? '#F59E0B' : '#EF4444';

    const rows = sorted.map((r, i) => `
        <tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${r.studentName}</td>
            <td style="color:#6B7280;font-size:11px">${r.studentId}</td>
            <td style="text-align:center">
                <span style="
                    background:${statusColor(r.status)}22;
                    color:${statusColor(r.status)};
                    padding:3px 10px; border-radius:12px;
                    font-weight:700; font-size:12px;
                ">${r.status.toUpperCase()}</span>
            </td>
            <td style="text-align:center;color:#6B7280">${formatTime(r.timestamp)}</td>
            ${r.selfieUrl
                ? `<td style="text-align:center"><img src="${r.selfieUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/></td>`
                : '<td style="text-align:center;color:#9CA3AF">—</td>'
            }
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html dir="ltr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; padding: 32px; color: #1F2937; }
  .header { border-bottom: 3px solid #10B981; padding-bottom: 16px; margin-bottom: 24px; }
  .title  { font-size: 22px; font-weight: 800; color: #10B981; }
  .meta   { font-size: 13px; color: #6B7280; margin-top: 4px; }
  .stats  { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat   { flex: 1; text-align: center; padding: 12px; border-radius: 10px; }
  .stat .val  { font-size: 28px; font-weight: 800; }
  .stat .lbl  { font-size: 11px; margin-top: 2px; }
  table   { width: 100%; border-collapse: collapse; font-size: 13px; }
  th      { background: #F9FAFB; padding: 10px 12px; text-align: left; font-weight: 700; color: #374151; border-bottom: 2px solid #E5E7EB; }
  td      { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .footer { margin-top: 24px; font-size: 11px; color: #9CA3AF; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">📋 Attendance Report</div>
    <div class="meta">${session.courseName} — ${session.courseCode}</div>
    <div class="meta">Date: ${formatDate(session.startTime)} &nbsp;|&nbsp; Room: ${session.room || '—'} &nbsp;|&nbsp; Professor: ${(session as any).professorName || '—'}</div>
  </div>

  <div class="stats">
    <div class="stat" style="background:#10B98115">
      <div class="val" style="color:#10B981">${stats.present}</div>
      <div class="lbl" style="color:#10B981">Present</div>
    </div>
    <div class="stat" style="background:#F59E0B15">
      <div class="val" style="color:#F59E0B">${stats.late}</div>
      <div class="lbl" style="color:#F59E0B">Late</div>
    </div>
    <div class="stat" style="background:#EF444415">
      <div class="val" style="color:#EF4444">${stats.absent}</div>
      <div class="lbl" style="color:#EF4444">Absent</div>
    </div>
    <div class="stat" style="background:#3B82F615">
      <div class="val" style="color:#3B82F6">${stats.rate}%</div>
      <div class="lbl" style="color:#3B82F6">Attendance Rate</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student Name</th>
        <th>Student ID</th>
        <th style="text-align:center">Status</th>
        <th style="text-align:center">Time</th>
        <th style="text-align:center">Selfie</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    Generated by GeoTrack &nbsp;·&nbsp; ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
}

async function exportAsPDF(records: AttendanceRecord[], session: LectureSession): Promise<void> {
    const html     = buildHTML(records, session);
    const { uri }  = await Print.printToFileAsync({ html, base64: false });
    const filename = safeFilename(`attendance_${session.courseCode}_${dateSlug(session.startTime)}.pdf`);
    const dest     = FS.cacheDirectory + filename;

    await FS.moveAsync({ from: uri, to: dest });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Export Attendance PDF' });
    } else {
        throw new Error('Sharing is not available on this device');
    }
}

function computeStats(records: AttendanceRecord[], total: number) {
    const present = records.filter(r => r.status === 'present').length;
    const late    = records.filter(r => r.status === 'late').length;
    const absent  = Math.max(0, total - present - late);
    const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, rate };
}

function formatDate(d: Date | any): string {
    try {
        const date = d?.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
}

function formatTime(d: Date | any): string {
    try {
        const date = d?.toDate ? d.toDate() : new Date(d);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
}

function dateSlug(d: Date | any): string {
    try {
        const date = d?.toDate ? d.toDate() : new Date(d);
        return date.toISOString().slice(0, 10);
    } catch { return 'unknown'; }
}

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function safeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

declare module './types' {
    interface AttendanceRecord {
        selfieUrl?: string;
    }
}
