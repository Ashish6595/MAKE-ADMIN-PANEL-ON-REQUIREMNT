const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./index');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('SmartHome_Manager Comprehensive System Tests (L1, L2, & Challenging Features)', () => {
  let adminToken;
  let guestToken;
  let childToken;
  let householdId;
  let livingRoomId;
  let bedroomId;
  let lampId;
  let fanId;
  let thermostatId;
  let heaterId;
  let doorId;
  let routineId;
  let groupId;

  // ==========================================
  // PART 1: User Authentication & Household Setup
  // ==========================================
  describe('1. User Authentication & Household Setup (L1 & RBAC)', () => {
    test('POST /api/auth/register - should register primary user and auto-setup household with default rooms', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'rahul_admin',
          email: 'rahul@smarthome.local',
          password: 'Password@123',
          householdName: 'Sharma Residence'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      expect(res.body.household.id).toBeDefined();

      adminToken = res.body.token;
      householdId = res.body.household.id;
    });

    test('POST /api/auth/login - should authenticate user and issue token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rahul@smarthome.local',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/add-member - admin adds a Guest family member', async () => {
      const res = await request(app)
        .post('/api/auth/add-member')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'guest_user',
          email: 'guest@smarthome.local',
          password: 'GuestPass@123',
          role: 'guest'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('guest');

      // login as guest to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'guest@smarthome.local', password: 'GuestPass@123' });
      guestToken = loginRes.body.token;
    });

    test('POST /api/auth/add-member - admin adds a Child family member', async () => {
      const res = await request(app)
        .post('/api/auth/add-member')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'child_user',
          email: 'child@smarthome.local',
          password: 'ChildPass@123',
          role: 'child'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('child');

      // login as child to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'child@smarthome.local', password: 'ChildPass@123' });
      childToken = loginRes.body.token;
    });

    test('GET /api/rooms - should fetch default rooms created during registration', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms.length).toBeGreaterThanOrEqual(2);
      livingRoomId = res.body.rooms[0]._id;
      bedroomId = res.body.rooms[1]._id;
    });

    test('POST /api/rooms - admin can create a new room (Kitchen)', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Kitchen',
          description: 'Cooking and coffee station'
        });

      expect(res.status).toBe(201);
      expect(res.body.room.name).toBe('Kitchen');
    });
  });

  // ==========================================
  // PART 2: Simulated Device Creation & Connection (L2)
  // ==========================================
  describe('2. Simulated Device Creation & "Connect" Mechanism (L2)', () => {
    test('POST /api/devices - create Smart Lamp with dimmer and color mode', async () => {
      const res = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Living Room Smart Lamp',
          deviceType: 'lamp',
          roomId: livingRoomId,
          features: {
            brightness: 80,
            colorMode: 'Warm'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.device.status).toBe('Disconnected');
      expect(res.body.device.connectionStatus).toBe('disconnected');
      lampId = res.body.device._id;
    });

    test('POST /api/devices - create Ceiling Fan with 3-speed control', async () => {
      const res = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bedroom Ceiling Fan',
          deviceType: 'fan',
          roomId: bedroomId,
          features: {
            speed: 'Medium'
          }
        });

      expect(res.status).toBe(201);
      fanId = res.body.device._id;
    });

    test('POST /api/devices - create Thermostat with limits (18°C - 30°C)', async () => {
      const res = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Central Thermostat',
          deviceType: 'thermostat',
          roomId: livingRoomId,
          features: {
            temperature: 24,
            minTemp: 18,
            maxTemp: 30
          }
        });

      expect(res.status).toBe(201);
      thermostatId = res.body.device._id;
    });

    test('POST /api/devices - create Smart Door and Space Heater', async () => {
      const doorRes = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Front Main Door',
          deviceType: 'door',
          roomId: livingRoomId
        });
      doorId = doorRes.body.device._id;

      const heaterRes = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bathroom Water Heater',
          deviceType: 'heater',
          roomId: bedroomId,
          wattage: 2000
        });
      heaterId = heaterRes.body.device._id;
    });

    test('PUT /api/devices/:id/control - fails if device is not connected first', async () => {
      const res = await request(app)
        .put(`/api/devices/${lampId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ powerState: 'on' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/disconnected/i);
    });

    test('PATCH /api/devices/:id/connect - simulated handshake linking device to system', async () => {
      const res = await request(app)
        .patch(`/api/devices/${lampId}/connect`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.device.connectionStatus).toBe('connected');
      expect(res.body.device.status).toBe('In Standby');

      // connect remaining devices for testing
      await request(app).patch(`/api/devices/${fanId}/connect`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).patch(`/api/devices/${thermostatId}/connect`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).patch(`/api/devices/${doorId}/connect`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).patch(`/api/devices/${heaterId}/connect`).set('Authorization', `Bearer ${adminToken}`);
    });
  });

  // ==========================================
  // PART 3: Appliance Control Dashboard & RBAC
  // ==========================================
  describe('3. Appliance Control Dashboard & Role Permissions (L1 & RBAC)', () => {
    test('PUT /api/devices/:id/control - turn ON lamp and change brightness to 60%', async () => {
      const res = await request(app)
        .put(`/api/devices/${lampId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          powerState: 'on',
          features: { brightness: 60, colorMode: 'Daylight' }
        });

      expect(res.status).toBe(200);
      expect(res.body.device.powerState).toBe('on');
      expect(res.body.device.status).toBe('On');
      expect(res.body.device.features.brightness).toBe(60);
    });

    test('PUT /api/devices/:id/control - adjust fan speed to High', async () => {
      const res = await request(app)
        .put(`/api/devices/${fanId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          powerState: 'on',
          features: { speed: 'High' }
        });

      expect(res.status).toBe(200);
      expect(res.body.device.features.speed).toBe('High');
    });

    test('PUT /api/devices/:id/control - thermostat temperature within limits succeeds', async () => {
      const res = await request(app)
        .put(`/api/devices/${thermostatId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          features: { temperature: 22 }
        });

      expect(res.status).toBe(200);
      expect(res.body.device.features.temperature).toBe(22);
    });

    test('PUT /api/devices/:id/control - thermostat rejects temperature exceeding limits (>30°C)', async () => {
      const res = await request(app)
        .put(`/api/devices/${thermostatId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          features: { temperature: 35 }
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/between 18°C and 30°C/i);
    });

    test('PUT /api/devices/:id/control - Child role is RESTRICTED from controlling heater', async () => {
      const res = await request(app)
        .put(`/api/devices/${heaterId}/control`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ powerState: 'on' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/child role cannot operate hazardous devices/i);
    });

    test('PUT /api/devices/:id/control - Guest can turn ON and control lamp', async () => {
      const res = await request(app)
        .put(`/api/devices/${lampId}/control`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ powerState: 'on' });

      expect(res.status).toBe(200);
    });

    test('DELETE /api/devices/:id - Guest CANNOT delete devices (RBAC restriction)', async () => {
      const res = await request(app)
        .delete(`/api/devices/${lampId}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // PART 4: Routine Scheduling & Device Groups
  // ==========================================
  describe('4. Routine Scheduling & Collective Device Groups (L1 & Challenging)', () => {
    test('POST /api/routines - create automated routine (Good Night Routine)', async () => {
      const res = await request(app)
        .post('/api/routines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Good Night Routine',
          scheduledTime: '22:00',
          repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          actions: [
            { deviceId: lampId, targetPowerState: 'off' },
            { deviceId: fanId, targetPowerState: 'off' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.routine.name).toBe('Good Night Routine');
      routineId = res.body.routine._id;
    });

    test('POST /api/routines/:id/execute - simulate trigger of scheduled routine', async () => {
      const res = await request(app)
        .post(`/api/routines/${routineId}/execute`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.executedCount).toBe(2);

      // check that lamp is now off
      const lampCheck = await request(app)
        .get(`/api/devices/${lampId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(lampCheck.body.device.powerState).toBe('off');
    });

    test('POST /api/groups - create device group for collective control', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Living Room Zone',
          deviceIds: [lampId, thermostatId]
        });

      expect(res.status).toBe(201);
      groupId = res.body.group._id;
    });

    test('POST /api/groups/:id/trigger - activate all devices in group simultaneously', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/trigger`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ powerState: 'on' });

      expect(res.status).toBe(200);
      expect(res.body.affectedDevices.length).toBe(2);
    });
  });

  // ==========================================
  // PART 5: Emergency Mode Simulation
  // ==========================================
  describe('5. Emergency Mode Simulation (Challenging)', () => {
    test('POST /api/smart/emergency/activate - turns off appliances and locks virtual doors', async () => {
      const res = await request(app)
        .post('/api/smart/emergency/activate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.emergencyMode).toBe(true);
      expect(res.body.appliancesTurnedOff).toBeGreaterThanOrEqual(1);

      // verify door is locked
      const doorCheck = await request(app)
        .get(`/api/devices/${doorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(doorCheck.body.device.features.isLocked).toBe(true);

      // verify lamp is powered off
      const lampCheck = await request(app)
        .get(`/api/devices/${lampId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(lampCheck.body.device.powerState).toBe('off');
    });

    test('POST /api/smart/emergency/deactivate - returns system to normal', async () => {
      const res = await request(app)
        .post('/api/smart/emergency/deactivate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.emergencyMode).toBe(false);
    });
  });

  // ==========================================
  // PART 6: Simulated Voice Control Interface
  // ==========================================
  describe('6. Simulated Voice Control Interface (Challenging)', () => {
    test('POST /api/smart/voice-command - "Turn on all lights"', async () => {
      const res = await request(app)
        .post('/api/smart/voice-command')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ command: 'Turn on all lights' });

      expect(res.status).toBe(200);
      expect(res.body.assistantResponse).toMatch(/turned on/i);

      const lampCheck = await request(app)
        .get(`/api/devices/${lampId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(lampCheck.body.device.powerState).toBe('on');
    });

    test('POST /api/smart/voice-command - "Set thermostat to 20"', async () => {
      const res = await request(app)
        .post('/api/smart/voice-command')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ command: 'Set thermostat to 20' });

      expect(res.status).toBe(200);
      expect(res.body.assistantResponse).toMatch(/20°C/i);
    });

    test('POST /api/smart/voice-command - "Lock all doors"', async () => {
      const res = await request(app)
        .post('/api/smart/voice-command')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ command: 'Lock all doors' });

      expect(res.status).toBe(200);
      expect(res.body.assistantResponse).toMatch(/locked/i);
    });
  });

  // ==========================================
  // PART 7: Malfunction Simulation & Energy Tracking
  // ==========================================
  describe('7. Malfunction Alerts & Simulated Energy Tracking (L1 & L2)', () => {
    test('POST /api/devices/:id/simulate-malfunction - triggers device glitch and Alert', async () => {
      const res = await request(app)
        .post(`/api/devices/${heaterId}/simulate-malfunction`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Overheat temperature spike detected (>24h continuous load)' });

      expect(res.status).toBe(200);
      expect(res.body.device.status).toBe('Malfunctioning');
      expect(res.body.alert).toBeDefined();
    });

    test('PUT /api/devices/:id/control - fails on malfunctioning device', async () => {
      const res = await request(app)
        .put(`/api/devices/${heaterId}/control`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ powerState: 'on' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/malfunctioning/i);
    });

    test('POST /api/devices/:id/reset-malfunction - resets device to safe operating state', async () => {
      const res = await request(app)
        .post(`/api/devices/${heaterId}/reset-malfunction`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.device.isMalfunctioning).toBe(false);
      expect(res.body.device.status).toBe('In Standby');
    });

    test('GET /api/energy/report - returns simulated energy consumption and cost breakdown', async () => {
      const res = await request(app)
        .get('/api/energy/report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.unitRateUSD).toBe(0.15);
      expect(res.body.deviceBreakdown.length).toBeGreaterThan(0);
    });

    test('GET /api/energy/alerts - lists active and resolved alerts', async () => {
      const res = await request(app)
        .get('/api/energy/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // PART 8: AI Usage Predictions & Energy Recommendations
  // ==========================================
  describe('8. Smart AI Usage Predictions & Efficiency Tips (Challenging)', () => {
    test('GET /api/smart/usage-prediction - generates habit-based automation predictions', async () => {
      const res = await request(app)
        .get('/api/smart/usage-prediction')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.predictions.length).toBeGreaterThanOrEqual(2);
      expect(res.body.predictions[0].confidence).toBeDefined();
    });

    test('GET /api/smart/energy-recommendations - generates actionable energy-saving suggestions', async () => {
      const res = await request(app)
        .get('/api/smart/energy-recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(res.body.recommendations[0].potentialSavings).toBeDefined();
    });
  });
});
