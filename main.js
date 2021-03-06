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
var shipKills = {};
var pilotStats = [];
var mailIDs = [];
var timer = 0;
var autoCompleteCache = {};

$.widget("custom.catcomplete", $.ui.autocomplete, {
	_create: function() {
		this._super();
		this.widget().menu("option", "items", "> :not(.ui-autocomplete-category)");
	},
	_renderMenu: function(ul, items) {
		var that = this, currentCategory = "";
		$.each(items, function(index, item) {
			var li;
			if (item.category && item.category != currentCategory) {
				ul.append("<li class='ui-autocomplete-category'>" + capitalizeFirstLetter(item.category + "s") + "</li>");
				currentCategory = item.category;
			}
			li = that._renderItemData(ul, item);
			if (item.category) {
				li.attr("aria-label", item.category + ":" + item.name);
			}
		});
	}
});

$(document).on('focus', '.searchbox:not(.ui-autocomplete-input)', function(e) {
	$(this).catcomplete({
		minLength: 5,
		delay: 1000,
		source: function(req, res) {
			var term = req.term;
			var powerSearch = term.split(":");
			var searchCat = "";
			var categ = "alliance%2Ccharacter%2Ccorporation";
			
			if (term in autoCompleteCache) {
				res(autoCompleteCache[term]);
				return;
			}
			
			if (powerSearch.length > 1) {
				searchCat = powerSearch[0];
				term = powerSearch[1];
				categ = ((searchCat.toLowerCase() === "char" || searchCat.toLowerCase() === "character") ? "character" :
						(searchCat.toLowerCase() === "corp" || searchCat.toLowerCase() === "corporation") ? "corporation" :
						(searchCat.toLowerCase() === "alli" || searchCat.toLowerCase() === "alliance") ? "alliance" : "alliance%2Ccharacter%2Ccorporation");
			}
			
			var url = 	"https://esi.evetech.net/latest/search/" +
						"?categories=" + categ +
						"&datasource=tranquility&language=en-us&" +
						"search=" + term +
						"&strict=false";
			
			if (term === "")
				return;
			
			$.getJSON(url, function(data, status, xhr) {
				var tempListIDs = [];
				
				Object.keys(data).forEach(function(key) {
					tempListIDs = tempListIDs.concat(data[key]);
				});
				
				var url2 = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
				var fetch = new XMLHttpRequest();
				fetch.onload = function() {
					var data2 = JSON.parse(this.responseText);
					
					if (data2.error) {
						data2 = [{"name": "No matches found"}];
					} else {
						var orderArray = ["character", "corporation", "alliance"];
						data2.sort(function(a,b) {
							return (orderArray.indexOf(a.category) + 1) - (orderArray.indexOf(b.category) + 1);
						});
					}
					
					autoCompleteCache[req.term] = data2;
					res(data2);
				};
				fetch.open('post', url2, true);
				fetch.setRequestHeader('Content-Type','application/json');
				fetch.setRequestHeader('accept','application/json');
				fetch.send(JSON.stringify(tempListIDs));
			});
		},
		focus: function() {
			return false;
		},
		select: function(event, ui) {
			this.value = ui.item.name;
			return false;
		}
	})
	.catcomplete("instance")._renderItem = function(ul, item) {
		return $("<li>")
				.append("<div>" +
						(item.category ? "<img src=\"https://image.eveonline.com/" + item.category + "/" + item.id + "_32." + (item.category == "character" ? "jpg" : "png") + "\" />" : "") +
						"    " +
						item.name +
						"</div>")
				.appendTo(ul);
	};
});

$(document).on('click', '.clickable-row', function(e) {
	window.open($(this).data("href"), "_blank");
});

$(document).on('click', '.let-me-click', function(e) {
	e.stopPropagation();
});

