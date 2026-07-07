import request from 'supertest';
import app from '../src/app';
import * as db from './db';
import { User } from '../src/models/User';
import { Station } from '../src/models/Station';
import { signAccessToken } from '../src/utils/jwt';

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe('Trip Suggestion Endpoints', () => {
  let driverToken: string;
  let ownerId: string;

  beforeEach(async () => {
    // Owner
    const owner = new User({ name: 'Owner', email: 'owner@safarplug.com', phone: '9876543210', passwordHash: 'pwd', userType: 'station_owner' });
    await owner.save();
    ownerId = owner.id;

    // Driver
    const driver = new User({ name: 'Driver', email: 'driver@safarplug.com', phone: '9876543211', passwordHash: 'pwd', userType: 'ev_user' });
    await driver.save();
    driverToken = signAccessToken(driver.id, 'ev_user');

    // Create 3 charging stations at different lat/lng steps
    // Delhi: 28.6139, 77.2090
    // Midpoint: 27.2000, 77.5000
    // Midpoint 2: 25.8000, 77.8000
    // End (Mumbai): 19.0760, 72.8777
    const st1 = new Station({
      ownerId, name: 'CP Hub Delhi', address: 'Delhi',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      pricePerKwh: 15, isVerified: true, isActive: true,
    });
    await st1.save();

    const st2 = new Station({
      ownerId, name: 'Agra Mid Point', address: 'Agra',
      location: { type: 'Point', coordinates: [78.0080, 27.1767] }, // ~200km away
      pricePerKwh: 14, isVerified: true, isActive: true,
    });
    await st2.save();

    const st3 = new Station({
      ownerId, name: 'Gwalior Fast Station', address: 'Gwalior',
      location: { type: 'Point', coordinates: [78.1772, 26.2183] }, // ~320km away
      pricePerKwh: 13, isVerified: true, isActive: true,
    });
    await st3.save();
  });

  describe('POST /api/trips/plan', () => {
    it('300km route, 65% battery, 250km range -> expect 1 stop', async () => {
      // 28.6139, 77.2090 to 26.2183, 78.1772 is ~320km
      const res = await request(app)
        .post('/api/trips/plan')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          from: { latitude: 28.6139, longitude: 77.2090 },
          to: { latitude: 26.2183, longitude: 78.1772 },
          vehicleType: 'car',
          batteryPercent: 65,
          vehicleRangeKm: 250,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selectedStops.length).toBe(1);
    });

    it('600km route, 40% battery, 250km range -> expect 2+ stops', async () => {
      // Delhi to a farther destination ~600km away
      const res = await request(app)
        .post('/api/trips/plan')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          from: { latitude: 28.6139, longitude: 77.2090 },
          to: { latitude: 23.2599, longitude: 77.4126 }, // Bhopal ~600km away
          vehicleType: 'car',
          batteryPercent: 40,
          vehicleRangeKm: 250,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selectedStops.length).toBeGreaterThanOrEqual(2);
    });

    it('short 50km route, 80% battery, 250km range -> expect 0 stops', async () => {
      const res = await request(app)
        .post('/api/trips/plan')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          from: { latitude: 28.6139, longitude: 77.2090 },
          to: { latitude: 28.4595, longitude: 77.0266 }, // Gurgaon ~30km away
          vehicleType: 'car',
          batteryPercent: 80,
          vehicleRangeKm: 250,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selectedStops.length).toBe(0);
    });
  });
});
