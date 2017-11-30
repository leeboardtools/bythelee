var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public_html
//app.use(favicon(path.join(__dirname, 'public_html', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public_html')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


//
//-------------------------------------------------------------------
// My stuff...
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
    
    var debug_timing_count = 0;
    socket.on('debug-timing', function(data) {
        console.log('');
        var now = new Date();
        console.log('debug-timing(' + debug_timing_count + '):' + now.toTimeString());
        if (data.fps) {
            console.log('FPS:\t' + data.fps.toFixed(1));
        }
        Object.keys(data).forEach(function(key) {
            var record = data[key];
            if (key !== 'fps') {
                        console.log(key + ':\t' + record.maxMs.toFixed(2) + '\t' + record.frozenMs.toFixed(2) + '\t' + record.averageMs.toFixed(2) + '\t' + record.count);
            }
        });
        
        ++debug_timing_count;
    });
});

var os = require('os');
var interfaces = os.networkInterfaces();
var port = 3000;
var listeningMsg = 'Listening on ' + port;
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            listeningMsg = "Listening on " + address.address + ':' + port;
            break;
        }
    }
}

http.listen(port, function() {
    console.log(listeningMsg);
});

module.exports = app;
