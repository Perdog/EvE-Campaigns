// Default page stuff
var namesList = [];

// Search query stuff
var allIDs = {};
var aIDs = [];
var bIDs = [];
var dates = [];

// Kills stuff
var allKills = [];
var fetching = {};

// Stats stuff
var totalKills = [0,0];
var totalValues = [0,0];
var systems = [];
var systemKills = {};
var mailIDs = [];
var timer = 0;

$(document).ready(function(){
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
		$('#endDate').attr("value", date.getFullYear() + "-" + (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate());
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
			fetching[data[i].id] = {};
			fetching[data[i].id].page = 1;
			fetching[data[i].id].waiting = 0;
			fetching[data[i].id].keepGoing = true;
			for (var j = 0; j < 10; j++) {
				fetchKillMails(data[i].id);
			}
		}
	}
}

function fetchKillMails(id) {
	var pn = fetching[id].page;
	fetching[id].page++;
	console.log("Trying to fetch kills. Page " + pn + " for " + id);
	
	var base = "https://zkillboard.com/api/kills/";
	var alli = "allianceID/";
	var corp = "corporationID/";
	var sTime = "/startTime/";
	var eTime = "/endTime/";
	var page = "/no-items/page/";
	var dontForgetThis = "/";
	
	if (!fetching[id].keepGoing) {
		return;
	}
	
	fetching[id].waiting++;
	maxWait++;
	
	var zurl = base + allIDs[id].type + "ID/" + id + sTime + dates[0] + eTime + dates[1] + page + pn + dontForgetThis;
	var fetch = new XMLHttpRequest();
	fetch.onload = reqsuc;
	fetch.onerror = reqerror;
	fetch.open('get', zurl, true);
	//fetch.setRequestHeader('Accept-Encoding','gzip');
	//fetch.setRequestHeader('Requester-Info','EvE Campaigns --- Maintainer: Pedro Athonille @ jacob_perry@hotmail.ca');
	fetch.send();
}

var maxWait = 0;
function reqsuc() {
	var data = JSON.parse(this.responseText);
	var id = this.responseURL;
	var page = id.substring(id.indexOf("page/")+5);
	page = parseInt(page.substring(0, page.indexOf("/")));
	id = id.substring(id.indexOf("ID/")+3);
	id = id.substring(0, id.indexOf("/"));
	
	// If the page contains data, we want to keep our requests going, otherwise stop them
	if (data.length < 200) {
		fetching[id].keepGoing = false;
	}
	
	// Lets do something with the data
	for (var i = 0; i < data.length; i++) {
		var victim = data[i].victim;
		// Used for the arrays. Defaulting to -1 for error catching. Should never see it, but juuuuuust in case.
		var team = getTeam(victim);
		
		// Make sure the victim is in our list of wanted IDs (Checking all of them since we don't know which fetch call this came from)
		if (Object.keys(allIDs).includes(victim.alliance_id + "") || Object.keys(allIDs).includes(victim.corporation_id + "") || Object.keys(allIDs).includes(victim.character_id + "")) {
			
			// We don't want awox kills to be counted, they throw off the totals.
			if (data[i].zkb.awox) {
				continue;
			}
			// We also need to ignore "whored" kills.
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
					continue;
				}
			}
			
			// If this killmail passes the above checks, we want to keep it. First check to make sure we don't have this kill already.
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
					var sysID = data[i].solar_system_id;
					
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
	fetching[id].waiting--;
		
	var tempInt = 100 - ((fetching[id].waiting/maxWait)*100);
	$('#load-progress').attr("value", tempInt);
	
	
	var idLength = Object.keys(allIDs).length;
	
	if (totalFinished() == idLength && fetching[id].waiting == 0) {
		$("#load-text").text("All possible kills found...");
		doneFetchingKills();
		return;
	} else if (fetching[id].keepGoing) {
		fetchKillMails(id);
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
	
	if (systemKills) {
		Object.keys(systemKills).forEach(function(key) {
			if (!list.includes(key))
				list.push(key);
		});
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
	
	var systemKillTable = "<tr><th style=\"text-align:center\">Team A Kills</th><th style=\"text-align:center\">System name</th><th style=\"text-align:center\">Team B Kills</th></tr>";
	Object.values(systemKills).forEach(function(v) {
		systemKillTable += "<tr><td>" + ((v.a) ? v.a : "---") + "</td><td>" + v.name + "</td><td>" + ((v.b) ? v.b : "---") + "</td></tr>";
	});
	$('#systemKills').append(systemKillTable);
	
	sortTable();
	console.log("Done");
	setTimeout(function() {
		$("#load-text").text("Ready to go");
		$('#loading-page').hide(2000);
		$('#campaign-page').show(2000);
	}, 1000);
}

function dateChange(elem, target, attribute) {
	$(target).attr(attribute, elem.value);
}

function addField(elem) {
	var item = elem.parentElement.lastElementChild;
	var clone = item.cloneNode(true);
	clone.value = "";
	clone.removeAttribute("required");
	
	elem.parentNode.appendChild(clone);
}

function sortTable() {
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
	hours = (hours > 0) ? ((hours < 10) ? "0" + hours : hours) + "H" : "";
	minutes = (minutes > 0) ? ((minutes < 10) ? "0" + minutes : minutes) + "M" : "";
	seconds = ((seconds < 10) ? "0" + seconds : seconds);
	
	return ((hours != "") ? hours + ":" : "") + ((minutes != "") ? minutes + ":" : "" ) + seconds + "." + milliseconds + "S";
}

function totalFinished() {
	var done = 0;
	var keys = Object.keys(fetching);
	
	for (var a = 0; a < keys.length; a++) {
		if (fetching[keys[a]] && fetching[keys[a]].keepGoing == false) {
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