$(document).ready(function(){
	serverStatus();
	
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

function serverStatus() {
	var fetch = new XMLHttpRequest();
	fetch.onload = serverStatusLoad;
	fetch.onerror = serverStatusError;
	fetch.open('get', "https://esi.evetech.net/latest/status/?datasource=tranquility", true);
	fetch.send();
}

function serverStatusLoad() {
	var data = JSON.parse(this.responseText);
	if (data.error)
		$('#server-status').text("Server is offline --- Players online: 0");
	else
		$('#server-status').text("Server is online --- Players online: " + data.players.toLocaleString());
}

function serverStatusError(err) {
	$('#server-status').text("Error loading server status");
}

function getNames(list) {
	$("#load-text").text("Loading group names...");
	myConsoleLog.post("Loading group names...");
	
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
		myConsoleLog.post("Failed to load team names...");
	} else {
		$("#load-text").text("Names found...");
		myConsoleLog.post("Names found...");
		
		$("#load-text").text("Fetching killmails...");
		myConsoleLog.post("Fetching killmails...");
		
		for (var i = 0; i < data.length; i++) {
			var temp = {};
			temp.name = data[i].name;
			temp.type = data[i].category;
			allIDs[data[i].id] = temp;
			fetching[data[i].id] = {};
			fetching[data[i].id].page = 1;
			fetching[data[i].id].waiting = 0;
			fetching[data[i].id].keepGoing = true;
			for (var j = 0; j < 2; j++) {
				fetchKillMails(data[i].id);
			}
		}
	}
}

function fetchKillMails(id) {
	var pn = fetching[id].page;
	fetching[id].page++;
	console.log("Trying to fetch kills. Page " + pn + " for " + id);
	myConsoleLog.post("Trying to fetch kills. Page " + pn + " for " + allIDs[id].name);
	
	
	var base = "https://zkillboard.com/api/losses/";
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
	console.log(zurl);
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
	console.log(this.getAllResponseHeaders());
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
	
	console.log(data);
	// Lets do something with the data
	for (var i = 0; i < data.length; i++) {
		var victim = data[i].victim;
		console.log(victim);
		// Used for the arrays. Defaulting to -1 for error catching. Should never see it, but juuuuuust in case.
		var team = getTeam(victim);
		
		if (team >= 0) {
			
			// We don't want awox kills to be counted, they throw off the totals.
			if (data[i].zkb.awox) {
				continue;
			}
			// We also need to ignore "whored" kills.
			else {
				var doKeep = false;
				var useIDs = (team == 0 ? aIDs : bIDs);
				for (var j = 0; j < data[i].attackers.length; j++) {
					if (useIDs.includes(data[i].attackers[j].corporation_id+"") || useIDs.includes(data[i].attackers[j].alliance_id+"") || useIDs.includes(data[i].attackers[j].character_id+""))
						doKeep = true;
				}
				if (!doKeep)
					continue;
			}
			
			// If this killmail passes the above checks, we want to keep it. First check to make sure we don't have this kill already.
			if (!mailIDs.includes(data[i].killmail_id)) {
				allKills.push(data[i]);
				mailIDs.push(data[i].killmail_id);
			
				// STATS COLLECTION
				// Track total kills
				totalKills[team] += 1;
				
				// Track pilot kills
				var vicID = victim.character_id;
				var vicSelected = ((allIDs.hasOwnProperty(victim.alliance_id)) ? victim.alliance_id : ((allIDs.hasOwnProperty(victim.corporation_id)) ? victim.corporation_id : ((allIDs.hasOwnProperty(vicID)) ? vicID : null)));
				var vicPilot = pilotStats.filter(x => x.id == vicID)[0];
				if (vicID && !vicPilot) {
					var temp = {};
					temp.id = vicID;
					temp.kills = 0;
					temp.group = vicSelected;
					pilotStats.push(temp);
				}
				for (var j = 0; j < data[i].attackers.length; j++) {
					var attacker = data[i].attackers[j];
					var attID = attacker.character_id;
					var idSelected = ((allIDs.hasOwnProperty(attacker.alliance_id)) ? attacker.alliance_id : ((allIDs.hasOwnProperty(attacker.corporation_id)) ? attacker.corporation_id : ((allIDs.hasOwnProperty(attID)) ? attID : null)));
					
					if (idSelected) {
						var pilot = pilotStats.filter(x => x.id == attID)[0];
						if (!pilot) {
							var temp = {};
							temp.id = attID;
							temp.kills = 1;
							temp.group = idSelected;
							pilotStats.push(temp);
						} else {
							pilot.kills++;
						}
					}
				}
				
				// Track total kill values
				totalValues[team] += data[i].zkb.totalValue;
				
				// Track kills per ship per team
				var shipID = victim.ship_type_id;
				var attShipID = data[i].attackers.filter(e => e.final_blow == true)[0].ship_type_id;
				
				if (!attShipID)
					attShipID = 11;
				
				if (!shipKills.hasOwnProperty(attShipID))
					shipKills[attShipID] = {};
				
				if (!shipKills.hasOwnProperty(shipID))
					shipKills[shipID] = {};
				if (team == 0) {
					(shipKills[shipID].hasOwnProperty("a")) ? shipKills[shipID].a++ : shipKills[shipID].a = 1;
					(shipKills[shipID].hasOwnProperty("av")) ? shipKills[shipID].av += data[i].zkb.totalValue : shipKills[shipID].av = data[i].zkb.totalValue;
				}
				else if (team == 1) {
					(shipKills[shipID].hasOwnProperty("b")) ? shipKills[shipID].b++ : shipKills[shipID].b = 1;
					(shipKills[shipID].hasOwnProperty("bv")) ? shipKills[shipID].bv += data[i].zkb.totalValue : shipKills[shipID].bv = data[i].zkb.totalValue;
				}
				
				// Track kills per system per team
				var sysID = data[i].solar_system_id;
				
				if (!systemKills.hasOwnProperty(sysID))
					systemKills[sysID] = {};
				if (team == 0) {
					(systemKills[sysID].hasOwnProperty("a")) ? systemKills[sysID].a++ : systemKills[sysID].a = 1;
					(systemKills[sysID].hasOwnProperty("av")) ? systemKills[sysID].av += data[i].zkb.totalValue : systemKills[sysID].av = data[i].zkb.totalValue;
				}
				if (team == 1) {
					(systemKills[sysID].hasOwnProperty("b")) ? systemKills[sysID].b++ : systemKills[sysID].b = 1;
					(systemKills[sysID].hasOwnProperty("bv")) ? systemKills[sysID].bv += data[i].zkb.totalValue : systemKills[sysID].bv = data[i].zkb.totalValue;
				}
			}
		}
	}
	
	// If this is the last fetch, and there was no data on the page, build the webpage
	fetching[id].waiting--;
	
	var idLength = Object.keys(allIDs).length;
	
	if (totalFinished() == idLength && fetching[id].waiting == 0) {
		console.log("Final being called from: " + allIDs[id].name + "\nPage:" + fetching[id].page);
		$("#load-text").text("All possible kills found...");
		myConsoleLog.post("All possible kills found (" + allKills.length + ")...");
		setTimeout(doneFetchingKills(), 1000);
		
		return;
	} else if (fetching[id].keepGoing) {
		setTimeout(fetchKillMails(id), 100);
	}
}

function reqerror(error) {
	console.log("Oh no! Something's wrong!\n" + error);
	$("#load-text").text("Something bad happened somewhere...\n%s", error);
	myConsoleLog.post("Something bad happened! Check the dev console for more info.");
	
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
		myConsoleLog.post("No kills found in this campaign...");
		
		pullStats();
	}
}

