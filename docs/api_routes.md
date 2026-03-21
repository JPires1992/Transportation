### Suggested Route Aggregates (API Modules)

| **Aggregate / Module**                   | **Database(s)** | **Purpose**                                               |  **Example Routes**                                                                         |
| ---------------------------------------- | --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **1. User Management & Authentication**  | MySQL + Redis   | Manage user accounts, sessions, and authentication.       | `/auth/signup` – register new user<br>`/auth/login` – authenticate and create session<br>`/auth/logout` – terminate session<br>`/users/{id}` – get user profile                             |
| **2. Transportation Information**        | MySQL + Neo4j   | Manage structured transport data: lines, stops, vehicles. | `/lines` – list bus lines<br>`/lines/{id}` – line details<br>`/lines/{id}/stops` – itinerary<br>`/stops` – list stops<br>`/stops/{id}` – stop info                                          |
| **3. Real-Time Simulation & Monitoring** | MongoDB         | Track live bus positions and ETAs (real-time).            | `/vehicles` – list active vehicles<br>`/vehicles/{id}/position` – current position<br>`/stops/{id}/eta` – estimated arrival<br>**WebSocket:** `/ws/vehicles` for live tracking              |
| **4. Trip History & Analysis**           | MongoDB + Neo4j | Record and analyze user trips.                            | `/trips` – list user trips<br>`/trips/{id}` – trip details<br>`/trips/stats` – user statistics                                                                                              |
| **5. User Interaction & Feedback**       | MongoDB | Handle preferences, favorites, and notifications.         | `/users/me/preferences/notification` – manage preferences<br>`/users/me/favorites` – add/get/update favorite lines<br>`/users/me/feedback` – submit feedback<br>`/notifications/{userId}` – list active notifications  |
| **6. Route Optimization & Planning**     | Neo4j + Redis          | Calculate and return optimized travel routes.             | `/routes/plan` – get optimized route<br>`/routes/plan/history` – previous route queries                                                                                                     |
| **7. System Administration (optional)**  | MySQL           | Administrative control and monitoring.                    | `/admin/vehicles` – manage fleet<br>`/admin/routes` – manage transport lines                                                                                                                |


### Mapping Requirements > Route Aggregates

| **Requirement**                                 | **Aggregate**              | **Database(s)** |
| ----------------------------------------------- | -------------------------- | --------------- |
| Transportation Info (lines, stops, itineraries) | Transportation Information | MySQL + Neo4j   |
| Real-Time Vehicle Monitoring & ETA              | Real-Time Simulation       | MongoDB         |
| Trip History & User Stats                       | Trip History & Analysis    | MongoDB         |
| Favorites, Preferences, Feedback                | User Interaction           | MongoDB         |
| Authentication & Security                       | User Management            | MySQL + Redis   |
| Automatic Route Suggestions                     | Route Optimization         | Neo4j           |
