# SmartPark AI — REST API Reference

Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new customer account.
- **Request Body**: `{ "name": "John Doe", "email": "john@example.com", "password": "Password@123", "phone": "+91 98765 00000", "vehicleNumber": "TN-01-AB-1234", "vehicleType": "car", "isEv": true }`
- **Response**: `{ "success": true, "token": "JWT_TOKEN", "user": { ... } }`

### `POST /api/auth/login`
Authenticates user and returns JWT token.
- **Request Body**: `{ "email": "customer@smartpark.ai", "password": "Password@123" }`
- **Response**: `{ "success": true, "token": "JWT_TOKEN", "user": { "role": "customer", ... } }`

### `GET /api/auth/me`
Fetches authenticated user profile and garage vehicles.
- **Headers**: `Authorization: Bearer <TOKEN>`

---

## 2. Parking Locations & Slots (`/api/locations`)

### `GET /api/locations`
Lists all active parking locations with live slot occupancy.

### `GET /api/locations/:id/slots`
Retrieves full hierarchical structure: Floors $\to$ Zones $\to$ Parking Slots with EV charger specs and sensor IDs.

### `PUT /api/locations/slots/:slotId/status` (Staff / Admin)
Updates slot state (`available`, `occupied`, `reserved`, `maintenance`).

---

## 3. AI & Demand Forecasting (`/api/ai`)

### `GET /api/ai/recommendations`
Evaluates multi-criteria weighted score for user GPS, EV requirements, and budget.
- **Query Params**: `lat`, `lon`, `isEv`, `vehicleType`, `maxPrice`

### `GET /api/ai/forecast?locationId=1&hours=24`
Returns upcoming 24-hour occupancy prediction curves with confidence intervals and peak warnings.

### `GET /api/ai/dynamic-pricing?locationId=1&hours=2`
Calculates real-time price quotes based on current capacity tiers and peak hour surges.

---

## 4. Bookings & Payments (`/api/bookings`, `/api/payments`)

### `POST /api/bookings`
Reserves slot, locks space, assesses fraud risk, and generates high-resolution QR digital pass.

### `GET /api/bookings/my`
Retrieves authenticated customer's reservation history.

### `GET /api/bookings/pass/:code`
Fetches verified pass details and data URI QR code.

### `POST /api/bookings/:id/cancel`
Cancels booking, releases slot, and triggers refund calculations.

### `POST /api/payments/process`
Settles payment (UPI, Card, NetBanking, Cash) and issues transaction token.

---

## 5. Staff Gate Scanner (`/api/qr`)

### `POST /api/qr/check-in`
Validates pass token at entrance gate, marks booking active, changes slot to occupied, and logs check-in.

### `POST /api/qr/check-out`
Validates pass at exit barrier, marks booking completed, and releases slot to available.

---

## 6. Executive Admin Suite (`/api/admin`)

### `GET /api/admin/analytics/kpis`
Returns live platform metrics: revenue today/month, total slots, occupancy rate, and active users.

### `GET /api/admin/analytics/charts`
Feeds Chart.js time-series data for revenue trends, hourly occupancy curves, and vehicle distributions.

### `GET /api/admin/fraud-events`
Lists flagged anomaly events and risk scores.

### `GET /api/admin/audit-logs`
Returns immutable system operator trail.
