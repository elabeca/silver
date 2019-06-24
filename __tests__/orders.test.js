const request = require('supertest');
const { server, dbUrl, dbName, dbCollection } = require('../app.js');
const MongoClient = require('mongodb').MongoClient;
const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true })
const _ = require('lodash');

let db;

beforeEach(async () => {
  await dbClient.connect();
  db = dbClient.db(dbName);
});

afterEach(() => {
  server.close();
});

describe('submitted', () => {

  test('a valid order', async () => {
    await db.collection(dbCollection).deleteMany();

    const response = await request(server)
      .post('/orders/submit')
      .set('Content-Type', 'application/json')
      .send({ user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'sell' });

    expect(response.type).toEqual("application/json");
    expect(response.status).toEqual(201);
    expect(response.body.user_id).toEqual('user1');
    expect(response.body.order_quantity_kg).toEqual(3.5);
    expect(response.body.price_per_kg).toEqual(306);
    expect(response.body.order_type).toEqual('SELL');

    db.collection(dbCollection).find().toArray((err, docs) => {
      expect(docs[0].user_id).toEqual('user1');
      expect(docs[0].order_quantity_kg).toEqual(3.5);
      expect(docs[0].price_per_kg).toEqual(306);
      expect(docs[0].order_type).toEqual('SELL');
    });
    
  });

});

describe('cancelled', () => {

  test('a valid order', async () => {
    await db.collection(dbCollection).deleteMany();

    const responseAdded = await request(server)
      .post('/orders/submit')
      .set('Content-Type', 'application/json')
      .send({ user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'sell' });
    const responseCancelled = await request(server)
      .delete(`/orders/cancel/${responseAdded.body._id}`);
      expect(responseCancelled.status).toEqual(200);
  });

  test('failed due to a non-existing order', async () => {
    await db.collection(dbCollection).deleteMany();

    const responseAdded = await request(server)
    .post('/orders/submit')
    .set('Content-Type', 'application/json')
    .send({ user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'sell' });

    const responseCancelled = await request(server)
      .delete(`/orders/cancel/${responseAdded.body._id}`);
      expect(responseCancelled.status).toEqual(200);

    const responseCancelled2 = await request(server)
      .delete(`/orders/cancel/${responseAdded.body._id}`);
     expect(responseCancelled2.status).toEqual(404);
  });

});

describe('listed', () => {

  test('a list of all orders recorded', async () => {
    await db.collection(dbCollection).deleteMany();

    const orders = [
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'sell' },
      { user_id: 'user2', order_quantity_kg: 1.2, price_per_kg: 310, order_type: 'sell' },
      { user_id: 'user3', order_quantity_kg: 1.5, price_per_kg: 307, order_type: 'sell' },
      { user_id: 'user4', order_quantity_kg: 2.0, price_per_kg: 306, order_type: 'sell' },
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 50, order_type: 'buy' },
      { user_id: 'user2', order_quantity_kg: 3.7, price_per_kg: 134, order_type: 'buy' },
      { user_id: 'user3', order_quantity_kg: 0.3, price_per_kg: 50, order_type: 'buy' },
      { user_id: 'user4', order_quantity_kg: 1.0, price_per_kg: 134, order_type: 'buy' }
    ];

    const expectedOrders = [
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'SELL' },
      { user_id: 'user2', order_quantity_kg: 1.2, price_per_kg: 310, order_type: 'SELL' },
      { user_id: 'user3', order_quantity_kg: 1.5, price_per_kg: 307, order_type: 'SELL' },
      { user_id: 'user4', order_quantity_kg: 2.0, price_per_kg: 306, order_type: 'SELL' },
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 50, order_type: 'BUY' },
      { user_id: 'user2', order_quantity_kg: 3.7, price_per_kg: 134, order_type: 'BUY' },
      { user_id: 'user3', order_quantity_kg: 0.3, price_per_kg: 50, order_type: 'BUY' },
      { user_id: 'user4', order_quantity_kg: 1.0, price_per_kg: 134, order_type: 'BUY' }
    ];

    orders.forEach(async (order) => {
      await request(server)
        .post('/orders/submit')
        .set('Content-Type', 'application/json')
        .send(order);
    });

    const response = await request(server)
      .get('/orders')
      .set('Content-Type', 'application/json');

    expect(response.type).toEqual("application/json");
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expectedOrders);
  });

});

describe('summarised', () => {

  test('a live order board', async () => {
    await db.collection(dbCollection).deleteMany();

    const orders = [
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 306, order_type: 'sell' },
      { user_id: 'user2', order_quantity_kg: 1.2, price_per_kg: 310, order_type: 'sell' },
      { user_id: 'user3', order_quantity_kg: 1.5, price_per_kg: 307, order_type: 'sell' },
      { user_id: 'user4', order_quantity_kg: 2.0, price_per_kg: 306, order_type: 'sell' },
      { user_id: 'user1', order_quantity_kg: 3.5, price_per_kg: 50, order_type: 'buy' },
      { user_id: 'user2', order_quantity_kg: 3.7, price_per_kg: 134, order_type: 'buy' },
      { user_id: 'user3', order_quantity_kg: 0.3, price_per_kg: 50, order_type: 'buy' },
      { user_id: 'user4', order_quantity_kg: 1.0, price_per_kg: 134, order_type: 'buy' }
    ];

    const expectedSummary = {
      SELL: [
        { order_quantity_kg: 5.5, price_per_kg: 306 },
        { order_quantity_kg: 1.5, price_per_kg: 307 },
        { order_quantity_kg: 1.2, price_per_kg: 310 }
      ],
      BUY: [
        { order_quantity_kg: 4.7, price_per_kg: 134 },
        { order_quantity_kg: 3.8, price_per_kg: 50 },
      ]
    };

    orders.forEach(async (order) => {
      await request(server)
        .post('/orders/submit')
        .set('Content-Type', 'application/json')
        .send(order);
    });

    const response = await request(server)
      .get('/orders/summary')
      .set('Content-Type', 'application/json');

    expect(response.type).toEqual("application/json");
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expectedSummary);
  });

});