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

/**
 * Strukturierte Hilfetexte für die kontextbezogene Hilfe.
 *
 * Hinweise:
 * - `id` muss eindeutig sein und wird von Buttons/Links verwendet.
 * - `category` steuert die Gruppierung in der Sidebar.
 * - `text` enthält HTML und wird direkt in der Hilfe angezeigt.
 */
export const HelperContent = [
  {
    id: 'hilfe-projekte',
    title: 'Projekte verwalten',
    category: 'Projekte',
    text: `
      <p>Hier lernst du, wie Projekte angelegt, geöffnet und gespeichert werden.</p>
      <ul>
        <li><strong>Neues Projekt:</strong> Erstellt ein leeres Projekt.</li>
        <li><strong>Projekt öffnen:</strong> Lädt eine vorhandene <code>.lop</code>-Datei.</li>
        <li><strong>Projekt speichern:</strong> Exportiert den aktuellen Stand als <code>.lop</code>.</li>
      </ul>
    `
  },
  
  {
    id: 'hilfe-lists-new',
    title: 'Neue Liste',
    category: 'Listen',
    text: `
      <p>Jedes Projekt kann mehrere Listen enthalten.</p>
      <p>Beim Erstellen einer Liste sind folgende Felder wichtig:</p>
      <ul>
        <li><strong>Listenname:</strong> Eindeutiger Name der Liste.</li>
        <li><strong>Beschreibung:</strong> Zweck oder Umfang der Liste.</li>
        <li><strong>Phase:</strong> Zuordnung zu einer Projektphase.</li>
      </ul>
    `
  },
  {
    id: 'hilfe-lists-del',
    title: 'Liste löschen',
    category: 'Listen',
    text: '<p>Listen können über die Listenverwaltung gelöscht werden.</p>'
  },
  {
    id: 'hilfe-lists-overview',
    title: 'Listenverwaltung',
    category: 'Listen',
    text: `
      <p>In der Listenverwaltung siehst du alle Listen des aktuellen Projekts.</p>
      <p>In der linken Sidebar werden zusätzlich die zuletzt bearbeiteten Listen hervorgehoben.</p>
    `
  },
  {
    id: 'hilfe-item-add',
    title: 'Überschrift oder Punkt hinzufügen',
    category: 'Items',
    text: `
      <h5>Überschriften</h5>
      <p>Es stehen drei Ebenen zur Verfügung:</p>
      <ul>
        <li>Überschrift 1 (H1)</li>
        <li>Überschrift 2 (H2)</li>
        <li>Überschrift 3 (H3)</li>
      </ul>
      <h5>Punkt</h5>
      <p>Ein Punkt ist der eigentliche Aufgaben-Eintrag in der Liste.</p>
      <hr>
      <p><strong>Hinweis:</strong> Orange markierte Elemente müssen per Drag &amp; Drop einer übergeordneten Struktur zugeordnet werden.</p>
    `
  },
  {
    id: 'hilfe-itemslist',
    title: 'Items – Übersicht',
    category: 'Items',
    text: '<p>Hier findest du die Übersicht aller Einträge der aktuellen Liste.</p>'
  },
  {
    id: 'hilfe-itemlist-editor',
    title: 'Items und Struktur',
    category: 'Items',
    text: `
      <p>Im Item-Editor werden Überschriften und Aufgabenpunkte bearbeitet.</p>
      <h5>Typ: Überschrift</h5>
      <ul>
        <li><strong>ID:</strong> Optionale Kennung (keine Automatik).</li>
        <li><strong>Thema:</strong> Eindeutige Überschrift für den Abschnitt.</li>
        <li><strong>Beschreibung:</strong> Optionaler Zusatztext.</li>
      </ul>
      <h5>Typ: Listen-Element</h5>
      <p>Für Punkte stehen zusätzliche Felder wie Status, Verantwortliche und Fristen zur Verfügung.</p>
    `
  },
  {
    id: 'hilfe-project-add',
    category: 'Projekte',
    title: 'Neues Projekt',
    text: '<p>Erstellt eine neue Projektstruktur als Basis für Listen, Items und Auswertungen.</p>'
  },
  {
    id: 'hilfe-project-open',
    category: 'Projekte',
    title: 'Projekt öffnen',
    text: '<p>Öffnet eine vorhandene Projektdatei im Format <code>*.lop</code> aus dem lokalen Dateisystem.</p>'
  },
  {
    id: 'hilfe-project-save',
    category: 'Projekte',
    title: 'Projekt speichern',
    text: '<p>Speichert den aktuellen Projektstand als <code>*.lop</code>-Datei über den Browser-Download.</p>'
  },
  {
    id: 'hilfe-dashboard',
    category: 'Projekte',
    title: 'Dashboard',
    text: '<p>Das Dashboard zeigt eine kompakte Übersicht über offene und ausstehende Aufgaben.</p>'
  },
 {
    id: 'hilfe-ItemList',
    category: 'Projekte',
    title: 'ItemList',
    text: '<p></p>'
  },

  {
    id: 'hilfe-mode-advancedMode',
    category: 'Allgemein',
    title: 'advancedMode',
    text: '<p></p>'
  },
    {
    id: 'hilfe-mode-planMode',
    category: 'Allgemein',
    title: 'planMode',
    text: '<p></p>'
  },
  
];
