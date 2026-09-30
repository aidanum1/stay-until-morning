import './styles.css';
import { Game } from './game/game';
import { UI } from './ui/ui';
import { loadLang, t, setVar } from './localization/i18n';
import type { Lang } from './game/state';

async function boot() {
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLElement;
  const bootEl = document.getElementById('boot') as HTMLElement;

  let game: Game;
  try {
    game = new Game(canvas);
  } catch (e) {
    bootEl.innerHTML = `<div style="padding:24px;text-align:center;font-family:sans-serif">WebGL is not available in this browser.<br><small>${(e as Error).message}</small></div>`;
    return;
  }
  // language: saved → browser guess → English (first launch asks explicitly)
  const saved = game.persistent.language;
  const guess = (): Lang => {
    const l = (navigator.language || 'en').toLowerCase();
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('zh')) return 'zh-CN';
    return 'en';
  };
  await loadLang(saved ?? guess());
  setVar('playerName', game.persistent.lastPlayerName);
  document.title = t('ui.title_full');

  const ui = new UI(uiRoot, game);
  game.ui = ui;

  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  game.start();
  bootEl.classList.add('hide');
  setTimeout(() => bootEl.remove(), 700);

  const showMenu = () => {
    game.toMenu();
  };
  if (!game.persistent.firstLaunchDone) {
    game.mode = 'menu';
    game.stage.setBackground('studio_ext_night', 'fade', 2);
    game.stage.setFx('rain', 0.6);
    ui.panels.firstLaunch(showMenu);
  } else showMenu();

  // first user gesture unlocks audio everywhere
  const unlock = () => {
    game.unlockAudio();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

boot().catch((e) => {
  console.error(e);
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.innerHTML = `<div style="padding:24px;text-align:center;font-family:sans-serif">Failed to start.<br><small>${(e as Error).message}</small></div>`;
});
