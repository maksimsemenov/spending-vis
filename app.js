/* global d3 */
/* global document */
/* global Papa */
/* global window */

function Environment (data, rect) {
	this.data = data;
	this.rect = rect;
	this.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	this.monthNamesShort = ["Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
	this.randomColors = d3.scale.category20()
							.domain([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]);
	this.visibility = {chart: false,
					   nav: false,
					   fileLoader: true};
	this.groupeBy = "category";
	this.dropAnimation = "";
	this.hideInfo = "";
	this.dragPosition = "";
	this.closeColor = "";
	this.backgroundColor = "";
	this.cSum = "m";
	this.cQuantity = "q";
	this.grouped = "category";
	this.styleSheet = document.styleSheets[document.styleSheets.length-1];
	this.dropEvent = "";
	this.parseError = false;
	
	this.allData = function() {
		var allData = [];
		if (this.data) {
			for (var i=0, d; i<this.data.length; i++) {
				d = this.data[i];
				if (d.active) {allData = allData.concat(d.values);}
			}
		}
		return allData;
	}.bind(this);
	this.dataByCategory = function() {
		var groupedData = [];
		if (this.allData().length>0){
			groupedData = d3.nest()
				.key(function(d) {return d.category;})
				.sortKeys(d3.ascending)
				.entries(this.allData());
		}
		return groupedData;		
	}.bind(this);
	this.dataBySum = function() {
		var data = this.allData(),
			groupedData = [];
		
		function filterGroup(data, range) {
			return data.filter(function(d) {
				return range[0]<=d.sum && d.sum<=range[1];});
		}
		function createGroup(name, range, data) {
			return {key: name,
					range: range,
					values: filterGroup(data, range).length===0 ? null : filterGroup(data, range)};
		}
		
		if (data.length>0) {
			var groupAmount = data.length/20>8? 8 : data.length/20<4? 4: Math.floor(data.length/20),
				sumMax = Math.ceil(d3.max(data.map(function(d) {return d.sum;}))/10),
				sumMin = Math.floor(d3.min(data.map(function(d) {return d.sum;}))/10),
				sumStep = Math.ceil((sumMax-sumMin)/groupAmount);

			for (var i=0, range, key; i<groupAmount; i++) {
				range = [(sumMin+i*sumStep)*10, (sumMin + (i+1)*sumStep)*10];
				key = i===0? "Less than "+range[1].toLocaleString("en-US", {style: "currency", currency: "USD"}) :
				i==groupAmount-1 ? "More than "+range[0].toLocaleString("en-US", {style: "currency", currency: "USD"}) :
				range[0].toLocaleString("en-US", {style: "currency", currency: "USD"}) + " \u2014 " + range[1].toLocaleString("en-US", {style: "currency", currency: "USD"});
				groupedData[i] = createGroup(key, range, data);
			}
		}
		return groupedData;
	}.bind(this);
	this.dataByDate = function() {
		var data = this.allData();
		if (data.length<1) {return [];}
		var groupedData = [];
		var dateRange = d3.extent(data.map(function(d) {return d.date;})),
			weeks = Math.floor((dateRange[1]-dateRange[0])/(86400000*7)),
			startDate, range, i;

		function filterGroup(data, range) {
			return data.filter(function(d) {
				return range[0]<=d.date && d.date<=range[1];});
		}
		function createGroup(name, range, data) {
			return {key: name,
					range: range,
					values: filterGroup(data, range).length===0 ? null : filterGroup(data, range)};
		}

		if (weeks <= 8) {
			startDate = new Date(dateRange[0].getFullYear(), dateRange[0].getMonth(), dateRange[0].getDate());
			startDate = dateRange[0].getDay() === 1? startDate : new Date(startDate.getTime() - 86400000*(dateRange[0].getDay()>0? (dateRange[0].getDay()-1) : 6));

			for (i=0; i<weeks; i++) {
				range = [new Date(startDate.getTime()+i*7*86400000), new Date(startDate.getTime()+(i+1)*7*86400000-1)];
				groupedData[i] = createGroup(env.monthNamesShort[range[0].getMonth()] +" "+ range[0].getDate() +" — "+ env.monthNamesShort[range[1].getMonth()] +" "+ range[1].getDate(),
											 range,
											 data);
			}
		} 
		else {
			startDate = new Date(dateRange[0].getFullYear(), dateRange[0].getMonth());
			var months = dateRange[1].getMonth() - dateRange[0].getMonth() + 1;
			for (i=0; i<months; i++) {
				range = [new Date(startDate.getFullYear()+Math.floor(i/11), startDate.getMonth()+i), new Date(startDate.getFullYear()+Math.floor(i/11), startDate.getMonth()+1+i, 0)];
				groupedData[i] = createGroup(env.monthNames[range[0].getMonth()], range, data);
			}
		}	

		return groupedData;
	}.bind(this);
	
	this.categories = function() {
		var categories = [];
		if (this.allData().length>0) {
			var groupedData = d3.nest()
				.key(function(d) {return d.category;})
				.sortKeys(d3.ascending)
				.entries(this.allData());
			categories = d3.keys(groupedData);
		}
		return categories;
	}.bind(this);
	this.sums = function() {
		var sums = [];
		if (this.allData().length > 0) {
			sums = this.allData().map(function(d) {return d.sum;});
		}
		return sums;
	}.bind(this);
	this.dates = function() {
		var dates = [];
		if (this.allData().length>0) {
			dates = this.allData().map(function(d) {return d.date;});
		}
		return dates;
	}.bind(this);
	this.addData = function(newData) {
		this.data.push(newData);
		//for (var i=0; i<this.data.length; i++) {
		window.localStorage.setItem("data", JSON.stringify(this.data));
	}.bind(this);
	this.clearData = function() {
		this.data = [];
		window.localStorage.removeItem("data");
	}
	
	this.normalizeDate = function() {
		for (var i=0, values; i<this.data.length; i++) {
			values = this.data[i].values; 
			for (var k=0, d; k<values.length; k++) {
				d=values[k];
				d.date = new Date(d.date);
			}
		}
	}.bind(this);
	
	this.colors = d3.scale.category20c()
		.domain(this.categories());
	
	this.radius = function(d) {
		var h = this.rect.node().getBoundingClientRect().height,
			w = this.rect.node().getBoundingClientRect().width,
			n = this.allData().length>0? this.allData().length : 1,
			medianSum = this.sums().length>0 ? d3.median(this.sums()) : 1,
			maxSum = this.sums().length>0 ? d3.max(this.sums()) : 1,
			rMax = Math.round(Math.sqrt(h*w/n)*maxSum/(3*medianSum));
					
		var radius = d3.scale.linear()
			.domain(d3.extent(this.sums().map(function(s) {return Math.sqrt(s);})))
			.range([3, rMax>50? 50 : rMax]);
		
		return radius(d);
		
	}.bind(this);	
}

function showDataInRect (rect) {
	var data = env.grouped === "category" ? env.dataByCategory() : env.grouped === "date" ? env.dataByDate() : env.dataBySum();
	
	var h = Math.floor(rect.node().getBoundingClientRect().height),
		w = Math.floor(rect.node().getBoundingClientRect().width),
		n = data.length;

	var r = Math.round(Math.sqrt(h*w/n/Math.PI)),
		cols = Math.round(w/(2*r)),
		rows = n%cols !== 0 ? Math.floor(n/cols)+1 : n/cols;
	
	if (rows*r*2 > h) {
		r = Math.floor(h/rows/2);
		cols = Math.floor(w/(2*r));
		rows = n%cols !== 0 ? Math.floor(n/cols)+1 : n/cols;
	}
	
	var marginH = Math.round((w-cols*r*2)/cols),
		marginV = Math.round((h-rows*r*2)/rows);

	var	maxChild = d3.max(data.map(function(d) {return d.values ? d.values.length : 0;})),
		rMax = Math.round(Math.sqrt(Math.PI*r*r/maxChild));

	var radius = d3.scale.linear()	
		.domain(d3.extent(env.sums().map(function(s) {return Math.sqrt(s);})))
		.range([2, rMax>60? 60 : rMax]);
	
	function transactions(data) {
		if (!data.values) {return null;}
		var childrens = [];
		data.values.forEach(function(d) {
			childrens.push({value: Math.sqrt(d.sum),
							category: d.category,
							date: d.date,
							description: d.description,
							sum: d.sum,
						   	id: d.description.slice(0,1) + d.sum + d.date.getFullYear()+ d.date.getMonth() + d.date.getDate() + Math.round(Math.random()*100)});});
		return {children: childrens};
	}

	var categories = rect.selectAll(".categories")
		.data(data, function(d) {return d.key;});
	
	categories
		.attr("transform", function(d, i) {return "translate(" +((r*2+marginH)*(i%cols))+ "," +((2*r+marginV*0.7)*Math.floor(i/cols)+10)+ ")";});

	categories
		.enter()
		.append("g")
		.style("opacity", 0)
		.attr("class", "categories")
		.attr("transform", function(d, i) {return "translate(" +((r*2+marginH)*(i%cols))+ "," +((2*r+marginV*0.7)*Math.floor(i/cols)+10)+ ")";})
		.style("opacity", 1);

	categories
		.exit()
		.transition()
		.duration(300)
		.style("opacity", 0)
		.remove();

	var bubble = d3.layout.pack()
		.size([2*r, 2*r])
		.padding(0.1)
		.sort(function(a, b) {return a.date>=b.date? 1 : -1;})
		.radius(function(d) {return radius(d);});
	
	showTrs();
	showCSums();
	showCQuantity();
	showCTitles();
	
	function showTrs() {

		var trs = categories
			.selectAll(".trs")
			.data(function(d) {return transactions(d)? bubble.nodes(transactions(d)).filter(function(d) {return !d.children;}) : [];},
				  function(d) {return d.id;});
		
		trs.attr("cx", function(d) {return d.x;})
			.attr("cy", function(d) {return d.y;})
			.attr("fill", function(d) {return env.colors(d.category);})
			.attr("r", function(d) {return d.r;});

		trs.enter()
			.append("circle")
			.attr("class", "trs")
			.attr("r", 0)
			.attr("cx", function(d) {return d.x;})
			.attr("cy", function(d) {return d.y;})
			.attr("stroke", "white")
			.attr("fill", function(d) {return env.colors(d.category);})
			.transition()
			.attr("r", function(d) {return d.r;});
			

		trs.exit()
			.transition()
			.attr("r", 0)
			.remove();

		trs.on("mouseover", function(data) {
			this.parentNode.appendChild(this);
			trs.transition()
				.attr("r", function(d) {return d==data? d.r+3 : d.r;});
			
			showInfo(data, d3.event);
		});
		trs.on("mouseout", function() {
			this.parentElement.insertBefore(this, this.parentElement.getElementsByClassName("c-sum")[0]);
			trs.transition()
				.attr("r", function(d) {return d.r;});

			hideInfo(d3.event);});
	}
	function showCTitles() {
		var cTitles = categories.selectAll(".c-title")
			.data(function(d) {return [d.key];}, function(d) {return d;});
	
		cTitles
			.text(function(d) {return d;});

		cTitles.enter()
			.append("text")
			.text(function(d) {return d;})
			.attr("class", "c-title")
			.attr("transform", "translate(50, 10)")
			.style("opacity", 0)
			.transition()
			.duration(300)
			.style("opacity", 1);

		cTitles.exit()
			.transition()
			.style("opacity", 0)
			.remove();
	}
	function showCSums() {
		
		var cSum = categories.selectAll(".c-sum")
				.data(function(d) {var sum;
								   var percent;
								   if (d.values) {
										sum = Math.floor(100*d.values.map(function(d) {return d.sum;}).reduce(function(p, c) {return p + c;}))/100;
										var fullSumm = Math.floor(100*env.allData().map(function(d) {return d.sum;}).reduce(function(p, c) {return p + c;}))/100;
								   percent = Math.floor(sum*1000/fullSumm)/10;
								   }
								   var sumString = sum? (env.cSum=="m" ? Math.round(sum).toLocaleString("en-US", {style: "currency", currency: "USD"}) : percent.toString() + "%") : "";
								   return [sumString];},
					  function(d) {return d;});

		cSum
			.text(function(d) {return d;});

		cSum.enter()
			.append("text")
			.text(function(d) {return d;})
			.attr("class", "c-sum")
			.attr("transform", "translate(50, 28)")
			.style("opacity", 0)
			.transition()
			.duration(300)
			.style("opacity", 1);

		cSum.exit()
			.transition()
			.style("opacity", 0)
			.remove();
		
		cSum.on("click", function() {
				d3.event.stopPropagation();
				d3.event.preventDefault();
				env.cSum = env.cSum=="m" ? "p" : "m";
				showCSums();
		});
	}
	function showCQuantity() {
		var cQuantity = categories.selectAll(".c-quantity")
				.data(function(d) {var q;
								   var percent;
								   if (d.values) {
										q = d.values.length;
									   var fullQ = env.allData().length===0? 1 : env.allData().length;
									   percent = fullQ===1? null : Math.floor(q*1000/fullQ)/10;
								   }
								   var qString = q? (env.cQuantity=="q" ? (q===1 ? q + " tran." : q + " trans.") : percent.toString() + "%") : "";
								   return [qString];},
					  function(d) {return d;});

		cQuantity
			.text(function(d) {return d;});

		cQuantity.enter()
			.append("text")
			.text(function(d) {return d;})
			.attr("class", "c-quantity")
			.attr("transform", "translate(50, 43)")
			.style("opacity", 0)
			.transition()
			.duration(300)
			.style("opacity", 1);

		cQuantity.exit()
			.transition()
			.style("opacity", 0)
			.remove();
		
		cQuantity.on("click", function() {
			d3.event.stopPropagation();
			d3.event.preventDefault();
			env.cQuantity = env.cQuantity=="q" ? "p" : "q";
			showCQuantity();
		});
	}	
}

function showInfo(data, event) {
	var targetRect = event.target.getBoundingClientRect(),
		bodyRect = document.body.getBoundingClientRect(),
		height = ruleForSelector("#infopanel", env.styleSheet.cssRules)? parseInt(ruleForSelector("#infopanel", env.styleSheet.cssRules).style.height) : 100,
		width = ruleForSelector("#infopanel", env.styleSheet.cssRules)? parseInt(ruleForSelector("#infopanel", env.styleSheet.cssRules).style.width) : 240,
		panelRect = {height: height, width: width};
	
	function vector(tr, r, br) {
		var dx = tr.width/2*(1-1/Math.sqrt(2)),
			x, y, corner;
		
		x = tr.right - dx + 3 + r.width;
		y = tr.top + dx - 3 - r.height;
		corner = [1, 0];
		
		if (x>br.width) {x = br.width - r.width - 30;
		} else {x = tr.right - dx + 3;}
		
		if (y<40) {
			y = tr.bottom - dx + 3;
			corner[1] = 1;
		}
		
		return {x: x, y: y, corner: corner};
	}
	if (env.hideInfo) {window.clearInterval(env.hideInfo);}
	document.getElementById("trDescription").innerHTML = data.description;
	document.getElementById("trSum").innerHTML = Math.floor(data.sum).toLocaleString("en-US", {style: "currency", currency: "USD"});
	document.getElementById("trDate").innerHTML = env.monthNamesShort[data.date.getMonth()] + " " +  data.date.getDate() +  /*data.date.getFullYear() +*/ " &middot; " + data.category;
	
	var panel = document.getElementById("panel");
	panel.style.borderColor = env.colors(data.category);
	
	var v = vector(targetRect, panelRect, bodyRect);
	
	var infoPanel = document.getElementById("infoPanel");
	infoPanel.style.left = v.x;
	infoPanel.style.top = v.y;
	if (v.corner[0] === 0) {panel.classList.add("r"); panel.classList.remove("l");}
	else {panel.classList.add("l"); panel.classList.remove("r");}
	if (v.corner[1] === 0) {panel.classList.add("b"); panel.classList.remove("t");}
	else {panel.classList.add("t"); panel.classList.remove("b");}
	infoPanel.classList.remove("hidden");
}
function hideInfo(e) {
	document.getElementById("infoPanel").classList.add("hidden");
}

function parseData (initialData) {
	var data = [];
	for (var i=0; i<initialData.lenght; i++) {
		data.push({
			sum: 'sum',
			category: 'category',
			description: 'description',
			date: 'date'
		});
	}
	return data;
}
function generateData (amount) {
	var lowCats = ['Gasoline', 'Merchandise', 'Supermarkets', 'Pharmacy', 'Household', 'Transportation'];
	var middleCats = ['Entertainment', 'Supermarkets', 'Restaurants', 'Household', 'Clothes', 'Service',];
	var hightCats = ['Payments and Credits', 'Medicine', 'Travel', 'Education'];
	var descriptions = {
		"Payments and Credits": ["JPMorgan Chase", "Bank of America", "Citigroup", "Wells Fargo", "Capital One", "BB&T"],
		"Medicine": ["Adirondack Medical Center", "Auburn Community Hospital", "Blythedale Children's Hospital", "Oscar's Health", "MedLife", "Tribeca Smiles", "Premier Dental Associates of Lower Manhattan", "Lambert Pediatric Dentistry"],
		"Travel": ["American Airlines", "Brussels Airlines", "United Airlines", "Cosmopolitan Hotel Tribeca", "Duane Street Hotel", "The Greenwich Hotel", "The James New York", "Sheraton Tribeca New York Hotel", "Conrad New York"],
		"Gasoline": ["Amoco", "BP", "Buc-ee", "Chevron", "Circle K", "Citgo", "Clark Brands", "Conoco", "Costco brand gasoline", "Cumberland Farms"],
		"Merchandise": ["Obriens Market", "Plum Market", "R Ranch Markets", "Nob Hill Foods", "Red Apple", "Rice Supermarkets", "Riesbeck Food Markets", "Roche Bros"],
		"Entertainment": ["African Grove", "Chelsea Theater Center", "The Flea Theater", "Hippodrome Theatre", "Imperial Theater", "New York City Center", "New York Theatre Workshop", "The Town Hall", "Theater For The New City", "Film Forum", "IFC Center", "Regal Cinemas Battery Park 11", "A7", "Angels & Kings", "Area", "Chicago City Limits", "Marquee", "Slipper Room", "Dizzy's Club Coca-Cola"],
		"Supermarkets": ["Albertsons", "Kroger", "Walmart Supercenters", "D'Agostino Supermarkets", "Festival Foods", "Food Giant"],
		"Pharmacy": ["Bartell Drugs", "CVS Pharmacy", "Dakota Drug", "Discount Drug Mart", "Duane Reade", "Family Pharmacy", "Fruth Pharmacy", "Good Neighbor Pharmacy", "Health Mart", "Jean Coutu"],
		"Restaurants": ["15 East", "2nd Ave Deli", "ABC Kitchen", "Aldea", "Annisa", "Ayada", "Balaboosta", "Balthazar", "Barney Greengrass", "Black Seed", "Blue Hill", "Boqueria", "Brick Lane Curry House", "Brushstroke", "Buttermilk Channel", "Buvette", "Café Boulud", "Cosme", "Daniel", "DBGB", "Del Posto", "Dovetail", "Elan", "Eleven Madison Park", "Empellón Cocina", "Fatty 'Cue", "Fedora", "Fette Sau", "Frankies 457 Spuntino", "Franny's", "Gotham Bar and Grill", "Hecho en Dumbo", "Hide-Chan Ramen", "Hill Country", "Il Buco Alimentari & Vineria", "Ilili", "Ippudo NY", "Junoon", "Kajitsu", "Takashi", "Tamarind Tribeca", "Tanoreen", "Taqueria Coatzingo", "Telepan", "Tertulia", "The Breslin Bar & Dining Room", "The Commodore", "The Dutch", "The John Dory Oyster Bar", "The Kitchen at Brooklyn Fare", "The NoMad", "The Spotted Pig", "Torrisi Italian Specialties", "Txikito", "Uncle Boons", "Union Square Cafe", "Ushiwakamaru", "Xi'an Famous Foods", "Zabb Elee"],
		"Household": ["Linens 'n Things", "Rhodes Furniture", "Seamans Furniture", "Wickes Furniture", "IKEA", "S. H. Kress", "Shopper's City", "Sky City", "Sprouse-Reitz", "TG&Y", "Lafayette Radio", "Lechmere", "Radio Shack", "Best Buy", "The Warehouse", "Video Concepts", "Ultimate Electronics"],
		"Clothes": ["Abercrombie and Fitch", "Hollister", "American Eagle", "Nike", "Forever21", "Aeropostale", "Ralph Lauren", "H & M", "ZARA", "Victoria's Secret", "All American Clothing", "American Apparel", "Black Halo", "Brooks Brothers", "Carhartt", "Emerson Fry", "Hanky Panky", "Hart Schaffner Marx", "Hickey Freeman", "Imogene and Willie", "Left Field", "Nanette Lepore", "Pendleton Woolen Mills", "Pointer Brand", "Raleigh Denim", "Taylor Stitch", "Todd Shelton", "Wild Fox", "Alden", "Allen Edmonds", "Capps Shoe Company", "The Frye Company", "Munro Shoes", "New Balance", "Oakstreet Bootmakers", "Quoddy", "Rancourt and Company", "Red Wing Heritage line", "Russell Moccasin Co.", "Fear of God LA", "Freemans Sporting Club", "Gitman Brothers", "Gray (by Saks 5th Ave)", "Helmut Lang", "J. Lawrence Khakis", "James Perse", "Johnson Woolen Mills", "Kokatat", "Live Nation", "LL Bean", "Local Green", "Marine Layer", "Mister California", "Mister Turk by Trina Turk", "Montana Woolen Shop", "Oak Street Bootmakers", "Ovadia & Sons", "Orvis", "Patrick Ervell"],
		"Service": ["White On White Cleaners Corporation", "Handy.com", "Brown Bag Laundry Corporation", "Laundry Service", "Laundry By Shelli Segal", "The Laundry Center", "Home Clean Home", "Homejoy", "ServiceMaster Recovery by L & M", "Clean Cut Movers NYC", "Clean Popo"],
		"Transportation": ["MTA", "Herts", "Uber", "Get Taxi", "Taxi", "Cars and truks Service"],
		"Education": ["Coursera", "Linda School", "Now How School", "Code Mentors", "Stanford Online Courses", "Edx", "EF English Schools", "Kopelan"]				
	};

	var data = [];
	for (var i=0; i<amount; i++) {
		var currentDate = new Date();
		var date = new Date(2015, 
							Math.round(Math.random()*currentDate.getMonth()),
							Math.round(Math.random()*(currentDate.getDate()-1)+1),
							Math.round(Math.random()*24),
							Math.round(Math.random()*60));
		var r = Math.floor(Math.random()*80)/10+1;
		var sum = Math.floor(1000 * Math.pow((Math.sin((r*2+2)/3)+Math.cos(1/r + 3) + Math.pow(r, 2/3)/1.2), 4))/100;
		var category = sum>800 ? hightCats[Math.floor(Math.random()*hightCats.length)] : sum>80 ? middleCats[Math.floor(Math.random()*middleCats.length)] : lowCats[Math.floor(Math.random()*lowCats.length)];
		data.push({
			sum: sum,
			category: category,
			description: descriptions[category][Math.floor(Math.random()*descriptions[category].length)],
			date: date
		});
	}
	return data;
}

function init() {
	var svg = d3.select("#logo").append("svg")
		.attr("width", d3.select("#logo").node().getBoundingClientRect().width)
		.attr("height", d3.select("#logo").node().getBoundingClientRect().height);
	env.logo = svg;
	
	var ls = window.localStorage;
	if (ls) {
		if (ls.getItem("data")) {
			env.data = JSON.parse(ls.getItem("data"));
			env.normalizeDate();
			if (ls.getItem("grouped")) {
				env.grouped = ls.getItem("grouped");
			}
			document.getElementById("bg").classList.add("hidden");
			showChartArea();
			showNavigation();
			showLogo("color");
			showDataInRect(env.rect);
		}
		else {
			showBackground();	
		}
	}
	else {
		showBackground();
	}
	setCloseStyle();
	initGenButton();
	setHandlers(document.body);
	setActive(env.grouped);
	window.addEventListener("resize", handleResize, false);
	setUnderlineStyle();	
}
function initGenButton() {
	var button = document.getElementById("genbtn");
	button.addEventListener("mouseenter", handleGenMouseEnter, false);
	button.addEventListener("mouseleave", handleGenMouseLeave, false);
}
function setHandlers(el) {
	if (el) {
		el.addEventListener("dragenter", handleDragEnter, true);
		el.addEventListener("dragover", handleDragOver, true);
		el.addEventListener("dragleave", handleDragLeave, true);
		el.addEventListener("drop", handleDrop, true);
		el.addEventListener("click", handleClick, false);
		return true;
	}	
}

function handleGenMouseEnter(e) {
	e.stopPropagation();
	circleIn(e.target, [e.offsetX, e.offsetY], "white", clearDiv);
	e.target.style.color = env.backgroundColor;
	if (ruleForSelector("#genbtn:hover", env.styleSheet.cssRules)) {
		ruleForSelector("#genbtn:hover", env.styleSheet.cssRules).style.color = env.backgroundColor;
		console.log(env.backgroundColor, ruleForSelector("#genbtn:hover", env.styleSheet.cssRules).style.color);
	}
	
}
function handleGenMouseLeave(e) {
	e.stopPropagation();
	e.preventDefault();
	e.target.style.color = "rgba(255,255,255,0.7)";
	var divs = e.target.getElementsByTagName("div");
	for (var i=0, div; i<divs.length; i++) {
		div = divs[i];
		div.parentNode.removeChild(div);
	}
}
function handleClick(e) {
	e.stopPropagation();
	
	//Close button click
	if (e.target == document.getElementById("close")) {
		var x = e.target.getBoundingClientRect().left + e.target.getBoundingClientRect().width/2;
		var y = e.target.getBoundingClientRect().top + e.target.getBoundingClientRect().height/2;
		if (env.parseError) {
			hideBackground([x, y]);
			hideCaption();
			hideGenButton();
			env.parseError = false;
		}
		else {			
			showBackground([x, y], env.closeColor);
			setCloseStyle();
			env.clearData();
			showCaption();
			showGenButton();
		}
	}
	
	//Gen Button click
	else if (e.target == document.getElementById("genbtn")) {
		env.addData({name: "Generated Data",
					 active: true,
					 values: generateData(250)});
		hideCaption();
		hideGenButton();
		hideBackground([e.screenX, e.screenY]);
		showDataInRect(env.rect);
	}
	
	//Grouped click
	else if (e.target.classList.contains("group") || e.target.parentNode.classList.contains("group")) {
		if (env.grouped != e.target.getAttribute("data-group")) {
			env.grouped = e.target.getAttribute("data-group");
			window.localStorage.setItem("grouped", env.grouped);
			showDataInRect(env.rect);
			setActive(env.grouped);
			setUnderlineStyle();
		}
	}
	
	else if (e.target == document.getElementById("bg") ||
			 e.target == document.body ||
			 (!e.target.classList.contains("c-sum") && 
			  !e.target.classList.contains("trs") && 
			  !e.target.classList.contains("c-title") &&
			  !e.target.classList.contains("c-quantity") &&
			  e.target !== document.getElementById("logo"))) {
		var filesInput = document.getElementById("filesInput");
		if (!filesInput) {		
			filesInput = document.createElement("input");
			filesInput.type = "file";
			filesInput.multiple="true";
			filesInput.hidden=true;
			filesInput.accept="application/pdf, text/csv";
			filesInput.id="filesInput";
			filesInput.addEventListener("change", function(e) {handleFiles(e.target.files);}, false);
			document.body.appendChild(filesInput);
		}
		filesInput.click();
	}
}
function handleDragOver(e) {
	e.stopPropagation();
	e.preventDefault();
	env.dragPosition = [e.screenX, e.screenY];
}
function handleDragEnter(e) {
	e.stopPropagation();
	e.preventDefault();
	document.getElementsByClassName("dragzone")[0].classList.add("locked");
	e.dataTransfer.dropEffect = "none";
	
	if (e.target == document.body && isDraggingFiles(e)) {
		if (env.data.length>0) {
			if (!document.getElementById("circle")) {
				showBackground([e.screenX, e.screenY]);				
				window.setTimeout(startDropAnimation, 700);
			}
		}
		else {
			hideCaption();
			hideGenButton();
			startDropAnimation();
		}
		e.dataTransfer.dropEffect = "copy";
	}
}
function handleDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	stopDropAnimation();
	env.dropEvent = e;
	document.getElementsByClassName("dragzone")[0].classList.remove("locked");
	handleFiles(e.dataTransfer.files);
}
function handleDragLeave(e) {
	if (e.target == document.body) {
		e.stopPropagation();
		e.preventDefault();
		stopDropAnimation();
		
		if (env.data.length>0) {
			hideBackground(env.dragPosition);
		}
		else {
			window.setTimeout(function() {showCaption(); showGenButton();}, 400);
		}
		
		document.getElementsByClassName("dragzone")[0].classList.remove("locked");
	}
}

