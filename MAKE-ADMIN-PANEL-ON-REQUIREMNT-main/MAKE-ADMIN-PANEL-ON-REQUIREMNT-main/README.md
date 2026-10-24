# SmartHome_Manager - Simulated Home Automation Management System

## Project Overview
**SmartHome_Manager** is a full-featured virtual home automation and device management platform built with Node.js, Express, and MongoDB. It simulates an IoT ecosystem where users can set up households, organize rooms, add simulated smart devices, configure custom attributes, establish automated routines, track energy consumption, test emergency workflows, and interact via voice commands.

This project implements all requirements across:
- **Part 1: L1 - Minimum Expected Features**
- **Part 2: L2 - Unique Features**
- **Part 3: Challenging Features**

---

## Key Features

### Part 1: L1 - Minimum Expected Features
1. **User Authentication & Household Setup:**
   - Registration and login with JWT authentication and bcrypt password hashing.
   - Household creation with auto-seeded default rooms (Living Room, Bedroom).
   - Ability to add and organize multiple rooms.
2. **Appliance Control Dashboard:**
   - Real-time dashboard rendering all devices, power state (`On` / `Standby`), connection state, and live parameters.
3. **Routine Scheduling System:**
   - Create multi-action routines (e.g. "Good Night", "Morning Startup") scheduled by time and repeating days.
   - Execute routines to simultaneously alter power states and settings of multiple appliances.
4. **Simulated Energy Usage Tracking:**
   - Each appliance is rated with realistic wattage (e.g., AC: 1500W, Heater: 2000W, Fan: 75W, Lamp: 15W).
   - Generates simulated kWh consumption reports and estimated electricity billing ($0.15/kWh).
5. **Alerts for Device Malfunctions:**
   - Monitors abnormal usage (e.g. continuous heater operation >24h).
   - Sends malfunction alerts with recommended reset action.

### Part 2: L2 - Unique Features
1. **Simulated Device Creation:**
   - Create devices under user account with custom attributes.
   - Examples: "Smart Lamp" (dimmer 0-100%, color modes), "Ceiling Fan" (3-speed control), "Thermostat" (18°C-30°C), "AC", "Smart Door".
2. **Configurable Features Per Device:**
   - Unique attributes: operational limits, brightness percentage, color modes (Warm/Cold/Daylight), thermostat limits, door lock status.
3. **Simulated Device Connection ("Connect" Handshake):**
   - Newly created devices start in `"Disconnected"` state.
   - Users must click the **"Connect"** button to simulate network handshake before the device can be controlled.
4. **Device Status & Feedback Simulation:**
   - Real-time status feedback: `"On"`, `"In Standby"`, `"Malfunctioning"`, `"Disconnected"`.
   - Simulated error trigger and recovery reset mechanism.

### Part 3: Challenging Features
1. **Simulated Usage Prediction:**
   - Habit analysis algorithm that evaluates historical logs (e.g. thermostat morning adjustments, evening lighting) and suggests one-click automations.
2. **Emergency Mode Simulation:**
   - One-click / voice command activation: Immediately powers off all appliances to cut power load and automatically locks all virtual security doors.
3. **Simulated Voice Control Interface:**
   - Natural language text command parser supporting:
     - *"Turn off all lights"*
     - *"Turn on lights"*
     - *"Set thermostat to 22"*
     - *"Lock all doors"*
     - *"Activate emergency mode"*
     - *"Good night"*
   - Returns interactive voice-assistant feedback.
4. **Simulated Device Role Management (RBAC):**
   - Multi-user permission hierarchy:
     - **Admin:** Full privileges (create/delete devices, routines, manage users, emergency).
     - **Guest:** Control access only (turn connected devices on/off). Cannot delete devices or change routines.
     - **Child:** Restricted safety mode. Cannot operate hazardous appliances (heater, door lock, emergency mode).
5. **Simulated Device Groups:**
   - Group devices into custom zones (e.g. "Living Room Zone", "Morning Group") for simultaneous 1-click control.
