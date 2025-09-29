# Configuração MongoDB & Redis Docker para o Desafio de Pedidos E-commerce

Este repositório fornece uma configuração pronta para uso do MongoDB e Redis via Docker, projetada para o desafio de simulação de pedidos em alta escala para e-commerce.

---

## Exemplo

<img src="./mongodb/example/mongodb-example.png" alt="" width="800"/> 

---

## Funcionalidades

- **MongoDB 6.0** rodando em um container Docker
- **Redis 7.2** para processamento de filas com BullMQ
- Usuário pré-configurado `vidigalcode` (senha `test1234`)
- Criação automática do banco de dados `ecommerce` e da coleção `orders` com índices úteis
- Armazenamento persistente via volume Docker
- Acessível tanto de outros containers Docker quanto externamente (máquina host)

## Como Utilizar

1. **Clone este repositório**
2. **Execute o Docker Compose:**

   ```bash
   docker-compose up -d
   ```

3. **O MongoDB estará disponível em:**

   ```
   mongodb://vidigalcode:test1234@localhost:27017/ecommerce?authSource=admin
   ```

   Você pode usar essa string de conexão na sua aplicação backend *dentro ou fora de um container Docker*.

4. **O Redis estará disponível em:**

   ```
   redis://localhost:6379
   ```

   Use este endereço para BullMQ ou qualquer implementação de filas.

## Script de Inicialização

O arquivo `mongo-init.js` irá:
- Criar o banco de dados `ecommerce`
- Criar a coleção `orders`
- Adicionar índices para consultas mais rápidas por `id`, `tier` e `priority`

## Como Acessar o MongoDB

Você pode utilizar qualquer cliente MongoDB ou conectar a partir da sua aplicação backend usando:

```
mongodb://vidigalcode:test1234@localhost:27017/ecommerce?authSource=admin
```

Ou, de outro container Docker na mesma rede, use:

```
mongodb://vidigalcode:test1234@mongo:27017/ecommerce?authSource=admin
```

## Como Acessar o Redis

Você pode utilizar qualquer cliente Redis ou conectar a partir da sua aplicação backend usando:

```
redis://localhost:6379
```

Ou, de outro container Docker na mesma rede, use:

```
redis://redis:6379
```

## Parar e Remover

Para parar os containers:

```bash
docker-compose down
```

Para remover os dados, exclua também o volume `mongo_data`:

```bash
docker-compose down -v
```