function handleResize() {
	normilizeBgSize();
	showDataInRect(env.rect);
}	
function handleFiles(files) {
	function parseResults(results) {
		if (transformData(results)) {
			env.addData({name: file.name,
					 active: true,
					 values: transformData(results)});
			showDataInRect(env.rect);
			if (document.getElementById("circle").classList.contains("in")) {
				hideBackground([env.dropEvent.screenX, env.dropEvent.screenY]);
			}
		}
		else {
			if (env.data.length>0) {
				if (document.getElementById("circle").classList.contains("in")) {
					hideBackground([env.dropEvent.screenX, env.dropEvent.screenY]);
				}
				showParsingError();
			}
			else {
				showCaption();
				showGenButton();
				showParsingError();
				env.parseError = false;
			}
		}
	}
	
	for (var i=0, file; i<files.length; i++) {
		file = files[i];
		if (file.type == "text/csv") {
			Papa.parse(file, {
				dynamicTyping: true,
				header: true,
				complete: parseResults		
			});
		}
	}
}	
function transformData(results) {
	var parsedData = results.data;
	var data = [];
	
	for (var i=0, r; i<parsedData.length; i++) {
		r = parsedData[i];		
		if (r.Amount) {
			var description = r.Description? r.Description.toLowerCase() : "";			
			description = description.replace(/\s?[\w\d]+\-?\d+\-?[\w\d]+\-?/g, "");
			description = description.replace(/(\s[\#\[\]\(\)]\s)|\*/g, " ");
			description = description.replace(/corp/g, function(str) {return str + ".";});
				//|(\s[\#\[\]\(\)]\s) \b\w*\S?[\d\-\*\.\#]{5,}\w*\b
			//description = description.substring(0,1).toUpperCase() + description.substring(1).toLocaleLowerCase();
			description = description.replace(/\b[a-zA-Z\.]{2,}\b/g, function(str) {return str.slice(0,1).toUpperCase() + str.slice(1).toLowerCase();});
			description = description.replace(/[^\&]\s[a-zA-Z]{2}\b/g, function(str) {return str.slice(0,1) + ", " + str.slice(1).toUpperCase();});
			description = description.replace(/\s[\,\.\?\!\:\;]/g, function(str) {return str.slice(1);});
			description = description.replace(/\s\w[\s\-]/g, function(str) {return str.slice(0,1) + str.slice(1,2).toUpperCase() + str.slice(2);});
			description = description.replace(/\s\-\s/g, " — ");
			
			data.push({
				sum: Math.floor(r.Amount*100)/100,
				category: r.Category,
				description: description,
				date: new Date(r["Post Date"])});
		}
	}
	
	return data.length>0? data : false;
}

function svgForSelector(selector) {
	var container = d3.select(selector);
	if (!container.empty()) {
		var svg = container.select("svg");
		if (!svg.empty()) {return svg;}
		else {
			svg = container.append("svg")
				.attr("height", container.node().getBoundingClientRect().height)
				.attr("width", container.node().getBoundingClientRect().width);
			return svg;
		}
	}
	return "Can't find container: " + selector;
}

function showBackground(point, color) {
	var bg = document.getElementById("bg");
	if (bg) {
		var bodyRect = document.body.getBoundingClientRect();	
		var x = point ? point[0] : Math.floor(Math.random()*bodyRect.width);
		var y = point ? point[1] : Math.floor(Math.random()*bodyRect.height);
		var h = bodyRect.height;
		var w = bodyRect.width;

		var r = bg.style.height = bg.style.width = w >= h ? (x>w-x? 2*x : 2*(w-x)) : (y>h-y ? 2*y : 2*(h-y));
		bg.style.top = y-r/2;
		bg.style.left = x-r/2;
		
		env.backgroundColor = color ? color: env.randomColors(Math.floor(Math.random()*10));
	
		if (bg.classList.contains("hidden")) {bg.classList.remove("hidden");}

		var circle = document.createElement("div");
		circle.id = "circle";
		bg.appendChild(circle);
		circle.addEventListener("animationend", handleAnimationEnd, false);
		circle.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
		circle.style.backgroundColor = color? color : env.backgroundColor;
		circle.classList.add("abs-centered", "in", "locked");
		showLogo("white");
		hideNavigation();
	}
	else {console.log("Couldn't find ", bg);}
}
function hideBackground(point) {
	var bg = document.getElementById("bg");
	var circle = document.getElementById("circle");
	if (circle) {
		if (point) {
			if (bg) {
				var bodyRect = document.body.getBoundingClientRect();

				var x = point ? point[0] : Math.floor(Math.random()*bodyRect.width);
				var y = point ? point[1] : Math.floor(Math.random()*bodyRect.height);
				var h = bodyRect.height;
				var w = bodyRect.width;
				
				var r = bg.style.height = bg.style.width = w >= h ? (x>w-x? 2*x : 2*(w-x)) : (y>h-y ? 2*y : 2*(h-y));
				bg.style.top = y-r/2;
				bg.style.left = x-r/2;				
			}
		}				
		circle.addEventListener("animationend", handleAnimationEnd, false);
		circle.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
		circle.classList.remove("in");
		circle.classList.add("abs-centered", "out");
		
		window.setTimeout(function() {
			showLogo("color");
			showNavigation();
			showChartArea();
		}, 200);
	}
	else {console.log("Couldn't find element: ", circle);}
}

function startDropAnimation() {
	var el = document.getElementById("circle");
	if (el) {
		addCircle(el);
		env.dropAnimation = window.setTimeout(function() {addCircle(el);}, 900);
	}
	else {
		console.log("DropAnimation. Couldn't find ", el);
	}
	function addCircle(el) {
		var round = document.createElement("div");
		el.appendChild(round);
		round.classList.add("abs-centered", "drag-animation", "locked");
	}
}
function stopDropAnimation() {
	if (env.dropAnimation) {window.clearInterval(env.dropAnimation);}
	var circles = document.getElementsByClassName("drag-animation");
	for (var i=circles.length-1, c; i>=0; i--) {
		c = circles[i];
		if (c) {c.parentNode.removeChild(c);}
	}
}

function showLogo(type) {
	var radius = d3.scale.linear()
			.domain([0,10])
			.range([1,5]),

		frame = env.logo.node().getBoundingClientRect(),
		circles = env.logoData? env.logoData : generateLogo(28),

		bubble = d3.layout.pack()
			.size([frame.height, frame.width])
			.padding(0.5)
			.sort(function(a, b) {return a.index>=b.index? 1 : -1;})
			.radius(function(d) {return radius(d);});

	function paintLogo(data, rect) {
		var circles = rect.selectAll("circle")
		.data(bubble.nodes({children: data}).filter(function(d) {return !d.children;}));

		circles.transition()
			.duration(500)
			.attr("fill", function(d) {return type === "color"? env.randomColors(d.opacity) : "#ffffff";})
			.style("opacity", function(d) {return type === "color"? 1 : (d.opacity/20>0.5? d.opacity/20 : d.opacity/20+0.5);});

		circles.enter()
			.append("circle")
			.attr("class", "locked")
			.attr("r", 0)
			.attr("cx", function(d) {return d.x;})
			.attr("cy", function(d) {return d.y;})
			.style("opacity", 0)
			.attr("fill", function(d) {return type === "color"? env.randomColors(d.opacity) : "#ffffff";})
			.transition()
			.duration(700)
			.style("opacity", function(d) {return type === "color"? 1 : (d.opacity/20>0.5? d.opacity/20 : d.opacity/20+0.5);})
			.attr("r", function(d) {return d.r;});
	}	
	function newCircle() {
		return {value: Math.floor(Math.random()*10),
				index: Math.random()*20,
				opacity: Math.floor(Math.random()*20)};
	}	
	function generateLogo(amount) {
		var circles = [];
		for (var i=0; i<amount; i++) {
			circles.push(newCircle());
		}
		return circles;
	}	

	env.logo.attr("class", "locked");
	paintLogo(circles, env.logo);
}
function showCaption(text) {
	
	var caption = document.getElementsByTagName("h1")[0];
	caption.innerHTML = text? text : "Drop your .csv file here";
	caption.classList.remove("fade-out", "hidden");
	caption.classList.add("fade-in");
}
function hideCaption() {
	var h1 = document.getElementsByTagName("h1")[0];
	h1.classList.remove("fade-in");
	h1.addEventListener("animationend", handleAnimationEnd, false);
	h1.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
	h1.classList.add("fade-out");
}
function showGenButton() {
	var btn = document.getElementById("genbtn");
	btn.classList.remove("fade-out", "hidden");
	btn.classList.add("btn-in");
}
function hideGenButton() {
	var btn = document.getElementById("genbtn");
	btn.classList.remove("fade-in");
	btn.addEventListener("animationend", handleAnimationEnd, false);
	btn.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
	btn.classList.add("fade-out");
}
function showNavigation() {
	var nav = document.getElementById("nav");
	var close = document.getElementById("close");
	if (env.parseError) {
		close.classList.remove("fade-out", "hidden");
		close.classList.add("fade-in");
	}
	else {
		nav.classList.remove("fade-out", "hidden");
		nav.classList.add("fade-in");
		close.classList.remove("fade-out", "hidden");
		close.classList.add("fade-in");
	}		
}
function hideNavigation() {
	var nav = document.getElementById("nav");
	nav.classList.remove("fade-in");
	nav.addEventListener("animationend", handleAnimationEnd, false);
	nav.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
	nav.classList.add("fade-out");

	var close = document.getElementById("close");	
	close.classList.remove("fade-in");
	close.addEventListener("animationend", handleAnimationEnd, false);
	close.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
	close.classList.add("fade-out");
}
function showChartArea() {
	var chart = document.getElementById("chart");
	chart.classList.remove("fade-out", "hidden");
	chart.classList.add("fade-in");
}
function clearChart() {
	var chart = document.getElementsById("chart");
	chart.classList.remove("fade-in");
	chart.addEventListener("animationend", handleAnimationEnd, false);
	chart.addEventListener("webkitAnimationEnd", handleAnimationEnd, false);
	chart.classList.add("fade-out");
}
function showParsingError() {
	var err = document.getElementById("error");
	err.classList.remove("hidden", "fade-out");
	err.classList.add("fade-in");
	window.setTimeout(function() {
		err.classList.remove("fade-in");
		err.classList.add("fade-out");
	}, 2000);
}
	

function circleIn(el, point, color, animFunction) {
	if (el) {
		var elRect = el.getBoundingClientRect();		
		var x = point ? point[0] : Math.floor(Math.random()*elRect.width);
		var y = point ? point[1] : Math.floor(Math.random()*elRect.height);
		var h = elRect.height;
		var w = elRect.width;
		
		var container = document.createElement("div");
		container.style.position = "absolute";
		el.appendChild(container);
		container.classList.add("locked");

		var r = container.style.height = container.style.width = w >= h ? (x>w-x? 2*x : 2*(w-x)) : (y>h-y ? 2*y : 2*(h-y));
		container.style.top = y-r/2;
		container.style.left = x-r/2;

		var circle = document.createElement("div");
		container.appendChild(circle);
		circle.addEventListener("animationend", animFunction, false);
		circle.addEventListener("webkitAnimationEnd", animFunction, false);
		circle.style.backgroundColor = color? color : "white";
		circle.classList.add("abs-centered", "btn-hover", "locked");
		
		//el.style.color = env.backgroundColor;
	}
	else {console.log("Couldn't find ", el);}
}
function circleOut(el, point) {
	
	if (el) {	
		var elRect = el.getBoundingClientRect();

		var x = point ? point[0] : Math.floor(Math.random()*elRect.width);
		var y = point ? point[1] : Math.floor(Math.random()*elRect.height);
		var h = elRect.height;
		var w = elRect.width;
		
		var container = el.getElementsByTagName("div")[0];

		var r = container.style.height = container.style.width = w >= h ? (x>w-x? 2*x : 2*(w-x)) : (y>h-y ? 2*y : 2*(h-y));
		container.style.top = y-r/2;
		container.style.left = x-r/2;

		var circle = container.getElementsByTagName("div")[0];
		circle.addEventListener("animationend", clearDiv, false);
		circle.addEventListener("webkitAnimationEnd", clearDiv, false);
		circle.classList.remove("in");
		circle.classList.add("out");
		
		window.setTimeout(function() {
			var divs = el.getElementsByTagName("div");
			for (var i=0, div; i<divs.length; i++) {
				div = divs[i];
				div.parentNode.removeChild(div);
			}
		}, 250);
		
		

		el.style.color = "";
	}
	else {console.log("Couldn't find ", el);}
}

//Helper Functions
function normilizeBgSize() {
	var bg = document.getElementById("bg");
	var bodyRect = document.body.getBoundingClientRect();
	var h = bodyRect.height;
	var w = bodyRect.width;

	var r = bg.style.height = bg.style.width = w >= h ? w : h;
	bg.style.top = (h-r)/2;
	bg.style.left = (w-r)/2;
}
function isDraggingFiles(e) {
	if (e.dataTransfer.types) {
		for (var i=0; i<e.dataTransfer.types.length; i++) {
			if (e.dataTransfer.types[i]=="Files") {return true;}
		}
	}
	return false;
}
function ruleForSelector(selector, rules) {
	for (var i=0, r; i<rules.length; i++) {
		r = rules[i];
		if (r.selectorText) {
			if (r.selectorText.indexOf(selector)>-1) {
				return r;
			}
		}
	}
	return false;
}
function rgbaFromHex(hex, alpha) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	var rgb = result ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null;
	
	return rgb? "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ");" : null;
}
function setCloseStyle() {
	var styleSheet = document.styleSheets[document.styleSheets.length-1];
	var color = env.randomColors(Math.floor(Math.random()*20));
	env.closeColor = color;

	var pathRule = ruleForSelector("#close:active path", styleSheet.cssRules);
	if (pathRule) {pathRule.style.fill = color;}
	else {styleSheet.insertRule("#close:active path {fill: " + color + "; transition: 0.2s ease-out;}", styleSheet.cssRules.length);}

	var circleRule = ruleForSelector("#close:active circle", styleSheet.cssRules);
	if (circleRule) {circleRule.style.stroke = color;}
	else {styleSheet.insertRule("#close:active circle {stroke: " + color + "; transition: 0.2s ease-out;}", styleSheet.cssRules.length);}
}
function setActive(group) {
	var groupControls = document.getElementsByClassName("group");
	for (var i=0, g; i<groupControls.length; i++) {
		g = groupControls[i];
		if (g.getAttribute("data-group") == group) {g.classList.add("active");}
		else {g.classList.remove("active");}
	}
}
function setUnderlineStyle() {
	var underlineStyle = ruleForSelector(".bar::before, .bar::after", env.styleSheet.cssRules);
	console.log(underlineStyle);
	if (underlineStyle) {underlineStyle.style.backgroundColor = env.randomColors(Math.floor(Math.random()*20));}
	else {env.styleSheet.insertRule(".bar::before, .bar::after {background-color: " + env.randomColors(Math.floor(Math.random()*20)) + ";}", env.styleSheet.cssRules.length);}
}
function shadeColor(color, percent) {  
	var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
	return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function clearDiv(e) {
	if (e.target.parentNode) {
		if (e.target.parentNode.parentNode) {e.target.parentNode.parentNode.removeChild(e.target.parentNode);}
	}
}

function handleAnimationEnd(e) {
	//Animation of caption
	if (e.animatioName == "fade-out") {
		e.target.classList.add("hidden");
	}
	
	//Animation of bg-in
	if (e.target == document.getElementById("circle") && e.animationName == "circle-in") {
		if (env.data.length<1) {
			showCaption();
			showGenButton();
		}
		normilizeBgSize();
	}
	
	//Animation of bg-out
	if (e.target == document.getElementById("circle") && e.animationName == "circle-out") {
		document.getElementById("bg").classList.add("hidden");
		document.getElementById("bg").removeChild(e.target);
	}	
}

var env = new Environment([], svgForSelector("#chart"));
window.onload = init();												 