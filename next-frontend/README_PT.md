# E-commerce Orders Queue Challenge
Solução Full Stack (Backend: NestJS + Bull + MongoDB + Redis | Frontend: Next.js 15 + React 19 + Tailwind)

---

## Sumário
- [Visão Geral do Projeto](#visão-geral-do-projeto)
- [Principais Funcionalidades](#principais-funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Visão do Backend (NestJS)](#visão-do-backend-nestjs)
- [Ciclo de Processamento (Fases)](#ciclo-de-processamento-fases)
- [Modelo de Dados](#modelo-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Métricas de Execução e Logging](#métricas-de-execução-e-logging)
- [Fluxo de Cancelamento e Reset](#fluxo-de-cancelamento-e-reset)
- [Dashboard Frontend (Next.js)](#dashboard-frontend-nextjs)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Execução Local](#execução-local)
- [Docker (Opcional)](#docker-opcional)
- [Notas de Performance](#notas-de-performance)
- [Troubleshooting (Resolução de Problemas)](#troubleshooting-resolução-de-problemas)
- [Considerações de Segurança](#considerações-de-segurança)
- [Roadmap / Melhorias Futuras](#roadmap--melhorias-futuras)
- [Licença](#licença)

---
## Exemplo

<img src="/next-frontend/example/next-example.png" alt="" width="800"/> 

---

## Visão Geral do Projeto

Este projeto simula um pipeline de ingestão e processamento prioritário de pedidos em larga escala para e-commerce:

- Gera até 1,5 milhão de pedidos (configurável).
- Diferencia pedidos VIP (tier DIAMANTE) de pedidos normais e aplica prioridade rígida: TODOS os VIP são processados antes de qualquer NORMAL.
- Utiliza fila (Bull + Redis) para processamento paralelo escalável.
- Persiste pedidos e metadados de execução no MongoDB.
- Oferece dashboard de monitoramento e controle (Next.js) com métricas em tempo quase real.
- Suporta cancelamento, drenagem da fila, reset completo e persistência de métricas.

---

## Principais Funcionalidades

| Categoria | Funcionalidades |
|-----------|-----------------|
| Geração | Alta escala (chunks), tiers aleatórios, prioridade derivada, insert em lote |
| Prioridade | Pipeline em duas fases: VIP → espera → NORMAL |
| Fila | Bull + Redis, prioridades, concorrência configurável |
| Métricas | Tempo de geração, tempos de enfileiramento, janelas de processamento (VIP/NORMAL), contagem processada real, tempo total |
| Ciclo | Rastreamento de fases exposto via API |
| Logs | Logs em arquivo + endpoint com estatísticas rápidas |
| Persistência | Histórico de execuções (`process_runs`) |
| Controle | Cancelamento (abort), pause/resume, limpeza de estados, reset total |
| Dashboard | Status, health, contadores, logs, jobs, botões de ação |
| Segurança lógica | Evita múltiplas execuções concorrentes |
| Observabilidade | Endpoint de health, exposição de fases e contadores processados |

---

## Arquitetura

```
                        +-----------------------------+
Cliente (Browser)  ---> | Dashboard Next.js (App Dir) |  (SSG + ISR + SWR)
                        +--------------+--------------+
                                       |
                                 Requisições REST (JSON)
                                       |
                                       v
                        +-----------------------------+
                        | Backend NestJS (/pedidos)   |
                        +--------------+--------------+
                                       |
                                 Enfileira Job
                                       |
                                       v
                          +---------------------+
                          |   Bull (Redis)      |
                          |  generateOrders     |
                          |  processOrder       |
                          +----------+----------+
                                     |
                    Bulk Insert / Update (MongoDB)
                                     |
                                     v
                          +---------------------+
                          |     MongoDB         |
                          |  orders / runs      |
                          +---------------------+
```

---

## Stack Tecnológica

| Camada | Ferramentas |
|--------|-------------|
| Backend | NestJS, TypeScript, Bull (Redis), TypeORM (MongoDB), UUID |
| Fila | Redis |
| Banco | MongoDB |
| Frontend | Next.js 15 (App Router), React 19, SWR, Tailwind CSS 4, Day.js |
| Logs | Arquivos (ativável por env) |
| Deploy (opcional) | Docker / Containers |

---

## Estrutura do Repositório

```
ecommerce-orders-queue-challenge/
  nest-backend/
    src/
      application/
      domain/
      infrastructure/
      presentation/
      shared/
    .env
  next-ecommerce-orders-queue-challenge/
    src/
      app/
      components/
      lib/
    .env.local
```

---

## Visão do Backend (NestJS)

Conceitos principais:

- `GenerateOrdersUseCase`: agenda job único `generateOrders`.
- `OrdersProcessor`:
    - Gera pedidos em chunks (10k).
    - Enfileira VIP conforme gera.
    - Aguarda drenar fila VIP.
    - Enfileira NORMAL em lote.
    - Aguarda drenar NORMAL.
    - Persiste métricas ao final (mesmo em erro).
- `LogsUseCase`: agrega métricas em memória + persistência histórica.
- `OrderTypeOrmRepository`: insert em lote, contagens otimizadas, índices.
- `CancelProcessUseCase`: aborta cooperativamente (pause + purge + limpeza).
- `OrdersController`: expõe endpoints sob `/pedidos`.

---

## Ciclo de Processamento (Fases)

| Fase | Descrição |
|------|-----------|
| `IDLE` | Aguardando execução |
| `GENERATING` | Gerando e salvando chunks |
| `ENQUEUE_VIP` | Enfileirando VIP durante geração |
| `WAITING_VIP_DRAIN` | Esperando fila VIP esvaziar |
| `ENQUEUE_NORMAL` | Enfileirando pedidos NORMAL |
| `WAITING_NORMAL_DRAIN` | Aguardando término NORMAL |
| `DONE` | Execução finalizada |
| `ERROR` | Erro ou cancelado |

---

## Modelo de Dados

### Pedido (`orders`)

| Campo | Tipo | Observação |
|-------|------|------------|
| id | string (UUID) | Identificador lógico |
| cliente | string | Nome sintético |
| valor | number | Valor aleatório |
| tier | enum (BRONZE/PRATA/OURO/DIAMANTE) | Nível do cliente |
| priority | enum (VIP/NORMAL) | Derivado de tier |
| observacoes | string | Texto aleatório + atualizado no processamento |
| status | string | 'pendente' → texto final processado |
| createdAt | Date | Timestamp |
| Índices | priority, (priority,status), createdAt, unique(id) | Performance |

### Execução (`process_runs`)

| Campo | Descrição |
|-------|-----------|
| runId | Identificador da execução |
| generationTimeMs | Tempo total de geração |
| processingTimeVIPMs | Janela de processamento VIP |
| processingTimeNormalMs | Janela NORMAL |
| startVIP/endVIP | Início/fim VIP |
| startNormal/endNormal | Início/fim NORMAL |
| totalProcessedVIP/Normal | Contagem processada real |
| enqueueVipTimeMs/Normal | Tempo de enfileiramento |
| totalTimeMs | Soma de tempos |
| createdAt | Registro |

---

## Endpoints da API

Base: `/pedidos`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pedidos/generate?quantity=NUM` | Inicia pipeline |
| POST | `/pedidos/cancel?purge=&removePending=&resetLogs=` | Cancela execução ativa |
| POST | `/pedidos/reset` | Reset geral |
| GET | `/pedidos` | Status consolidado |
| GET | `/pedidos/health/queue` | Saúde da fila/processador |
| GET | `/pedidos/logs?lines=N` | Últimos logs com estatísticas |
| GET | `/pedidos/queue/status` | Contadores da fila |
| GET | `/pedidos/queue/jobs?types=...` | Lista jobs |
| POST | `/pedidos/queue/pause` | Pausa fila |
| POST | `/pedidos/queue/resume` | Resume fila |
| POST | `/pedidos/queue/clean?state=` | Limpa estado específico |
| POST | `/pedidos/queue/close` | Fecha conexão fila |
| POST | `/pedidos/process` | (Depreciado) |

---

## Métricas de Execução e Logging

Métricas:
- Tempo de geração
- Janela de processamento VIP (start/end/duração)
- Janela NORMAL
- Tempos de enfileiramento (VIP / NORMAL)
- Contagem processada (status != 'pendente')
- Tempo total efetivo
- Fase atual
- Último run persistido

Logs (se `BACKEND_LOGS=true`):
- Arquivos separados (info/warn/error)
- Endpoint retorna + quick stats
- Útil para auditoria e debugging

---

## Fluxo de Cancelamento e Reset

### Cancelamento (`POST /pedidos/cancel`)
1. Seta flag abort
2. Pausa fila
3. Espera curto (grace)
4. Purge de jobs (opcional)
5. Remove pendentes (opcional)
6. Reset de métricas (opcional)
7. Retorna resumo

### Reset (`POST /pedidos/reset`)
- Limpa fila
- Apaga pedidos
- Zera métricas
- Apaga histórico
- Pronto para nova execução

---

## Dashboard Frontend (Next.js)

Local: `next-ecommerce-orders-queue-challenge`

Funcionalidades:
- SSG + ISR para SEO
- SWR para atualização periódica
- Componentes modulares (Status, Health, Logs, Jobs, Queue Controls, etc.)
- Timeline visual de geração/processamento
- Metadados estruturados (JSON-LD + Open Graph)
- Botões de ação (gerar, cancelar, resetar)

---

## Variáveis de Ambiente

### Backend
| Variável | Default | Descrição |
|----------|---------|-----------|
| MONGO_URI | (obrig.) | URI Mongo |
| REDIS_HOST | localhost | Host Redis |
| REDIS_PORT | 6379 | Porta Redis |
| PORT | 3000 | Porta HTTP |
| BACKEND_LOGS | true | Ativa logs arquivo |
| MAX_ORDERS | 1500000 | Limite de geração |
| ORDERS_QUEUE_CONCURRENCY | 25 | Concorrência worker |

### Frontend
| Variável | Default | Descrição |
|----------|---------|-----------|
| NEXT_PUBLIC_BACKEND_BASE_URL | http://localhost:3000 | Base da API |
| NEXT_PUBLIC_DASHBOARD_REFRESH | 5000 | Intervalo refresh (ms) |

---

## Execução Local

Pré-requisitos:
- Node 18+ / 20
- Redis
- MongoDB
- pnpm

### Backend
```bash
cd nest-backend
pnpm install
pnpm start
# API em http://localhost:3000
```

### Frontend
```bash
cd next-ecommerce-orders-queue-challenge
pnpm install
pnpm dev --port 3001
# Dashboard em http://localhost:3001
```

### Disparar Execução
```bash
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

---

## Docker (Opcional)

Ideias:
- Compose com serviços: backend, frontend, redis, mongo.
- Multi-stage build para reduzir imagem final.
- Healthchecks para readiness.

---

## Notas de Performance

Implementado:
- Geração em chunks (10k)
- `insertMany` para reduzir overhead
- Prioridade rígida (VIP antes de NORMAL)
- Índices para contagens rápidas
- Concorrência configurável

Possíveis otimizações:
- `bulkWrite` para updates de processamento
- Métricas de throughput (pedidos/seg)
- Escalonar múltiplos workers

---

## Troubleshooting (Resolução de Problemas)

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Fase parada em WAITING_VIP_DRAIN | VIP ainda processando ou travados | Ver `/pedidos/health/queue` |
| Contadores não sobem | Execução não iniciada | POST `/pedidos/generate` |
| Cancel não “para na hora” | Abort cooperativo | Aguardar, depois reset |
| Muitos failed | Instabilidade Redis/Mongo | Ver `/pedidos/logs` |
| Bloqueado para nova geração | Execução ativa | Cancelar ou aguardar DONE |
| Logs vazios | BACKEND_LOGS desativado | Ativar e reiniciar |
| Tempo muito alto NORMAL | Fila VIP grande ou baixa concorrência | Aumentar `ORDERS_QUEUE_CONCURRENCY` |

---

## Considerações de Segurança

Estado atual:
- Sem autenticação nos endpoints de controle.

Recomendado para produção:
- API Key / JWT / OAuth
- Rate limiting (ex: Nest RateLimiter)
- TLS (HTTPS)
- Auditoria de ações críticas (cancel, reset)

---

## Roadmap / Melhorias Futuras

| Área | Ideia |
|------|-------|
| Observabilidade | Endpoint Prometheus /metrics |
| Realtime | WebSocket / SSE para logs e fases |
| Histórico | Endpoint `/pedidos/runs` com paginação |
| UI | Gráficos de throughput / latência |
| Processamento | `bulkWrite` p/ reduzir I/O |
| Resiliência | Dead-letter queue |
| Escala | Multiprocess / horizontal scale |
| Segurança | RBAC + autenticação |
| UX | Notificações de fase / toast |
| Analytics | KPI de pedidos por segundo |

---

## Licença

MIT (ajuste conforme necessidade).

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
...
```

### Cheat Sheet Rápido

```bash
# Redis + Mongo
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 mongo:6

# Backend
cd nest-backend
pnpm install
pnpm start

# Frontend
cd next-ecommerce-orders-queue-challenge
pnpm install
pnpm dev --port 3001

# Disparar geração
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```