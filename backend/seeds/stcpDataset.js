const fs = require('fs');
const path = require('path');

/**
 * Minimal fallback STCP-like dataset. This is NOT the full network.
 * Drop a JSON file at backend/data/stcp.json (or stcp-lines.json)
 * with the same shape ({ lines: [...] }) to seed the complete network.
 */
const fallbackLines = [
  {
    id: 'STCP-200',
    number: '200',
    name: 'Bolhao - Castelo do Queijo',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 1 },
      { id: 'stop_praca_liberdade', name: 'Praca da Liberdade', type: 'major', zone: 'Porto Centro', latitude: 41.1469, longitude: -8.6111, order: 2 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 3 },
      { id: 'stop_castelo_queijo', name: 'Castelo do Queijo', type: 'terminal', zone: 'Matosinhos', latitude: 41.1686, longitude: -8.6903, order: 4 },
    ],
  },
  {
    id: 'STCP-201',
    number: '201',
    name: 'Aliados - Viso',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_trindade', name: 'Trindade', type: 'metro', zone: 'Porto Centro', latitude: 41.1521, longitude: -8.6077, order: 2 },
      { id: 'stop_lapa', name: 'Lapa', type: 'regular', zone: 'Porto Centro', latitude: 41.1576, longitude: -8.6220, order: 3 },
      { id: 'stop_prelada', name: 'Prelada', type: 'regular', zone: 'Porto Norte', latitude: 41.1730, longitude: -8.6230, order: 4 },
      { id: 'stop_viso', name: 'Viso', type: 'regular', zone: 'Porto Norte', latitude: 41.1775, longitude: -8.6370, order: 5 },
    ],
  },
  {
    id: 'STCP-202',
    number: '202',
    name: 'Aliados - Passeio Alegre (via Av. Bessa)',
    active: true,
    schedule: '06:00-00:45',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 2 },
      { id: 'stop_av_bessa', name: 'Av. da Boavista (Bessa)', type: 'regular', zone: 'Boavista', latitude: 41.1615, longitude: -8.6425, order: 3 },
      { id: 'stop_aldoar', name: 'Aldoar', type: 'regular', zone: 'Porto Oeste', latitude: 41.1700, longitude: -8.6530, order: 4 },
      { id: 'stop_passeio_alegre', name: 'Passeio Alegre', type: 'terminal', zone: 'Foz', latitude: 41.1476, longitude: -8.6730, order: 5 },
    ],
  },
  {
    id: 'STCP-203',
    number: '203',
    name: 'Marques - Castelo do Queijo',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 1 },
      { id: 'stop_lapa', name: 'Lapa', type: 'regular', zone: 'Porto Centro', latitude: 41.1576, longitude: -8.6220, order: 2 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 3 },
      { id: 'stop_castelo_queijo', name: 'Castelo do Queijo', type: 'terminal', zone: 'Matosinhos', latitude: 41.1686, longitude: -8.6903, order: 4 },
    ],
  },
  {
    id: 'STCP-204',
    number: '204',
    name: 'Hospital de Sao Joao - Foz',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 1 },
      { id: 'stop_polo_universitario', name: 'Polo Universitario', type: 'metro', zone: 'Porto Norte', latitude: 41.1776, longitude: -8.5985, order: 2 },
      { id: 'stop_prelada', name: 'Prelada', type: 'regular', zone: 'Porto Norte', latitude: 41.1730, longitude: -8.6230, order: 3 },
      { id: 'stop_pasteleira', name: 'Pasteleira', type: 'regular', zone: 'Porto Oeste', latitude: 41.1540, longitude: -8.6530, order: 4 },
      { id: 'stop_foz', name: 'Foz', type: 'terminal', zone: 'Foz', latitude: 41.1502, longitude: -8.6729, order: 5 },
    ],
  },
  {
    id: 'STCP-205',
    number: '205',
    name: 'Campanha - Castelo do Queijo',
    active: true,
    schedule: '05:30-00:15',
    stops: [
      { id: 'stop_campanha', name: 'Campanha', type: 'train', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 1 },
      { id: 'stop_heroismo', name: 'Heroismo', type: 'regular', zone: 'Porto Centro', latitude: 41.1485, longitude: -8.5932, order: 2 },
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 3 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 4 },
      { id: 'stop_castelo_queijo', name: 'Castelo do Queijo', type: 'terminal', zone: 'Matosinhos', latitude: 41.1686, longitude: -8.6903, order: 5 },
    ],
  },
  {
    id: 'STCP-206',
    number: '206',
    name: 'Campanha - Viso',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_campanha', name: 'Campanha', type: 'train', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 1 },
      { id: 'stop_heroismo', name: 'Heroismo', type: 'regular', zone: 'Porto Centro', latitude: 41.1485, longitude: -8.5932, order: 2 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 3 },
      { id: 'stop_prelada', name: 'Prelada', type: 'regular', zone: 'Porto Norte', latitude: 41.1730, longitude: -8.6230, order: 4 },
      { id: 'stop_viso', name: 'Viso', type: 'regular', zone: 'Porto Norte', latitude: 41.1775, longitude: -8.6370, order: 5 },
    ],
  },
  {
    id: 'STCP-207',
    number: '207',
    name: 'Campanha - Mercado da Foz',
    active: true,
    schedule: '05:30-00:15',
    stops: [
      { id: 'stop_campanha', name: 'Campanha', type: 'train', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 1 },
      { id: 'stop_heroismo', name: 'Heroismo', type: 'regular', zone: 'Porto Centro', latitude: 41.1485, longitude: -8.5932, order: 2 },
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 3 },
      { id: 'stop_pasteleira', name: 'Pasteleira', type: 'regular', zone: 'Porto Oeste', latitude: 41.1540, longitude: -8.6530, order: 4 },
      { id: 'stop_foz', name: 'Foz Mercado', type: 'terminal', zone: 'Foz', latitude: 41.1502, longitude: -8.6729, order: 5 },
    ],
  },
  {
    id: 'STCP-208',
    number: '208',
    name: 'Aliados - Aldoar',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_lapa', name: 'Lapa', type: 'regular', zone: 'Porto Centro', latitude: 41.1576, longitude: -8.6220, order: 2 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 3 },
      { id: 'stop_aldoar', name: 'Aldoar', type: 'regular', zone: 'Porto Oeste', latitude: 41.1700, longitude: -8.6530, order: 4 },
    ],
  },
  {
    id: 'STCP-209',
    number: '209',
    name: 'Pasteleira - Prelada',
    active: true,
    schedule: '06:00-00:15',
    stops: [
      { id: 'stop_pasteleira', name: 'Pasteleira', type: 'regular', zone: 'Porto Oeste', latitude: 41.1540, longitude: -8.6530, order: 1 },
      { id: 'stop_aldoar', name: 'Aldoar', type: 'regular', zone: 'Porto Oeste', latitude: 41.1700, longitude: -8.6530, order: 2 },
      { id: 'stop_prelada', name: 'Prelada', type: 'regular', zone: 'Porto Norte', latitude: 41.1730, longitude: -8.6230, order: 3 },
    ],
  },
  {
    id: 'STCP-300',
    number: '300',
    name: 'Circular Hospital S. Joao - Aliados',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 1 },
      { id: 'stop_polo_universitario', name: 'Polo Universitario', type: 'metro', zone: 'Porto Norte', latitude: 41.1776, longitude: -8.5985, order: 2 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 3 },
      { id: 'stop_trindade', name: 'Trindade', type: 'metro', zone: 'Porto Centro', latitude: 41.1521, longitude: -8.6077, order: 4 },
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 5 },
    ],
  },
  {
    id: 'STCP-301',
    number: '301',
    name: 'Circular Hospital S. Joao - Sa da Bandeira',
    active: true,
    schedule: '05:30-00:30',
    stops: [
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 1 },
      { id: 'stop_polo_universitario', name: 'Polo Universitario', type: 'metro', zone: 'Porto Norte', latitude: 41.1776, longitude: -8.5985, order: 2 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 3 },
      { id: 'stop_sa_bandeira', name: 'Sa da Bandeira', type: 'regular', zone: 'Porto Centro', latitude: 41.1479, longitude: -8.6087, order: 4 },
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 5 },
    ],
  },
  {
    id: 'STCP-302',
    number: '302',
    name: 'Circular Aliados - Damiao de Gois',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_sa_bandeira', name: 'Sa da Bandeira', type: 'regular', zone: 'Porto Centro', latitude: 41.1479, longitude: -8.6087, order: 2 },
      { id: 'stop_damiao_gois', name: 'Damiao de Gois', type: 'regular', zone: 'Porto Norte', latitude: 41.1640, longitude: -8.6170, order: 3 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 4 },
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 5 },
    ],
  },
  {
    id: 'STCP-303',
    number: '303',
    name: 'Circular Praca da Liberdade - Constituicao',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_praca_liberdade', name: 'Praca da Liberdade', type: 'major', zone: 'Porto Centro', latitude: 41.1469, longitude: -8.6111, order: 1 },
      { id: 'stop_lapa', name: 'Lapa', type: 'regular', zone: 'Porto Centro', latitude: 41.1576, longitude: -8.6220, order: 2 },
      { id: 'stop_constituicao', name: 'Constituicao', type: 'regular', zone: 'Porto Centro', latitude: 41.1590, longitude: -8.6200, order: 3 },
      { id: 'stop_trindade', name: 'Trindade', type: 'metro', zone: 'Porto Centro', latitude: 41.1521, longitude: -8.6077, order: 4 },
      { id: 'stop_praca_liberdade', name: 'Praca da Liberdade', type: 'major', zone: 'Porto Centro', latitude: 41.1469, longitude: -8.6111, order: 5 },
    ],
  },
  {
    id: 'STCP-304',
    number: '304',
    name: 'Aliados - Sta. Luzia',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 2 },
      { id: 'stop_sta_luzia', name: 'Santa Luzia', type: 'regular', zone: 'Porto Centro', latitude: 41.1620, longitude: -8.6050, order: 3 },
    ],
  },
  {
    id: 'STCP-305',
    number: '305',
    name: 'Cordoaria - Hospital de S. Joao',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_cordoaria', name: 'Cordoaria', type: 'regular', zone: 'Porto Centro', latitude: 41.1471, longitude: -8.6183, order: 1 },
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 2 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 3 },
      { id: 'stop_polo_universitario', name: 'Polo Universitario', type: 'metro', zone: 'Porto Norte', latitude: 41.1776, longitude: -8.5985, order: 4 },
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 5 },
    ],
  },
  {
    id: 'STCP-400',
    number: '400',
    name: 'Aliados - Parque Nascente',
    active: true,
    schedule: '06:00-00:15',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_campanha', name: 'Campanha', type: 'train', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 2 },
      { id: 'stop_parque_nascente', name: 'Parque Nascente', type: 'mall', zone: 'Gondomar', latitude: 41.1676, longitude: -8.5603, order: 3 },
    ],
  },
  {
    id: 'STCP-401',
    number: '401',
    name: 'Bolhao - S. Roque',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 1 },
      { id: 'stop_sa_bandeira', name: 'Sa da Bandeira', type: 'regular', zone: 'Porto Centro', latitude: 41.1479, longitude: -8.6087, order: 2 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 3 },
      { id: 'stop_s_roque', name: 'S. Roque', type: 'regular', zone: 'Porto Norte', latitude: 41.1641, longitude: -8.6066, order: 4 },
    ],
  },
  {
    id: 'STCP-402',
    number: '402',
    name: 'Boavista - S. Roque',
    active: true,
    schedule: '06:00-00:30',
    stops: [
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 1 },
      { id: 'stop_lapa', name: 'Lapa', type: 'regular', zone: 'Porto Centro', latitude: 41.1576, longitude: -8.6220, order: 2 },
      { id: 'stop_s_roque', name: 'S. Roque', type: 'regular', zone: 'Porto Norte', latitude: 41.1641, longitude: -8.6066, order: 3 },
    ],
  },
  {
    id: 'STCP-403',
    number: '403',
    name: 'Boavista (Casa Musica) - Campanha',
    active: true,
    schedule: '05:30-00:15',
    stops: [
      { id: 'stop_casa_musica', name: 'Casa da Musica', type: 'metro', zone: 'Boavista', latitude: 41.1581, longitude: -8.6299, order: 1 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 2 },
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 3 },
      { id: 'stop_campanha', name: 'Campanha', type: 'train', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 4 },
    ],
  },
  {
    id: 'STCP-404',
    number: '404',
    name: 'Campanha (TIC) - Hospital S. Joao',
    active: true,
    schedule: '05:30-00:15',
    stops: [
      { id: 'stop_campanha', name: 'Campanha TIC', type: 'terminal', zone: 'Porto Este', latitude: 41.1492, longitude: -8.5858, order: 1 },
      { id: 'stop_marques', name: 'Marques', type: 'metro', zone: 'Porto Centro', latitude: 41.1579, longitude: -8.6063, order: 2 },
      { id: 'stop_sao_joao', name: 'Hospital Sao Joao', type: 'hospital', zone: 'Porto Norte', latitude: 41.1823, longitude: -8.6057, order: 3 },
    ],
  },
  {
    id: 'STCP-500',
    number: '500',
    name: 'Praca Liberdade - Matosinhos (Mercado)',
    active: true,
    schedule: '06:00-23:45',
    stops: [
      { id: 'stop_praca_liberdade', name: 'Praca da Liberdade', type: 'major', zone: 'Porto Centro', latitude: 41.1469, longitude: -8.6111, order: 1 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 2 },
      { id: 'stop_sra_hora', name: 'Senhora da Hora', type: 'metro', zone: 'Matosinhos', latitude: 41.1849, longitude: -8.6498, order: 3 },
      { id: 'stop_matosinhos', name: 'Matosinhos Mercado', type: 'regular', zone: 'Matosinhos', latitude: 41.1843, longitude: -8.6901, order: 4 },
    ],
  },
  {
    id: 'STCP-501',
    number: '501',
    name: 'Aliados - Matosinhos (Praia)',
    active: true,
    schedule: '06:00-23:45',
    stops: [
      { id: 'stop_aliados', name: 'Aliados', type: 'major', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6110, order: 1 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 2 },
      { id: 'stop_sra_hora', name: 'Senhora da Hora', type: 'metro', zone: 'Matosinhos', latitude: 41.1849, longitude: -8.6498, order: 3 },
      { id: 'stop_matosinhos_praia', name: 'Matosinhos Praia', type: 'terminal', zone: 'Matosinhos', latitude: 41.1790, longitude: -8.6940, order: 4 },
    ],
  },
  {
    id: 'STCP-502',
    number: '502',
    name: 'Bolhao - Matosinhos (Mercado)',
    active: true,
    schedule: '06:00-23:45',
    stops: [
      { id: 'stop_bolhao', name: 'Bolhao', type: 'metro', zone: 'Porto Centro', latitude: 41.1487, longitude: -8.6054, order: 1 },
      { id: 'stop_boavista', name: 'Boavista', type: 'major', zone: 'Boavista', latitude: 41.1575, longitude: -8.6289, order: 2 },
      { id: 'stop_sra_hora', name: 'Senhora da Hora', type: 'metro', zone: 'Matosinhos', latitude: 41.1849, longitude: -8.6498, order: 3 },
      { id: 'stop_matosinhos', name: 'Matosinhos Mercado', type: 'regular', zone: 'Matosinhos', latitude: 41.1843, longitude: -8.6901, order: 4 },
    ],
  },
];

