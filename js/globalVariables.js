// Static stuff
var loadOnly = false;
var db = firebase.firestore();
var systemDB = db.collection("systems");
var entityDB = db.collection("entities");
var killsDB = db.collection("killmails");

// Default page stuff
var namesList = [];

// Search query stuff
var allIDs = {};
var aIDs = [];
var bIDs = [];
var dates = [];

// Kills stuff
var dbKills = [];
var zkbKills = [];
var allKills = [];
var keptKills = [];
var fetching = {};

// Stats stuff
var totalKills = [0,0];
var totalValues = [0,0];
var systems = [];
var systemKills = {};
var mailIDs = [];
var timer = 0;

// Trackers for DB and ESI fetching
var systemFetchList = [];
var systemsToUpload = [];
var entityFetchList = [];
var entitiesToUpload = [];

// Counters
var waitingOnSystems = 0;
var waitingOnNames = 0;
var waitingOnDBKills = 0;
var systemUploadCount = 0;
var entityUploadCount = 0;
var killUploadCount = 0;