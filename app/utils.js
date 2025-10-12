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