function loadSystemNames() {
	console.log("Fetching system names");
	myConsoleLog.post("Loading system names (" + Object.keys(systemKills).length + ")...");
	
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
		myConsoleLog.post("Error loading system names...");
		
	} else {
		data.forEach(function(key) {
			if (systemKills) {
				if (Object.keys(systemKills).includes(key.id+"")) {
					systemKills[key.id+""].name = key.name;
				}
			}
		});
		
		$("#load-text").text("System names loaded...");
		myConsoleLog.post("System names loaded...");
		
		console.log("System fetch is done");
		loadShipNames();
	}
}

function loadShipNames() {
	console.log("Fetching ship names");
	$("#load-text").text("Loading ship names...");
	myConsoleLog.post("Loading ship names (" + Object.keys(shipKills).length + ")...");
	
	var list = [];
	
	if (systemKills) {
		Object.keys(shipKills).forEach(function(key) {
			if (!list.includes(key))
				list.push(key);
		});
	}
	
	var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
	var fetch = new XMLHttpRequest();
	fetch.onload = parseShips;
	fetch.onerror = reqerror;
	fetch.open('post', url, true);
	fetch.setRequestHeader('Content-Type','application/json');
	fetch.setRequestHeader('accept','application/json');
	fetch.send(JSON.stringify(list));
}

