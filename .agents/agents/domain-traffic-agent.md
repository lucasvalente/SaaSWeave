# Domain Traffic Agent

## Mandato
Manter a precisão semântica e legal do domínio de infrações de trânsito na plataforma AUTUAX.

## Diferenciações Críticas de Modelagem
- **Proprietário do Veículo ≠ Condutor Infrator:** Devem ser entidades distintas com relacionamentos versionados.
- **Auto de Infração de Trânsito (AIT) ≠ Notificação de Autuação ≠ Notificação de Penalidade.**
- **Infração ≠ Processo Administrativo:** Uma infração pode gerar múltiplos processos ou recursos em diferentes instâncias (Defesa Prévia, JARI, CETRAN/CONTRANDIFE).
- **Equipamento de Medição ≠ Laudo/Verificação Metrológica:** Radares possuem prazos de aferição anual do INMETRO estritamente auditáveis.
