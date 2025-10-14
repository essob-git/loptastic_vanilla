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

// utils.js

/**
 * Flattened array structure.
 * @param {Array} array - The array to flatten.
 * @returns {Array} - The flattened array.
 */
export const flatten = (array) => {
    return array.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
};

/**
 * Converts an object to a map.
 * @param {Object} obj - The object to convert.
 * @returns {Map} - The resulting map.
 */
export const toMap = (obj) => {
    return new Map(Object.entries(obj));
};

/**
 * Lexicographical comparison function.
 * @param {string} a - The first string.
 * @param {string} b - The second string.
 * @returns {number} - Comparison result.
 */
export const lexCompare = (a, b) => {
    return a.localeCompare(b);
};

/**
 * Builds a sort key for sorting purposes.
 * @param {Object} item - The item to build the key from.
 * @returns {string} - The sort key.
 */
export const buildSortKey = (item) => {
    return item.name.toLowerCase();
};

export const formatGermanDate = (isoDateStr) => {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Weitere Helperfunktionen hier hinzufügen ...