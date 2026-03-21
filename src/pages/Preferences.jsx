import { useEffect, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Heart, Loader2, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotificationPreferences,
  fetchFavorites,
  fetchFeedback,
  fetchLineIds,
  fetchStopIds,
  fetchNotifications,
  saveNotificationPreferences,
  saveFavorites,
  saveFeedback,
} from '../services/preferences';

// Rating component with stars
const StarRating = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4, 5].map((score) => {
      const active = value >= score;
      return (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`p-2 rounded transition-colors ${active ? 'bg-primary/20 text-primary' : 'bg-dark border border-dark-border text-gray-400 hover:border-primary'}`}
        >
          <Star size={20} className={active ? 'fill-primary text-primary' : ''} />
        </button>
      );
    })}
    <span className="text-sm text-gray-400">Evaluate from 1 to 5 stars</span>
  </div>
);

const ChipSelector = ({ options, selected, onToggle, emptyLabel }) => {
  if (!options.length) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-2 rounded border text-sm transition-all ${
              active
                ? 'bg-primary text-dark border-primary'
                : 'bg-dark border-dark-border text-gray-300 hover:border-primary'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const SectionCard = ({ title, icon, children, actions }) => (
  <div className="bg-dark-lighter border border-dark-border rounded-lg p-5 space-y-4">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded bg-dark border border-dark-border text-primary">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-100">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

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

// Main Preferences component
const Preferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const [notifyRouteChanges, setNotifyRouteChanges] = useState(false);
  const [notifyEta, setNotifyEta] = useState(false);

  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [favoriteStops, setFavoriteStops] = useState([]);

  const [lineOptions, setLineOptions] = useState([]);
  const [stopOptions, setStopOptions] = useState([]);

  // Favorite stops pagination
  const [stopsPage, setStopsPage] = useState(1);
  const stopsPageSize = 40;
  const [stopsQuery, setStopsQuery] = useState('');

  const [feedbackScore, setFeedbackScore] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const [notifications, setNotifications] = useState([]);

  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess('');

      const [notifRes, favRes, feedbackRes, linesRes, stopsRes, activeNotifsRes] = await Promise.allSettled([
        fetchNotificationPreferences(),
        fetchFavorites(),
        fetchFeedback(),
        fetchLineIds(),
        fetchStopIds(),
        user?.id ? fetchNotifications(user.id) : Promise.resolve({ data: { notifications: [] } }),
      ]);

      const pickError = (res, fallback) => res.reason?.response?.data?.error || res.reason?.message || fallback;

      if (notifRes.status === 'fulfilled') {
        const prefs = notifRes.value.data?.notification_preferences || {};
        setNotifyRouteChanges(!!prefs.notify_route_changes);
        setNotifyEta(!!prefs.notify_eta);
      } else {
        setError((prev) => prev || pickError(notifRes, 'Error loading notification preferences'));
      }

      if (favRes.status === 'fulfilled') {
        const favs = favRes.value.data?.favorites || {};
        setFavoriteRoutes(favs.favorite_routes || []);
        setFavoriteStops(favs.favorite_stops || []);
      } else {
        setError((prev) => prev || pickError(favRes, 'Error loading favorites'));
      }

      if (feedbackRes.status === 'fulfilled') {
        const fb = feedbackRes.value.data?.feedback || {};
        setFeedbackScore(fb.feedback_score ?? null);
        setFeedbackText(fb.feedback_text || '');
      } else {
        setError((prev) => prev || pickError(feedbackRes, 'Error loading feedback'));
      }

      if (linesRes.status === 'fulfilled') {
        setLineOptions(linesRes.value.data?.ids || []);
      } else {
        setError((prev) => prev || pickError(linesRes, 'Error loading lines'));
      }

      if (stopsRes.status === 'fulfilled') {
        setStopOptions(stopsRes.value.data?.ids || []);
      } else {
        setError((prev) => prev || pickError(stopsRes, 'Error loading stops'));
      }

      if (activeNotifsRes.status === 'fulfilled') {
        setNotifications(activeNotifsRes.value.data?.notifications || []);
      } else {
        setError((prev) => prev || pickError(activeNotifsRes, 'Error loading active notifications'));
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const toggleItem = (value, listSetter) => {
    listSetter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleSaveNotification = async () => {
    setSaving('notification');
    setSuccess('');
    setError(null);
    try {
      await saveNotificationPreferences({
        notify_route_changes: notifyRouteChanges,
        notify_eta: notifyEta,
      });
      setSuccess('Notification preferences saved');
      if (user?.id) {
        const res = await fetchNotifications(user.id);
        setNotifications(res.data?.notifications || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving notifications');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFavorites = async () => {
    setSaving('favorites');
    setSuccess('');
    setError(null);
    try {
      await saveFavorites({
        favorite_routes: favoriteRoutes,
        favorite_stops: favoriteStops,
      });
      setSuccess('Favorites saved');
    } catch (err) {
      const msg =
        err.response?.data?.invalid_routes || err.response?.data?.invalid_stops
          ? `${err.response?.data?.error}: ${[...(err.response?.data?.invalid_routes || []), ...(err.response?.data?.invalid_stops || [])].join(', ')}`
          : err.response?.data?.error || 'Error saving favorites';
      setError(msg);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFeedback = async () => {
    setSaving('feedback');
    setSuccess('');
    setError(null);
    try {
      await saveFeedback({
        feedback_score: feedbackScore,
        feedback_text: feedbackText,
      });
      setSuccess('Feedback sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending feedback');
    } finally {
      setSaving(null);
    }
  };

  // reset stops page when stop options or query change
  useEffect(() => setStopsPage(1), [stopOptions.length, stopsQuery]);

  const filteredStops = stopOptions.filter((s) => s.toLowerCase().includes(stopsQuery.trim().toLowerCase()));
  const totalStops = filteredStops.length;
  const totalStopsPages = Math.max(1, Math.ceil(totalStops / stopsPageSize));
  const currentStopsPage = Math.min(stopsPage, totalStopsPages);
  const stopsStartIdx = (currentStopsPage - 1) * stopsPageSize;
  const visibleStops = filteredStops.slice(stopsStartIdx, stopsStartIdx + stopsPageSize);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-primary">
        <Loader2 className="animate-spin" size={20} />
        <span>Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-dark-border pb-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Preferences</h2>
          <p className="text-gray-400">Manage notifications, favorites, and feedback.</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/40 border border-red-800 text-red-100 rounded">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && !error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-800 text-green-100 rounded">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Notification Preferences"
          icon={<Bell size={20} />}
          actions={
            <button
              onClick={handleSaveNotification}
              disabled={saving === 'notification'}
              className="px-4 py-2 bg-primary text-dark font-semibold rounded hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {saving === 'notification' ? 'Saving...' : 'Save notifications'}
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifyRouteChanges}
                onChange={(e) => setNotifyRouteChanges(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-gray-200">Alerts for changes in favorite lines</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifyEta}
                onChange={(e) => setNotifyEta(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-gray-200">Alerts for ETA on favorite stops</span>
            </label>
          </div>

          <div className="border-t border-dark-border pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Active notifications</h4>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No active notifications.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n, idx) => (
                  <li key={`${n.type}-${idx}`} className="p-3 rounded border border-dark-border bg-dark">
                    <div className="text-primary font-semibold capitalize">{n.type.replace('_', ' ')}</div>
                    <p className="text-sm text-gray-300">{n.message}</p>
                    {n.routes?.length > 0 && (
                      <p className="text-xs text-gray-500">Routes: {n.routes.join(', ')}</p>
                    )}
                    {n.stops?.length > 0 && (
                      <p className="text-xs text-gray-500">Stops: {n.stops.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Favorites"
          icon={<Heart size={20} />}
          actions={
            <button
              onClick={handleSaveFavorites}
              disabled={saving === 'favorites'}
              className="px-4 py-2 bg-primary text-dark font-semibold rounded hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {saving === 'favorites' ? 'Saving...' : 'Save favorites'}
            </button>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Select favorite lines</p>
            <ChipSelector
              options={lineOptions}
              selected={favoriteRoutes}
              onToggle={(value) => toggleItem(value, setFavoriteRoutes)}
              emptyLabel="No lines loaded."
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Select favorite stops</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={stopsQuery}
                onChange={(e) => setStopsQuery(e.target.value)}
                placeholder="Search stops..."
                className="flex-1 bg-dark border border-dark-border rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary"
              />
              {stopsQuery && (
                <button type="button" onClick={() => setStopsQuery('')} className="px-3 py-2 text-sm bg-dark border border-dark-border rounded text-gray-300 hover:border-primary">Clear</button>
              )}
            </div>
            <div className="mt-2">
              <ChipSelector
                options={visibleStops}
                selected={favoriteStops}
                onToggle={(value) => toggleItem(value, setFavoriteStops)}
                emptyLabel="No stops loaded."
              />
            </div>
            {totalStops > stopsPageSize && (
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">Showing {stopsStartIdx + 1}-{Math.min(stopsStartIdx + visibleStops.length, totalStops)} of {totalStops}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStopsPage((p) => Math.max(1, p - 1))} disabled={currentStopsPage === 1} className={`text-sm px-3 py-1 rounded border transition-colors ${currentStopsPage === 1 ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}>Prev</button>

                  {makePageWindow(totalStopsPages, currentStopsPage, 3).map((p, i) => (
                    p === '...' ? (
                      <span key={`sp-${i}`} className="text-sm px-2 py-1">…</span>
                    ) : (
                      <button key={p} onClick={() => setStopsPage(p)} className={`text-sm px-2 py-1 rounded border transition-colors ${p === currentStopsPage ? 'bg-primary text-black border-primary' : 'bg-dark border-dark-border hover:border-primary hover:text-primary'}`}>{p}</button>
                    )
                  ))}

                  <button onClick={() => setStopsPage((p) => Math.min(totalStopsPages, p + 1))} disabled={currentStopsPage === totalStopsPages} className={`text-sm px-3 py-1 rounded border transition-colors ${currentStopsPage === totalStopsPages ? 'opacity-50 cursor-not-allowed bg-dark' : 'bg-dark hover:border-primary hover:text-primary'}`}>Next</button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Feedback"
        icon={<MessageSquare size={20} />}
        actions={
          <button
            onClick={handleSaveFeedback}
            disabled={saving === 'feedback'}
            className="px-4 py-2 bg-primary text-dark font-semibold rounded hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {saving === 'feedback' ? 'Saving...' : 'Send feedback'}
          </button>
        }
      >
        <StarRating value={feedbackScore || 0} onChange={setFeedbackScore} />
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Comment</label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows="4"
            className="w-full bg-dark border border-dark-border rounded p-3 text-gray-100 focus:outline-none focus:border-primary"
            placeholder="Share your experience or suggestions..."
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default Preferences;
