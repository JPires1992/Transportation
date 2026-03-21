import api from './api';

export const fetchNotificationPreferences = () => api.get('/users/me/preferences/notification');
export const saveNotificationPreferences = (data) =>
  api.post('/users/me/preferences/notification', data);

export const fetchFavorites = () => api.get('/users/me/favorites');
export const saveFavorites = (data) => api.post('/users/me/favorites', data);

export const fetchFeedback = () => api.get('/users/me/feedback');
export const saveFeedback = (data) => api.post('/users/me/feedback', data);

export const fetchLineIds = () => api.get('/lines/all/ids');
export const fetchStopIds = () => api.get('/stops/all/ids');

export const fetchNotifications = (userId) => api.get(`/notifications/${userId}`);
