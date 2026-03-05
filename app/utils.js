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
import { DebugLogger } from './debugLogger.js';

// utils.js

// ### Datenstruktur ###

    /**
     * Generiert eine eindeutige UUID.
     * @returns {string} Die generierte UUID.
     */
    export function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Erstellt eine tiefe Kopie eines Objekts.
     * @param {object} obj - Das zu klonende Objekt.
     * @returns {object} Tief kopiertes Objekt.
     */
    export function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Erstellt eine wirklich tiefe Kopie eines Objekts.
     * Nutzt structuredClone, falls verfügbar, sonst Fallback auf JSON.
     * @param {object} obj - Zu klonendes Objekt.
     * @returns {object} Tief kopiertes Objekt.
     */
    export function deepCloneSafe(obj) {
    if (typeof structuredClone === "function") {
        try {
        return structuredClone(obj);
        } catch (e) {
        DebugLogger.warn("structuredClone fehlgeschlagen, fallback auf JSON:", e);
        }
    }
    return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Vergleicht zwei Objekte auf tiefgehende Gleichheit.
     * @param {object} a - Erstes Objekt.
     * @param {object} b - Zweites Objekt.
     * @returns {boolean} true wenn gleich, sonst false.
     */
    export function deepEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }



// ### Datum und Zeit

    /**
     * Formatiert ein Datum als deutsche Datums-/Zeitzeichenkette.
     * @param {string|Date} dateString - Ein Datum oder Datum-String.
     * @returns {string} Datums-/Zeitformat (deutsch).
     */
    export function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    export const formatGermanDate = (isoDateStr) => {
        if (!isoDateStr) return '';
        const d = new Date(isoDateStr);
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    }

