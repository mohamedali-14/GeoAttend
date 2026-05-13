export default function handler(req, res) {
    console.log('Request received:', req.method, req.url);
    
    if (req.url === '/health') {
        return res.status(200).json({ status: 'OK', message: 'API is working!' });
    }
    
    res.status(404).json({ error: 'Not found', url: req.url });
}
