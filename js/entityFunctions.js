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
			location.search = "teamA=" + aIDs.toString() + "&teamB=" + bIDs.toString() + "&dates=" + document.getElementById("startDate").value.replace(/-/g,"") + "0000-" + document.getElementById("endDate").value.replace(/-/g,"") + "2300" + (loadOnly ? "&download=true" : "");
		}
	}
}

function nameError(error) {
	$('#createCampaign').removeAttr("disabled");
	console.log("Error while getting IDs: " + error);
	alert("Something went wrong when looking up name IDs: \n" + error);
}

function loadEntityNames(list) {
	console.log("Fetching team names");
	$("#load-text").text("Looking up team IDs");
	
	entityFetchList = [];
	
	if (list) {
		list.forEach(function(item, index) {
			var key = Number(item)
			// Increment our wait variable. If JS won't give me a proper wait function, I'll make it myself
			waitingOnNames++;
			entityDB.where('id', '==', key)
					.get()
					.then(function(snap) {
						if (!snap.empty) {
							console.log("Found entity ID for " + key);
							snap.forEach(function(doc) {
								var temp = {};
								temp.name = doc.data().name;
								temp.type = doc.data().type;
								allIDs[key] = temp;
								
								fetching[key] = {};
								fetching[key].page = 1;
								fetching[key].waiting = 0;
								fetching[key].keepGoing = true;
							});
						} else {
							console.log("Test");
							console.log("Failed to find " + key + ", search ESI for it");
							if (!entityFetchList.includes(key))
								entityFetchList.push(key);
						}
						waitingOnNames--;
					})
					.catch(function(error) {
						console.error("Error in entity id fetch: ", error);
					});
		});
	}
	setTimeout(fetchEntityNames, 1000);
}

function fetchEntityNames() {
	timer = Date.now();
	
	// Make sure all DB calls are complete before trying to fetch data from ESI
	if (waitingOnNames > 0) {
		setTimeout(fetchEntityNames, 100);
		console.log("Waiting on DB for entity names");
		return;
	} else if (entityFetchList.length > 0) {
		console.log("Ready");
		console.log("Entity list: ", entityFetchList);
		
		for (var i = 0; (i*500)<entityFetchList.length;i++) {
			waitingOnNames++;
			var tempList = entityFetchList.slice(i*500, Math.min(((i+1)*500), entityFetchList.length))
			var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
			var fetch = new XMLHttpRequest();
			fetch.onload = parseTeamNames;
			fetch.onerror = reqerror;
			fetch.open('post', url, true);
			fetch.setRequestHeader('Content-Type','application/json');
			fetch.setRequestHeader('accept','application/json');
			fetch.send(JSON.stringify(tempList));
		}
	} else {
		$("#load-text").text("Entity names loaded");
		console.log("Entity fetch is done");
		// Need proper kill fetch function
		setTimeout(loadKillmails(), 1000);
	}
}

function parseTeamNames() {
	var data = JSON.parse(this.responseText);
	var isTest = parseSearch("test");
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Failed to load team names...");
	} else {
		$("#load-text").text("Entity names found...");
		for (var i = 0; i < data.length; i++) {
			var temp = {};
			temp.name = data[i].name;
			temp.type = data[i].category;
			allIDs[data[i].id] = temp;
			temp.id = data[i].id;
			entitiesToUpload.push(temp);
			
			fetching[data[i].id] = {};
			fetching[data[i].id].page = 1;
			fetching[data[i].id].waiting = 0;
			fetching[data[i].id].keepGoing = true;
		}
		waitingOnNames--;
		if (waitingOnNames == 0) {
			$("#load-text").text("Entity names loaded");
			console.log("Entity fetch is done");
			// Need proper kill fetch function
			setTimeout(loadKillmails(), 1000);
		}
		
		if (isTest) {
			getKillsFromDB();
			return;
		}
	}
}