function parseShips() {
	var data = JSON.parse(this.responseText);
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Error loading ship names...");
		myConsoleLog.post("Error loading ship names...");
		
	} else {
		data.forEach(function(key) {
			if (shipKills) {
				if (Object.keys(shipKills).includes(key.id+"")) {
					shipKills[key.id+""].name = key.name;
				}
			}
		});
		
		$("#load-text").text("Ship names loaded...");
		myConsoleLog.post("Ship names loaded...");
		
		console.log("Ship fetch is done");
		fetchCharNames();
	}
}

var charWait = 0;
function fetchCharNames() {
	console.log("Fetching character names");
	$("#load-text").text("Loading character names...");
	myConsoleLog.post("Loading character names (" + pilotStats.length + ")...");
	
	for (var i = 0; i < Math.ceil(pilotStats.length/200); i++) {
		var list = [];
		charWait++;
		
		if (pilotStats) {
			for (var j = 0+(i*200); j < 200+Math.min(pilotStats.length, i*200); j++) {
				var key = pilotStats[j];
				if (key && !list.includes(key.id))
					list.push(key.id);
			}
		}
		
		var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
		var fetch = new XMLHttpRequest();
		fetch.onload = parseCharacters;
		fetch.onerror = reqerror;
		fetch.open('post', url, true);
		fetch.setRequestHeader('Content-Type','application/json');
		fetch.setRequestHeader('accept','application/json');
		fetch.send(JSON.stringify(list));
	}
}

function parseCharacters() {
	var data = JSON.parse(this.responseText);
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Error loading character names...");
		myConsoleLog.post("Error loading character names...");
		
	} else {
		data.forEach(function(key) {
			if (pilotStats) {
				var cha = pilotStats.filter(e => e.id == key.id)[0];
				if (cha) {
					cha.name = key.name;
				}
			}
		});
		
		charWait--;
		if (charWait == 0) {
			$("#load-text").text("Character names loaded...");
			myConsoleLog.post("Character names loaded...");
			
			console.log("Character fetch is done");
			pullStats();
		}
	}
}

