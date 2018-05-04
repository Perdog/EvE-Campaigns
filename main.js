// Default page stuff
var namesList = [];

// Search query stuff
var allIDs = {};
var aIDs = [];
var bIDs = [];
var dates = [];

// Kills stuff
var allKills = [];
var doneFetching = {};
var waitingOn = 0;
var pageNumber = 0;
var keepSearching = false;

// Stats stuff
var totalKills = [0,0];
var totalValues = [0,0];
var systems = [];
var systemKills = {};
var mailIDs = [];
var timer = 0;

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
		
		$('#loading-page').show(500);
		
		// TODO Check for cache here, if cache exists skip all the fetching.
		getNames(aIDs.concat(bIDs));
		
	} else {
		// If not, load normal page
		console.log("No bueno");
		$('#default-page').show();
		var date = new Date();
		$('#endDate').attr("max", date.getFullYear() + "-" + (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate());
	}
});

$('#campaign-form').submit(function(e) {
	e.preventDefault();
	$('#createCampaign').attr("disabled", "disabled");
	
	resetAllTheThings();
	
	var names = document.getElementsByClassName("searchbox");
	
	for (var i = 0; i < names.length; i++) {
		if (names[i].value.length > 0)
			namesList.push(names[i].value);
	}
	
	var url = "https://esi.tech.ccp.is/latest/universe/ids/?datasource=tranquility";
	var fetch = new XMLHttpRequest();
	fetch.onload = checkNames;
	fetch.onerror = nameError;
	fetch.open('post', url, true);
	fetch.setRequestHeader('Content-Type','application/json');
	fetch.setRequestHeader('accept','application/json');
	fetch.send(JSON.stringify(namesList));
	
	return false;
});

function resetAllTheThings() {
	namesList = [];
	allIDs = {};
	aIDs = [];
	bIDs = [];
	dates = [];
}

function checkNames() {
	var data = JSON.parse(this.responseText);
	var betterList = {};
	
	console.log(data);
	
	if (data.error) {
		esiError(data.error);
	} else {
		var newData = Object.values(data);
		var fail = false;
		
		for (var h = 0; h < newData.length; h++) {
			for (var i = 0; i < newData[h].length; i++) {
				betterList[newData[h][i].name.toLowerCase()] = newData[h][i].id;
			}
		}
		console.log(betterList);
		
		var listKeys = Object.keys(betterList);
		for (var j = 0; j < 2; j++) {
			var team = (j == 0 ? "A" : "B");
			var elems = document.getElementsByClassName(team);
			
			for (var k = 0; k < elems.length; k++) {
				if (elems[k].value.length > 0) {
					if (listKeys.includes(elems[k].value.toLowerCase())) {
						console.log("Found");
						if (team == "A")
							aIDs.push(betterList[elems[k].value.toLowerCase()]);
						else
							bIDs.push(betterList[elems[k].value.toLowerCase()]);
					} else {
						console.log("Not found: " + elems[k].value.toLowerCase());
						alert("Could not find the entity \"" + elems[k].value + "\"\nDouble check that you've spelt the name correctly.");
						elems[k].style.backgroundColor = "red";
						$('#createCampaign').removeAttr("disabled");
						fail = true;
					}
				}
			}
		}
		
		if (!fail) {
			$('#createCampaign').removeAttr("disabled");
			location.search = "teamA=" + aIDs.toString() + "&teamB=" + bIDs.toString() + "&dates=" + document.getElementById("startDate").value.replace(/-/g,"") + "0000-" + document.getElementById("endDate").value.replace(/-/g,"") + "2300";
		}
	}
}

function nameError(error) {
	$('#createCampaign').removeAttr("disabled");
	console.log("Error while getting IDs: " + error);
	alert("Something went wrong when looking up name IDs: \n" + error);
}

function getNames(list) {
	$("#load-text").text("Attempting to load team names...");
	
	timer = Date.now();
	
	var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
	var fetch = new XMLHttpRequest();
	fetch.onload = parseTeamNames;
	fetch.onerror = reqerror;
	fetch.open('post', url, true);
	fetch.setRequestHeader('Content-Type','application/json');
	fetch.setRequestHeader('accept','application/json');
	fetch.send(JSON.stringify(list));
}

