function getKillsFromDB() {
	var startStamp = new Date(dates[0].substring(0, 4), Number(dates[0].substring(4,6))-1, dates[0].substring(6,8));
	console.log(startStamp.toISOString());
	var endStamp = new Date(dates[1].substring(0, 4), Number(dates[1].substring(4,6))-1, dates[1].substring(6,8));
	console.log(endStamp.toISOString());
	
	//*
	for (var id in allIDs) {
		waitingOnDBKills++;
		killsDB.where("killmail_time", ">=", startStamp.toISOString())
				.where("killmail_time", "<=", endStamp.toISOString())
				.where("victim." + allIDs[id].type + "_id", "==", Number(id))
				.orderBy("killmail_time")
				.get()
				.then(function(snap){
					if (!snap.empty) {
						console.log(snap);
						snap.forEach(function(doc) {
							dbKills.push(doc.data());
						});
					}
					waitingOnDBKills--;
				})
				.catch(function(err){
					console.error("Error fetching killmail: ", err);
				});
	}
	
	awaitDBKills();
	//*/
}

function awaitDBKills() {
	if (waitingOnDBKills > 0) {
		console.log("Waiting on DB for killmails");
		setTimeout(awaitDBKills, 500);
	}
	else
		doneFetchingKills();
}

function fetchZKillMails(id, missingDates) {
	var pn = fetching[id].page;
	fetching[id].page++;
	console.log("Trying to fetch kills. Page " + pn + " for " + id);
	
	var base = "https://zkillboard.com/api/losses/";
	var sTime = "/startTime/";
	var eTime = "/endTime/";
	var page = "/no-items/page/";
	var dontForgetThis = "/";
	
	if (!fetching[id].keepGoing) {
		return;
	}
	
	fetching[id].waiting++;
	
	var zurl = base + allIDs[id].type + "ID/" + id + sTime + dates[0] + eTime + dates[1] + page + pn + dontForgetThis;
	var fetch = new XMLHttpRequest();
	fetch.onload = reqsuc;
	fetch.onerror = reqerror;
	fetch.open('get', zurl, true);
	//fetch.setRequestHeader('Accept-Encoding','gzip');
	//fetch.setRequestHeader('Requester-Info','EvE Campaigns --- Maintainer: Pedro Athonille @ jacob_perry@hotmail.ca');
	fetch.send();
}

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
		zkbKills.push(data[i]);
	}
	
	// If this is the last fetch, and there was no data on the page, build the webpage
	fetching[id].waiting--;
	var idLength = Object.keys(allIDs).length;
	if (totalFinished() == idLength && fetching[id].waiting == 0) {
		console.log("Final being called from: " + fetching[id] + ":" + fetching[id].page + ":" + fetching[id].waiting + ":" + fetching[id].keepGoing);
		$("#load-text").text("All possible kills found...");
		doneFetchingKills();
		return;
	} else if (fetching[id].keepGoing) {
		setTimeout(fetchZKillMails(id),500);
	}
}

function parseKillmail(data) {
	var victim = data.victim;
	// Used for the arrays. Defaulting to -1 for error catching. Should never see it, but juuuuuust in case.
	// 0 = Team A kill, 1 = Team B kill
	var team = getTeam(victim);
	
	// Make sure the victim is in our list of wanted IDs (Checking all of them since we don't know which fetch call this came from)
	if (team >= 0) {// && (Object.keys(allIDs).includes(victim.alliance_id + "") || Object.keys(allIDs).includes(victim.corporation_id + "") || Object.keys(allIDs).includes(victim.character_id + ""))) {
		
		// We don't want awox kills to be counted, they throw off the totals.
		if (data.zkb.awox) {
			return;
		}
		// We also need to make sure a killmail involves the proper parties.
		else {
			var doKeep = false;
			var useIDs = (team == 0 ? aIDs : bIDs);
			for (var j = 0; j < data.attackers.length; j++) {
				if (useIDs.includes(data.attackers[j].corporation_id+"") || useIDs.includes(data.attackers[j].alliance_id+"") || useIDs.includes(data.attackers[j].character_id+""))
					doKeep = true;
			}
			if (!doKeep)
				return;
		}
		
		// If this killmail passes the above checks, we want to keep it. First check to make sure we don't have this kill already.
		if (!mailIDs.includes(data.killmail_id)) {
			keptKills.push(data);
			mailIDs.push(data.killmail_id);
		
			// STATS COLLECTION
			// Track total kills
			totalKills[team] += 1;
			
			// Track total kill values
			totalValues[team] += data.zkb.totalValue;
			
			// Track kills per ship per team
				// Topkeks that's gonna be fun
			
			// Track kills per system per team
			var sysID = data.solar_system_id;
			
			if (!systemKills.hasOwnProperty(sysID))
				systemKills[sysID] = {};
			if (team == 0)
				(systemKills[sysID].hasOwnProperty("a")) ? systemKills[sysID].a++ : systemKills[sysID].a = 1;
			if (team == 1)
				(systemKills[sysID].hasOwnProperty("b")) ? systemKills[sysID].b++ : systemKills[sysID].b = 1;
		}
	}
}

function doneFetchingKills() {
	console.log("Cracks knuckles");
	allKills = dbKills.concat(zkbKills);
	
	for (var i = 0; i < allKills.length; i++) {
		parseKillmail(allKills[i]);
		
		var tempInt = ((i/allKills.length)*100);
		$('#load-progress').attr("value", tempInt);
	}
	
	doneParsingKills();
}

function doneParsingKills() {
	console.log("Kill fetch is done");
	
	// Sort kills by date
	keptKills.sort(by('killmail_time'));
	
	// Check if there are any kills
	if (keptKills.length > 0) {
		// Do system name lookups
		loadSystemNames();
	} else {
		$("#load-static").text("No kills were found for this campaign. Git gud.");
		$("#load-text").text("");
		pullStats();
	}
}

function pullStats() {
	$("#load-text").text("Parsing all this info...");
	console.log("Loading everything onto the page");
	
	// TODO At some point, add something to actually display kills
	//for (var i = 0; i < keptKills.length; i++) {}
	
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
	
	console.log("Names in place");
	
	// Replace kill count
	$('#TeamA').find('#kills').text(totalKills[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#kills').text(totalKills[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	console.log("Kill count in place");
	
	// Replace isk values
	$('#TeamA').find('#value').text(totalValues[0].toLocaleString(undefined, {maximumFractionDigits:2}));
	$('#TeamB').find('#value').text(totalValues[1].toLocaleString(undefined, {maximumFractionDigits:2}));
	
	console.log("Isk totals in place");
	/*
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
	}*/
	
	var systemKillTable = "<tr><th style=\"text-align:center\">Team A Kills</th><th style=\"text-align:center\">System name</th><th style=\"text-align:center\">Team B Kills</th></tr>";
	Object.values(systemKills).forEach(function(v) {
		systemKillTable += "<tr><td>" + ((v.a) ? v.a : "---") + "</td><td>" + v.name + "</td><td>" + ((v.b) ? v.b : "---") + "</td></tr>";
	});
	$('#systemKills').append(systemKillTable);
	
	console.log("Systems table in place");
	
	sortTable();
	console.log("Done");
	setTimeout(function() {
		$("#load-text").text("Ready to go");
		$('#loading-page').hide(2000);
		$('#campaign-page').show(2000);
	}, 1000);
	
	uploadSystemsToDB();
}

