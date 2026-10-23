import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export interface FullExportData {
  profile: any;
  categories: any[];
  tags: any[];
  memories: any[];
  diary_entries: any[];
  important_dates: any[];
  reminders: any[];
  future_letters: any[];
  media_assets: any[];
  exported_at: string;
  version: string;
}

/**
 * Trigger download of JSON file
 */
export function downloadJsonExport(data: FullExportData) {
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const fileName = `xotiralarim_zaxira_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  saveAs(blob, fileName);
}

/**
 * Trigger download of CSV file for memories
 */
export function downloadMemoriesCsv(memories: any[]) {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `xotiralar_${dateStr}.csv`;

  const headers = ['ID', 'Sarlavha', 'Voqea Sanasi', 'Vaqt', 'Joy', 'Kayfiyat', 'Matn', 'Sevimlilar', 'Arxiv'];
  const rows = memories.map((m) => [
    m.id,
    `"${(m.title || '').replace(/"/g, '""')}"`,
    m.event_date,
    m.event_time || '',
    `"${(m.location_name || '').replace(/"/g, '""')}"`,
    m.mood || '',
    `"${(m.body || '').replace(/"/g, '""')}"`,
    m.is_favorite ? 'Ha' : 'Yo‘q',
    m.is_archived ? 'Ha' : 'Yo‘q',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
}

/**
 * Trigger download of CSV file for important dates
 */
export function downloadDatesCsv(dates: any[]) {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `muhim_sanalar_${dateStr}.csv`;

  const headers = ['ID', 'Nomi', 'Turi', 'Sana', 'Har yili takrorlanadi', 'Izoh', 'Eslatma'];
  const rows = dates.map((d) => [
    d.id,
    `"${(d.title || '').replace(/"/g, '""')}"`,
    d.date_type,
    d.event_date,
    d.repeat_yearly ? 'Ha' : 'Yo‘q',
    `"${(d.description || '').replace(/"/g, '""')}"`,
    d.reminder_enabled ? 'Ha' : 'Yo‘q',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
}

/**
 * Trigger download of complete ZIP package containing JSON + CSVs + Readme
 */
export async function downloadZipBackup(data: FullExportData) {
  const zip = new JSZip();
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');

  // Add JSON dump
  zip.file('xotiralarim_malumotlar.json', JSON.stringify(data, null, 2));

  // Add Memories CSV
  const memHeaders = ['ID', 'Sarlavha', 'Voqea Sanasi', 'Vaqt', 'Joy', 'Kayfiyat', 'Matn', 'Sevimlilar', 'Arxiv'];
  const memRows = data.memories.map((m) => [
    m.id,
    `"${(m.title || '').replace(/"/g, '""')}"`,
    m.event_date,
    m.event_time || '',
    `"${(m.location_name || '').replace(/"/g, '""')}"`,
    m.mood || '',
    `"${(m.body || '').replace(/"/g, '""')}"`,
    m.is_favorite ? 'Ha' : 'Yo‘q',
    m.is_archived ? 'Ha' : 'Yo‘q',
  ]);
  zip.file('xotiralar.csv', '\uFEFF' + [memHeaders.join(','), ...memRows.map((r) => r.join(','))].join('\r\n'));

  // Add Important dates CSV
  const dateHeaders = ['ID', 'Nomi', 'Turi', 'Sana', 'Har yili takrorlanadi', 'Izoh'];
  const dateRows = data.important_dates.map((d) => [
    d.id,
    `"${(d.title || '').replace(/"/g, '""')}"`,
    d.date_type,
    d.event_date,
    d.repeat_yearly ? 'Ha' : 'Yo‘q',
    `"${(d.description || '').replace(/"/g, '""')}"`,
  ]);
  zip.file('muhim_sanalar.csv', '\uFEFF' + [dateHeaders.join(','), ...dateRows.map((r) => r.join(','))].join('\r\n'));

  // Add Diary CSV
  const diaryHeaders = ['ID', 'Sarlavha', 'Sana', 'Kayfiyat', 'Matn'];
  const diaryRows = data.diary_entries.map((e) => [
    e.id,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    e.entry_date,
    e.mood || '',
    `"${(e.body || '').replace(/"/g, '""')}"`,
  ]);
  zip.file('kundalik_yozuvlari.csv', '\uFEFF' + [diaryHeaders.join(','), ...diaryRows.map((r) => r.join(','))].join('\r\n'));

  // Add Readme info
  zip.file(
    'README.txt',
    `XOTIRALARIM ARXIV ZAXIRA NUSXASI\nEksport vaqti: ${data.exported_at}\nJami xotiralar: ${data.memories.length}\nJami kundalik yozuvlari: ${data.diary_entries.length}\nJami muhim sanalar: ${data.important_dates.length}\nJami kelajak xatlari: ${data.future_letters.length}\nJami media fayllar metadatalari: ${data.media_assets.length}\n`
  );

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `xotiralarim_arxiv_${dateStr}.zip`);
}
