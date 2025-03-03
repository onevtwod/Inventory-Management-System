# Cushion Service Inventory Management App

## Overview
A mobile application for managing inventory of a cushion service company specializing in sofa leather replacement, car leather replacement, and sofa cushion replacement.

## Technology Stack
- Frontend: React Native (Cross-platform mobile app)
- Backend Database: PostgreSQL
- Barcode Scanning: react-native-camera
- Local Storage: AsyncStorage (for offline capabilities)
- Build Tool: Expo CLI

## Features
### Core Features (Requested)
1. Item Quantity Tracking
2. Audit Timestamp Recording
3. In/Out Transaction Records
4. New Item Addition
5. Barcode Scanning for Auditing
6. Unique Identifier (UID) for Each Item

### Additional Essential Features
7. User Authentication
8. Offline Sync Capability
9. Low Stock Alerts
10. Category Management (Sofa/Car/Replacement)
11. Search Functionality
12. Basic Reporting
13. Data Export (CSV)

## Database Design
### Tables
```sql
-- Items Table
CREATE TABLE items (
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    quantity INTEGER DEFAULT 0,
    barcode VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    item_uid VARCHAR(36) REFERENCES items(uid),
    quantity_change INTEGER NOT NULL,
    transaction_type VARCHAR(3), -- IN/OUT
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36)
);

-- Users
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    item_uid VARCHAR(36) REFERENCES items(uid),
    audited_quantity INTEGER,
    audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36)
);