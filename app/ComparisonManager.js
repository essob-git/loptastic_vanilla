/**
 * Listify – Community Edition
 * Projektmanagement-Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Dieses Programm ist freie Software: Sie können es unter den Bedingungen
 * der GNU Affero General Public License, Version 3, wie von der
 * Free Software Foundation veröffentlicht, weitergeben und/oder ändern.
 *
 * Dieses Programm wird in der Hoffnung verteilt, dass es nützlich ist,
 * jedoch OHNE JEDE GEWÄHRLEISTUNG – sogar ohne die implizite Gewährleistung
 * der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.
 * Weitere Details finden Sie in der GNU Affero General Public License.
 *
 * Sie sollten eine Kopie der GNU Affero General Public License zusammen mit
 * diesem Programm erhalten haben. Wenn nicht, siehe <https://www.gnu.org/licenses/>.
 *
 * Kommerzielle Lizenzen sind auf Anfrage erhältlich.
 * Kontakt: essob-git@outlook.com
 *
 * Hinweis:
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

// ComparisonManager.js
import { StateManager } from './app.js';
import { formatDate } from './utils.js'

import { UIManager } from './uiManager.js';
import { Programm } from './programm.js';




export const ComparisonManager = {
  showComparisonModal() {
    const list = StateManager.getCurrentList();
    const project = StateManager.getCurrentProject();
   
    if (!list || !project) {
      UIManager.showToast('Keine Liste oder Projekt geladen', 'warning');
      return;
    }

    const snapshots = (project.snapshots?.[list.meta.id] || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (snapshots.length === 0) {
      UIManager.showToast('Keine Snapshots verfügbar', 'warning');
      return;
    }

    const snapshotOptions = snapshots.map(s => `<option value="${s.id}">${formatDate(s.date)} – ${s.name}</option>`).join('');

    const modalContent = `
      <form id="compare-form">
        <div class="mb-3">
          <label class="form-label">Vergleichsmodus</label>
          <select class="form-select" id="compare-mode">
            <option value="list-vs-snapshot">Aktuelle Liste mit Snapshot vergleichen</option>
            <option value="snapshot-vs-snapshot">Zwei Snapshots vergleichen</option>
          </select>
        </div>

        <div id="snapshot-selection">
          <div class="mb-3">
            <label class="form-label">Snapshot auswählen</label>
            <select class="form-select" id="snapshot-a">
              ${snapshotOptions}
            </select>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">Darstellungsart</label>
          <select class="form-select" id="compare-template">
            <option value="rows">Zeilenweiser Vergleich (alt unter neu)</option>
            <option value="inline">Einzeilig mit farblicher Hervorhebung</option>
            <option value="word-inline">Word-Modus (Inline, Änderungen im Text)</option>
          </select>
        </div>
        <div class="mb-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="option-show-reasons-compare" checked>
            <label class="form-check-label" for="option-show-reasons-compare">
              Änderungsgründe anzeigen
            </label>
          </div>
        </div>
      </form>
    `;

    UIManager.showModal('Snapshot-Vergleich starten', modalContent, () => {
      const mode = document.getElementById('compare-mode')?.value;
      const template = document.getElementById('compare-template')?.value;
      const snapshotA = document.getElementById('snapshot-a')?.value;
      const showReasons = document.getElementById('option-show-reasons-compare')?.checked;

      let snapshotB = null;

      if (mode === 'snapshot-vs-snapshot') {
        snapshotB = document.getElementById('snapshot-b')?.value;
        if (!snapshotA || !snapshotB || snapshotA === snapshotB) {
          UIManager.showToast('Bitte zwei unterschiedliche Snapshots wählen', 'warning');
          return false;
        }
      }

      if (mode === 'list-vs-snapshot' && !snapshotA) {
        UIManager.showToast('Bitte einen Snapshot auswählen', 'warning');
        return false;
      }

      // Übergabe an Vergleichslogik
      this.startComparison({
        mode,
        snapshotA,
        snapshotB,
        template,
        showReasons
      });
    });

    // Dynamisch nach dem Anzeigen Modal-Logik binden
    setTimeout(() => {
      const modeSelect = document.getElementById('compare-mode');
      const container = document.getElementById('snapshot-selection');

      if (modeSelect && container) {
        modeSelect.addEventListener('change', () => {
          const selectedMode = modeSelect.value;
          if (selectedMode === 'list-vs-snapshot') {
            container.innerHTML = `
              <div class="mb-3">
                <label class="form-label">Snapshot auswählen</label>
                <select class="form-select" id="snapshot-a">
                  ${snapshotOptions}
                </select>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="mb-3">
                <label class="form-label">Snapshot A (älter)</label>
                <select class="form-select" id="snapshot-a">
                  ${snapshotOptions}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Snapshot B (neuer)</label>
                <select class="form-select" id="snapshot-b">
                  ${snapshotOptions}
                </select>
              </div>
            `;
          }
        });
      }
    }, 100); // kurzer Delay, da Modal-Inhalt erst in den DOM geschrieben wird
  },

  // Platzhalter für den PDF-Vergleich
async startComparison({ mode, snapshotA, snapshotB, template, showReasons }) {
  const project = StateManager.getCurrentProject();
  const list = StateManager.getCurrentList();
 

  if (!project || !list) {
    UIManager.showToast('Kein Projekt oder keine Liste geladen', 'error');
    return;
  }

  // Snapshots holen
  const allSnapshots = project.snapshots?.[list.meta.id] || [];
  const findSnapshot = (id) => allSnapshots.find(s => s.id === id);

  const snapA = findSnapshot(snapshotA);
  const snapB = mode === 'snapshot-vs-snapshot' 
    ? findSnapshot(snapshotB) 
    : { data: { items: list.items } }; // <- Wichtig

  if (!snapA || !snapB) {
    UIManager.showToast('Snapshot(s) nicht gefunden', 'error');
    return;
  }
console.log('Snapshot A:', snapA.data);
console.log('Snapshot B:', snapB.data);

  // Vergleich vorbereiten
  const comparisonData = this.prepareComparisonData(
    snapA.data,
    snapB.data,
    mode === 'snapshot-vs-snapshot' ? 'snapshot-vs-snapshot' : 'list-vs-snapshot'
  );

  console.log('Vergleichsdaten:', comparisonData); // ← Hinzufügen
  // PDF erzeugen
  try {
    await generateComparisonPDF(comparisonData, {
      template,
      snapshotA: snapA,
      snapshotB: snapB,
      listMeta: list.meta,
      mode,
      showReasons
    });
    UIManager.showToast('PDF-Vergleich exportiert', 'success');


  } catch (err) {
    console.error('Fehler beim Vergleichs-PDF:', err);
    UIManager.showToast('Fehler beim PDF-Vergleich', 'error');
  }
},

  // -----------------------------------------------------------------------------------------------------------------
  /**
   * Vergleicht zwei Snapshots von Listendaten und bereitet ein Array mit allen relevanten Änderungen auf.
   * Der Vergleich erfolgt auf Zeilenebene anhand der eindeutigen IDs der Listeneinträge.
   * Unterstützt werden die Status: hinzugefügt, entfernt, geändert, verschoben, unverändert.
   * 
   * @param {Object} snapshotAData - Daten des alten Snapshots ({ items: [...] })
   * @param {Object} snapshotBData - Daten des neuen Snapshots ({ items: [...] })
   * @returns {Array} comparison - Liste mit Objekten { id, kind, type, status, oldItem, newItem, sort }
   */

  prepareComparisonData(snapshotAData, snapshotBData) {
    // --- Hilfsfunktionen ----------------------------------------------------------------
    const TYPE_LEVEL = { h1: 0, h2: 1, h3: 2, p: 3 };

const project = StateManager.getCurrentProject();
const changelog = project?.changelog || {};


    function flatten(items = [], out = []) {
      for (const it of items) {
        if (it.isDeleted) continue;
        out.push(it);
        if (it.children?.length) flatten(it.children, out);
      }
      return out;
    }

    function toMap(arr) {
      return new Map(arr.map(it => [it.id, it]));
    }

    /** Erzeuge die Sortier-Kaskade (Pfad) aus dem existierenden Snapshot (bevorzugt B, sonst A) */
    function buildSortKey(entry, oldMap, newMap) {
      const ref = entry.newItem || entry.oldItem || entry.item;
      if (!ref) return [-1, -1, -1, -1];

      // Nutze den Snapshot, in dem das Element existiert (B bevorzugt, für 'removed' dann A)
      const inB = newMap.has(ref.id);
      const map = inB ? newMap : oldMap;

      const key = [];
      let cur = ref;
      let guard = 0;
      while (cur && guard++ < 1000) {
        key.unshift(cur.sort ?? 0);                // sort vorne einfügen
        cur = cur.parentId ? map.get(cur.parentId) : null;
      }
      // auf Länge 4 auffüllen (h1,h2,h3,p)
      while (key.length < 4) key.push(-1);
      return key.slice(0, 4);
    }

    /** Lexikografischer Vergleich zweier Nummern-Arrays gleicher Länge */
    function lexCompare(a, b) {
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const d = (a[i] ?? 0) - (b[i] ?? 0);
        if (d !== 0) return d;
      }
      return a.length - b.length;
    }

    // --- Daten vorbereiten ---------------------------------------------------------------
    const oldFlat = flatten(snapshotAData?.items || []);
    const newFlat = flatten(snapshotBData?.items || []);

    const oldMap = toMap(oldFlat);
    const newMap = toMap(newFlat);

    const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    const keys = [
      'type',
      'report_id','report_date','report_topic','report_desc',
      'report_responsible','report_deadline','report_typ','report_status'
    ];

    const comparison = [];

    for (const id of allIds) {
      const oldItem = oldMap.get(id) || null;
      const newItem = newMap.get(id) || null;
      const type = (newItem || oldItem)?.type;

      

      // Headline wird als eigener Block ausgegeben
      if (['h1','h2','h3'].includes(type)) {
        const headlineEntry = {
          kind: 'headline',
          item: (newItem || oldItem),
          level: TYPE_LEVEL[type],
          sortKey: buildSortKey({ item: (newItem || oldItem) }, oldMap, newMap)
        };
        comparison.push(headlineEntry);
        continue;
      }

      // Ab hier nur 'p'-Zeilen
      let status;
      if (oldItem && !newItem) {
        status = 'removed';
      } else if (!oldItem && newItem) {
        status = 'added';
      } else if (oldItem && newItem) {
        let changed = false;
        for (const k of keys) {
          let a = (k in oldItem ? oldItem[k] : oldItem.data?.[k]);
          let b = (k in newItem ? newItem[k] : newItem.data?.[k]);
          if ((a ?? '') !== (b ?? '')) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          if ((oldItem.sort !== newItem.sort) || ((oldItem.parentId ?? null) !== (newItem.parentId ?? null))) {
            status = 'moved';
          } else {
            status = 'unchanged';
          }
        } else {
          status = 'changed';
        }
      }

      const sortIndex = newItem?.sort ?? oldItem?.sort ?? 0;

    // Änderungsgrund aus dem Changelog extrahieren
const logEntries = changelog[id] || [];
let reason = null;
if (Array.isArray(logEntries) && logEntries.length > 0) {
  for (let i = logEntries.length - 1; i >= 0; i--) {
    const entry = logEntries[i];
    if (entry?.changes?.reason) {
      reason = entry.changes.reason;
      break; // letzten Grund gefunden → Abbruch
    }
  }
}


      const rowEntry = {
        id,
        kind: 'row',
        type: 'p',
        status,
        oldItem,
        newItem,
        sort: sortIndex,
        level: TYPE_LEVEL.p,
        sortKey: buildSortKey({ oldItem, newItem }, oldMap, newMap),
        reason
      };

      comparison.push(rowEntry);
    }

    // Sortierung: 1) hierarchischer Pfad 2) Level (Headline vor p) 3) p.sort als Feintuning
    comparison.sort((a, b) => {
      const byPath = lexCompare(a.sortKey, b.sortKey);
      if (byPath !== 0) return byPath;

      const byLevel = (a.level ?? 99) - (b.level ?? 99);
      if (byLevel !== 0) return byLevel;

      // Feinsortierung innerhalb gleicher Ebene
      if (a.kind === 'row' && b.kind === 'row') {
        return (a.sort ?? 0) - (b.sort ?? 0);
      }
      return 0;
    });

    return comparison;
  }
  // -----------------------------------------------------------------------------------------------------------------
};
/**
 * Erzeugt ein Vergleichs-PDF zweier Snapshots bzw. eines Snapshots mit der aktuellen Liste.
 * Die Darstellung erfolgt tabellarisch, alle Änderungen werden farbig hervorgehoben.
 * Unterstützt werden Status: hinzugefügt, entfernt, geändert, verschoben, unverändert.
 * Kopfzeile mit Projekt- und Listendaten, Logo, Seitenzahlen und Exportdatum.
 * 
 * @param {Array} comparisonData - Vergleichsdaten aus prepareComparisonData()
 * @param {Object} options - Optionen: snapshotA, snapshotB, mode, ...
 * @returns {Uint8Array} - PDF als ArrayBuffer
 */
