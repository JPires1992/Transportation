# Contexto da Arquitetura - Sistema de Gestão de Transportes Públicos

## Visão Geral
Aplicação de gestão de transportes públicos com arquitetura **polyglot** (múltiplas bases de dados especializadas).

## Objetivo
Permitir aos utilizadores acompanhar o histórico de deslocações e tracking em tempo real de veículos de transporte público.

---

## Modelos de Dados e Tecnologias

### 1. MySQL (Relacional)

#### User
- **Tipo**: Dados estruturados e relacionais
- **Justificação**: Informação base dos utilizadores que requer consistência ACID
- **Campos**: id, name, email, etc.

#### Vehicle
- **Tipo**: Dados estruturados e relacionais
- **Justificação**: Informação base dos veículos (matrícula, tipo, capacidade)
- **Relação**: Um veículo faz uma ou várias rotas
- **Exemplo**: Veículo com matrícula X faz a rota Y (vários veículos podem fazer a mesma rota)

---

### 2. MongoDB (Document/NoSQL)

#### UserHistory
- **Tipo**: Document store
- **Justificação**: Alta frequência de escrita, dados temporais, schema flexível
- **Função**: Pivot entre User e Stops com timestamps
- **Campos**: 
  - user_id (referência para MySQL User)
  - stop_id (referência para Neo4j Stop)
  - timestamp
  - location coordinates
- **Uso**: Histórico de paragens que o utilizador percorreu

#### VehicleHistory
- **Tipo**: Document store
- **Justificação**: Tracking em tempo real requer alta performance em escrita
- **Função**: Histórico de movimentação dos veículos
- **Campos**:
  - vehicle_id (referência para MySQL Vehicle)
  - stop_id (referência para Neo4j Stop)
  - route_id (referência para Neo4j Route)
  - timestamp
  - location coordinates
  - status
- **Uso**: Acompanhamento em direto da posição dos veículos

---

### 3. Neo4j (Grafo)

#### Stop
- **Tipo**: Nó de grafo
- **Justificação**: Relações complexas entre paragens e rotas
- **Campos**: id, name, coordinates, type
- **Relações**: Pertence a múltiplas rotas

#### Route
- **Tipo**: Nó de grafo
- **Justificação**: Modelar sequência de paragens como arestas
- **Campos**: id, name, number, schedule
- **Composição**: Uma rota é composta por vários Stops
- **Relação**: As arestas entre Route e Stop contêm informação de ordem/sequência

**Exemplo de Grafo**:
```
Route1 -[STOP_1]-> Stop_A -[STOP_2]-> Stop_B -[STOP_3]-> Stop_C
```

---

### 4. Redis (Cache/Key-Value)

#### Login
- **Tipo**: Cache key-value
- **Justificação**: Performance para validação de sessões
- **Estrutura**: 
  - Key: `user:{user_id}:token` ou `session:{token}`
  - Value: JSON com user_id, session_data, expires_at
- **Uso**: Gestão de sessões de login ativas

---

## Relações entre Entidades

### Relações Diretas (Mesma BD)
- **User ↔ UserHistory**: 1 para N (um user tem múltiplos registos de histórico)
- **Vehicle ↔ VehicleHistory**: 1 para N (um veículo tem múltiplos registos de histórico)
- **Stop ↔ Route**: N para N através de arestas com ordem (grafo)

### Relações Cross-Database
- **Vehicle → Route**: N para N (um veículo faz rotas, uma rota tem vários veículos)
  - MySQL Vehicle.id ↔ Neo4j Route.id
  
- **UserHistory → Stop**: N para N
  - MongoDB UserHistory.stop_id ↔ Neo4j Stop.id
  
- **VehicleHistory → Stop**: N para N
  - MongoDB VehicleHistory.stop_id ↔ Neo4j Stop.id
  
- **User → Login**: 1 para 1 (sessão ativa)
  - MySQL User.id ↔ Redis key pattern

---

## Decisões de Design

### Por que Polyglot?

1. **MySQL para User e Vehicle**
   - Dados estruturados e estáveis
   - Necessidade de integridade referencial
   - Queries relacionais complexas

2. **MongoDB para Histories**
   - Escrita intensiva (tracking em tempo real)
   - Schema flexível para adicionar campos
   - Time-series data com timestamps
   - Boa performance para agregações temporais

3. **Neo4j para Stop e Route**
   - Modelação natural de rede de transportes
   - Queries eficientes para "encontrar rota entre A e B"
   - Visualização de rede de paragens
   - Algoritmos de pathfinding nativos

4. **Redis para Login**
   - Latência ultra-baixa para validação de sessões
   - TTL automático para expiração de tokens
   - Alta disponibilidade

---

## Notas de Implementação

- O código atual em frontend/backend será substituído
- Os indexes atuais não são relevantes
- Esta é a estrutura target para reimplementação
- Considerar uso de ORMs/ODMs específicos:
  - Sequelize/TypeORM para MySQL
  - Mongoose para MongoDB
  - Neo4j Driver/Cypher
  - ioredis/redis para Redis

---

## Casos de Uso Principais

1. **User tracking**: Utilizador faz check-in numa paragem → cria registo em UserHistory
2. **Vehicle tracking**: Veículo reporta posição a cada X segundos → cria registo em VehicleHistory
3. **Route planning**: Utilizador quer ir de Stop A para Stop B → query no Neo4j
4. **Real-time updates**: Dashboard mostra posição atual dos veículos → query em VehicleHistory (últimos registos)
5. **Authentication**: User faz login → cria sessão em Redis, valida em cada request

---

**Data de Criação**: 2025-10-19
**Versão**: 1.0