function parseTeamNames() {
	var data = JSON.parse(this.responseText);
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Failed to load team names...");
	} else {
		$("#load-text").text("Names found...");
		for (var i = 0; i < data.length; i++) {
			var temp = {};
			temp.name = data[i].name;
			temp.type = data[i].category;
			allIDs[data[i].id] = temp;
		}
		
		getNextPage();
	}
}

function getNextPage() {
	console.log("Trying to fetch kills");
	$("#load-text").text("Fetching some killmails...");
	
	var idLength = Object.keys(allIDs).length;
	var subt = idLength - (totalFinished()/2);
	var howMany = (subt > 0) ? Math.round(Math.max(20/subt, 1)) : 0;
	maxWait = 0;
	
	if (howMany == 0) {
		$("#load-text").text("All possible kills found...");
		doneFetchingKills();
	}
	
	console.log("Loading " + howMany + " pages in this loop, because " + totalFinished() + "/" + idLength + " are done");
	for (var h = 0; h < howMany; h++) {
		pageNumber++;
		console.log("Fetching page " + pageNumber);
		var base = "https://zkillboard.com/api/kills/";
		var alli = "allianceID/";
		var corp = "corporationID/";
		var sTime = "/startTime/";
		var eTime = "/endTime/";
		var page = "/no-items/page/";
		var dontForgetThis = "/";
		
		for (var i = 0; i < idLength; i++) {
			var id = Object.keys(allIDs)[i];
		
			if (!doneFetching.hasOwnProperty(id)) {
				doneFetching[id] = {};
				doneFetching[id].checked = 0;
				doneFetching[id].keepGoing = true;
				doneFetching[id].max = howMany;
			}
			
			if (!doneFetching[id].keepGoing) {
				//console.log("Not bothering to fetch kills for " + id);
				continue;
			}
			
			waitingOn++;
			maxWait++;
			if (h === 0)
				doneFetching[id].checked = 0;
			
			var zurl = base + allIDs[id].type + "ID/" + id + sTime + dates[0] + eTime + dates[1] + page + pageNumber + dontForgetThis;
			var fetch = new XMLHttpRequest();
			fetch.onload = reqsuc;
			fetch.onerror = reqerror;
			fetch.open('get', zurl, true);
			//fetch.setRequestHeader('Accept-Encoding','gzip');
			//fetch.setRequestHeader('Requester-Info','EvE Campaigns --- Maintainer: Pedro Athonille @ jacob_perry@hotmail.ca');
			fetch.send();
		}
	}
	
	$('#load-progress').attr("value", 0);
}

