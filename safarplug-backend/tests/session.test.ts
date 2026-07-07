import request from 'supertest';
import app from '../src/app';
import * as db from './db';
import { User } from '../src/models/User';
import { Station } from '../src/models/Station';
import { Charger } from '../src/models/Charger';
import { Session } from '../src/models/Session';
import { signAccessToken } from '../src/utils/jwt';

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe('Charging Session Endpoints', () => {
  let ownerToken: string;
  let driver1Token: string;
  let driver2Token: string;
  let driver1Id: string;
  let stationId: string;
  let chargerId: string;

  beforeEach(async () => {
    // Users
    const owner = new User({ name: 'Owner', email: 'owner@safarplug.com', phone: '9876543210', passwordHash: 'pwd', userType: 'station_owner' });
    await owner.save();
    ownerToken = signAccessToken(owner.id, 'station_owner');

    const driver1 = new User({ name: 'Driver 1', email: 'd1@safarplug.com', phone: '9876543211', passwordHash: 'pwd', userType: 'ev_user' });
    await driver1.save();
    driver1Id = driver1.id;
    driver1Token = signAccessToken(driver1.id, 'ev_user');

    const driver2 = new User({ name: 'Driver 2', email: 'd2@safarplug.com', phone: '9876543212', passwordHash: 'pwd', userType: 'ev_user' });
    await driver2.save();
    driver2Token = signAccessToken(driver2.id, 'ev_user');

    // Station
    const station = new Station({
      ownerId: owner.id,
      name: 'Hub CP',
      address: 'CP',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      pricePerKwh: 15,
      totalSlotsAvailable: 1,
      isVerified: true,
      isActive: true,
    });
    await station.save();
    stationId = station.id;

    // Charger
    const charger = new Charger({
      stationId: station.id,
      chargerType: 'dc_fast_car',
      powerKw: 50,
      connectorType: 'ccs2',
      isAvailable: true,
      vehicleCompatibility: ['car'],
    });
    await charger.save();
    chargerId = charger.id;
  });

  describe('POST /api/sessions/start', () => {
    it('should start charging and mark charger unavailable', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          stationId,
          chargerId,
          startBatteryPercent: 20,
          vehicleType: 'car',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify charger status
      const updatedCharger = await Charger.findById(chargerId);
      expect(updatedCharger?.isAvailable).toBe(false);

      // Verify station available slots decremented
      const updatedStation = await Station.findById(stationId);
      expect(updatedStation?.totalSlotsAvailable).toBe(0);
    });
  });

  describe('POST /api/sessions/:id/end', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Pre-start a session
      const charger = await Charger.findById(chargerId);
      if (charger) {
        charger.isAvailable = false;
        await charger.save();
      }
      const session = new Session({
        userId: driver1Id,
        stationId,
        chargerId,
        startTime: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        startBatteryPercent: 20,
        energyUsedKwh: 20,
        totalCostRs: 0,
        paymentStatus: 'pending',
        vehicleType: 'car',
      });
      await session.save();
      sessionId = session.id;
    });

    it('should calculate correct cost and end session', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${driver1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // expected cost = 20 kWh * ₹15 rate + ₹2 platform fee = ₹302
      expect(res.body.data.totalCostRs).toBe(302);
      expect(res.body.data.endTime).toBeDefined();

      // Charger should be available again
      const updatedCharger = await Charger.findById(chargerId);
      expect(updatedCharger?.isAvailable).toBe(true);
    });

    it("should prevent ending another user's session", async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${driver2Token}`);

      expect(res.status).toBe(403);
    });
  });
});
