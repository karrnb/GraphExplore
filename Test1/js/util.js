
function getLoc(name,country,latitude,longitude){
	if(name[0]=="»"){throw Error("unexpected city tag: water");}
	if(!(name in locs))return null;if(country=="")return null;
	for(let i in locs[name]){
		let candidate=locs[name][i];
		if((candidate.countrycode==country))
			if((Math.abs(candidate.latitude-latitude)<0.1)&&(Math.abs(candidate.longitude-longitude)<0.1)){
			if((candidate.latitude!=latitude)||(candidate.longitude!=longitude)){throw Error("same city with different lat/lon");}
			return candidate;
		}
	}
	return null;
}
function parseERoadsText(txt)
{
	var eroads={};var locs={},loclist=[],linklist=[];
	var lines=txt.split("\n");
	var vals=lines.map((d)=>d.split("\t"));
	
	var roadname="",lastloc;
	for(let i=0;i<vals.length;i++){
		if(vals[i].length==1){
			
			roadname=vals[i][0].trim();if(vals[i][0][0]!="E"){throw Error("unexpected road name");}
			lastloc=null;
			eroads[roadname]={type:vals[i+1][0]};i+=2;continue;
		}
		else{
			let countrycode=vals[i][0],locname=vals[i][1],start,end;
			let coords=vals[i][2].split(" "),length=Number(vals[i][3]);
			function degToNum(degree,minute){return Number(degree.substring(0,degree.length-1))+Number(minute.substring(0,minute.length-1))/60;}
			let lat=degToNum(coords[0],coords[1])*((coords[2][0]=="N")?1:-1),lon=degToNum(coords[3],coords[4])*((coords[5][0]=="E")?1:-1);
			
			if(lastloc===null){
				if(locname[0]=="»"){throw Error("unexpected first city tag: water");}
				lastloc=getLoc(locname,countrycode,lat,lon);
				if(lastloc===null){if(!(locname in locs)){locs[locname]=[];} let temp={name:locname,countrycode:countrycode,edges:{},latitude:lat,longitude:lon,id:loclist.length};locs[locname].push(temp);loclist.push(temp);lastloc=temp;}
			}
			else{
				let link={roadname:roadname};
				if(locname[0]=="»"){link.water=true;locname=locname.substr(2);}
				let newloc=getLoc(locname,countrycode,lat,lon);
				if(newloc===null){if(!(locname in locs)){locs[locname]=[];} let temp={name:locname,countrycode:countrycode,edges:{},latitude:lat,longitude:lon,id:loclist.length};locs[locname].push(temp);loclist.push(temp);newloc=temp;}
				link.source=lastloc.id;link.target=newloc.id;link.id=linklist.length;link.length=length;linklist.push(link);
				if(lastloc.id in newloc.edges){
					let oldlink=linklist[newloc.edges[lastloc.id]];
					if(link.length<=oldlink.length){
						lastloc.edges[newloc.id]=link.id;
						newloc.edges[lastloc.id]=link.id;
					}
					//though multiple links may exist I will just ignore longer roads
				}
				lastloc=newloc;
			}
			
		}
	}
	return {nodes:loclist,locations:locs,links:linklist,eroads:eroads};
}
//d3.text("data/crawled E-roads.txt").then((data)=>showGraph(parseERoadsText(data)));

