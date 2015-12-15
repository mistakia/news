/* global require, module */

var social = require('../../modules/social');
var async = require('async');
var URI = require('URIjs');
var cheerio = require('cheerio');

var request = require('../../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?reddit.com\/r\/[^/\s]+\/?$/i,

    init: function(opts) {
	return {

	    type: 'reddit',

	    getTitle: function(html) {
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var ogTitle = $('meta[property="og:title"]').attr('content');
		if (ogTitle) return ogTitle;

		var title = $('title');
		return title.text() || null;
	    },

	    getLogo: function(html) {
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var url = $('#header-img').attr('src');

		return url || null;
	    },

	    build: function(source, cb) {
		var self = this;

		request({
		    uri: source.url
		}, function (error, response, body) {

		    if (error) {
			cb(error);
			return;
		    }

		    source.title = self.getTitle(body);
		    source.logo_url = self.getLogo(body);

		    cb();

		});
	    },

	    buildPost: function(entry, cb) {
		var self = this;
		social.all(entry.data.url,  function(err, result) {
		    cb(err, {
			title: entry.data.title,
			content_url: entry.data.url,
			score: entry.data.score || 1,
			social_score: result.total,
			url: new URI(entry.data.permalink).absoluteTo(self.url).toString()
		    });
		});
	    },

	    getPosts: function(source, cb) {
		var self = this;
		var options = {
		    uri: source.url + '.json',
		    headers: {
			'User-Agent': 'zer0.news bot by u/t3rr0r'
		    },
		    json: true
		};

		if (source.etag) options.headers['If-None-Match'] = source.etag;
		if (source.last_modified) options.headers['If-Modified-Since'] = source.last_modified;

		request(options, function (err, response, body) {

		    if (err) {
			source.posts = [];
			cb(err);
			return;
		    }

		    if (response.headers.etag) source.etag = response.headers.etag;
		    if (response.headers['last-modified']) source.last_modified = response.headers['last-modified'];

		    if (!body.data) {
			source.posts = [];
			source.fetch_failed = true;
			cb();
			return;
		    }

		    async.mapLimit(body.data.children, 3, self.buildPost.bind(self), function(err, results) {
			source.posts = results;
			cb(err);
		    });
		});
	    }
	};
    }
};
