// relacionado com tracking em tempo real (MongoDB)

class VehicleHistoryRepository {
  constructor(mongoClient) {
    // Expecting mongoClient to be the connected client or db object depending on injection
    // Based on initMongoDB, it returns { client, db }. We likely receive the 'db' instance here.
    this.db = mongoClient; 
    this.collectionName = 'vehicle_history';
  }

  get collection() {
    return this.db.collection(this.collectionName);
  }

  /**
   * Obter a posição mais recente de um veículo
   * @param {number|string} vehicleId - ID do veículo
   * @returns {Promise<Object|null>} - Última posição registada do veículo
   */
  async getLatestVehiclePosition(vehicleId) {
    try {
      // Ensure index exists for performance (could be done in init, but check here)
      // vehicleId should be cast to match storage type (likely int or string)
      const query = { vehicle_id: vehicleId };
      
      const result = await this.collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
        
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('MongoDB getLatestVehiclePosition error:', error);
      return null;
    }
  }

  /**
   * Obter histórico de posições de um veículo num intervalo de tempo
   * @param {number|string} vehicleId - ID do veículo
   * @param {Object} timeRange - { start: Date, end: Date }
   * @returns {Promise<Array>} - Array de registos de posição
   */
  async getVehicleHistory(vehicleId, timeRange) {
    try {
      const query = {
        vehicle_id: vehicleId,
        timestamp: {
          $gte: new Date(timeRange.start),
          $lte: new Date(timeRange.end)
        }
      };

      return await this.collection
        .find(query)
        .sort({ timestamp: 1 })
        .toArray();
    } catch (error) {
      console.error('MongoDB getVehicleHistory error:', error);
      return [];
    }
  }

  /**
   * Criar novo registo de histórico de veículo
   * @param {Object} historyData - { vehicle_id, timestamp, lat, lng, speed, heading, status }
   * @returns {Promise<Object>} - Documento criado
   */
  async createVehicleHistory(historyData) {
    try {
      const doc = {
        ...historyData,
        created_at: new Date()
      };
      
      // Ensure timestamp is a Date object
      if (doc.timestamp && !(doc.timestamp instanceof Date)) {
        doc.timestamp = new Date(doc.timestamp);
      } else if (!doc.timestamp) {
        doc.timestamp = new Date();
      }

      const result = await this.collection.insertOne(doc);
      return { ...doc, _id: result.insertedId };
    } catch (error) {
      console.error('MongoDB createVehicleHistory error:', error);
      return null;
    }
  }
}

module.exports = VehicleHistoryRepository;
