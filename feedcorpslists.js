const myVersion = "0.5.0", myProductName = "feedcorpslists";  

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const davehttp = require ("davehttp");
const opml = require ("opml");

var config = {
	port: process.env.PORT || 1424,
	urlServer: "https://lists.feedcorps.org/", //8/8/25 by DW
	dataFolder: "",
	userAgent: myProductName + "/" + myVersion,
	flPostEnabled: true,
	flAllowAccessFromAnywhere: true, 
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false, //davehttp does not try to catch the error
	feedCorpsLists: [ //8/8/25 by DW
		{
			opmlUrl: "https://feedland.social/opml?screenname=davewiner",
			title: "Dave's feeds",
			link: "https://news.scripting.com/",
			description: "All the feeds Dave follows in FeedLand.",
			fname: "daveallfeeds.opml",
			whenCreated: "16 Feb 2024 5:00:00 GMT",
			whenModified: "09 Aug 2025 12:33:39 GMT"
			},
		{
			opmlUrl: "https://feedland.social/opml?screenname=davewiner&catname=blogroll",
			title: "Dave's blogroll",
			link: "https://blogroll.social/",
			description: "All the feeds in the blogroll on scripting.com.",
			fname: "daveblogroll.opml",
			whenCreated: "16 Feb 2024 5:00:00 GMT",
			whenModified: "09 Aug 2025 12:33:39 GMT"
			},
		{
			opmlUrl: "https://feedland.social/opml?screenname=davewiner&catname=podcasts",
			title: "Dave's favorite podcasts",
			link: "https://news.scripting.com/?tab=podcasts",
			description: "Some of the podcasts Dave listens to (someday it'll be all of them).",
			fname: "davepodcasts.opml",
			whenCreated: "11 Jan 2001 5:00:00 GMT",
			whenModified: "09 Aug 2025 12:33:39 GMT"
			},
		]
	};
const fnameConfig = "config.json";

var stats = {
	ctHits: 0,
	whenLastHit: undefined,
	ctCacheReloads: 0,
	whenLastCacheReload: undefined,
	theOutline: undefined,
	outlineCache: new Object ()
	};
const fnameStats = "stats.json";
var flStatsChanged = false;

function netStandardDateString (theDate) { //8/8/25 by DW
	return (new Date (theDate).toUTCString ());
	}
function nowstring () {
	return (netStandardDateString (new Date ())); //8/8/25 by DW
	}
function notComment (item) { //8/21/22 by DW
	return (!utils.getBoolean (item.isComment));
	}
function statsChanged () {
	flStatsChanged = true;
	}
function writeStats () {
	const f = config.dataFolder + fnameStats;
	utils.sureFilePath (f, function () {
		fs.writeFile (f, utils.jsonStringify (stats), function (err) {
			});
		});
	}
function readConfig (f, config, callback) {
	fs.readFile (f, function (err, jsontext) {
		if (!err) {
			try {
				var jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					config [x] = jstruct [x];
					}
				}
			catch (err) {
				console.log ("Error reading " + f);
				}
			}
		callback ();
		});
	}
function httpRequest (url, callback) {
	request (url, function (err, response, data) {
		if (err) {
			callback (err);
			}
		else {
			var code = response.statusCode;
			if ((code < 200) || (code > 299)) {
				const message = "The request returned a status code of " + response.statusCode + ".";
				callback ({message});
				}
			else {
				callback (undefined, data) 
				}
			}
		});
	}

function getFeedCorpsUrl (item) { //8/8/25 by DW
	return (config.urlServer + item.fname);
	}
function getDirectoryOutline () { //8/8/25 by DW
	const now = new Date ();
	var theOutline = {
		opml: {
			head: {
				title: "All the reading lists currently available from lists.feedcorps.org."
				},
			body: {
				subs: [
					]
				}
			}
		};
	config.feedCorpsLists.forEach (function (item) {
		theOutline.opml.body.subs.push ({
			type: "include",
			url: getFeedCorpsUrl (item),
			text: item.title,
			description: item.description,
			whenCreated: netStandardDateString (item.whenCreated),
			whenModified: netStandardDateString (now),
			});
		});
	return (theOutline);
	}
