# Modelo de Domínio: Trânsito e Infrações

## Entidades Centrais
- **Tenant:** Empresa, locadora ou transportadora titular da conta.
- **Customer / Client:** Cliente final ou unidade de negócio gerenciada.
- **Driver (Condutor):** Indivíduo habilitado que conduz veículos (possui CNH, validade, pontuação).
- **Vehicle (Veículo):** Bem registrado (Placa, Renavam, Chassi, Marca/Modelo, Ano, Proprietário).
- **Traffic Authority (Órgão Autuador):** Entidade fiscalizadora (PRF, DNIT, DETRAN estadual, DER, Municípios).
- **AIT (Auto de Infração de Trânsito):** Registro de ocorrência fiscalizado por agente ou radar.
- **Equipment & Verification:** Radares, etilômetros e cronotacógrafos com laudos de aferição INMETRO.
- **Administrative Case (Processo):** O fluxo formal de defesa que tramita por instâncias (Defesa Prévia, JARI, CETRAN).
