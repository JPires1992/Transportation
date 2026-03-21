import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, Compass, History as HistoryIcon, MapPin, RefreshCcw, Route, Shuffle } from 'lucide-react';
import api from '../services/api';

const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

function subtractMinutes(timeString, minutesToSubtract) {
  if (!timeString) return '';
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes, seconds);
  date.setMinutes(date.getMinutes() - minutesToSubtract);
  const newHours = String(date.getHours()).padStart(2, '0');
  const newMinutes = String(date.getMinutes()).padStart(2, '0');
  const newSeconds = String(date.getSeconds()).padStart(2, '0');

  return `${newHours}:${newMinutes}:${newSeconds}`;
}

const PlanTrip = () => {
  const [stops, setStops] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [maxHops, setMaxHops] = useState(50);
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [stops]
  );

  const nameFor = (id) => {
    if (!id) return '';
    const found = sortedStops.find((s) => s.id === id);
    return found?.name || id;
  };

  useEffect(() => {
    loadStops();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!sortedStops.length) return;
    if (!origin) setOrigin(sortedStops[0].id);
    if (!destination && sortedStops[1]) setDestination(sortedStops[1].id);
  }, [sortedStops, origin, destination]);

  const loadStops = async () => {
    setLoadingStops(true);
    try {
      const res = await api.get('/stops/all/ids/name');
      setStops(res.data.stops || []);
      setError('');
    } catch (err) {
      console.error('Failed to load stops', err);
      setError('Failed to load stops');
    } finally {
      setLoadingStops(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/routes/plan/history');
      setHistory(Array.isArray(res.data.history) ? res.data.history : []);
    } catch (err) {
      console.error('Failed to load plan history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePlan = async (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      setError('Choose origin and destination');
      return;
    }
    setLoadingPlan(true);
    setError('');
    try {
      const params = { origin, destination };
      if (maxHops) params.max_hops = maxHops;
      const res = await api.get('/routes/plan', { params });
      setPlan(res.data.plan || null);
      await loadHistory();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to obtain plan';
      setError(msg);
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleUseHistory = (item) => {
    if (!item) return;
    setOrigin(item.origin?.id || '');
    setDestination(item.destination?.id || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-dark-lighter border border-dark-border rounded">
            <Compass className="text-primary" size={22} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary">Plan a trip</h2>
            <p className="text-gray-400">Choose origin and destination to get the optimized route.</p>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 bg-red-900/30 border border-red-800 text-red-200 rounded max-w-xl">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-dark-lighter border border-dark-border rounded-lg p-5 space-y-4">
          <form onSubmit={handlePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Origin</label>
                <div className="flex gap-2">
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-dark border border-dark-border text-sm"
                  >
                    <option value="">Choose a stop</option>
                    {sortedStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name} ({stop.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="px-3 py-2 bg-dark border border-dark-border rounded hover:border-primary transition-colors"
                    title="Trocar origem/destino"
                  >
                    <Shuffle size={16} className="text-primary" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Destination</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-dark border border-dark-border text-sm"
                >
                  <option value="">Choose a stop</option>
                  {sortedStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name} ({stop.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Max hops (optional)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxHops}
                  onChange={(e) => setMaxHops(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 rounded bg-dark border border-dark-border text-sm"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-colors"
                disabled={loadingPlan}
              >
                <Route size={18} />
                {loadingPlan ? 'Calculating...' : 'Get Route'}
              </button>
              {loadingStops && <span className="text-xs text-gray-500">Loading stops...</span>}
            </div>
          </form>

          <div className="border-t border-dark-border pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Route size={18} className="text-primary" />
              <h3 className="text-xl font-semibold text-primary">Result</h3>
              {loadingPlan && <span className="text-xs text-gray-400">Calculating...</span>}
            </div>

            {!plan ? (
              <p className="text-gray-500 text-sm">Submit origin and destination to see the route.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                  <span className="px-3 py-1 rounded bg-dark border border-dark-border">Stops: {plan.stop_count ?? plan.stops?.length ?? 0}</span>
                  <span className="px-3 py-1 rounded bg-dark border border-dark-border">Segments: {plan.segment_count ?? plan.segments?.length ?? 0}</span>
                  <span className="px-3 py-1 rounded bg-dark border border-dark-border">Hops: {plan.hops ?? 'n/a'}</span>
                  <span className="px-3 py-1 rounded bg-dark border border-dark-border">Route changes: {plan.route_changes ?? 0}</span>
                </div>

                <div className="bg-dark border border-dark-border rounded p-3">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <MapPin size={16} />
                    <span>{nameFor(plan.origin?.id)}</span>
                    <ArrowRight size={14} />
                    <span>{nameFor(plan.destination?.id)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Max hops used: {plan.max_hops ?? (maxHops || 'default')}</p>
                </div>

                <div className="space-y-3">
                  {plan.stops?.map((stop, idx) => {
                    const nextSegment = plan.segments?.[idx];
                    // mostrar o horário de chegada a esta paragem; usar segmento anterior como fallback
                    const prevSegment = plan.segments?.[idx - 1];
                    const displayTime = stop.time || prevSegment?.time || '';
                    const nextStopTime = plan.stops?.[idx + 1]?.time;
                    const futureDeparture = nextStopTime
                      ? subtractMinutes(nextStopTime, 5)
                      : '';
                    return (
                      <div key={`${stop.id}-${idx}`} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full border border-primary text-primary font-semibold flex items-center justify-center">
                            {idx + 1}
                          </div>
                          {idx < plan.stops.length - 1 && (
                            <div className="flex-1 w-px bg-dark-border min-h-[26px]" />
                          )}
                        </div>
                        <div className="flex-1 bg-dark border border-dark-border rounded p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-primary">{stop.name || stop.id}</p>
                              <p className="text-xs text-gray-500">{stop.id}</p>
                            </div>
                            {displayTime && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={12} /> {displayTime}
                              </div>
                            )}
                          </div>
                          {stop.zone && <p className="text-xs text-gray-500">Zona: {stop.zone}</p>}
                          {nextSegment && (
                            <p className="text-xs text-gray-400 mt-2">
                              Use {nextSegment.route || 'n/a'} direction to {plan.stops[idx + 1]?.name || 'next'} - Departure at: {futureDeparture || 'n/a'} 
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-dark-lighter border border-dark-border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HistoryIcon size={18} className="text-primary" />
              <h3 className="text-lg font-semibold text-primary">History</h3>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-2 px-3 py-2 bg-dark border border-dark-border rounded hover:border-primary transition-colors text-sm"
            >
              <RefreshCcw size={16} className="text-primary" />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <p className="text-sm text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No search history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, idx) => (
                <button
                  key={`${item.at || idx}-${item.origin?.id || 'o'}-${item.destination?.id || 'd'}`}
                  onClick={() => handleUseHistory(item)}
                  className="w-full text-left p-3 rounded border transition-colors bg-dark hover:border-primary border-dark-border"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <MapPin size={14} />
                      <span>{item.origin?.name || item.origin?.id || 'Origem'}</span>
                      <ArrowRight size={12} />
                      <span>{item.destination?.name || item.destination?.id || 'Destino'}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDateTime(item.at)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 flex gap-3">
                    <span>Stops: {item.stop_count ?? 'n/a'}</span>
                    <span>Segments: {item.segment_count ?? 'n/a'}</span>
                    <span>Hops: {item.hops ?? 'n/a'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlanTrip;
