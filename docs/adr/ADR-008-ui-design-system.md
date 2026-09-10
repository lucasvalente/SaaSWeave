# ADR-008: Design System Centralizado em packages/ui (shadcn-style)

## Context
A consistência visual, a acessibilidade e o suporte futuro a temas e white-label exigem que os componentes de interface sejam independentes de regras de páginas e centralizados em um pacote reutilizável.

## Decision
Construir o Design System em **`packages/ui`** com React, TailwindCSS, arquitetura shadcn-style e tokens de design centralizados.

## Alternatives
- Componentes Tailwind espalhados nas páginas: Gera inconsistência, quebra de design tokens e retrabalho.
- Bibliotecas prontas fechadas (MUI, Chakra): Dificuldade de customização profunda e sobrecarga de CSS-in-JS.

## Consequences
- Componentes primitivos leves, acessíveis e altamente customizáveis.
- Suporte imediato a design tokens centralizados para cores, tipografia, espaçamentos e raios.
