const { auth, db } = require("../config/firebase");

async function authenticateUser(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                error: "No token provided"
            });

        }

        const token = authHeader.split("Bearer ")[1];

        const decoded = await auth.verifyIdToken(token);

        const userDoc = await db
            .collection("users")
            .doc(decoded.uid)
            .get();

        const userData = userDoc.exists ? userDoc.data() : {};

        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: userData.role || "STUDENT",
            ...userData
        };

        next();

    } catch (error) {

        res.status(401).json({
            error: "Invalid token"
        });

    }

}

function requireRole(...roles) {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({
                error: "Authentication required"
            });

        }

        if (!roles.includes(req.user.role)) {

            return res.status(403).json({
                error: "Access denied"
            });

        }

        next();

    };

}

module.exports = {
    authenticateUser,
    requireRole
};