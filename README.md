# TABDD - Test All Bases Database Demo

**RedLine Auto** - A car dealership management system built for testing and comparing different database types. Created for academic purposes to demonstrate and experiment with various database technologies in a realistic application context.

## 🎯 Purpose

This project provides a practical playground for testing:
- **Relational Databases** (MySQL) - Users and Cars models
- **Key-Value Stores** (Redis) - Settings and caching
- **Future expansions**: MongoDB, Cassandra, Neo4j, etc.

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │  (Nginx - HTML/CSS/JS)
│  Port 8080  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │  (Node.js + Express)
│  Port 3000  │  (REST API)
└──────┬──────┘
       │
       ├─────────→ ┌─────────┐
       │           │  MySQL  │  (Users, Cars)
       │           │  :3306  │
       │           └─────────┘
       │
       └─────────→ ┌─────────┐
                   │  Redis  │  (Cache, Settings)
                   │  :6379  │
                   └─────────┘
```

## 📁 Project Structure

```
tabdd/
├── docker-compose.yml       # Orchestrates all services
├── backend/                 # Node.js API
│   ├── server.js           # Main application logic
│   ├── package.json        # Node dependencies
│   └── Dockerfile          # Backend container config
├── frontend/                # Simple web interface
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Styling
│   ├── app.js              # Frontend logic
│   └── Dockerfile          # Frontend container config
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 3000, 3306, 6379, and 8080 available

### Running the Application

1. **Clone/Navigate to the project:**
   ```bash
   cd /Users/gustavocaiano/docs/github/isep/tabdd
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000/api
   - MySQL: localhost:3306
   - Redis: localhost:6379

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

5. **Stop and remove all data (fresh start):**
   ```bash
   docker-compose down -v
   ```

## 🔌 API Endpoints

### Health Check
- `GET /api/health` - Check system status

### Users (MySQL)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```
- `DELETE /api/users/:id` - Delete user

### Cars (MySQL)
- `GET /api/cars` - List all cars
- `GET /api/cars/:id` - Get specific car
- `POST /api/cars` - Create car
  ```json
  {
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2023,
    "color": "Blue",
    "user_id": 1
  }
  ```
- `DELETE /api/cars/:id` - Delete car

### Settings (Redis)
- `GET /api/settings` - Get all settings
- `POST /api/settings` - Add/update setting
  ```json
  {
    "key": "feature_flag",
    "value": "enabled"
  }
  ```

### Cache Management
- `GET /api/cache/stats` - Get cache statistics
- `DELETE /api/cache/clear` - Clear all cache

## 💡 Features

### Current Implementation

1. **MySQL (Relational Database)**
   - Users table with name and email
   - Cars table with brand, model, year, color
   - Foreign key relationship (user_id in cars)
   - Automatic timestamp tracking

2. **Redis (Key-Value Cache)**
   - Settings storage (app configuration)
   - Query result caching (60-second TTL)
   - Cache invalidation on data changes
   - Shows "cache" vs "database" source in responses

3. **Caching Strategy**
   - User and car queries are cached
   - Cache automatically invalidated on CREATE/DELETE
   - Visual indicators show data source (cache vs database)

### Frontend Features
- **Dashboard**: Overview with statistics and recent activity
- **Inventory Management**: Vehicle catalog with card-based layout
- **Customer Database**: Customer registration and management
- **Admin Panel**: System configuration and database management
- **Multi-page Navigation**: Realistic application flow
- **Modal Dialogs**: Professional UX for data entry
- **Cache Indicators**: Visual feedback on data source
- **Black & Red Theme**: Professional, modern design

## 🔮 Future Extensions

This project is designed to be easily extended with additional database types:

### MongoDB (Document Database)
**Use cases:** Products catalog, blog posts, flexible schemas
```javascript
// Example: Add products collection
{
  name: "Product",
  description: "...",
  categories: ["electronics", "gadgets"],
  specs: { /* flexible schema */ }
}
```

### Cassandra (Wide-Column Store)
**Use cases:** Time-series data, sensor readings, analytics
```javascript
// Example: IoT sensor data
{
  sensor_id: "...",
  timestamp: "...",
  temperature: 25.5,
  humidity: 60
}
```

