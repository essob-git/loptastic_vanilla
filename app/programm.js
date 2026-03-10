/**
 * LopTastic – Community Edition
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

import { UIManager } from "./uiManager.js";

export const Programm = {
     version: "0.26.0",

    getName()      { return 'LopTastic'; },
    getVersion()   { return `${this.version}-alpha`; },
    getVersionNumber() {return this.version},
    getGitHubSite() { return 'https://github.com/essob-git/loptastic_vanilla'},
    getCopyright() {
        const author = "Sven Bosse"
        const year = new Date().getFullYear();
        return `© ${year} - ${author}`;
    },



     /**
         * Zeigt ein Modal mit den verwendeten externen Bibliotheken und deren Lizenzen
         */
        showLicenseModal() {
    const libs = [
        { name: "Bootstrap", license: "MIT License", url: "https://getbootstrap.com/" },
        { name: "Bootstrap Icons", license: "MIT License", url: "https://icons.getbootstrap.com/" },
        { name: "JSZip", license: "MIT License", url: "https://stuk.github.io/jszip/" },
        { name: "Tempus Dominus", license: "MIT License", url: "https://getdatepicker.com/" },
        { name: "diff-match-patch", license: "Apache License 2.0", url: "https://github.com/google/diff-match-patch" },
        { name: "SheetJS (xlsx)", license: "Apache License 2.0", url: "https://sheetjs.com/" },
        { name: "Popper.js", license: "MIT License", url: "https://popper.js.org/" },
        { name: "frappe.io/gantt", license: "MIT License", url: "https://github.com/frappe/gantt/" },
        { name: "marked", license: "MIT License", url:"https://marked.js.org/" }
    ];
    
    // Zusatzabschnitt: Externe Dienste
    const services = [
        { name: "Feiertage API", url: "https://feiertage-api.de" },
        { name: "Ferien API", url: "https://ferien-api.de" }
    ];
    
    
            const body = `
            <div class="container">
                <div class="row mb-3">
                    <div class="col">
                        <h5>${this.getName()} ${this.getVersion()}</h5>
  <p>${this.getCopyright()}  –  Lizenz: AGPL v3  –  <a href="${this.getGitHubSite()}" alt="GitHub Link">${this.getGitHubSite()}</a></p>
                 
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                          <p>LopTastic verwendet folgende externe Open-Source-Bibliotheken. <br>
                        Jede Bibliothek behält ihre eigene Lizenz:</p>
                    </div>
                </div>
               
                <div class="row">
                     <div class="col-md-8">
                      <h6>Externe Libs</h6>
                        <ul class="list-group list-group-flush">
                            ${libs.map(lib => `
                                <li class="list-group-item small">
                                    <strong>${lib.name}</strong><br>
                                    <small>
                                        Lizenz: ${lib.license} – 
                                        <a href="${lib.url}" target="_blank">${lib.url}</a>
                                    </small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="col-md-4">
                        <h6>Externe Dienste</h6>
                        <ul class="list-group list-group-flush">
                            ${services.map(s => `
                                <li class="list-group-item small">
                                    <strong>${s.name}</strong><br>
                                    <small><a href="${s.url}" target="_blank">${s.url}</a></small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            `;
    
            UIManager.showModal("Über LopTastic & Lizenzen", body, null, "lg");
        },



        showDisclaimer() {

            const body = `
               <div class="container mb-3">
              
                        <h5>${this.getName()} ${this.getVersion()}</h5>
                        <p>${this.getCopyright()}  –  Lizenz: AGPL v3  –  <a href="${this.getGitHubSite()}" alt="GitHub Link">${this.getGitHubSite()}</a></p>
                 
                </div>

<h2>Haftungsausschluss (Disclaimer)</h2>
<p><strong>Stand:</strong> 02. Oktober 2025</p>

<h3 >Allgemeine Hinweise</h3>
<p>
Die Software <strong>„LopTastic“</strong> wird unter der
<strong>GNU Affero General Public License Version 3 (AGPL v3)</strong> als freie Software veröffentlicht.
Die Bereitstellung, Installation, Konfiguration und der laufende Betrieb der Software
erfolgen durch den jeweiligen Betreiber, der die Software einsetzt.
Der Entwickler dieser Software stellt keine Hosting- oder Betriebsdienstleistungen bereit.
</p>

<h3>Haftung für Inhalte</h3>
<p>
Der Entwickler übernimmt keine Verantwortung für die Inhalte,
die mit der Software erstellt, gespeichert oder verbreitet werden.
Für die Einhaltung gesetzlicher Vorgaben, Datenschutz- oder Aufbewahrungspflichten
sowie für die Richtigkeit der eingegebenen Daten ist allein der jeweilige Betreiber verantwortlich.
</p>

<h3>Haftungsausschluss für Nutzung der Software</h3>
<p>
Dieses Programm wird in der Hoffnung bereitgestellt, dass es nützlich ist,
jedoch <strong>ohne jegliche Gewährleistung oder Haftung</strong>.
Es wird <strong>keine ausdrückliche oder stillschweigende Garantie</strong> übernommen –
insbesondere nicht hinsichtlich der Marktgängigkeit, der Fehlerfreiheit,
der Eignung für einen bestimmten Zweck oder des Nichtverstoßes gegen Rechte Dritter.
</p>
<p>
Der gesamte Nutzungs-, Funktions-, Risiko- und Gewährleistungsumfang liegt ausschließlich beim Anwender.
Eine Haftung des Autors oder anderer Rechteinhaber für unmittelbare, mittelbare,
zufällige oder Folgeschäden (einschließlich Datenverlust, Nutzungsausfall
oder sonstige wirtschaftliche Verluste), die aus der Nutzung oder Unmöglichkeit
der Nutzung dieses Programms entstehen, ist – soweit gesetzlich zulässig –
ausgeschlossen. Eine Haftung bei nachweislich vorsätzlichem oder grob fahrlässigem
Verschulden bleibt unberührt.
</p>

<h3>Externe Dienste</h3>
<p>
Die Software kann externe Schnittstellen oder Dienste nutzen
(z.&nbsp;B. Feiertage-API, Ferien-API oder andere Web-Dienste).
Für deren Verfügbarkeit, Richtigkeit oder Aktualität übernimmt der Entwickler keine Gewähr.
Die Nutzung dieser Dienste erfolgt eigenverantwortlich durch den Betreiber;
gegebenenfalls gelten die Nutzungs- oder Datenschutzbedingungen der jeweiligen Anbieter.
</p>

<h3>Urheberrecht und Lizenz</h3>
<p>
Die durch den Entwickler erstellte Software unterliegt dem deutschen Urheberrecht
und wird unter der <strong>GNU Affero General Public License v3</strong> bereitgestellt.
Eine Vervielfältigung, Bearbeitung, Verbreitung oder sonstige Verwendung außerhalb
der Lizenzbedingungen ist nicht gestattet.
Weitere Einzelheiten ergeben sich aus der Lizenz selbst:
<a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank">
https://www.gnu.org/licenses/agpl-3.0.en.html</a>.
Der englische Originaltext dieser Lizenz ist allein rechtsverbindlich.
</p>

<h3>Schlussbestimmungen</h3>
<p>
Der Entwickler behält sich vor, Änderungen oder Weiterentwicklungen der Software vorzunehmen.
Der Einsatz der Software erfolgt unter Beachtung der jeweils gültigen Lizenzbedingungen.
Im Falle von Abweichungen oder Widersprüchen zwischen diesem Haftungsausschluss
und den Bestimmungen der GNU Affero General Public License v3
gelten ausschließlich die Bestimmungen der AGPL v3.
</p>

            `;

            UIManager.showModal("Haftung", body, null, "lg");
        }
};



export const compareVersions = (v1, v2) => {
    const toNumbers = v => v.split('.').map(num => parseInt(num, 10));
    const [a1, b1, c1] = toNumbers(v1);
    const [a2, b2, c2] = toNumbers(v2);

    if (a1 !== a2) return a1 - a2;
    if (b1 !== b2) return b1 - b2;
    return c1 - c2;
};
