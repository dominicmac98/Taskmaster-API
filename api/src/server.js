// Legacy-style Express service (callbacks, var, no async/await)
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var _ = require('lodash');
var moment = require('moment');
var axios = require('axios');

var app = express();
app.use(bodyParser.json());

var SECRET = process.env.JWT_SECRET || 'change-me-lab-only';
var WORKER_URL = process.env.WORKER_URL || 'http://localhost:5000';

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/taskmaster');

var Task = mongoose.model('Task', new mongoose.Schema({
  title: String,
  owner: String,
  due: Date,
  meta: {},
  done: { type: Boolean, default: false }
}));

function auth(req, res, next) {
  var h = req.headers.authorization || '';
  jwt.verify(h.replace('Bearer ', ''), SECRET, function (err, user) {
    if (err) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  });
}

// Give the baseline spider a live entry point at the service root.
app.get('/', function (req, res) {
  res.redirect('/health');
});

app.get('/health', function (req, res) {
  res.json({ status: 'ok', time: moment().format() });
});

app.post('/login', function (req, res) {
  // TODO: replace stub with real user store
  var token = jwt.sign({ sub: req.body.user || 'demo' }, SECRET, { expiresIn: '7d' });
  res.json({ token: token });
});

app.get('/tasks', auth, function (req, res) {
  Task.find({ owner: req.user.sub }, function (err, tasks) {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

app.post('/tasks', auth, function (req, res) {
  var data = _.merge({ owner: req.user.sub }, req.body);
  Task.create(data, function (err, task) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(task);
  });
});

app.post('/tasks/:id/remind', auth, function (req, res) {
  axios.post(WORKER_URL + '/jobs', { task_id: req.params.id, user: req.user.sub })
    .then(function (r) { res.json(r.data); })
    .catch(function (e) { res.status(502).json({ error: e.message }); });
});

var port = process.env.PORT || 3000;
app.listen(port, function () { console.log('TaskMaster API on ' + port); });
