/**
 * Listify - Projektmanagement Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Diese Datei ist Teil von Listify.
 * 
 * Lizenz: MIT (https://opensource.org/licenses/MIT)
 * 
 * Hinweis:
 * - Nutzung, Veränderung und Weitergabe sind unter Beachtung der Lizenz erlaubt.
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

// exportManager2.js
import { StateManager, formatDate } from './app.js';
import { UIManager } from './uiManager.js';
import { Programm } from './programm.js';

export const ExportManager2 = {
  showExportModal() {
    const list = StateManager.getCurrentList();
    if (!list) {
      UIManager.showToast('Keine Liste ausgewählt', 'warning');
      return;
    }

    const bodyHtml = `
      <form>
        <div class="mb-3">
          <label class="form-label">Berichtsvorlage</label>
          <select class="form-select" id="export-template-report">
            <option value="simple">Einfache Tabellenübersicht</option>
            <option value="changelog">Mit Änderungsverlauf</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Spaltenauswahl</label>
          ${[
            ['report_id', 'ID'],
            ['report_date', 'Datum'],
            ['report_topic', 'Thema + Beschreibung'],
            ['report_responsible', 'Verantwortlich'],
            ['report_deadline', 'Frist'],
            ['report_typ', 'Typ'],
            ['report_status', 'Status']
          ].map(([val, label]) => `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="${val}" id="col-${val}-report" checked>
              <label class="form-check-label" for="col-${val}-report">${label}</label>
            </div>
          `).join('')}
        </div>

        <div class="mb-3">
          <label class="form-label">Filter</label>
          <div class="row">
            <div class="col">
              <strong>Typ</strong>
              ${['Aufgabe', 'Information', 'Entscheidung', 'Sonstiges'].map(type => `
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="${type}" id="filter-typ-${type}-report" checked>
                  <label class="form-check-label" for="filter-typ-${type}-report">${type}</label>
                </div>
              `).join('')}
            </div>
            <div class="col">
              <strong>Status</strong>
              ${['ausstehend','in Bearbeitung', 'Erledigt', 'abgebrochen', 'verworfen', 'Sonstiges'].map(status => `
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="${status}" id="filter-status-${status}-report" checked>
                  <label class="form-check-label" for="filter-status-${status}-report">${status}</label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

         <div class="mb-3">
          <label class="form-label">Ausgabe der Abhängigkeiten</label>
          <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="option-hasPredecessor-report">
              <label class="form-check-label" for="option-hasPredecessor-report">Vorgänger</label>
          </div>
          <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="option-hasSuccessor-report">
              <label class="form-check-label" for="option-hasSuccessor-report">Nachfolger</label>
          </div>          
          <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="option-duration-report">
              <label class="form-check-label" for="option-duration-report">Dauer</label>
          </div>        
                        
        </div>


      </form>
    `;

    UIManager.showModal('PDF-Export konfigurieren', bodyHtml, () => {
      const template = document.getElementById('export-template-report').value;
      const modalEl = document.getElementById('mainModal');

      const selectedColumns = Array.from(modalEl.querySelectorAll('.form-check-input[type="checkbox"]:checked'))
        .map((input) => input.value)
        .filter((v) => v.startsWith('report_'));

      const selectedTypes = Array.from(modalEl.querySelectorAll('input[id^="filter-typ-"]:checked')).map(cb => cb.value);
      const selectedStatuses = Array.from(modalEl.querySelectorAll('input[id^="filter-status-"]:checked')).map(cb => cb.value);

      ExportManager2.exportList({
        template,
        columns: selectedColumns,
        filters: {
          typ: selectedTypes,
          status: selectedStatuses
        }
      });
    });
  },

  exportList({ template, columns, filters }) {
    console.log("template: ", template);
    switch (template) {
      case 'simple':
        //this.exportSimpleLayout(columns, filters);
        this.exportSimpleLayout(columns, filters, template);
        break;
      case 'changelog':
         this.exportSimpleLayout(columns, filters, template);
        break;
      default:
        UIManager.showToast("Unbekanntes Template", "error");
    }
  },

  async exportSimpleLayout(columns, filters, template = 'simple') {
    const list = StateManager.getCurrentList();
    const project = StateManager.getCurrentProject();
    const changelog = project?.changelog || {};
   
    console.log('Array:', list.items);

    if (!list || !project) return;

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    const margin = 40;
    const usableWidth = width - 2 * margin;
    const lineHeight = 14;
    const fontSize = 10;
    const cellPadX = 4;
    const cellPadY = 3;
    let y = height - margin;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const showPredecessors  = document.getElementById('option-hasPredecessor-report')?.checked;
    const showSuccessors    = document.getElementById('option-hasSuccessor-report')?.checked;

    // FUNCTIONS
    // Liefert Array von Item-Objekten, die als Vorgänger gelistet sind
function getPredecessors(item, allItems) {
  const deps = item.data?.dependencies;
  if (!deps || !Array.isArray(deps)) return [];
  if (deps.length && typeof deps[0] === "object" && deps[0] !== null) {
    return deps
      .filter(dep => dep.kind === "predecessor" && typeof dep.id === "string")
      .map(dep => {
        const predItem = allItems.find(i => i.id === dep.id);
        if (predItem) {
          return { item: predItem, dependency: dep };
        }
        return null;
      })
      .filter(Boolean);
  }
  // Fallback für altes Array mit nur IDs
  return deps
    .map(depId => {
      const predItem = allItems.find(i => i.id === depId);
      if (predItem) {
        return { item: predItem, dependency: { id: depId, kind: "predecessor" } };
      }
      return null;
    })
    .filter(Boolean);
}

function getSuccessors(item, allItems) {
  return allItems
    .map(other => {
      const deps = other.data?.dependencies;
      if (!Array.isArray(deps)) return null;
      if (deps.length && typeof deps[0] === "object" && deps[0] !== null) {
        const found = deps.find(dep => dep.kind === "predecessor" && dep.id === item.id);
        if (found) {
          return { item: other, dependency: found };
        }
      } else if (deps.includes(item.id)) {
        return { item: other, dependency: { id: item.id, kind: "predecessor" } };
      }
      return null;
    })
    .filter(Boolean);
}


function flattenItems(items) {
  let flat = [];
  for (const item of items) {
    flat.push(item);
    if (Array.isArray(item.children) && item.children.length) {
      flat = flat.concat(flattenItems(item.children));
    }
  }
  return flat;
}

function calcStartFromDeadlineAndLag(deadline, lag) {
  // deadline = Text oder Datum (ISO)
  // lag = {value: Zahl, unit: "d"/"w"/"m"/"y"}  (Tage/Wochen/Monate/Jahre)
  if (!deadline || !lag || typeof lag.value !== "number" || !lag.unit) return "";

  let end = new Date(deadline);
  if (isNaN(end.getTime())) return ""; // Deadline kein echtes Datum, Rückgabe leer

  let start = new Date(end);
  switch (lag.unit) {
    case "d":
    case "T":
      start.setDate(end.getDate() - lag.value); break;
    case "w":
    case "W":
      start.setDate(end.getDate() - lag.value * 7); break;
    case "m":
    case "M":
      start.setMonth(end.getMonth() - lag.value); break;
    case "y":
    case "Y":
      start.setFullYear(end.getFullYear() - lag.value); break;
    default:
      return "";
  }
  // Rückgabe als "YYYY-MM-DD"
  return start.toISOString().split("T")[0];
}

function formatDateDE(dt) {
  if (!dt) return "";
  // Akzeptiere Date-Objekte oder Strings
  let d = (dt instanceof Date) ? dt : new Date(dt);
  if (isNaN(d.getTime())) return ""; // Kein valides Datum
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}


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

const flatItems = flattenItems(list.items);







    try {
      const logoUrl = 'app/images/logo_sebd.png';
      const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const targetHeight = 50;
      const scale = targetHeight / logoImage.height;
      page.drawImage(logoImage, {
        x: width - margin - logoImage.width * scale,
        y: height - margin - targetHeight + 10,
        width: logoImage.width * scale,
        height: targetHeight,
      });
    } catch {}

    const today = new Date().toLocaleDateString('de-DE');
    const projectName = project.manifest?.project?.name || 'Unbekanntes Projekt';
    const projectIPS = project.manifest?.project?.wNummer || '';
    const projectLeader = project.manifest?.project?.projectLeader || '';
    
    page.drawText(`Liste: ${list.meta.name}`, { x: margin, y: y, size: 16, font: fontBold, color: rgb(0, 0, 0) });
    y -= 15;
    page.drawText(`Projekt: ${projectName}${projectIPS ? ` (IPS-Nr.: ${projectIPS})` : ''}`, { x: margin, y: y, size: 10, font, color: rgb(0, 0, 0) });
    y -= 12;
    page.drawText(`Projektleitung: ${projectLeader}`, { x: margin, y: y, size: 8, font, color: rgb(0, 0, 0) });
    y -= 12;
    page.drawText(`Export vom ${today}`, { x: margin, y: y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 35;



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
      report_status: 90,
    };

    const colWidths = columns.map(col => desiredWidths[col]);
    const sumDesired = colWidths.reduce((a, b) => a + b, 0);
    const scale = usableWidth / sumDesired;
    const finalColWidths = colWidths.map(w => Math.floor(w * scale));
    finalColWidths[finalColWidths.length - 1] += usableWidth - finalColWidths.reduce((a, b) => a + b, 0);

    const wrapText = (text, maxWidth) => {
      //if (!text) return [''];
      if(text == null) return [''];
      /**const words = text.toString().split(/\s+/);**/
      const chunks = text.toString().split('\n'); // erst feste Zeilenumbrüche trennen
      const lines = [];
      for (const chunk of chunks) {
        const words = chunk.split(/\s+/);
        let  line = '';

        for (let word of words) {
          const testLine = line ? line + ' ' + word : word;
          if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
            line = testLine;
          } else {
            //lines.push(line);
            if (line) lines.push(line);
            line = word;
          }
        }
      if (line) lines.push(line);
      }
      return lines;
    };

    const ensureSpace = (neededHeight) => {
      if (y - neededHeight < margin + 40) {
        y = height - margin;
        page = pdfDoc.addPage([842, 595]);
        drawTableHeader();
      }
    };

    const drawTableHeader = () => {
      let x = margin;
      columns.forEach((col, i) => {
        page.drawText(headersMap[col], {
          x,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0, 0, 0)
        });
        x += finalColWidths[i];
      });
      page.drawLine({
        start: { x: margin, y: y - 3 },
        end: { x: margin + usableWidth, y: y - 3 },
        thickness: 0.5,
        color: rgb(0.1, 0.1, 0.1)
      });
      y -= lineHeight + 10;
    };

          // Headline mit dezenter Stufenfarbe und exakter Breite
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

        // Hintergrund (soft)
        page.drawRectangle({
          x: margin,
          y: y - boxHeight,
          width: usableWidth, // exakt bis Tabellenbreite, nicht bis Seitenrand
          height: boxHeight,
          color: bg,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.75,
        });

		const textBaseline = y - topPad - lineHeight;
        // ID
        page.drawText(id || '', {
          x: margin + 6,
          y: textBaseline,
          size: headlineFontsize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        // Text
        page.drawText(text || 'Überschrift', {
          x: margin + 6 + 80, // 80 = ID-Spaltenbreite
          y: textBaseline,
          size: headlineFontsize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        y -= boxHeight; // nur Boxhöhe abziehen – kein extra Abstand
      };


    // --- Changelog: Helfer ---
    const isChangedForColumn = (col, changes) => {
      if (!changes) return false;
      if (col === 'report_topic') {
        return Object.prototype.hasOwnProperty.call(changes, 'report_topic') ||
               Object.prototype.hasOwnProperty.call(changes, 'report_desc');
      }
      if (col === 'report_typ') {
        return Object.prototype.hasOwnProperty.call(changes, 'report_typ'); // KORRIGIERT
      }
      return Object.prototype.hasOwnProperty.call(changes, col);
    };

    const valueForColumnFromChanges = (col, item, changes) => {
      if (col === 'report_topic') {
        const newTopic = (changes?.report_topic?.[1] ?? null);
        const newDesc  = (changes?.report_desc?. [1] ?? null);
        if (newTopic != null || newDesc != null) {
          const topic = (newTopic ?? item.data.report_topic ?? '');
          const desc  = (newDesc  ?? item.data.report_desc  ?? '');
          return desc ? `${topic}\n${desc}` : topic;
        }
        return ''; // in Changelog-Zeile nur geänderte Felder zeigen
      }
      if (col === 'report_typ') {
        return (changes?.report_typ?.[1] ?? ''); // KORRIGIERT
      }
      return (changes?.[col]?.[1] ?? '');
    };

    const drawChangelogRow = (item, entry) => {
      // Zellenwerte vorbereiten
      const cellValues = columns.map(col => {
        if (col === 'report_id') {
          const id = item.data.report_id || '';
          const date = formatDate(entry.timestamp);
          const user = entry.user || '';
          // Immer etwas anzeigen, auch wenn Spalte ID abgewählt wäre – hier ist sie gewählt.
          return id ? [id, date, user] : [date, user];
        }
        if (isChangedForColumn(col, entry.changes)) {
          return [ valueForColumnFromChanges(col, item, entry.changes) ];
        }
        return ['']; // unverändert: in Changelog-Zeile leer lassen
      });

      const wrapped = cellValues.map((vals, i) =>
        Array.isArray(vals)
          ? vals.flatMap(val => wrapText(val, finalColWidths[i] - 2 * cellPadX))
          : wrapText(vals, finalColWidths[i] - 2 * cellPadX)
      );

// NEU: Leerzeilen vollständig entfernen (nur sichtbare Zeilen behalten)
  const wrappedFiltered = wrapped.map(lines => lines.filter(l => String(l).trim().length > 0));

  // NEU: komplette Changelog-Zeile überspringen, wenn außer Spalte "report_id" nichts übrig ist
  const idxId = columns.indexOf('report_id');
  const nonIdHasContent = wrappedFiltered.some((lines, i) => i !== idxId && lines.length > 0);
  if (!nonIdHasContent) return; // nichts Relevantes zu zeigen

      const maxLines = Math.max(...wrapped.map(lines => lines.length));
      const rowHeight = maxLines * (fontSize - 1 + 3) + 2 * cellPadY;

      ensureSpace(rowHeight);

      let x = margin;
      for (let i = 0; i < columns.length; i++) {
        const changed = isChangedForColumn(columns[i], entry.changes);

        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: finalColWidths[i],
          height: rowHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.5,
          color: changed ? rgb(0.90, 0.95, 1.0) : rgb(0.96, 0.96, 0.96) // sanfte Blau-Markierung bei Änderung
        });

        let textY = y - cellPadY - (fontSize - 1 + 3);
        for (let lineIdx = 0; lineIdx < wrapped[i].length; lineIdx++) {
          let line = wrapped[i][lineIdx];
          let size = 8;
          let color = rgb(0.3, 0.3, 0.3);
          if (i === 0 && lineIdx === 1) { // 2. Zeile der ersten Spalte = Datum leicht absetzen
            size = 8;
            color = rgb(0.45, 0.45, 0.45);
          }
          page.drawText(line, {
            x: x + cellPadX,
            y: textY,
            size,
            font,
            color
          });
          textY -= (fontSize - 1 + 3);
        }
        x += finalColWidths[i];
      }
      y -= rowHeight;
    };

/**
 * Zeichnet Markdown-artigen Text mit klickbaren Links.
 * Unterstützt **fett**, *kursiv*, __unterstrichen__, --strike--, [Link](file:///...) und Listenpunkte.
 */
function drawMarkdownText(page, text, x, y, opts) {
  const { size, font, boldFont, italicFont, color } = opts;
  const lineHeight = size * 1.25;
  const lines = (text || '').split(/\n/);
  let cursorY = y;
  const doc = page.doc ?? page.node.context.doc;

  for (const rawLine of lines) {
    let cursorX = x;
    let line = rawLine.trim();

    // Listenpunkt
    if (/^[-*+]\s+/.test(line)) {
      page.drawText('• ', { x: cursorX, y: cursorY, size, font: boldFont, color });
      cursorX += font.widthOfTextAtSize('• ', size);
      line = line.replace(/^[-*+]\s+/, '');
    }

    // Segmente erkennen (Reihenfolge wichtig)
    const parts = line
      .split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|__[^_]+?__|--[^-]+?--|\[.*?\]\(.*?\))/g)
      

      .filter(Boolean);

    for (const part of parts) {
      let segText = part;
      let segFont = font;
      let segColor = color;
      let underline = false;
      let uri = null;

      // **Fett**
      if (/^\*\*(.*?)\*\*$/.test(part)) {
        segText = part.match(/^\*\*(.*?)\*\*$/)[1];
        segFont = boldFont;
      }

      // *Kursiv*
      else if (/^\*(.*?)\*$/.test(part)) {
        segText = part.match(/^\*(.*?)\*$/)[1];
        segFont = italicFont || font;
      }

      // __Unterstrichen__
      else if (/^\s*__([^_]+?)__\s*$/.test(part)) {
      segText = part.match(/^\s*__([^_]+?)__\s*$/)[1];
      underline = true;
      }

      // --Durchgestrichen--
      else if (/^--([^-\n]+?)--$/.test(part.trim())) {
        segText = part.match(/^--([^-\n]+?)--$/)[1];
        segFont = font;
        segColor = rgb(0, 0, 0);
        const w = segFont.widthOfTextAtSize(segText, size);

        // Text + Linie mittig
        page.drawText(segText, { x: cursorX, y: cursorY, size, font: segFont, color: segColor });
        page.drawLine({
          start: { x: cursorX, y: cursorY + size * 0.3 },
          end: { x: cursorX + w, y: cursorY + size * 0.3 },
          thickness: 0.5,
          color: segColor,
        });
        cursorX += w + 1;
        continue;
      }

      // [Link](URL)
      else if (/^\[(.*?)\]\((.*?)\)$/.test(part)) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        segText = match[1];
        uri = match[2];
        segColor = rgb(0, 0, 1);
        underline = true;
      }

      // Text zeichnen
      page.drawText(segText, { x: cursorX, y: cursorY, size, font: segFont, color: segColor });
      const textWidth = segFont.widthOfTextAtSize(segText, size);

      // Unterstreichung (für __text__ und Links)
      if (underline) {
        page.drawLine({
          start: { x: cursorX, y: cursorY - size * 0.16 },
          end: { x: cursorX + textWidth, y: cursorY - size * 0.16 },
          thickness: 0.5,
          color: segColor,
        });
      }

      // Klickbaren Link setzen
      if (uri) {
        try {
          const rect = [cursorX, cursorY - 2, cursorX + textWidth, cursorY + size];
          doc.context.addAnnotation({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: rect,
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: uri },
          });
        } catch (e) {
          console.warn('PDF-Link konnte nicht gesetzt werden:', e);
        }
      }

      cursorX += textWidth + 1;
    }
    cursorY -= lineHeight;
  }
}


