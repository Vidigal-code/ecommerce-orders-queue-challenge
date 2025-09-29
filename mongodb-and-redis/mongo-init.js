db = db.getSiblingDB('ecommerce');
db.createCollection('orders');
db.orders.createIndex({ id: 1 }, { unique: true });
db.orders.createIndex({ tier: 1 });
db.orders.createIndex({ priority: 1 });