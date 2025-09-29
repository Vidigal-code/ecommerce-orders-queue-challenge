# E-commerce Orders Queue Challenge (NestJS + Bull + MongoDB + Redis)

## Sumário
- [Descrição do Desafio](#descrição-do-desafio)
- [Objetivos Atendidos](#objetivos-atendidos)
- [Arquitetura Geral](#arquitetura-geral)
- [Fluxo Completo (Fases)](#fluxo-completo-fases)
- [Modelo de Dados](#modelo-de-dados)
- [Estratégia de Geração de Pedidos](#estratégia-de-geração-de-pedidos)
- [Processamento Prioritário (VIP -> NORMAL)](#processamento-prioritário-vip---normal)
- [Fila e Concorrência](#fila-e-concorrência)
- [Logs, Métricas e Persistência de Execuções](#logs-métricas-e-persistência-de-execuções)
- [Cancelamento Seguro do Processo](#cancelamento-seguro-do-processo)
- [Endpoints da API](#endpoints-da-api)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Como Executar Localmente](#como-executar-localmente)
- [Exemplos de Uso (curl)](#exemplos-de-uso-curl)
- [Health & Monitoramento](#health--monitoramento)
- [Escalabilidade e Performance](#escalabilidade-e-performance)
- [Boas Práticas e Decisões Técnicas](#boas-práticas-e-decisões-técnicas)
- [Resolução de Problemas (Troubleshooting)](#resolução-de-problemas-troubleshooting)
- [Possíveis Evoluções Futuras](#possíveis-evoluções-futuras)
- [Licença](#licença)

---

## Descrição do Desafio

O desafio consiste em simular uma plataforma de e-commerce capaz de:

1. Gerar 1 milhão (ou mais) de pedidos randomizados.
2. Diferenciar pedidos VIP (clientes DIAMANTE) de pedidos normais.
3. Processar pedidos em fila priorizando VIP antes de NORMAL.
4. Registrar tempos de geração, enfileiramento, processamento e total.
5. Permitir reset do sistema para nova execução.
6. Expor uma API única (`GET /pedidos`) com métricas completas.
7. Exibir logs detalhados do processo.
8. Ser escalável e monitorável.

---

## Exemplo

<img src="/nest-backend/example/nest-example.png" alt="" width="800"/> 

---

## Objetivos Atendidos

| Requisito | Status |
|-----------|--------|
| Geração massiva (≥ 1M) | ✅ |
| Campos completos com prioridade | ✅ |
| Banco NoSQL escalável (MongoDB) | ✅ |
| Fila com priorização (Bull + Redis) | ✅ |
| Processamento VIP antes de NORMAL | ✅ |
| Status distintos e observações ajustadas | ✅ |
| Métricas de tempo e contagem por prioridade | ✅ |
| Registros históricos de execuções (process_runs) | ✅ |
| Endpoint único `/pedidos` com resumo | ✅ |
| Logs acessíveis via `/pedidos/logs` | ✅ |
| Health check de fila `/pedidos/health/queue` | ✅ |
| Reset completo `/pedidos/reset` | ✅ |
| Cancelamento de execução em andamento `/pedidos/cancel` | ✅ |
| Proteção contra execução concorrente | ✅ |

---

## Arquitetura Geral

Componentes principais:

- NestJS (camadas Modules / Controllers / UseCases / Infrastructure / Domain / Shared)
- Redis: backend da fila (Bull)
- MongoDB: persistência de pedidos e execuções
- Bull: gerenciamento de jobs (`generateOrders` e `processOrder`)
- Logs em arquivos (quando `BACKEND_LOGS=true`)
- Métricas acessíveis via endpoints

### Diagrama Simplificado

```
┌──────────┐     POST /pedidos/generate     ┌──────────────┐
│  Cliente │ ─────────────────────────────▶ │  API NestJS  │
└──────────┘                                │  (Controller)│
                                             │              │
                                             ▼              │
                                      ┌────────────┐        │
                                      │ UseCases   │        │
                                      │ (Generate) │        │
                                      └─────┬──────┘        │
                                            │ adiciona job  │
                                            ▼               │
                                      ┌────────────┐        │
                                      │   Bull     │        │
                                      │ (Redis)    │◀───────┘
                                      └────┬───────┘
                                           │ consumers
                                           ▼
                                   ┌──────────────┐
                                   │ OrdersProcessor
                                   │ - gera pedidos
                                   │ - enfileira VIP
                                   │ - espera fila
                                   │ - enfileira NORMAL
                                   │ - espera final
                                   └──────┬────────
                                          │
                              bulk insert │   atualiza
                                          ▼
                                   ┌──────────────┐
                                   │  MongoDB     │
                                   └──────────────┘
```

---

## Fluxo Completo (Fases)

As fases do processamento (expostas em `/pedidos` e `/pedidos/health/queue`):

1. `IDLE` – Aguardando início.
2. `GENERATING` – Gerando pedidos (chunks de 10.000).
3. `ENQUEUE_VIP` – Enfileirando VIP (ocorre dentro da geração).
4. `WAITING_VIP_DRAIN` – Esperando fila processar todos VIP.
5. `ENQUEUE_NORMAL` – Enfileirando pedidos NORMAL.
6. `WAITING_NORMAL_DRAIN` – Aguardando processamento NORMAL.
7. `DONE` – Execução concluída.
8. `ERROR` – Erro ou cancelamento.

---

## Modelo de Dados

### Order (collection: orders)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (UUID) | Identificador lógico |
| cliente | string | Nome simulado do cliente |
| valor | number | Valor aleatório |
| tier | enum (BRONZE/PRATA/OURO/DIAMANTE) | Nível do cliente |
| priority | enum (VIP/NORMAL) | Derivado (DIAMANTE => VIP) |
| observacoes | string | Texto randômico + atualizado no processamento |
| status | string | 'pendente' -> 'enviado com prioridade' / 'processado sem prioridade' |
| createdAt | Date | Data de criação |

Índices:
- `id (unique)`
- `priority`
- `priority + status` (para contagem rápida de processados)
- `createdAt`

### ProcessRun (collection: process_runs)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| runId | string (UUID) | ID da execução |
| generationTimeMs | number | Tempo de geração |
| processingTimeVIPMs | number | Janela de processamento VIP |
| processingTimeNormalMs | number | Janela de processamento NORMAL |
| startVIP / endVIP | Date | Início/fim VIP |
| startNormal / endNormal | Date | Início/fim NORMAL |
| totalProcessedVIP / totalProcessedNormal | number | Quantidade final processada |
| totalTimeMs | number | Soma (generation + VIP + NORMAL) |
| enqueueVipTimeMs / enqueueNormalTimeMs | number | Tempos de enfileiramento |
| createdAt | Date | Registro |

---

## Estratégia de Geração de Pedidos

- Feita via job `generateOrders`.
- Geração em blocos (`chunkSize = 10000`) para reduzir consumo de memória.
- Para cada pedido:
    - tier aleatório.
    - priority = VIP se tier = DIAMANTE, senão NORMAL.
    - observação aleatória de lista predefinida.
    - status inicial = 'pendente'.
- VIP já são enfileirados enquanto gera.
- NORMAL só após a drenagem da fila VIP.

---

## Processamento Prioritário (VIP -> NORMAL)

1. Gerou e enfileirou todos VIP → aguarda queue drenar.
2. Depois enfileira NORMAL em lotes (10.000).
3. Atualiza cada pedido individualmente (status + observações).
4. Marca tempos (start/end por prioridade) de forma incremental.

---

## Fila e Concorrência

- Biblioteca: `@nestjs/bull` (Bull v3).
- Redis obrigatório.
- Concurrency configurável via `ORDERS_QUEUE_CONCURRENCY` (padrão: 25).
- Job types:
    - `generateOrders` (único controlador da execução macro).
    - `processOrder` (um por pedido).
- Prioridades:
    - VIP => prioridade 1
    - NORMAL => prioridade 2

---

## Logs, Métricas e Persistência de Execuções

### Fontes de Métricas (LogsUseCase)
- Geração: `generationTimeMs`
- Processamento (janela): `processingTimeVIPMs`, `processingTimeNormalMs`
- Contagens processadas: consulta com filtro `status != 'pendente'`.

### Logs em Disco
Ativos se `BACKEND_LOGS=true`:
- `shared/logs/log.messages`
- `shared/logs/warn.messages`
- `shared/logs/errors.messages`

### Endpoint de Logs
`GET /pedidos/logs?lines=300`

Retorna:
- Últimas linhas de cada tipo.
- Quick stats (VIP/NORMAL processados nos logs).

### Persistência Histórica
Ao concluir (ou mesmo com erro), salva um registro em `process_runs`.

---

## Cancelamento Seguro do Processo

Endpoint: `POST /pedidos/cancel`

Parâmetros (query):
- `purge=true|false` (limpa fila)
- `removePending=true|false` (remove pedidos ainda pendentes do Mongo)
- `resetLogs=true|false` (limpa métricas em memória)

Passos Internos:
1. Seta `aborted = true`.
2. Fase muda para `ERROR`.
3. Pausa fila.
4. Grace period curto.
5. (Opcional) purga jobs.
6. (Opcional) remove pedidos pendentes.
7. (Opcional) reseta logs.

Após cancelar, pode iniciar nova geração normalmente.

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pedidos/generate?quantity=NUM` | Inicia fluxo completo (se não houver outro ativo) |
| GET | `/pedidos` | Status consolidado (tempos, fases, contagens) |
| GET | `/pedidos/health/queue` | Health da fila / processamento |
| GET | `/pedidos/logs?lines=N` | Últimos logs e estatísticas |
| POST | `/pedidos/reset` | Limpa banco de pedidos, filas e logs |
| POST | `/pedidos/cancel` | Aborta execução em andamento |
| POST | `/pedidos/queue/pause` | Pausa fila |
| POST | `/pedidos/queue/resume` | Resume fila |
| POST | `/pedidos/queue/clean?state=wait` | Limpa jobs por estado |
| POST | `/pedidos/queue/close` | Fecha conexão da fila |
| GET | `/pedidos/queue/status` | Contadores da fila |
| GET | `/pedidos/queue/jobs?types=waiting,active` | Lista jobs (simplificado) |
| POST | `/pedidos/process` | (Depreciado) – não usado mais |

---

## Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `MONGO_URI` | (obrig.) | String de conexão Mongo |
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `PORT` | `3000` | Porta HTTP |
| `BACKEND_LOGS` | `true` | Ativa escrita em disco |
| `MAX_ORDERS` | `1500000` | Limite hard de geração |
| `ORDERS_QUEUE_CONCURRENCY` | `25` | Concurrency do processamento |

---

## Como Executar Localmente

Pré-requisitos:
- Node 18+
- Redis em execução
- MongoDB em execução
- PNPM (recomendado)

Passos:

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir Redis e Mongo (exemplo via Docker)
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=vidigalcode -e MONGO_INITDB_ROOT_PASSWORD=test1234 mongo:6

# 3. Criar .env (exemplo)
cp .env.example .env  # se existir
# ou editar manualmente

# 4. Start aplicação
pnpm start

# 5. Gerar pedidos
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

---

## Exemplos de Uso (curl)

Gerar 200 mil pedidos:
```bash
curl -X POST "http://localhost:3000/pedidos/generate?quantity=200000"
```

Acompanhar status:
```bash
curl "http://localhost:3000/pedidos" | jq
```

Health da fila:
```bash
curl "http://localhost:3000/pedidos/health/queue" | jq
```

Ver logs (últimas 300 linhas):
```bash
curl "http://localhost:3000/pedidos/logs?lines=300" | jq
```

Cancelar em andamento:
```bash
curl -X POST "http://localhost:3000/pedidos/cancel?purge=true&removePending=true&resetLogs=false"
```

Reset total:
```bash
curl -X POST "http://localhost:3000/pedidos/reset"
```

---

## Health & Monitoramento

`GET /pedidos/health/queue` retorna:
- Contadores: waiting, active, completed, failed, delayed
- Fase atual do processor
- Flags: hasFailedJobs, isStuck, paused
- Tempos de enfileiramento
- Estado de abort

Uso típico:
- Detectar stuck: `active > 0` e `phase` não está em uma fase de processamento.
- Fila pausada = status `paused`.

---

## Escalabilidade e Performance

Estratégias adotadas:
- Geração em chunks (10k) → reduz memória.
- `insertMany` (bulk) → maior throughput no Mongo.
- Prioridade via Bull → VIP primeiro.
- Concurrency configurável → adequado a CPU/RAM/IO.
- Índices otimizando contagens de processados.

Pontos de atenção:
- Atualização individual por pedido (updateOne). Em cenários extremos pode ser convertido em `bulkWrite`.
- Redis deve estar em host rápido (latência impacta enfileiramento).
- Monitorar I/O do Mongo sob carga.

---

## Boas Práticas e Decisões Técnicas

| Decisão | Justificativa |
|---------|---------------|
| Separar UseCases | Clareza de intenção (SRP) |
| Persistir histórico (process_runs) | Auditoria e comparações |
| Fila por prioridade | Evita starvation de VIP |
| Cancelamento cooperativo (flag aborted) | Evita corrupção de estado |
| Logs em arquivo e endpoint de leitura | Transparência sem ferramentas externas obrigatórias |
| Limite MAX_ORDERS configurável | Proteção operacional |
| Fases explícitas | Observabilidade e UX (frontend) |
| Contagem só de processados (status != pendente) | Métrica real de throughput |

---

## Resolução de Problemas (Troubleshooting)

| Problema | Causa Comum | Solução |
|----------|-------------|---------|
| `ECONNREFUSED Redis` | Redis não iniciou | Subir Redis ou corrigir host/porta |
| Mongo não conecta | Usuário/senha incorretos | Validar URI `MONGO_URI` |
| Fase travada em `WAITING_VIP_DRAIN` | Jobs VIP ainda ativos ou stuck | Ver `/pedidos/health/queue`, checar failed |
| Contagens não aumentam | Geração não iniciou | Ver `POST /pedidos/generate` resposta |
| Cancel não “limpa tudo” | Jobs ativos ainda finalizando | Aguardar alguns segundos, depois reset |
| Many failed jobs | Falha Redis / Mongo instável | Checar logs de erro (`/pedidos/logs`) |
| Execução concorrente bloqueada | Já existe processamento | Cancelar ou aguardar concluir |

---

## Possíveis Evoluções Futuras

- Exportar métricas Prometheus (`/metrics`).
- Adotar BullMQ (suporte futuro, melhor controle).
- Adicionar throughput (jobs/seg) calculado.
- Implementar `bulkWrite` no processamento de pedidos.
- Reidratar métricas após restart (persistindo estado incremental).
- Streaming de logs em WebSocket.
- Endpoint `/pedidos/cancel/status`.
- Implementar “prioridade dinâmica” (ex: OURO semi-prioritário).

---

## Licença

Defina a licença conforme necessidade (MIT, Apache-2.0, etc.).  
Exemplo (MIT):

```
MIT License - Sinta-se livre para usar, modificar e distribuir.
```

---

## Contato / Autor

Desenvolvido como parte do desafio "E-commerce Orders Queue Challenge".

Se quiser ajuda para preparar um README em inglês ou adicionar diagramas mermaid, é só pedir.

Bom uso! 🚀