# OUTPOST 17 — Tower Defense

OUTPOST 17 é um Tower Defense clássico de navegador construído com HTML, CSS, JavaScript puro e Canvas. O jogador protege um Outpost no final de uma rota fixa em uma floresta estilizada, posiciona quatro tipos de torre, compra upgrades, administra dinheiro e responde a combinações de inimigos Ground, Flying, Invisible e Flying + Invisible.

A campanha principal está completa: **20 Waves**, Victory, Game Over, 1x/2x e pausa real.

## Gameplay

- Um mapa de floresta com rota sinuosa fixa.
- Outpost com 100 HP.
- Uma moeda: dinheiro.
- 20 Waves com progressão de aprendizado → adaptação → estratégia → pressão → ataque final.
- Quatro torres, Levels 1–4, upgrade e venda por 70% do investimento.
- Seis inimigos construídos a partir de propriedades genéricas Ground/Flying/Invisible.
- Targeting padrão `FIRST`: maior `pathProgress` entre alvos válidos.
- Detection e Reveal por distância.
- Velocidade 1x / 2x.
- Pausa real (0x) que preserva a velocidade selecionada.
- Victory e Game Over com estatísticas da partida.
- PLAY AGAIN / TRY AGAIN com reset completo.
- Desktop-first; mobile recebe uma landing informativa em vez de controles touch incompletos.

## Regras de targeting

As regras não dependem do nome do inimigo.

- Ground exige `canTargetGround`.
- Flying exige `canTargetFlying`.
- Invisible exige `hasDetection === true` **ou** `enemy.isRevealed === true`.

As condições são independentes. Reveal resolve apenas invisibilidade; não concede Anti-Air. Portanto, por exemplo, Ranger L3 + Scout Reveal pode atacar Phantom, mas Ranger L1 + Reveal continua incapaz porque não possui Anti-Air.

`FIRST` sempre escolhe o inimigo com maior `pathProgress` entre os alvos que passaram por todas as regras acima.

## Torres

### Ranger — $250

Generalista barato e flexível.

| Level | Damage | Range | Fire Rate | Ground | Flying | Detection |
|---|---:|---:|---:|:---:|:---:|:---:|
| 1 | 18 | 180 | 0.72s | ✓ | ✕ | ✕ |
| 2 | 27 | 198 | 0.62s | ✓ | ✕ | ✕ |
| 3 | 36 | 214 | 0.56s | ✓ | ✓ | ✕ |
| 4 | 48 | 232 | 0.50s | ✓ | ✓ | ✓ |

Upgrades: $225 / $400 / $575.

### Marksman — $525

Dano individual alto, grande alcance e cadência lenta.

| Level | Damage | Range | Fire Rate | Ground | Flying | Detection |
|---|---:|---:|---:|:---:|:---:|:---:|
| 1 | 58 | 300 | 1.62s | ✓ | ✕ | ✕ |
| 2 | 92 | 342 | 1.52s | ✓ | ✕ | ✕ |
| 3 | 128 | 368 | 1.43s | ✓ | ✕ | ✓ |
| 4 | 176 | 395 | 1.34s | ✓ | ✓ | ✓ |

Upgrades: $350 / $500 / $700.

### Air Defense — $425

Especialista aéreo. Continua muito mais eficiente contra Flying do que as torres generalistas.

| Level | Damage | Range | Fire Rate | Ground | Flying | Detection |
|---|---:|---:|---:|:---:|:---:|:---:|
| 1 | 30 | 222 | 0.58s | ✕ | ✓ | ✕ |
| 2 | 43 | 232 | 0.47s | ✕ | ✓ | ✕ |
| 3 | 59 | 248 | 0.40s | ✕ | ✓ | ✓ |
| 4 | 84 | 274 | 0.34s | ✕ | ✓ | ✓ |

Upgrades: $275 / $425 / $600.

### Scout — $325

Suporte de Detection/Reveal com ataque próprio propositalmente fraco.

| Level | Damage | Range | Fire Rate | Ground | Detection | Reveal |
|---|---:|---:|---:|:---:|:---:|---:|
| 1 | 8 | 158 | 0.96s | ✓ | ✓ | — |
| 2 | 10 | 188 | 0.86s | ✓ | ✓ | — |
| 3 | 13 | 205 | 0.78s | ✓ | ✓ | 220 |
| 4 | 19 | 228 | 0.68s | ✓ | ✓ | 270 |

Upgrades: $225 / $350 / $475.

## Inimigos

| Inimigo | HP | Velocidade | Dano ao Outpost | Recompensa | Ground | Flying | Invisible |
|---|---:|---:|---:|---:|:---:|:---:|:---:|
| Grunt | 85 | 58 | 10 | $14 | ✓ | ✕ | ✕ |
| Runner | 52 | 98 | 8 | $12 | ✓ | ✕ | ✕ |
| Brute | 270 | 37 | 24 | $40 | ✓ | ✕ | ✕ |
| Glider | 96 | 74 | 12 | $20 | ✕ | ✓ | ✕ |
| Shade | 78 | 76 | 14 | $24 | ✓ | ✕ | ✓ |
| Phantom | 118 | 80 | 18 | $34 | ✕ | ✓ | ✓ |

A dificuldade de Shade e Phantom vem principalmente das propriedades de targeting, não de números extremos.

## Campanha — 20 Waves

