const userService = require("./users.service");

async function getUsers(req, res) {

    try {

        const users = await userService.getAllUsers();

        res.json(users);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

}

async function getUser(req, res) {

    try {

        const user = await userService.getUserById(req.params.id);

        res.json(user);

    } catch (error) {

        res.status(404).json({
            error: error.message
        });

    }

}

module.exports = {
    getUsers,
    getUser
};