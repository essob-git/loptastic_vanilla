/**
 * LopTastic - Projektmanagement Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Diese Datei ist Teil von LopTastic.
 * 
 * Lizenz: MIT (https://opensource.org/licenses/MIT)
 * 
 * Hinweis:
 * - Nutzung, Veränderung und Weitergabe sind unter Beachtung der Lizenz erlaubt.
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

// exportExcelManager.js
// Excel-Export analog zum PDF-Bericht, mit EINEM Tabellenkopf oben,
// hierarchischen Überschriften (H1/H2/H3) als Vollbreiten-Zeilen (A..G, Merge),
// und allen p-Einträgen darunter.
//
// Abhängigkeiten: globales XLSX (SheetJS), app.js (StateManager, formatDate), uiManager.js (UIManager)

import { StateManager } from './stateManager.js';
import { formatDate } from './utils.js'
import { UIManager } from './uiManager.js';

const TABLE_HEADER = ['ID', 'Date', 'Topic / Desc', 'Zuständigkeit', 'Frist', 'Typ', 'Status'];
const COLS = 7; // A..G

function clean(v) {
  if (v == null) return '';
  return String(v).replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ').trim();
}

function topicWithDesc(topic, desc) {
  const t = clean(topic);
  const d = clean(desc);
  if (t && d) return `${t}\n${d}`;
  return t || d || '';
}

function typeLabel(t) {
  switch ((t || '').toLowerCase()) {
    case 'h1': return 'H1';
    case 'h2': return 'H2';
    case 'h3': return 'H3';
    case 'p':  return 'Punkt';
    default:   return clean(t || '');
  }
}

/** Projektkopf (mehrere Zeilen) + Merges über A..G */
function buildProjectHeaderRows(project, list) {
  const manifest = project?.manifest || {};
  const proj = manifest.project || {};

  const listName    = clean(list?.name || 'Liste');
  const projectName = clean(proj?.name || 'Projekt');
  const ips         = clean(proj?.ips || proj?.ipsNumber || manifest?.ips || '');
  const lead        = clean(proj?.lead || proj?.manager || manifest?.projectLead || '');

  const exportDate = formatDate ? formatDate(new Date()) : new Date().toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const headerLines = [
    `Liste: ${listName}`,
    ips ? `Projekt: ${projectName} (IPS-Nr.: ${ips})` : `Projekt: ${projectName}`,
    lead ? `Projektleitung: ${lead}` : '',
    `Export vom ${exportDate}`
  ].filter(Boolean);

  const rows = [];
  const merges = [];
  for (const line of headerLines) {
    const rIndex = rows.length;
    const r = new Array(COLS).fill('');
    r[0] = line;
    rows.push(r);
    merges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: COLS - 1 } });
  }

  // Leerzeile nach dem Kopf
  rows.push(new Array(COLS).fill(''));

  return { headerRows: rows, headerMerges: merges };
}

/**
 * Baut Datenbereich:
 * - Einmalig Tabellenkopf ganz am Anfang (nach Projektkopf).
 * - Für H1/H2/H3: Merge-Zeile über A..G mit "<report_id> <Typ> <Titel>".
 * - Für p: normale Datenzeilen.
 */

// Hilfen
const normType = (t) => String(t ?? '').replace(/\u00A0/g, ' ').trim().toLowerCase();
const sortVal  = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

/**
 * Rekursiver Body-Aufbau:
 * - EIN Tabellenkopf (oben).
 * - H1/H2/H3: Vollbreite-Zeilen (A..G, Merge).
 * - p: Datensätze.
 * Reihenfolge: sortierte DFS über children.
 */
function buildBodyRows(list) {
  const rows = [];
  const merges = [];

  // 1) EIN Tabellenkopf (nur einmal am Anfang)
  rows.push(['ID', 'Date', 'Topic / Desc', 'Zuständigkeit', 'Frist', 'Typ', 'Status']);

  // sicherstellen, dass wir ein Array haben
  const top = Array.isArray(list?.items) ? [...list.items] : [];
  top.sort((a, b) => sortVal(a?.sort) - sortVal(b?.sort));

  // Headline-Hilfsfunktion
  function pushHeadline(text) {
    const rIndex = rows.length;
    const line = new Array(7).fill('');
    line[0] = text;
    rows.push(line);
    merges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 6 } }); // A..G
  }

  // DFS
  function walk(node) {
    if (!node || node.isDeleted) return;

    const d = node.data || {};
    const t = normType(node.type);

    if (t === 'h1' || t === 'h2' || t === 'h3') {
      const label = `${(d.report_id || '').trim()} ${t.toUpperCase()} ${(d.report_topic || '').trim()}`.trim();
      pushHeadline(label);
    } else if (t === 'p' || !t) {
      // P-Zeile (Typ-Spalte: bevorzugt report_typ, sonst "Punkt")
      rows.push([
        (d.report_id || '').trim(),
        (d.report_date || '').trim(),
        (() => {
          const topic = (d.report_topic || '').replace(/\r\n/g, '\n').trim();
          const desc  = (d.report_desc  || '').replace(/\r\n/g, '\n').trim();
          return topic && desc ? `${topic}\n${desc}` : (topic || desc);
        })(),
        (d.report_responsible || '').trim(),
        (d.report_deadline || '').trim(),
        (d.report_typ || 'Punkt').trim(),
        (d.report_status || '').trim()
      ]);
    } else {
      // Unbekannter Typ → als Datensatz ausgeben
      rows.push([
        (d.report_id || '').trim(),
        (d.report_date || '').trim(),
        (() => {
          const topic = (d.report_topic || '').replace(/\r\n/g, '\n').trim();
          const desc  = (d.report_desc  || '').replace(/\r\n/g, '\n').trim();
          return topic && desc ? `${topic}\n${desc}` : (topic || desc);
        })(),
        (d.report_responsible || '').trim(),
        (d.report_deadline || '').trim(),
        t.toUpperCase(),
        (d.report_status || '').trim()
      ]);
    }

    // Kinder sortiert laufen
    const kids = Array.isArray(node.children) ? [...node.children] : [];
    kids.sort((a, b) => sortVal(a?.sort) - sortVal(b?.sort));
    for (const k of kids) walk(k);
  }

  for (const root of top) walk(root);

  return { rows, merges };
}

