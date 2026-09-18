# OUTPOST 17 — Relatório Final de QA · Stage 5

## 1. Escopo finalizado

A Stage 5 conclui a campanha principal sem adicionar novas mecânicas-base. Foram finalizados:

- Waves 16–20;
- Wave 20 especial por composição/timing, sem boss;
- state machine de PREPARATION / WAVE_ACTIVE / PAUSED / VICTORY / GAME_OVER;
- Victory e Game Over completos;
- estatísticas finais;
- pausa real preservando 1x/2x;
- balanceamento global Waves 1–20;
- regressão de targeting, Reveal, upgrades, venda e placement;
- performance final;
- acessibilidade;
- limpeza final.

## 2. Baseline

Antes da finalização foram revalidados os sistemas da Stage 4:

- Waves 1–15;
- Ground / Flying / Invisible / Flying+Invisible;
- Detection e Reveal;
- múltiplos Scouts;
- FIRST;
- Ranger, Marksman, Air Defense e Scout L1–L4;
- upgrades, venda e placement;
- economia;
- 1x / 2x;
- Start Wave e restart.

A regressão inicial identificou apenas que a smoke suite ainda tinha a expectativa antiga `WAVE_CONFIGS.length === 15`; o teste foi atualizado para o contrato final de 20 Waves.

## 3. State machine final

Estados explícitos:

- `PREPARATION`
- `WAVE_ACTIVE`
- `PAUSED`
- `VICTORY`
- `GAME_OVER`

A pausa equivale a 0x. Ela não altera `gameSpeed`; portanto um jogo pausado em 2x volta para 2x ao continuar.

Victory/Game Over bloqueiam placement, upgrade, venda, Start Wave e mudança de velocidade. PLAY AGAIN / TRY AGAIN executa reset completo.

## 4. Waves 16–20

| Wave | Nome | Composição | Unidades | Bônus | Renda máxima da Wave* |
|---|---|---|---:|---:|---:|
| 16 | VEILED ASSAULT | 20 Shade, 50 Phantom, 10 Runner | 80 | $60 | $2.360 |
| 17 | HEAVY LINE | 40 Brute, 16 Grunt, 8 Glider, 8 Shade, 8 Runner | 80 | $60 | $2.332 |
| 18 | AIR SIEGE | 50 Glider, 30 Phantom, 10 Runner, 5 Brute | 95 | $70 | $2.410 |
| 19 | CONVERGENCE | 10 Grunt, 10 Glider, 10 Shade, 10 Runner, 20 Phantom, 50 Brute | 110 | $80 | $3.460 |
| 20 | FINAL ASSAULT | 25 Runner, 15 Grunt, 15 Glider, 40 Brute, 15 Shade, 20 Phantom | 130 | $120 | $3.570 |

\* todos os inimigos eliminados + bônus de clear.

A Wave 20 usa três blocos de spawn:

1. pressão rápida: Runner + Grunt + Glider;
2. linha pesada/cloaked: Brute + Shade + Phantom;
3. convergência: todos os seis tipos sobrepostos.

Nenhum novo tipo de inimigo, armor, shield, stun, poison ou boss foi criado.

## 5. Composição completa Waves 1–20

| Wave | Label | Unidades |
|---:|---|---:|
| 1 | GRUNT PATROL | 10 |
| 2 | GROUND PRESSURE | 15 |
| 3 | RUNNERS DETECTED | 16 |
| 4 | HEAVY CONTACT | 17 |
| 5 | AIR ENEMY DETECTED | 19 |
| 6 | AIR PRESSURE | 28 |
| 7 | MIXED ASSAULT | 31 |
| 8 | CLOAKED ENEMY DETECTED | 14 |
| 9 | CLOAKED PRESSURE | 30 |
| 10 | CHECKPOINT ASSAULT | 54 |
| 11 | RAPID ADVANCE | 72 |
| 12 | HEAVY SHADOWS | 63 |
| 13 | DENSE CONTACT | 72 |
| 14 | AIR DOMINANCE | 94 |
| 15 | PHANTOM DETECTED | 77 |
| 16 | VEILED ASSAULT | 80 |
| 17 | HEAVY LINE | 80 |
| 18 | AIR SIEGE | 95 |
| 19 | CONVERGENCE | 110 |
| 20 | FINAL ASSAULT | 130 |

