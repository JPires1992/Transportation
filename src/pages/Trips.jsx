import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Activity, ArrowRight, Clock, MapPin, TrendingUp, Route as RouteIcon } from 'lucide-react';

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return 'N/A';
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const makePageWindow = (total, current, maxButtons = 3) => {
  if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

  const pages = [];
  if (start > 1) pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  if (end < total) pages.push(total);
  return pages;
};

const StatCard = ({ title, value, icon, helper }) => (
  <div className="bg-dark-lighter border border-dark-border rounded-lg p-4 flex items-start gap-4 hover:border-primary transition-colors">
    <div className="p-2 bg-dark border border-dark-border rounded">{icon}</div>
    <div className="space-y-1">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-primary">{value ?? 'N/A'}</p>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-dark-border pb-2">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-200">{value}</span>
  </div>
);

const Trips = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tripsPage, setTripsPage] = useState(1);
  const tripsPageSize = 5;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [tRes, sRes] = await Promise.all([api.get('/trips'), api.get('/trips/stats')]);
        if (!mounted) return;
        setTrips(Array.isArray(tRes.data.trips) ? tRes.data.trips : []);
        setStats(sRes.data.stats || null);
        setError(null);
      } catch (err) {
        console.error('Error loading trips', err);
        if (mounted) setError('Failed to load trips');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedTripId) {
      setSelectedTrip(null);
      return;
    }
    let mounted = true;
    const fetchDetails = async () => {
      setDetailLoading(true);
      try {
        const res = await api.get(`/trips/${selectedTripId}`);
        if (!mounted) return;
        const raw = res.data.trip || null;
        if (raw) {
          const normalized = {
            ...raw,
            origin: typeof raw.origin === 'object' && raw.origin !== null ? raw.origin.name || JSON.stringify(raw.origin) : raw.origin,
            destination: typeof raw.destination === 'object' && raw.destination !== null ? raw.destination.name || JSON.stringify(raw.destination) : raw.destination,
          };
          setSelectedTrip(normalized);
        }
      } catch (err) {
        console.error('Error fetching trip detail', err);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    fetchDetails();
    return () => { mounted = false; };
  }, [selectedTripId]);

  useEffect(() => {
    if (trips.length === 0) {
      setSelectedTripId(null);
      setSelectedTrip(null);
      return;
    }
    if (!selectedTripId || !trips.some((t) => t.id === selectedTripId)) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, selectedTripId]);

  useEffect(() => setTripsPage(1), [trips.length]);

  const totalTrips = trips.length;
  const totalTripsPages = Math.max(1, Math.ceil(totalTrips / tripsPageSize));
  const currentTripsPage = Math.min(tripsPage, totalTripsPages);
  const tripsStartIdx = (currentTripsPage - 1) * tripsPageSize;
  const visibleTrips = trips.slice(tripsStartIdx, tripsStartIdx + tripsPageSize);

  if (loading) return <div className="text-center p-8 text-primary">Loading trips...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dark-border pb-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Trips</h2>
          <p className="text-gray-400">Statistics and history of your trips.</p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <button
            onClick={() => navigate('/plan-trip')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-colors"
          >
            <RouteIcon size={18} />
            Plan trip
          </button>
          {error && (
            <div className="px-4 py-2 bg-red-900/30 border border-red-800 text-red-200 rounded">{error}</div>
          )}
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total trips" value={stats.trip_count} icon={<Activity size={22} className="text-primary" />} />
          <StatCard title="Total duration" value={formatDuration(stats.total_duration_minutes)} icon={<Clock size={22} className="text-green-400" />} />
          <StatCard title="Average duration" value={formatDuration(stats.avg_duration_minutes)} icon={<TrendingUp size={22} className="text-blue-400" />} />
          <StatCard title="Last trip" value={formatDateTime(stats.last_trip_started_at)} icon={<MapPin size={22} className="text-amber-300" />} helper={stats.last_trip_ended_at ? `Ended at ${formatDateTime(stats.last_trip_ended_at)}` : 'Ongoing'} />
          <p className="text-xs text-gray-600"> Statistics based on {trips.length} registered trips.</p>
        </div>
      ) : (
        <div className="text-gray-500">No statistics available.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-primary">Trip History</h3>
            <span className="text-sm text-gray-500">{trips.length === 1 ? '1 trip found' : `${trips.length} trips found`}</span>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-dark-border rounded-lg text-gray-500">No trips found.</div>
          ) : (
            <div className="space-y-3">
              {visibleTrips.map((trip) => {
                const isActive = trip.id === selectedTripId;
                const status = trip.ended_at ? 'Concluida' : 'Em curso';
                return (
                  <button
                    key={trip.id}
                    onClick={() => { setSelectedTripId(trip.id); setSelectedTrip(trip); }}
                    className={`w-full text-left p-4 rounded border transition-all bg-dark-lighter ${isActive ? 'border-primary shadow-lg shadow-primary/10' : 'border-dark-border hover:border-primary'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-gray-200">
                        <MapPin size={18} className="text-primary" />
                        <span className="font-semibold">{typeof trip.origin === 'string' ? trip.origin : trip.origin?.name || 'Origem desconhecida'}</span>
                        <ArrowRight size={16} className="text-gray-500" />
                        <span className="font-semibold">{typeof trip.destination === 'string' ? trip.destination : trip.destination?.name || 'Destino desconhecido'}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${trip.ended_at ? 'bg-green-900/40 text-green-200' : 'bg-blue-900/40 text-blue-200'}`}>{status}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-400 flex flex-wrap items-center gap-4">
                      <span><strong>Start:</strong> {formatDateTime(trip.started_at)}</span>
                      <span><strong>End:</strong> {formatDateTime(trip.ended_at)}</span>
                      <span><strong>Duration:</strong> {formatDuration(trip.duration_minutes)}</span>
                    </div>
                  </button>
                );
              })}

              {totalTrips > tripsPageSize && (
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-400">Showing {tripsStartIdx + 1}-{Math.min(tripsStartIdx + visibleTrips.length, totalTrips)} of {totalTrips}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTripsPage((p) => Math.max(1, p - 1))} disabled={currentTripsPage === 1} className={`text-sm px-3 py-1 rounded border transition-colors ${currentTripsPage === 1 ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}>Prev</button>

                    {makePageWindow(totalTripsPages, currentTripsPage, 3).map((p, i) => (
                      p === '...' ? (
                        <span key={`tp-${i}`} className="text-sm px-2 py-1">…</span>
                      ) : (
                        <button key={p} onClick={() => setTripsPage(p)} className={`text-sm px-2 py-1 rounded border transition-colors ${p === currentTripsPage ? 'bg-primary text-black border-primary' : 'bg-dark border-dark-border hover:border-primary hover:text-primary'}`}>{p}</button>
                      )
                    ))}

                    <button onClick={() => setTripsPage((p) => Math.min(totalTripsPages, p + 1))} disabled={currentTripsPage === totalTripsPages} className={`text-sm px-3 py-1 rounded border transition-colors ${currentTripsPage === totalTripsPages ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-dark-lighter border border-dark-border rounded-lg p-6 h-fit mt-0 lg:mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-primary">Trip details</h3>
            {detailLoading && selectedTrip && <span className="text-xs text-gray-500">Updating...</span>}
          </div>
          {!selectedTrip ? (
            <div className="text-gray-500">Select a trip to view details.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <DetailRow label="ID" value={selectedTrip.id} />
              <DetailRow label="Origin" value={typeof selectedTrip.origin === 'string' ? selectedTrip.origin : selectedTrip.origin?.name || 'N/A'} />
              <DetailRow label="Destination" value={typeof selectedTrip.destination === 'string' ? selectedTrip.destination : selectedTrip.destination?.name || 'N/A'} />
              <DetailRow label="Start" value={formatDateTime(selectedTrip.started_at)} />
              <DetailRow label="End" value={formatDateTime(selectedTrip.ended_at)} />
              <DetailRow label="Duration" value={formatDuration(selectedTrip.duration_minutes)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trips;
