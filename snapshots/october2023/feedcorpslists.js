const myVersion = "0.4.1", myProductName = "feedcorpslists";  

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const davehttp = require ("davehttp");
const opml = require ("opml");
const davegithub = require ("davegithub");

var config = {
	port: process.env.PORT || 1424,
	urlRepoFolder: "https://raw.githubusercontent.com/scripting/a8c-FeedLand-Support/main/", 
	nameListsFolder: "lists/",
	dataFolder: "",
	userAgent: myProductName + "/" + myVersion,
	flPostEnabled: true,
	flAllowAccessFromAnywhere: true, 
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false //davehttp does not try to catch the error
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
function getDirectory (callback) {
	davegithub.getDirectory (config.github, config.nameListsFolder, function (err, jstruct) {
		if (err) {
			callback (err);
			}
		else {
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
			jstruct.forEach (function (item) {
				if (utils.endsWith (item.name, ".opml")) {
					theOutline.opml.body.subs.push ({
						text: item.name,
						type: "include",
						url: "https://lists.feedcorps.org/" + item.name
						});
					}
				});
			
			stats.theOutline = theOutline;
			statsChanged ();
			
			callback (undefined, theOutline);
			}
		});
	}
function getOutline (fname, callback) {
	const url = config.urlRepoFolder + config.nameListsFolder + fname + "?nocache=" + utils.random (1, 100000);
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
					stats.outlineCache [fname] = theOutline;
					callback (undefined, theOutline);
					}
				});
			}
		});
	}

function loadOutlineCache (callback) {
	const outlinelist = stats.theOutline.opml.body.subs;
	function doNext (ix) {
		if (ix < outlinelist.length) {
			getOutline (outlinelist [ix].text, function (err, theOutline) {
				stats.outlineCache [outlinelist [ix].text] = theOutline;
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
function reloadCaches (callback) {
	getDirectory (function () {
		loadOutlineCache (function () {
			stats.ctCacheReloads++;
			stats.whenLastCacheReload = new Date ();
			statsChanged ();
			if (callback !== undefined) {
				callback ();
				}
			});
		});
	}

function outlineToReadinglistJson (theOutline) {
	const subslist = theOutline.opml.body.subs;
	var feedlistArray = new Array ();
	
	function pushFeedOnFeedListArray (item) {
		const outlineInCache = stats.outlineCache [item.text];
		const outlineHead = outlineInCache.opml.head;
		var feedUrls = new Array ();
		opml.visitAll (outlineInCache, function (node) {
			if (notComment (node)) {
				if (node.type == "rss") {
					if (node.xmlUrl !== undefined) {
						feedUrls.push (node.xmlUrl);
						}
					}
				}
			return (true); //keep visiting
			});
		feedlistArray.push ({
			opmlUrl: item.url,
			title: outlineHead.title,
			description: outlineHead.description,
			whenCreated: outlineHead.dateCreated,
			whenModified: outlineHead.dateModified,
			ctChecks: undefined,
			feedUrls
			});
		}
	
	opml.visitAll (theOutline, function (node) {
		if (notComment (node)) {
			pushFeedOnFeedListArray (node);
			}
		return (true); //keep visiting
		});
	
	
	
	return (feedlistArray);
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
	function returnOpmlFile (fname) {
		getOutline (fname, function (err, theOutline) {
			if (err) {
				returnError (err);
				}
			else {
				theRequest.httpReturn (200, "text/xml", opml.stringify (theOutline));
				}
			});
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
					getDirectory (function (err, theOutline) {
						if (err) {
							returnError (err);
							}
						else {
							switch (utils.stringLower (params.format)) {
								case "json":
									returnData (outlineToReadinglistJson (theOutline));
									break;
								default:
									returnXml (opml.stringify (theOutline));
									break;
								}
							}
						});
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
function readConfig (fname, data, callback) {
	fs.readFile (fname, function (err, jsontext) {
		if (!err) {
			var jstruct;
			try {
				jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					data [x] = jstruct [x];
					}
				}
			catch (err) {
				console.log ("readConfig: fname == " + fname + ", err.message == " + utils.jsonStringify (err.message));
				}
			}
		callback ();
		});
	}

readConfig (fnameConfig, config, function (err) {
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
	console.log ("\nconfig == " + utils.jsonStringify (config));
	config.github.userAgent = config.userAgent;
	reloadCaches (function () { //causes current directory to be cached
		davehttp.start (config, handleHttpRequest);
		utils.runEveryMinute (everyMinute);
		setInterval (everySecond, 1000);
		});
	});
