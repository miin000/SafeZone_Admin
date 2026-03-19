'use client';

import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  CircleMarker,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerProps {
  lat: number;
  lon: number;
  radiusKm?: number;
  casePoints?: CasePoint[];
  onChange: (lat: number, lon: number) => void;
  onClose: () => void;
}

interface CasePoint {
  id: string;
  diseaseType: string;
  status: string;
  lat: number;
  lon: number;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToLocation({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  
  return null;
}

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'confirmed') return '#d62728';
  if (normalized === 'probable') return '#ff7f0e';
  if (normalized === 'suspected') return '#f59e0b';
  if (normalized === 'recovered') return '#16a34a';
  if (normalized === 'deceased' || normalized === 'died') return '#111827';
  return '#0ea5e9';
}

export default function LocationPicker({
  lat,
  lon,
  radiusKm = 1,
  casePoints = [],
  onChange,
  onClose,
}: LocationPickerProps) {
  const [position, setPosition] = useState({ lat, lon });
  const [inputLat, setInputLat] = useState(String(lat));
  const [inputLon, setInputLon] = useState(String(lon));

  const handleMapClick = (newLat: number, newLon: number) => {
    setPosition({ lat: newLat, lon: newLon });
    setInputLat(newLat.toFixed(6));
    setInputLon(newLon.toFixed(6));
  };

  const handleInputChange = () => {
    const newLat = parseFloat(inputLat);
    const newLon = parseFloat(inputLon);
    if (!isNaN(newLat) && !isNaN(newLon)) {
      setPosition({ lat: newLat, lon: newLon });
    }
  };

  const handleConfirm = () => {
    onChange(position.lat, position.lon);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📍 Chọn vị trí trên bản đồ</h3>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={{ height: 350, position: 'relative' }}>
          <MapContainer
            center={[position.lat, position.lon]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Circle
              center={[position.lat, position.lon]}
              radius={Math.max(0.1, radiusKm) * 1000}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />

            {casePoints.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lon]}
                radius={4}
                pathOptions={{
                  color: '#ffffff',
                  weight: 1,
                  fillColor: getStatusColor(point.status),
                  fillOpacity: 0.9,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  {point.diseaseType} ({point.status})
                </Tooltip>
              </CircleMarker>
            ))}

            <Marker position={[position.lat, position.lon]} />
            <MapClickHandler onClick={handleMapClick} />
            <FlyToLocation lat={position.lat} lon={position.lon} />
          </MapContainer>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Vĩ độ (Lat)</label>
              <input
                type="number"
                step="0.000001"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                onBlur={handleInputChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Kinh độ (Lon)</label>
              <input
                type="number"
                step="0.000001"
                value={inputLon}
                onChange={(e) => setInputLon(e.target.value)}
                onBlur={handleInputChange}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
            💡 Click vào bản đồ để chọn vị trí hoặc nhập tọa độ trực tiếp
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
            📍 Đang hiển thị {casePoints.length} ca bệnh để tham chiếu khi tạo vùng dịch
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={cancelButtonStyle}>
              Hủy
            </button>
            <button onClick={handleConfirm} style={confirmButtonStyle}>
              ✓ Xác nhận vị trí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10001,
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  width: '100%',
  maxWidth: 600,
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 20px',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  fontSize: 24,
  cursor: 'pointer',
  lineHeight: 1,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 14,
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
};

const confirmButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: 'white',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
