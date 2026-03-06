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
import { DebugLogger } from './debugLogger.js';

// holidayManager.js
export const HolidayManager = {
  async getNRWHolidays(year) {
    try {
      const res = await fetch(`https://feiertage-api.de/api/?jahr=${year}&nur_land=NW`);
      if (!res.ok) return [];
      const data = await res.json();
      return Object.values(data).map(h => ({
        date: h.datum, // YYYY-MM-DD
        label: h.name,
        color: "#ffd9d9"
      }));
    }catch (err) {
     DebugLogger.warn("⚠️ Feiertage API nicht erreichbar:", err);
      return [];
    }
  },

  async getNRWVacations(year) {
    const res = await fetch(`https://ferien-api.de/api/v1/holidays/NW/${year}`);
    try {
      if (!res.ok) return [];
      const data = await res.json();

      // jeden Zeitraum in einzelne Tage auflösen
      const days = [];
      data.forEach(f => {
        const start = new Date(f.start);
        const end = new Date(f.end);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push({
            date: d.toISOString().split("T")[0],
            label: f.name,
            color: "#d4edda"
          });
        }
      });
      return days;
    }catch (err) {
        DebugLogger.warn("⚠️ Ferien API nicht erreichbar:", err);
        return [];
    }
  },

 async getAllMarkedDays(year) {
    try{
      const [holidays, vacations] = await Promise.all([
        this.getNRWHolidays(year),   // aktuell {date, label} oder {date}
        this.getNRWVacations(year)
      ]);

      const holidayMap = {
        "#f0f0f0": "weekend",

        // Frappe will Strings → nur die date-Werte nehmen
        "#ffd9d9": holidays.map(h => h.date),

        // Ferien: dürfen Objekte mit Label sein
        "#d4edda": vacations.map(v => v.date)
      };

      return holidayMap;
    }catch (err) {
            DebugLogger.warn("⚠️ Fehler beim Laden der Feiertage/Ferien:", err);
          return { "#f0f0f0": "weekend" }; // Fallback nur Wochenende
    }
  }

};