var maxWait = 0;
function reqsuc() {
	var data = JSON.parse(this.responseText);
	var id = this.responseURL;
	id = id.substring(id.indexOf("ID/")+3);
	id = id.substring(0, id.indexOf("/"));
	
	// If the page contains data, we want to keep our requests going, if not, we want to add the ID from this fetch to the ignore list
	if (data.length > 1 && !keepSearching)
		keepSearching = true;
	else if (data.length < 1) {
		doneFetching[id].checked++;
		
		if (doneFetching[id].checked == doneFetching[id].max) {
			doneFetching[id].keepGoing = false;
		}
	}
	
	$("#load-text").text("Parsing kill data...");
	
	// Lets do something with the data
	for (var i = 0; i < data.length; i++) {
		var victim = data[i].victim;
		// Used for the arrays. Defaulting to -1 for error catching. Should never see it, but juuuuuust in case.
		var team = getTeam(victim);
		
		// Make sure the victim is in our list of wanted IDs (Checking all of them since we don't know which fetch call this came from)
		if (Object.keys(allIDs).includes(victim.alliance_id + "") || Object.keys(allIDs).includes(victim.corporation_id + "") || Object.keys(allIDs).includes(victim.character_id + "")) {
			
			// We don't want awox kills to be counted they throw off the totals.
			if (data[i].zkb.awox) {
				//console.log("Don't keep, awox");
				continue;
			}
			// We also need to ignore "whored" kills
			// TODO ... BALLS. The logic here needs to be changed. Just because someone whored doesn't mean the kill *needs* to be ignored, only needs to be ignored it that's the *only* reason a kill is showing up
			else {
				var hasWhore = false;
				var whoreOnly = true;
				var useIDs = (team == 0 ? aIDs : bIDs);
				for (var j = 0; j < data[i].attackers.length; j++) {
					if (data[i].attackers[j].corporation_id == victim.corporation_id || data[i].attackers[j].alliance_id == victim.alliance_id) {
						hasWhore = true;
					} else if (Object.keys(useIDs).includes(data[i].attackers[j].corporation_id) || Object.keys(useIDs).includes(data[i].attackers[j].alliance_id) || Object.keys(useIDs).includes(data[i].attackers[j].character_id)) {
						whoreOnly = false;
					}
					
				}
				if (hasWhore && whoreOnly) {
					//console.log("Just a whore, please ignore");
					continue;
				}
			}
			
			// If either true, we want to keep this data
			//console.log("Keeping one");
			if (!mailIDs.includes(data[i].killmail_id)) {
				allKills.push(data[i]);
				mailIDs.push(data[i].killmail_id);
			
				// STATS COLLECTION
				if (team >= 0) {
					// Track total kills
					totalKills[team] += 1;
					
					// Track total kill values
					totalValues[team] += data[i].zkb.totalValue;
					
					// Track kills per ship per team
						// Topkeks that's gonna be fun
					
					// Track kills per system per team
					// OLD system tracking
					var sysID = data[i].solar_system_id;
					if (!systems[team])
						systems[team] = {};
					if (!systems[team][sysID]) {
						systems[team][sysID] = {};
						systems[team][sysID].kills = 0;
					}
					systems[team][sysID].kills += 1;
					
					// REVAMPED system tracking
					if (!systemKills.hasOwnProperty(sysID))
						systemKills[sysID] = {};
					if (team == 0)
						(systemKills[sysID].hasOwnProperty("a")) ? systemKills[sysID].a++ : systemKills[sysID].a = 1;
					if (team == 1)
						(systemKills[sysID].hasOwnProperty("b")) ? systemKills[sysID].b++ : systemKills[sysID].b = 1;
				}
			}
		}
	}
	
	// If this is the last fetch, and there was no data on the page, build the webpage
	waitingOn--;
		
	var tempInt = 100 - ((waitingOn/maxWait)*100);
	$('#load-progress').attr("value", tempInt);
	
	if (waitingOn == 0)
		if (keepSearching) {
			keepSearching = false;
			$("#load-text").text("Done parsing this page, next...");
			setTimeout(getNextPage,1000);
		} else {
			$("#load-text").text("All possible kills found...");
			doneFetchingKills();
		}
}

function reqerror(error) {
	console.log("Oh no! Something's wrong!\n" + error);
	$("#load-text").text("Something bad happened somewhere...\n" + error);
}

function doneFetchingKills() {
	console.log("Kill fetch is done");
	// TODO cache this request here
	
	// Sort kills by date
	allKills.sort(by('killmail_time'));
	
	// Check if there are any kills
	if (allKills.length > 0) {
		// Do system name lookups
		loadSystemNames();
	} else {
		$("#load-static").text("No kills were found for this campaign. Git gud.");
		$("#load-text").text("");
		pullStats();
	}
}

function loadSystemNames() {
	console.log("Fetching system names");
	$("#load-text").text("Loading system names...");
	
	var list = [];
	
	/* REVAMPED system ID compiler
	if (systemKills) {
		Object.keys(systemKills).forEach(function(key) {
			if (!list.includes(key))
				list.push(key);
		});
	}
	*/
	
	// OLD system ID compiler
	for (var i = 0; i < systems.length; i++) {
		if (systems[i]) {
			Object.keys(systems[i]).forEach(function(key) {
				if (!list.includes(key))
					list.push(key);
			});
		}
	}
	
	var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
	var fetch = new XMLHttpRequest();
	fetch.onload = parseSystems;
	fetch.onerror = reqerror;
	fetch.open('post', url, true);
	fetch.setRequestHeader('Content-Type','application/json');
	fetch.setRequestHeader('accept','application/json');
	fetch.send(JSON.stringify(list));
}

