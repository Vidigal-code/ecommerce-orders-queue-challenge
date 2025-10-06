import { useEffect, useState } from 'react';
import { fetchOrderMetrics } from '../services/api.service';

const useOrderMetrics = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getMetrics = async () => {
            try {
                const data = await fetchOrderMetrics();
                setMetrics(data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        getMetrics();
    }, []);

    return { metrics, loading, error };
};

export default useOrderMetrics;