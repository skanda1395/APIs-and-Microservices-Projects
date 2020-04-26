// Create Schema and Model

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let UrlSchema = new Schema({
  srt_url: String,
  url: String
});

const Url = mongoose.model('url', UrlSchema);

module.exports = Url;