function pullStats() {
	$("#load-text").text("Parsing all this info...");
	myConsoleLog.post("Parsing all this info...");
	
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
			aTeamNames +=
			"<img src=\"https://image.eveonline.com/" + allIDs[key].type + "/" + key + "_64.png\" />"
			+ "  <a style=\"color:black\" target=\"_blank\" href=\"https://zkillboard.com/"+allIDs[key].type+"/"+key+"/\">" + allIDs[key].name + "</a>\n<br />";
		else if (bIDs.includes(key))
			bTeamNames +=
			"<img src=\"https://image.eveonline.com/" + allIDs[key].type + "/" + key + "_64.png\" />"
			+ "  <a style=\"color:black\" target=\"_blank\" href=\"https://zkillboard.com/"+allIDs[key].type+"/"+key+"/\">" + allIDs[key].name + "</a>\n<br />";
	});
	aTeamNames = aTeamNames.substring(0, aTeamNames.length-6);
	bTeamNames = bTeamNames.substring(0, bTeamNames.length-6);
	$('#TeamA').find('#names').append(aTeamNames);
	$('#TeamB').find('#names').append(bTeamNames);
	
	// Replace kill count
	$('#killStats-A').find('#kills').text(totalKills[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#killStats-B').find('#kills').text(totalKills[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	// Replace isk values
	$('#killStats-A').find('#value').text(totalValues[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#killStats-B').find('#value').text(totalValues[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	//////////////////////
	// Set system table //
	//////////////////////
	var systemKillTable = 	"<tr>" +
								"<th style=\"text-align:center\">Team A Kills</th>" +
								"<th style=\"text-align:center\">System name</th>" +
								"<th style=\"text-align:center\">Team B Kills</th>" +
							"</tr>";
	Object.keys(systemKills).forEach(function(v) {
		var o = systemKills[v];
		systemKillTable += 	"<tr>" +
								"<td>" + ((o.a) ? o.a.toLocaleString() + "  (" + abbreviateISK(o.av) + ")" : "-----") + "</td>" +
								"<td><a target=\"_blank\" href=\"https://zkillboard.com/system/" + v + "/\">" + o.name + "</a></td>" +
								"<td>" + ((o.b) ? o.b.toLocaleString() + "  (" + abbreviateISK(o.bv) + ")" : "-----") + "</td>" +
							"</tr>";
	});
	$('#systemKills').append(systemKillTable);
	sortTable("systemKills");
	
	// Set pilot stats
	var pilotTable = sortPilotKills();
	$('#pilotKills').append(pilotTable);
	
	////////////////////
	// Set ship table //
	////////////////////
	var shipKillTable = "<tr>" +
							"<th style=\"text-align:center\">Team A Kills</th>" +
							"<th style=\"text-align:center\">Ship type</th>" +
							"<th style=\"text-align:center\">Team B Kills</th>" +
						"</tr>";
	Object.keys(shipKills).forEach(function(v) {
		var o = shipKills[v];
		
		if (!o.a && !o.b)
			return;
		
		shipKillTable += 	"<tr>" +
								"<td>" + ((o.a) ? (o.a.toLocaleString()  + " (" + abbreviateISK(o.av) + ")") : "-----") + "</td>" +
								"<td style=\"text-align:left\"><img src=\"https://image.eveonline.com/type/" + v + "_64.png\" />    <a target=\"_blank\" href=\"https://zkillboard.com/item/" + v + "/\">" + o.name + "</a></td>" +
								"<td>" + ((o.b) ? (o.b.toLocaleString()  + " (" + abbreviateISK(o.bv) + ")") : "-----") + "</td>" +
							"</tr>";
	});
	$('#shipStats').append(shipKillTable);
	sortTable("shipStats");
	
	///////////////////////
	// Bling kills table //
	///////////////////////
	var blingTable = sortBlingKills();
	$('#blingStats').append(blingTable);
	
	///////////////////////
	// Solo kills table //
	///////////////////////
	var soloTable = sortSoloKills();
	$('#soloStats').append(soloTable);
	
	// Done. Show the page.
	console.log("Done");
	myConsoleLog.post("Done!");
	
	setTimeout(function() {
		$("#load-text").text("Ready to go");
		$('#loading-page').hide(2000);
		$('#campaign-page').show(2000);
	}, 2000);
}

function sortPilotKills() {
	pilotStats.sort(by('kills', true));
	
	// We need n+1 arrays, where n = number of ids originally searched for, and +1 is the "overall" array
	var pilotTable;
	for (var i = -1; i < Object.keys(allIDs).length; i++) {
		if (i == -1) {
			pilotTable = "<tr><th colspan=\"2\" style=\"text-align:center\">Top 10 pilots overall</th></tr>";
			pilotTable += "<tr><th style=\"text-align:center\">Pilot</th><th style=\"text-align:center\">Kills</th></tr>";
			for (var j = 0; j < Math.min(10, pilotStats.length); j++) {
				pilotTable += 	"<tr>" +
									"<td style=\"text-align:left\"><img src=\"https://image.eveonline.com/character/" + pilotStats[j].id + "_64.jpg\" />    <a target=\"_blank\" href=\"https://zkillboard.com/character/" + pilotStats[j].id + "/\">"+pilotStats[j].name+"</a> (" + allIDs[pilotStats[j].group].name + ")</td>" +
									"<td style=\"text-align:center\">"+pilotStats[j].kills+"</td>" +
								"</tr>";
			}
			pilotTable += "<tr><th colspan=\"2\" style=\"text-align:center\">Top 10 pilots by group</th></tr>";
		} else {
			var id = Object.keys(allIDs)[i];
			var killsForGroup = pilotStats.filter(x => x.group == id);
			pilotTable += "<tr><th colspan=\"2\" style=\"text-align:center\">"+capitalizeFirstLetter(allIDs[id].type)+" - "+allIDs[id].name+"</th></tr>";
			pilotTable += "<tr><th style=\"text-align:center\">Pilot</th><th style=\"text-align:center\">Kills</th></tr>";
			for (var j = 0; j < Math.min(10, killsForGroup.length); j++) {
				pilotTable += 	"<tr>" +
									"<td style=\"text-align:left\"><img src=\"https://image.eveonline.com/character/" + killsForGroup[j].id + "_32.jpg\" />    <a target=\"_blank\" href=\"https://zkillboard.com/character/" + killsForGroup[j].id + "/\">"+killsForGroup[j].name+"</a></td>" +
									"<td style=\"text-align:center\">"+killsForGroup[j].kills+"</td>" +
								"</tr>";
			}
		}
	}
	
	return pilotTable;
}

function sortBlingKills() {
	var blingList = allKills;
	blingList.sort(by("zkb.totalValue", true));
	var blingTable = 	"<tr><th colspan=\"4\" style=\"text-align:center\">Top 25 most expensive kills</th></tr>" +
						"<tr>" +
							"<th style=\"text-align:center\">Value</th>" +
							"<th style=\"text-align:center\">Ship</th>" +
							"<th style=\"text-align:center\">System</th>" +
							"<th style=\"text-align:center\">Victim</th>" +
						"</tr>";
	
	for (var i = 0; i < Math.min(25, blingList.length); i++) {
		var vicID = (blingList[i].victim.character_id) ? blingList[i].victim.character_id : blingList[i].victim.ship_type_id;
		var vicGroupID = (allIDs[blingList[i].victim.alliance_id]) ? allIDs[blingList[i].victim.alliance_id] : (allIDs[blingList[i].victim.corporation_id]) ? allIDs[blingList[i].victim.corporation_id] : allIDs[blingList[i].victim.character_id];
		var shipID = blingList[i].victim.ship_type_id;
		var sysID = blingList[i].solar_system_id;
		var totVal = blingList[i].zkb.totalValue;
		var pName = pilotStats.filter(e => e.id == vicID)[0];
		if (!pName)
			pName = shipKills[vicID];
		
		blingTable += 	"<tr>" +
							"<td><a>" + abbreviateISK(totVal) + "</a></td>" +
							"<td style=\"text-align:left\"><a href=\"https://zkillboard.com/kill/" + blingList[i].killmail_id + "/\" target=\"_blank\"><img src=\"https://image.eveonline.com/type/" + shipID + "_64.png\" /></a>  <a target=\"_blank\" href=\"https://zkillboard.com/item/" + shipID + "/\">" + shipKills[shipID].name + "</a></td>" +
							"<td><a target=\"_blank\" href=\"https://zkillboard.com/system/" + sysID + "/\">" + systemKills[sysID].name + "</a></td>" +
							"<td style=\"text-align:left\"><img src=\"https://image.eveonline.com/character/" + vicID + "_64.jpg\" />  <a target=\"_blank\" href=\"https://zkillboard.com/character/" + vicID + "/\">" + pName.name + "</a> (" + vicGroupID.name + ")</td>" +
						"</tr>";
	}
	
	return blingTable;
}

function sortSoloKills() {
	var soloList = allKills;
	soloList.sort(by("zkb.totalValue", true));
	soloList = soloList.filter(x => x.zkb.solo == true);
	var blingTable = 	"<tr><th colspan=\"4\" style=\"text-align:center\">Top 25 solo kills</th></tr>" +
						"<tr>" +
							"<th style=\"text-align:center\">Value</th>" +
							"<th style=\"text-align:center\">System</th>" +
							"<th style=\"text-align:center\">Victim</th>" +
							"<th style=\"text-align:center\">Killer</th>" +
						"</tr>";
	
	for (var i = 0; i < Math.min(25, soloList.length); i++) {
		var vicID = (soloList[i].victim.character_id) ? soloList[i].victim.character_id : soloList[i].victim.ship_type_id;
		var attacker = soloList[i].attackers.filter(e => e.final_blow == true)[0];
		var attID = (attacker.character_id) ? attacker.character_id : attacker.ship_type_id;
		var vicGroupID = (allIDs[soloList[i].victim.alliance_id]) ? allIDs[soloList[i].victim.alliance_id] : (allIDs[soloList[i].victim.corporation_id]) ? allIDs[soloList[i].victim.corporation_id] : allIDs[soloList[i].victim.character_id];
		var attGroupID = (allIDs[attacker.alliance_id]) ? allIDs[attacker.alliance_id] : (allIDs[attacker.corporation_id]) ? allIDs[attacker.corporation_id] : allIDs[attacker.character_id];
		var vicShipID = soloList[i].victim.ship_type_id;
		var attShipID = attacker.ship_type_id;
		var sysID = soloList[i].solar_system_id;
		var totVal = soloList[i].zkb.totalValue;
		var pName = pilotStats.filter(e => e.id == vicID)[0];
		var apName = pilotStats.filter(e => e.id == attID)[0];
		
		if (!pName)
			pName = shipKills[vicID];
		if (!apName)
			apName = shipKills[attID];
		
		blingTable += 	"<tr class=\"clickable-row\" data-href=\"https://zkillboard.com/kill/" + soloList[i].killmail_id + "/\">" +
							"<td style=\"text-align:center;\"><a>" + abbreviateISK(totVal) + "</a></td>" +
							"<td style=\"text-align:center;\"><a class=\"let-me-click\" target=\"_blank\" href=\"https://zkillboard.com/system/" + sysID + "/\">" + systemKills[sysID].name + "</a></td>" +
							"<td style=\"text-align:left;\"><img title=\"" + shipKills[vicShipID].name + "\" src=\"https://image.eveonline.com/type/" + vicShipID + "_64.png\" /><img src=\"https://image.eveonline.com/character/" + vicID + "_64.jpg\" />  <a class=\"let-me-click\" target=\"_blank\" href=\"https://zkillboard.com/character/" + vicID + "/\">" + pName.name + "</a> (" + vicGroupID.name + ")</td>" +
							"<td style=\"text-align:left;\"><img title=\"" + shipKills[attShipID].name + "\" src=\"https://image.eveonline.com/type/" + attShipID + "_64.png\" /><img src=\"https://image.eveonline.com/character/" + attID + "_64.jpg\" />  <a class=\"let-me-click\" target=\"_blank\" href=\"https://zkillboard.com/character/" + attID + "/\">" + ((apName) ? apName.name : "Unknown") + "</a> (" + attGroupID.name + ")</td>" +
						"</tr>";
	}
	
	return blingTable;
}

function dateChange(elem, target, attribute) {
	$(target).attr(attribute, elem.value);
}

function addField(elem) {
	var item = elem.parentElement.lastElementChild;
	var clone = item.cloneNode(true);
	clone.lastElementChild.value = "";
	clone.lastElementChild.removeAttribute("required");
	clone.lastElementChild.classList.remove("ui-autocomplete-input");
	
	elem.parentNode.appendChild(clone);
}

function sortTable(tableName) {
	var table, rows, switching, i, x1, x2, y1, y2, shouldSwitch;
	
	table = document.getElementById(tableName);
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
		// A 'series' is only considered done if it has been marked done somewhere AND if it isn't waiting on any more calls to finish
		if (fetching[keys[a]] && fetching[keys[a]].keepGoing == false && fetching[keys[a]].waiting == 0) {
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

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function abbreviateISK(isk) {
	var temp = 0;
	
	temp = isk/1000000000000;
	if (temp >= 1)
		return temp.toLocaleString(undefined, {maximumFractionDigits:1}) + "T ISK";
	temp = isk/1000000000;
	if (temp >= 1)
		return temp.toLocaleString(undefined, {maximumFractionDigits:1}) + "B ISK";
	temp = isk/1000000;
	if (temp >= 1)
		return temp.toLocaleString(undefined, {maximumFractionDigits:1}) + "M ISK";
	
	return isk.toLocaleString(undefined, {maximumFractionDigits:1}) + " ISK";
}

// Visible console log for user
var chatscroll = new Object();
chatscroll.Pane = 
    function(scrollContainerId)
    {
        this.bottomThreshold = 65;
        this.scrollContainerId = scrollContainerId;
    }

chatscroll.Pane.prototype.activeScroll = 
    function()
    {
        var scrollDiv = document.getElementById(this.scrollContainerId);
        var currentHeight = 0;
        
        if (scrollDiv.scrollHeight > 0)
            currentHeight = scrollDiv.scrollHeight;
        else 
            if (objDiv.offsetHeight > 0)
                currentHeight = scrollDiv.offsetHeight;

        if (currentHeight - scrollDiv.scrollTop - ((scrollDiv.style.pixelHeight) ? scrollDiv.style.pixelHeight : scrollDiv.offsetHeight) < this.bottomThreshold)
            scrollDiv.scrollTop = currentHeight;

        scrollDiv = null;
    }

chatscroll.Pane.prototype.post =
	function(message)
	{
        var scrollDiv = document.getElementById(this.scrollContainerId);
		scrollDiv.append(message + "\n");
		this.activeScroll();
	}

var myConsoleLog = new chatscroll.Pane('page-console');

