(function() {
    var util = require('util'),
        net = require('net'),
        http = require('http'),
        url = require('url'),
        qs = require('querystring'),
        fs = require('fs');

    var CIProxy = (function() {
        var fs = require('fs')
            // , version = require(require('path').resolve(__dirname + '/../', 'package.json')).version
            , version = "0.1.0"
            , config
            , maps;

        var _read_mapfile = function() {
            try {
                var data = fs.readFileSync(config.mapfile, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                console.log('load err: ' + err);
                return new Object();
            }
        };

        var _process = function(method, requrl, data) {
            if (method == 'POST') {
                //  Kiln Web Hooks
                var postobj = qs.parse(data);
                _dolog('push', postobj);
                _proxy(postobj);
            } else {
                // URL Trigger by Case Event
                var urlobj = url.parse(requrl);
                _dolog('case', qs.parse(urlobj.query));
            }
        };

        var _format = function(val) {
            if (val < 10) {
                return '0' + val;
            } else {
                return val;
            }
        };

        var _getLocaltime = function() {
            var now = new Date();
            var datestr = now.getFullYear() + '.' + _format(now.getMonth()+1) + '.' + _format(now.getDate());
            var timestr = _format(now.getHours()) + ':' + _format(now.getMinutes()) + ':' + _format(now.getSeconds());
            return { datestr: datestr, timestr: timestr };
        };

        var _dolog = function(type, obj) {
            if (type == 'case') {
                var lognameprefix = config.caselog;
            } else {
                var lognameprefix = config.pushlog;
            }
            var now = _getLocaltime();
            var log = fs.createWriteStream(lognameprefix + '.' + now.datestr,
                      {'flags': 'a', 'encoding': 'utf8', 'mode': 0666});
            log.write(now.datestr + ' ' + now.timestr + ' ' + JSON.stringify(obj) + '\n');
            log.end();

            var db = config.db;
            if (db) {
                db.collection(type, function(err, collection) {
                    collection.insert({ts: now.datestr + ' ' + now.timestr, event: obj}, {safe:true}, function(err, obj) {
                        if (err) console.log('insert err: ' + err);
                    });
                    //db.close();
                });
            }
        };

        var _proxy = function(postobj) {
            var obj = JSON.parse(postobj.payload);
            var url = decodeURIComponent(obj.repository.url);
            var reponame = decodeURIComponent(obj.repository.name);
            if (r = url.match(/fogbugz\/kiln\/Code(.*)/)) {
                var tagparam = '';
                for (i in obj.commits) {
                    if (rr = obj.commits[i].message.match(/Added tag (.*) for changeset /)) {
                        tagparam = '&NEWTAG=' + encodeURIComponent(rr[1]);
                    } else if (rr = obj.commits[i].message.match(/增加(.*)標籤給.*變更集/)) {
                        tagparam = '&NEWTAG=' + encodeURIComponent(rr[1]);
                    }
                }
                var uri = '';
                if (r[1] in maps) {
                    uri = '/job/' + maps[r[1]] + '/buildWithParameters?token=aaa&cause=ciproxy' + tagparam;
                } else {
                    uri = '/job/' + encodeURIComponent(reponame) + '/buildWithParameters?token=aaa&cause=ciproxy' + tagparam;
                }
                var now = _getLocaltime();
                console.log(now.datestr + ' ' + now.timestr + ' Trigger http://172.28.11.142:8082' + uri);
                _triggerCI(uri);
            }
        };

        var _triggerCI = function(uri) {
            var ciserver = config.ciserver2;
            var ciport = config.ciport2;

            var client = new net.Socket();
            client.connect(ciport, ciserver, function() {
                client.write('GET ' + uri + ' HTTP/1.1\r\n');
                client.write('Content-Type: application/x-www-form-urlencoded\r\n');
                // kiln:kiln123
                client.write('Authorization: Basic a2lsbjpraWxuMTIz\r\n');
                client.write('Host: ' + ciserver + ':' + ciport + '\r\n');
                client.write('Connection: Close\r\n\r\n');
            });
            client.on('data', function(data) {
                client.end();
            });
        }

        var init = function(cfg) {
            config = cfg;
            maps = _read_mapfile();
        };

        var start = function() {
            var port = config.bindport;
            http.createServer(function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    _process(req.method, req.url, data);
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end();
                });
            }).on('listening', function(e) {
                console.log('Server running on port ' + port);
            }).on('error', function(e) {
                console.log(e);
            }).listen(port);
        };

        var maps = function() {
            console.log(maps);
        };

        return {
            version: version
            , maps: maps
            , init: init
            , start: start
        };
    })();

    module.exports = CIProxy;

})();
