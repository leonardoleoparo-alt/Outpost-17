# OUTPOST 17

OUTPOST 17 é um Tower Defense de navegador feito com HTML5, CSS3, JavaScript puro e Canvas.

## Jogar

O objetivo é defender o Outpost durante 20 waves usando quatro torres com upgrades, venda, targeting, Detection e Reveal.

### Torres

- Ranger — defesa generalista.
- Marksman — alto dano e grande alcance.
- Air Defense — especializada contra unidades aéreas.
- Scout — Detection e Reveal.

### Inimigos

- Grunt
- Runner
- Brute
- Glider
- Shade
- Phantom

## Controles

- Mouse: interação principal.
- Clique em uma torre da loja: seleciona para construção.
- Clique no mapa: posiciona ou seleciona uma torre.
- Clique direito: cancela o placement.
- `Esc`: pausa/continua.
- `START WAVE`: inicia a próxima wave antecipadamente.
- `1x / 2x`: altera a velocidade da simulação.

## Executar localmente

Como o projeto usa ES Modules, execute por um servidor local:

```bash
py -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Também funciona com Live Server no VS Code.

## GitHub Pages

O projeto é totalmente estático e pode ser publicado diretamente pelo GitHub Pages.

No repositório, use:

`Settings → Pages → Deploy from a branch → main → / (root)`

O arquivo `.nojekyll` já está incluído.

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- HTML5 Canvas
- ES Modules
- requestAnimationFrame

Sem frameworks, npm, backend ou banco de dados.

## Estrutura

```text
index.html
.nojekyll
README.md
css/
  style.css
js/
  economy.js
  effects.js
  enemies.js
  game.js
  input.js
  main.js
  map.js
  path.js
  projectile.js
  targeting.js
  towers.js
  ui.js
  utils.js
  waves.js
```

## Limitações atuais

- Desktop only para gameplay.
- Sem áudio.
- Sem save persistente.
- Sem multiplayer.
- Sem modo infinito.
