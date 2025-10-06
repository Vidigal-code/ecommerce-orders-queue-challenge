import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export const apiService = {
    getOrders: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/orders`);
            return response.data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    },
    resetDatabase: async () => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/orders/reset`);
            return response.data;
        } catch (error) {
            console.error('Error resetting database:', error);
            throw error;
        }
    },
    startOrderProcessing: async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/orders/start`);
            return response.data;
        } catch (error) {
            console.error('Error starting order processing:', error);
            throw error;
        }
    }
};