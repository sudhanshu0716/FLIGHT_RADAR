import twilio from 'twilio';

// Environment variables to be configured in Render dashboard
// TWILIO_ACCOUNT_SID
// TWILIO_AUTH_TOKEN
// TWILIO_FROM_NUMBER (e.g. whatsapp:+14155238886)
// TWILIO_TEST_NUMBER (e.g. whatsapp:+919876543210)
// TWILIO_SUDHANSHU_PARENT_1 (e.g. whatsapp:+919876543210)
// TWILIO_SUDHANSHU_PARENT_2 (e.g. whatsapp:+919876543210)
// TWILIO_PRIYANSH_PARENT_1 (e.g. whatsapp:+919876543210)
// TWILIO_PRIYANSH_PARENT_2 (e.g. whatsapp:+919876543210)

const cities = [
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Gwalior', lat: 26.2183, lon: 78.1828 }
];

// In-memory cache to prevent spamming messages
const sentAlerts = new Set();

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const checkFlightsAndSendWhatsApp = async () => {
  console.log("Running scheduled WhatsApp flight tracker check...");
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log("Twilio credentials not configured. Skipping WhatsApp alerts.");
    return { success: false, message: "Missing Twilio config" };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  
  // Collect numbers from environment, filtering out undefined
  const testNumbers = [process.env.TWILIO_TEST_NUMBER].filter(Boolean);
  const sudhanshuParents = [process.env.TWILIO_SUDHANSHU_PARENT_1, process.env.TWILIO_SUDHANSHU_PARENT_2].filter(Boolean);
  const priyanshParents = [process.env.TWILIO_PRIYANSH_PARENT_1, process.env.TWILIO_PRIYANSH_PARENT_2].filter(Boolean);

  // Get current date to apply user's date rules
  const today = new Date();
  const dateStr = `${today.getDate()}-${today.getMonth() + 1}`; // e.g., "28-4" or "29-4"

  const flightsToTrack = [
    { code: '6E941', person: 'Sudhanshu', rules: { '28-4': testNumbers, '29-4': sudhanshuParents } },
    { code: '6E6477', person: 'Priyansh', rules: { '3-5': priyanshParents } }
  ];

  let summary = [];

  for (const flight of flightsToTrack) {
    const targetNumbers = flight.rules[dateStr];
    
    // Only track if today matches the scheduled date and there are target numbers
    if (!targetNumbers || targetNumbers.length === 0) {
        continue;
    }

    try {
      // Fetch live data directly from flightradar feed
      const response = await fetch(`https://data-cloud.flightradar24.com/zones/fcgi/feed.js?flight=${flight.code}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      const flightKeys = Object.keys(data).filter(k => k !== 'full_count' && k !== 'version');
      
      if (flightKeys.length === 0) {
        continue;
      }

      const flightId = flightKeys[0];
      const state = data[flightId];
      const lat = state[1];
      const lon = state[2];
      const alt = state[4];
      const speed = state[5];

      // 1. Alert: Flight has taken off
      const startedKey = `${flight.code}_Started_${dateStr}`;
      if (!sentAlerts.has(startedKey) && alt > 1000) {
        const msg = `✈️ *Takeoff Alert for ${flight.person}*\n\nThe flight (IndiGo ${flight.code}) has officially taken off from the origin airport and is in the air! Track it live on the app.`;
        for (const number of targetNumbers) {
          try {
            await client.messages.create({ body: msg, from: fromNumber, to: number });
          } catch (e) {
            console.error(`Failed to send to ${number}:`, e.message);
          }
        }
        sentAlerts.add(startedKey);
        summary.push(`Processed takeoff alert for ${flight.person} to ${targetNumbers.length} numbers`);
      }

      // 2. Alert: Proximity to major cities
      for (const city of cities) {
        const distance = getDistance(lat, lon, city.lat, city.lon);
        const cityKey = `${flight.code}_Near_${city.name}_${dateStr}`;
        
        if (distance < 100 && !sentAlerts.has(cityKey) && sentAlerts.has(startedKey)) {
          const msg = `📍 *En Route Update for ${flight.person}*\n\nThe flight is currently crossing near *${city.name}*.\nAltitude: ${alt} m\nSpeed: ${speed} km/h.`;
          for (const number of targetNumbers) {
            try {
              await client.messages.create({ body: msg, from: fromNumber, to: number });
            } catch (e) {
              console.error(`Failed to send to ${number}:`, e.message);
            }
          }
          sentAlerts.add(cityKey);
          summary.push(`Processed ${city.name} proximity alert for ${flight.person}`);
        }
      }

      // 3. Alert: Final Approach (Landing soon)
      const approachKey = `${flight.code}_Approach_${dateStr}`;
      if (sentAlerts.has(startedKey) && !sentAlerts.has(approachKey) && alt > 0 && alt < 1500 && speed > 200) {
        const msg = `🛬 *Landing Alert for ${flight.person}*\n\nThe flight is on its final approach and will be landing very soon!`;
        for (const number of targetNumbers) {
          try {
            await client.messages.create({ body: msg, from: fromNumber, to: number });
          } catch (e) {
            console.error(`Failed to send to ${number}:`, e.message);
          }
        }
        sentAlerts.add(approachKey);
        summary.push(`Processed approach alert for ${flight.person}`);
      }

      // 4. Alert: Landed Successfully
      const landedKey = `${flight.code}_Landed_${dateStr}`;
      if (sentAlerts.has(startedKey) && !sentAlerts.has(landedKey) && alt < 100 && speed < 100) {
        const msg = `✅ *Arrival Confirmation for ${flight.person}*\n\nThe flight has landed successfully at the destination!`;
        for (const number of targetNumbers) {
          try {
            await client.messages.create({ body: msg, from: fromNumber, to: number });
          } catch (e) {
            console.error(`Failed to send to ${number}:`, e.message);
          }
        }
        sentAlerts.add(landedKey);
        summary.push(`Processed landed alert for ${flight.person}`);
      }

    } catch (err) {
      console.error(`Error tracking ${flight.code}:`, err);
    }
  }

  return { success: true, alertsSent: summary };
};