Total da campanha: **1.107 inimigos** no playthrough perfeito.

## 6. Economia final

Valores preservados:

- dinheiro inicial: **$800**;
- venda: **70% do total investido**;
- preços e upgrades das quatro torres: inalterados em relação à Stage 4;
- rewards dos seis inimigos: inalterados em relação à Stage 4.

Não foi criado money sink artificial.

### Playthrough especializado real — caixa por checkpoint

| Checkpoint | HP | Caixa | Kills | Total ganho | Total gasto |
|---|---:|---:|---:|---:|---:|
| Wave 5 | 100 | $925 | 77 | $2.825 | $2.700 |
| Wave 10 | 100 | $2.105 | 234 | $8.055 | $6.750 |
| Wave 15 | 100 | $5.560 | 612 | $15.735 | $10.975 |
| Wave 20 | 100 | $7.817 | 1.107 | $29.867 | $22.850 |

A reserva da Wave 15 é realmente utilizável e precisa ser convertida em poder. A estratégia Hoarder manteve os $5.560 e parou de investir: chegou a acumular **$10.052**, mas perdeu na **Wave 17**. Assim, possuir dinheiro não substitui gastá-lo.

## 7. Sete estratégias finais

As simulações usam os sistemas reais de economia, WaveController, Enemy, Tower, targeting, Reveal e Projectile.

| Estratégia | Resultado | HP | Caixa | Kills | Investido | Torres | Upgrades |
|---|---|---:|---:|---:|---:|---:|---:|
| A — Generalista / Rangers | Victory | 100 | $13.842 | 1.107 | $16.825 | 12 | 35 |
| B — Especializada | Victory | 100 | $7.817 | 1.107 | $22.850 | 15 | 41 |
| C — Scout / Reveal | Victory | 100 | $9.817 | 1.107 | $20.850 | 15 | 39 |
| D — Ranger Heavy | Victory | 100 | $10.942 | 1.107 | $19.725 | 14 | 41 |
| E — Air Defense Heavy | Victory | 100 | $8.917 | 1.107 | $21.750 | 14 | 38 |
| F — Imperfeita plausível | Victory | 90 | $8.853 | 1.106 | $21.800 | 15 | 40 |
| G — Hoarder após Wave 15 | Derrota Wave 17 | 0 | $10.052 | 767 | $10.975 | 8 | 20 |

Benchmark adicional: spam puro de Ranger L1 continua falhando na **Wave 6**.

Interpretação:

- composição generalista boa pode vencer;
- composição especializada boa pode vencer;
- Reveal continua sendo solução real;
- Air Defense Heavy continua viável;
- estratégia imperfeita tolera erro moderado, mas perde HP;
- dinheiro guardado sem investimento é punido naturalmente;
- Ranger L1 spam não resolve propriedades avançadas.

O saldo final de um generalista muito eficiente ainda pode ser alto, mas a campanha termina ali. O teste Hoarder demonstra que saldo por si só não torna a defesa forte.

## 8. Especialistas versus Ranger

Stats finais L4:

| Torre | Damage | Fire Rate | DPS aprox. | Range | Investimento total |
|---|---:|---:|---:|---:|---:|
| Ranger | 48 | 0.50s | 96.00 | 232 | $1.450 |
| Marksman | 176 | 1.34s | 131.34 | 395 | $2.075 |
| Air Defense | 84 | 0.34s | 247.06 | 274 | $1.725 |
| Scout | 19 | 0.68s | 27.94 | 228 | $1.375 |

Air Defense L4 entrega cerca de **2,57×** o DPS do Ranger L4 contra Flying que ambos conseguem atingir. Marksman continua oferecendo range muito superior e alto dano individual contra Brutes. Scout continua fraco ofensivamente, mas troca upgrades de Detection por Reveal de área para outras torres.

Na Wave 18, tempos simulados das estratégias:

- Generalista: ~35,1s;
- Especializada: ~26,1s;
- Reveal: ~28,0s;
- Ranger Heavy: ~33,8s;
- Air Defense Heavy: ~28,2s.

