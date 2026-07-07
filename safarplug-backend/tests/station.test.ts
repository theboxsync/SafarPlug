import request from 'supertest';
import app from '../src/app';
import * as db from './db';
import { User } from '../src/models/User';
import { Station } from '../src/models/Station';
import { signAccessToken } from '../src/utils/jwt';

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe('Station Endpoints', () => {
  let ownerToken: string;
  let driverToken: string;
  let ownerId: string;

  beforeEach(async () => {
    // Create Owner
    const owner = new User({
      name: 'Owner',
      email: 'owner@safarplug.com',
      phone: '9876543210',
      passwordHash: 'passwordHash',
      userType: 'station_owner',
    });
    await owner.save();
    ownerId = owner.id;
    ownerToken = signAccessToken(owner.id, 'station_owner');

    // Create Driver
    const driver = new User({
      name: 'Driver',
      email: 'driver@safarplug.com',
      phone: '9876543211',
      passwordHash: 'passwordHash',
      userType: 'ev_user',
    });
    await driver.save();
    driverToken = signAccessToken(driver.id, 'ev_user');
  });

  describe('POST /api/stations', () => {
    const stationPayload = {
      name: 'CP Station',
      address: 'Connaught Place, New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      pricePerKwh: 15,
      workingHoursStart: '06:00',
      workingHoursEnd: '23:00',
    };

    it('should allow station_owner to create a station', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(stationPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(stationPayload.name);
    });

    it('should deny station creation to ev_user role', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(stationPayload);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/stations/nearby', () => {
    beforeEach(async () => {
      // Station 1: New Delhi (0 km away)
      const station1 = new Station({
        ownerId,
        name: 'CP Station',
        address: 'Connaught Place, New Delhi',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        pricePerKwh: 15,
        totalSlotsAvailable: 2,
        isVerified: true,
        isActive: true,
        rating: 4.5,
        totalReviews: 10,
      });
      await station1.save();

      // Station 2: Noida (~20 km away)
      const station2 = new Station({
        ownerId,
        name: 'Noida Hub',
        address: 'Sector 62, Noida',
        location: { type: 'Point', coordinates: [77.3700, 28.6200] },
        pricePerKwh: 12,
        totalSlotsAvailable: 4,
        isVerified: true,
        isActive: true,
        rating: 4.8,
        totalReviews: 12,
      });
      await station2.save();
    });

    it('should return nearby stations within range', async () => {
      const res = await request(app)
        .get('/api/stations/nearby')
        .query({ lat: 28.6139, lng: 77.2090, radiusKm: 10 }); // radius 10km should only find CP Station

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('CP Station');
    });

    it('should return Noida and CP stations when radius is 30km', async () => {
      const res = await request(app)
        .get('/api/stations/nearby')
        .query({ lat: 28.6139, lng: 77.2090, radiusKm: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('PATCH /api/stations/:id/availability', () => {
    let stationId: string;

    beforeEach(async () => {
      const station = new Station({
        ownerId,
        name: 'CP Station',
        address: 'Connaught Place',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        pricePerKwh: 15,
        isVerified: true,
        isActive: true,
      });
      await station.save();
      stationId = station.id;
    });

    it('should allow owner to toggle availability', async () => {
      const res = await request(app)
        .patch(`/api/stations/${stationId}/availability`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should deny toggle availability to non-owners', async () => {
      const res = await request(app)
        .patch(`/api/stations/${stationId}/availability`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });
  });
});
