const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Create collections (NeDB datastores — stored as files)
const db = {
  users:      new Datastore({ filename: path.join(DATA_DIR, 'users.db'),      autoload: true }),
  complaints: new Datastore({ filename: path.join(DATA_DIR, 'complaints.db'), autoload: true }),
  evidence:   new Datastore({ filename: path.join(DATA_DIR, 'evidence.db'),   autoload: true }),
  logs:       new Datastore({ filename: path.join(DATA_DIR, 'logs.db'),       autoload: true }),
};

// Compact on startup
Object.values(db).forEach(store => store.persistence.compactDatafile());

// Indexes
db.users.ensureIndex({ fieldName: 'badge_number', unique: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.complaints.ensureIndex({ fieldName: 'complaint_number', unique: true });
db.complaints.ensureIndex({ fieldName: 'officer_id' });
db.complaints.ensureIndex({ fieldName: 'created_at' });
db.evidence.ensureIndex({ fieldName: 'complaint_id' });

// Seed default users
db.users.count({}, (err, count) => {
  if (count === 0) {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const officerHash = bcrypt.hashSync('Officer@123', 10);
    const now = new Date().toISOString();

    db.users.insert([
      { _id: uuidv4(), name: 'Admin Officer', badge_number: 'ADMIN001', email: 'admin@policecms.gov', password_hash: adminHash, role: 'admin', department: 'Headquarters', phone: '', is_active: true, created_at: now, updated_at: now },
      { _id: uuidv4(), name: 'John Kumar',    badge_number: 'OFF001',   email: 'john.kumar@policecms.gov', password_hash: officerHash, role: 'officer', department: 'Crime Branch', phone: '', is_active: true, created_at: now, updated_at: now },
    ], () => console.log('✅ Seeded: ADMIN001/Admin@123, OFF001/Officer@123'));
  }
});

console.log(`✅ NeDB database ready at: ${DATA_DIR}`);

module.exports = db;
