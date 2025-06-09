## 📁 Projeto

### **Worms Brasil (jogo Snake multiplayer no browser)**
**Tecnologias:** HTML5 • CSS3 • JavaScript (ES6+) • Canvas API • Git/GitHub

- Estruturei o HTML semântico e otimizado para performance de jogo.
- Modelei o mundo do jogo usando um objeto de configuração (`GameConfig`) para definir tamanho, velocidade, respawn e limites.
- Desenvolvi o game loop em JavaScript com atualização e renderização contínuas no Canvas.
- Implementei detecção de colisão entre segmentos de “cobra” e itens de comida.
- Criei IA básica para cobras rivais com parâmetros independentes de velocidade e crescimento.
- Ajustei parâmetros de câmera com suavização (`CAMERA_SMOOTHING`) para experiência fluida.
- Versionei o projeto no GitHub, mantendo commits atômicos e documentação no README.

---

## 🧠 Habilidades Técnicas

- **Linguagens & APIs:**  
  - JavaScript (ES6+), Canvas API  
  - HTML5 semântico, CSS3 para layout e estilização  

- **Desenvolvimento de Jogos Web:**  
  - Implementação de game loop (update/render)  
  - Lógica de movimentação, colisão e respawn  
  - IA básica para entidades controladas pelo sistema  

- **Design de Arquitetura:**  
  - Configuração orientada a dados (`GameConfig`)  
  - Separação de responsabilidades entre lógica de jogo e renderização  

- **Ferramentas & Versionamento:**  
  - Git, GitHub (Commits, Branching, README)  
  - Testes manuais cross-browser e otimização de performance  

- **UX & Performance:**  
  - Suavização de câmera e responsividade do canvas  
  - Otimização de assets e parâmetros para carregamento rápido




# Configurações Chave de Gameplay (em script.js)

Estas são as configurações no objeto `GameConfig` (arquivo `script.js`) que você pode modificar para alterar significativamente a experiência de jogo.

## Mundo e Ambiente
- Linha 2: `WORLD_WIDTH: 3000` - Largura total do mapa. Afeta o espaço disponível.
- Linha 3: `WORLD_HEIGHT: 3000` - Altura total do mapa.
- Linha 16: `BOUNDS_THICKNESS: 190` - Espessura da "neblina" na borda. Valores maiores reduzem a área visível perto das bordas.

## Cobra do Jogador
- Linha 4: `PLAYER_SPEED: 100` - Velocidade base do jogador.
- Linha 5: `PLAYER_BOOST_SPEED: 150` - Velocidade do jogador ao usar o boost (clique do mouse).
- Linha 17: `INITIAL_SNAKE_LENGTH: 30` - Comprimento inicial da cobra do jogador.
- *Nota: O quanto a cobra do jogador cresce por comida é definido na linha ~178 (`snake.targetLength += 5`)*

## Cobras Rivais (IA)
- Linha 6: `RIVAL_SPEED: 100` - Velocidade das cobras controladas pela IA.
- Linha 19: `RIVAL_COUNT: 10` - Quantidade de cobras rivais no jogo. Aumenta a dificuldade.
- *Nota: O quanto as cobras rivais crescem por comida é definido na linha ~241 (`rival.targetLength += 2`)*

## Características das Cobras (Jogador e Rivais)
- Linha 7: `SNAKE_SEGMENT_RADIUS: 9` - Grossura (raio) inicial das cobras.
- Linha 8: `MAX_SNAKE_RADIUS: 9 * 2.5` - Grossura máxima que uma cobra pode atingir ao comer.
- Linha 9: `SNAKE_TURN_SPEED: Math.PI * 2.0` - Agilidade das cobras para virar (valores maiores = mais ágil).
- Linha 20: `RESPAWN_DELAY: 3` - Tempo (segundos) para uma cobra reaparecer após morrer.

## Comida
- Linha 10: `FOOD_RADIUS: 7` - Tamanho (raio) dos itens de comida.
- Linha 11: `INITIAL_FOOD_COUNT: 450` - Quantidade inicial de comida no mapa.
- Linha 12: `MAX_FOOD_COUNT: 600` - Limite máximo de itens de comida no mapa.
- Linha 13: `FOOD_SPAWN_RATE: 0.5` - Rapidez com que nova comida surge (itens/segundo).

## Câmera
- Linha 18: `CAMERA_SMOOTHING: 0.2` - Suavidade do movimento da câmera (0 = sem suavização, 1 = muito lenta). Valores menores (ex: 0.1) deixam a câmera mais responsiva.

*(Configurações visuais como `FOOD_COLORS` e `BOUNDS_COLOR` foram omitidas por terem menor impacto direto na gameplay)*
