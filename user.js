const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { type } = require('os');
const { code } = require('statuses');

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
    firstname: {
        type: String,
        required: true
    },
     lastname: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['DOCTOR', 'STUDENT'],
        required: true
    },
    code:{
        type: Number,
        required:true, 
        unique: true
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

module.exports = mongoose.model('User', userSchema);