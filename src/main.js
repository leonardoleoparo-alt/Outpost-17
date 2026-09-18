import { Game } from './game.js';
import { GameUI } from './ui.js';

const DESKTOP_QUERY = '(min-width: 900px)';
const desktopMedia = window.matchMedia(DESKTOP_QUERY);
let game = null;

function startDesktopGame() {
  if (game || !desktopMedia.matches) return;
  const canvas = document.querySelector('#gameCanvas');
  const ui = new GameUI();
  game = new Game(canvas, ui);
  game.setReducedMotion(game.settings.reducedMotion);
  game.start();
}

startDesktopGame();
desktopMedia.addEventListener('change', startDesktopGame);
