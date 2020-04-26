'use strict';

var express = require('express');
var cors = require('cors');
var multer = require('multer');
var upload = multer();

// require and use "multer"...

var app = express();
var PORT = process.env.PORT || 8080;

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/hello', function (req, res) {
  res.json({ greetings: "Hello, API" });
});

// api for file metadata
app.post('/api/fileanalyse', upload.single("upfile"), function (req, res) {
  if (req.file != undefined) {
    res.json({ "name": req.file.originalname, "type": req.file.mimetype, "size": req.file.size });
  }
  else {
    res.end('Please upload a file.')
  }
});

app.listen(PORT, function () {
  console.log(`Node.js listening on port ${PORT} ...`);
});
