
//utilities
function randomIntBetween(a,b){return Math.floor(Math.random()*(b-a)+a);}//>=a, <b

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}
module.exports={
	sculpture:{
		name:"Random Graph",
		info:"Demo of a 3D view of degree peeling of random graphs.",
		init:function(){
			var count=512;
			var prob=(Math.random()*5+10)/count;
			this.edgeProbability=prob;
			var verticesList=[];
			for(var i=0;i<count;i++)
			{
				verticesList.push(this.addVertex());
				for(var j=0;j<i;j++)
				{
					if(Math.random()<prob) {this.addEdge(verticesList[i].id,verticesList[j].id);}
				}
			}
			/*
			var count=Math.floor(Math.random()*200)+1000;
			var prob=(Math.random()*1+30)/count;
			this.edgeProbability=prob;
			var verticesList=[];
			for(var i=0;i<count;i++)
			{
				verticesList.push(this.addVertex());
				for(var j=0;j<i;j++)
				{
					if(Math.random()<prob*((count-i)*(count-i)/(count*count))) {this.addEdge(verticesList[i].id,verticesList[j].id);}
				}
			}
			
			*/
		},
		onAddPlayer:function(player){
			var vlist=Object.keys(this.vertices);var vid=Math.floor(Math.random()*vlist.length);
			var v=this.vertices[vlist[vid]];
			player.position=v.id;
			//this.update(v,"color",{h:v.color.h,s:0.7,v:0.8});//not using the default, to start with a highlighted vertex so players don't forget where they started out
		},
		abilities:[
		],
		menus:{
		},
	},
	
	
	colossalCave:{
		name:"Adventure: Colossal Cave",//does not have to be single player? although text aventures are traditionally single player
		info:"Based on the classic text adventure game. Explore the abstract cave and enjoy having a good map. Unfinished.",
		init:function(){
			var map={  //a literal map... there are also two mazes in the original, but they don't make a lot of sense here
				1: {name:"Road end",edges:[2,3,4,5]}, //todo: I'd like to support items or scoring if they can fit in
				2: {name:"Hill",edges:[1,5]},
				3: {name:"Building",edges:[1,{target:33,label:"plugh"},{target:10,label:"xyzzy"}]},//				Keys Lamp Bottle Food
				4: {name:"Valley",edges:[1,5,7,8]},
				5: {name:"Forest with valley on side",edges:[4,6]},
				6: {name:"Forest with valley & road",edges:[1,4]},
				7: {name:"Slit in streambed",edges:[3,4,5,8]},
				8: {name:"Outside grate",edges:[5,7,9]},
				9: {name:"Below grate",edges:[8,10]},
				10: {name:"Cobble crawl",edges:[9,11]},//		Cage
				11: {name:"Debris room",edges:[9,10,12]},//			Rod
				12: {name:"Sloping E/W canyon",edges:[9,11,13]},
				13: {name:"Bird chamber",edges:[9,12,14]},		//Bird
				14: {name:"Top of small pit",edges:[9,13,15]},
				15: {name:"Hall of mists",edges:[14,17,18,19,34]},
				17: {name:"Eastbank fissure",edges:[15,27]},
				18: {name:"Gold room",edges:[15]},			//Gold nugget
				19: {name:"Hall of Mt. King",edges:[15,28,29,30,74]},
				23: {name:"West 2pit room",edges:[25,67,68]},
				24: {name:"East pit",edges:[67]},
				25: {name:"West pit",edges:[23]},
				27: {name:"Westside fissure",edges:[41,17,19]},		//Diamonds
				28: {name:"Low N/S passage",edges:[19,33,36]},			//Silver bars
				29: {name:"Southside chamber",edges:[19]},		//Jewelry
				30: {name:"Westside chamber",edges:[19]},			//Coins
				33: {name:"Y2",edges:[28,34,35,{target:3,label:"plugh"}]},
				34: {name:"Rock jumble",edges:[15,33]},
				35: {name:"Window on pit",edges:[33]},
				36: {name:"Dirty broken passage",edges:[28,37,39,65]},
				37: {name:"Brink of clean pit",edges:[36,38]},
				38: {name:"Pit with stream",edges:[37]},
				39: {name:"Dusty rocks",edges:[36,64,65]},
				41: {name:"Westend hall of mists",edges:[27,60]},
				60: {name:"Eastend long hall",edges:[41,62]},
				61: {name:"Westend long hall",edges:[60,62]},
				62: {name:"High N/S passage",edges:[30,60,61,63]},
				63: {name:"Dead end",edges:[62]},
				64: {name:"Complex junction",edges:[39,65,103,106]},
				65: {name:"Bedquilt",edges:[64,66]},//goes to random places
				66: {name:"Swiss cheese",edges:[65,67,96,97,77]},
				67: {name:"East 2pit room",edges:[23,24,66]},
				68: {name:"Slab room",edges:[23,69]},
				69: {name:"N/S canyon above room",edges:[68,109,120]},
				70: {name:"N/S canyon above sizable passage",edges:[65,71,111]},
				71: {name:"Three canyons junction",edges:[65,70,110]},
				72: {name:"Low room",edges:[73,97,118]},
				73: {name:"Deadend crawl",edges:[72]},
				74: {name:"E/W canyon above tight canyon",edges:[19,75,109,120]},
				75: {name:"Wide place in tight canyon",edges:[74,77]},
				77: {name:"Tall E/W canyon with tight crawl",edges:[75,78,66]},
				78: {name:"Mass of boulders",edges:[77]},
				88: {name:"Narrow corridor",edges:[25,92]},
				91: {name:"Steep incline above large room",edges:[95,72]},
				92: {name:"Giant room",edges:[88,94]},			//Eggs
				94: {name:"Immense N/S passage",edges:[92,95]},
				95: {name:"Cavern with waterfall",edges:[91,94]},	//	Trident
				96: {name:"Soft room",edges:[66]},				//Pillow
				97: {name:"Oriental room",edges:[66,72,98]},			//Vase
				98: {name:"Misty cavern",edges:[97,99]},
				99: {name:"Alcove",edges:[98,100]},
				100: {name:"Plover's room",edges:[99,101]},			//Emerald
				101: {name:"Dark room",edges:[100]},				//Tablet?
				102: {name:"Arched hall",edges:[103]},
				103: {name:"Clam room",edges:[64,104]},			//Clam/pearl
				104: {name:"Ragged corridor",edges:[103,105]},
				105: {name:"Cul de sac",edges:[104]},
				106: {name:"Anteroom",edges:[108]},		//Magazines
				108: {name:"Witt's end",edges:[]},
				109: {name:"Mirror canyon",edges:[113,69]},
				110: {name:"West window on pit",edges:[71]},
				111: {name:"Top of stalactite",edges:[70]},//maze all alike
				113: {name:"Reservoir",edges:[109]},
				115: {name:"N/E end of repository",edges:[]},
				116: {name:"S/W end of repository",edges:[]},
				117: {name:"S/W of chasm",edges:[118]}, //troll
				118: {name:"Sloping corridor",edges:[117]},
				120: {name:"Dragon room",edges:[69,74]},		//Rug
				122: {name:"N/E of chasm",edges:[117,123]},
				123: {name:"Long E/W corridor",edges:[122,124]},
				124: {name:"Fork in path",edges:[123,125,128]},
				125: {name:"Warm walls junction",edges:[124,126,127]},
				126: {name:"Breath-taking view",edges:[125]},
				127: {name:"Chamber of boulders",edges:[125]},		//Spices
				128: {name:"Limestone passage",edges:[124,129]},
				129: {name:"Front of barren room",edges:[128,130]},
				130: {name:"Bear cave",edges:[129]},		//Chain
			};
			
			for(var i in map){
				v=this.addVertex();
				map[i].vertex=v;
				this.update(v,"label",map[i].name);
			}
			for(var i in map){
				for(var j=0;j< map[i].edges.length;j++)//Array
				{
					var v=map[i].vertex;
					var e=map[i].edges[j];
					if(typeof e == "number"){
						if(!map[e].vertex)console.log("missing vertex "+e);
						if(!this.adjacent(v.id,map[e].vertex.id)){this.addEdge(v.id,map[e].vertex.id);}//todo: many game connections are one-way
					}
					else if(typeof e == "object"){
						if(!map[e.target].vertex)console.log("missing vertex "+e.target);
						if(!this.adjacent(i,map[e.target].vertex.id)){
							var eObj=this.addEdge(i,map[e.target].vertex.id);if("label" in e){this.update(eObj,"label",e.label);}
						}
					}
				}
			}
			this.startingPosition=function(){return map[1].vertex.id;}//for adding players
		},
		onAddPlayer:function(player){//although this is a shared world, we don't create new vertices for players
			//var vlist=Object.keys(this.vertices);var vid=Math.floor(Math.random()*vlist.length);
			//if(!vlist[vid])return "can't find a vertex to place the player on";
			//var v=this.vertices[vlist[vid]];
			//why not start at the building like in the game?
			player.position=this.startingPosition();
		
		},
		abilities:[
			{
				name:"move",
				info:"move to a vertex adjacent to your position",
				conditions:["vertex","adjacent"],
				filter:"(obj=>(obj)&&(obj.type=='vertex')&&(localPlayer.position!=obj.id)&&(adjacent(localPlayer.position,obj.id)))",
				//the input gesture is always double click, and will only work if the condition is true, otherwise, the same input is tried with other abilities; this is how we can trigger move and connect in different contexts, because their conditions are mutually exclusive. abilities will be sent to the client, and the condition code is client-side, so we write it in quotes. the actual execution functions do not need to be sent.
				use:function(world,player,localPlayer,target){
					world.update(localPlayer,"position",target.id);
				}
			},
		]
	},

};
















