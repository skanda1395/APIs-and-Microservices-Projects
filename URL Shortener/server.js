'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var dns = require('dns');
var { nanoid } = require('nanoid');
var Url = require('./schema');
require('dotenv').config();

// allow access from cross-origin
var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

// allow cross-origin access for remote testing
app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});


// Connect to the database
mongoose.connect(process.env.DB_URI, { useUnifiedTopology: true, useNewUrlParser: true });
let db = mongoose.connection;

db.once('open', function () {
  console.log('Connected to the database.');
});

db.on('error', function (error) {
  console.log('Connection error:', error);
});



// handler for API POST requests
app.post('/api/shorturl/new', urlencodedParser, function(req, res) {
  // validate URL format
  let isMatch = /^(https?:\/\/)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#()?&//=]*)/.test(req.body.url);
  if (!isMatch) {
    res.json({ "error": "invalid URL" });
  }
  else {
    let url = new URL(req.body.url);
    dns.lookup(url.hostname, (err, address, family) => {
      if(err) {
        console.log('I got a bodee URL');
        res.end({ "error": "invalid Hostname" });
      }
      else {
        // serve short url
        Url.findOne({ url: req.body.url }).then(function(doc) {
          if (!doc) {
            let short_url = nanoid(4);
            let new_url = new Url({
              url: req.body.url,
              srt_url: short_url
            });

            new_url.save().then(function () {
              console.log('New URL saved.');
            });

            res.json({ "original_url": req.body.url, "short_url": short_url });
          }
          else {
            res.json({ "original_url": doc.url, "short_url": doc.srt_url });
          }
        });
      }
    });
  }
});



// handler for API GET requests
app.get('/api/shorturl/:id', function (req, res) {
  Url.findOne({ srt_url: req.params.id }).then(function (doc) {
    if (!doc) {
      res.json({ "error": "No short url found for given input" });
    }
    else {
      res.redirect(doc.url);
    }
  });
});


app.listen(port, function () {
  console.log(`Node.js listening on port ${port} ...`);
});
