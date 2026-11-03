import axios from 'axios';

// Create an Axios instance with a configurable base URL
const axiosClient = axios.create({
  // Vite uses import.meta.env for environment variables
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// Add a request interceptor to attach the JWT token automatically
axiosClient.interceptors.request.use((config) => {
  // Retrieve the token from local storage (where it will be saved after login)
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosClient;