// Canonical ids for everything a story script can reference. The validator test
// (tests/story.test.ts) fails the build if a script uses an id not listed here.

export interface BgDef {
  /** palette used by the procedural fallback / tint */
  palette: [string, string, string];
  /** lighting tint applied to characters standing in this scene */
  light: string;
  /** relative image path (optional until the art pass) */
  img?: string;
  /** wide panorama (hub) */
  wide?: boolean;
  /** particle preset that suits the scene by default */
  fx?: string;
  motif?: 'studio' | 'night' | 'ocean' | 'subway' | 'street' | 'airport' | 'home' | 'cinema' | 'practice' | 'rooftop' | 'lineart' | 'color' | 'arcade' | 'booth' | 'archive' | 'dawn' | 'cafe' | 'river' | 'patchwork' | 'hall';
}

export const BACKGROUNDS: Record<string, BgDef> = {
  // Studio 25 (present)
  studio_ext_night: { palette: ['#0b1030', '#27336b', '#e7a86a'], light: '#aab8ff', motif: 'street', fx: 'rain' },
  studio_lobby: { palette: ['#0e1236', '#3a2f6e', '#ffc98a'], light: '#c9c2ff', motif: 'studio', wide: true },
  studio_lobby_morning: { palette: ['#f6c9a7', '#9fb7e0', '#fff1d8'], light: '#fff0de', motif: 'studio', wide: true },
  studio_hall: { palette: ['#090d28', '#2b2466', '#8fe8ff'], light: '#b9c8ff', motif: 'hall', fx: 'memory' },
  studio_archive: { palette: ['#050818', '#18285a', '#9ff3ff'], light: '#a8e8ff', motif: 'archive', fx: 'memory' },
  studio_practice: { palette: ['#10131f', '#3a3040', '#ff6b6b'], light: '#f0e6ff', motif: 'practice' },
  studio_rooftop: { palette: ['#070b25', '#1d2a5c', '#c7d4ff'], light: '#b4c3ff', motif: 'rooftop', fx: 'stars' },
  studio_lounge: { palette: ['#141526', '#3b3350', '#ffb877'], light: '#ffe2c4', motif: 'studio' },
  studio_frontdesk: { palette: ['#0f1432', '#3a3a70', '#ffd6a0'], light: '#e8dcff', motif: 'studio', fx: 'dust' },
  // Memory rooms (past, reconstructed by ECHO)
  mem_beach: { palette: ['#040b26', '#123a78', '#b8f0ff'], light: '#9fd8ff', motif: 'ocean', fx: 'waves' },
  mem_subway: { palette: ['#0c0a1e', '#3a1850', '#ff5fb0'], light: '#ffc2e6', motif: 'subway', fx: 'rain' },
  mem_street_night: { palette: ['#0d0b24', '#43205e', '#ff7ac4'], light: '#ffc9ea', motif: 'street', fx: 'rain' },
  mem_airport: { palette: ['#0c1130', '#2d3c70', '#ffc56e'], light: '#ffe0b0', motif: 'airport', fx: 'dust' },
  mem_home: { palette: ['#3a2410', '#c47a2c', '#ffe3a6'], light: '#ffd9a0', motif: 'home', fx: 'light' },
  mem_cinema: { palette: ['#0c0616', '#3a1a52', '#d8b4ff'], light: '#dcc4ff', motif: 'cinema', fx: 'film' },
  mem_practice: { palette: ['#08070d', '#2a1420', '#ff4b4b'], light: '#fff0f0', motif: 'practice', fx: 'rhythm' },
  mem_rooftop_stars: { palette: ['#02031a', '#0f1a55', '#e6ecff'], light: '#c8d4ff', motif: 'rooftop', fx: 'stars' },
  mem_lineart: { palette: ['#f2f2ee', '#9aa3a8', '#2a3136'], light: '#ffffff', motif: 'lineart', fx: 'sketch' },
  mem_color: { palette: ['#dff4f0', '#45b0a8', '#f6c27a'], light: '#fff6ea', motif: 'color', fx: 'sketch' },
  mem_arcade: { palette: ['#0a0620', '#5a1a8c', '#58f5ff'], light: '#e6c8ff', motif: 'arcade', fx: 'prism' },
  mem_booth: { palette: ['#141022', '#403458', '#ffe7f2'], light: '#fff0f6', motif: 'booth' },
  mem_patchwork: { palette: ['#0d1030', '#4a3a78', '#ffcf9a'], light: '#ffe6c8', motif: 'patchwork', fx: 'memory' },
  // Dawn / endings
  dawn_street: { palette: ['#2a2a5a', '#e89a8a', '#ffe0b8'], light: '#ffe2d0', motif: 'dawn', fx: 'dust' },
  dawn_rooftop: { palette: ['#3a3a78', '#f2a38c', '#fff0c8'], light: '#ffe6d6', motif: 'dawn', fx: 'light' },
  dawn_cafe: { palette: ['#6a4a3a', '#e8b48a', '#fff4e0'], light: '#fff0de', motif: 'cafe', fx: 'dust' },
  dawn_subway: { palette: ['#384068', '#e0a898', '#fff2dc'], light: '#ffeede', motif: 'subway', fx: 'light' },
  dawn_river: { palette: ['#34406e', '#f0a080', '#ffe8c0'], light: '#ffe8d4', motif: 'river', fx: 'light' },
  black: { palette: ['#000000', '#05060c', '#11131f'], light: '#ffffff' },
};

