import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Fix Leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Bus Icon
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
});

const LiveMap = () => {
  const [vehicles, setVehicles] = useState({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    socketRef.current.on('vehicle_update', (updates) => {
      setVehicles(prev => {
        const next = { ...prev };
        updates.forEach(update => {
          next[update.id] = update;
        });
        return next;
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-dark-border relative">
      {!connected && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg">
          Disconnected
        </div>
      )}
      {connected && (
        <div className="absolute top-4 right-4 z-[1000] bg-green-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          Live
        </div>
      )}
      
      <MapContainer 
        center={[41.1579, -8.6291]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {Object.values(vehicles).map(vehicle => (
          <Marker 
            key={vehicle.id} 
            position={[vehicle.lat, vehicle.lng]}
            icon={busIcon}
          >
            <Popup>
              <div className="text-dark font-sans">
                <strong className="block text-lg">{vehicle.plate}</strong>
                <span className="capitalize text-gray-600">{vehicle.type}</span>
                <br />
                <span className="text-xs text-gray-400">
                    Lat: {vehicle.lat.toFixed(4)}, Lng: {vehicle.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;

