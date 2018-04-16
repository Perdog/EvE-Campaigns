<!DOCTYPE html>
<html>

<head>
	<link href="https://cdnjs.cloudflare.com/ajax/libs/vis/4.18.1/vis.min.css" rel="stylesheet" type="text/css" />
	<style>
		.dynamic-content {
			display: none;
		}
		
		.row {
			display: flex;
		}
		
		.sidebar {
			flex: 20%
		}
		
		.column {
			flex: 30%;
		}
		
		.titles {
			text-align: right;
		}
	</style>
</head>
<body>

	<div id="default-page" class="dynamic-content">
		<div id="statsHeader">
			<h2 style="text-align:center">
				Kill stats
				<br />
			</h2>
			
			<div class="row">
				<div class="sidebar" id="leftspacer"></div>
				
				<div class="column" id="TeamA">
					<h2 style="text-align:center"><u>Team A</u></h2>
					
					<div class="row" id="statsKills">
						<div class="column">
							<a>Total kills</a>
							<br />
							<a>Total value</a>
						</div>
						<div class="column">
							<a id="kills">4</a>
							<br />
							<a id="value">1,000,000</a>
						</div>
					</div>
				</div>
				
				<div class="column" id="TeamB">
					<h2 style="text-align:center"><u>Team B</u></h2>
					
					<div class="row" id="statsKills">
						<div class="column">
							<a class="titles">Total kills</a>
							<br />
							<a class="titles">Total value</a>
						</div>
						<div class="column">
							<a id="kills">4</a>
							<br />
							<a id="value">1,000,000</a>
						</div>
					</div>
				</div>
				
				<div class="sidebar" id="rightspacer"></div>
			</div>
		</div>
	</div>
	
	<script type="text/javascript" src="https://code.jquery.com/jquery-3.2.0.min.js"></script>
	<!-- Latest compiled and minified JavaScript -->
	<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
	<script type="text/javascript" src="main.js"></script>
</body>

</html>