function downloadObject(Obj,name)
{
	var data=[];var properties = {type: 'plain/text'}; // Specify the file's mime-type.
	data.push(JSON.stringify(Obj));
	var pom = document.createElement('a');
		pom.setAttribute('download', "mist_"+name+".json");//added prefix for sorting files by name; mist means custom generated property while oeis means original data, file means some kind of global data not belonging to any sequence
		var file = new File(data, "file.txt", properties);
		var url = URL.createObjectURL(file);
		pom.href = url;
		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			pom.dispatchEvent(event);
			}
			else {
				pom.click();
			}
}
function downloadString(str,name)
{
	var data=[];var properties = {type: 'plain/text'}; // Specify the file's mime-type.
	data.push(str);
	var pom = document.createElement('a');
		pom.setAttribute('download', "mist_"+name+".json");//added prefix for sorting files by name; mist means custom generated property while oeis means original data, file means some kind of global data not belonging to any sequence
		var file = new File(data, "file.txt", properties);
		var url = URL.createObjectURL(file);
		pom.href = url;
		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			pom.dispatchEvent(event);
			}
			else {
				pom.click();
			}
}
function tocsv(data,fields){
	var result="";var line="";
	var f;
	for(var j in fields){
		f=fields[j];
		if(typeof f =="object"){
			result+=f.name+",";
		}
		else{result+=f+",";}
	}
	result=result.substr(0,result.length-1)+"\n";
	for(var i in data){
		var d=data[i];line="";
		for(var j in fields){
			var f=fields[j],func;
			if(typeof f =="object"){
				func=f.fun;f=f.name;
				line+=(func(d))+",";
			}
			else{
				line+=((f in d)?d[f]:"")+",";
			}
			
		}
		line=line.substr(0,line.length-1);
		result+=line+"\n";
	}
	return result;
}
/*
	downloadString(tocsv(newgeo,["city_name","latitude","longitude","continent_code","continent_name","country_iso_code","country_name","geoname_id","is_in_european_union","locale_code","subdivision_1_iso_code","subdivision_1_name","subdivision_2_iso_code","subdivision_2_name","time_zone"]))
	*/


















/*//old data processing
	
	function bestcode(node){
		if(!cities[node.name]) return null;
		if(cities[node.name].length==1)return cities[node.name][0].geoname_id;
		var scores={};
		for(var i=0;i<cities[node.name].length;i++){
			city=cities[node.name][i];
			scores[i]=0;//how many of the known neighbor names correspond to cities that are close to this one
			if(city.continent_code=="EU")scores[i]+=1000;
			for(var neighborID in node.edges){
				var neighbor=graph.nodes[neighborID];
				if(!cities[neighbor.name])continue;
				for(var j=0;j<cities[neighbor.name].length;j++){
					var neighborCity=cities[neighbor.name][j];
					if(neighborCity.country_name==city.country_name)scores[i]++;
				}
			}
		}
		var maxscore=-1;var best=null;
		for(var i=0;i<cities[node.name].length;i++){
			if(scores[i]>maxscore){maxscore=scores[i];best=cities[node.name][i].geoname_id;}
		}
		return best;
	}
	//now just filter out nodes with unknown locations
	var nodesMap={};graph.nodesMap=nodesMap;
	var visibleNodes=[];
	var visibleLinks=[];
	for(var i=0;i<graph.nodes.length;i++){
		if(graph.nodes[i].name in cities){
			visibleNodes.push(graph.nodes[i]);
			nodesMap[i]=visibleNodes.length-1;
			graph.nodes[i].edges={};
		}
	}
	for(var i=0;i<graph.links.length;i++){
		var link=graph.links[i];
		if(!((link.source in nodesMap)&&(link.target in nodesMap)))continue;
		visibleLinks.push(link);
		graph.nodes[link.source].edges[nodesMap[link.target]]=link;
		graph.nodes[link.target].edges[nodesMap[link.source]]=link;
	}
	graph.nodes=visibleNodes;graph.links=visibleLinks;
	for(var i=0;i<graph.nodes.length;i++){
		var node=graph.nodes[i];var code=bestcode(node);
		if(code!==null){
			node.geoname_id=code;
			node.latitude=geonames[code].latitude;
			node.longitude=geonames[code].longitude;
			
			[node.mapx,node.mapy]=projection([node.longitude,node.latitude]);
		}
		else{
			//var str=node.viewLayout;
			//str=str.substring(1,str.length-2);
			//var xyz=str.split(",");
			//node.x=Number(xyz[0]);node.y=Number(xyz[1]);
			node.x=null;node.y=null;node.mapx=null;node.mapy=null;
		}
		
	}
	
	
	
	*/