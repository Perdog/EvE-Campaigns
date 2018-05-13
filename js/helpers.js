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
	return false;
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

function sortTable() {
	var table, rows, switching, i, x1, x2, y1, y2, shouldSwitch;
	
	table = document.getElementById("systemKills");
	switching = true;
	
	console.log("Sorting table start");
	
	/* Make a loop that will continue until
	no switching has been done: */
	while (switching) {
		console.log("Big loop");
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
	
	console.log("Sorting table done");
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

function addField(elem) {
	var item = elem.parentElement.lastElementChild;
	var clone = item.cloneNode(true);
	clone.value = "";
	clone.removeAttribute("required");
	
	elem.parentNode.appendChild(clone);
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

function esiError(error) {
	alert("Failed to load ESI data. CCP servers might be having some troubles, or it could be downtime.\n\nError received: " + error);
}

function resetAllTheThings() {
	namesList = [];
	allIDs = {};
	aIDs = [];
	bIDs = [];
	dates = [];
}

function reqerror(error) {
	console.log("Oh no! Something's wrong!\n" + error);
	$("#load-text").text("Something bad happened somewhere...\n" + error);
}

function dateChange(elem, target, attribute) {
	$(target).attr(attribute, elem.value);
}