export const CG_IDS = [
  'cg_arrival',
  'cg_echo',
  'cg_photo',
  'cg_ninth',
  'cg_true_breakfast',
  'cg_friendship',
  'cg_hamin_moment',
  'cg_hamin_ending',
  'cg_hyunjun_moment',
  'cg_hyunjun_ending',
  'cg_charlie_moment',
  'cg_charlie_ending',
  'cg_haruta_moment',
  'cg_haruta_ending',
  'cg_justin_moment',
  'cg_justin_ending',
  'cg_songha_moment',
  'cg_songha_ending',
  'cg_hanbi_moment',
  'cg_hanbi_ending',
  'cg_daniel_moment',
  'cg_daniel_ending',
  'cg_hamin_drama',
  'cg_hyunjun_drama',
  'cg_charlie_drama',
  'cg_haruta_drama',
  'cg_justin_drama',
  'cg_songha_drama',
  'cg_hanbi_drama',
  'cg_daniel_drama',
] as const;

export const VIDEO_IDS = [
  'vid_opening',
  'vid_hamin',
  'vid_hyunjun',
  'vid_charlie',
  'vid_haruta',
  'vid_justin',
  'vid_songha',
  'vid_hanbi',
  'vid_daniel',
  'vid_true',
  'vid_hamin_drama',
  'vid_hyunjun_drama',
  'vid_charlie_drama',
  'vid_haruta_drama',
  'vid_justin_drama',
  'vid_songha_drama',
  'vid_hanbi_drama',
  'vid_daniel_drama',
] as const;

export const MUSIC_IDS = [
  'title_night',
  'title_morning',
  'studio',
  'echo',
  'memory',
  'fun',
  'quiet',
  'tension',
  'dawn',
  'credits',
  'hamin',
  'hyunjun',
  'charlie',
  'haruta',
  'justin',
  'songha',
  'hanbi',
  'daniel',
] as const;

export const AMB_IDS = ['rain', 'ocean', 'city', 'subway', 'night', 'wind', 'arcade', 'cinema', 'room', 'cafe', 'birds'] as const;

export const SFX_IDS = [
  'door',
  'click',
  'chime',
  'echo',
  'glitch',
  'shutter',
  'whoosh',
  'step',
  'can',
  'vending',
  'train',
  'page',
  'pencil',
  'bell',
  'phone',
  'power_down',
  'power_up',
  'clap',
  'claw',
  'heart',
  'rain_hit',
  'projector',
  'wave',
] as const;

export const FX_IDS = ['memory', 'rain', 'stars', 'film', 'rhythm', 'prism', 'sketch', 'waves', 'snow', 'dust', 'light', 'glitch'] as const;

export const CAM_IDS = ['wide', 'closeup', 'twoshot', 'shoulder', 'pushin', 'reveal', 'orbit', 'pan'] as const;

export const EXPRESSIONS = ['neutral', 'smile', 'laugh', 'surprised', 'thinking', 'shy', 'sad'] as const;

export const POSITIONS = ['l', 'c', 'r', 'fl', 'fr'] as const;

export const TEXTBOXES = ['normal', 'memory', 'echo', 'phone'] as const;

export const MINIGAMES = ['rhythm', 'sketch'] as const;

export const CHAPTERS = [
  'prologue',
  'act1',
  'act2',
  'act3',
  'route',
  'act4',
  'ending',
  'newmem',
] as const;

/** Music unlock labels for the archive jukebox. */
export const MUSIC_TITLES: Record<string, string> = {
  title_night: '00:25',
  title_morning: 'Stay Until Morning',
  studio: 'Studio 25',
  echo: 'ECHO',
  memory: 'Future Letter',
  fun: '3 A.M. Snacks',
  quiet: 'Room Tone',
  tension: 'Unresolved Subject',
  dawn: '05:00',
  credits: 'New Memories',
  hamin: 'The Things You Notice',
  hyunjun: 'One More Stop',
  charlie: 'Where Home Is',
  haruta: 'The Scene We Didn’t Plan',
  justin: 'No Audience',
  songha: 'Tomorrow Can Wait',
  hanbi: 'Things Left Unsaid',
  daniel: 'Five More Minutes',
};
