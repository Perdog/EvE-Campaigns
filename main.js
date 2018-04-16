var testData = [];

var allIDs = [];
var teamIDs = [];
var aIDs = [];
var bIDs = [];
var dates = [];

$(document).ready(function(){
	/*
	Check for url search
	If does not exist, load index page
	If it does, load view page
	Check for cache, if exists, load it.
	If load page has never been cached, begin fetching and parsing, show loading page because this could take a while. Once it's done, create a cache.
	*/
	
	// Check if we're trying to load some data or not.
	if (location.search) {
		console.log("Bueno: " + location.search);
		
		// If yes, parse the search
		var teamA = parseSearch("teamA");
		var teamB = parseSearch("teamB");
		var d = parseSearch("dates");
		dates = d.split("-");
		
		aIDs = teamA.split(",");
		bIDs = teamB.split(",");
		
		allIDs = aIDs.concat(bIDs);
		
		console.log("All IDs\n" + allIDs);
		
		$('#loading-page').show();
		getNextPage();
		
	} else {
		// If not, load normal page
		console.log("No bueno");
		$('@default-page').show();
	}
});

var allKills = [];
var waitingOn = 0;
var pageNumber = 0;
var keepSearching = false;
function getNextPage() {
	var howMany = Math.max(20/allIDs.length, 1);
	for (var h = 0; h < howMany; h++) {
		pageNumber++;
		var base = "https://zkillboard.com/api/kills/";
		var alli = "allianceID/";
		var corp = "corporationID/";
		var sTime = "/startTime/";
		var eTime = "/endTime/";
		var page = "/no-items/page/";
		var dontForgetThis = "/";
		
		for (var i = 0; i < allIDs.length; i++) {
			waitingOn++;
			var zurl = base + (allIDs[i][0] == "A" ? alli + allIDs[i].substring(1) : corp + allIDs[i].substring(1)) + sTime + dates[0] + eTime + dates[1] + page + pageNumber + dontForgetThis;
			console.log(zurl);
			
			var fetch = new XMLHttpRequest();
			fetch.onload = reqsuc;
			fetch.onerror = reqerror;
			fetch.open('get', zurl, true);
			fetch.send();
		}
	}
}

function reqsuc() {
	var data = JSON.parse(this.responseText);
	
	if (data.length > 0)
		keepSearching = true;
	
	// Lets do something with the data
	for (var i = 0; i < data.length; i++) {
		// First, we'll grab the victims corp and alliance IDs (We don't know if people only want one corp from an alliance so need to check both)
		var vAlli = "A";
		var vCorp = "C";
		if (data[i].victim.alliance_id)
			vAlli += data[i].victim.alliance_id;
		if (data[i].victim.corporation_id)
			vCorp += data[i].victim.corporation_id;
		// Then we make sure the victim is in our list of wanted IDs (Checking all of them since we don't know which fetch call this came from)
		if (allIDs.includes(vAlli) || allIDs.includes(vCorp)) {
			// If either true, we want to keep this data
			console.log("Keeping one");
			allKills.push(data[i]);
		}
	}
	// If this is the last fetch, build the webpage
	waitingOn--;
	if (waitingOn == 0)
		if (keepSearching) {
			keepSearching = false;
			getNextPage();
		}
		else
			allRequestsDone();
}

function reqerror(error) {
	console.log("Oh no! Something's wrong!\nPing Pedro on Discord and give his this error code:\n" + error);
}

function allRequestsDone() {
	console.log("Everything is done");
	
	pullStats();
}

// Stats stuff
var totalKills = [0,0];
var totalValues = [0,0];
var systems = [];

function pullStats() {
	allKills.sort(by('killmail_time'));
	console.log(allKills);
	
	for (var i = 0; i < allKills.length; i++) {
		// Used for the arrays. Defaulting to -1 for error catching
		var team = -1;
		// Is a kill for Team A
		if (isForTeam(1, allKills[i].victim))
			team = 0;
		// Is a kill for Team B
		else if (isForTeam(2, allKills[i].victim))
			team = 1;
		
		if (team >= 0) {
			// Track total kills
			totalKills[team] += 1;
			// Track total kill values
			totalValues[team] += allKills[i].zkb.totalValue;
			// Track kills per system per team
			if (!systems[team])
				systems[team] = {};
			if (!systems[team][allKills[i].solar_system_id])
				systems[team][allKills[i].solar_system_id] = 0;
			systems[team][allKills[i].solar_system_id] += 1;
			// Track kills per ship per team
				// Topkeks that's gonna be fun
			
		}
	}
	$('#TeamA').find('#kills').text(totalKills[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#kills').text(totalKills[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamA').find('#value').text(totalValues[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#value').text(totalValues[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	
	$('#campaign-page').show();
	
	
	console.log(totalKills);
	console.log(totalValues);
	console.log(systems);
}

function isForTeam(team, victim) {
	var found = false;
	// We do this backwards because we're checking victim, not attacker.
	var ids = (team == 1 ? bIDs : aIDs);
	
	if (victim.alliance_id) {
		if (ids.includes("A" + victim.alliance_id) || ids.includes("C" + victim.corporation_id))
			found = true;
	}
	else if (ids.includes("C" + victim.corporation_id))
		found = true;
	
	return found;
}

var by = function (path, reverse, primer, then) {
    var get = function (obj, path) {
        if (path) {
            path = path.split('.');
            for (var i = 0, len = path.length - 1; i < len; i++) {
                obj = obj[path[i]];
            };
            return obj[path[len]];
        }
        return obj;
    },
    prime = function (obj) {
        return primer ? primer(get(obj, path)) : get(obj, path);
    };
    
    return function (a, b) {
        var A = prime(a),
            B = prime(b);
        
        return (
            (A < B) ? -1 :
            (A > B) ?  1 :
            (typeof then === 'function') ? then(a, b) : 0
        ) * [1,-1][+!!reverse];
    };
};

function parseSearch(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}