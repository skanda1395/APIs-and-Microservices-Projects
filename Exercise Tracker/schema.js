// Create Schema and Model

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let logSchema = new Schema({
  description: String,
  duration: Number,
  date: Date
});

let UserSchema = new Schema({
  _id: String,
  username: String,
  count: Number,
  log: [logSchema],
  count: {
    type: Number,
    default: 0
  }
});

const User = mongoose.model('user', UserSchema);

module.exports = { User, logSchema };

