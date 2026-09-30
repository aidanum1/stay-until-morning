// Credits roll content. Text keys are localised; names stay as written.

export interface CreditLine {
  key?: string;
  text?: string;
}

export const CREDITS: { titleKey: string; lines: CreditLine[] }[] = [
  { titleKey: 'credits.story', lines: [{ key: 'credits.story_line' }] },
  {
    titleKey: 'credits.featuring',
    lines: [
      { key: 'credits.featuring_line' },
      { text: 'Hamin · Hyunjun · Charlie · Haruta' },
      { text: 'Justin · Songha · Hanbi · Daniel' },
    ],
  },
  { titleKey: 'credits.you', lines: [{ key: 'credits.you_line' }] },
  { titleKey: 'credits.echo', lines: [{ key: 'credits.echo_line' }] },
  { titleKey: 'credits.music', lines: [{ key: 'credits.music_line' }] },
  { titleKey: 'credits.art', lines: [{ key: 'credits.art_line' }] },
  { titleKey: 'credits.localization', lines: [{ key: 'credits.localization_line' }] },
  { titleKey: 'credits.engine', lines: [{ text: 'Vite · TypeScript · Three.js · Web Audio' }] },
  { titleKey: 'credits.thanks', lines: [{ key: 'credits.thanks_line' }] },
  { titleKey: 'credits.made', lines: [{ key: 'credits.made_line' }] },
];
