import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plane, AlertCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './index.css';

// Fix for leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Common Indian Airports for routing
const AIRPORTS = {
  'DEL': { name: 'New Delhi', lat: 28.5562, lon: 77.1000 },
  'BOM': { name: 'Mumbai', lat: 19.0896, lon: 72.8656 },
  'BLR': { name: 'Bengaluru', lat: 13.1986, lon: 77.7066 },
  'HYD': { name: 'Hyderabad', lat: 17.2403, lon: 78.4294 },
  'CCU': { name: 'Kolkata', lat: 22.6540, lon: 88.4467 },
  'MAA': { name: 'Chennai', lat: 12.9941, lon: 80.1709 },
  'AMD': { name: 'Ahmedabad', lat: 23.0734, lon: 72.6261 },
  'PNQ': { name: 'Pune', lat: 18.5793, lon: 73.9089 },
  'GOI': { name: 'Goa', lat: 15.3808, lon: 73.8313 },
  'GOX': { name: 'Goa', lat: 15.7300, lon: 73.8800 },
  'LKO': { name: 'Lucknow', lat: 26.7606, lon: 80.8893 },
  'JAI': { name: 'Jaipur', lat: 26.8242, lon: 75.8122 },
  'PAT': { name: 'Patna', lat: 25.5913, lon: 85.0880 },
  'BBI': { name: 'Bhubaneswar', lat: 20.2444, lon: 85.8178 },
  'IXB': { name: 'Bagdogra', lat: 26.6812, lon: 88.3286 },
  'GAU': { name: 'Guwahati', lat: 26.1061, lon: 91.5859 },
  'VNS': { name: 'Varanasi', lat: 25.4520, lon: 82.8590 },
  'IXC': { name: 'Chandigarh', lat: 30.6735, lon: 76.7885 },
  'ATQ': { name: 'Amritsar', lat: 31.7096, lon: 74.7973 },
  'SXR': { name: 'Srinagar', lat: 33.9984, lon: 74.7743 },
  'IXJ': { name: 'Jammu', lat: 32.6892, lon: 74.8375 },
  'TRV': { name: 'Trivandrum', lat: 8.4821, lon: 76.9200 },
  'COK': { name: 'Kochi', lat: 10.1520, lon: 76.3930 },
  'CCJ': { name: 'Kozhikode', lat: 11.1368, lon: 75.9553 },
  'CJB': { name: 'Coimbatore', lat: 11.0300, lon: 77.0434 },
  'IXM': { name: 'Madurai', lat: 9.8345, lon: 78.0934 },
  'TRZ': { name: 'Trichy', lat: 10.7654, lon: 78.7097 },
  'VTZ': { name: 'Visakhapatnam', lat: 17.7211, lon: 83.2245 },
  'VGA': { name: 'Vijayawada', lat: 16.5304, lon: 80.7968 },
  'TIR': { name: 'Tirupati', lat: 13.6325, lon: 79.5433 },
  'RPR': { name: 'Raipur', lat: 21.1804, lon: 81.7388 },
  'NAG': { name: 'Nagpur', lat: 21.0922, lon: 79.0472 },
  'IDR': { name: 'Indore', lat: 22.7218, lon: 75.8011 },
  'BHO': { name: 'Bhopal', lat: 23.2875, lon: 77.3372 },
  'BDQ': { name: 'Vadodara', lat: 22.3361, lon: 73.2263 },
  'STV': { name: 'Surat', lat: 21.1152, lon: 72.7410 },
  'RAJ': { name: 'Rajkot', lat: 22.3092, lon: 70.7794 },
  'IXR': { name: 'Ranchi', lat: 23.3143, lon: 85.3218 },
  'GAY': { name: 'Gaya', lat: 24.7441, lon: 84.9512 },
  'AGR': { name: 'Agra', lat: 27.1558, lon: 77.9609 },
  'BWA': { name: 'Bhairawa (Nepal)', lat: 27.5065, lon: 83.4196 },
  'KTM': { name: 'Kathmandu (Nepal)', lat: 27.6966, lon: 85.3592 },
  'DXB': { name: 'Dubai', lat: 25.2528, lon: 55.3644 },
  'SHJ': { name: 'Sharjah', lat: 25.3286, lon: 55.5172 },
  'AUH': { name: 'Abu Dhabi', lat: 24.4330, lon: 54.6511 },
  'DOH': { name: 'Doha', lat: 25.2731, lon: 51.6081 },
  'SIN': { name: 'Singapore', lat: 1.3644, lon: 103.9915 },
  'KUL': { name: 'Kuala Lumpur', lat: 2.7456, lon: 101.7099 },
};