1. **GRUNT PATROL** — introdução Ground.
2. **GROUND PRESSURE** — mais Grunts.
3. **RUNNERS DETECTED** — introdução Runner.
4. **HEAVY CONTACT** — introdução Brute.
5. **AIR ENEMY DETECTED** — primeiro Glider.
6. **AIR PRESSURE** — Ground + Flying.
7. **MIXED ASSAULT** — primeira composição mais ampla.
8. **CLOAKED ENEMY DETECTED** — primeiro Shade.
9. **CLOAKED PRESSURE** — Ground rápido + Invisible.
10. **CHECKPOINT ASSAULT** — primeiro grande teste misto.
11. **RAPID ADVANCE** — velocidade e Flying.
12. **HEAVY SHADOWS** — Brutes + Shades.
13. **DENSE CONTACT** — alta densidade intercalada.
14. **AIR DOMINANCE** — forte pressão aérea.
15. **PHANTOM DETECTED** — primeiro Flying + Invisible.
16. **VEILED ASSAULT** — Shade + Phantom + Runner.
17. **HEAVY LINE** — pressão intensa de Brutes com ameaças simultâneas.
18. **AIR SIEGE** — maior pressão aérea da campanha.
19. **CONVERGENCE** — todos os seis tipos sobrepostos.
20. **FINAL ASSAULT** — ofensiva final em três blocos: velocidade, linha pesada/cloaked e convergência total.

Não existe boss: a Wave 20 é especial pela composição e timing.

## 1x / 2x e pausa

A velocidade usa um único delta central:

```js
simulationDelta = deltaTime * gameSpeed
```

Movimento, spawns, fire rate, projéteis, Reveal, efeitos e countdown usam a mesma base. A pausa usa estado próprio e equivale a 0x; ao continuar, restaura 1x ou 2x conforme selecionado antes da pausa.

## Victory e Game Over

Após a Wave 20:

**OUTPOST 17 SECURED**

A tela registra:

- Waves concluídas;
- kills;
- HP restante;
- dinheiro ganho;
- dinheiro gasto;
- torres construídas;
- upgrades realizados.

Quando o Outpost chega a 0 HP:

**OUTPOST LOST**

Durante Victory/Game Over, ações de gameplay ficam bloqueadas. PLAY AGAIN / TRY AGAIN limpa a partida inteira e retorna a PREPARATION da Wave 1.

## Controles

- Mouse: interação principal.
- Clique em um card da loja: seleciona uma torre para placement.
- Clique no mapa: constrói em posição válida ou seleciona torre existente.
- Clique direito: cancela placement.
- `Esc`: pausa / continua a partida. Durante placement, o clique direito é a forma direta de cancelar.
- UPGRADE / SELL: ações da torre selecionada.
- START WAVE: começa a próxima wave antecipadamente.
- 1x / 2x: velocidade da simulação.

## Como executar

Como o projeto usa ES Modules, execute por servidor local em vez de abrir diretamente via `file://`.

No diretório do projeto:

```bash
py -m http.server 8000
```

ou:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

Live Server no VS Code também funciona.

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- HTML5 Canvas
- ES Modules
- `requestAnimationFrame`

Sem framework, engine, npm, backend ou banco de dados.

## Arquitetura

```text
index.html
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
tests/
  smoke.mjs
  balance-stage5.mjs
screenshots/
  stage5-*.png
QA_STAGE5.md
```

As configurações das 20 Waves ficam centralizadas em `js/waves.js`; stats dos seis inimigos ficam em `js/enemies.js`; stats L1–L4 das quatro torres ficam em `js/towers.js`.

## QA final

A build final foi validada com:

- smoke suite da campanha completa;
- matriz Ground/Flying/Invisible/Flying+Invisible;
- Detection e Reveal;
- multiple Scouts e target loss;
- FIRST por `pathProgress` válido;
- placement, upgrades, Max Level e venda;
- sete estratégias de campanha;
- full playthrough Wave 1 → 20 → Victory;
- campanha equivalente em 1x e 2x;
- pausa durante 2x;
- derrotas reais durante Wave 16 e Wave 20;
- restart depois de Victory/Game Over e durante Wave;
- resize nas Waves 19/20 em 1366×768, 1440×900 e 1920×1080;
- stress acima da campanha com 120 torres + 450 inimigos em 2x;
- mobile landing;
- auditoria de código morto/console/debug/CSS/IDs.

Os resultados e números completos estão em `QA_STAGE5.md`.

## Screenshots

A pasta `screenshots/` contém screenshots reais de:

- Wave 16;
- Wave 17 / Brutes;
- Wave 18 / Air Siege;
- Wave 19;
- aviso Final Wave;
- Wave 20 em combate;
- Wave 20 intensa;
- Victory;
- Game Over;
- gameplay em 2x.

## Acessibilidade e UX

- `focus-visible` para botões;
- overlays finais com `role="dialog"`, foco direcionado para a ação principal e texto além de cor;
- contraste claro em UI e mapa;
- `prefers-reduced-motion` reduz transições/animações de interface;
- sem flashes intensos na Final Wave;
- mobile não tenta executar uma UI desktop inutilizável.

## Limitações atuais

Deliberadamente não existem:

- áudio;
- save/campanha persistente;
- gameplay mobile/touch;
- mapas adicionais;
- bosses;
- modo infinito;
- multiplayer;
- skins;
- meta progressão.

Esses itens são apenas possibilidades futuras e **não** fazem parte da versão atual.