function normalizeLine(raw) {
  const lineId = raw.id || (raw.number ? `STCP-${raw.number}` : null);
  if (!lineId) return null;
  const stops = Array.isArray(raw.stops) ? raw.stops : [];
  const normalizedStops = stops.map((stop, idx) => ({
    id: stop.id || `stop_${lineId}_${idx + 1}`,
    name: stop.name || `Stop ${idx + 1}`,
    type: stop.type || 'regular',
    zone: stop.zone || null,
    latitude: stop.latitude ?? null,
    longitude: stop.longitude ?? null,
    order: stop.order ?? idx + 1,
    time: stop.time || null,
  }));

  const line = {
    id: lineId,
    number: raw.number || lineId,
    name: raw.name || lineId,
    active: raw.active !== false,
    schedule: raw.schedule || null,
    stops: normalizedStops.sort((a, b) => (a.order || 0) - (b.order || 0)),
  };

  return line;
}

function buildStopsFromLines(lines) {
  const map = new Map();
  lines.forEach((line) => {
    line.stops.forEach((stop) => {
      if (!map.has(stop.id)) {
        map.set(stop.id, {
          id: stop.id,
          name: stop.name,
          type: stop.type,
          zone: stop.zone,
          latitude: stop.latitude,
          longitude: stop.longitude,
        });
      }
    });
  });
  return Array.from(map.values());
}

function loadFromFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const linesArray = Array.isArray(parsed) ? parsed : parsed.lines;
  if (!Array.isArray(linesArray)) return null;
  const normalized = linesArray
    .map(normalizeLine)
    .filter(Boolean);
  return { lines: normalized, stops: buildStopsFromLines(normalized) };
}

function loadStcpDataset() {
  const dataDir = path.join(__dirname, '..', 'data');
  const candidates = [
    path.join(dataDir, 'stcp.json'),
    path.join(dataDir, 'stcp-lines.json'),
    path.join(dataDir, 'stcp', 'stcp.json'),
  ];

  for (const candidate of candidates) {
    const loaded = loadFromFile(candidate);
    if (loaded) {
      console.log(`Loaded STCP dataset from ${path.relative(process.cwd(), candidate)}`);
      return loaded;
    }
  }

  const normalizedFallback = fallbackLines.map(normalizeLine).filter(Boolean);
  return { lines: normalizedFallback, stops: buildStopsFromLines(normalizedFallback), fallback: true };
}

module.exports = { loadStcpDataset };
