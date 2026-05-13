const usersService = require("./users.service");

async function getUsers(req, res) {
    try {
        const users = await usersService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getUser(req, res) {
    try {
        const user = await usersService.getUserById(req.params.id);
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
}

module.exports = { getUsers, getUser };