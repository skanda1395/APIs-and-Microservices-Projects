const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const { nanoid } = require('nanoid');
const { User, logSchema } = require('./schema');
require('dotenv').config();

const cors = require('cors')

const mongoose = require('mongoose')

// Connect to the database
mongoose.connect(process.env.DB_URI, { useUnifiedTopology: true, useNewUrlParser: true });
let db = mongoose.connection;

db.once('open', function () {
  console.log('Connected to the database.');
});

db.on('error', function (error) {
  console.log('Connection error:', error);
});

app.use(cors())

let urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(urlencodedParser);
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});

// // Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


// user story 1
app.post('/api/exercise/new-user', urlencodedParser, function (req, res) {
  User.findOne({ username: req.body.username }).then(function (doc) {
    if (!doc) {
      let id = nanoid(10);
      let user = new User({ _id: id, username: req.body.username });
      user.save().then(function (doc) {
        res.json({ "username": doc.username, "_id": doc.id });
      });
    }
    else {
      res.end('username already taken');
    }
  })
});


// user story 2
app.get('/api/exercise/users', function (req, res) {
  User.find({}, { username: 1 }).then(function (docs) {
    res.json(docs);
  });
});


// user story 3
app.post('/api/exercise/add', urlencodedParser, function (req, res) {
  // validate data sent by user before adding to the db
  let userdata = req.body;
  User.findOne({ _id: userdata.userId }).then(function (doc) {
    if (!doc) {
      res.end('unknown _id');
    }
    else if (!userdata.description || !userdata.duration) {
      res.end(`Path ${!userdata.description ? `description` : `duration`} is required.`);
    }
    else if (!Number(userdata.duration)) {
      res.end(`Cast to Number failed for value "${userdata.duration}" at path "duration"`)
    }
    else if (userdata.date && (new Date(userdata.date).toUTCString() == "Invalid Date")) {
      res.end(`Cast to Date failed for value "${userdata.date}" at path "date"`);
    }
    else {
      // save userdata to the database
      let new_date = !userdata.date ? new Date() : new Date(userdata.date);
      let new_log = { description: userdata.description, duration: userdata.duration, date: new_date.toDateString() };
      User.findOneAndUpdate({ _id: doc._id }, { $push: { log: new_log }, $inc: { count: 1 } }).then(function () {
        // clean this update code later
        User.findOne({ _id: doc.id }).then(function (record) {
          let recent_log = record.log[record.count - 1];
          let user_obj = { "username": record.username, "description": recent_log.description, "duration": recent_log.duration, "_id": record._id, "date": recent_log.date.toDateString() }
          res.json(user_obj);
        });
      });
    }
  });
});


// user story 4 and 5
app.get('/api/exercise/log', function (req, res) {
  // get the data from the req query
  let userId = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = Number(req.query.limit);
  console.log(`userId: ${userId}, from: ${from}, to: ${to}, limit: ${limit}`);

  let pipeline = [
    {
      $match: {
        _id: userId
      }
    },
    {
      $project: {
        'log._id': 0,
        __v: 0
      }
    }
  ]

  let date_projection = {
    $project: {
      username: 1,
      from: from.toDateString(),
      to: to.toDateString(),
      log: {
        $filter: {
          input: "$log",
          as: "log",
          cond: {
            $and: [
              { $gte: ["$$log.date", from] },
              { $lte: ["$$log.date", to] }
            ]
          }
        }
      }
    }
  }

  let limit_projection = {
    $project: {
      username: 1,
      from: 1,
      to: 1,
      log: { $slice: ["$log", limit] }
    }
  }

  let log_size_projection = {
    $project: {
      username: 1,
      from: 1,
      to: 1,
      log: 1,
      count: { $size: "$log" }
    }
  }

  // validating req params before querying db
  if (from != "Invalid Date" && to != "Invalid Date") {
    console.log('adding date projection to pipeline');
    pipeline.push(date_projection);
  }

  if (Number(limit)) {
    console.log('adding limit projection to pipeline');
    pipeline.push(limit_projection);
  }

  // add projection to count log size after all filters
  pipeline.push(log_size_projection);
  console.log(pipeline);

  User.aggregate(pipeline).then(function (doc) {
    if (doc) {
      console.log(doc[0]);
      res.json(doc[0]);
    }
    else {
      res.end('unknown userId');
    }
  });

});


const listener = app.listen(process.env.PORT || 8080, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})