/**
 * Hilfsfunktionen für das kontextbezogene Hilfesystem.
 *
 * Ziel:
 * - Wiederverwendbare Logik aus dem HelperManager auslagern
 * - Datenaufbereitung (Gruppierung, Sortierung, ID-Normalisierung) zentral halten
 */

/**
 * Entfernt führende # Zeichen aus einer Topic-ID.
 * @param {string|null|undefined} topicId
 * @returns {string}
 */
export function normalizeTopicId(topicId) {
  return String(topicId || '').replace(/^#/, '').trim();
}

/**
 * Liefert den Artikel zu einer Topic-ID.
 * @param {Array<{id: string}>} entries
 * @param {string|null|undefined} topicId
 * @returns {object|null}
 */
export function findTopicById(entries, topicId) {
  const cleanId = normalizeTopicId(topicId);
  if (!cleanId) return null;
  return entries.find(section => section.id === cleanId) || null;
}

/**
 * Gruppiert Hilfetexte nach Kategorie und sortiert Kategorien + Inhalte alphabetisch.
 * @param {Array<{category?: string, title: string}>} entries
 * @returns {{ categories: Record<string, Array>, sortedCategories: string[] }}
 */
export function groupEntriesByCategory(entries) {
  const categories = {};

  entries.forEach(entry => {
    const category = entry.category || 'Allgemein';
    if (!categories[category]) categories[category] = [];
    categories[category].push(entry);
  });

  const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b));
  sortedCategories.forEach(category => {
    categories[category].sort((a, b) => a.title.localeCompare(b.title));
  });

  return { categories, sortedCategories };
}

/**
 * Liefert alle Einträge derselben Kategorie wie das Referenz-Topic.
 * @param {Array<{category?: string, title: string}>} entries
 * @param {object} referenceTopic
 * @returns {Array}
 */
export function getCategoryEntries(entries, referenceTopic) {
  const category = referenceTopic?.category || 'Allgemein';
  return entries
    .filter(entry => (entry.category || 'Allgemein') === category)
    .sort((a, b) => a.title.localeCompare(b.title));
}
