# E-commerce Orders Queue Challenge

Implementação full‑stack de um pipeline de geração e processamento prioritário de pedidos em larga escala para e-commerce.  
Backend (NestJS + Bull + MongoDB + Redis) e Frontend (Next.js 15 + React 19 + Tailwind) trabalhando juntos para:

- Gerar 1.000.000+ de pedidos aleatórios.
- Diferenciar e priorizar pedidos VIP (tier DIAMANTE) sobre pedidos normais.
- Processar em duas fases (todos os VIP primeiro, depois os NORMAL).
- Expor métricas de execução, logs, health e operações de controle (gerar / cancelar / resetar).
- Fornecer um dashboard de monitoramento com atualização quase em tempo real (poll + ISR).

---

## Estrutura do Repositório

| Camada   | Caminho | Descrição |
|----------|---------|-----------|
| Backend  | [`nest-backend`](https://github.com/Vidigal-code/ecommerce-orders-queue-challenge/tree/main/nest-backend) | API NestJS, workers da fila, persistência, métricas |
| Frontend | [`next-frontend`](https://github.com/Vidigal-code/ecommerce-orders-queue-challenge/tree/main/next-frontend) | Dashboard Next.js (monitoramento e controle) |

Referências diretas (como solicitado):
- Backend: `@Vidigal-code/ecommerce-orders-queue-challenge/files/nest-backend`
- Frontend: `@Vidigal-code/ecommerce-orders-queue-challenge/files/next-frontend`

---

## Resumo do Desafio (Requisitos)

| Requisito | Implementado |
|-----------|--------------|
| Gerar 1M de pedidos aleatórios (id, cliente, valor, tier, observacoes) | ✅ |
| Derivar prioridade: DIAMANTE → VIP; demais → NORMAL | ✅ |
| Armazenar em NoSQL (MongoDB) com campo `priority` | ✅ |
| Processamento via fila (Bull / BullMQ like) | ✅ (Bull) |
| Garantir conclusão 100% dos VIP antes de NORMAL | ✅ |
| Atualização de status/observação por prioridade | ✅ |
| Medir tempos de geração + processamento por prioridade | ✅ |
| Registrar início/fim por prioridade | ✅ |
| Endpoint único de status GET `/pedidos` | ✅ |
| Logs detalhados (tempos e contagens) | ✅ |
| Reset completo (DB + fila + métricas) | ✅ |
| Escalabilidade (chunking + fila) | ✅ |
| Dashboard de monitoramento | ✅ |
| Cancelamento seguro (abort cooperativo) | ✅ (extra) |
| Endpoint de health | ✅ |
| Persistência histórica (process_runs) | ✅ |

---

## Arquitetura (Visão Geral)

```
Usuário / Dashboard (Next.js)
        |
        v
  GET/POST /pedidos (NestJS)
        |
   +----+------------------------------+
   |  OrdersProcessor (Bull Consumer)  |
   |  - Gera chunks (10k)              |
   |  - Enfileira VIP on-the-fly       |
   |  - Espera drenar VIP              |
   |  - Enfileira NORMAL               |
   |  - Espera drenar NORMAL           |
   +----------------+------------------+
                    |
          MongoDB (orders, process_runs)
                    |
                Redis (Bull queue)
```

---

## Ciclo de Processamento (Fases)

1. `IDLE` – Ocioso
2. `GENERATING` – Gerando e salvando pedidos
3. `ENQUEUE_VIP` – Enfileirando VIP enquanto gera
4. `WAITING_VIP_DRAIN` – Aguardando concluir todos VIP
5. `ENQUEUE_NORMAL` – Enfileirando pedidos NORMAL
6. `WAITING_NORMAL_DRAIN` – Aguardando concluir NORMAL
7. `DONE` – Execução finalizada com sucesso
8. `ERROR` – Erro ou cancelamento manual

---

## Modelo de Dados (Backend)

### Documento Order (coleção: `orders`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador lógico |
| cliente | string | Nome sintético |
| valor | number | Valor aleatório |
| tier | enum (BRONZE / PRATA / OURO / DIAMANTE) | Define prioridade |
| priority | enum (VIP / NORMAL) | Derivado de tier |
| observacoes | string | Observação aleatória + sobrescrita no processamento |
| status | string | 'pendente' → status final |
| createdAt | Date | Timestamp |
| Índices | id (unique), priority, (priority,status), createdAt | Performance |

### Documento ProcessRun (coleção: `process_runs`)

Armazena histórico de execuções: tempos, contagens, tempos de enfileiramento, runId, timestamps.

---

## Endpoint Principal (GET /pedidos)

Exemplo simplificado de resposta:
```json
{
  "generationTimeMs": 8423,
  "enqueueVipTimeMs": 1300,
  "enqueueNormalTimeMs": 2945,
  "processing": {
    "vip": {
      "start": "2025-09-29T11:10:01.400Z",
      "end": "2025-09-29T11:10:25.900Z",
      "timeMs": 24500,
      "count": 250000
    },
    "normal": {
      "start": "2025-09-29T11:10:26.050Z",
      "end": null,
      "timeMs": 0,
      "count": 0
    }
  },
  "totalTimeMs": 32923,
  "counts": {
    "vip": 250000,
    "normal": 0
  },
  "phase": "WAITING_NORMAL_DRAIN",
  "lastRunId": "c2d5baf0-..."
}
```

---

## Demais Endpoints Importantes

| Método | Caminho | Função |
|--------|---------|--------|
| POST | `/pedidos/generate?quantity=1000000` | Inicia pipeline completo |
| POST | `/pedidos/cancel?purge=true&removePending=true` | Cancela execução ativa |
| POST | `/pedidos/reset` | Limpa DB + fila + métricas |
| GET | `/pedidos/health/queue` | Saúde da fila / processor |
| GET | `/pedidos/logs?lines=300` | Logs recentes + estatísticas |
| GET | `/pedidos/queue/status` | Contadores da fila |
| GET | `/pedidos/queue/jobs?types=waiting,active` | Lista jobs |
| POST | `/pedidos/queue/pause` | Pausa fila |
| POST | `/pedidos/queue/resume` | Resume fila |
| POST | `/pedidos/queue/clean?state=wait` | Limpa estado específico |
| POST | `/pedidos/queue/close` | Fecha conexão da fila |
| POST | `/pedidos/process` | (Depreciado) |

---

## Cancelamento & Reset

### Cancel (`POST /pedidos/cancel`)
- Seta flag interna de abort
- Pausa fila
- (Opcional) purge jobs
- (Opcional) remove pendentes
- (Opcional) reseta logs
- Fase final marcada como `ERROR` (abortado)

### Reset (`POST /pedidos/reset`)
- Purge de todos os estados da fila
- Apaga documentos de `orders`
- Limpa histórico `process_runs`
- Zera métricas em memória

---

## Logs & Métricas

- Métricas em memória + persistência ao final
- Logs em arquivo (info / warn / error) se habilitado por env
- Endpoint `/pedidos/logs` retorna colunas + “quick stats” (VIP vs NORMAL)
- Persistência best-effort mesmo em erro/abort

---

## Dashboard Frontend (Next.js)

Funcionalidades:
- Iniciar geração
- Acompanhar fase, contagens, tempos
- Cancelar / Resetar / Pausar / Retomar / Limpar estados
- Visualizar logs (colunas separadas)
- Listar jobs waiting/active/failed
- Barra de timeline (Geração x VIP x NORMAL)
- Badge de fase
- Meta tags para SEO + JSON-LD

---

## Variáveis de Ambiente

### Backend
| Variável | Default | Descrição |
|----------|---------|-----------|
| MONGO_URI | (obrigatório) | Conexão Mongo |
| REDIS_HOST | localhost | Host Redis |
| REDIS_PORT | 6379 | Porta Redis |
| PORT | 3000 | Porta HTTP |
| BACKEND_LOGS | true | Ativa logs por arquivo |
| MAX_ORDERS | 1500000 | Limite de proteção |
| ORDERS_QUEUE_CONCURRENCY | 25 | Concorrência processamento |

### Frontend
| Variável | Default | Descrição |
|----------|---------|-----------|
| NEXT_PUBLIC_BACKEND_BASE_URL | http://localhost:3000 | Base da API |
| NEXT_PUBLIC_DASHBOARD_REFRESH | 5000 | Intervalo de atualização (ms) |

---

## Execução Local (Quick Start)

```bash
# 1. Infraestrutura
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 mongo:6

# 2. Backend
cd nest-backend
cp .env.example .env   # se houver
pnpm install
pnpm start

# 3. Frontend
cd ../next-frontend
cp .env.example .env.local  # se houver
pnpm install
pnpm dev --port 3001

# 4. Disparar execução
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

Dashboard: http://localhost:3001  
API Base: http://localhost:3000/pedidos

---

## Performance & Escalabilidade

Já implementado:
- Geração em chunks (10k) → menor uso de memória
- Insert em lote (`insertMany`)
- Separação rígida de prioridade (VIP → NORMAL)
- Índices otimizados para contagem filtrada
- Concorrência configurável

Possíveis melhorias futuras:
- `bulkWrite` para updates de processamento
- Métrica de throughput (pedidos/seg)
- Escala horizontal (múltiplos workers)
- Migração para BullMQ
- Streaming de logs (WebSocket/SSE)

---

## Troubleshooting

| Sintoma | Causa | Ação |
|---------|-------|------|
| Travado em `WAITING_VIP_DRAIN` | Fila VIP ainda processando | Ver `/pedidos/health/queue` |
| Contadores não sobem | Execução não iniciou | POST `/pedidos/generate` |
| Cancel “demora” | Jobs ativos finalizando | Aguardar ou reset |
| Muitos failed | Instabilidade Redis/Mongo | Ver `/pedidos/logs` |
| Não inicia nova execução | Fase ativa não terminou | Cancelar ou aguardar DONE |
| Logs vazios | Logging desativado | Ativar `BACKEND_LOGS=true` |

---

## Melhorias Futuras

- Listagem histórica: `/pedidos/runs`
- Métricas Prometheus `/metrics`
- Streaming (WebSocket / SSE)
- Autenticação (API Key / JWT)
- Dead-letter queue
- Gráficos de throughput/falhas
- Execução retomável parcial

---

## Licença

MIT (ajuste conforme necessidade).

---

## Agradecimentos

Implementado como solução completa do desafio “NodeJS + Fila + NoSQL – Processamento Massivo Prioritário”, com foco em correção, observabilidade, prioridade rigorosa e clareza operacional.

---

### Cheat Sheet Rápido

```bash
POST /pedidos/generate?quantity=1000000   # iniciar
POST /pedidos/cancel                      # cancelar
POST /pedidos/reset                       # limpar
GET  /pedidos                             # status
GET  /pedidos/logs?lines=300              # logs
GET  /pedidos/health/queue                # health
```

Bom uso! 🚀