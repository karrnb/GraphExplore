var mapBounds={};
var settings={"map strength":0.1,"snap to map":false};
window.onload = function() {
var gui = new dat.GUI();
  gui.add(settings, "map strength",0,1);
  gui.add(settings, "snap to map");
}
function scaleCoords(nodes,xname="x",yname="y")
{
	//scale the x and y properties of nodes to be within 0-width and 0-height; ignores null?
	var maxx=-Infinity,minx=Infinity,maxy=-Infinity,miny=Infinity;var node;
	for(var i=0;i<nodes.length;i++){
		node=nodes[i];if(node[xname]==null) continue;
		if(node[xname]>maxx)maxx=node[xname];if(node[xname]<minx)minx=node[xname];
		if(node[yname]>maxy)maxy=node[yname];if(node[yname]<miny)miny=node[yname];
	}
	var scale=Math.min( (maxx-minx==0)?1:(width/(maxx-minx)),(maxy-miny==0)?1:(height/(maxy-miny)));
	for(var i=0;i<nodes.length;i++){
		node=nodes[i];
		if(node[xname]===null){}else{node[xname]=(node[xname]-(maxx+minx)/2)*scale+width/2;}
		if(node[yname]===null){}else{node[yname]=(node[yname]-(maxy+miny)/2)*scale+height/2;}
	}
	return [minx,maxx,miny,maxy];
}
//the main layout and other displays(paths, tops, markers)
function showGraph(graph) {
	mygraph=graph;var needEdges=false;
	for(var i=0;i<graph.nodes.length;i++){
		var node=graph.nodes[i];
		[node.mapx,node.mapy]=projection([node.longitude,node.latitude]);
		if(typeof node.edges !="object"){node.edges={};needEdges=true;}
	}
	if(needEdges){
		for(var i=0;i<graph.links.length;i++){
			var link=graph.links[i];
			graph.nodes[link.source].edges[link.target]=link;
			graph.nodes[link.target].edges[link.source]=link;
		}
	}
	[mapBounds.minx,mapBounds.maxx,mapBounds.miny,mapBounds.maxy]=scaleCoords(graph.nodes,"mapx","mapy");console.log("bbox",mapBounds);
	var scalex=(mapBounds.maxx-mapBounds.minx==0)?1:(width/(mapBounds.maxx-mapBounds.minx)),scaley=(mapBounds.maxy-mapBounds.miny==0)?1:(height/(mapBounds.maxy-mapBounds.miny));
	var scale=Math.min( scalex,scaley);
	var offsetx=mapBounds.minx,offsety=mapBounds.miny;if(scalex>scaley){offsetx-=(scalex/scaley-1)/2*(mapBounds.maxx-mapBounds.minx);}else{offsety-=(scaley/scalex-1)/2*(mapBounds.maxy-mapBounds.miny);}console.log(offsetx,offsety,scale);
	mapSelection.attr("transform", "translate(" + -offsetx*scale + "," + -offsety*scale + ") scale(" + scale+ ")");
	for(var i=0;i<graph.nodes.length;i++){
		var node=graph.nodes[i];
		node.x=node.mapx;node.y=node.mapy;if(node.x===null){node.x=width/2;}if(node.y===null){node.y=height/2;}
		if(isNaN(node.x)||isNaN(node.y)) throw Error("NaN found");
	}
	
	
	var SHOW_DETAIL_DELAY=1200;
	var hoverTimeout=null;
	var link = svg.append("g")
		.attr("class", "links")
		.selectAll("line")
		.data(graph.links)
		.enter().append("line")
		.attr("stroke-width", function(d) { return Math.sqrt(1); })
		.on('mouseover', (d)=>{tip.detailed=false;var target=d3.event.target;tip.show(d,target);if(hoverTimeout){clearTimeout(hoverTimeout);}hoverTimeout=setTimeout(()=>{tip.detailed=true;tip.show(d,target);},SHOW_DETAIL_DELAY);})
		.on('mousemove', (d)=>{var target=d3.event.target;tip.show(d,target);if(hoverTimeout){clearTimeout(hoverTimeout);}hoverTimeout=setTimeout(()=>{tip.detailed=true;tip.show(d,target);},SHOW_DETAIL_DELAY);})
		.on('mouseout', (d)=>{tip.detailed=false;tip.hide(d);if(hoverTimeout){clearTimeout(hoverTimeout);hoverTimeout=null;}}); ;

	
  var node = svg.append("g")
	  .attr("class", "nodes")
	.selectAll("circle")
	.data(graph.nodes)
	.enter().append("circle")
	  .attr("r", 1.5)
	  .attr("fill", function(d) { return color(1); })
	  .call(d3.drag()
		  .on("start", dragstarted)
		  .on("drag", dragged)
		  .on("end", dragended))
	.on('dblclick', nodeDblclicked)
	.on('click',nodeClicked)
	.on('mouseover', (d)=>{tip.detailed=false;var target=d3.event.target;tip.show(d,target);if(hoverTimeout){clearTimeout(hoverTimeout);}hoverTimeout=setTimeout(()=>{tip.detailed=true;tip.show(d,target);},SHOW_DETAIL_DELAY);})
	.on('mousemove', (d)=>{var target=d3.event.target;tip.show(d,target);if(hoverTimeout){clearTimeout(hoverTimeout);}hoverTimeout=setTimeout(()=>{tip.detailed=true;tip.show(d,target);},SHOW_DETAIL_DELAY);})
	.on('mouseout', (d)=>{tip.detailed=false;tip.hide(d);if(hoverTimeout){clearTimeout(hoverTimeout);hoverTimeout=null;}}); 

  nodeSelection=node,linkSelection=link;
  
  graph.markers=[];
  markerSelection = svg.append("g")
	  .attr("class", "markers")
	.selectAll("path");
  
  node.append("title")
.text(function(d) { return d.id; });

  simulation
	  .nodes(graph.nodes)
	  .on("tick", ticked);

  simulation.force("link")
	  .links(graph.links);

  var g = svg.append("g")
	.attr("class", "everything");

	svg.on("click",()=>{clearPath()});
	svg.on("dblclick",()=>{clearMarkers()});

	var selectedNode=null;
	function nodeClicked(d){
		if(!selectedNode)selectedNode=d;
		else{
			//if((d.edges)&&(d.edges[selectedNode.id])){highlightPath([d.id,selectedNode.id]);selectedNode=null;}
			d3.json("",{method:"POST",header:new Headers({ "Content-Type": "application/json"}),body:JSON.stringify({type:"shortestPath",source:d.id,target:selectedNode.id})})
			.then(function (res){
				highlightPath(res);
			});
			selectedNode=null;
		}
		d3.event.stopPropagation();
	}
	function nodeDblclicked(d){
		graph.markers.push(d);
		markerSelection=markerSelection.data(graph.markers).enter().append("path").attr("class","marker").attr("d",(d)=>("M"+d.x+","+(d.y-1.5)+" l 10,-17.32 c 3, -5.2 -4,-12.66 -10,-12.66 c -6,0 -13,7.66 -10,12.66 z"));
		d3.event.stopPropagation();
	}
	
	var scaleFactor=1;var maxx=-Infinity,minx=Infinity,maxy=-Infinity,miny=Infinity;
	var scalex=(x)=>{return (x-(maxx+minx)/2)*scaleFactor+width/2;}
	var scaley=(y)=>{return (y-(maxy+miny)/2)*scaleFactor+height/2;}
	function ticked() {
	
		var a=simulation.alpha();
		maxx=-Infinity,minx=Infinity,maxy=-Infinity,miny=Infinity;
		for(var i=0;i<graph.nodes.length;i++){
			var n=graph.nodes[i];
			if(n.mapx===null){
				//n.x+=(width/2-n.x)*0.0001*a;
				//n.y+=(height/2-n.y)*0.0001*a;
			}
			else{
				if(settings["snap to map"]){n.x=n.mapx;n.y=n.mapy;}
				else{n.x+=(n.mapx-n.x)*0.5*settings["map strength"];//*a;
				n.y+=(n.mapy-n.y)*0.5*settings["map strength"];//*a;
				}
				//n.x=n.mapx;
				//n.y=n.mapy;
			}
			if(isNaN(n.x)||isNaN(n.y)) throw Error("NaN found");
			if(n.x>maxx)maxx=n.x;if(n.x<minx)minx=n.x;
			if(n.y>maxy)maxy=n.y;if(n.y<miny)miny=n.y;
		}
		link
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
		//scaleFactor=Math.min( (maxx-minx==0)?1:(width/(maxx-minx)),(maxy-miny==0)?1:(height/(maxy-miny)));
		/*
		link
			.attr("x1", function(d) { return scalex(d.source.x); })
			.attr("y1", function(d) { return scaley(d.source.y); })
			.attr("x2", function(d) { return scalex(d.target.x); })
			.attr("y2", function(d) { return scaley(d.target.y); });

		node
			.attr("cx", function(d) { return scalex(d.x); })
			.attr("cy", function(d) { return scaley(d.y); });
		*/
	  }

  function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
  }

  function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
  }

  function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
  }

  function shortestPath(graph, start, targets)
  {
	let distances={};
	let prev={};
	let bestDistance=Infinity;
	let bestTarget=null;
	if(typeof targets !="object"){let temp={};temp[targets]=true;targets=temp;}
	let queue=buckets.PriorityQueue((a,b)=>{if(distances[a]>distances[b])return 1;else {if(distances[a]<distances[b])return -1; else return 0;}});
	distances[start]=0;queue.add(start);
	
	while(!queue.isEmpty()){
	  let node=queue.dequeue();
	  if(distances[node]>=bestDistance){break;}
	  for(neighbor in graph.nodes[node].edges){
		if(((neighbor in distances)==false)||(distances[neighbor]>distances[node]+1)){
		  distances[neighbor]=distances[node]+1;prev[neighbor]=node;queue.add(neighbor);
		  if(neighbor in targets){if(bestDistance>distances[neighbor]){bestDistance=distances[neighbor];bestTarget=neighbor;}}
		  
		}
	  }
	}
	if(bestTarget!==null){
	  let path=[];let current=bestTarget;while(current!=start){path.unshift(current);current=prev[current];}
	  path.unshift(start);
	  return path;
	}
  }
  
}
/*
function updateLayout(layout)
{
	var graph=mygraph;var nodesMap=graph.nodesMap;
	for(var i=0;i<layout.length;i++){
		if(!(i in nodesMap))continue;
		var str=layout[i];
		str=str.substring(1,str.length-2);
		var xyz=str.split(",");
		var node=graph.nodes[graph.nodesMap[i]];
		node.x=Number(xyz[0]);
		node.y=Number(xyz[1]);
	}
	scaleCoords(graph.nodes);
	simulation.restart();
	simulation.alpha(0.1);
}

*/
function refreshLayout()
{
	var graph=mygraph;if(!(graph&&graph.nodes))return;
	scaleCoords(graph.nodes);
}

