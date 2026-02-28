const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function register(request, reply) {
    try {
        const { email, password, name, role } = request.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return reply.status(400).send({ error: 'Email already exists' });
        }
        
        // Create new user (password hashed automatically by pre-save hook)
        const user = await User.create({
            email,
            password,
            name,
            code,
            role
        });
        
        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        reply.send({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    } catch (error) {
        reply.status(500).send({ error: error.message });
    }
}