# Checklist QA — jornada do espectador (visitante / lead)

Use este documento para testes manuais ou regressão antes de releases. O espectador **não** autentica na aplicação; o fluxo baseia-se em `/live/[code]/[slug]`, `sessionStorage` e APIs públicas.

## Pré-requisitos

- Webinar existente com `code` e `slug` conhecidos.
- Para testes de senha na captura: webinar com `passwordEnabled` e palavra-passe definida no painel.
- Para LGPD: `lgpdEnabled` ativo com texto personalizado.

---

## 1. Página de captura — `GET /live/{code}/{slug}`

| # | Cenário | Passos | Resultado esperado |
|---|---------|--------|---------------------|
| 1.1 | Carregamento | Abrir URL válida | Página renderiza; visita registada (`WebinarVisit`). |
| 1.2 | Slug/code inválidos | URL com code/slug inexistentes | `404`. |
| 1.3 | Branding | Verificar logo, fundo, título, descrição, CTA, patrocinadores | Campos `reg*` e `config` refletem o builder. |
| 1.4 | Senha na captura (se ativo) | Submeter formulário sem token válido | Bloqueio até `POST /api/webinars/verify-capture-password` devolver acesso ou token. |
| 1.5 | LGPD (se ativo) | Submeter sem aceitar | Validação impede envio ou registo sem consentimento conforme UI. |
| 1.6 | Registo de lead | Nome + e-mail válidos | `POST /api/leads` com sucesso; e-mail de confirmação se configurado; dados em `Lead`. |
| 1.7 | Rate limit | Disparar muitos POST em `/api/leads` | `429` após limite (ver `rate-limit`). |

---

## 2. Sala ao vivo / replay — `GET /live/{code}/{slug}/watch`

| # | Cenário | Passos | Resultado esperado |
|---|---------|--------|---------------------|
| 2.1 | Vídeo | Reproduzir | Player carrega `videoUrl`; progresso pode alimentar métricas. |
| 2.2 | Fases de tempo | Comparar relógio com `startDate`/`startTime`/`status` | Fases waiting / live / replay coerentes com `computePublicWatchPhase`. |
| 2.3 | Countdown | Antes do início | Contagem regressiva visível. |
| 2.4 | Chat | Enviar mensagem | Mensagem aparece; SSE `chat/stream` ou rotas de chat consistentes. |
| 2.5 | Chat read-only (se aplicável) | Verificar rota `chat/readonly` | Lista conforme esperado para espectador. |
| 2.6 | Enquetes | Abrir enquete e votar | `GET/POST` polls e vote por `webinarId`. |
| 2.7 | Oferta / escassez / prova social | Disparar fases no config | Popups, banners e contadores alinhados ao `config`. |
| 2.8 | Ping de audiência | Manter sessão aberta | `POST /api/webinars/[id]/ping` registado (minuto/lead). |
| 2.9 | Redirecionamento pós-live | Se configurado | Comportamento conforme `redirectEnabled` / `redirectUrl` na transição para finished. |

---

## 3. Página encerrada — `GET /live/{code}/{slug}/finished`

| # | Cenário | Passos | Resultado esperado |
|---|---------|--------|---------------------|
| 3.1 | Redirecionamento | `redirectEnabled` + URL válida | Redirect HTTP para `redirectUrl`. |
| 3.2 | Sem redirect | Redirect desativado | `FinishedPageClient` com mensagem/layout configurado. |

---

## 4. APIs públicas relevantes (referência)

| Método | Rota | Uso do espectador |
|--------|------|-------------------|
| POST | `/api/leads` | Inscrição na captura |
| POST | `/api/webinars/verify-capture-password` | Desbloquear captura com senha |
| GET/POST | `/api/webinars/[id]/chat`, `.../chat/stream`, `.../chat/readonly` | Chat |
| GET | `/api/webinars/[id]/polls` | Listar enquetes |
| POST | `/api/webinars/[id]/polls/.../vote` | Votar |
| POST | `/api/webinars/[id]/ping` | Presença / minuto assistido |

---

## 5. Dados e privacidade

- Leads: `watchedPercent`, `clickedOffer`, `lgpdConsent` devem atualizar-se conforme interações (pings, cliques, etc.).
- Scripts custom (`customScripts` no webinar): validar apenas injeção esperada em ambientes de staging.

---

## 6. Ideias fora do escopo atual (regressão futura)

- Lembrete por e-mail (`/api/cron/reminder`).
- Acessibilidade (legendas, foco, contraste).
