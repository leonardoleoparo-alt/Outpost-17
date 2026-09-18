# OUTPOST 17

OUTPOST 17 is a browser tower-defense game built with **HTML5 Canvas, CSS and vanilla JavaScript**.

Defend the Outpost through a 20-wave campaign by placing and upgrading four complementary tower types. Enemy properties are combined through generic Ground, Flying and Invisible targeting rules, including Detection and Reveal support.

## Play

Open the published GitHub Pages URL and press **PLAY**.

Desktop controls:

- **Mouse:** select, place and inspect towers
- **Right click:** cancel tower placement
- **ESC:** pause/resume
- **1x / 2x:** simulation speed

The current gameplay build is desktop-only. Mobile devices receive a lightweight desktop-play notice instead of starting the simulation.

## Towers

- **Ranger:** flexible generalist
- **Marksman:** long-range, high single-target damage
- **Air Defense:** specialized anti-air damage
- **Scout:** Detection and Reveal support

Each tower has four upgrade levels and can be sold for 70% of its total investment.

## Campaign

The campaign contains **20 waves** using six enemy variants built from the same generic targeting model:

- Grunt
- Runner
- Brute
- Glider
- Shade
- Phantom

The final waves combine Ground, Flying, Invisible and Flying + Invisible threats without adding a boss or a separate combat system.

## Audio and settings

Audio is generated procedurally with the Web Audio API; no external audio files are required.

Session settings include:

- Master Volume
- SFX Volume
- Reduced Motion
- Damage Numbers

These settings are **not persisted**. Reloading or reopening the page restores the defaults.

## Production structure

```text
index.html
app.js
favicon.svg
social-card.png
.nojekyll
src/
```

`app.js` is the single production bundle loaded by the page, reducing the JavaScript request chain. The readable modular source remains in `src/` for code review and portfolio purposes.

## Run locally

From the project folder:

```bash
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

The repository is ready for GitHub Pages. In **Settings → Pages**, publish the `main` branch from `/ (root)`.

The included `.nojekyll` file keeps the deployment as a plain static site.

## Current scope

Implemented:

- 20-wave campaign
- four tower types with four levels each
- tower placement, selection, upgrades and selling
- Ground / Flying / Invisible targeting
- Detection and Reveal
- 1x / 2x simulation
- pause, restart, Victory and Game Over
- procedural sound effects
- session-only accessibility/audio settings
- desktop responsive layouts

Not implemented: save/progression, multiplayer, multiple maps, bosses, endless mode, touch gameplay or external audio assets.
