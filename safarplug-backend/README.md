# SafarPlug Backend API

Backend API for the SafarPlug EV charging platform built with Express, Mongoose (MongoDB), Socket.io, Zod, and TypeScript.

---

## Deployment & Production Hardening

This backend is secured with:
1. **Helmet** for HTTP security headers.
2. **CORS** restricted to production client domains.
3. **Rate Limiting** on authentication endpoints (maximum 20 requests per 15 minutes per IP).
4. **Zod payload validation** on every request endpoint.
5. **No Password Leakage**: Passwords are excluded from database queries by default and stripped from JSON serializations.
6. **Robust Error Handling**: Stack traces are hidden in production to prevent leakage.

---

## MongoDB Atlas Setup Notes

To set up a cloud database:
1. **Create an account** on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Deploy a Free Cluster** (Shared Tier). Choose a provider close to your target location.
3. **Network Access**:
   - Go to "Network Access" in the sidebar.
   - Click "Add IP Address".
   - Add your deployment server's IP address (or choose `0.0.0.0/0` to allow access from any IP address during early dev/testing).
4. **Database Access**:
   - Go to "Database Access".
   - Click "Add New Database User".
   - Choose "Password" authentication, enter a secure username and a strong password.
   - Set the User Privileges to "Read and write to any database".
5. **Get Connection String**:
   - Click "Database" in the sidebar, then click "Connect".
   - Select "Drivers" or "Node.js".
   - Copy the connection string format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/safarplug?retryWrites=true&w=majority`.
   - Replace `<username>` and `<password>` with your database user details and use this as the `MONGODB_URI` environment variable.

---

## Deploying to Render or Railway

### Deploying to Render
1. Create a new **Web Service** on Render.
2. Link your GitHub repository.
3. Set the following build and start settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Go to the **Environment** tab and add all required variables (see `.env.example`):
   - `NODE_ENV=production`
   - `PORT=5000` (Render will automatically route traffic to this port)
   - `MONGODB_URI=your-atlas-mongodb-uri`
   - `JWT_ACCESS_SECRET=your-secure-access-secret`
   - `JWT_REFRESH_SECRET=your-secure-refresh-secret`
   - `CLOUDINARY_CLOUD_NAME=your-cloudinary-name`
   - `CLOUDINARY_API_KEY=your-cloudinary-api-key`
   - `CLOUDINARY_API_SECRET=your-cloudinary-api-secret`
   - `RAZORPAY_KEY_ID=your-razorpay-key-id`
   - `RAZORPAY_KEY_SECRET=your-razorpay-key-secret`
   - `CORS_ORIGIN=https://your-production-app-url`
5. Click **Deploy Web Service**.

### Deploying to Railway
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Go to **Variables** on the deployed project service.
3. Paste all environment variables from `.env.example` (using your real Mongo URI and secrets).
4. Railway will automatically build the service using the included `Dockerfile` and expose it.

---

## Health Check Endpoint
* **GET `/api/health`**
  - **Returns**: `{ "status": "ok" }` (HTTP 200)
  - Ideal for Render/Railway uptime monitoring and automatic deployment checks.
