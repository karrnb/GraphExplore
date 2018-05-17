var chartDiv = document.getElementById("chart");
var svg = d3.select(chartDiv).append("svg");
svg.append("defs").html('<linearGradient y2="1" x2="0.8" y1="0" x1="0.2" id="gradient-metal"><stop offset="0" style="stop-color:#000"/><stop offset="0.6" style="stop-color:#333"/><stop offset="0.7" style="stop-color:#fff"/><stop offset="0.85" style="stop-color:#666"/><stop offset="0.9" style="stop-color:#aaa"/><stop offset="0.93" style="stop-color:#fff"/><stop offset="1" style="stop-color:#333" /></radialGradient><linearGradient  y2="1" x2="0.8" y1="0" x1="0.2" id="gradient-glass"><stop offset="0" style="stop-color:#5e5"/><stop offset="0.5" style="stop-color:#090"/><stop offset="0.51" style="stop-color:#2a2"/><stop offset="1" style="stop-color:#6d6"/>	</linearGradient> ');
var width = chartDiv.clientWidth;
var height = chartDiv.clientHeight;

svg
    .attr("width", width)
    .attr("height", height);

window.onresize=function(){
	width = chartDiv.clientWidth;
	height = chartDiv.clientHeight;

	svg
		.attr("width", width)
		.attr("height", height);
		
	refreshLayout();
}
//Set up tooltip
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-15, 0])
    .html(function (d) {
		if(d.source){
			if(tip.detailed){return  "<h3>Link</h3><p>This is the part of "+d.roadname +" between "+d.source.name + " and "+d.target.name+". Its length is "+d.length+" km."+(d.water?" It's on water.":"");}
				else{return  d.roadname;};
		}
		else{
			//detect whether this should be the long version when the user hovers for a long time
			//if(tip.detailed){return  "<h3>"+d.name + "</h3><p>This is the city #"+d.id+" called "+d.name+" in "+(d.geoname_id?geonames[d.geoname_id].country_name:"(unknown country)")+".</p>";}
			if(tip.detailed){return  "<h3>"+d.name + "</h3><p>This is the location #"+d.id+" called "+d.name+(d.countrycode?(" in "+countrycodes[d.countrycode]):"")+".</p>";}
			else{return  d.name + ""};
		}
		
	
})
svg.call(tip);
/*
var zoom_handler = d3.zoom()
    .on("zoom", zoom_actions);

	svg.call(zoom_handler);
  //zoom_handler(svg);

  function zoom_actions(){
      //g.attr("transform", d3.event.transform);
	  var transform = d3.zoomTransform(this);
	  svg.attr("transform", "scale(" + transform.k + ")");
	  //svg.attr("transform", "translate(" + transform.x + "," + transform.y + ") scale(" + transform.k + ")");
  }
*/
var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(5))
    .force("charge", d3.forceManyBody().strength(-5));
    //.force("center", d3.forceCenter(width / 2, height / 2));

var mygraph,nodeSelection,linkSelection,markerSelection;

/*
//this is the server-generated data

//extra data for lat/lon
var geonames={};var cities={};
var promises=[];
promises.push(d3.csv("data/GeoLite2-City-Blocks-IPv4.csv"));
promises.push(d3.csv("data/GeoLite2-City-Locations-en.csv"));
Promise.all(promises).then(([data1,data2])=>{
	for(var i=0;i<data2.length;i++){
		if(cities[data2[i].city_name]){cities[data2[i].city_name].push(data2[i])}
		else{cities[data2[i].city_name]=[data2[i]]}
		geonames[data2[i].geoname_id]=data2[i];
	}
	for(var i=0;i<data1.length;i++){
		if(data1[i].geoname_id in geonames){Object.assign(geonames[data1[i].geoname_id],data1[i]);}
		
	}
	
}).then(()=>{d3.json("data.json").then(function(data) {showGraph(data)})});
*/

/*
d3.csv("data/cities-full.csv").then((data)=>{
	for(var i=0;i<data.length;i++){
		if(data[i].continent_code!="EU")continue;
		geonames[data[i].geoname_id]=data[i];
		if(cities[data[i].city_name]){cities[data[i].city_name].push(data[i])}
		else{cities[data[i].city_name]=[data[i]]}
	}
	
}).then(()=>{d3.json("data.json").then(function(data) {showGraph(data)})});
*/
//new data
var countrycodes={};d3.tsv("data/countrycode.tsv").then((data)=>{for(let i=0;i<data.length;i++){countrycodes[data[i].Code]=data[i].Country;}});
d3.json("data2.json").then(function(data) {showGraph(data)});

//map
var projection = d3.geoMercator();
var path = d3.geoPath().projection(projection);
var graticule = d3.geoGraticule();
var mapSelection=svg.append("g").attr("class","map");
mapSelection.append("defs").append("path")
    .datum({type: "Sphere"})
    .attr("id", "sphere")
    .attr("d", path);
	
mapSelection.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);
	
d3.json("data/world-50m.json").then(function(world) {
  var countries = topojson.feature(world, world.objects.countries).features,
      neighbors = topojson.neighbors(world.objects.countries.geometries);
	mapSelection.selectAll(".country")
      .data(countries)
    .enter().insert("path", ".graticule")
      .attr("class", "country")
      .attr("d", path)
			.style("fill", "#fff");
});


/*
//layouts
layoutMenu=d3.select("#layout-menu");
var layoutMenuSelection=layoutMenu.selectAll("div");

d3.json("layout-algorithms.json").then(function(data) {
	layoutMenuSelection=layoutMenuSelection.data(data);
	layoutMenuSelection.exit().remove();
	layoutMenuSelection=layoutMenuSelection.enter().append("div").attr("class","layout-algorithm").on("click",function(algorithmName){
		console.log(algorithmName);
		d3.json("",{method:"POST",header:new Headers({ "Content-Type": "application/json"}),body:JSON.stringify({type:"layout",algorithm:algorithmName})})
			.then(function (res){
				updateLayout(res);
			});
	});
	layoutMenuSelection=layoutMenu.selectAll("div");
	layoutMenuSelection.selectAll("p").remove();
	layoutMenuSelection.append("p").text((x)=>x);
});

*/
  
  
  
  
  
  
  
  
  
  
  
  
  