function getDirectoryJson () { //8/8/25 by DW
	var theJsonArray = new Array ();
	config.feedCorpsLists.forEach (function (item) {
		var feedUrls = new Array ();
		const theOutline = stats.outlineCache [item.opmlUrl];
		theOutline.opml.body.subs.forEach (function (item) {
			feedUrls.push (item.xmlUrl);
			});
		theJsonArray.push ({
			opmlUrl: getFeedCorpsUrl (item),
			title: item.title,
			description: item.description,
			whenCreated: item.whenCreated,
			whenModified: item.whenModified,
			feedUrls
			});
		});
	return (theJsonArray);
	}
function loadOutlineCache (callback) { //8/8/25 by DW
	function getOutline (url, callback) {
		httpRequest (url, function (err, opmltext) {
			if (err) {
				callback (err);
				}
			else {
				opml.parse (opmltext, function (err, theOutline) {
					if (err) {
						callback (err);
						}
					else {
						stats.outlineCache [url] = theOutline;
						callback (undefined, theOutline);
						}
					});
				}
			});
		}
	function doNext (ix) {
		if (ix < config.feedCorpsLists.length) {
			getOutline (config.feedCorpsLists [ix].opmlUrl, function (err, theOutline) {
				doNext (ix + 1);
				});
			}
		else {
			statsChanged ();
			callback ();
			}
		}
	doNext (0);
	}
function reloadCaches (callback) { //8/8/25 by DW
	loadOutlineCache (function () {
		stats.ctCacheReloads++;
		stats.whenLastCacheReload = new Date ();
		statsChanged ();
		if (callback !== undefined) {
			callback ();
			}
		});
	}

function handleHttpRequest (theRequest) {
	var now = new Date ();
	const params = theRequest.params;
	function returnRedirect (url, code) { 
		var headers = {
			location: url
			};
		if (code === undefined) {
			code = 302;
			}
		theRequest.httpReturn (code, "text/plain", code + " REDIRECT", headers);
		}
		
	function returnPlainText (theString) {
		if (theString === undefined) {
			theString = "";
			}
		theRequest.httpReturn (200, "text/plain", theString);
		}
	function returnXml (xmltext) {
		theRequest.httpReturn (200, "text/xml", xmltext);
		}
	function returnNotFound () {
		theRequest.httpReturn (404, "text/plain", "Not found.");
		}
	function returnData (jstruct) {
		if (jstruct === undefined) {
			jstruct = {};
			}
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function returnJsontext (jsontext) { //9/14/22 by DW
		theRequest.httpReturn (200, "application/json", jsontext.toString ());
		}
	function returnError (jstruct) {
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	function returnOpmlFile (lowerpath) {
		const fname = utils.stringDelete (lowerpath, 1, 1);
		var theOutline = undefined;
		config.feedCorpsLists.forEach (function (item) {
			if (item.fname == fname) {
				theOutline = stats.outlineCache [item.opmlUrl];
				theOutline.opml.head.title = item.title;
				theOutline.opml.head.link = item.link;
				theOutline.opml.head.description = item.description;
				theOutline.opml.head.whenCreated = item.whenCreated;
				theOutline.opml.head.whenModified = item.whenModified;
				}
			});
		if (theOutline === undefined) {
			returnNotFound ();
			}
		else {
			returnXml (opml.stringify (theOutline))
			}
		}
	function httpReturn (err, returnedValue) {
		if (err) {
			returnError (err);
			}
		else {
			if (typeof returnedValue == "object") {
				returnData (returnedValue);
				}
			else {
				returnJsontext (returnedValue); //9/14/22 by DW
				}
			}
		}
	
	stats.ctHits++;
	stats.whenLastHit = now;
	statsChanged ();
	
	switch (theRequest.method) {
		case "GET":
			switch (theRequest.lowerpath) {
				case "/": 
					switch (utils.stringLower (params.format)) {
						case "json":
							returnData (getDirectoryJson ());
							break;
						default:
							returnXml (opml.stringify (getDirectoryOutline ()));
							break;
						}
					return (true);
				default: 
					returnOpmlFile (theRequest.lowerpath);
					break;
				}
			break;
		}
	}

function everyMinute () {
	var now = new Date ();
	if ((now.getMinutes () % 5) == 0) { //refresh caches every 5 minutes
		reloadCaches ();
		}
	}
function everySecond () {
	if (flStatsChanged) {
		flStatsChanged = false;
		writeStats ();
		}
	}


readConfig (fnameConfig, config, function (err) {
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
	console.log ("\nconfig == " + utils.jsonStringify (config));
	reloadCaches (function () {
		davehttp.start (config, handleHttpRequest);
		utils.runEveryMinute (everyMinute);
		setInterval (everySecond, 1000);
		});
	});



