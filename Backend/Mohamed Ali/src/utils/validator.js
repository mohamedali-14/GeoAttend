function validateEmail(email) {

    const regex = /\S+@\S+\.\S+/;

    return regex.test(email);

}

function validatePassword(password) {

    return password.length >= 6;

}

module.exports = {
    validateEmail,
    validatePassword
};