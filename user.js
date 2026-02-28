const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
     lastName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['DOCTOR', 'STUDENT'],
        required: true
    },
  
    studentID:{
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});


userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
    return {
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role,
        studentID: this.studentID
    };
}

module.exports = mongoose.model('User', userSchema);

