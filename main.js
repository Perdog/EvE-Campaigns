// Default page stuff
var namesList = [];

// Search query stuff
var allIDs = {};
var aIDs = [];
var bIDs = [];
var dates = [];

// Kills stuff
var allKills = [];
var waitingOn = 0;
var pageNumber = 0;
var keepSearching = false;

// Stats stuff
var totalKills = [0,0];
var totalValues = [0,0];
var systems = [];

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
	
	namesList = [];
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
	var howMany = Math.max(20/idLength, 1);
	for (var h = 0; h < howMany; h++) {
		pageNumber++;
		var base = "https://zkillboard.com/api/kills/";
		var alli = "allianceID/";
		var corp = "corporationID/";
		var sTime = "/startTime/";
		var eTime = "/endTime/";
		var page = "/no-items/page/";
		var dontForgetThis = "/";
		
		for (var i = 0; i < idLength; i++) {
			waitingOn++;
			var id = Object.keys(allIDs)[i];
			var zurl = base + (allIDs[id].type == "alliance" ? alli + id : corp + id) + sTime + dates[0] + eTime + dates[1] + page + pageNumber + dontForgetThis;
			
			var fetch = new XMLHttpRequest();
			fetch.onload = reqsuc;
			fetch.onerror = reqerror;
			fetch.open('get', zurl, true);
			//fetch.setRequestHeader('Requester-Info','EvE Campaigns --- Maintainer: Pedro Athonille @ jacob_perry@hotmail.ca');
			fetch.send();
		}
	}
}

var mailIDs = [];
function reqsuc() {
	var data = JSON.parse(this.responseText);
	
	if (data.length > 1)
		keepSearching = true;
	
	$("#load-text").text("Parsing kill data...");
	
	// Lets do something with the data
	for (var i = 0; i < data.length; i++) {
		// Make sure the victim is in our list of wanted IDs (Checking all of them since we don't know which fetch call this came from)
		if (Object.keys(allIDs).includes(data[i].victim.alliance_id + "") || Object.keys(allIDs).includes(data[i].victim.corporation_id + "")) {
			// If either true, we want to keep this data
			console.log("Keeping one");
			
			if (!mailIDs.includes(data[i].killmail_id)) {
				allKills.push(data[i]);
				mailIDs.push(data[i].killmail_id);
			
				// STATS COLLECTION
				// Used for the arrays. Defaulting to -1 for error catching. Should never see it, but juuuuuust in case.
				var team = getTeam(data[i].victim);
				if (team >= 0) {
					// Track total kills
					totalKills[team] += 1;
					
					// Track total kill values
					totalValues[team] += data[i].zkb.totalValue;
					
					// Track kills per ship per team
						// Topkeks that's gonna be fun
					
					// Track kills per system per team
					if (!systems[team])
						systems[team] = {};
					if (!systems[team][data[i].solar_system_id]) {
						systems[team][data[i].solar_system_id] = {};
						systems[team][data[i].solar_system_id].kills = 0;
					}
					systems[team][data[i].solar_system_id].kills += 1;
				}
			}
		}
	}
	// If this is the last fetch, and there was no data on the page, build the webpage
	waitingOn--;
	if (waitingOn == 0)
		if (keepSearching) {
			keepSearching = false;
			$("#load-text").text("Done parsing this page, next...");
			getNextPage();
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
	
	// Do system name lookups
	loadSystemNames();
}

function loadSystemNames() {
	console.log("Fetching system names");
	$("#load-text").text("Loading system names...");
	
	var list = [];
	
	for (var i = 0; i < systems.length; i++) {
		Object.keys(systems[i]).forEach(function(key) {
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
			for (var i = 0; i < systems.length; i++) {
				if (Object.keys(systems[i]).includes(key.id+"")) {
					systems[i][key.id+""].name = key.name;
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
	
	//for (var i = 0; i < allKills.length; i++) {}
	
	// Header things
	$('#when').text("Campaign between the dates of " + (dates[0].slice(0,4)+"-"+dates[0].slice(4,6)+"-"+dates[0].slice(6,8)) + " and " + (dates[1].slice(0,4)+"-"+dates[1].slice(4,6)+"-"+dates[1].slice(6,8)));
	
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
	var aTeamSystems = "";//Object.keys(systems[0]).toString().replace(",","\n");
	var bTeamSystems = "";
	for (var i = 0; i < systems.length; i++) {
		Object.values(systems[i]).forEach(function(v) {
			if (i == 0)
				aTeamSystems += "<tr><td>" + v.name + "</td><td>" + v.kills + "</td></tr>";//v.name + (v.name.length >= 8 ? "\t" : v.name.length >= 4 ? "\t\t" : v.name.length < 4 ? "\t\t\t" : "") + v.kills + "\n";
			else
				bTeamSystems += "<tr><td>" + v.name + "</td><td>" + v.kills + "</td></tr>";//v.name + (v.name.length >= 8 ? "\t" : v.name.length >= 4 ? "\t\t" : v.name.length < 4 ? "\t\t\t" : "") + v.kills + "\n";
		});
	}
	$('#TeamA').find('#systems').append(aTeamSystems);
	$('#TeamB').find('#systems').append(bTeamSystems);
	sortTables();
	console.log("Done");
	$("#load-text").text("Ready to go");
	$('#loading-page').hide(1500);
	$('#campaign-page').show(1500);
}

function dateChange(elem, target, attribute) {
	$(target).attr(attribute, elem.value);
	console.log($(target)[0].checkValidity());
}

function testStuff() {
	var start = $('#startDate');
	
	console.log(start[0].checkValidity());
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
				/* Check if the two rows should switch place,
				based on the direction, asc or desc: */
				if (parseInt(x.innerHTML) < parseInt(y.innerHTML)) {
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

function getTeam(victim) {
	if (victim.alliance_id) {
		if (aIDs.includes(victim.alliance_id+"") || aIDs.includes(victim.corporation_id+""))
			return 1;
		else if (bIDs.includes(victim.alliance_id+"") || bIDs.includes(victim.corporation_id+""))
			return 0;
	}
	else if (aIDs.includes(victim.corporation_id+""))
		return 1;
	else if (bIDs.includes(victim.corporation_id+""))
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