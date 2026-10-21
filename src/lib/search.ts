// Forgiving search for young people typing on a phone: matches word forms ("nurse" → "nursing"),
// everyday words to topics ("money" → Business, "cv" → Job skills), and ranks the best matches first.

import type { CourseSector } from "./courses";

/** Filler words that shouldn't decide what matches. */
const STOP = new Set([
  "a", "an", "the", "and", "or", "for", "in", "of", "to", "on", "with", "about", "my", "me", "i", "how",
  "want", "learn", "learning", "course", "courses", "free", "class", "classes", "study", "skills", "skill",
  "online", "certificate", "certificates", "do", "is", "be", "get", "some", "new",
]);

/** Everyday words → the topics people mean by them. */
const TOPIC_WORDS: Record<string, CourseSector[]> = {};
const add = (sectors: CourseSector[], words: string) => words.split(" ").forEach((w) => (TOPIC_WORDS[w] = sectors));
add(["Tech"], "tech technology it ict coding code coder programming programmer developer software web website websites html css internet cyber cybersecurity security hacking network networking data");
add(["Tech", "Job skills"], "computer computers laptop digital pc");
add(["Healthcare"], "health healthcare nurse nursing medical medicine clinic hospital care carer caregiver hygiene infection doctor pharmacy");
add(["Agriculture"], "agriculture agricultural agric farm farming farmer crops crop food livestock garden gardening");
add(["Business"], "business money finance financial accounting accountant bookkeeping budget admin administration office entrepreneur entrepreneurship shop");
add(["Marketing"], "marketing advertising adverts social media sales selling brand branding instagram facebook tiktok content customers");
add(["Job skills"], "job jobs work cv resume interview interviews career careers employment hired hiring email typing excel word literacy workplace");

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Rough English stem so "nursing", "nurses" and "nurse" meet in the middle. */
const stem = (w: string) => (w.length > 4 ? w.replace(/(ings|ing|ers|er|es|ed|s)$/, "") : w);

/** Meaningful words in the query. Only filler ("free courses") → [] → show everything. */
export function queryTokens(q: string): string[] {
  return words(q).filter((w) => !STOP.has(w));
}

function tokenMatchesText(token: string, text: string): boolean {
  const t = stem(token);
  return words(text).some((w) => {
    if (token.length <= 2) return w === token; // "it", "cv": whole words only
    const sw = stem(w);
    return sw.startsWith(t) || (sw.length >= 4 && t.startsWith(sw));
  });
}

export type Searchable = { fields: [text: string, weight: number][]; sectors: CourseSector[] };

/** 0 = no match. Higher = better. An empty query matches everything. */
export function searchScore(q: string, item: Searchable): number {
  const tokens = queryTokens(q);
  if (!tokens.length) return 1;
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [text, weight] of item.fields) if (tokenMatchesText(token, text)) best = Math.max(best, weight);
    if (TOPIC_WORDS[token]?.some((s) => item.sectors.includes(s))) best = Math.max(best, 1);
    score += best;
  }
  // Whole phrase found as typed (e.g. "social media") ranks highest.
  const phrase = q.trim().toLowerCase();
  if (phrase.includes(" ") && item.fields.some(([t]) => t.toLowerCase().includes(phrase))) score += 3;
  return score;
}

/**
 * Filters and ranks, keeping the original order for equal scores. When there are strong matches
 * (a word found in a title or skill), weak ones are dropped — "cyber security" shouldn't also
 * list the food *security* course.
 */
export function rank<T>(items: T[], q: string, toSearchable: (item: T) => Searchable): T[] {
  const scored = items.map((item, i) => ({ item, i, s: searchScore(q, toSearchable(item)) }));
  const max = Math.max(0, ...scored.map((x) => x.s));
  const min = max >= 3 ? max * 0.6 : Number.MIN_VALUE;
  return scored
    .filter((x) => x.s >= min)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
