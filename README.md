# Bot de Dados — Assimilação RPG (Discord Components v2)

Bot de Discord criado com base nas regras oficiais e na tipografia de símbolos do **Livro Básico de Assimilação RPG**, utilizando **Discord Components v2** (`ContainerBuilder`, `SectionBuilder`, `MediaGalleryBuilder`, `TextDisplayBuilder`, `ThumbnailBuilder`, `StringSelectMenuBuilder` e `ButtonBuilder`) e renderização visual da bandeja de dados com os ícones oficiais.

## Recursos Implementados

- **Ícones Oficiais do Livro:** Fonte oficial de símbolos (`simbolos_assimilas.ttf`) usada tanto na geração dinâmica da bandeja visual (`PNG`) quanto sincronizada automaticamente como **Application Emojis** do Discord (`Sucesso`, `Adaptação`, `Pressão`, `d6`, `d10`, `d12`, `Determinação`, `Assimilação` e `Saúde`).
- **Tabela Oficial de Dados (pág. 35 e pág. 43):**
  - `d6` (Instintos): `1–2` vazio, `3–4` Pressão, `5` Adaptação + Pressão, `6` Sucesso.
  - `d10` (Conhecimentos/Práticas/Dano): `1–6` igual d6, `7` 2 Sucessos, `8` Sucesso + Adaptação, `9` Sucesso + Adaptação + Pressão, `10` 2 Sucessos + Pressão.
  - `d12` (Rolagem Assimilada): `1–10` igual d10, `11` Sucesso + 2 Adaptações + Pressão, `12` 2 Pressões.
- **Mecânica Interativa em Components v2:**
  - Seleção automática inteligente do melhor dado (inclusive preferindo faces vazias a Pressão quando não há Sucesso).
  - Menu suspenso (`StringSelectMenu`) para trocar manualmente quais dados manter.
  - Botão **Agir por Instinto (Rolagem Assimilada)**: converte toda a pilha para `d12`, adiciona `+1 dado mantido` e re-rola.
  - Botão **Empenho (+1 Mantido)**: aumenta a quantidade de dados mantidos (até 4).
  - Botão **Modo: Ação Simples / Conflito**: alterna o cálculo automático de anulação de Pressões por Adaptações em Ação Simples e exibe a **Escala de Consequência das Pressões** (pág. 40).
  - Botão **Manter Todos / Padrão** e **Rolar de Novo**.

## Comandos de Mensagem

Funciona tanto com **sufixo `a`** sem prefixo quanto com o prefixo configurado (padrão `!`):

| Comando | Descrição |
| --- | --- |
| `3d6 a` / `!3d6 a` | Rola 3 dados de Instinto (`d6`) e mantém o melhor |
| `d12 a` / `!d12 a` | Rola 1 dado Assimilado (`d12`) |
| `3d6 + 2d10 a` | Rola Instinto (`d6`) + Conhecimento/Prática (`d10`) |
| `3d6 2d10 a m2` | Rola mantendo **2 dados** (Empenho / Origem) |
| `3d6 2d10 a instinto` | Já rola como **Rolagem Assimilada** (tudo `d12`, +1 mantido) |
| `3d10 a dano` | **Rolagem de Dano** (mantém todos; cada símbolo vale 1 de dano) |
| `2d6+1d10+1d12 a conflito` | **Modo Assimilador/Conflito** (mantém todos os dados) |
| `assimilacao 3 a` | **Teste de Assimilação** (`1 + 2×Nível` em `d12`, com alerta de 10 Pressões) |
| `tabela a` / `tabela 12 a` | Sorteia coordenada `Linha × Coluna` para tabelas `6×6` (pág. 277) |
| `3d6 1d10 a #Percepção` | Adiciona rótulo descritivo à rolagem |
| `ajuda a` / `!ajuda` | Abre o guia interativo com abas (Comandos, Ícones e Regras) |

## Configuração e Execução

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de ambiente e adicione o token do seu bot:
   ```bash
   cp .env.example .env
   ```
3. No **Discord Developer Portal** (aba *Bot*), ative a opção **Message Content Intent** (`Privileged Gateway Intents`), necessária para comandos via mensagem.
4. Inicie o bot:
   ```bash
   npm start
   ```

## Testes

```bash
npm test
```