export async function generateComparisonPDF(comparisonData, options = {}) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  // Neues PDF-Dokument anlegen, A4 Querformat
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([842, 595]); // A4 Querformat
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 10;

   // Farbdefinitionen für Hintergründe für die hinzugefügten und gelöschten Zeilen
    const BG_ADDED   = rgb(0.92, 1.00, 0.92); // light blue
    const BG_MOVED = rgb(1.00, 0.97, 0.92);   // light orange
    const BG_REMOVED = rgb(1.00, 0.92, 0.92); // light red

  // Seitenrand und Startposition
    const margin = 40;                        // Seitenrand
    const usableWidth = 842 - 2 * margin;     // Nutzbare Breite
    let y = 540;

    const lineHeight = 12;
    const cellPadX = 4;
    const cellPadY = 2;

  // Projekt- und Listendaten aus dem StateManager 
    const list = StateManager.getCurrentList();
    const project = StateManager.getCurrentProject();

    const today = new Date().toLocaleDateString('de-DE');
    const projectName = project.manifest?.project?.name || 'Unbekanntes Projekt';
    const projectIPS = project.manifest?.project?.wNummer || '';
    const projectLeader = project.manifest?.project?.projectLeader || '';

    const snapshotAName = options.snapshotA?.name || 'Snapshot A';
    const snapshotBName = options.snapshotB?.name || (options.mode === 'list-vs-snapshot' ? 'Aktuelle Liste' : 'Snapshot B');

    // Logo laden
    try {
      // ErrorHandler, weil Logo ggf. fehlen könnte.
      const logoUrl = 'app/images/Bericht_Logo.png';
      const logoBytes = await fetch(logoUrl).then(r => r.arrayBuffer());
      const logo = await pdfDoc.embedPng(logoBytes);
      const logoHeight = 40;                        // Höhe des Logos in Pixel
      const logoScale = logoHeight / logo.height;   // Berechnung der Logogröße
      page.drawImage(logo, {
        x: 842 - margin - logo.width * logoScale,
        y: y - logoHeight + 10,
        width: logo.width * logoScale,
        height: logoHeight,
      });
    } catch (e) {
      console.warn('Logo konnte nicht geladen werden:', e);
    }


  // --- Kopfbereich ---
    // Projektname
    page.drawText(`Projekt: ${projectName}${projectIPS ? ` (IPS-Nr.: ${projectIPS})` : ''}`, { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
      y -= 12;
    // Projektleitung
    page.drawText(`Projektleitung: ${projectLeader}`, { x: margin, y, size: 8, font, color: rgb(0, 0, 0) });
      y -= 20;
    // Liste
    page.drawText(`Liste: ${list.meta?.name || 'Unbenannt'}`, { x: margin, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      y -= 12;
    // Vergleichslisten ausgeben
    page.drawText(`Vergleich [ ${options.mode} ]:  ${snapshotAName} <-> ${snapshotBName}`, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 25;


  // Spaltendefinition und Spaltenbreite
    const headersMap = {
      report_id: 'ID',
      report_date: 'Datum',
      report_topic: 'Thema + Beschreibung',
      report_responsible: 'Zuständig',
      report_deadline: 'Frist',
      report_typ: 'Typ',
      report_status: 'Status',
    };

    const desiredWidths = {
      report_id: 90,
      report_date: 80,
      report_topic: 300,
      report_responsible: 90,
      report_deadline: 90,
      report_typ: 80,
      report_status: 80,
    };

    const columns = Object.keys(headersMap);
    const colWidths = columns.map(col => desiredWidths[col]);

    // Skalierung der verfügbaren Breite
    const scale = usableWidth / colWidths.reduce((a, b) => a + b, 0);   
    const finalColWidths = colWidths.map(w => Math.floor(w * scale));
    finalColWidths[finalColWidths.length - 1] += usableWidth - finalColWidths.reduce((a, b) => a + b, 0);


    /**
     * Umbricht Text automatisch auf verfügbare Zellbreite, inkl. Zeilenumbrüche im Text
     * @param {string} text - Eingabetext
     * @param {number} maxWidth - Maximale Breite in Pixeln
     * @returns {Array<string>} - Zeilen für den PDF-Ausdruck
     */
    const wrapText = (text, maxWidth) => {
      if (!text) return [''];
      // Zuerst an echten Zeilenumbrüchen auftrennen!
      const paragraphs = text.toString().split('\n');
      let result = [];
      for (let para of paragraphs) {
        // Wie bisher: jedes "Paragraph" einzeln umbrechen
        const words = para.split(/\s+/);
        let line = '';
        for (let word of words) {
          const testLine = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth - 2 * cellPadX) {
            line = testLine;
          } else {
            if (line) result.push(line);
            line = word;
          }
        }
        if (line) result.push(line);
      }
      return result;
    };


  /**
   * Prüft, ob noch Platz auf der aktuellen Seite ist, andernfalls Seite & Header neu
   * @param {number} neededHeight - Benötigte Höhe in px
   */
  const ensureSpace = (neededHeight) => {
    if (y - neededHeight < margin + 40) {
      addFooter(page, pdfDoc.getPageCount()) //Einfügen des Footers
      page = pdfDoc.addPage([842, 595]);
      y = 540;
      drawHeader();
    }
  };


  /**
   * Zeichnet die Tabellenkopfzeile (wird auf jeder neuen Seite oben wiederholt)
   */
  const drawHeader = () => {
    let x = margin;
    for (let i = 0; i < columns.length; i++) {
      page.drawText(headersMap[columns[i]], {
        x,
        y,
        size: fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      x += finalColWidths[i];
    }
    y -= lineHeight;
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: margin + usableWidth, y: y },
      thickness: 0.5,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 5;
  };
  

  /**
   * Zeichnet eine farbige Headline-Zeile für h1/h2/h3
   * @param {string} id - ID der Headline
   * @param {string} text - Text der Headline
   * @param {string} type - Typ: h1, h2, h3
   */
  const drawHeadline = (id, text, type = 'h1') => {
    const boxHeight = lineHeight + 10;
    const topPad = 2;

    ensureSpace(boxHeight);

    const bg = {
      h1: rgb(0.80, 0.80, 0.80), // h1 = dunkleres Grau
      h2: rgb(0.90, 0.90, 0.90), // h2 = mittleres Grau
      h3: rgb(0.96, 0.96, 0.96), // h3 = sehr helles Grau
    }[type] || rgb(1, 1, 1);

    const headlineFontsize = {
      h1: 15,
      h2: 12,
      h3: 10
    }[type] || 12;

    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: usableWidth, // exakt bis Tabellenbreite
      height: boxHeight,
      color: bg,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.75,
    });

      page.drawText(id , {
      x: margin + 6,
      y: y - lineHeight + topPad - 5,
      size: headlineFontsize,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    //page.drawText(text || '(Unbenannt)', {
      page.drawText(text , {
      x: margin + 6 + 60,
      y: y - lineHeight + topPad - 5,
      size: headlineFontsize,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    y -= boxHeight;
  };
  

  /**
   * Zeichnet Footer mit Seitenzahl, Datum und Programmname
   * @param {PDFPage} page - Aktuelle Seite
   * @param {number} totalPages - Aktuelle Seitenzahl
   */
  function addFooter(page, totalPages) {
    if (totalPages > 0) {
      const { width } = page.getSize();
      page.drawText(`Seite ${totalPages}`, {
        x: width / 2 - 20,
        y: 20,
        size: 8,
        font: PDFLib.StandardFonts ? undefined : undefined, // Font bereits eingebettet, nicht nötig
        color: PDFLib.rgb(0.4, 0.4, 0.4),
      });
  
      page.drawText(`Exportdatum: ${today}`, {
        x: 40,
        y: 20,
        size: 8,
        font: PDFLib.StandardFonts ? undefined : undefined, // Font bereits eingebettet, nicht nötig
        color: PDFLib.rgb(0.4, 0.4, 0.4),
      });

      page.drawText(`Programm: ${Programm.getName()} v. ${Programm.getVersion()}`, {
        x: 40,
        y: 32,
        size: 8,
        font: PDFLib.StandardFonts ? undefined : undefined, // Font bereits eingebettet, nicht nötig
        color: PDFLib.rgb(0.4, 0.4, 0.4),
      });
    }
  }



  // ------- Tabellenzeile (Daten) zeichnen -------
  /**
   * Zeichnet eine Tabellenzeile für einen Daten-/Vergleichseintrag
   * @param {Object} data - Die Zeilendaten (p-Objekt)
   * @param {string} type - Status: added/removed/changed/unchanged/moved
   * @param {Object|null} compareData - Vergleichsdaten (bei "changed")
   */
  const drawRow = (data, type, compareData = null, source = '') => {

    // Zelleninhalte aufbereiten, Text ggf. umbrechen
    const cellLines = columns.map((col, i) => {
      if (col === 'report_topic') {
        const topic = data['report_topic'] || '';
        const desc  = data['report_desc'] || '';
        // EIN String: Topic + \n + Desc (wenn vorhanden)
        let combined = topic;
        if (desc) combined += '\n' + desc;
        // Jetzt ein einziges wrapText für den Gesamtstring:
        return wrapText(combined, finalColWidths[i]);
      } else {
        return wrapText(data[col] || '', finalColWidths[i]);
      }
    });

    const maxLines = Math.max(...cellLines.map(arr => arr.length));
    const rowHeight = maxLines * lineHeight + 2 * cellPadY+8;
    const wrapped = cellLines.map((val, i) => wrapText(val, finalColWidths[i] - 2 * cellPadX));
    // Seitenumbruch prüfen
    ensureSpace(rowHeight);
  
    // Zellen-Rahmen + Text / äußere Schleife über die Spalten!
    let x = margin;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      let lines = cellLines[i];

      // Textfarbe: blau wenn Feld geändert (nur bei 'changed'), rot wenn 'removed', sonst schwarz
      const color =
        (type === 'removed') ? rgb(1, 0, 0)
        : (type === 'added') ? rgb(0, 0.4, 1)
        : (compareData && data[col] !== compareData[col]) ? rgb(0, 0.4, 1)
        : rgb(0, 0, 0);
      
      let bgcolor = null;
      
      if(type === 'removed') {
        bgcolor = BG_REMOVED; //Light red
      }else if (type === 'added') {
        bgcolor = BG_ADDED;
      } else if (
        type === 'changed' &&
        compareData &&
        (data[col] !== compareData[col])
      ) {
        bgcolor = rgb(0.93, 0.94, 1.00); // sehr helles Blau für geänderte Zellen
      }
      
      if(bgcolor) {
        // Hintergrund 
        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: finalColWidths[i],
          height: rowHeight,
          borderColor: undefined,
          color: bgcolor
        });
      }

      // Zellrahmen (über BG)
      page.drawRectangle({
        x,
        y: y - rowHeight,
        width: finalColWidths[i],
        height: rowHeight,
        borderColor: rgb(0, 0, 0, 1),
        borderWidth: 0.5
      });


      // Text mehrere Zieln pro Spalte

let textY = y - cellPadY - lineHeight;

// Für jede Zeile (Textabschnitt) innerhalb der Spalte
for (const ln of lines) {
  // Standardfarbe oder spezielle Farbe bei Änderungen
  let drawColor = color;

  // === DIFF-Hervorhebung für geänderte Felder ===
  if (
    type === 'changed' &&
    compareData &&                        // nur sinnvoll, wenn Vergleichsdaten existieren
    data[columns[i]] !== compareData[columns[i]] // Feldwert unterschiedlich
  ) {
    drawColor = rgb(0.13, 0.27, 0.66); // kräftiges Blau
  }

  // Text zeichnen
  page.drawText(ln, {
    x: x + cellPadX,
    y: textY,
    size: fontSize,
    font,
    color: drawColor,
  });



  textY -= lineHeight;
}


        


      x += finalColWidths[i];
    }



    // 6) Cursor nach unten
     if (type === 'removed') {
    y -= rowHeight + 4;
     } else{
      y -= rowHeight
     }
  };

  // 🔵 Hilfsfunktion für Änderungsgrund
const drawReasonBox = (reasonText) => {
  if (!reasonText) return;
  const lines = wrapText(`Grund: ${reasonText}`, usableWidth - 2 * margin);
  const reasonHeight = lines.length * (fontSize - 1 + 3) + 2 * cellPadY +8;

  ensureSpace(reasonHeight + 6);
  y-= -3;

  page.drawRectangle({
    x: margin,
    y: y - reasonHeight,
    width: usableWidth,
    height: reasonHeight,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.25,
    color: rgb(0.97, 0.97, 0.97)
  });

  let textY = y - cellPadY - (fontSize - 1 + 3);
  for (const line of lines) {
    page.drawText(line, {
      x: margin + cellPadX,
      y: textY,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35)
    });
    textY -= (fontSize - 1 + 3);
  }
  y -= reasonHeight + 6;
};




// --- AUSGABE ---


  // --- Zeichnen der Tabelle ---
drawHeader();

// 1. Headlines sammeln (h1/h2/h3)
const headlines = comparisonData.filter(e => e.kind === 'headline');

// 2. Alle Zeilen (nur p-Elemente)
const rows = comparisonData.filter(e => e.kind === 'row');

// 3. Für jede Headline: erst Headline, dann alle zugehörigen p-Zeilen (sortiert)
for (const entry of headlines) {
    const h = entry.item;
    const headId = h.id;
    const idTxt = (h.data?.report_id ?? '') + '';
    const topic = (h.data?.report_topic ?? '') + '';
    drawHeadline(idTxt, topic, h.type);

    // Zuordnung: Status beachten! parentId ggf. aus oldItem oder newItem holen
    const children = rows.filter(row => {
        if (row.status === 'removed') {
            return row.oldItem?.parentId === headId;
        } else {
            return row.newItem?.parentId === headId;
        }
    }).sort((a, b) => (a.sort - b.sort));

    for (const row of children) {
        const newData = row.newItem?.data || {};
        const oldData = row.oldItem?.data || {};

        if (row.status === 'removed') {
            drawRow(oldData, 'removed', null, 'oldData');

        } else if (row.status === 'added') {
            drawRow(newData, 'added', null, 'newData');

        } else if (row.status === 'moved') {
            drawRow(newData, 'moved', null, 'newData');

        } else if (row.status === 'unchanged') {
            drawRow(newData, 'unchanged', oldData, 'newData');

        } else if (row.status === 'changed') {
          
            if (options.template === 'rows') {
                drawRow(newData, 'changed', oldData, 'newData');
                drawRow(oldData, 'removed', null, 'oldData');
            } else {
                drawRow(newData, 'changed', oldData, 'newData');
            }

if (options.showReasons && row.reason) {
            console.log("reason: ", row.reason);
            // Änderungsgrund ausgeben
         
            drawReasonBox(row.reason);
}
        }
    }
}


// Optional: P-Elemente ohne Headline (parentId == null)
const unassigned = rows.filter(row =>
    (row.status === 'removed'
        ? !row.oldItem?.parentId
        : !row.newItem?.parentId)
);
if (unassigned.length > 0) {
    // Ggf. Dummy-Headline für „Ohne Zuordnung“ ausgeben
    drawHeadline('', '(Ohne Überschrift)', 'h3');
    for (const row of unassigned) {
        const newData = row.newItem?.data || {};
        const oldData = row.oldItem?.data || {};

        if (row.status === 'removed') {
            drawRow(oldData, 'removed', null, 'oldData');
        } else if (row.status === 'added') {
            drawRow(newData, 'added', null, 'newData');
        } else if (row.status === 'moved') {
            drawRow(newData, 'moved', null, 'newData');
        } else if (row.status === 'unchanged') {
            drawRow(newData, 'unchanged', oldData, 'newData');
        } else if (row.status === 'changed') {
            if (options.template === 'rows') {
                drawRow(newData, 'changed', oldData, 'newData');
                drawRow(oldData, 'removed', null, 'oldData');
            } else {
                drawRow(newData, 'changed', oldData, 'newData');
            }
        }
    }
}

addFooter(page, pdfDoc.getPageCount());



// Projektname für Dateisystem säubern
const safeName = projectName
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")  // Umlaute -> ae, etc.
  .replace(/[^a-z0-9]+/gi, "_")                       // nur alnum + _
  .replace(/^_+|_+$/g, "");                           // keine _ am Rand

// Datum yyyy_mm_dd
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const exportDate = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}`;

// Type bestimmen
let typeSuffix = "";
if (options.template === "inline" || options.template === "word-inline") {
  typeSuffix = "-c";
} else if (options.template === "rows") {
  typeSuffix = "-cr";
}

// Dateiname zusammensetzen
const filename = `LoP-${projectIPS}-${safeName}-${exportDate}${typeSuffix}.pdf`;



  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
