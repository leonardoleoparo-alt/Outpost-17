# 🌲 OUTPOST 17

**OUTPOST 17** é um jogo **Tower Defense para navegador** desenvolvido com HTML, CSS e JavaScript puro.

O objetivo é defender o Outpost durante uma campanha de **20 waves**, posicionando torres, fazendo upgrades e escolhendo a melhor defesa para cada tipo de inimigo.

## 🎮 Gameplay

Os inimigos percorrem uma rota até o Outpost. Cada inimigo que chega ao final causa dano à base.

Durante a partida, o jogador precisa:

- 🏗️ posicionar torres pelo mapa;
- ⬆️ melhorar torres até o Level 4;
- 💰 administrar o dinheiro recebido nas waves;
- 🎯 combinar diferentes tipos de defesa;
- 👁️ lidar com inimigos Ground, Flying e Invisible;
- 🏁 sobreviver às 20 waves para proteger o Outpost.

## 🛡️ Torres

- **Ranger** — defesa versátil e equilibrada.
- **Marksman** — alto dano e grande alcance.
- **Air Defense** — especializada contra inimigos voadores.
- **Scout** — Detection e Reveal para inimigos invisíveis.

Todas as torres possuem **4 níveis de upgrade** e podem ser vendidas durante a partida.

## 🕹️ Controles

- **Mouse** — selecionar, posicionar e inspecionar torres.
- **Botão direito** — cancelar o posicionamento.
- **ESC** — pausar ou continuar.
- **1x / 2x** — alterar a velocidade da partida.

> 💻 O gameplay foi desenvolvido para **desktop**.

## ⚙️ Tecnologias

- HTML5
- CSS3
- JavaScript puro
- HTML5 Canvas
- Web Audio API
- GitHub Pages

O projeto não utiliza frameworks, backend ou banco de dados.

## 🔊 Áudio e configurações

O jogo possui efeitos sonoros gerados diretamente pelo navegador.

As configurações de volume, efeitos visuais e damage numbers funcionam apenas durante a sessão atual. Ao recarregar a página, elas voltam ao padrão.

## 🚀 Executar localmente

Na pasta do projeto, execute:

```bash
py -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

## 🌐 Publicação

O projeto está pronto para ser hospedado gratuitamente com **GitHub Pages**.

Em **Settings → Pages**, publique a branch `main` usando `/ (root)`.

---

🎯 **OUTPOST 17 foi criado como um projeto de portfólio para demonstrar lógica de gameplay, organização de código, Canvas, gerenciamento de estado, targeting, economia, upgrades e performance em JavaScript.**
