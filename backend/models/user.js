class User {
  constructor({ 
    id = null, 
    name, 
    email, 
    phone = null,
    passwordHash = null,
    role = 'passenger',
    createdAt = null, 
    updatedAt = null 
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.passwordHash = passwordHash;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    if (!row) return null;
    return new User({
      id: row.id ?? null,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      passwordHash: row.password_hash ?? row.passwordHash ?? null,
      role: row.role ?? 'passenger',
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    });
  }

  toJSON() {
    const json = {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
    // Never include password hash in JSON output
    return json;
  }

  // Method to get user data for authentication (includes password hash)
  toAuthJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      password_hash: this.passwordHash,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = User;