6. **Simulated Energy Efficiency Recommendations:**
   - Suggests energy conservation actions based on real-time consumption (e.g. AC Eco mode, phantom power drain elimination).

---

## Project Structure
The codebase strictly follows standard MVC architecture with segregated concerns:

```
SmartHome_Manager/
├── config/
│   └── db.js                 # MongoDB connection logic
├── controllers/
│   ├── auth.controller.js    # Auth, registration, and RBAC user management
│   ├── room.controller.js    # Household rooms management
│   ├── device.controller.js  # Simulated device creation, connection, and control
│   ├── routine.controller.js # Automated routine schedules
│   ├── group.controller.js   # Collective device groups
│   ├── smart.controller.js   # Emergency mode, voice control, AI predictions
│   └── energy.controller.js  # Energy reports & malfunction alerts
├── middlewares/
│   ├── auth.middleware.js    # JWT authentication check
│   └── role.middleware.js    # Multi-role access control (Admin, Guest, Child)
├── models/
│   ├── User.model.js
│   ├── Household.model.js
│   ├── Room.model.js
│   ├── Device.model.js
│   ├── Routine.model.js
│   ├── DeviceGroup.model.js
│   ├── Alert.model.js
│   └── EnergyLog.model.js
├── public/                   # Interactive Web UI Dashboard
│   ├── index.html            # Single-page dashboard interface
│   ├── style.css             # Modern dark-mode responsive design
│   └── app.js                # Frontend client state & REST API controller
├── routes/
│   ├── auth.routes.js
│   ├── room.routes.js
│   ├── device.routes.js
│   ├── routine.routes.js
│   ├── group.routes.js
│   ├── smart.routes.js
│   └── energy.routes.js
├── api.test.js               # 35 Automated Jest Integration Tests (100% Pass)
├── postman_collection.json   # Ready-to-import Postman collection
├── index.js                  # Express Server entrypoint
├── package.json              # Project scripts and dependencies
├── .env                      # Environment config
├── .env.example              # Sample environment template
└── README.md                 # Project documentation
```

---

## Installation & Setup

### 1. Navigate to Project
```bash
cd SmartHome_Manager
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smarthome_manager_db
JWT_SECRET=smarthome_super_secret_jwt_key_2026
```

### 4. Run the Application
- **Production mode:**
  ```bash
  npm start
  ```
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```
Once running, open **`http://localhost:5000`** in any browser to interact with the full dashboard UI!

### 5. Run Automated Tests
```bash
npm test
```
*Executes all 35 unit and integration tests with in-memory database simulation.*

---

## API Reference

### Authentication & Roles
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Public | Register user, setup household, and create default rooms |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Get current user and household details |
| `POST` | `/api/auth/add-member` | Admin Only | Add family member with role (`guest` or `child`) |

### Rooms & Devices
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/rooms` | Authenticated | List all rooms in household |
| `POST` | `/api/rooms` | Admin Only | Create a new room |
| `POST` | `/api/devices` | Admin Only | Create a simulated smart device (`Disconnected` state) |
| `GET` | `/api/devices` | Authenticated | List all devices (optional `?roomId=` filter) |
| `PATCH` | `/api/devices/:id/connect` | Authenticated | Simulate linking device to network |
| `PATCH` | `/api/devices/:id/disconnect` | Authenticated | Disconnect device from network |
| `PUT` | `/api/devices/:id/control` | Authenticated | Control power state, brightness, speed, temperature |
| `POST` | `/api/devices/:id/simulate-malfunction` | Authenticated | Simulate device failure / safety glitch |
| `POST` | `/api/devices/:id/reset-malfunction` | Authenticated | Reset malfunctioning device to standby |
| `DELETE` | `/api/devices/:id` | Admin Only | Delete a device |

### Routines & Groups
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/routines` | Admin Only | Create scheduled automation routine |
| `GET` | `/api/routines` | Authenticated | List all routines |
| `POST` | `/api/routines/:id/execute` | Authenticated | Execute routine actions |
| `POST` | `/api/groups` | Admin Only | Create a device group |
| `GET` | `/api/groups` | Authenticated | List all groups |
| `POST` | `/api/groups/:id/trigger` | Authenticated | Collective On/Off trigger for group devices |

