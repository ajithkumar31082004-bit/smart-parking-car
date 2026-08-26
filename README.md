# SmartPark AI — Intelligent Cloud-Based Smart Parking Management Platform

[![CI/CD Pipeline](https://github.com/ajithkumar31082004-bit/smart-parking-car/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/ajithkumar31082004-bit/smart-parking-car)
[![Node.js](https://img.shields.io/badge/Node.js-v22.x-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Cloud--Ready-FF9900.svg)](https://aws.amazon.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **SmartPark AI** is an enterprise-grade, cloud-native intelligent parking management platform that integrates real-time IoT slot occupancy tracking, explainable AI recommendation algorithms, time-series occupancy demand forecasting, dynamic surge pricing tiers, high-speed EV charging management, optical QR gate check-in/out, and comprehensive executive analytics dashboards.

---

## 🌟 Key Upgraded Highlights

1. **4 Machine Learning & AI Engines**:
   - **Explainable AI Recommendation Engine**: Multi-criteria weighted algorithm ranking parking decks by proximity, real-time vacancies, EV charger power, and budget with explainable reasoning pills.
   - **Occupancy Demand Forecasting**: Time-series predictive model generating upcoming 24-hour occupancy forecast curves with confidence intervals.
   - **Dynamic Surge Pricing**: Real-time rate multipliers adjusting according to occupancy tiers (<50%, 50-75%, 75-90%, >90%) and peak windows.
   - **Fraud & Anomaly Risk Detection**: Real-time heuristic scoring flagging rapid multi-booking spikes, bot hoarding, and abnormal cancellation profiles.

2. **Role-Based Portals (RBAC)**:
   - **Customer Portal**: Smart parking search, interactive 3D lot digital twin, vehicle garage manager, active digital passes, and PDF invoices.
   - **Staff Gatekeeper Scanner**: Optical QR barcode validator for instant 2-second vehicle check-in and checkout.
   - **Admin Executive Suite**: Live revenue KPIs, Chart.js graphs (7-day revenue, hourly occupancy curves, fleet breakdown), dynamic pricing editor, fraud alerts, and audit logs.

3. **Production Cloud Architecture & DevOps**:
   - Docker containerization (`Dockerfile`, `docker-compose.yml`).
   - GitHub Actions CI/CD automated test & build pipeline.
   - Normalized 17-table relational database schema with migration & seed scripts.
   - Automated test suite with 100% endpoint pass rate.

---

## 🏛️ System Architecture

```
                      +-----------------------------+
                      |         END USERS           |
                      |   (Mobile App / Web Browser)|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |       Amazon CloudFront     | (CDN & SSL Edge Termination)
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Application Load Balancer | (ALB in Public Subnets)
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |      AWS ECS (Fargate)      | (Private Subnets)
                      |  Node.js API + ML Services  |
                      +--------------+--------------+
                                     |
            +------------------------+------------------------+
            |                        |                        |
            v                        v                        v
+-----------------------+ +--------------------+ +------------------------+
|  Amazon Aurora / RDS  | |   Amazon S3 Bucket | |  Amazon SNS & SES      |
|  PostgreSQL / SQLite  | | (Passes & Invoices)| | (SMS/Email Alerts)    |
+-----------------------+ +--------------------+ +------------------------+
```

---

## 📂 Project Folder Structure

```
smart-parking-car/
├── backend/
│   └── src/
│       ├── config/          # JWT, environment, & pricing constants
│       ├── controllers/     # Auth, Location, Booking, Payment, QR, AI, Admin controllers
│       ├── middleware/      # JWT verification, RBAC guard, Error handler
│       ├── routes/          # REST API endpoints
│       ├── services/        # AI recommendation, pricing, fraud, QR services
│       └── server.js        # Express application entrypoint
│
├── frontend/
│   ├── css/
│   │   └── styles.css       # Design system, Glassmorphism, Dark/Light themes
│   └── js/
│       ├── api.js           # REST API client & toast notifications
│       ├── auth.js          # Auth state & dynamic navbar manager
│       └── theme.js         # Theme toggle & local persistence
│
├── database/
│   ├── schema.sql           # 17 normalized relational tables
│   ├── seed.js              # Realistic seed data generator
│   └── db.js                # SQLite3 database connection layer
│
├── ml/
│   ├── datasets/            # bookings.csv, occupancy.csv, vehicle_data.csv
│   ├── demand_predictor.py  # Python occupancy forecasting model
│   ├── fraud_engine.py      # Python anomaly detection engine
│   └── train_models.py      # Model training & metrics pipeline
│
├── docs/
│   ├── AWS_DEPLOYMENT.md    # Complete AWS cloud deployment guide
│   ├── API_REFERENCE.md     # REST API endpoints documentation
│   └── ML_PIPELINE.md       # AI/ML algorithms & math formulations
│
├── tests/
│   └── run-tests.js         # Automated end-to-end integration tests
│
├── .github/workflows/
│   └── ci-cd.yml            # GitHub Actions CI/CD pipeline
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── index.html               # Upgraded modern landing page
├── find-parking.html        # Smart AI discovery page
├── slots.html               # Live interactive slot matrix
├── booking.html             # Smart booking & pricing calculation
├── payment.html             # Secure payment checkout
├── bill.html                # Digital QR pass & tax invoice
├── dashboard.html           # Customer garage & booking history
├── staff-scanner.html       # Staff gate scanner & validator
├── admin.html               # Executive analytics suite
├── launch 3d demo.html      # Three.js 3D parking lot simulation
└── package.json
```

---

## 🚀 Quick Start Guide (Run Locally)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ajithkumar31082004-bit/smart-parking-car.git
cd smart-parking-car

npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Seed Database
```bash
npm run seed
```

### 4. Run Locally
```bash
npm start
```
The application will be live at `http://localhost:5000`.

### 5. Run Automated Tests & ML Pipeline
```bash
# Run backend & API integration tests
npm test

# Run Python ML model evaluation pipeline
npm run ml:train
```

### 6. Run with Docker
```bash
docker-compose up --build
```

---

## ⚡ 1-Click Demo Accounts

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartpark.ai` | `Password@123` | Executive Analytics, Fraud Logs, Pricing Editor (`/admin.html`) |
| **Staff** | `staff@smartpark.ai` | `Password@123` | Optical QR Gate Scanner Check-in/out (`/staff-scanner.html`) |
| **Manager** | `manager@smartpark.ai` | `Password@123` | Floor & Slot Management, Revenue Reports |
| **Customer** | `customer@smartpark.ai` | `Password@123` | Search, 3D Lot, Booking, Garage, Digital Passes (`/dashboard.html`) |

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
