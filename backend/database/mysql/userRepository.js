const User = require('../../models/user');

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async createUser(name, email, phone, passwordHash, role = 'passenger') {
    const [result] = await this.db.execute(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, passwordHash, role]
    );
    return result.insertId;
  }

  async findUserByEmail(email) {
    const [rows] = await this.db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? User.fromRow(rows[0]) : null;
  }

  async findUserById(id) {
    const [rows] = await this.db.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? User.fromRow(rows[0]) : null;
  }

  async getAllUsers() {
    const [rows] = await this.db.execute(
      'SELECT id, name, email, phone, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows.map(row => User.fromRow(row));
  }

  async deleteUser(id) {
    const [result] = await this.db.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateUser(id, updates) {
    const allowedFields = ['name', 'email', 'phone', 'password_hash', 'role'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        const dbKey = key === 'passwordHash' ? 'password_hash' : key;
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const [result] = await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }
}

module.exports = UserRepository;