### Smart Controls & Emergency
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/smart/emergency/activate` | Authenticated | Emergency: Power off all appliances, lock doors |
| `POST` | `/api/smart/emergency/deactivate` | Authenticated | Deactivate emergency mode |
| `POST` | `/api/smart/voice-command` | Authenticated | Process natural language text voice command |
| `GET` | `/api/smart/usage-prediction` | Authenticated | Get habit analysis & automated schedule suggestions |
| `GET` | `/api/smart/energy-recommendations` | Authenticated | Get power conservation recommendations |
| `GET` | `/api/energy/report` | Authenticated | View simulated kWh usage & estimated cost report |
| `GET` | `/api/energy/alerts` | Authenticated | View active and resolved malfunction alerts |

---

## Automated Test Results
```
PASS ./api.test.js
  SmartHome_Manager Comprehensive System Tests (L1, L2, & Challenging Features)
    1. User Authentication & Household Setup (L1 & RBAC)
      √ POST /api/auth/register (340 ms)
      √ POST /api/auth/login (95 ms)
      √ POST /api/auth/add-member (Guest) (166 ms)
      √ POST /api/auth/add-member (Child) (167 ms)
      √ GET /api/rooms (48 ms)
      √ POST /api/rooms (24 ms)
    2. Simulated Device Creation & "Connect" Mechanism (L2)
      √ POST /api/devices (Smart Lamp) (38 ms)
      √ POST /api/devices (Ceiling Fan) (32 ms)
      √ POST /api/devices (Thermostat) (41 ms)
      √ POST /api/devices (Smart Door & Heater) (60 ms)
      √ PUT /api/devices/:id/control - fails if disconnected (21 ms)
      √ PATCH /api/devices/:id/connect - simulated handshake (140 ms)
    3. Appliance Control Dashboard & Role Permissions (L1 & RBAC)
      √ PUT /api/devices/:id/control - turn ON lamp (30 ms)
      √ PUT /api/devices/:id/control - fan speed High (30 ms)
      √ PUT /api/devices/:id/control - thermostat temp in limits (31 ms)
      √ PUT /api/devices/:id/control - thermostat rejects out of bounds (25 ms)
      √ PUT /api/devices/:id/control - Child restricted from heater (24 ms)
      √ PUT /api/devices/:id/control - Guest can toggle lamp (32 ms)
      √ DELETE /api/devices/:id - Guest cannot delete (18 ms)
    4. Routine Scheduling & Collective Device Groups (L1 & Challenging)
      √ POST /api/routines - create routine (36 ms)
      √ POST /api/routines/:id/execute - trigger routine (90 ms)
      √ POST /api/groups - create device group (25 ms)
      √ POST /api/groups/:id/trigger - collective action (46 ms)
    5. Emergency Mode Simulation (Challenging)
      √ POST /api/smart/emergency/activate - power off & lock doors (135 ms)
      √ POST /api/smart/emergency/deactivate (33 ms)
    6. Simulated Voice Control Interface (Challenging)
      √ POST /api/smart/voice-command - Turn on all lights (59 ms)
      √ POST /api/smart/voice-command - Set thermostat (27 ms)
      √ POST /api/smart/voice-command - Lock all doors (28 ms)
    7. Malfunction Alerts & Simulated Energy Tracking (L1 & L2)
      √ POST /api/devices/:id/simulate-malfunction (38 ms)
      √ PUT /api/devices/:id/control - fails on malfunction (26 ms)
      √ POST /api/devices/:id/reset-malfunction (35 ms)
      √ GET /api/energy/report (33 ms)
      √ GET /api/energy/alerts (28 ms)
    8. Smart AI Usage Predictions & Efficiency Tips (Challenging)
      √ GET /api/smart/usage-prediction (28 ms)
      √ GET /api/smart/energy-recommendations (23 ms)

Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
```
