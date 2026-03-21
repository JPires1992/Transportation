# Transport Management System - Domain Model

## Core Models

### User (MySQL)
Represents individuals interacting with the transport system. Each user has an id, name, email, phone, and creation timestamp. Users maintain a one-to-many relationship with their historical interactions and are linked to login sessions for authentication.

### Vehicle (MySQL)
Represents transport vehicles in the system. Each vehicle includes an id, matricula (registration plate), type, capacity, and operational status. Vehicles relate to their movement history and to the routes they operate.

### UserHistory (MongoDB)
Documents capturing user interactions with the transport network over time. Each record stores the user_id, stop_id, timestamp, geographical coordinates, and action type. This model creates a temporal record of user behavior patterns across the stop network.

### VehicleHistory (MongoDB)
Time-series documents tracking vehicle movements and status changes. Records include vehicle_id, stop_id, route_id, timestamp, location coordinates, and status. These documents form a comprehensive tracking log of each vehicle's journey through the route network.

### Stop (Neo4j)
Graph nodes representing physical stops in the transport network. Each stop has a unique id, name, geographical point coordinates, type classification, and zone assignment. Stops serve as connection points for both routes and historical tracking records.

### Route (Neo4j)
Graph nodes representing transport routes. Each route contains an id, name, route number, schedule information, and active status. Routes define the sequences of stops that vehicles follow during operation.

### Login (Redis)
Session cache entries storing active user authentication. Each entry uses a key-value structure containing user_id, authentication token, and expiration timestamp. Sessions are automatically removed when they expire.

## Relationships

**User → UserHistory**: One-to-many relationship where each user has multiple historical interaction records. The user_id in UserHistory documents links back to the User entity, creating a complete audit trail of user activity.

**Vehicle → VehicleHistory**: One-to-many relationship tracking all movement records for each vehicle. The vehicle_id reference connects historical tracking data to the base vehicle entity.

**Vehicle → Route**: Many-to-one relationship indicating which route a vehicle is currently operating. This "operates route" relationship enables real-time tracking of route coverage.

**UserHistory → Stop**: Many-to-one relationship connecting user interaction records to specific stops in the graph network. The stop_id reference indicates which stop the user "visited" during each recorded interaction.

**VehicleHistory → Stop**: Many-to-one relationship linking vehicle tracking records to stops. Each record captures when a vehicle "passed through" a particular stop, creating temporal snapshots of vehicle progression.

**Route → Stop**: One-to-many relationship defining the stop sequence for each route. The "BELONGS_TO" relationship creates ordered edges in the graph, establishing the exact path vehicles follow along each route.

**User → Login**: One-to-one relationship representing active user sessions. The Login cache entry maintains the connection between authenticated sessions and their corresponding users.

