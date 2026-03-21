import { useEffect, useState, useMemo } from 'react';
import { Map, Navigation, Clock, AlertCircle, Info } from 'lucide-react';
import api from '../services/api';

const BusLines = () => {
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);
  const [lineDetails, setLineDetails] = useState(null);
  const [stops, setStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopDetails, setStopDetails] = useState(null);
  const [loadingLines, setLoadingLines] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // number of lines per page
  const [stopsPage, setStopsPage] = useState(1);
  const stopsPageSize = 6; // number of stops per page in itinerary
  const [stopSearch, setStopSearch] = useState('');
  const [allStopsPage, setAllStopsPage] = useState(1);
  const allStopsPageSize = 8; // page size for All Stops panel

  // compute filtered stops and pagination for All Stops (top-level hooks only)
  const filteredStops = useMemo(() => {
    const q = (stopSearch || '').trim().toLowerCase();
    if (!q) return allStops;
    return allStops.filter((s) => {
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.zone && s.zone.toLowerCase().includes(q))
      );
    });
  }, [allStops, stopSearch]);

  useEffect(() => {
    setAllStopsPage(1);
  }, [stopSearch]);

  const totalFiltered = filteredStops.length;
  const totalAllPages = Math.max(1, Math.ceil(totalFiltered / allStopsPageSize));
  const currentAllPage = Math.min(allStopsPage, totalAllPages);
  const allStart = (currentAllPage - 1) * allStopsPageSize;
  const currentPageStops = filteredStops.slice(allStart, allStart + allStopsPageSize);

  // helper to compute a compact page list with ellipses
  const makePageWindow = (total, current, maxButtons = 7) => {
    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total) {
      if (end < total - 1) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

  const loadLines = async () => {
    setLoadingLines(true);
    setError('');
    try {
      const res = await api.get('/lines');
      const list = res.data.lines || [];
      setLines(list);
      if (list.length > 0) {
        await loadLine(list[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load lines. Please try again.');
    } finally {
      setLoadingLines(false);
    }
  };

  const loadAllStops = async () => {
    try {
      const res = await api.get('/stops');
      setAllStops(res.data.stops || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLine = async (line) => {
    setSelectedLine(line);
    setLineDetails(null);
    setStops([]);
    setError('');
    try {
      const [detailRes, stopsRes] = await Promise.all([
        api.get(`/lines/${line.id}`),
        api.get(`/lines/${line.id}/stops`),
      ]);
      setLineDetails(detailRes.data.line || line);
      setStops(stopsRes.data.stops || []);
    } catch (err) {
      console.error(err);
      setError('Could not load details for this line.');
    }
  };

  const loadStopDetail = async (stopId) => {
    setSelectedStop(stopId);
    setStopDetails(null);
    try {
      const res = await api.get(`/stops/${stopId}`);
      setStopDetails(res.data.stop || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLines();
    loadAllStops();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Map className="text-primary" size={28} />
        <div>
          <h2 className="text-3xl font-bold text-primary">Bus Lines</h2>
          <p className="text-gray-400">Explore lines, itineraries, and stop details.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-dark-lighter border border-red-700 px-4 py-3 rounded">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-dark-lighter border border-dark-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-primary">Lines</h3>
            {loadingLines && <span className="text-xs text-gray-400">loading...</span>}
          </div>
          {lines.length === 0 && !loadingLines ? (
            <p className="text-gray-500 text-sm">No lines available.</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
                const cp = Math.min(currentPage, totalPages);
                const startIdx = (cp - 1) * pageSize;
                const paginated = lines.slice(startIdx, startIdx + pageSize);

                return (
                  <>
                    {paginated.map((line) => (
                      <button
                        key={line.id}
                        onClick={() => loadLine(line)}
                        className={`w-full text-left p-3 rounded border transition-colors ${
                          selectedLine?.id === line.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-dark-border bg-dark hover:border-primary hover:text-primary'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-lg font-semibold">{line.name}</p>
                            <p className="text-sm text-gray-400">#{line.number}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              line.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {line.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {line.stopCount !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">Stops: {line.stopCount}</p>
                        )}
                      </button>
                    ))}

                    {lines.length > pageSize && (
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">
                          Showing {startIdx + 1}-{Math.min(startIdx + paginated.length, lines.length)} of {lines.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={cp === 1}
                            className={`text-sm px-3 py-1 rounded border transition-colors ${cp === 1 ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                          >
                            Prev
                          </button>
                          {makePageWindow(totalPages, cp, 7).map((p, i) => (
                            p === '...' ? (
                              <span key={`e-${i}`} className="text-sm px-2 py-1">
                                …
                              </span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className={`text-sm px-2 py-1 rounded border transition-colors ${
                                  p === cp ? 'bg-primary text-black border-primary' : 'bg-dark border-dark-border hover:border-primary hover:text-primary'
                                }`}
                              >
                                {p}
                              </button>
                            )
                          ))}
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={cp === totalPages}
                            className={`text-sm px-3 py-1 rounded border transition-colors ${cp === totalPages ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {lineDetails && (
            <div className="mt-4 p-3 bg-dark border border-dark-border rounded text-sm text-gray-300 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Info size={16} /> Line details
              </div>
              <p><span className="text-gray-400">Name:</span> {lineDetails.name}</p>
              <p><span className="text-gray-400">Number:</span> {lineDetails.number}</p>
              {lineDetails.schedule && <p><span className="text-gray-400">Schedule:</span> {lineDetails.schedule}</p>}
              <p><span className="text-gray-400">Status:</span> {lineDetails.active ? 'Active' : 'Inactive'}</p>
            </div>
          )}
        </section>

        <section className="xl:col-span-2 bg-dark-lighter border border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Navigation size={18} className="text-primary" />
            <h3 className="text-xl font-semibold text-primary">
              {selectedLine ? `${selectedLine.name} itinerary` : 'Select a line'}
            </h3>
          </div>
          {selectedLine && stops.length === 0 && (
            <p className="text-gray-500 text-sm">No stops for this line.</p>
          )}
          {selectedLine && stops.length > 0 && (
            (() => {
              const totalPages = Math.max(1, Math.ceil(stops.length / stopsPageSize));
              const sp = Math.min(stopsPage, totalPages);
              const start = (sp - 1) * stopsPageSize;
              const pageStops = stops.slice(start, start + stopsPageSize);

              return (
                <>
                  <ol className="space-y-3">
                    {pageStops.map((stop, idx) => (
                      <li
                        key={`${selectedLine.id}-${stop.id}-${start + idx}`}
                        className="flex items-start gap-3 bg-dark border border-dark-border rounded p-3"
                      >
                        <div className="mt-1 text-primary font-bold">{stop.order ?? start + idx + 1}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-lg font-semibold">{stop.name}</p>
                              <p className="text-sm text-gray-400">{stop.id}</p>
                            </div>
                            {stop.time && (
                              <div className="flex items-center gap-1 text-sm text-gray-300">
                                <Clock size={14} className="text-primary" /> {stop.time}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {stop.type || 'stop'} {stop.zone ? `· ${stop.zone}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {stops.length > stopsPageSize && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-xs text-gray-400">
                        Showing {start + 1}-{Math.min(start + pageStops.length, stops.length)} of {stops.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStopsPage((p) => Math.max(1, p - 1))}
                          disabled={sp === 1}
                          className={`text-sm px-3 py-1 rounded border transition-colors ${sp === 1 ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                        >
                          Prev
                        </button>
                        {makePageWindow(totalPages, sp, 7).map((p, i) => (
                          p === '...' ? (
                            <span key={`es-${i}`} className="text-sm px-2 py-1">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setStopsPage(p)}
                              className={`text-sm px-2 py-1 rounded border transition-colors ${p === sp ? 'bg-primary text-black border-primary' : 'bg-dark border-dark-border hover:border-primary hover:text-primary'}`}
                            >
                              {p}
                            </button>
                          )
                        ))}
                        <button
                          onClick={() => setStopsPage((p) => Math.min(totalPages, p + 1))}
                          disabled={sp === totalPages}
                          className={`text-sm px-3 py-1 rounded border transition-colors ${sp === totalPages ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
          {!selectedLine && <p className="text-gray-500 text-sm">Choose a line to see its stops.</p>}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-dark-lighter border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-primary">All Stops</h3>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                placeholder="Search stops..."
                className="text-sm px-3 py-1 rounded bg-dark border border-dark-border placeholder:text-gray-500 w-44"
              />
              {!allStops.length && <span className="text-xs text-gray-500">loading...</span>}
            </div>
          </div>

          {allStops.length === 0 ? (
            <p className="text-gray-500 text-sm">No stops available.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
                {currentPageStops.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => loadStopDetail(stop.id)}
                    className={`w-full text-left p-2 rounded border transition-colors ${
                      selectedStop === stop.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-dark-border bg-dark hover:border-primary hover:text-primary'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{stop.name}</p>
                      <span className="text-xs text-gray-400">{stop.id}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {stop.zone ? `${stop.zone} · ` : ''}{stop.type || 'stop'}
                    </p>
                  </button>
                ))}
              </div>

              {totalFiltered > allStopsPageSize && (
                <>
                  <div className="text-xs text-gray-400 mb-2 justify-center flex">
                    Showing {allStart + 1}-{Math.min(allStart + currentPageStops.length, totalFiltered)} of {totalFiltered}
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setAllStopsPage((p) => Math.max(1, p - 1))}
                      disabled={currentAllPage === 1}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${currentAllPage === 1 ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                    >
                      Prev
                    </button>
                    {makePageWindow(totalAllPages, currentAllPage, 2).map((p, i) => (
                      p === '...' ? (
                        <span key={`ea-${i}`} className="text-sm px-2 py-1">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setAllStopsPage(p)}
                          className={`text-sm px-2 py-1 rounded border transition-colors ${p === currentAllPage ? 'bg-primary text-black border-primary' : 'bg-dark border-dark-border hover:border-primary hover:text-primary'}`}
                        >
                          {p}
                        </button>
                      )
                    ))}
                    <button
                      onClick={() => setAllStopsPage((p) => Math.min(totalAllPages, p + 1))}
                      disabled={currentAllPage === totalAllPages}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${currentAllPage === totalAllPages ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="lg:col-span-2 bg-dark-lighter border border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={18} className="text-primary" />
            <h3 className="text-xl font-semibold text-primary">Stop details</h3>
          </div>
          {!selectedStop && <p className="text-gray-500 text-sm">Select a stop to see details.</p>}
          {selectedStop && !stopDetails && <p className="text-gray-500 text-sm">Loading stop info...</p>}
          {stopDetails && (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-primary">{stopDetails.name}</p>
                <p className="text-sm text-gray-400">{stopDetails.id}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                <div><span className="text-gray-400">Type:</span> {stopDetails.type || 'stop'}</div>
                <div><span className="text-gray-400">Zone:</span> {stopDetails.zone || 'n/a'}</div>
                <div><span className="text-gray-400">Latitude:</span> {stopDetails.latitude ?? 'n/a'}</div>
                <div><span className="text-gray-400">Longitude:</span> {stopDetails.longitude ?? 'n/a'}</div>
              </div>
              {stopDetails.routes && stopDetails.routes.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Routes that stop here:</p>
                  <div className="flex flex-wrap gap-2">
                    {stopDetails.routes.map((routeId) => (
                      <span key={routeId} className="text-xs px-2 py-1 rounded bg-dark border border-dark-border text-primary">
                        {routeId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BusLines;
