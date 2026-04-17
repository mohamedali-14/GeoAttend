function validateEmail(email) {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function validatePhone(phone) {
    const regex = /^\+?[\d\s-]{10,}$/;
    return regex.test(phone);
}

function validateStudentId(id) {
    return id && id.length >= 5;
}

module.exports = { validateEmail, validatePassword, validatePhone, validateStudentId };