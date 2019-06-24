const Koa = require('koa');
const serve = require("koa-static");
const mount = require("koa-mount");
const mongo = require('koa-mongo');
const Router = require('koa-router');
const bodyParser = require("koa-bodyparser");
const cors = require('@koa/cors');
const _ = require('lodash');

const app = new Koa();
const router = new Router();

const dbName = 'silverdb';
const dbUrl = `mongodb://localhost:27017/${dbName}`;
const dbCollection = 'orders';

const static_pages = new Koa();
static_pages.use(serve(__dirname + "/silver-frontend/public"));

app.use(mount("/", static_pages));

router.post('/orders/submit', async (ctx) => {
  ctx.set('Content-Type', 'application/json');
  const data = ctx.request.body;
  const result = await ctx.db.collection(dbCollection)
    .insertOne({
      user_id: data.user_id,
      order_quantity_kg: data.order_quantity_kg,
      price_per_kg: data.price_per_kg,
      order_type: data.order_type.toUpperCase()
    });
  ctx.body = result.ops[0];
  ctx.status = 201;
});

router.del('/orders/cancel/:id', async (ctx) => {
  ctx.set('Content-Type', 'application/json');
  const result = await ctx.db.collection(dbCollection).deleteOne({ _id: mongo.ObjectId(ctx.params.id) });
  if (!result || result.result.n === 0) ctx.throw(404);
  ctx.status = 200;
});

router.get('/orders', async (ctx) => {
  ctx.set('Content-Type', 'application/json');
  const result = await ctx.db.collection(dbCollection).find({}).toArray();
  ctx.body = result.map(o => _.omit(o, ['_id']));
  ctx.status = 200;
});

router.get('/orders/summary', async (ctx) => {
  ctx.set('Content-Type', 'application/json');
  const result = await ctx.db.collection(dbCollection).find({}).toArray();

  const plucked = _.chain(result)
    .map(o => _.omit(o, ['_id', 'user_id']))
    .groupBy(x => x.order_type)
    .value();

  const getSummary = (type, ordering) =>  _.chain(plucked[type.toUpperCase()])
    .map(o => _.omit(o, ['order_type']))
    .groupBy(y => y.price_per_kg)
    .map((v, k) => _.assign({}, {
      price_per_kg: _.toNumber(k),
      order_quantity_kg:_.reduce(v, (acc, ord) => acc + ord.order_quantity_kg, 0)
    }))
    .orderBy(['price_per_kg'], [ordering])
    .value()
  
  ctx.body = { SELL: getSummary('sell', 'asc'), BUY: getSummary('buy', 'desc') };
  ctx.status = 200;
});

app.use(bodyParser());
app.use(mongo({ url: dbUrl, db: dbName }));
app.use(cors());
app.use(router.routes()).use(router.allowedMethods());

const server = app.listen(3000);

module.exports = { server, dbUrl, dbName, dbCollection };