function drawSuccessorPredexessorRow(item, allItems) {
  const predecessors = showPredecessors ? getPredecessors(item, allItems) : [];
  const successors   = showSuccessors   ? getSuccessors(item, allItems)   : [];

  const maxRows = Math.max(predecessors.length, successors.length, 1);


  const headerHeight = 13; // oder lineHeight
  const tab_lineheight = 10;
  const contentHeight = maxRows * tab_lineheight;
  const rowHeight = headerHeight + contentHeight + 2 * cellPadY;
  ensureSpace(rowHeight);

  const cellWidth = Math.floor((usableWidth - 2) / 2);

  // Kopfzeile
  page.drawRectangle({
    x: margin,
    y: y - rowHeight,
    width: usableWidth,
    height: rowHeight,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 0.25,
    color: rgb(0.98, 0.98, 0.94)
  });

  // Überschriften
  if(showPredecessors) {
    page.drawText("Vorgänger: ID | Name | Status | Deadline", {
      x: margin + cellPadX,
      y: y - cellPadY -7,
      size: 8,
      font: fontBold,
      color: rgb(0.35, 0.35, 0.35)
    });
  }
  if(showSuccessors) {
    page.drawText("Nachfolger: ID | Name | Anfang", {
      x: margin + cellWidth + cellPadX + 2,
      y: y - cellPadY -7,
      size: 8,
      font: fontBold,
      color: rgb(0.35, 0.35, 0.35)
    });
  }
  y = y - 4;
  for (let i = 0; i < maxRows; i++) {
    const pred = predecessors[i];
    const succ = successors[i];

    // Vorgänger: ID | Name | Status | Deadline
    let leftText = "";
    if (pred) {
      leftText = `[${pred.item.data.report_id || ""}] | ${pred.item.data.report_topic || ""} | ${pred.item.data.report_status || ""} | ${pred.item.data.report_deadline || ""}`;
    }

    // Nachfolger: ID | Name | Anfang (Deadline - Dauer)
    let rightText = "";
    if (succ) {
      // Anfang berechnen: Deadline - Dauer/Lag (sofern beides vorhanden)
      let startStr = "";
      const dline = succ.item.data.report_deadline;
      const lag = succ.dependency.lag;
      if (dline && lag && typeof lag.value === "number" && lag.unit) {
        startStr = calcStartFromDeadlineAndLag(dline, lag);
        startStr = formatDateDE(startStr);
      }
      rightText = `[${succ.item.data.report_id || ""}] | ${succ.item.data.report_topic || ""} | ${startStr}`;
    }

    page.drawText(leftText, {
      x: margin + cellPadX,
      y: y - cellPadY - headerHeight - i * tab_lineheight,
      size: 8,
      font,
      color: rgb(0.25, 0.25, 0.25)
    });

    page.drawText(rightText, {
      x: margin + cellWidth + cellPadX + 2,
      y: y - cellPadY - headerHeight - i * tab_lineheight,
      size: 8,
      font,
      color: rgb(0.25, 0.25, 0.25)
    });
  }
  y -= rowHeight;
}



    // --- Rekursive Traversierung mit Sortierung und Filtern ---
    const filtersSafe = {
      typ: Array.isArray(filters?.typ) ? filters.typ : [],
      status: Array.isArray(filters?.status) ? filters.status : [],
    };


      /*+
      function drawChangelogRow(item, entry) {
          console.log('Draw Changelog Row', {itemId: item.data.report_id, entry});
        // ---- Deine Logik wie oben, aber für einen Eintrag ----
        let cellValues = columns.map(col => {
          if (col === 'report_id') {
            const id = item.data.report_id || '';
            const date = formatDate(entry.timestamp);
            const user = entry.user;
            return id ? [id, date, user] : [date, user];
          }
          if (entry.changes && entry.changes.hasOwnProperty(col)) {
            return [entry.changes[col][1] || ''];
          }
          return [''];
        });

        const wrapped = cellValues.map((vals, i) =>
          Array.isArray(vals)
            ? vals.flatMap(val => wrapText(val, finalColWidths[i] - 2 * cellPadX))
            : wrapText(vals, finalColWidths[i] - 2 * cellPadX)
        );
        const maxLines = Math.max(...wrapped.map(lines => lines.length));
        const rowHeight = maxLines * (fontSize - 1 + 3) + 2 * cellPadY;

        ensureSpace(rowHeight);

        let x = margin;
        for (let i = 0; i < columns.length; i++) {
          page.drawRectangle({
            x,
            y: y - rowHeight,
            width: finalColWidths[i],
            height: rowHeight,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
            color: rgb(0.96, 0.96, 0.96)
          });

          let textY = y - cellPadY - (fontSize - 1 + 3);
            for (let lineIdx = 0; lineIdx < wrapped[i].length; lineIdx++) {
              let line = wrapped[i][lineIdx];
              let size = 8;
              let color = rgb(0.3,0.3,0.3);
              if (i === 0 && lineIdx === 1) { // 2. Zeile = Datum
                size = 8;
                color = rgb(0.45,0.45,0.45);
              }
              page.drawText(line, {
                x: x + cellPadX,
                y: textY,
                size,
                font,
                color
              });
              textY -= (fontSize - 1 + 3);
            }
          x += finalColWidths[i];
        }
        y -= rowHeight;
      };

**/


    const drawRow = (item) => {
      const cellValues = columns.map(col => {
        if (col === 'report_topic') {
          const topic = item.data.report_topic || '';
          const desc = item.data.report_desc || '';
          return desc ? `${topic}\n${desc}` : topic;
        }
        return item.data[col] || '';
      });

      const wrapped = cellValues.map((val, i) => wrapText(val, finalColWidths[i] - 2 * cellPadX));
      const maxLines = Math.max(...wrapped.map(lines => lines.length));
      const rowHeight = maxLines * lineHeight + 2 * cellPadY+8;

      ensureSpace(rowHeight);

      let x = margin;
      for (let i = 0; i < columns.length; i++) {
        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: finalColWidths[i],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
        });

        let textY = y - cellPadY - lineHeight;
        /*
        wrapped[i].forEach(line => {
          page.drawText(line, {
            x: x + cellPadX,
            y: textY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          textY -= lineHeight;
        });*/
        wrapped[i].forEach(line => {
          if (columns[i] === 'report_topic') {
            // Markdown-Zeichnung für Beschreibung
            drawMarkdownText(page, line, x + cellPadX, textY, {
              size: fontSize,
              font,
              boldFont: fontBold,
              italicFont: fontItalic, // oder ein eingebettetes italicFont
              fontUnderline: fontBold,
              color: rgb(0, 0, 0),
            });
          } else {
            page.drawText(line, {
              x: x + cellPadX,
              y: textY,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          }
          textY -= lineHeight;
        });

        x += finalColWidths[i];



      }
     

      y -= rowHeight;
    };


    const processItems = (items) => {
      const levelItems = Array.isArray(items) ? [...items] : [];
      levelItems.sort((a, b) => (a?.sort ?? 0) - (b?.sort ?? 0));

      //for (const item of items) {
      for (const item of levelItems) {
        if(!item || item.isDeleted)  continue;

        //if (item.isDeleted) continue;
        //if (item.type.startsWith('h')) continue;
         if (item.type && item.type.startsWith('h')) {
            const title = item.data?.report_topic || 'Überschrift';
            const id = item.data?.report_id || '';
            drawHeadline(id, title, item.type);
            
            if(Array.isArray(item.children) && item.children.length) {
              processItems(item.children);
            }
            continue;
          }


          //if (item.type !== 'p') continue;
         // Nur p-Einträge tabellarisch
        if (item.type !== 'p') {
          // Falls wider Erwarten andere Typen existieren -> Kinder trotzdem verarbeiten
          if (Array.isArray(item.children) && item.children.length) {
            processItems(item.children);
          }
          continue;
        }

const normalize = str => (str || '').trim().toLowerCase();

const typ    = normalize(item.data?.report_typ)    || 'sonstiges';
const status = normalize(item.data?.report_status) || 'sonstiges';

const selectedTypes   = filtersSafe.typ.map(normalize);
const selectedStatus  = filtersSafe.status.map(normalize);

if (selectedTypes.length && !selectedTypes.includes(typ)) continue;
if (selectedStatus.length && !selectedStatus.includes(status)) continue;

        drawRow(item);

        

        if ((showPredecessors || showSuccessors) && item.type === 'p') {
            console.log('Item', item.data?.report_id, item.id, item.data?.dependencies);
          drawSuccessorPredexessorRow(item, flatItems);
        }





            // *** Changelog-Zeilen: ***
            if (template === 'changelog') {
              /*const changelogEntries = (changelog[item.id] || [])
                .slice()
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                  console.log('Changelog-Einträge für', item.data.report_id, changelogEntries.length, changelogEntries);*/
 const entriesAsc = (changelog[item.id] || [])
   .filter(e => e.action === 'UPDATE')              // nur UPDATE betrachten
   .slice()
   .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));  // aufsteigend
 // „Erstellung“ = ältester UPDATE → überspringen
 const changelogEntries = entriesAsc.slice(1).reverse();            // wieder absteigend für Ausgabe
 console.log('Changelog-Einträge (ohne Erstellung) für', item.data.report_id, changelogEntries.length, changelogEntries);
              for (const entry of changelogEntries) {
                //if (entry.action !== 'UPDATE') continue;

                const wichtigeFelder = ['report_id', 'report_topic', 'report_desc', 'report_date', 'report_deadline', 'report_responsible', 'report_typ', 'report_status'];
                const hatRelevanteAenderung = wichtigeFelder.some(feld => {   
                  const c = entry.changes;
                    if (!c) return false;
                    if (feld === 'report_topic') {
                      return Object.prototype.hasOwnProperty.call(c, 'report_topic') ||
                            Object.prototype.hasOwnProperty.call(c, 'report_desc');
                    }
                    return Object.prototype.hasOwnProperty.call(c, feld);
                    });

                  if (!hatRelevanteAenderung) continue;
                  // NEU: Changelog-Zeile wie eine „Fake-Zeile“ zeichnen!
                  drawChangelogRow(item, entry);
              }
            }
          // Sicherheit: falls ein p-Item dennoch Kinder hätte
          if (Array.isArray(item.children) && item.children.length) {
            processItems(item.children);
          }
        }
    };

    
    drawTableHeader();
    processItems(list.items);
 
    


// Footer für alle Seiten setzen (nachdem alle Seiten existieren)
const pages = pdfDoc.getPages();
const total = pages.length;
pages.forEach((p, idx) => addFooter(p, idx + 1, total));


    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${list.meta.name}_export.pdf`;
    a.click();

    UIManager.showToast('PDF erfolgreich exportiert', 'success');
  }
};