Isso mantém valor perceptível para especialização aérea sem torná-la obrigatória.

## 9. Inimigos finais

| Inimigo | HP | Speed | Base damage | Reward | Flying | Invisible |
|---|---:|---:|---:|---:|:---:|:---:|
| Grunt | 85 | 58 | 10 | $14 | ✕ | ✕ |
| Runner | 52 | 98 | 8 | $12 | ✕ | ✕ |
| Brute | 270 | 37 | 24 | $40 | ✕ | ✕ |
| Glider | 96 | 74 | 12 | $20 | ✓ | ✕ |
| Shade | 78 | 76 | 14 | $24 | ✕ | ✓ |
| Phantom | 118 | 80 | 18 | $34 | ✓ | ✓ |

Não houve necessidade de inflação global de HP para fechar a campanha.

## 10. Full playthrough real no Chromium

Automação E2E executou sequencialmente Wave 1 → Wave 20 utilizando apenas compras/upgrades/Start Wave válidos, sem injetar dinheiro, sem alterar HP e sem pular Wave.

Resultado 1x:

- estado: **VICTORY**;
- Waves: **20 / 20**;
- HP: **100 / 100**;
- kills: **1.107**;
- dinheiro ganho: **$29.867**;
- dinheiro gasto: **$22.850**;
- dinheiro restante: **$7.817**;
- torres construídas: **15**;
- upgrades: **41**.

A tela `OUTPOST 17 SECURED` foi apresentada e todas as ações de gameplay ficaram bloqueadas até PLAY AGAIN.

## 11. 1x / 2x

Foi executado um segundo percurso com Waves 1–10 em 1x e Waves 11–20 em 2x usando exatamente as mesmas decisões.

Resultado 2x:

- HP: **100 / 100**;
- kills: **1.107**;
- money earned: **$29.867**;
- money spent: **$22.850**;
- money remaining: **$7.817**;
- torres: **15**;
- upgrades: **41**.

Todos os valores ficaram idênticos ao playthrough 1x.

### Bug encontrado e corrigido

Durante a equivalência 1x/2x, o cooldown de torres descartava parte do overshoot quando um frame maior atravessava o instante do disparo. Isso podia gerar pequenas diferenças cumulativas de DPS.

Correção: o cooldown agora preserva o overshoot em vez de zerá-lo cegamente ao disparar. Após a correção, 1x e 2x ficaram estruturalmente equivalentes no E2E final.

## 12. Pausa

Teste durante Wave 11 em 2x:

- antes da pausa: `WAVE_ACTIVE`, speed 2;
- durante pausa: `PAUSED`, speed selecionada ainda 2;
- `wave.elapsed` permaneceu exatamente congelado;
- posição do inimigo permaneceu exatamente congelada;
- após CONTINUE: voltou para `WAVE_ACTIVE` em 2x.

Resize durante pausa também não alterou estado nem velocidade.

## 13. Game Over real

Não foi apenas chamada uma função de Game Over.

### Wave 16 — 1x

Após completar legitimamente Waves 1–15, as torres foram vendidas usando a própria ação SELL. A Wave 16 foi iniciada normalmente e os inimigos vazaram até HP 0.

Resultado: **GAME_OVER durante Wave 16**.

### Wave 20 — 2x

Outro run completou legitimamente Waves 1–19. Antes da Final Wave, toda a defesa foi vendida via SELL. A Wave 20 iniciou em 2x e os inimigos reduziram o Outpost a 0.

Resultado: **GAME_OVER durante Wave 20 em 2x**.

Não ocorreu Victory simultânea.

## 14. Reset

Após Victory, o botão PLAY AGAIN foi clicado na UI real. Estado resultante:

- PREPARATION;
- $800;
- 100 HP;
- Wave 0 / próxima Wave 1;
- 0 torres;
- 0 inimigos;
- 0 projéteis;
- 0 kills;
- velocidade 1x.

Também foi validado reset durante Wave e após Game Over.

## 15. Resize

Durante Waves 19 e 20, em 2x e com unidades ativas, foram testados:

- 1366×768;
- 1440×900;
- 1920×1080.

