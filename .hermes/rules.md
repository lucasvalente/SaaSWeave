# Safety and completion rules

Hermes não apaga banco, publica deploy, altera DNS, acessa secrets, executa migrations destrutivas ou remove arquivos em massa automaticamente.

Um módulo só é COMPLETE com os gates aplicáveis PASS: typecheck, build, testes, paridade i18n, segurança, auditoria e Playwright quando existente. Testes inexistentes não são inventados.
