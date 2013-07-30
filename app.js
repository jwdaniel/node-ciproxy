
var DBSERVER = '172.28.11.143',
    DBPORT = 27017;
var mongodb = require('mongodb'),
    mongodbserver = new mongodb.Server(DBSERVER, DBPORT,
                        {auto_reconnect: true, poolSize: 10});
var db = new mongodb.Db('fogbugz', mongodbserver, {safe: true});

var cfg = {
    bindport: 12345,
    mapfile: __dirname + '/ciproxy.cfg',
    logdir: 'log',
    caselog: 'log/case.log',
    pushlog: 'log/push.log',
    ciserver1: '172.28.11.141',
    ciport1: 8082,
    ciserver2: '172.28.11.142',
    ciport2: 8082,
    db: db,
    dbname: 'fogbugz',
};

var app = require('./lib/CIProxy');
db.open(function() {
    app.init(cfg);
    app.start()
});

/*
setTimeout(function() {
    console.log(app.version);
    app.maps();
}, 1000);
*/