Em todas as seis verificações:

- 0 overflow;
- Wave preservada;
- speed 2x preservada;
- estado preservado;
- mapa e HUD permaneceram utilizáveis.

## 16. Stress final

Cenário acima da campanha normal:

- **120 torres**;
- **450 inimigos**;
- todos os seis tipos;
- Reveal;
- projéteis;
- partículas;
- rendering;
- **2x**.

Foram executados 1.000 ciclos `update + draw parcial`.

Resultado no harness do ambiente:

- ~**0,98 ms por ciclo**;
- máximo observado: **89 projéteis** simultâneos;
- máximo observado: **426 partículas**;
- coordenadas/valores inválidos: **0**;
- exceções JavaScript: **0**;
- após cleanup: enemies 0, projectiles 0, particles 0, floating text 0.

Após garbage collection, o heap V8 ficou aproximadamente **39 KB** acima do valor inicial. Essa diferença pode incluir estruturas internas/JIT; não houve retenção crescente das listas de gameplay.

O stress inicialmente ficou congelado porque o harness ainda usava `PREPARATION`; isso confirmou que a nova state machine bloqueia combate fora de `WAVE_ACTIVE`. O harness foi corrigido, não o runtime.

## 17. Acessibilidade / UX

Revisado:

- `button:focus-visible` com outline de 3px;
- todos os botões possuem texto identificável;
- overlay final usa `role="dialog"`, `aria-modal` e `aria-labelledby`;
- entrada em Pause/Victory/Game Over move foco para a ação principal;
- informações importantes usam texto/ícones além de cor;
- `prefers-reduced-motion` reduz animações/transições;
- Final Wave usa mudança de label/borda/toast, sem flashes intensos;
- mobile 390×844 exibe landing desktop-only e não inicializa uma UI jogável apertada.

## 18. Bugs/problemas encontrados durante Stage 5

1. **Smoke suite presa em 15 Waves** — atualizada para 20 e Final Assault.
2. **Ausência de pausa real na Stage 4** — implementado estado PAUSED/0x preservando velocidade selecionada.
3. **Estados finais não existiam** — implementados VICTORY/GAME_OVER com input lock.
4. **Cooldown gerava divergência 1x/2x** — overshoot preservado.
5. **Primeira curva final permitia hoarding** — Waves 16–20 refinadas por composição/densidade/timing.
6. **Tentativa de simplesmente cortar rewards prejudicou progressão anterior** — abordagem descartada; rewards aprovados foram preservados.
7. **Primeira alternativa de 200+ unidades finais gerava inflação e ruído** — descartada. Curva final ficou em 80/80/95/110/130.
8. **Stress harness em PREPARATION não simulava combate** — corrigido no teste; comportamento do jogo estava correto.

## 19. Auditoria final

Runtime verificado por busca estática:

- `console.*`: 0;
- DEBUG: 0;
- TODO: 0;
- FIXME: 0;
- referências ao survival antigo (Scrap/Ammo/Crawler/Spitter/Barrier/Mine/Rifle): 0;
- código de Waves 21+: 0;
- boss/endless/audio/save: 0 em runtime.

Listeners no runtime são registrados uma vez na construção de UI/Input. Não existe loop registrando listeners repetidos.

Arquivos intermediários da Stage 4 e screenshots antigos foram removidos da entrega final.

## 20. Limitações restantes

Deliberadamente fora desta versão:

- áudio;
- save persistente;
- gameplay touch/mobile;
- mapas adicionais;
- bosses;
- endless;
- multiplayer;
- skins;
- meta progressão.

Esses itens não são necessários para a campanha atual ser completa.

## 21. Critério final

- Wave 20 existe e foi vencida legitimamente: **PASS**.
- Derrota legítima existe: **PASS**.
- Hoarding é punido naturalmente: **PASS**.
- Ranger spam básico não domina: **PASS**.
- Generalista e especialistas vencem: **PASS**.
- 2x equivalente a 1x no E2E final: **PASS**.
- Victory/Game Over e reset: **PASS**.
- Performance de stress: **PASS**.
- Resize e mobile landing: **PASS**.
- Auditoria final: **PASS**.
