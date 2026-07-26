import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import serialNumberRoutes from './routes/serial-numbers';
import goodsReceiptRoutes from './routes/goods-receipts';
import goodsIssueRoutes from './routes/goods-issues';
import rmaRoutes from './routes/rmas';
import stockOpnameRoutes from './routes/stock-opnames';
import supplierReturnRoutes from './routes/supplier-returns';
import auditLogRoutes from './routes/audit-logs';
import dashboardRoutes from './routes/dashboard';

const app = new Hono();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/products', productRoutes);
app.route('/api/v1/serial-numbers', serialNumberRoutes);
app.route('/api/v1/goods-receipts', goodsReceiptRoutes);
app.route('/api/v1/goods-issues', goodsIssueRoutes);
app.route('/api/v1/rmas', rmaRoutes);
app.route('/api/v1/stock-opnames', stockOpnameRoutes);
app.route('/api/v1/supplier-returns', supplierReturnRoutes);
app.route('/api/v1/audit-logs', auditLogRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/reports', dashboardRoutes);

app.get('/api/v1/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

const port = Number(process.env.PORT) || 3034;

import('@hono/node-server').then(({ serve }) => {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
  });
});

export default { port, fetch: app.fetch };
