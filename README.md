# ✈️ Automated Flight Tracker & WhatsApp Notifier

A custom, automated flight tracking system designed to monitor specific flights in Indian airspace and send location-based WhatsApp alerts to parents. 

This project uses **React** for the frontend UI, **Node.js/Express** for the backend, **FlightRadar24** for live telemetry data, and **Twilio** for WhatsApp automation.

---

## ⚙️ How The Workflow Operates

The system relies on a sophisticated 3-part automated architecture. Here is the step-by-step flow of how data moves from the airplane to a parent's WhatsApp:

### 1. The "Alarm Clock" (GitHub Actions)
Free backend hosting services (like Render) put your server to sleep after 15 minutes of inactivity. To prevent this, we use a **GitHub Action** (`.github/workflows/check_flights.yml`).
* Every 10 minutes, GitHub Actions automatically wakes up.
* It sends a simple HTTP "ping" to the backend URL (`/cron/whatsapp-check`).
* This guarantees the backend is always awake and checking the flight status, without any human intervention.

### 2. The "Brain" (Node.js Backend & Tracker)
When the backend receives the 10-minute ping from GitHub, it executes the `whatsappTracker.js` engine:
* **Date Logic:** It first checks today's date. If today is April 29th, it knows it must monitor Sudhanshu's flight (6E941) and notify his parents. If today is May 3rd, it switches to Priyansh's flight (6E6477).
* **Live Telemetry:** It silently queries the FlightRadar24 API to find the exact Latitude, Longitude, Altitude, and Speed of the target aircraft.
* **Proximity Math:** Using the Haversine formula, it calculates the physical distance between the airplane and major Indian cities (e.g., Gwalior, Bhopal, Nagpur).

### 3. The "Messenger" (Twilio API)
If the backend detects a critical flight event, it triggers the Twilio Messenger:
* **Takeoff:** If altitude > 1,000m, it sends the "Takeoff Alert".
* **En Route:** If the plane comes within 100km of a tracked city, it sends an "En Route Update" (e.g., *Crossing near Gwalior*).
* **Approach:** If altitude drops below 1,500m at high speeds, it sends the "Landing Soon" alert.
* **Landed:** If altitude drops near 0m at low speeds, it sends the "Arrival Confirmation".
* **Memory Vault:** Before sending any message, it checks a temporary memory set (`sentAlerts`). If a message for a specific city was already sent, it skips it. This prevents parents from being spammed with duplicate messages every 10 minutes.

---

## 🛠️ Tech Stack
* **Frontend:** React + Vite, React-Leaflet, CartoDB Maps
* **Backend:** Node.js, Express, `http-proxy-middleware` (CORS bypass)
* **Automation:** GitHub Actions (Cron Jobs)
* **Messaging:** Twilio WhatsApp Sandbox API

## 🚀 Setup & Environment Variables
To run this project locally or deploy it, you must configure the following Environment Variables (`.env`) for the Twilio integration to work:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=whatsapp:+14155238886
TWILIO_TEST_NUMBER=whatsapp:+91XXXXXXXXXX
TWILIO_SUDHANSHU_PARENT_1=whatsapp:+91XXXXXXXXXX
TWILIO_SUDHANSHU_PARENT_2=whatsapp:+91XXXXXXXXXX
TWILIO_PRIYANSH_PARENT_1=whatsapp:+91XXXXXXXXXX
TWILIO_PRIYANSH_PARENT_2=whatsapp:+91XXXXXXXXXX
```
*(Note: Ensure all target phone numbers have opted-in to the Twilio Sandbox by sending the designated join code).*
