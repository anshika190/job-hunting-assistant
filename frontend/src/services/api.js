const BASE_URL = 'http://localhost:8080';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set headers
  const headers = { ...options.headers };
  
  // Add JWT Auth header if available
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // If body is not FormData, set Content-Type to JSON
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // If unauthorized, attempt token refresh
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        handleLogout();
        throw new Error('Unauthorized');
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokens(refreshToken)
          .then(newTokens => {
            isRefreshing = false;
            localStorage.setItem('accessToken', newTokens.accessToken);
            if (newTokens.refreshToken) {
              localStorage.setItem('refreshToken', newTokens.refreshToken);
            }
            onRefreshed(newTokens.accessToken);
          })
          .catch(err => {
            isRefreshing = false;
            handleLogout();
            throw err;
          });
      }

      // Return a promise that resolves when the token has been refreshed
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(fetch(url, fetchOptions).then(res => res.json()));
        });
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    // Try parsing as JSON, fallback to text/empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();

  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

async function refreshTokens(refreshToken) {
  const url = `${BASE_URL}/api/auth/refresh`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

function handleLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Dispatch custom event to notify useAuth hook
  window.dispatchEvent(new Event('auth-logout'));
}
