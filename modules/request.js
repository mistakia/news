var domain = require('domain');
var cluster = require('cluster');
var config = require('../config');
var log = require('log')(config.log);

var request = require('requestretry');

request.Request.request.defaults({
    headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
    }
});

var $ = function(opts, cb) {
    opts.gzip = true;
    opts.maxAttempts = 3;

    var d = domain.create();

    d.on('error', function(err) {
	log.error(err);
	cluster.worker.disconnect();
    });

    d.run(function() {
	request(opts, cb);
    });

};

module.exports = $;
