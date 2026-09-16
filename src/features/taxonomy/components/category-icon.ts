import {
  Briefcase,
  Code2,
  Megaphone,
  MessageSquareText,
  Music2,
  Palette,
  PenTool,
  Video,
  type LucideIcon,
} from 'lucide-react';

// E24 has no icon field. This is a presentational lookup only, not fabricated
// backend data — unmatched names fall back to a single generic icon.
const KEYWORD_ICONS: ReadonlyArray<readonly [string, LucideIcon]> = [
  ['graphic', Palette],
  ['design', Palette],
  ['market', Megaphone],
  ['writ', PenTool],
  ['translat', MessageSquareText],
  ['video', Video],
  ['animat', Video],
  ['music', Music2],
  ['audio', Music2],
  ['program', Code2],
  ['tech', Code2],
];

export function resolveCategoryIcon(categoryName: string): LucideIcon {
  const normalized = categoryName.toLowerCase();
  for (const [keyword, icon] of KEYWORD_ICONS) {
    if (normalized.includes(keyword)) return icon;
  }
  return Briefcase;
}
