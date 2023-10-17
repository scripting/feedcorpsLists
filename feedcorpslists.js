const myVersion = "0.4.0", myProductName = "feedcorpslists";  

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
	userAgent: myProductName + "/" + myVersion,
	flPostEnabled: true,
	flAllowAccessFromAnywhere: true, 
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false //davehttp does not try to catch the error
	};

var stats = {
	ctHits: 0,
	whenLastHit: undefined
	};
const fnameStats = "stats.json";
var flStatsChanged = false;

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
		const url = config.urlRepoFolder + config.nameListsFolder + fname;
		httpRequest (url, function (err, opmltext) {
			if (err) {
				returnError (err);
				}
			else {
				theRequest.httpReturn (200, "text/xml", opmltext);
				}
			});
		}
	function returnListOfLists () {
		davegithub.getDirectory (config.github, config.nameListsFolder, function (err, jstruct) {
			if (err) {
				returnError (err);
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
					theOutline.opml.body.subs.push ({
						text: item.name,
						type: "include",
						url: "https://lists.feedcorps.org/" + item.name
						});
					});
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
					returnListOfLists ();
					return (true);
				default: 
					returnOpmlFile (theRequest.lowerpath);
					break;
				}
			break;
		}
	}

function everyMinute () {
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

readConfig ("config.json", config, function (err) {
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
	console.log ("\nconfig == " + utils.jsonStringify (config));
	config.github.userAgent = config.userAgent;
	utils.runEveryMinute (everyMinute);
	setInterval (everySecond, 1000);
	davehttp.start (config, handleHttpRequest);
	});