/** Rohdatenblatt (optional) */
function buildRawSheetData(list) {
  const headers = [
    'ID', 'Type', 'report_id', 'report_date', 'report_add_date',
    'report_topic', 'report_desc', 'report_responsible', 'report_deadline', 'report_status',
    'parentId', 'sort', 'meta_json'
  ];
  const rows = [headers];

  const items = Array.isArray(list?.items) ? [...list.items] : [];
  items.sort((a, b) => {
    //const sa = Number.isFinite(a?.sort) ? a.sort : 0;
    const sa = Number.isFinite(Number(a?.sort)) ? Number(a.sort) : 0;
    const sb = Number.isFinite(Number(b?.sort)) ? Number(b.sort) : 0;
    return sa - sb;
  });

  for (const it of items) {
    const d = it.data || {};
    rows.push([
      clean(it.id || ''),
      clean(it.type || ''),
      clean(d.report_id || ''),
      clean(d.report_date || ''),
      clean(d.report_add_date || ''),
      clean(d.report_topic || ''),
      clean(d.report_desc || ''),
      clean(d.report_responsible || ''),
      clean(d.report_deadline || ''),
      clean(d.report_status || ''),
      clean(it.parentId || ''),
      Number.isFinite(it.sort) ? it.sort : '',
      clean(JSON.stringify(it.meta || {}))
    ]);
  }
  return rows;
}

/** Hauptfunktion – von app.js aufgerufen */
async function exportCurrentListToExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      UIManager?.showToast?.('XLSX-Bibliothek nicht geladen', 'danger');
      return;
    }
    const list = StateManager.getCurrentList();
    if (!list) {
      UIManager?.showToast?.('Keine Liste ausgewählt', 'warning');
      return;
    }
    const project = StateManager.getCurrentProject();

    // Kopf
    const { headerRows, headerMerges } = buildProjectHeaderRows(project, list);

    // Body (ein Header, alle h1/h2/h3, alle p)
    const { rows: bodyRows, merges: bodyMerges } = buildBodyRows(list);

    // zusammenfügen
    const allRows = [...headerRows, ...bodyRows];
    const rowOffset = headerRows.length;
    const allMerges = [
      ...headerMerges,
      ...bodyMerges.map(m => ({
        s: { r: m.s.r + rowOffset, c: m.s.c },
        e: { r: m.e.r + rowOffset, c: m.e.c }
      }))
    ];

    // Worksheet
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws['!merges'] = allMerges;

    // Spaltenbreiten
    ws['!cols'] = [
      { wch: 10 }, // ID
      { wch: 12 }, // Date
      { wch: 60 }, // Topic / Desc
      { wch: 24 }, // Zuständigkeit
      { wch: 16 }, // Frist
      { wch: 10 }, // Typ
      { wch: 16 }  // Status
    ];

    // Wrap nur in "Topic / Desc"
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = 0; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: 2 }); // Spalte C
        const cell = ws[addr];
        if (cell && typeof cell.v === 'string' && cell.v.includes('\n')) {
          cell.s = { alignment: { wrapText: true, vertical: 'top' } };
        }
      }
    }

    // (einfach) Fett für Kopfzeilen
    // Projektkopf fett
    for (let r = 0; r < headerRows.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (ws[addr]) {
        ws[addr].s = {
          ...(ws[addr].s || {}),
          font: { bold: true },
          alignment: { ...(ws[addr].s?.alignment || {}), vertical: 'center' }
        };
      }
    }
    // Tabellenkopf (erste Zeile des Body)
    const firstHeaderRowIndex = headerRows.length; // direkt nach dem Projektkopf
    for (let c = 0; c < COLS; c++) {
      const addr = XLSX.utils.encode_cell({ r: firstHeaderRowIndex, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        ...(ws[addr].s || {}),
        font: { bold: true },
        alignment: { ...(ws[addr].s?.alignment || {}), vertical: 'center' }
      };
    }

    // Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Liste');

    // Rohdaten (optional)
    const wsRaw = XLSX.utils.aoa_to_sheet(buildRawSheetData(list));
    wsRaw['!cols'] = [
      { wch: 38 }, { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
      { wch: 32 }, { wch: 48 }, { wch: 24 }, { wch: 16 }, { wch: 16 },
      { wch: 38 }, { wch: 8 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Rohdaten');

    // Dateiname
    const projectName = project?.manifest?.project?.name || 'Projekt';
    const listName = list?.name || 'Liste';
    const ts = formatDate ? formatDate(new Date()) : new Date().toISOString().slice(0,10);
    const safe = s => String(s).replace(/[^a-z0-9_\-]+/gi, '_');
    const filename = `${safe(projectName)}__${safe(listName)}__${ts}.xlsx`;

    XLSX.writeFile(wb, filename);
    UIManager?.showToast?.('Excel-Datei erstellt', 'success');
  } catch (err) {
    console.error('Excel-Export Fehler:', err);
    UIManager?.showToast?.('Excel-Export fehlgeschlagen', 'danger');
  }
}

export const ExportExcelManager = {
  exportCurrentListToExcel
};
