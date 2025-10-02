db = db.getSiblingDB('ecommerce');

if (!db.getCollectionNames().includes('orders')) {
    db.createCollection('orders');
}

db.orders.createIndex({ id: 1 }, { unique: true });
db.orders.createIndex({ priority: 1, status: 1, createdAt: 1 });
db.orders.createIndex({ status: 1 });
if (!db.getCollectionNames().includes('process_runs')) {
    db.createCollection('process_runs');
}
db.process_runs.createIndex({ runId: 1 });
db.process_runs.createIndex({ createdAt: -1 });

if (!db.getCollectionNames().includes('process_state')) {
    db.createCollection('process_state');
}
db.process_state.createIndex({ updatedAt: -1 });