require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(cors()).use(express.static('public')).use(bodyParser.urlencoded({ extended: false }))

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
})
const userSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [exerciseSchema]
})
const user = mongoose.model('User', userSchema)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  user.find({}, { username: 1 }, (err, data) => {
    if (err) res.json(err)
    res.json(data)
  })
})

app.post('/api/users', (req, res) => {
  const username = req.body.username
  user.findOne({ username: username }, (err, data) => {
    if (err) res.json(err)
    if (!data) {
      const newUser = new user({
        username: req.body.username,
        count: 0,
        log: []
      })
      newUser.save((err, data) => {
        if (err) res.json({ error: err })
        res.json({
          username: data.username,
          _id: data._id
        })
      })
    } else {
      res.json({
        username: data.username,
        _id: data._id
      })
    }
  })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  const exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date === '' ? new Date() : new Date(req.body.date)
  }
  const userId = req.params._id
  user.findOneAndUpdate({ _id: userId }, { $push: { log: exercise }, $inc: { count: 1 } }, { new: true }, (err, data) => {
    if (err) res.json(err)
    if (data) {
      const lastElement = data.log[data.count - 1]
      res.json({
        _id: data._id,
        username: data.username,
        date: lastElement.date.toDateString(),
        duration: lastElement.duration,
        description: lastElement.description
      })
    }
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id
  const from = req.query.from
  const to = req.query.to
  const limit = req.query.limit

  user.find({ _id: userId }, { 'log._id': 0 }, (err, data) => {
    if (err) res.json(err)
    if (data.length != 0) {
      const tempLog = []
      data[0].log.forEach(element => {
        const temp = {
          description: element.description,
          duration: element.duration,
          date: element.date.toDateString()
        }
        if (from && to) {
          if (element.date >= new Date(from) && element.date <= new Date(to)) {
            tempLog.push(temp)
          }
        } else if (from) {
          if (element.date >= new Date(from)) {
            tempLog.push(temp)
          }
        } else if (to) {
          if (element.date <= new Date(to)) {
            tempLog.push(temp)
          }
        } else {
          tempLog.push(temp)
        }
      });
      const logs = {
        _id: data[0]._id,
        username: data[0].username,
        count: data[0].count,
        log: limit ? tempLog.slice(0, limit) : tempLog
      }
      res.json(logs)
    } else {
      res.send('Unknown userId')
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