function parseSystems() {
	var data = JSON.parse(this.responseText);
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Error loading system names...");
	} else {
		data.forEach(function(key) {
			// OLD system name fetcher
			for (var i = 0; i < systems.length; i++) {
				if (systems[i]) {
					if (Object.keys(systems[i]).includes(key.id+"")) {
						systems[i][key.id+""].name = key.name;
					}
				}
			}
			// REVAMPED system name fetcher
			if (systemKills) {
				if (Object.keys(systemKills).includes(key.id+"")) {
					systemKills[key.id+""].name = key.name;
				}
			}
		});
		
		$("#load-text").text("System names loaded...");
		console.log("Name fetch is done");
		pullStats();
	}
}

function pullStats() {
	$("#load-text").text("Parsing all this info...");
	console.log("Loading everything onto the page");
	
	// TODO At some point, add something to actually display kills
	//for (var i = 0; i < allKills.length; i++) {}
	
	// Header things
	var finalTime = Date.now() - timer;
	$('#when').text("Campaign between the dates of " + (dates[0].slice(0,4)+"-"+dates[0].slice(4,6)+"-"+dates[0].slice(6,8)) + " and " + (dates[1].slice(0,4)+"-"+dates[1].slice(4,6)+"-"+dates[1].slice(6,8)));
	$('#load-time').text("It took " + parseTimer(finalTime) + " to load this request.");
	
	// Set names. We loop through allIDs and compare it to the teamIDs, attaching them to the appropriate string.
	var aTeamNames = "";
	var bTeamNames = "";
	Object.keys(allIDs).forEach(function(key) {
		if (aIDs.includes(key))
			aTeamNames += allIDs[key].name + "\n";
		else if (bIDs.includes(key))
			bTeamNames += allIDs[key].name + "\n";
	});
	$('#TeamA').find('#names').text(aTeamNames);
	$('#TeamB').find('#names').text(bTeamNames);
	
	// Replace kill count
	$('#TeamA').find('#kills').text(totalKills[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#kills').text(totalKills[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	// Replace isk values
	$('#TeamA').find('#value').text(totalValues[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#value').text(totalValues[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	// Set system names
	var aTeamSystems = "<tr><th style=\"text-align:center\">System name</th><th style=\"text-align:center\">Kills</th></tr>";
	var bTeamSystems = aTeamSystems;
	for (var i = 0; i < systems.length; i++) {
		if (systems[i]) {
			Object.values(systems[i]).forEach(function(v) {
				if (i == 0)
					aTeamSystems += "<tr><td>" + v.name + "</td><td>" + v.kills.toLocaleString(undefined, {maximumFractionDigits:2}) + "</td></tr>";
				else
					bTeamSystems += "<tr><td>" + v.name + "</td><td>" + v.kills.toLocaleString(undefined, {maximumFractionDigits:2}) + "</td></tr>";
			});
		}
	}
	//$('#TeamA').find('#systems').append(aTeamSystems);
	//$('#TeamB').find('#systems').append(bTeamSystems);
	
	// Revamp system stuff
	var systemKillTable = "<tr><th style=\"text-align:center\">Team A Kills</th><th style=\"text-align:center\">System name</th><th style=\"text-align:center\">Team B Kills</th></tr>";
	Object.values(systemKills).forEach(function(v) {
		systemKillTable += "<tr><td>" + ((v.a) ? v.a : "---") + "</td><td>" + v.name + "</td><td>" + ((v.b) ? v.b : "---") + "</td></tr>";
	});
	$('#systemKills').append(systemKillTable);
	
	sortTables();
	sortTable2();
	console.log("Done");
	setTimeout(function() {
		$("#load-text").text("Ready to go");
		$('#loading-page').hide(2000);
		$('#campaign-page').show(2000);
	}, 1000);
}

function dateChange(elem, target, attribute) {
	$(target).attr(attribute, elem.value);
	console.log($(target)[0].checkValidity());
}

function addField(elem) {
	var item = elem.parentElement.lastElementChild;
	var clone = item.cloneNode(true);
	clone.value = "";
	clone.removeAttribute("required");
	
	elem.parentNode.appendChild(clone);
}

function sortTables() {
	var table, rows, switching, i, x, y, shouldSwitch;
	
	for (var h = 0; h < systems.length; h++) {
		table = (h == 0 ? document.getElementById("TeamA") : document.getElementById("TeamB"));
		switching = true;
		/* Make a loop that will continue until
		no switching has been done: */
		while (switching) {
			// Start by saying: no switching is done:
			switching = false;
			rows = table.getElementsByTagName("TR");
			// Loop through all table rows:
			for (i = 0; i < (rows.length - 1); i++) {
				// Start by saying there should be no switching:
				shouldSwitch = false;
				/* Get the two elements you want to compare,
				one from current row and one from the next: */
				x = rows[i].getElementsByTagName("TD")[1];
				y = rows[i + 1].getElementsByTagName("TD")[1];
				if (!x || !y)
					continue;
				/* Check if the two rows should switch place,
				based on the direction, asc or desc: */
				if (parseInt(x.innerHTML.replace(/,/g, "")) < parseInt(y.innerHTML.replace(/,/g, ""))) {
					// If so, mark as a switch and break the loop:
					shouldSwitch= true;
					break;
				}
			}
			if (shouldSwitch) {
				/* If a switch has been marked, make the switch
				and mark that a switch has been done: */
				rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
				switching = true;
			}
		}
	}
}

function sortTable2() {
	var table, rows, switching, i, x1, x2, y1, y2, shouldSwitch;
	
	table = document.getElementById("systemKills");
	switching = true;
	/* Make a loop that will continue until
	no switching has been done: */
	while (switching) {
		// Start by saying: no switching is done:
		switching = false;
		rows = table.getElementsByTagName("TR");
		// Loop through all table rows:
		for (i = 0; i < (rows.length - 1); i++) {
			// Start by saying there should be no switching:
			shouldSwitch = false;
			/* Get the two elements you want to compare,
			one from current row and one from the next: */
			x1 = rows[i].getElementsByTagName("TD")[0];
			x2 = rows[i].getElementsByTagName("TD")[2];
			y1 = rows[i + 1].getElementsByTagName("TD")[0];
			y2 = rows[i + 1].getElementsByTagName("TD")[2];
			
			if (!x1 || !x2 || !y1 || !y2)
				continue;
			
			x1 = x1.innerHTML.replace("---", "0");
			x2 = x2.innerHTML.replace("---", "0");
			y1 = y1.innerHTML.replace("---", "0");
			y2 = y2.innerHTML.replace("---", "0");
			
			/* Check if the two rows should switch place,
			based on the direction, asc or desc: */
			if ((parseInt(x1.replace(/,/g, "")) + parseInt(x2.replace(/,/g, ""))) < (parseInt(y1.replace(/,/g, "")) + parseInt(y2.replace(/,/g, "")))) {
				// If so, mark as a switch and break the loop:
				shouldSwitch= true;
				break;
			}
		}
		if (shouldSwitch) {
			/* If a switch has been marked, make the switch
			and mark that a switch has been done: */
			rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			switching = true;
		}
	}
}

function parseTimer(duration) {
	var milliseconds = parseInt((duration%1000)/100);
	var seconds = parseInt((duration/1000)%60);
	var minutes = parseInt((duration/(1000*60))%60);
	var hours = parseInt((duration/(1000*60*60))%24);
	hours = ((hours < 10) ? "0" + hours : hours) + "H";
	minutes = ((minutes < 10) ? "0" + minutes : minutes) + "M";
	seconds = ((seconds < 10) ? "0" + seconds : seconds);
	
	return hours + ":" + minutes + ":" + seconds + "." + milliseconds + "S";
}

function totalFinished() {
	var done = 0;
	var keys = Object.keys(doneFetching);
	for (var a = 0; a < keys.length; a++) {
		if (doneFetching[keys[a]] && doneFetching[keys[a]].keepGoing == false) {
			done++;
		}
	}
	
	return done;
}

function getTeam(victim) {
	if (victim.alliance_id) {
		if (aIDs.includes(victim.alliance_id+"") || aIDs.includes(victim.corporation_id+"") || aIDs.includes(victim.character_id+""))
			return 1;
		else if (bIDs.includes(victim.alliance_id+"") || bIDs.includes(victim.corporation_id+"") || bIDs.includes(victim.character_id+""))
			return 0;
	}
	else if (aIDs.includes(victim.corporation_id+"") || aIDs.includes(victim.character_id+""))
		return 1;
	else if (bIDs.includes(victim.corporation_id+"") || bIDs.includes(victim.character_id+""))
		return 0;
	
	return -1;
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

function esiError(error) {
	alert("Failed to load ESI data. CCP servers might be having some troubles, or it could be downtime.\n\nError received: " + error);
}

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