# Desafio: Fila de Pedidos de E-commerce (NestJS + BullMQ + MongoDB + Redis)

> Versão em Português – focada em clareza, completude técnica, diagnósticos e extensibilidade.

---

## Índice
- [Resumo Executivo (TL;DR)](#resumo-executivo-tldr)
- [Descrição do Desafio](#descrição-do-desafio)
- [Status de Atendimento aos Requisitos](#status-de-atendimento-aos-requisitos)
- [Arquitetura de Alto Nível](#arquitetura-de-alto-nível)
- [Fluxo Completo de Fases](#fluxo-completo-de-fases)
- [Modelo de Dados](#modelo-de-dados)
- [Estratégia de Geração de Pedidos](#estratégia-de-geração-de-pedidos)
- [Processamento Prioritário (VIP → NORMAL)](#processamento-prioritário-vip--normal)
- [Fila, Concorrência e Backpressure](#fila-concorrência-e-backpressure)
- [Métricas, Logs e Histórico de Execuções](#métricas-logs-e-histórico-de-execuções)
- [Cancelamento Seguro (Abort Cooperativo)](#cancelamento-seguro-abort-cooperativo)
- [Referência da API](#referência-da-api)
- [Formato da Resposta de /pedidos](#formato-da-resposta-de-pedidos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Exemplo de .env](#exemplo-de-env)
- [Execução Local](#execução-local)
- [Docker (Opcional)](#docker-opcional)
- [Exemplos de Uso (curl)](#exemplos-de-uso-curl)
- [Health & Monitoring](#health--monitoring)
- [Escalabilidade e Notas de Performance](#escalabilidade-e-notas-de-performance)
- [Decisões Técnicas](#decisões-técnicas)
- [Limitações Conhecidas](#limitações-conhecidas)
- [Troubleshooting](#troubleshooting)
- [Possíveis Evoluções Futuras](#possíveis-evoluções-futuras)
- [Licença](#licença)
- [Changelog Resumido](#changelog-resumido)

---

## Resumo Executivo (TL;DR)

| Objetivo | Status |
|----------|--------|
| Gerar ≥ 1 milhão de pedidos aleatórios | ✅ |
| Classificar prioridade (DIAMANTE → VIP) | ✅ |
| Processar totalmente VIP antes de NORMAL | ✅ (sequenciamento rígido) |
| Persistência NoSQL (MongoDB) | ✅ |
| Métricas de tempos (geração, enqueue, processamento) | ✅ |
| Contadores por prioridade | ✅ |
| Endpoint consolidado (/pedidos) | ✅ |
| Logs acessíveis (/pedidos/logs) | ✅ |
| Reset limpo (/pedidos/reset) | ✅ |
| Cancelamento seguro (/pedidos/cancel) | ✅ |
| Bloqueio de execução concorrente | ✅ |
| Histórico de execuções | ✅ |
| Throughput + ETA (extra) | ✅ |
| Health detalhado | ✅ |

> Interface visual (frontend) não faz parte desta entrega – foco no backend conforme solicitado.

---

## Descrição do Desafio

Simular um pipeline de e-commerce em larga escala que:

1. Gera 1.000.000+ pedidos.
2. Classifica pedidos VIP (tier DIAMANTE) vs NORMAL.
3. Usa fila (BullMQ + Redis) garantindo que todos os VIP sejam processados antes dos NORMAL.
4. Exibe tempos de geração, enfileiramento, processamento (janela inicial/final e duração), contagens e tempo global.
5. Fornece um endpoint de status central.
6. Suporta reset completo.
7. Expõe logs.
8. Persiste histórico de execuções.

---

## Status de Atendimento aos Requisitos

Todos os requisitos do enunciado foram atendidos. Recursos adicionais adicionados:
- ETA e throughput em tempo real.
- Cancelamento cooperativo.
- Health check com diagnósticos.
- Inspeção de jobs / estados de fila.
- Persistência de histórico.

---

## Arquitetura de Alto Nível

- **NestJS** com camadas: Domain / Application / Infrastructure / Presentation.
- **MongoDB**: pedidos e execuções.
- **Redis**: backend da fila.
- **BullMQ (v5)**: orquestração de jobs.
- **Logs em arquivo** (opcional via `BACKEND_LOGS=true`).
- **Métricas em memória** com snapshots persistidos.

### Diagrama (Mermaid)

```mermaid
flowchart TD
    A[POST /pedidos/generate] --> B(GenerateOrdersUseCase)
    B --> C[Enfileira job generateOrders]
    C -->|BullMQ| D[OrdersGenerationProcessor]
    D -->|bulk insert| M[(MongoDB)]
    D -->|enqueue VIP| Q[(Redis Queue)]
    Q --> W[OrdersWorkerProcessor]
    W -->|update status| M
    W -->|marca início/fim| L[LogsUseCase]
    L -->|persist snapshot| R[(process_runs)]
    S[GET /pedidos] --> L
    S --> M
    S --> ST[(State Service)]
```

---

## Fluxo Completo de Fases

| Fase | Descrição |
|------|-----------|
| IDLE | Aguardando início |
| GENERATING | Criando e inserindo chunks |
| ENQUEUE_VIP | Enfileirando VIP (durante geração) |
| WAITING_VIP_DRAIN | Esperando fila VIP esvaziar |
| ENQUEUE_NORMAL | Enfileirando NORMAL após VIP |
| WAITING_NORMAL_DRAIN | Aguardando fila NORMAL esvaziar |
| DONE | Execução concluída |
| ABORTED | Cancelada pelo usuário |
| ERROR | Falha ou timeout |

---

## Modelo de Dados

### Pedido (`orders`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador lógico |
| cliente | string | Nome simulado |
| valor | number | Preço aleatório |
| tier | enum | BRONZE / PRATA / OURO / DIAMANTE |
| priority | enum | VIP / NORMAL (derivado) |
| observacoes | string | Nota inicial → atualizada após processamento |
| status | string | 'pendente' → 'processado' |
| createdAt | Date | Timestamp de criação |

Índices: `id (único)`, `priority`, `(priority,status)`, `createdAt`.

### Execução (`process_runs`)

| Campo | Descrição |
|-------|-----------|
| runId | UUID da execução |
| generationTimeMs | Tempo de geração total |
| processingTimeVIPMs / Normal | Janela primeira→última processada |
| startVIP / endVIP | Limites VIP |
| startNormal / endNormal | Limites NORMAL |
| totalProcessedVIP / Normal | Contadores finais |
| enqueueVipTimeMs / Normal | Tempo de enfileiramento |
| totalTimeMs | Soma de segmentos |
| createdAt | Registro |

---

## Estratégia de Geração de Pedidos

- Chunk configurável: `GENERATION_CHUNK_SIZE` (padrão 10.000).
- Cada chunk:
    - Cria pedidos randômicos.
    - Persiste em bulk (`insertMany`).
    - Enfileira imediatamente só os VIP.
- NORMAL é postergado até finalização TOTAL dos VIP.
- Progresso incremental para ETA e throughput.

---

## Processamento Prioritário (VIP → NORMAL)

1. Gera + enfileira VIP a cada chunk.
2. Após gerar tudo, espera VIP terminar (fila drenada).
3. Enfileira NORMAL em lotes.
4. Espera drenagem NORMAL.
5. Marca execução como DONE.

Nenhum NORMAL é processado antes de todos VIP concluírem.

---

## Fila, Concorrência e Backpressure

| Aspecto | Implementação |
|---------|---------------|
| Nome da fila | `orders-queue` |
| Job macro | `generateOrders` |
| Job worker | `processOrder` |
| Prioridade VIP | 1 |
| Prioridade NORMAL | 2 |
| Concorrência | `ORDERS_QUEUE_CONCURRENCY` (default 25) |
| Backpressure | Chunk + batch + espera de dreno |

---

## Métricas, Logs e Histórico de Execuções

| Métrica | Origem |
|---------|--------|
| Tempo de geração | Loop de geração |
| Tempos de enqueue | Fases VIP / NORMAL |
| Janelas processamento | markStart / markEnd por prioridade |
| Throughput | Cálculo sobre janela temporal |
| ETA | Processado vs alvo + taxa média |
| Contadores processados | Query (status != 'pendente') |
| Tempo total | Soma de segmentos registrados |
| Fase | State service |
| Histórico | Persistência em `process_runs` |
| Alvo vs gerado | Contadores internos |

Logs em arquivo (opcional) + endpoint `/pedidos/logs`.

---

## Cancelamento Seguro (Abort Cooperativo)

Endpoint: `POST /pedidos/cancel`

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| purge | true | Limpa estados da fila (best effort) |
| removePending | true | Remove pedidos ainda 'pendente' do Mongo |
| resetLogs | false | Reseta métricas |

Fluxo:
1. Seta flag de aborto.
2. Pausa a fila.
3. (Opcional) Purga jobs.
4. (Opcional) Remove pedidos pendentes.
5. (Opcional) Reseta logs.
6. Espera parar (ou timeout).

Jobs ativos finalizam normalmente (consistência).

---

## Referência da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pedidos/generate?quantity=N` | Inicia pipeline (impede paralelismo) |
| GET | `/pedidos` | Status consolidado (requisito principal) |
| GET | `/pedidos/logs?lines=500` | Últimas linhas de log |
| GET | `/pedidos/health/queue` | Saúde + diagnósticos |
| POST | `/pedidos/cancel` | Cancelar execução em andamento |
| POST | `/pedidos/reset` | Limpa DB + métricas + fila |
| POST | `/pedidos/queue/pause` | Pausa globalmente |
| POST | `/pedidos/queue/resume` | Retoma fila |
| POST | `/pedidos/queue/clean?state=wait` | Limpa um estado |
| GET | `/pedidos/queue/status` | Contagem bruta da fila |
| GET | `/pedidos/queue/jobs?types=waiting,active` | Lista jobs |
| POST | `/pedidos/queue/close` | Fecha conexão da fila |

---

## Formato da Resposta de /pedidos

Exemplo reduzido:
```json
{
  "generationTimeMs": 18543,
  "enqueueVipTimeMs": 912,
  "enqueueNormalTimeMs": 2411,
  "processing": {
    "vip": { "start": "2025-09-30T09:10:12.123Z", "end": "2025-09-30T09:11:05.456Z", "timeMs": 53233, "count": 124578 },
    "normal": { "start": "2025-09-30T09:11:06.010Z", "end": null, "timeMs": 28765, "count": 203331 }
  },
  "totalTimeMs": 104921,
  "counts": { "vip": 124578, "normal": 203331 },
  "phase": "WAITING_NORMAL_DRAIN",
  "lastRunId": "ec0f9c0e-5d44-4dc2-b21d-2fd7f0ef9a80",
  "throughput": { "vip": 2450.12, "normal": 3221.44, "overall": 2811.77 },
  "eta": { "estimatedMs": 512345, "progressPercent": 32.11 },
  "progress": {
    "target": 1000000,
    "generated": 500000,
    "processedTotal": 327909
  }
}
```

---

## Variáveis de Ambiente

Apenas `MONGO_URI` é realmente obrigatória. As demais possuem default interno.

| Variável | Default | Obrigatória | Descrição |
|----------|---------|-------------|-----------|
| MONGO_URI | — | ✅ | String de conexão com MongoDB |
| REDIS_HOST | localhost | ❌ | Host do Redis |
| REDIS_PORT | 6379 | ❌ | Porta do Redis |
| PORT | 3000 | ❌ | Porta HTTP |
| BACKEND_LOGS | false* | ❌ | Ativa logs em arquivo (`true` para habilitar) |
| MAX_ORDERS | 1500000 | ❌ | Limite superior de proteção |
| GENERATION_CHUNK_SIZE | 10000 | ❌ | Tamanho dos chunks de geração |
| NORMAL_ENQUEUE_BATCH_SIZE | 10000 | ❌ | Lotes de enfileiramento NORMAL |
| ORDERS_QUEUE_CONCURRENCY | 25 | ❌ | Concorrência dos workers |
| LOG_PROGRESS_EVERY_MS | 5000 | ❌ | Intervalo de logs de progresso |
| LOG_MEMORY | false | ❌ | Log de uso de memória |

> *Se não definida explicitamente como "true", o serviço assume comportamento silencioso (sem persistência de arquivo).

---

## Exemplo de .env

### Mínimo
```
MONGO_URI=mongodb://localhost:27017/ecommerce
```

### Com autenticação
```
MONGO_URI=mongodb://usuario:senha@localhost:27017/ecommerce?authSource=admin
```

### Desenvolvimento com logs
```
MONGO_URI=mongodb://localhost:27017/ecommerce
BACKEND_LOGS=true
```

### Ajustado para maior concorrência (cautela)
```
MONGO_URI=mongodb://localhost:27017/ecommerce
ORDERS_QUEUE_CONCURRENCY=60
GENERATION_CHUNK_SIZE=15000
NORMAL_ENQUEUE_BATCH_SIZE=15000
```

---

## Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Subir Redis e Mongo (exemplo rápido)
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 mongo:6

# 3. Criar .env
echo "MONGO_URI=mongodb://localhost:27017/ecommerce" > .env

# 4. Iniciar
npm run start

# 5. Iniciar pipeline
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

---

## Docker (Opcional)

```yaml
version: "3.9"
services:
  mongo:
    image: mongo:6
    restart: unless-stopped
    ports: ["27017:27017"]
  redis:
    image: redis:7
    restart: unless-stopped
    ports: ["6379:6379"]
  api:
    build: ./nest-backend
    environment:
      MONGO_URI: mongodb://mongo:27017/ecommerce
      REDIS_HOST: redis
      BACKEND_LOGS: "true"
    depends_on:
      - mongo
      - redis
    ports:
      - "3000:3000"
```

---

## Exemplos de Uso (curl)

```bash
# Gerar 1 milhão
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"

# Status
curl "http://localhost:3000/pedidos" | jq

# Logs (últimas 300 linhas)
curl "http://localhost:3000/pedidos/logs?lines=300" | jq

# Cancelar execução
curl -X POST "http://localhost:3000/pedidos/cancel?purge=true&removePending=true&resetLogs=false"

# Reset completo
curl -X POST "http://localhost:3000/pedidos/reset"

# Status da fila
curl "http://localhost:3000/pedidos/queue/status" | jq

# Jobs waiting + active
curl "http://localhost:3000/pedidos/queue/jobs?types=waiting,active" | jq
```

---

## Health & Monitoring

`GET /pedidos/health/queue` retorna:
- Contadores: waiting, active, completed, failed, delayed
- Fase atual
- Flags: `isProcessing`, `aborting`
- Heurísticas: `hasFailedJobs`, `isStuck`, `aborted`
- Classificação final: `healthy | degraded | paused | aborted | error`

Utilidade:
- Detectar travamentos
- Monitorar acúmulo de falhas
- Base para alertas

---

## Escalabilidade e Notas de Performance

| Camada | Estratégia Atual | Possível Evolução |
|--------|------------------|--------------------|
| Geração | Chunk + insertMany | Paralelizar ou streaming multi-processo |
| Processamento | Concorrência fixa | Ajuste dinâmico adaptativo |
| Updates | Update documento a documento | `bulkWrite` batelado |
| Métricas | Consulta de contagem no Mongo | Cache incremental/Redis |
| Prioridade | Uma fila com prioridade | Fila dupla + coordenação |
| Logs | Append síncrono (opcional) | Buffer assíncrono |
| ETA | Média simples global | Modelo fase-aware / exponencial |

---

## Decisões Técnicas

| Decisão | Justificativa |
|---------|---------------|
| Dois estágios (VIP → NORMAL) | Garantir prioridade absoluta |
| Abort cooperativo | Evita inconsistências parciais |
| Contagem por status | Só conta realmente processados |
| Histórico de execuções | Comparação e auditoria |
| Fases explícitas | Observabilidade clara |
| ETA + Throughput | Visão operacional útil |
| Logs em arquivo | Simplicidade sem stack externa |

---

## Limitações Conhecidas

| Limitação | Impacto |
|-----------|---------|
| Fase/abort não persistidos | Reinício perde contexto |
| Cancel não encerra jobs ativos instantaneamente | Finalização graciosa |
| Logging síncrono pode reduzir throughput | Pequeno sob alta volumetria |
| `totalTimeMs` não é wall-clock exato | Interpretação analítica necessária |
| Sem métricas Prometheus padrão | Integração manual se desejado |

---

## Troubleshooting

| Sintoma | Causa Provável | Ação |
|---------|----------------|------|
| Travado em WAITING_VIP_DRAIN | VIP ainda ativos | Ver `/pedidos/queue/status` |
| Erro ao gerar | Quantidade > MAX_ORDERS | Ajustar env |
| Throughput baixo | I/O Mongo/Redis lento | Ajustar concorrência ou chunk |
| Cancel “demora” | Jobs ativos terminando | Aguardar ou reset |
| ETA nula | Pouco progresso ainda | Esperar |
| Muitos failed | Falha infra / update | Ver `/pedidos/logs` |
| Fase perdida após restart | Estado volátil | Persistir estado (melhoria futura) |

---

## Possíveis Evoluções Futuras

- Migração para BullMQ.
- Persistência da fase para retomar após falha.
- Endpoint Prometheus (`/metrics`).
- Streaming de logs (SSE/WebSocket).
- Dead-letter para falhas recorrentes.
- BulkWrite otimizado para updates de status.
- Sharding multi-tenant.
- Ajuste adaptativo de concorrência (feedback loop).
- Reprocessamento seletivo ou retomada parcial.
- Observabilidade via OpenTelemetry.

---

## Licença

MIT (exemplo)

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy...
```