// Custom icons for Origin and Destination
const originIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const destIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to handle map center updates
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

// Helper to format UNIX timestamps to 12-hour time (e.g. 04:30 PM)
const formatTime = (unixSeconds) => {
  if (!unixSeconds) return '--:--';
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

function App() {
  const [activePerson, setActivePerson] = useState(null); // 'Sudhanshu' or 'Priyansh'
  const [currentCode, setCurrentCode] = useState('');
  const [flightData, setFlightData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  // Default center: India
  const defaultCenter = [22.5937, 78.9629];
  const defaultZoom = 5;

  const fetchFlightData = useCallback(async (code, personName) => {
    if (!code) return;
    
    setIsLoading(true);
    setError(null);
    setActivePerson(personName);
    setCurrentCode(code);
    
    try {
      const url = `/api/zones/fcgi/feed.js?flight=${code}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`Network Error: ${response.status}`);
      const data = await response.json();
      
      let flightKeys = Object.keys(data).filter(k => k !== 'full_count' && k !== 'version');
      
      // If flight is not found, show custom parent-friendly message
      if (flightKeys.length === 0) {
        throw new Error(`${personName}'s flight (${code}) has not started yet or is currently parked.`);
      }
      
      const flightId = flightKeys[0];
      const state = data[flightId];

      // Fetch detailed times from clickhandler
      let depTime = null;
      let arrTime = null;
      try {
        const detailRes = await fetch(`/api-live/clickhandler/?version=1.5&flight=${flightId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData && detailData.time) {
            depTime = detailData.time.real?.departure || detailData.time.scheduled?.departure;
            arrTime = detailData.time.estimated?.arrival || detailData.time.scheduled?.arrival;
          }
        }
      } catch (e) {
        console.error("Detailed time fetch failed", e);
      }
      
      // FR24 format: [ICAO24, Lat, Lon, Track, Alt, Speed, Squawk, Radar, Type, Reg, Time, Orig, Dest, Flight, OnGround, VS, Callsign, ?, Airline]
      const newFlightData = {
        icao24: state[0],
        callsign: state[16] || state[13] || code,
        longitude: state[2],
        latitude: state[1],
        altitude: Math.round(state[4] * 0.3048), // convert feet to meters
        velocity: Math.round(state[5] * 1.852), // convert knots to km/h
        trueTrack: state[3] || 0,
        onGround: state[14] === 1 || state[4] <= 0,
        origin: state[11],
        destination: state[12],
        departureTime: depTime,
        arrivalTime: arrTime
      };
      
      if (newFlightData.onGround) {
        throw new Error(`${personName}'s flight (${code}) is currently on the ground and hasn't taken off yet.`);
      }

      setFlightData(newFlightData);
      
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Network Error: Make sure the server is running.' : err.message);
      setFlightData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll every 15 seconds if tracking an active flight
  useEffect(() => {
    if (activePerson && currentCode && !error) {
      intervalRef.current = setInterval(() => {
        fetchFlightData(currentCode, activePerson);
      }, 15000); 
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activePerson, currentCode, error, fetchFlightData]);

  // Create custom marker icon (Top-down passenger jet)
  const createPlaneIcon = (heading) => {
    return L.divIcon({
      className: 'plane-icon-wrapper',
      html: `<div style="transform: rotate(${heading}deg); width: 28px; height: 28px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="28" height="28">
                 <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
               </svg>
             </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const center = flightData && flightData.latitude && flightData.longitude 
    ? [flightData.latitude, flightData.longitude] 
    : defaultCenter;

  const zoom = flightData ? 6 : defaultZoom;

  const [customSearch, setCustomSearch] = useState('');

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (customSearch.trim()) {
      fetchFlightData(customSearch.trim(), 'Custom');
    }
  };

  const originAirport = flightData?.origin ? AIRPORTS[flightData.origin] : null;
  const destAirport = flightData?.destination ? AIRPORTS[flightData.destination] : null;
  
  // Create coordinates for the route line
  const routePositions = [];
  if (originAirport && destAirport) {
    routePositions.push([originAirport.lat, originAirport.lon]);
    
    // Add current plane location if available, otherwise just draw straight line
    if (flightData && flightData.latitude && flightData.longitude) {
      routePositions.push([flightData.latitude, flightData.longitude]);
    }
    
    routePositions.push([destAirport.lat, destAirport.lon]);
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <Plane className="logo-icon" />
          <h1 className="title">Flight Tracker</h1>
        </div>
      </header>

      <main className="dashboard">
        <section className="controls-section">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Select a flight to track:</h2>
          
          <div className="button-group">
            <button 
              className={`btn-person ${activePerson === 'Sudhanshu' ? 'active' : ''}`}
              onClick={() => fetchFlightData('6E941', 'Sudhanshu')}
            >
              <span>Sudhanshu</span>
              <span className="flight-number">IndiGo 6E941</span>
            </button>
            
            <button 
              className={`btn-person ${activePerson === 'Priyansh' ? 'active' : ''}`}
              onClick={() => fetchFlightData('6E6477', 'Priyansh')}
            >
              <span>Priyansh</span>
              <span className="flight-number">IndiGo 6E6477</span>
            </button>
          </div>

          <form onSubmit={handleCustomSearch} className="desktop-only-search">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Developer Testing Search</h3>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                className="search-input" 
                placeholder="e.g. IX1542"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
              />
              <button type="submit" className="btn-search">Track</button>
            </div>
          </form>

          {isLoading && !flightData && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
              <RefreshCw className="loading-spinner" size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Locating flight...</div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle size={24} />
              <div>{error}</div>
            </div>
          )}

          {flightData && !error && (
            <div className="telemetry-card">
              <h3 style={{ marginBottom: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                {activePerson}'s Flight Status
              </h3>
              
              {(flightData.origin || flightData.destination) && (
                <div style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600', color: '#2563eb', textAlign: 'center' }}>
                  <span style={{ color: '#ef4444' }}>{flightData.origin || '?'}</span>
                  <span style={{ color: '#64748b', margin: '0 0.5rem' }}>➔</span>
                  <span style={{ color: '#10b981' }}>{flightData.destination || '?'}</span>
                </div>
              )}

              <div className="flight-info">
                <div className="info-box">
                  <span className="info-label">Altitude</span>
                  <span className="info-value">{flightData.altitude} m</span>
                </div>
                
                <div className="info-box">
                  <span className="info-label">Speed</span>
                  <span className="info-value">{flightData.velocity} km/h</span>
                </div>

                <div className="info-box">
                  <span className="info-label">Departure</span>
                  <span className="info-value">{formatTime(flightData.departureTime)}</span>
                </div>

                <div className="info-box">
                  <span className="info-label">Arrival (ETA)</span>
                  <span className="info-value">{formatTime(flightData.arrivalTime)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="map-container">
          <MapContainer 
            center={center} 
            zoom={zoom} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapUpdater center={center} zoom={zoom} />

            {/* Draw Origin Airport */}
            {originAirport && (
              <Marker position={[originAirport.lat, originAirport.lon]} icon={originIcon} interactive={false} />
            )}

            {/* Draw Destination Airport */}
            {destAirport && (
              <Marker position={[destAirport.lat, destAirport.lon]} icon={destIcon} interactive={false} />
            )}

            {/* Draw Route Line */}
            {routePositions.length > 0 && (
              <Polyline 
                positions={routePositions} 
                color="#64748b" 
                weight={3} 
                dashArray="10, 10" 
                opacity={0.6} 
              />
            )}
            
            {flightData && flightData.latitude && flightData.longitude && (
              <Marker 
                position={[flightData.latitude, flightData.longitude]}
                icon={createPlaneIcon(flightData.trueTrack)}
                zIndexOffset={1000}
                interactive={false}
              />
            )}
          </MapContainer>
        </section>
      </main>
    </div>
  );
}

export default App;
