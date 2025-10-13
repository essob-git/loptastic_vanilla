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
 * Kontakt: https://github.com/essob-git
 *
 * Hinweis:
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */


// helpContent.js
export const HelperContent = [
  {
    id: "hilfe-projekte",
    title: "Projekte verwalten",
    category: "Project",
    text: `
      <p>Hier lernst du, wie man Projekte anlegt, speichert und lädt.</p>
      <ul>
        <li>Projekt anlegen: Name, Beschreibung, Nummern, Projektleiter</li>
        <li>Speichern: Projekt als .lop-Datei sichern</li>
        <li>Laden: Bestehende .lop-Datei öffnen</li>
      </ul>
    `
  },
  
  {
    id: "hilfe-lists-new",
    title: "Neue Liste",
    category: "Listen",
    text: `
      <p>Jedes Projekt kann mehrere Listen enthalten.<br>
      Die Verwaltung der Listen erfolgt über die "Listenverwaltung."</p>
      <p>
        <ul>
            <li><strong>Listenname</strong> Name der Liste</li>
            <li><strong>Beschreibung</strong> Beschreibung zu der Liste</li>
            <li><strong>Phase</strong> Zuordnung einer Phase</li>
        </ul>
      </p>
    `
  },
  {
    id: "hilfe-lists-del",
    title: "Liste löschen",
    category: "Listen",
    text: `
      <p>Listen können gelöscht werden.</p>
    `
  },
{
    id: "hilfe-lists-overview",
    title: "Listenverwaltung",
    category: "Listen",
    text: `
      <p>Jedes Projekt kann mehrere Listen enthalten.<br>
      Die Verwaltung der Listen erfolgt über die "Listenverwaltung."</p>

      <p>In der Sidebar (links am Rand) werden die letzten drei bearbeiteten Listen angezeigt. Alle anderen Listen die über die drei hinausgehen, werden in der Listenverwaltung agezeigt.</p>
    `
  },
  // -- ITEM
  {
    id: "hilfe-item-add",
    title: "Überschrift hinzufügen",
    category: 'Items',
    text: `<h5>Headline</h5>
    <p>Es können drei HEadline Gruppen erstellt werden: 
      <ul>
        <ol>1. Ebene (H1)</ol>
        <ul>
          <ol>1.1 Ebene (H2)</ol>
          <ul>
            <ol>1.1.1 Ebene (H3)<ol>
          </ul>
        </ul>
      </ul>
    </p>
    <h5>Punkt</h5>
    <p>Der eigentliche Aufgabenpunkt in der LoP-Liste ist der "Punkt".</p>
    <hr>
    <h5>farbliche Darstellung</h5>
    <p>Elemente die orange angezeigt werden, <strong>müssen</strong> einem anderen Element per drag & drop zugeordnet werden.</p>
    `
  },
  {
    id: "hilfe-itemslist",
    title: "Items Überisch",
    category: 'Items',
    text: `Noch kein Eintrag`
  },
  {
    id: "hilfe-itemlist-editor",
    title: "Items und Struktur",
    category: 'Items',
    text: `
      <p>Im Item-Editor werden die Einträge bearbeitet. Es können die Headlines (Überschriften) und die Listen-Elemente bearbeitet werden.
      Der Umfang der Felder ist bei beiden Typen unterschieldich.</p>
     <h5>Headline / Überschrift</h5>
     <p>Hier können insgesamt drei Felder ausgefüllt werden:
      <ul>
        <li><strong>ID</strong> Identnummer des Eintrags. [Keine Automatik]</li>
        <li><strong>Thema</strong> Eindeutige Überschrift für die Kategorie</li>
        <li><strong>Beschreibung</strong> Ggf. kann eine Beschreibung eingegeben werden</li>
      </ul>
     </p>
     <h5>Listen-Element</h5>
     <p></p>
    `
  },




  // -- PROJEKTE 
{
    id: "hilfe-project-add",
    category: "Projekte",
    title: "Neues Projekt",
    text: `
      <p>Das Projekt ASS bietet eine einfache Übersicht über bestimmte Aufgaben im Projekt.<br>
      Dazu zählen insbeosondere eine Auflistung der "offnen" und der "ausstehenden" Aufgaben.</p>
    `
},
{
    id: "hilfe-project-open",
    category: "Projekte",
    title: "Projekt öffnen",
    text: `
      <p>Zum öffnen muss die Projektdatei *.lop aus dem lokalen Dateiverzeichnis geöffnet werden.</p>
    `
},
{
    id: "hilfe-project-save",
    category: "Projekte",
    title: "Projekt speichern",
    text: `
      <p>Beim Speichern wird eine *.lop Datei über den Browser heruntergeladen. Diese Datei muss dann ins loakle Dateiverzeichnis verschoben werden.</p>
    `
},
{
    id: "hilfe-dashboard",
    category: "Projekte",
    title: "Dashboard",
    text: `
      <p>Das Dashboard bietet eine einfache Übersicht über bestimmte Aufgaben im Projekt.<br>
      Dazu zählen insbeosondere eine Auflistung der "offnen" und der "ausstehenden" Aufgaben.</p>
    `
  },

  // … usw. für alle Kapitel
];
