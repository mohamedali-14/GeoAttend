const authService = require("./auth.service");

async function createUser(req, res) {

    try {

        const creatorRole = req.user.role;

        if (creatorRole !== "ADMIN") {

            return res.status(403).json({
                error: "Only admins can create users"
            });

        }

        const user = await authService.createUser(req.body);

        res.status(201).json({
            message: "User created successfully",
            data: user
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

}

module.exports = {
    createUser
};