function showProperty(property){
	var accent = d3.scaleOrdinal(d3.schemeAccent);
}

var highlight={nodes:{},links:{}};
function highlightPath(path)
  {
	
	if(path.length>0){
	  highlight.nodes[path[0]]=true;
	  for(var i=1;i<path.length;i++)
	  {
		highlight.nodes[path[i]]=true;
		highlight.links[mygraph.nodes[path[i-1]].edges[path[i]].index]=true;
	  }
	}
	nodeSelection.each(function(d,i) {
	  if(d.id in highlight.nodes){this.classList.add("selected");this.classList.remove("not-selected");}
	  else{this.classList.remove("selected");this.classList.add("not-selected");}
	});
	linkSelection.each(function(d,i) {
	  if(d.index in highlight.links){
		this.classList.add("selected");this.classList.remove("neighbor");this.classList.remove("not-selected");
	  }
	  else{
		this.classList.remove("selected");
		if((d.source.id in highlight.nodes)||(d.target.id in highlight.nodes)){
		  this.classList.add("neighbor");this.classList.remove("not-selected");
		}
		else{this.classList.remove("neighbor");this.classList.add("not-selected");}
	  }

	});
  }
function clearPath(){
	highlight.nodes={};highlight.links={};
	nodeSelection.each(function(d,i) {
		this.classList.remove("selected");
		this.classList.remove("not-selected");
	});
	linkSelection.each(function(d,i) {
		this.classList.remove("selected");this.classList.remove("neighbor");this.classList.remove("not-selected");
	  });
}
function clearMarkers(){
	markerSelection = svg.select("g.markers")
	.selectAll("path");
	markerSelection.remove();
	mygraph.markers=[];
}