### Neo4j (Graph Database)
**Use cases:** Social networks, maps, traffic coordination
```javascript
// Example: Road network
User -[DRIVES]-> Car
Car -[PARKED_AT]-> Location
Location -[CONNECTED_TO]-> Location
```

### PostgreSQL with PostGIS (Geospatial)
**Use cases:** Location tracking, route planning
```sql
-- Example: Store car locations
CREATE TABLE car_locations (
  car_id INT,
  location GEOGRAPHY(POINT)
);
```

### Extension Guide

1. Add new service to `docker-compose.yml`
2. Create new API endpoints in `backend/server.js`
3. Add UI section in `frontend/index.html`
4. Update this README with use cases

## 🛠️ Development

### Local Development (without Docker)

1. **Start MySQL:**
   ```bash
   mysql -u root -p
   CREATE DATABASE tabdd;
   CREATE USER 'tabdd_user'@'localhost' IDENTIFIED BY 'tabdd_pass';
   GRANT ALL ON tabdd.* TO 'tabdd_user'@'localhost';
   ```

2. **Start Redis:**
   ```bash
   redis-server
   ```

3. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

4. **Serve Frontend:**
   ```bash
   cd frontend
   python3 -m http.server 8080
   # or use any HTTP server
   ```

### Environment Variables

Backend supports these environment variables:
- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL user (default: tabdd_user)
- `DB_PASSWORD` - MySQL password (default: tabdd_pass)
- `DB_NAME` - MySQL database (default: tabdd)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `PORT` - Backend port (default: 3000)

## 📊 Database Comparison

| Database | Type | Use Case in Project | Future Use Cases |
|----------|------|---------------------|------------------|
| MySQL | Relational | Users, Cars | Transactions, complex queries |
| Redis | Key-Value | Settings, Cache | Session storage, real-time data |
| MongoDB | Document | - | Products, flexible schemas |
| Cassandra | Wide-Column | - | Time-series, analytics |
| Neo4j | Graph | - | Maps, relationships, routes |
| PostgreSQL+PostGIS | Spatial | - | Location tracking |

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process using port 3000 (example)
lsof -i :3000
kill -9 <PID>
```

### MySQL connection refused
```bash
# Check if MySQL is ready
docker-compose logs mysql
# Wait for "ready for connections" message
```

### Reset everything
```bash
docker-compose down -v
docker-compose up --build
```

## Seeding (dados de arranque)

- O backend gera dados automaticamente no arranque se as bases estiverem vazias.  
- **Neo4j**: por defeito procura paragens reais da STCP (https://stcp.pt/api/route/{line}/stops/direction), grava stops e horários sintéticos nas relações BELONGS_TO/NEXT; se falhar ou estiver desativado, usa o dataset de fallback (backend/seeds/stcpDataset.js).  
- **MySQL**: cria 500 utilizadores (`User001`...`User500`, password `Pass1234`) e veículos associados às linhas de fallback.  
- **MongoDB**: cria preferências e 20–30 viagens por utilizador coerentes com as linhas/paragens disponíveis.  
- **Redis**: só para sessões/cache; sem seed dedicado.

Recriar dados do zero:
1. Limpar dados (opção simples): docker-compose down -v para apagar volumes de MySQL/Mongo/Neo4j.  
   - Alternativa manual: truncar/remover tabelas e coleções e correr `MATCH (n) DETACH DELETE n` em Neo4j.
2. Arrancar de novo: docker-compose up --build.  
3. Os seeds só inserem se as bases estiverem vazias (idempotente).

Configuração:
- SEED_ON_BOOT (default ativo): definir para `false` desativa os seeds automáticos.  
- SEED_USE_STCP_API (default true): controla se tenta procurar paragens reais à STCP; se `false`, usa apenas o dataset de fallback.


### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

## 📚 Learning Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/docs/)
- [Express.js](https://expressjs.com/)

## 📝 License

MIT License - Feel free to use for academic and personal projects.

## 👨‍💻 Author

Created for academic purposes at ISEP - Testing different database technologies.

---

**Happy Database Testing! 🗄️**

