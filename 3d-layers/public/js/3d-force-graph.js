//heavily modified from 3d-force-graph, from the author of d3-forcelayout-3d
//3D graph layers from peeling


var CAMERA_DISTANCE2NODES_FACTOR = 150;
var clock = new THREE.Clock();
const scene = new THREE.Scene();
//has a nodes and a links object, plus other objects like star background
const graph3d = {scene:scene};

var glowMap = new THREE.ImageUtils.loadTexture('images/glow.png');
var particleMap = new THREE.ImageUtils.loadTexture('images/particle.png');
function copyObj(obj){return JSON.parse(JSON.stringify(obj));}
//init the scene once, but scenes may be reset as player enters new worlds
function init3d(domElement) {
    var navInfo;
	graph3d.domElement=domElement;
    domElement.appendChild(navInfo = document.createElement('div'));
    navInfo.className = 'graph-nav-info';
    navInfo.textContent = "left drag: rotate, right drag: pan vertically, WASD: pan horizontally, left click: select/clear vertex; right click: select/clear layer; shift+left drag: box-select vertices; hold space and hover mouse: show tooltip";

	//todo: this is a temporary trick to know which of the saved graphs (or none) is the currently shown one, and save any new selection results in it; because when you create a subgraph you can't save the selection - or should I allow saving the whole graph as well as the default save selection? But even if you can save a whole graph, if you select anything else in it you'd need to save again and it's no good for exploring different neighborhoods.
	graph3d.activeSubgraph=null;//how about autosave when entering a world?
	graph3d.itemBar = document.getElementById('item-bar');
	graph3d.newItemButton=document.getElementById('new-item-button');
	function getGraph(saveWholeGraph=false){
		let world=graph3d.world;
		var obj={players:{},vertices:{},edges:{},name:graph3d.world.name+" snapshot",info:graph3d.world.name+" snapshot"},id=1,eid=1;
		//todo: save view params
		if("edgeProbability" in graph3d.world){obj.edgeProbability=graph3d.world.edgeProbability;}
		if(saveWholeGraph){
			obj.selectedNodes=graph3d.selectedNodes;console.log(obj.selectedNodes);
			obj.selectedLayers=graph3d.selectedLayers;//todo: this may create confusing coupling between saved slots
			//obj.egonet=copyObj(graph3d.egonet);
			//only save the view if saving the whole graph? or not?
			
		}
		//todo: fix view saving tilt bug
		//obj.view={position:{x:graph3d.camera.position.x,y:graph3d.camera.position.y,z:graph3d.camera.position.z},target:{x:graph3d.controls.target.x,y:graph3d.controls.target.y,z:graph3d.controls.target.z}};
		
		let selectedVertexCount=(Object.keys(graph3d.selectedNodes)).length;
		let selectedLayerCount=(Object.keys(graph3d.selectedLayers)).length;
		for(let id in world.vertices){
			let originalVertex=world.vertices[id];
			if(saveWholeGraph){
				
			}
			else{
				if(selectedVertexCount>0){
					if(!((id in graph3d.selectedNodes )||(graph3d.egonet&&(id in graph3d.egonet))))continue;
				}
				
				if(selectedLayerCount>0){
					let appeared=false;
					for(let i in originalVertex.duplicates){if(i in graph3d.selectedLayers){appeared=true;break;}}
					if(!appeared)continue;
				}
			}
			let v={type:"vertex",id:id,color:copyObj(originalVertex.color),x:originalVertex.x,y:originalVertex.y,z:originalVertex.z,edges:{}};
			obj.vertices[id]=v;
			for(let neighbor in originalVertex.edges){
				let eid=originalVertex.edges[neighbor],originalEdge=world.edges[eid],originalNeighbor=world.vertices[neighbor];
				
				if(saveWholeGraph){
					
				}
				else{
					if(selectedVertexCount>0){
						if(!((neighbor in graph3d.selectedNodes )||(graph3d.egonet&&(neighbor in graph3d.egonet))))continue;
					}
					if(selectedLayerCount>0){
					//use the edge's layer itself, not the peel values of the endpoints; even if both points appear in a layer the edge may not
						if(!(originalEdge.peelValue in graph3d.selectedLayers)){continue;}
					}
				}
				
				let e={type:"edge",id:eid};
				if("length" in originalEdge)e.length=originalEdge.length;
				if("brightness" in originalEdge)e.brightness=originalEdge.brightness;
				if("thickness" in originalEdge)e.thickness=originalEdge.thickness;
				obj.edges[eid]=e;
				if(neighbor in obj.vertices){v.edges[neighbor]=eid;obj.vertices[neighbor].edges[id]=eid;}
			}
		}
		return obj;
		
	};
	
	
	function saveGraph(whole){
		var item=document.createElement('div');
		graph3d.itemBar.appendChild(item);
		let obj=getGraph(whole);
		item.textContent="|V|:"+Object.keys(obj.vertices).length+" |E|:"+Object.keys(obj.edges).length;
		item.onclick=function(e){e.stopPropagation();graph3d.activeSubgraph=this.__obj;graph3d.show(this.__obj);}
		item.oncontextmenu=function(e){e.stopPropagation();e.preventDefault();graph3d.itemBar.removeChild(this);}
		item.__obj=obj;	
	};
	graph3d.saveGraph=saveGraph;
	graph3d.newItemButton.onclick=function(e){e.stopPropagation();e.preventDefault();saveGraph();}
	graph3d.newItemButton.oncontextmenu=function(e){e.stopPropagation();e.preventDefault();saveGraph(true);}
	graph3d.newItemButton.textContent="+";
	
    domElement.appendChild(graph3d.logElem = document.createElement('div'));
    graph3d.logElem.className = 'graph-logs';
	
	domElement.appendChild(graph3d.contextElem = document.createElement('div'));
    graph3d.contextElem.className = 'context-menu';
	
    const toolTipElem = document.createElement('div');graph3d.tooltipElem=toolTipElem;
    toolTipElem.classList.add('graph-tooltip');
    domElement.appendChild(toolTipElem);
	
	graph3d.addLog=function(msg){
		//skip repeated messages
		var lastlog=graph3d.logElem.lastElementChild;if((lastlog)&&(lastlog.textContent==msg)){return;}
		var p=document.createElement('p');p.textContent=msg;p.className = 'graph-log';
		graph3d.logElem.appendChild(p);p.createTime=new Date().getTime();
	};

	//p slider
	
	//var edgeProbGui=new dat.GUI({ autoPlace: false });
	//gui.add(graph3d.world,world).onFinishChange(createListener(prop));
	
    const raycaster = new THREE.Raycaster();raycaster.params.Points.threshold=2;//todo:set this to the best value adaptively
	graph3d.raycaster=raycaster;
	
    const mousePos = new THREE.Vector2();graph3d.mousePos=mousePos;
    const mouseScreenPos = new THREE.Vector2();graph3d.mouseScreenPos=mouseScreenPos;
    mousePos.x = -2;
    // Initialize off canvas
    mousePos.y = -2;
	
	window.addEventListener("resize", resizeCanvas, false);
    // Handle click events on nodes ; click to select node
    var mouseDownPos = {
        x: -1,
        y: -1
    };
	
	graph3d.getObjectAtPos=function(pos){
		raycaster.setFromCamera(pos, graph3d.camera);
		if(!graph3d.nodes)return;//,graph3d.links,graph3d.players)
		if(!graph3d.world)return;
		var intersectList=[graph3d.nodes,graph3d.links,graph3d.players];
		const intersects = raycaster.intersectObjects(intersectList);
        if (intersects.length) {
			var bestObj;var bestDistance=10000;var vector=new THREE.Vector3();
			//first test for vertices
			for(var i=0;i<intersects.length;i++)
			{
				var distance;
				if(intersects[i].object==graph3d.nodes){
					//vector.copy(intersects[i].point);vector.multiplyScalar(-1);
					//vector.add(graph3d.world.vArray[intersects[i].index]);
					distance=intersects[i].distanceToRay;//vector.length();
					if(distance<bestDistance){bestDistance=distance;bestObj=graph3d.world.vArray[intersects[i].index];}
				}
			}
			if(bestDistance<1000)return bestObj;
			for(var i=0;i<intersects.length;i++)
			{
				var distance;
				if(intersects[i].object==graph3d.links){
					var e=graph3d.world.eArray[Math.floor(intersects[i].faceIndex/6)];//faceIndex is the index of the first vertex?
					//try a simpler way as links are rather narrow
					distance=1;//and prioritize clicking nodes over links, as it's too easy to click on a node and also intersect its incident links.
					if((distance<bestDistance)&&((!bestObj)||(bestObj.type!="vertex"))){
						bestDistance=distance;bestObj=graph3d.world.eArray[Math.floor(intersects[i].faceIndex/6)];
						
					}
				}
			}
			
			return bestObj;
		}
	};
	
	//dummy plane to determine 3d location of the click, when we need to create vertices
    var dummyMat = new THREE.SpriteMaterial({
        map: glowMap,
        color: 0xeeeeff,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending
    });
    var dummyMat2 = new THREE.SpriteMaterial({
        map: glowMap,
        color: 0xeeeeff,
        transparent: true,
        opacity: 0.001,
        blending: THREE.AdditiveBlending
    });
    var clickPlane = new THREE.Sprite(dummyMat);
    clickPlane.scale.set(500, 500, 1.0);
    scene.add(clickPlane);
    graph3d.clickPlane = clickPlane;
    var clickPlaneMoveable = new THREE.Sprite(dummyMat2);
    clickPlaneMoveable.scale.set(500, 500, 1.0);
    scene.add(clickPlaneMoveable);
    graph3d.clickPlaneMoveable = clickPlaneMoveable;
    //this is for detecting 3d locations of clicks relative to a selected node

    
	
	graph3d.showingTooltip=false;
	window.addEventListener("keydown", ev=>{
		if ( event.keyCode === 32) { if(!graph3d.showingTooltip){graph3d.showingTooltip=true;graph3d.tooltipElem.style.opacity="";}} 
	});
	window.addEventListener("keyup", ev=>{
		if ( event.keyCode === 32) { if(graph3d.showingTooltip){graph3d.showingTooltip=false;graph3d.tooltipElem.style.opacity="0";}} 
	});
	
    domElement.addEventListener("mousemove", ev=>{
		graph3d.showingTooltip=false;
        const offset = getOffset(domElement)
          , relPos = {
            x: ev.pageX - offset.left,
            y: ev.pageY - offset.top
        };
		mousePos.x = ( event.clientX / domElement.clientWidth ) * 2 - 1;
		mousePos.y = - ( event.clientY / domElement.clientHeight ) * 2 + 1;
		mouseScreenPos.x=event.clientX;
		mouseScreenPos.y=event.clientY;
        //mousePos.x = ((relPos.x / domElement.clientWidth) * 2 - 1);
        //mousePos.y = -(relPos.y / domElement.clientHeight) * 2 + 1;
        toolTipElem.style.top = (relPos.y - 40) + 'px';
        toolTipElem.style.left = (relPos.x - 20) + 'px';

		var alpha=graph3d.d3ForceLayout.alpha();
		if(graph3d.getObjectAtPos(mousePos)){graph3d.d3ForceLayout.alpha(alpha*0.97);}//slowly pause the moving stuff so players can click easily
        else{graph3d.d3ForceLayout.alpha(alpha+0.005>1?1:alpha+0.005);}
		
	
        function getOffset(el) {
            const rect = el.getBoundingClientRect()
              , scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
              , scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return {
                top: rect.top + scrollTop,
                left: rect.left + scrollLeft
            };
        }
    }
    , false);
	

	domElement.addEventListener("touchmove", ev=>{
		//treat it like single click(looking)
        const offset = getOffset(domElement)
          , relPos = {
            x: ev.pageX - offset.left,
            y: ev.pageY - offset.top
        };
		mousePos.x = ( ev.touches[0].pageX / domElement.clientWidth ) * 2 - 1;
		mousePos.y = - ( ev.touches[0].pageY / domElement.clientHeight ) * 2 + 1;
		mouseScreenPos.x=ev.touches[0].pageX;
		mouseScreenPos.y=ev.touches[0].pageY;
        //mousePos.x = ((relPos.x / domElement.clientWidth) * 2 - 1);
        //mousePos.y = -(relPos.y / domElement.clientHeight) * 2 + 1;
        toolTipElem.style.top = (relPos.y - 40) + 'px';
        toolTipElem.style.left = (relPos.x - 20) + 'px';

		
		
	
        function getOffset(el) {
            const rect = el.getBoundingClientRect()
              , scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
              , scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return {
                top: rect.top + scrollTop,
                left: rect.left + scrollLeft
            };
        }
    }
    , false);

    domElement.addEventListener("mousedown", ev=>{
        mouseDownPos.x = mousePos.x;
        mouseDownPos.y = mousePos.y;
		if(ev.shiftKey&&(ev.button==0)){
			graph3d.regionStartPos.x=ev.x;graph3d.regionStartPos.y=ev.y;
			selectingRegion.style.left=ev.x+"px";
			selectingRegion.style.right=(domElement.clientWidth-ev.x)+"px";
			selectingRegion.style.top=ev.y+"px";
			selectingRegion.style.bottom=(domElement.clientHeight-ev.y)+"px";
			selectingRegion.style.display="block";}
    });
	domElement.addEventListener("touchstart", ev=>{
		const offset = getOffset(domElement)//since there's no "mousemove" when you are not touching, the positions must be set when touch starts
          , relPos = {
            x: ev.pageX - offset.left,
            y: ev.pageY - offset.top
        };
		mousePos.x = ( event.touches[0].pageX / domElement.clientWidth ) * 2 - 1;
		mousePos.y = - ( event.touches[0].pageY / domElement.clientHeight ) * 2 + 1;
		mouseScreenPos.x=event.touches[0].pageX;
		mouseScreenPos.y=event.touches[0].pageY;
        //mousePos.x = ((relPos.x / domElement.clientWidth) * 2 - 1);
        //mousePos.y = -(relPos.y / domElement.clientHeight) * 2 + 1;
        toolTipElem.style.top = (relPos.y - 40) + 'px';
        toolTipElem.style.left = (relPos.x - 20) + 'px';

	
        function getOffset(el) {
            const rect = el.getBoundingClientRect()
              , scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
              , scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return {
                top: rect.top + scrollTop,
                left: rect.left + scrollLeft
            };
        }
        mouseDownPos.x = mousePos.x;
        mouseDownPos.y = mousePos.y;
		//todo: start dragging if clicked, and stop camera moving
		ev.preventDefault();
    });
	domElement.addEventListener("mousemove", ev=>{
		if(ev.shiftKey&&(ev.button==0)){
			if(ev.x>graph3d.regionStartPos.x){selectingRegion.style.left=graph3d.regionStartPos.x+"px";selectingRegion.style.right=(domElement.clientWidth-ev.x)+"px";}else{selectingRegion.style.right=(domElement.clientWidth-graph3d.regionStartPos.x)+"px";selectingRegion.style.left=ev.x+"px";}
			if(ev.y>graph3d.regionStartPos.y){selectingRegion.style.bottom=(domElement.clientHeight-ev.y)+"px";selectingRegion.style.top=graph3d.regionStartPosy+"px";}else{selectingRegion.style.top=ev.y+"px";selectingRegion.style.bottom=(domElement.clientHeight-graph3d.regionStartPos.y)+"px";}
			
		}
		else{selectingRegion.style.display="none";}
	});
    domElement.addEventListener("mouseup", ev=>{
        if ((graph3d.world) && (graph3d.onclick) && (mouseDownPos.y == mousePos.y) && (mouseDownPos.x == mousePos.x)) {
            const target=graph3d.getObjectAtPos(mouseDownPos);
            if (target) {
                if (ev.button == 0) {
                    graph3d.onclick(target);
                }
                if (ev.button > 0) {
                    graph3d.onrightclick(target);
                }
            } else {
                
                if (ev.button == 0)
                    graph3d.onclick();
                if (ev.button > 0)
                    graph3d.onrightclick();
            }
        }
		if(ev.shiftKey&&(ev.button==0)){
			let oldmouseX = ( graph3d.regionStartPos.x / domElement.clientWidth ) * 2 - 1,
				oldmouseY = - ( graph3d.regionStartPos.y / domElement.clientHeight ) * 2 + 1;
			console.log("screen coords :"+oldmouseX+", "+oldmouseY+" to "+mousePos.x+", "+mousePos.y);
			let selected={},pos=new THREE.Vector3();let layers=Object.keys(graph3d.selectedLayers).length;
			let now=Date.now();
			for(let i in graph3d.world.duplicatedVertices){
				let n=graph3d.world.duplicatedVertices[i];
				pos.x=n.x;pos.y=n.y;pos.z=n.z;
				let screenPos = pos.applyMatrix4(graph3d.nodes.matrixWorld).project(graph3d.camera);
				if(((screenPos.x-oldmouseX)*(screenPos.x-mousePos.x)<0)&&((screenPos.y-oldmouseY)*(screenPos.y-mousePos.y)<0)){
					console.log("selected coords :"+screenPos.x+", "+screenPos.y);
					if(layers){if(graph3d.selectedLayers[n.peelValue])graph3d.selectedNodes[n.original]={time:Date.now(),x:n.x,y:n.y};selected[n.original]=true;}
					else{graph3d.selectedNodes[n.original]={time:now,x:n.x,y:n.y};selected[n.original]=true;}
				}
			}
			selectingRegion.style.display="none";
			if(Object.keys(selected).length){
				//console.log(Object.keys(selected).length);
				graph3d.addLog("selecting "+Object.keys(selected).length+" vertices");
				
				graph3d.updateEgonet();
				//graph3d.forcesChanged();
				}
		
		}
		
    }
    , false);
	graph3d.lastTouchedObj=null;
	graph3d.lastTouchedPos={x:-1,y:-1};
	graph3d.regionStartPos={x:-1,y:-1};

	domElement.addEventListener("touchend", ev=>{
		//try to treat it like double click if not moving
		
        if ((graph3d.world) && (graph3d.onclick) && Math.abs(mouseDownPos.y - mousePos.y)<10 && Math.abs(mouseDownPos.x -mousePos.x)<10) {
			if(Math.abs(graph3d.lastTouchedPos.x-mouseDownPos.x)<5 && Math.abs(graph3d.lastTouchedPos.y-mouseDownPos.y)<5)
			{
				const target=graph3d.getObjectAtPos(mouseDownPos);
				if (target) {
					graph3d.ondblclick(target);
				} 
				else {
					graph3d.ondblclick();
				}
			}
			else{
				const target=graph3d.getObjectAtPos(mouseDownPos);
				if (target) {
					graph3d.onclick(target);
				} 
				else {
					graph3d.onclick();
				}
				graph3d.lastTouchedPos.x=mouseDownPos.x;
				graph3d.lastTouchedPos.y=mouseDownPos.y;
				var alpha=graph3d.d3ForceLayout.alpha();
				if(target){graph3d.d3ForceLayout.alpha(alpha*0.1);}
				else{graph3d.d3ForceLayout.alpha(alpha+0.5>1?1:alpha+0.5);}
			}   
        }
		
    }
    , false);
	
	domElement.addEventListener("dragend", ev=>{
		//try to treat it like double click if not moving
		
        if ((graph3d.world) && (graph3d.onclick) && Math.abs(mouseDownPos.y - mousePos.y)<10 && Math.abs(mouseDownPos.x -mousePos.x)<10) {
			if(Math.abs(graph3d.lastTouchedPos.x-mouseDownPos.x)<5 && Math.abs(graph3d.lastTouchedPos.y-mouseDownPos.y)<5)
			{
				const target=graph3d.getObjectAtPos(mouseDownPos);
				if (target) {
					graph3d.ondblclick(target);
				} 
				else {
					graph3d.ondblclick();
				}
			}
			else{
				const target=graph3d.getObjectAtPos(mouseDownPos);
				if (target) {
					graph3d.onclick(target);
				} 
				else {
					graph3d.onclick();
				}
				graph3d.lastTouchedPos.x=mouseDownPos.x;
				graph3d.lastTouchedPos.y=mouseDownPos.y;
				var alpha=graph3d.d3ForceLayout.alpha();
				if(target){graph3d.d3ForceLayout.alpha(alpha*0.1);}
				else{graph3d.d3ForceLayout.alpha(alpha+0.5>1?1:alpha+0.5);}
			}   
        }
		
    }
    , false);
	
    

    domElement.addEventListener("dblclick", ev=>{
        if ((graph3d.world) && (graph3d.ondblclick)) {
            raycaster.setFromCamera(mousePos, graph3d.camera);
           const target=graph3d.getObjectAtPos(mouseDownPos);
            if (target) {
                graph3d.ondblclick(target);
            } else {
                graph3d.ondblclick(null);
            }
        }
    }
    , false);

    graph3d.getMousePosition3d = function() {
        raycaster.setFromCamera(mousePos, graph3d.camera);
        const intersects = raycaster.intersectObjects([graph3d.clickPlane]);
        //a large sprite through the origin, facing the camera
        if (intersects.length) {
            return intersects[0].point;
        }
    }

    graph3d.getAlignedMousePosition3d = function(obj) {
        graph3d.clickPlaneMoveable.position.copy(obj);
        raycaster.setFromCamera(mousePos, graph3d.camera);
        const intersects = raycaster.intersectObjects([graph3d.clickPlaneMoveable]);
        //a large sprite at the object's location
        if (intersects.length) {
            return intersects[0].point;
        }
    }

    // Setup renderer
    graph3d.renderer = new THREE.WebGLRenderer();
	//antialias:true;
	
    domElement.appendChild(graph3d.renderer.domElement);

    // Setup scene
    scene.background = new THREE.Color(0x000011);

	
    //This will add a starfield to the background of a scene
    var starsGeometry = new THREE.BufferGeometry();
	starsGeometry.addAttribute("position",)
	var starCount=10000;
	var positions = new THREE.BufferAttribute( new Float32Array( starCount * 3 ), 3);
	var colors = new THREE.BufferAttribute(  new Float32Array( starCount * 3 ), 3);
	var sizes = new THREE.BufferAttribute( new Float32Array( starCount), 1);
	starsGeometry.addAttribute('position', positions);
	starsGeometry.addAttribute('customColor', colors);
	starsGeometry.addAttribute('size', sizes);
	
	var star = new THREE.Vector3();var color=new THREE.Color();
    for (var i = 0; i < 10000; i++) {
        
        star.x = THREE.Math.randFloatSpread(6000);
        star.y = THREE.Math.randFloatSpread(6000);
        star.z = THREE.Math.randFloatSpread(6000);
		var saturation=Math.random()*0.3;
		color.setHSL(Math.random()*360,saturation,1 - (saturation / 2));
		if(star.length()>Math.random()*1000+2000){i--;continue;}
        positions.array[i*3]=star.x;
        positions.array[i*3+1]=star.y;
        positions.array[i*3+2]=star.z;
		colors.array[i*3]=color.r;
        colors.array[i*3+1]=color.g;
        colors.array[i*3+2]=color.b;
		sizes.array[i]=Math.random()*0.5+0.5;
    }
    /*var starsMaterial = new THREE.PointsMaterial({
        map: particleMap,
        color: 0xaaaaff,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });*/
	graph3d.starUniforms = {
		texture:   { type: "t", value: particleMap },
		time:       { value: 1.0 },
		resolution: { value: new THREE.Vector2() }
	};
	starsMaterial = new THREE.ShaderMaterial( {
		uniforms: graph3d.starUniforms,
		//attributes are in the geometry
		vertexShader: document.getElementById( 'nodesVertexShader' ).textContent,//??
		fragmentShader: document.getElementById( 'nodesFragmentShader' ).textContent,
		transparent: true,
		blending:THREE.AdditiveBlending,depthTest:false,
	} );
    scene.add(graph3d.starField = new THREE.Points(starsGeometry,starsMaterial));

	var selectGeometry = new THREE.Geometry();
    var selectMap = new THREE.ImageUtils.loadTexture('images/ring.png');
    var selectMat = new THREE.PointsMaterial({
        map: selectMap
    });
	//going to support multi-selection
    scene.add(graph3d.selectMarks = new THREE.Points(selectGeometry,selectMat));

    scene.fog = new THREE.FogExp2(0xaaaaaa,0.005);
    //scene.add(graph3d.nodes = new THREE.Group());scene.add(graph3d.links = new THREE.Group());
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff,0.6));
    graph3d.camera = new THREE.PerspectiveCamera();
    graph3d.camera.far = 20000;
    graph3d.controls = new MyControls(graph3d.camera,graph3d.renderer.domElement);

	
	
	// properties that may vary from particle to particle. only accessible in vertex shaders!
	//	(can pass color info to fragment shader via vColor.)

	graph3d.nodeUniforms = {
		texture:   { type: "t", value: particleMap },
		time:       { value: 1.0 },
		resolution: { value: new THREE.Vector2() }
	};
	graph3d.nodesMaterial = new THREE.ShaderMaterial( {
		uniforms: graph3d.nodeUniforms,
		//attributes are in the geometry
		vertexShader: document.getElementById( 'nodesVertexShader' ).textContent,
		fragmentShader: document.getElementById( 'nodesFragmentShader' ).textContent,
		transparent: true//, alphaTest: 0.5
		,
		blending:THREE.AdditiveBlending,depthTest:      false,
	} );
	graph3d.linkUniforms = {
		//texture:   { type: "t", value: testMap },
		time:       { value: 1.0 },
		resolution: { value: new THREE.Vector2() }
	};
	graph3d.linksMaterial = new THREE.ShaderMaterial( {
		uniforms: graph3d.linkUniforms,
		vertexShader: document.getElementById( 'linksVertexShader' ).textContent,
		fragmentShader: document.getElementById( 'linksFragmentShader' ).textContent,
		transparent: true,
		depthTest:false,side: THREE.DoubleSide,blending:THREE.AdditiveBlending,
	} );
	graph3d.linesMaterial = new THREE.ShaderMaterial( {
		uniforms: graph3d.linkUniforms,
		vertexShader: document.getElementById( 'linksVertexShader' ).textContent,
		fragmentShader: document.getElementById( 'linksFragmentShader' ).textContent,
		transparent: true,
		depthTest:false,side: THREE.DoubleSide,blending:THREE.AdditiveBlending,
	} );
	graph3d.playerUniforms = {
		//texture:   { type: "t", value: glowMap },
		time:       { value: 1.0 },
		//resolution: { value: new THREE.Vector2() }
	};
	graph3d.playersMaterial = new THREE.ShaderMaterial( {//players are displayed with Points, like nodes
		uniforms: graph3d.playerUniforms,
		vertexShader: document.getElementById( 'playersVertexShader' ).textContent,
		fragmentShader: document.getElementById( 'playersFragmentShader' ).textContent,
		transparent: true,
		depthTest:false,blending:THREE.AdditiveBlending,//side: THREE.DoubleSide,
	} );
	
	graph3d.nodesGeometry=new THREE.BufferGeometry();
	graph3d.nodes= new THREE.Points(graph3d.nodesGeometry,graph3d.nodesMaterial);
	scene.add(graph3d.nodes);
	graph3d.linesGeometry=new THREE.BufferGeometry();
	graph3d.lines= new THREE.Mesh(graph3d.linesGeometry,graph3d.linesMaterial);
	graph3d.scene.add(graph3d.lines);
	graph3d.linksGeometry=new THREE.BufferGeometry();
	graph3d.links= new THREE.Mesh(graph3d.linksGeometry,graph3d.linksMaterial);
	graph3d.scene.add(graph3d.links);
	graph3d.playersGeometry=new THREE.BufferGeometry();
	graph3d.players= new THREE.Points(graph3d.playersGeometry,graph3d.playersMaterial);
	graph3d.scene.add(graph3d.players);
	
	
	
	
	
	
	
    graph3d.d3ForceLayout = d3.forceSimulation()//this is the 3d version
	.force('charge2D', d3.forceManyBody2D().strength(graph3d.chargeStrength2D))//hack: make this teh first force because it will ignore truely overlapping pairs, ie duplicates
    .force('link', d3.forceLink().strength(graph3d.linkStrength).distance(graph3d.linkDistance))
	.force('charge', d3.forceManyBody().strength(graph3d.chargeStrength))//.theta(2.5); 
	
    .force('collide', d3.forceCollide().radius(3)).force("layer",d3.forceZ().z(graph3d.zHeight).strength(graph3d.zStrength))
	.force('center2D', d3.forceCenter2D()) //the layer heights are all above 0
	.stop();
	//force('radial', d3.forceRadial().radius(graph3d.radialRadius).strength(graph3d.radialStrength)).stop();

	
	
	
	
	/*
	//the cloth simulation
	var loader = new THREE.TextureLoader();
	var clothTexture = loader.load( 'images/circuit_pattern.png' );
	clothTexture.anisotropy = 16;
	var clothMaterial = new THREE.MeshStandardMaterial( {
					opacity: 0.5,
					alphaTest: 0.25,
					map: clothTexture,
					side: THREE.DoubleSide,
					premultipliedAlpha: true,
					transparent: true
				} );
	

	graph3d.clothGeometry=new THREE.ParametricGeometry( clothFunction, cloth.w, cloth.h );
	graph3d.clothMesh = new THREE.Mesh( graph3d.clothGeometry, clothMaterial );
	graph3d.clothMesh.position.set( 0, 0, 0 );
	graph3d.clothMesh.castShadow = true;
	scene.add( graph3d.clothMesh );

	graph3d.clothMesh.customDepthMaterial = new THREE.MeshDepthMaterial( {

		depthPacking: THREE.RGBADepthPacking,
		map: clothTexture,
		alphaTest: 0.5

	} );
	*/
	
	
	
	
	
	
	
	
	
    var composer = new THREE.EffectComposer(graph3d.renderer);graph3d.composer=composer;
    var renderPass = new THREE.RenderPass(scene,graph3d.camera);
    //renderPass.renderToScreen = true;
    composer.addPass(renderPass);
	dpr = 1;
	if (window.devicePixelRatio !== undefined) {dpr = window.devicePixelRatio;}
	
	var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);graph3d.effectFXAA=effectFXAA;
	effectFXAA.uniforms['resolution'].value.set(1 / (domElement.clientWidth * dpr), 1 / (domElement.clientHeight * dpr));
	effectFXAA.renderToScreen = true;
	composer.addPass(effectFXAA);
	
	
	
	var stats = new Stats();
	stats.showPanel( 0 );
	stats.dom.style.position="";
	stats.dom.style.top="";
	stats.dom.style.bottom="0";
	document.querySelector("#graph-menu").appendChild( stats.dom );
    (function animate() {
        // IIFE
		stats.begin();

        // Update tooltip
        var objAtMouse=graph3d.getObjectAtPos(graph3d.mousePos);
        if(graph3d.showingTooltip){toolTipElem.textContent = objAtMouse ? graph3d.getDescription(objAtMouse) : '';}

        //graph3d.d3ForceLayout.alpha(1);//want it to always run
        layoutTick();
		
				
				
        // Frame cycle
        graph3d.controls.update();
        var delta = clock.getDelta();
        composer.render(delta);
		

		stats.end();
        requestAnimationFrame(animate);
    }
    )();
    resizeCanvas();

	graph3d.selectedNodes={};
	graph3d.selectedLayers={};
    graph3d.newNodePositions = [];
    //a list of to-be-created node coordinates that the user clicked to create locally but the server has yet to respond, but we don't want to submit private coordinate info, so when the server responds, we create the node with the hint about where it should be
    graph3d.linkDistanceFactor = 1;
    graph3d.linkStrengthFactor = 0.2;
    graph3d.chargeStrengthFactor = 0.5;
    graph3d.chargeStrength2DFactor = 5;
    graph3d.radialStrengthFactor = 1;
    graph3d.zStrengthFactor = 1;
    graph3d.zHeightFactor = 1;
    graph3d.zLogarithmicHeightRatio = 1;
    graph3d.nodeSizeFactor = 5;
    graph3d.multiLayerSizeBias = 0.1;
    graph3d.selectionSizeFactor = 3;
    graph3d.layerSelectionSizeFactor = 2;
    graph3d.nodeSize = function(node){
		let r=graph3d.multiLayerSizeBias;//if positive, makes single layer nodes smaller, 1 makes them invisible(a graph may not have all layers); if negative, make multi-layer nodes smaller, -1 makes them invisible
		
		//I want this multi layer bias scale to be adaptive to any layer distribution, independent of the number of layers a graph has.
		//the positive value is a blend ratio of the proportional size (layers/max number of layers). not the value of teh highest layer because a graph may have much less than that many layers, and 1-layer and  2 layer nodes should look visibly different.
		//negative ones are different - it's just a ratio of the layer-distributed size (1/n) versus the normal size, so more layered ones get smaller faster
		//
		let max=graph3d.world.maxLayersPerVertex;
		let original=graph3d.world.vertices[node.original];
		let c=original.layerCount;
		let s=1;
		if(r>0){ 
			s=r*(c/max)*(c/max)+(1-r)*0.5;//I like showing different # of layers as starting to dim at differet bias values?	but a few specific vertices that transition in the middle and are interesting are not easily visible in this way when everything else is dimming.
			//s=r*(c/max)+(1-r);
		}
		else{
			s=-r*(1/c)*(1/c)+(1+r)*0.5;
		}
		//and the diversity factor with a similar method
		let diversitySize=1,c2=original.diversity,r2=graph3d.nodeDiversitySizeFactor,max2=graph3d.world.maxVertexDiversity;
		if(max2==0){diversitySize=0.5;}
		else {
			if(r2>0){ 
				diversitySize=r2*(c2/max2)*(c2/max2)+(1-r2)*0.5;//I like showing different # of layers as starting to dim at differet bias values?	but a few specific vertices that transition in the middle and are interesting are not easily visible in this way when everything else is dimming.
				//s=r*(c/max)+(1-r);
			}
			else{
				diversitySize=-r2*(1/(c2+0.5))*(1/(c2+0.5))*0.25+(1+r2)*0.5;//to make 0 diversity and low diversity ones more distinct
			}
		}
		//s*=(1+Math.max(-0.9,original.diversity*graph3d.nodeDiversitySizeFactor));
		let degreeFactor=(node.degree?(Math.sqrt(Math.log2(node.degree))*graph3d.nodeDegreeSizeFactor+1):1);
		//using squared values for stronger contrast, and making the usual size smaller so the view doesn't get much brighter with r=0
		let selection=(Object.keys(graph3d.selectedNodes).length>0)?((graph3d.selectedNodes[node.original])?graph3d.selectionSizeFactor:(1/graph3d.selectionSizeFactor)):1;
		let layerSelection=(Object.keys(graph3d.selectedLayers).length>0)?((graph3d.selectedLayers[node.peelValue])?graph3d.layerSelectionSizeFactor:(1/graph3d.layerSelectionSizeFactor)):1;
		 return s*diversitySize*degreeFactor*selection*layerSelection;
	};
	graph3d.lineBrightness = function(node) {
		let selected=(graph3d.selectedNodes[node.original]);
		if(graph3d.egonet){
			let inEgonet=(graph3d.egonet[node.original]);
			return (selected?3:(inEgonet?2:1))* graph3d.lineBrightnessFactor;
		}
		else{
			return (selected?3:1)* graph3d.lineBrightnessFactor;
		}
	}
	graph3d.linkBrightness = function(link) {
		
		if(graph3d.egonet){
			let selected=((graph3d.selectedNodes[link.source.original])||(graph3d.selectedNodes[link.target.original]));
			let inEgonet=(graph3d.egonet[link.source.original])&&(graph3d.egonet[link.target.original]);
			return (selected?10:(inEgonet?8:0.2))* graph3d.linkBrightnessFactor;
		}
		else{
			let selected=((graph3d.selectedNodes[link.source.original])&&(graph3d.selectedNodes[link.target.original]));
			return (selected?10:0.2)* graph3d.linkBrightnessFactor;
		}
	}
	graph3d.linkThickness = function(link) {
		if(graph3d.egonet){
			let selected=((graph3d.selectedNodes[link.source.original])||(graph3d.selectedNodes[link.target.original]))?1.5:1;
			return selected* graph3d.linkThicknessFactor;
		}
		else{
			let selected=((graph3d.selectedNodes[link.source.original])&&(graph3d.selectedNodes[link.target.original]))?1.5:1;
			return selected* graph3d.linkThicknessFactor;
		}
	}
	graph3d.forcesChanged=function(value) {
        graph3d.d3ForceLayout.stop().alpha(1).nodes(graph3d.world.vArray).force('link').id(d=>d["id"]).links(graph3d.world.eArray);
    };
	graph3d.egonet={};//selected vertices and their neighbors, to make the edges within highlighted.
	graph3d.updateEgonet=function() {//only show the egonet when one vertex is selected
        //for(let i in graph3d.egonet){delete graph3d.egonet[i];}
		let count=Object.keys(graph3d.selectedNodes).length;
		selectedVerticesElem.textContent="Selected "+count+" vertices";
		if(count==1){
			graph3d.egonet={};
			let selectedID=Object.keys(graph3d.selectedNodes)[0];
			let selectedVertex=graph3d.world.vertices[selectedID],topCopy=selectedVertex.duplicates[selectedVertex.peelValue];
			for(let j in selectedVertex.edges){graph3d.egonet[j]=true;}
			
			let avgLength=0;let tempVector=new THREE.Vector2(),count=0;
			for(let i in graph3d.egonet){
			
				if(i != selectedID){
					count++;
					let other=graph3d.world.vertices[i];let edge=graph3d.world.edges[selectedVertex.edges[i]];
					for(let layer in other.duplicates)
					{//get firsts layer position
						let copy=other.duplicates[layer];
						let length=Math.sqrt((copy.x-topCopy.x)*(copy.x-topCopy.x)+(copy.y-topCopy.y)*(copy.y-topCopy.y));
						avgLength+=length;
						break;
					}
				}
			}
			if(count){avgLength/=count;}
			graph3d.avgLength=avgLength*0.7;
		}
		else{graph3d.egonet=null;}
        //for(let i in graph3d.selectedNodes){
		//	graph3d.egonet[i]=true;
		//	for(let j in graph3d.world.vertices[i].edges){graph3d.egonet[j]=true;}
		//}
		//save the avg ength of links to pull them to a closer reasonable distance
		
    };
    var gui = new dat.GUI({autoPlace:false});
    graph3d.gui = gui;
	document.getElementById("style-menu").appendChild(gui.domElement);
	gui.domElement.style.zIndex=4;
	
	//var cameraFolder = gui.addFolder('Camera');
	//cameraFolder.add(graph3d.camera, 'fov', 0, 150);
	var graphFolder = gui.addFolder('Graph');//a few parameters that control the p in different ways - the plain p value is too imprecise in a slider when we want very small values, so I think adding np(or 1/n) and logn/n scales are better.
	graph3d.edgeProbability=0.1;graph3d.np=5;graph3d.npOverLogn=5;//just default values; will be updated when the data is shown
    graphFolder.add(graph3d, 'edgeProbability', 0.00000001, 1).onFinishChange(function(value) {
		let n=Object.keys(graph3d.world.vertices).length;
		graph3d.world.edgeProbability=graph3d.edgeProbability;
		graph3d.np=graph3d.edgeProbability*n;
		graph3d.npOverLogn=graph3d.np/Math.log(n);
		graph3d.randomizeGraph();
    }).listen();
	graphFolder.add(graph3d, 'np', 0, 10).onFinishChange(function(value) {
		
		let n=Object.keys(graph3d.world.vertices).length;
		graph3d.edgeProbability=graph3d.np/n;
		graph3d.npOverLogn=graph3d.np/Math.log(n);
		graph3d.world.edgeProbability=graph3d.edgeProbability;
		graph3d.randomizeGraph();
    }).listen();
	graphFolder.add(graph3d, 'npOverLogn', 0, 10).onFinishChange(function(value) {
		
		let n=Object.keys(graph3d.world.vertices).length;
		graph3d.np=graph3d.npOverLogn*Math.log(n);
		graph3d.edgeProbability=graph3d.np/n;
		graph3d.world.edgeProbability=graph3d.edgeProbability;
		graph3d.randomizeGraph();
    }).listen();
    var forceFolder = gui.addFolder('Forces');
    forceFolder.add(graph3d, 'linkStrengthFactor', 0.05, 5).onChange(graph3d.forcesChanged);
	graph3d.selectionLinkStrengthFactor=15;
    forceFolder.add(graph3d, 'selectionLinkStrengthFactor', 1, 30).onChange(graph3d.forcesChanged);
    forceFolder.add(graph3d, 'linkDistanceFactor', 0.5, 3).onChange(graph3d.forcesChanged);
    forceFolder.add(graph3d, 'chargeStrengthFactor', 0.1, 5).onChange(graph3d.forcesChanged);
	forceFolder.add(graph3d, 'chargeStrength2DFactor', 0.1, 10).onChange(graph3d.forcesChanged);
    forceFolder.add(graph3d, 'radialStrengthFactor', 0.1, 5).onChange(graph3d.forcesChanged);
	forceFolder.add(graph3d, 'zHeightFactor', 0.1, 20).onChange(graph3d.forcesChanged);
	forceFolder.add(graph3d, 'zLogarithmicHeightRatio', 0, 1).onChange(graph3d.forcesChanged);
	forceFolder.add(graph3d, 'zStrengthFactor', 0.1, 5).onChange(graph3d.forcesChanged);

    var nodeFolder = gui.addFolder('Nodes');
    nodeFolder.add(graph3d.nodes, 'visible');
	nodeFolder.add(graph3d, 'nodeSizeFactor', 0.01, 10);
	graph3d.layerColorRatio=0.5;
	nodeFolder.add(graph3d, 'layerColorRatio', 0, 1);
	graph3d.logColorScale=true;
	nodeFolder.add(graph3d, 'logColorScale');
	nodeFolder.add(graph3d, 'multiLayerSizeBias', -1, 1);
	graph3d.nodeDiversitySizeFactor=0.1;
	nodeFolder.add(graph3d, 'nodeDiversitySizeFactor', -1, 1);
	graph3d.nodeDegreeSizeFactor=0.1;
	nodeFolder.add(graph3d, 'nodeDegreeSizeFactor', 0, 1);
	nodeFolder.add(graph3d, 'selectionSizeFactor', 1, 5);
	nodeFolder.add(graph3d, 'layerSelectionSizeFactor', 1, 3);
	var lineFolder = gui.addFolder('Vertical Lines');
    lineFolder.add(graph3d.lines, 'visible');
	
	graph3d.lineBrightnessFactor=0.3;
    lineFolder.add(graph3d, 'lineBrightnessFactor',0,7);
	graph3d.lineThickness=3;
    lineFolder.add(graph3d, 'lineThickness',0,20);
	graph3d.lineLayerColorRatio=0.1;
    lineFolder.add(graph3d, 'lineLayerColorRatio',0,1);
	graph3d.lineBlueTintRatio=0.3;
    lineFolder.add(graph3d, 'lineBlueTintRatio',0,1);
    var linkFolder = gui.addFolder('Links');
    linkFolder.add(graph3d.links, 'visible');
	graph3d.linkBrightnessFactor=0.5;
    linkFolder.add(graph3d, 'linkBrightnessFactor',0,7);
	graph3d.linkThicknessFactor=0.7;
    linkFolder.add(graph3d, 'linkThicknessFactor',0,20);
	
	/*
	var previewFolder = gui.addFolder('Subgraph preview');
	graph3d.previewShowing=true;
	previewFolder.add(graph3d, 'previewShowing');
	var clothFolder = gui.addFolder('Surface');
	graph3d.clothMesh.visible=false;
    clothFolder.add(graph3d.clothMesh, 'visible');
	cloth.horizontalConstraintStrength=1;
    clothFolder.add(cloth, 'horizontalConstraintStrength',0.1,10);
	cloth.floorHeight=-50;
    clothFolder.add(cloth, 'floorHeight',-200,100);
    clothFolder.add(gravity, 'z',-0.0015,0);
    clothFolder.add(graph3d.clothMesh.material, 'opacity',0,1).onChange(function(value){graph3d.clothMesh.material.needsUpdate=true;});
	*/
	gui.domElement.style.width="";
}

//gestures

graph3d.onclick=function(target){
	//can't dismiss the context menu here because using it requires some clicks
	if(target)
	{
		//now, click = look at, right click = context menu/affordances, double click = default ability that applies to the object
		//todo: click+press number or letter keys = use key ability; click+press shift=selection
		function getHotKey(){
			
		}
		
		switch(target.type){
			case "vertex": 
				var color=new THREE.Color().setRGB(target.color.r,target.color.g,target.color.b);
				color.getHexString();
				let temp="You see the "+(target.color.v>0.5?"large ":"small ")+ntc.name(color.getHexString())[1].toLowerCase()+" vertex "+target.original+" in layer "+target.peelValue+"."+"The original vertex has edges to ";
				for(let l in target.edges){temp+="vertex # "+l;}
				graph3d.addLog(temp); 
				if(!graph3d.selectedNodes[target.original]){graph3d.selectedNodes[target.original]={time:Date.now(),x:target.x,y:target.y,z:target.z};}
				else{delete graph3d.selectedNodes[target.original];}
				graph3d.updateEgonet();
				//graph3d.forcesChanged();
				//refresh link forces
				break;
			case "edge": graph3d.addLog("You see the edge #"+target.id+" between vertices "+target.source.id+" and "+target.target.id+".");break;
			case "player": graph3d.addLog("You see a player.");break;
		}
	}
	else
	{
		//
		if(Object.keys(graph3d.selectedNodes).length>0){
			for(let a in graph3d.selectedNodes){delete graph3d.selectedNodes[a];}
			graph3d.updateEgonet();//graph3d.forcesChanged();
		}
		
	}
}
graph3d.onrightclick=function (target){
	if(target)
	{
		//now, click = look at, right click = context menu/affordances, double click = default ability that applies to the object
		//todo: click+press number or letter keys = use key ability; click+press shift=selection
		function getHotKey(){
			
		}
		
		switch(target.type){
			case "vertex": 
				graph3d.addLog("selected layer #"+target.peelValue); 
				if(!graph3d.selectedLayers[target.peelValue]){graph3d.selectedLayers[target.peelValue]={time:Date.now()};}
				else{delete graph3d.selectedLayers[target.peelValue];}
				//graph3d.d3ForceLayout.stop().alpha(1).nodes(graph3d.world.vArray).force('link').id(d=>d["id"]).links(graph3d.world.eArray);
				//refresh link forces
				break;
			case "edge": //graph3d.addLog("You see the edge #"+target.id+" between vertices "+target.source.id+" and "+target.target.id+".");
				break;
			case "player": //graph3d.addLog("You see a player.");
				break;
		}
	}
	else
	{
		//
		for(let a in graph3d.selectedLayers){delete graph3d.selectedLayers[a];}
	}
	/*
	if(target)
	{
		//todo
		if(graph3d.activeContextMenu){graph3d.contextElem.removeChild(graph3d.activeContextMenu);graph3d.activeContextMenu=null;}
		if(!graph3d.contextMenus)return;
		var menu=graph3d.contextMenus[target.type];
		if(!menu) return;
		var gui=new dat.GUI({ autoPlace: false });
		graph3d.activeContextMenu=gui.domElement;
		gui.domElement.style.position="";
		function createListener(key){
			return function(value) {
				socket.emit("use menu",{object:target,key:key,value:value});//make sure the color format matches that in the server
				if(graph3d.activeContextMenu){graph3d.contextElem.removeChild(graph3d.activeContextMenu);graph3d.activeContextMenu=null;}
				};
		}
		for(var prop in menu)
		{
			if(! (prop in target)){
				switch(menu[prop].type){
					case "color":target[prop]={h:0,s:0,v:0};break;
					case "string": target[prop]="";break;
					case "number": target[prop]=1;break;//todo: this is weird, we don't want zero in force simulations. but should define some default values
				}
			}
			if(menu[prop].type=="color"){gui.addColor(target,prop).onFinishChange(createListener(prop));}
			else{gui.add(target,prop).onFinishChange(createListener(prop));}
		}
		graph3d.contextElem.appendChild(gui.domElement);
		graph3d.contextElem.style.left=(graph3d.mouseScreenPos.x+20)+"px";
		graph3d.contextElem.style.top=(graph3d.mouseScreenPos.y+20)+"px";
	}
	else
	{//todo: a global context menu? for forces?
		if(graph3d.activeContextMenu){graph3d.contextElem.removeChild(graph3d.activeContextMenu);}
		graph3d.activeContextMenu=null;
	}
		*/
}
graph3d.ondblclick=	function(target){
	for(var i in graph3d.abilities)
	{
		if(graph3d.abilities[i].filter(target)){
			socket.emit("use ability",{ability:i,target:target});
			graph3d.addLog("used ability "+graph3d.abilities[i].name+" with "+target.type+" #"+target.id);
			return;
		}
	}
	graph3d.addLog("can't use any ability on that");
}


graph3d.linkDistance = function(link) {
	//let selected=((graph3d.selectedNodes[link.source.original])||(graph3d.selectedNodes[link.target.original]))?0.8:1;
    return 60 * graph3d.linkDistanceFactor*(("length" in link)?(link.length+0.1):1);
}

graph3d.linkStrength = function(link) {
    var s = link.source.degree;
    var t = link.target.degree;
	//let selected=((graph3d.selectedNodes[link.source.original])||(graph3d.selectedNodes[link.target.original]))?graph3d.selectionLinkStrengthFactor:1;
    return 1* graph3d.linkStrengthFactor / Math.min(s, t);
}
graph3d.chargeStrength = function(data) {
    return -graph3d.chargeStrengthFactor*25 / (Object.keys(data.edges).length + 1);
}
graph3d.chargeStrength2D = function(data) {
    return -graph3d.chargeStrength2DFactor*5 / (Object.keys(data.edges).length + 1);//this force needs to be weaker than the 3d one becaue it tends to blow up
}
graph3d.radialRadius = function(data) {
    if (!graph3d.cumulativeDist)
        return graph3d.order ? graph3d.order + 1 : 2;
    var d = Object.keys(data.edges).length;
    return Math.sqrt(graph3d.order ? graph3d.order + 1 : 2) * 10 * ((Math.cbrt(1.000001 - graph3d.cumulativeDist[d] / graph3d.order)+((d == 0) ? 1 : Math.cbrt(1.000001 - graph3d.cumulativeDist[d-1] / graph3d.order)))/2);//this means essentially the midpoint of the outer and inner radius of the degree layer, if layers are arranged so that their volume reflects the distribution
}
graph3d.radialStrength = function(data) {
    var x = (Object.keys(data.edges).length + 1);
    return graph3d.radialStrengthFactor * 0.001;
    //*x
}
graph3d.zHeight = function(data) {
	if(graph3d.world.maxPeelValue==0)return 0;
	let r=graph3d.zLogarithmicHeightRatio;//how much of the height is logarithmic to the peel value rather than linear (the logarithic height of 0-layer is assumend to be 0) - log height is to deal with some random graphs that have a very high top layer and then only a few bottom layers with nothing between. Both normal and log heights should be on the same scale of 0 to 1, just distributed differently.
	let normalH=data.peelValue/graph3d.world.maxPeelValue;
	let logH=(data.peelValue==0)?0:(Math.log(data.peelValue+1)/Math.log(graph3d.world.maxPeelValue+1));
    return (normalH*(1-r)+logH*r)*Math.sqrt(Math.log(graph3d.world.maxPeelValue+1))*graph3d.zHeightFactor*250;//don't let some graphs be too tall to see clearly, but the total number of layers should still be reflected somehow.
}
graph3d.zStrength = function(data) {
    return graph3d.zStrengthFactor * 0.03;
}
graph3d.sizeChanged = function() {
    if (graph3d.world) {
        graph3d.order = Object.keys(graph3d.world.vertices).length;
    } else {
        graph3d.order = 0;
    }
    var size = Math.sqrt(graph3d.order + 1);//cube root or square root?
    graph3d.clickPlane.scale.x = size * 100;
    graph3d.clickPlane.scale.y = size * 100;
}
graph3d.degreeDistributionChanged = function() {
    var counts = {};
    var cumulative = {};
    var vs = graph3d.world.vertices;
    var maxDeg = -1;
    for (var i in vs) {
        var d = Object.keys(vs[i].edges).length;
        if (!(d in counts))
            counts[d] = 0;
        counts[d] += 1;
        if (maxDeg < d)
            maxDeg = d;
    }
    for (var i = 0; i <= maxDeg; i++) {
        var last = cumulative[i - 1] ? cumulative[i - 1] : 0;
        cumulative[i] = counts[i] ? counts[i] + last : last;
    }
    graph3d.degreeDist = counts;
    graph3d.cumulativeDist = cumulative;
    graph3d.maxDegree = maxDeg;
}
graph3d.calculatePeelValues=function(){//backwards peeling gives every vertex a layer, and edges are displayed as horizontal, at the height of the lower layer endpoint.

    var vs = graph3d.world.vertices;
	var dvs=[];graph3d.world.duplicatedVertices=dvs;
	var des=[];graph3d.world.duplicatedEdges=des;//edges are logically not duplicated; for debugging only
	var ls=[];graph3d.world.layers=ls;
    var es = graph3d.world.edges;
    for (var i in vs) {
		vs[i].peelValue=null;vs[i].duplicates={};
    }
	for (var i in es) {
		es[i].peelValue=null;
    }
	var edgesLeft;var done,peeled,minDegree;var peelValues;var degreedone;
	while(1){
		edgesLeft=false;
		for (var i in es) {
			if(es[i].peelValue===null){edgesLeft=true;break;}
		}
		if(!edgesLeft){break;}
		//calculate the core
		peelValues={};//peel is the layer just peeled
		while(1){//peel off one layer
			minDegree = Infinity;
			//get min degree
			for (var i in vs) {
				if(i in peelValues)continue;
				var deg=0;
				for(var j in vs[i].edges){
					//skip peeled edges
					if(es[vs[i].edges[j]].peelValue!==null){continue;}
					if(!(j in peelValues)){deg++;}
				}
				//console.log("degree "+deg);
				if(deg<minDegree)minDegree=deg;
			}
			//iteratively mark these nodes
			peeled={};//the last layer was not the core so can throw it away
			degreedone=false;
			while(!degreedone){
				degreedone=true;
				for (var i in vs) {
					if(i in peelValues)continue;
					var deg=0;
					for(var j in vs[i].edges){
						if(es[vs[i].edges[j]].peelValue!==null){continue;}
						if(!(j in peelValues)){deg++;}
					}
					if(deg<=minDegree){peelValues[i]=minDegree;peeled[i]=true;degreedone=false;}
				}
			}
			//console.log("degree "+minDegree+" peeled");
			done=true;
			for (var i in vs) {
				if(!(i in peelValues)){done=false;break;}
			}
			if(done)break;
		}
		
		//now first add teh duplicate vertices then layer the edges
		for(var i in peeled){
		//add the duplicate vertex first - the number of edges to be peeled for it is not 0 here.
			if(vs[i].peelValue===null){vs[i].peelValue=minDegree;}
			let newID=dvs.length,copy={};Object.assign(copy,vs[i]);copy.id=newID;copy.original=i;copy.edges={};copy.peelValue=minDegree;copy.degree=0;//the number of edges incident on this layer
			dvs.push(copy);vs[i].duplicates[minDegree]=dvs[newID];
		}
		let layerVertexCount=Object.keys(peeled).length;
		let layerEdgeCount=0;
		for(var i in peeled){
			//mark edges! even if both endpoints of an edge has a peel value the edge may still not be peeled.
			for(var j in vs[i].edges){
				//edges point to te duplicated vertices instead.
				if(j in peeled){
					let e=es[vs[i].edges[j]];if(e.peelValue!==null){continue;}
					e.peelValue=minDegree;layerEdgeCount++;
					e.sourceOriginal=e.source;e.targetOriginal=e.target;
					e.source=vs[i].duplicates[minDegree].id;e.target=vs[j].duplicates[minDegree].id;
					vs[i].duplicates[minDegree].edges[e.target]=e.id;vs[i].duplicates[minDegree].degree++;
					vs[j].duplicates[minDegree].edges[e.source]=e.id;vs[j].duplicates[minDegree].degree++;
				}
			}
			if(vs[i].peelValue===null){vs[i].peelValue=minDegree;}
			
		}//todo: graph update mechanisms should change for this
		//console.log("layer "+minDegree+" found, # of vertices is "+layerVertexCount+" and # of edges "+layerEdgeCount);
		ls[minDegree]={v:layerVertexCount,e:layerEdgeCount};
	}
	//assign the remaining vertices layer 0
	graph3d.world.maxPeelValue=0;
	graph3d.world.maxLayersPerVertex=0;
	graph3d.world.maxVertexDiversity=0;
	let layerZeroVertexCount=0;
	for (var i in vs) {
		if(vs[i].peelValue===null)
		{
			vs[i].peelValue=0;layerZeroVertexCount++;let newID=dvs.length,copy={};Object.assign(copy,vs[i]);copy.id=newID;copy.original=i;copy.edges={};copy.peelValue=0;copy.degree=0;dvs.push(copy);vs[i].duplicates[0]=copy;
		}
		if(vs[i].peelValue>graph3d.world.maxPeelValue)graph3d.world.maxPeelValue=vs[i].peelValue;
		
		
		vs[i].layerCount=Object.keys(vs[i].duplicates).length;
		if(vs[i].layerCount>graph3d.world.maxLayersPerVertex)graph3d.world.maxLayersPerVertex=vs[i].layerCount;
		
		let profile=[];profile.length=vs[i].peelValue;
		for( let j=0;j<profile.length;j++){if((j+1) in vs[i].duplicates)profile[j]=vs[i].duplicates[j+1].degree;else profile[j]=0;}
		vs[i].diversity=arrayEntropy(profile);if(vs[i].diversity>graph3d.world.maxVertexDiversity){graph3d.world.maxVertexDiversity=vs[i].diversity;}
	}
	if(layerZeroVertexCount>0){ls[0]={v:layerZeroVertexCount,e:0};}
}
function arrayEntropy(a)
{
	
	let sum=0;for(let i=0;i<a.length;i++){sum+=a[i];}
	if(sum==0)return 0;
	let e=0;for(let i=0;i<a.length;i++){if(!a[i])continue;e-=Math.log2(a[i]/sum)*a[i]/sum;}
	return e;
}
graph3d.update = function update() { 
    //for when the graph changes
    if (!graph3d.world){console.log("can't display missing world");return;}
	//console.log("starting update");
	//need arrays
	//the layer vertex duplication happens first
	if(!graph3d.world.duplicatedVertices)graph3d.calculatePeelValues();
	graph3d.world.vArray=graph3d.world.duplicatedVertices;//graph3d.world.vertices
	graph3d.world.eArray=Object.values(graph3d.world.edges);
    graph3d.sizeChanged();
    graph3d.degreeDistributionChanged();
	
    graph3d.d3ForceLayout.stop().alpha(1)// re-heat the simulation
    .nodes(graph3d.world.vArray).force('link').id(d=>d["id"]).links(graph3d.world.eArray);    //recalculate forces

	//update text descriptions
	let layersArray=[];	
	for(let l in graph3d.world.layers){
		layersArray.push({layer:l,"|V|":graph3d.world.layers[l].v,"|E|":graph3d.world.layers[l].e});
	}
	let columns=["layer","|V|","|E|"];
	var table=d3.select("#graph-layers");
	var thead = table.select('thead')
	
	var ttitle = thead.select('tr#title');
	var tcolumns = thead.select('tr#columns');
	tcolumns=tcolumns.selectAll('th')
		.data(columns);
	tcolumns.exit().remove();
	tcolumns.enter()
		.append('th')
		.text(function (column) { return column; });
	
	var	tbody = table.select('tbody');
	tbody=tbody.selectAll("tr").data(layersArray);
	tbody.exit().remove();
	tbody=tbody.enter().append("tr");
	
	var grid=tbody.selectAll('td');
	console.log(grid.data());
	grid=grid.data(function (row) {
		    return columns.map(function (column) {
		      return {column: column, value: row[column]};
		    });
		  });
	grid.exit().remove();
	grid.enter()
		  .append('td')
		    .text(function (d) { return d.value; });
	
	
	
	graphNameElement.innerText=graph3d.world.name;
	document.getElementById("graph-desc").innerText="|V|: "+Object.keys(graph3d.world.vertices).length+", |E|: "+Object.keys(graph3d.world.edges).length+", p: "+String(Number(graph3d.world.edgeProbability)).substring(0,5)+", peel value:"+graph3d.world.maxPeelValue+", Layers: "+Object.keys(graph3d.world.layers).length+"\n";
	
	graph3d.nodesGeometry=new THREE.BufferGeometry();
	var length=graph3d.world.vArray.length;
	var positions = new THREE.BufferAttribute( new Float32Array( length * 3 ), 3);positions.setDynamic(true);
	var colors = new THREE.BufferAttribute(  new Float32Array( length * 3 ), 3);colors.setDynamic(true);
	var sizes = new THREE.BufferAttribute( new Float32Array( length), 1);sizes.setDynamic(true);
	graph3d.nodesGeometry.addAttribute('position', positions);
	graph3d.nodesGeometry.addAttribute('customColor', colors);
	graph3d.nodesGeometry.addAttribute('size', sizes);
	graph3d.nodes.geometry=graph3d.nodesGeometry;
	
	graph3d.linesGeometry=new THREE.BufferGeometry();
	var linelength=Object.keys(graph3d.world.vertices).length;
	var linepositions = new THREE.BufferAttribute( new Float32Array( linelength * 18 ), 3);linepositions.setDynamic(true);
	var linecoords = new THREE.BufferAttribute( new Float32Array( linelength * 18 ), 3);linecoords.setDynamic(true);//planar coordinate system for the link rectangles
	var linecolors = new THREE.BufferAttribute(  new Float32Array( linelength * 18 ), 3);linecolors.setDynamic(true);
	var linebrightnesses = new THREE.BufferAttribute(  new Float32Array( linelength * 6 ), 1);linebrightnesses.setDynamic(true);
	graph3d.linesGeometry.addAttribute('position', linepositions);
	graph3d.linesGeometry.addAttribute('coord', linecoords);
	graph3d.linesGeometry.addAttribute('customColor', linecolors);
	graph3d.linesGeometry.addAttribute('brightness', linebrightnesses);
	graph3d.lines.geometry=graph3d.linesGeometry;
	
	graph3d.linksGeometry=new THREE.BufferGeometry();
	var length=graph3d.world.eArray.length;
	var positions2 = new THREE.BufferAttribute( new Float32Array( length * 18 ), 3);positions2.setDynamic(true);
	var coords = new THREE.BufferAttribute( new Float32Array( length * 18 ), 3);coords.setDynamic(true);//planar coordinate system for the link rectangles
	var colors2 = new THREE.BufferAttribute(  new Float32Array( length * 18 ), 3);colors2.setDynamic(true);
	var brightnesses = new THREE.BufferAttribute(  new Float32Array( length * 6 ), 1);brightnesses.setDynamic(true);
	graph3d.linksGeometry.addAttribute('position', positions2);
	graph3d.linksGeometry.addAttribute('coord', coords);
	graph3d.linksGeometry.addAttribute('customColor', colors2);
	graph3d.linksGeometry.addAttribute('brightness', brightnesses);
	graph3d.links.geometry=graph3d.linksGeometry;
	//console.log("updated");
	
}
graph3d.updatePlayers=function()
{//recreate the player points buffer
	graph3d.world.pArray=Object.values(graph3d.world.players);
	graph3d.playersGeometry=new THREE.BufferGeometry();
	var length=Object.keys(graph3d.world.players).length;//unlike nodes and links, this doesn't need to be an array
	var positions = new THREE.BufferAttribute( new Float32Array( length * 3 ), 3);positions.setDynamic(true);
	var colors = new THREE.BufferAttribute(  new Float32Array( length * 3 ), 3);colors.setDynamic(true);
	var sizes = new THREE.BufferAttribute( new Float32Array( length), 1);sizes.setDynamic(true);
	graph3d.playersGeometry.addAttribute('position', positions);
	graph3d.playersGeometry.addAttribute('customColor', colors);
	graph3d.playersGeometry.addAttribute('size', sizes);
	graph3d.players.geometry=graph3d.playersGeometry;
}

graph3d.getDescription=function(obj){
	let t="";
	if (obj.type){t+=obj.type+" ";}
	if (obj.label){t+=obj.label+"\n";}
	if("id" in obj){t+=" ID "+obj.id;}
	if("peelValue" in obj){t+=" Layer #"+obj.peelValue;}
	if(obj.original){
		t+=" Original ID "+obj.original;
		if(graph3d.world.vertices[obj.original]){
			let v=graph3d.world.vertices[obj.original];
			t+=" highest layer "+v.peelValue+",";
			t+=" belongs to "+v.layerCount+" layers,";
			t+=" diversity is "+v.diversity;
		}
	}
	return t;
}
graph3d.selectObject = function(target,multi) {//need to support selecting any kind of game object - nodes, links, players etc
//currently selecting a player isn't supported, as it can be confused with selecting a vertex. A workaround for showing edge selection may be drawing marks in the center of the edge?

	const getSize={ //given an object's type, get the function that computes the select mark size
		vertex:(v)=>(v.color.v*4+2),
		edge:(e)=>3,
		player:(p)=>0
	};
	const getPosition={
		vertex:(v)=>v,
		edge:(e)=>((new THREE.Vector3).add(e.source).add(e.target).multiplyScalar(0.5)),//d3-force changed the vertex ids into references
		player:(p)=>graph3d.world.vertices[p.position]
	};
    if (target) {
		console.log("selection not implemented");
		if(!multi){
			//now I'm going to use real dragging and get rid of the click-to-drag hack

			//the selected objects can be of any type now
			
		}
        else{
			//todo
		}
		
    } else {
        graph3d.deselectObject();
    }

}
graph3d.deselectObject = function() {
    //todo
}


//topological ones
graph3d.addNode = function(node) {
    //creates the d3 node and the object
    if (!graph3d.world)
        return;
    if ((typeof node == "undefined") || (typeof node.id == "undefined")) {
        console.error("adding undefined node");
        return;
    }
    if (graph3d.world.vertices[node.id]) {
        console.error("adding node with existing ID " + node.id);
        return;
    }
    //console.log("adding node " + node.id);
    
    world.vertices[node.id] = node;
    if (graph3d.newNodePositions.length > 0) {
        var c = graph3d.newNodePositions.pop();
        node.x = c.x;
        node.y = c.y;
        node.z = c.z;
    } else {
        node.x = Math.random();
        node.y = Math.random();
        node.z = Math.random();
    }
    
    graph3d.update();//will update the arrays
}
graph3d.deleteNode = function(id) {
    //deletes the d3 node and the object
    if (!graph3d.world)
        return;
    if (typeof id == "undefined")
        return;
    if (!graph3d.world.vertices[id]) {
        console.error("removing nonexistent node " + id);
        return;
    }
    var node = graph3d.world.vertices[id];
	//console.log("removing node " + node.id);
    var l = node.edges;
    for (var target in l) {
        //console.log("forced deletion of an edge to " + target);
		var eid=graph3d.world.vertices[id].edges[target];
        delete graph3d.world.vertices[id].edges[target];
        delete graph3d.world.vertices[target].edges[id];
        var link = graph3d.world.edges[eid];
            delete graph3d.world.edges[eid];
        if (!link) {
            console.log("can't find link object");
        }
    }
    delete graph3d.world.vertices[id];

    graph3d.update();//todo: pool updates and change visuals at most once per frame in case the server is very active
}

graph3d.addLink = function(data) {
    //node ids
    if (!graph3d.world)
        return;
    if ((typeof data.source == "undefined") || (typeof data.target == "undefined"))
        return;
    if (graph3d.world.vertices[data.source].edges[data.target]) {
        console.error("link already existing " + data.source + "," + data.target);
        return;
    }
    graph3d.world.vertices[data.source].edges[data.target] = data.id;
    graph3d.world.vertices[data.target].edges[data.source] = data.id;
    graph3d.world.edges[data.id]=data;
    graph3d.update();
}

graph3d.deleteLink = function(data) {
    //node ids
    if (!graph3d.world)
        return;
    if ((typeof data.source == "undefined") || (typeof data.target == "undefined"))
        return;
    if (!graph3d.world.vertices[data.source].edges[data.target]) {
        console.error("deleting nonexistent link " + data.source + "," + data.target);
        return;
    }
	var eid=graph3d.world.vertices[data.source].edges[data.target];
    delete graph3d.world.vertices[data.source].edges[data.target];
    delete graph3d.world.vertices[data.target].edges[data.source];
    var link= graph3d.world.edges[eid];
    delete graph3d.world.edges[eid];
    if (!link) {
        console.log("can't find link object");
    }
    //graph3d.deleteLink3d(link);
    graph3d.update();
}

graph3d.addObject=function(data){
	//console.log("adding "+data.type);
	switch(data.type)
	{
		case "vertex": graph3d.addNode(data); break;
		case "edge": graph3d.addLink(data);break;
		case "player":graph3d.addLog("A player joined the game");graph3d.addPlayer(data);break;
	}
}
graph3d.deleteObject=function(data){
	//console.log("deleting "+data.type);
	switch(data.type)
	{
		case "vertex": graph3d.deleteNode(data); break;
		case "edge": graph3d.deleteLink(data);break;
		case "player":graph3d.addLog("A player left the game");graph3d.deletePlayer(data);break;
	}
}
graph3d.updateObject=function(data){
	//console.log("updating "+data.type+" " +data.id+": "+data.key+" to "+JSON.stringify(data.value));
	switch(data.type)
	{
		case "vertex": graph3d.world.vertices[data.id][data.key]=data.value; break;
		case "edge": graph3d.world.edges[data.id][data.key]=data.value; break;
		case "player":graph3d.world.players[data.id][data.key]=data.value; break;
	}
}
graph3d.addPlayer=function(data)
{
	graph3d.world.players[data.id]=data;
	graph3d.updatePlayers();
}
graph3d.deletePlayer=function(data)
{
	delete graph3d.world.players[data.id];
	graph3d.updatePlayers();
}
function createGraph(order,p){
	let world={players:{},vertices:{},edges:{},edgeProbability:p,name:"Random graph",info:"a random graph"},id=1,eid=1;
	for(id=1;id<=order;id++){
		world.vertices[id]={type:"vertex",id:id,color:{r:1,g:1,b:1,h:1,s:0,v:1},edges:{}};
		for(let j=1;j<id;j++){
			if(Math.random()<world.edgeProbability){
				let e={type:"edge",id:eid,length:1,brightness:1,thickness:1};
				world.edges[eid]=e;
				world.vertices[id].edges[j]=eid;
				world.vertices[j].edges[id]=eid;
				eid++;
			}
		}
	}
	return world;
}
graph3d.randomizeGraph = function() {
	if((!graph3d.world)||(!("edgeProbability" in graph3d.world))){console.log("cannot half");return;}
	graph3d.show(createGraph(Math.floor(Object.keys(graph3d.world.vertices).length),graph3d.world.edgeProbability));
}
graph3d.halfVertices = function() {
	if((!graph3d.world)||(!("edgeProbability" in graph3d.world))){console.log("cannot half");return;}
	graph3d.show(createGraph(Math.floor(Object.keys(graph3d.world.vertices).length/2),graph3d.world.edgeProbability));
}
graph3d.doubleVertices = function() {
	if((!graph3d.world)||(!("edgeProbability" in graph3d.world))){console.log("cannot double");return;}
	graph3d.show(createGraph(Math.floor(Object.keys(graph3d.world.vertices).length*2),graph3d.world.edgeProbability));
}

graph3d.randomizeLayout=function(){
	if(!graph3d.world.vArray){console.log("layout not initialized");return;}
	let size=graph3d.world.vArray.length;
	let radius=Math.cbrt(size);
	for(var i=0;i<size;i++){
		let v=graph3d.world.vArray[i];
		v.x=(Math.random()-0.5)*radius;
		v.y=(Math.random()-0.5)*radius;
		v.z=(Math.random()-0.5)*radius;
	}
}
graph3d.resetView=function(){
	graph3d.camera.position.x = 0;
    graph3d.camera.position.y = 0;
    graph3d.camera.position.z = Math.sqrt(graph3d.order + 1) * CAMERA_DISTANCE2NODES_FACTOR;//sqrt instead of cbrt because the layout is often quite flat
	graph3d.controls.target.x=0;
	graph3d.controls.target.y=0;
	graph3d.controls.target.z=0;
}
graph3d.show = function show(world) {
	//console.log("showing world "+world.id);
	graph3d.world = world;if("edgeProbability" in world){
		let n=Object.keys(graph3d.world.vertices).length;
		graph3d.edgeProbability=world.edgeProbability;
		graph3d.world.edgeProbability=graph3d.edgeProbability;
		graph3d.np=graph3d.edgeProbability*n;
		graph3d.npByLogn=graph3d.np/Math.log(n);
	}
	//for(let a in graph3d.selectedNodes){delete graph3d.selectedNodes[a];}
	//for(let a in graph3d.selectedLayers){delete graph3d.selectedLayers[a];}
	if(world.selectedNodes){graph3d.selectedNodes=world.selectedNodes;}else{graph3d.selectedNodes={};world.selectedNodes=graph3d.selectedNodes;console.log("init selection");}//this way the selection in the snapshot changes as the user selects within it
	if(world.selectedLayers){graph3d.selectedLayers=world.selectedLayers;}else{graph3d.selectedLayers={};world.selectedLayers=graph3d.selectedLayers;}
	graph3d.updateEgonet();
    layout = graph3d.d3ForceLayout;
	layout.stop().alpha(1)// re-heat the simulation
    .numDimensions(world.dimensions || 3);
	graph3d.update();
    graph3d.updatePlayers();
	//if the loaded graph doesn't come with a view, preserve the old one (in case of new random graphs), otherwise use the new one (i n case of saved graphs)
	if(world.view){
		graph3d.camera.position.x = world.view.position.x;
		graph3d.camera.position.y = world.view.position.y;
		graph3d.camera.position.z = world.view.position.z;
		graph3d.controls.target.x= world.view.target.x;
		graph3d.controls.target.y= world.view.target.y;
		graph3d.controls.target.z= world.view.target.z;
	}
	
	//disable auto reset because we may want to keep teh view across randomizations
    //graph3d.camera.position.x = 0;
    //graph3d.camera.position.y = 0;
    //graph3d.camera.position.z = Math.sqrt(graph3d.order + 1) * CAMERA_DISTANCE2NODES_FACTOR;//sqrt instead of cbrt because the layout is often quite flat
    //graph3d.camera.lookAt(graph3d.nodes.position);
    //todo:tunnel effect of entering/exiting a world
    /*
	//prepare abilities and context menus
	//some utility functions for that
	var localPlayer=graph3d.world.players[graph3d.localPlayerID];
	
	function adjacent(a,b){return b in graph3d.world.vertices[a].edges;}
	function reachable(start, end)
	{
		if(typeof start=="object"){start=start.id;}
		if(typeof end=="object"){end=end.id;}
		var map={};
		explore(world,start);
		function explore(world,i,cc){
			map[i]=true;
			for(var n in world.vertices[i].edges){if(!(map[n]))explore(world,n);}
		}
		if(map[end])return true; 
		else return false;
	}
	
	graph3d.abilities=graph3d.worldTemplates[graph3d.world.template].abilities;
	for(var i=0;i<graph3d.abilities.length;i++){
		graph3d.abilities[i].filter=eval(graph3d.abilities[i].filter);
		if(typeof graph3d.abilities[i].filter !="function"){console.log("unable to parse filter for "+graph3d.abilities[i].name);}
	}
	graph3d.contextMenus=graph3d.worldTemplates[graph3d.world.template].menus||{};
	if(graph3d.activeContextMenu){graph3d.contextElem.removeChild(graph3d.activeContextMenu);}
	graph3d.activeContextMenu=null;
	*/
	
	//if I use dat.gui, the menu has to be created for every object when clicked
	
	
	
	//console.log("shown world "+world.id);
}
graph3d.expandSelection=function(){
	let temp={};
    for(let i in graph3d.selectedNodes){
		temp[i]=true;
		for(let j in graph3d.world.vertices[i].edges){temp[j]=true;}
	}
	for(let i in temp){
		graph3d.selectedNodes[i]=true;
	}
	graph3d.updateEgonet();
}

var layout;
var cntTicks = 0;
var startTickTime = new Date();
function resizeCanvas() {
    var w = graph3d.domElement.clientWidth;
    var h = graph3d.domElement.clientHeight;
    graph3d.renderer.setSize(w, h);
    graph3d.camera.aspect = w / h;
    graph3d.camera.updateProjectionMatrix();
	graph3d.effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
	graph3d.composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}
var tested=false;
function layoutTick() {
    var world = graph3d.world;
    if (!world)
        return;

	if(!tested){tested=true;}
    

    
	
	//align duplicate vertices
	let vs=graph3d.world.vertices,dvs=graph3d.world.duplicatedVertices;
	for(let i in vs){
		let avg={x:0,y:0,z:0};let count=vs[i].layerCount;
		if(count<=1)continue;
		for(let j in vs[i].duplicates){
			let dv=vs[i].duplicates[j];
			avg.x+=dv.x;
			avg.y+=dv.y;
			//funny bug: lol I averaged z too.. haha
		}
		
		avg.x/=count;
		avg.y/=count;
		avg.z/=count;
		for(let j in vs[i].duplicates){
			let dv=vs[i].duplicates[j];
			dv.x=avg.x;
			dv.y=avg.y;
			if(isNaN(dv.x)){throw Error("NaN in nodes");}
	
		}
	}
	
	//directly pull the egonet closer (to within the link length)
	
	if(graph3d.egonet)
	{
		let es=world.edges;
		let selectedID=Object.keys(graph3d.selectedNodes)[0],selectedVertex=graph3d.world.vertices[selectedID],topCopy=selectedVertex.duplicates[selectedVertex.peelValue];
		let v1=new THREE.Vector2(),v2=new THREE.Vector2(),v3=new THREE.Vector2(0,0,0);
		let length=graph3d.avgLength;
		for(let i in graph3d.egonet){
			if(i != selectedID){
				v1.set(topCopy.x,topCopy.y);
				let other=graph3d.world.vertices[i];let edge=es[selectedVertex.edges[i]];//graph3d.linkDistance(edge);
				for(let layer in other.duplicates)
				{
					//pull all copies closer
					let copy=other.duplicates[layer];
					v2.set(copy.x,copy.y);
					v3.set(copy.x,copy.y);
					v2.addScaledVector(v1,-1).setLength(length).add(v1).addScaledVector(v3,-1).multiplyScalar(0.02);
					copy.x+=v2.x;copy.y+=v2.y;//copy.z=v2.z;
					
				}
				topCopy.x-=v2.x;topCopy.y-=v2.y;
			}
		}
		//if(count){topCopy.x+=Math.max(Math.min(1,v3.x),-1);topCopy.y+=Math.max(Math.min(1,v3.y),-1);}
	}
	
	graph3d.d3ForceLayout.tick();
	
	//
	/*let time=Date.now();let factor=0.5,timeLimit=2000;
	//dampen selected vertices' movement just after they are selected, so they pull their egonets closer and not get pulled away
    for(let i in graph3d.selectedNodes) {
        for(let layer in graph3d.world.vertices[i].duplicates)
		{
			let node=graph3d.world.vertices[i].duplicates[layer];
			if(time-graph3d.selectedNodes[i].time<timeLimit){
				let r=1-(time-graph3d.selectedNodes[i].time)/timeLimit;
				node.x+=(graph3d.selectedNodes[i].x-node.x)*r;graph3d.selectedNodes[i].x=node.x;
				node.y+=(graph3d.selectedNodes[i].y-node.y)*r;graph3d.selectedNodes[i].y=node.y;
				//horizontal only
			}
		}
    }
	*/
	
	graph3d.nodeUniforms.time.value+=0.001;//??
	graph3d.linkUniforms.time.value+=0.001;
	graph3d.playerUniforms.time.value+=0.001;
	
	
	var positions=graph3d.nodesGeometry.attributes.position.array;
	var colors=graph3d.nodesGeometry.attributes.customColor.array;
	var sizes=graph3d.nodesGeometry.attributes.size.array;
	
	var color=new THREE.Color();
	var color2=new THREE.Color();
	
	var layerColors={};
	if(graph3d.logColorScale){
		let logs={},logSum=0,lastl=0;
		for(let l in graph3d.world.layers){
			let diff=l-lastl;lastl=l;
			let temp=(Math.log(Math.log(diff+1)+1));
			logSum+=temp;logs[l]=logSum;
		}
		for(let l in graph3d.world.layers){
			layerColors[l]=new THREE.Color();layerColors[l].setHSL((logs[l])*0.85/(logSum),1,0.5);//console.log()
		}
	}
	else{
		for(let l in graph3d.world.layers){
			layerColors[l]=new THREE.Color();layerColors[l].setHSL((l-1)*0.85/(graph3d.world.maxPeelValue+1),1,0.5);
		}
	}
	/*
	//hold up the cloth
	var p = cloth.particles;
	for ( var i = 0, il = p.length; i < il; i ++ ) {//pins
		graph3d.clothGeometry.vertices[ i ].copy( p[ i ].position );
	}
	var xc,yc,offset=cloth.w*restDistance/2,tempz;
	*/
	for(var i=0,i3=0,i6=0,i18=0;i<world.vArray.length;i++,i3+=3,i6+=6,i18+=18)
	{
		var node=world.vArray[i];
		/*
		xc=Math.round((node.x+offset)/restDistance+Math.random()*2-1),yc=Math.round((node.y+offset)/restDistance+Math.random()*2-1);
		if((xc>=0&&xc<=cloth.w)&&(yc>=0&&yc<=cloth.h)){
			tempz=p[yc*(cloth.w+1)+xc].position.z;
			if(tempz<node.z){p[yc*(cloth.w+1)+xc].position.z+=0.2*(node.z-p[yc*(cloth.w+1)+xc].position.z);}
			//only push the cloth up. let it fall with gravity
		}
		*/
		if(isNaN(node.x+node.y+node.z)){throw Error("NaN in nodes");}
		positions[ i3 + 0 ] = node.x;
		positions[ i3 + 1 ] = node.y;
		positions[ i3 + 2 ] = node.z;
		color.setHSL(node.color.h / 360, node.color.s, 1 - (node.color.s / 2));
		color2=layerColors[node.peelValue];//0.85 is magenta to make the top layer different from the lowest one - some graphs only have these two and it's hard to see which way is up.  Should layer 1 always be red? How about layer 0? I think layer 1 always being red is good, and layer 0 is less important. allow for 0-degenerate graphs?
		let l=graph3d.layerColorRatio,r=1-l;
		//color.setHSL(node.color.h / 360, node.color.s, 1 - (node.color.s / 2));
		colors[ i3 + 0 ] = color.r*r+color2.r*l;
		colors[ i3 + 1 ] = color.g*r+color2.g*l;
		colors[ i3 + 2 ] = color.b*r+color2.b*l;
		sizes[ i ] =(node.color.v * 3  + 3*graph3d.nodeSizeFactor)*graph3d.nodeSize(node);
		
		
		
		
	}
	
	
	
	graph3d.nodesGeometry.attributes.position.needsUpdate = true;
	graph3d.nodesGeometry.attributes.customColor.needsUpdate = true;
	graph3d.nodesGeometry.attributes.size.needsUpdate = true;
    graph3d.nodesGeometry.computeBoundingSphere();
	
	
	
	let linepositions=graph3d.linesGeometry.attributes.position.array;
	let linecolors=graph3d.linesGeometry.attributes.customColor.array;
	let linecoords=graph3d.linesGeometry.attributes.coord.array;
	let linebrightnesses=graph3d.linesGeometry.attributes.brightness.array;
	let p1=new THREE.Vector3();
	let p2=new THREE.Vector3();
	let v1=new THREE.Vector3();//source to target
	let v2=new THREE.Vector3();//camera to source
	let v3=new THREE.Vector3();//camera to target
	let up=new THREE.Vector3();
	let n1=new THREE.Vector3();
	
	//lines for alignment
	let vkeys=Object.keys(world.vertices);
	let intrinsicColor=new THREE.Color();
	let sourceColor=new THREE.Color();
	let targetColor=new THREE.Color();
	let blueColor=new THREE.Color((1-graph3d.lineBlueTintRatio),(1-graph3d.lineBlueTintRatio),1);
	for(let i=0,i3=0,i6=0,i18=0;i<vkeys.length;i++,i3+=3,i6+=6,i18+=18)
	{
		let vertex=world.vertices[vkeys[i]];
		let layers=Object.keys(vertex.duplicates);
		if(layers.length==0)continue;
		let source=vertex.duplicates[layers[0]],target=vertex.duplicates[layers[layers.length-1]];
		let link={source:source,target:target};
		
		p1.copy(link.source);p2.copy(link.target);
		v1.copy(p1);v1.multiplyScalar(-1);v1.add(p2);
		v2.copy(p1);v2.multiplyScalar(-1);v2.add(graph3d.camera.position);
		v3.copy(p2);v3.multiplyScalar(-1);v3.add(graph3d.camera.position);
		up.copy(graph3d.camera.position);up.multiplyScalar(-1);up.add(p2);
		up.cross(v1);up.normalize();
		up.multiplyScalar(graph3d.lineThickness*(graph3d.nodeSize(source)+graph3d.nodeSize(target))*2.5);
		//link.thickness?link.thickness*2+1:1);//show thickness easily without having to add an attribute...
		//up.copy(v2);up.cross(v1);up.normalize();
		
		linepositions[ i18 + 0 ] = link.source.x+up.x;
		linepositions[ i18 + 1 ] = link.source.y+up.y;
		linepositions[ i18 + 2 ] = link.source.z+up.z;
		linepositions[ i18 + 3 ] = link.source.x-up.x;
		linepositions[ i18 + 4 ] = link.source.y-up.y;
		linepositions[ i18 + 5 ] = link.source.z-up.z;
		linepositions[ i18 + 6 ] = link.target.x+up.x;
		linepositions[ i18 + 7 ] = link.target.y+up.y;
		linepositions[ i18 + 8 ] = link.target.z+up.z;
		
		linepositions[ i18 + 9 ] = link.source.x-up.x;
		linepositions[ i18 + 10 ] = link.source.y-up.y;
		linepositions[ i18 + 11 ] = link.source.z-up.z;
		linepositions[ i18 + 12 ] = link.target.x-up.x;
		linepositions[ i18 + 13 ] = link.target.y-up.y;
		linepositions[ i18 + 14 ] = link.target.z-up.z;
		linepositions[ i18 + 15 ] = link.target.x+up.x;
		linepositions[ i18 + 16 ] = link.target.y+up.y;
		linepositions[ i18 + 17 ] = link.target.z+up.z;
		
		
		linecoords[ i18 + 0 ] = -1;  //(-1,1), (1,1) the first two dimensions specify the relative coords in the ribbon
		linecoords[ i18 + 1 ] = 1;	// (-1,-1), (1,-1)
		linecoords[ i18 + 2 ] = v2.length();//the third dimension is depth, used for adaptively making the link look thicker for antialiasing when the link is too far away
		linecoords[ i18 + 3 ] = -1; 
		linecoords[ i18 + 4 ] = -1;
		linecoords[ i18 + 5 ] = v2.length();
		linecoords[ i18 + 6 ] = 1; 
		linecoords[ i18 + 7 ] = 1;
		linecoords[ i18 + 8 ] = v3.length();
		
		linecoords[ i18 + 9 ] = -1;
		linecoords[ i18 + 10 ] = -1;
		linecoords[ i18 + 11 ] = v2.length();
		linecoords[ i18 + 12 ] = 1; 
		linecoords[ i18 + 13 ] = -1;
		linecoords[ i18 + 14 ] = v3.length();
		linecoords[ i18 + 15 ] = 1; 
		linecoords[ i18 + 16 ] = 1;
		linecoords[ i18 + 17 ] = v3.length();
		
		let brightness=graph3d.lineBrightness(source);
		//("brightness" in link)?Math.min(link.brightness+0.1,1):1;
		linebrightnesses[ i6 + 0 ] = brightness;
		linebrightnesses[ i6 + 1 ] = brightness;	
		linebrightnesses[ i6 + 2 ] = brightness;
		linebrightnesses[ i6 + 3 ] = brightness; 
		linebrightnesses[ i6 + 4 ] = brightness;
		linebrightnesses[ i6 + 5 ] = brightness;
		
		let r1=graph3d.lineLayerColorRatio;//vs the node intrinsic colors
		//let r2=graph3d.lineBlueTintRatio;
		intrinsicColor.copy(link.source.color).multiplyScalar(1-r1);//for a vertex the intrinsic colors are the same at all layers
		sourceColor.setHSL((link.source.peelValue-1)*0.85/(graph3d.world.maxPeelValue+1),1,0.5).multiplyScalar(r1);//the layer colors
		targetColor.setHSL((link.target.peelValue-1)*0.85/(graph3d.world.maxPeelValue+1),1,0.5).multiplyScalar(r1);
		sourceColor.add(intrinsicColor).multiply(blueColor);
		targetColor.add(intrinsicColor).multiply(blueColor);
		
		linecolors[ i18 + 0 ] = sourceColor.r;
		linecolors[ i18 + 1 ] = sourceColor.g;
		linecolors[ i18 + 2 ] = sourceColor.b;
		linecolors[ i18 + 3 ] = sourceColor.r;
		linecolors[ i18 + 4 ] = sourceColor.g;
		linecolors[ i18 + 5 ] = sourceColor.b;
		linecolors[ i18 + 6 ] = targetColor.r;
		linecolors[ i18 + 7 ] = targetColor.g;
		linecolors[ i18 + 8 ] = targetColor.b;
		
		linecolors[ i18 + 9 ] = sourceColor.r;
		linecolors[ i18 + 10 ] = sourceColor.g;
		linecolors[ i18 + 11 ] = sourceColor.b;
		linecolors[ i18 + 12 ] = targetColor.r;
		linecolors[ i18 + 13 ] = targetColor.g;
		linecolors[ i18 + 14 ] = targetColor.b;
		linecolors[ i18 + 15 ] = targetColor.r;
		linecolors[ i18 + 16 ] = targetColor.g;
		linecolors[ i18 + 17 ] = targetColor.b;
	}
	graph3d.linesGeometry.attributes.position.needsUpdate = true;
	graph3d.linesGeometry.attributes.customColor.needsUpdate = true;
	graph3d.linesGeometry.attributes.coord.needsUpdate = true;
	graph3d.linesGeometry.attributes.brightness.needsUpdate = true;
	graph3d.linesGeometry.computeBoundingSphere();
	
	
	//links
	var positions2=graph3d.linksGeometry.attributes.position.array;
	var colors2=graph3d.linksGeometry.attributes.customColor.array;
	var coords=graph3d.linksGeometry.attributes.coord.array;
	var brightnesses=graph3d.linksGeometry.attributes.brightness.array;
	
	
	if(graph3d.links.visible){
	for(var i=0,i6=0,i18=0;i<world.eArray.length;i++,i6+=6,i18+=18)
	{
		var link=world.eArray[i];
		//calculate the sideways vector for the link ribbon
		p1.copy(link.source);p2.copy(link.target);
		v1.copy(p1);v1.multiplyScalar(-1);v1.add(p2);
		v2.copy(p1);v2.multiplyScalar(-1);v2.add(graph3d.camera.position);
		v3.copy(p2);v3.multiplyScalar(-1);v3.add(graph3d.camera.position);
		up.copy(graph3d.camera.position);up.multiplyScalar(-1);up.add(p2);
		up.cross(v1);up.normalize();
		up.multiplyScalar((link.thickness?link.thickness*2+1:1)*graph3d.linkThickness(link));//show thickness easily without having to add an attribute...
		//up.copy(v2);up.cross(v1);up.normalize();
		
		positions2[ i18 + 0 ] = link.source.x+up.x;
		positions2[ i18 + 1 ] = link.source.y+up.y;
		positions2[ i18 + 2 ] = link.source.z+up.z;
		positions2[ i18 + 3 ] = link.source.x-up.x;
		positions2[ i18 + 4 ] = link.source.y-up.y;
		positions2[ i18 + 5 ] = link.source.z-up.z;
		positions2[ i18 + 6 ] = link.target.x+up.x;
		positions2[ i18 + 7 ] = link.target.y+up.y;
		positions2[ i18 + 8 ] = link.target.z+up.z;
		
		positions2[ i18 + 9 ] = link.source.x-up.x;
		positions2[ i18 + 10 ] = link.source.y-up.y;
		positions2[ i18 + 11 ] = link.source.z-up.z;
		positions2[ i18 + 12 ] = link.target.x-up.x;
		positions2[ i18 + 13 ] = link.target.y-up.y;
		positions2[ i18 + 14 ] = link.target.z-up.z;
		positions2[ i18 + 15 ] = link.target.x+up.x;
		positions2[ i18 + 16 ] = link.target.y+up.y;
		positions2[ i18 + 17 ] = link.target.z+up.z;
		
		coords[ i18 + 0 ] = -1;  //(-1,1), (1,1) the first two dimensions specify the relative coords in the ribbon
		coords[ i18 + 1 ] = 1;	// (-1,-1), (1,-1)
		coords[ i18 + 2 ] = v2.length();//the third dimension is depth, used for adaptively making the link look thicker for antialiasing when the link is too far away
		coords[ i18 + 3 ] = -1; 
		coords[ i18 + 4 ] = -1;
		coords[ i18 + 5 ] = v2.length();
		coords[ i18 + 6 ] = 1; 
		coords[ i18 + 7 ] = 1;
		coords[ i18 + 8 ] = v3.length();
		
		coords[ i18 + 9 ] = -1;
		coords[ i18 + 10 ] = -1;
		coords[ i18 + 11 ] = v2.length();
		coords[ i18 + 12 ] = 1; 
		coords[ i18 + 13 ] = -1;
		coords[ i18 + 14 ] = v3.length();
		coords[ i18 + 15 ] = 1; 
		coords[ i18 + 16 ] = 1;
		coords[ i18 + 17 ] = v3.length();
		
		var brightness=("brightness" in link)?Math.min(link.brightness+0.1,1):1;
		brightness*=graph3d.linkBrightness(link);
		brightnesses[ i6 + 0 ] = brightness;
		brightnesses[ i6 + 1 ] = brightness;	
		brightnesses[ i6 + 2 ] = brightness;
		brightnesses[ i6 + 3 ] = brightness; 
		brightnesses[ i6 + 4 ] = brightness;
		brightnesses[ i6 + 5 ] = brightness;
		
		colors2[ i18 + 0 ] = link.source.color.r*brightness;
		colors2[ i18 + 1 ] = link.source.color.g*brightness;
		colors2[ i18 + 2 ] = link.source.color.b*brightness;
		colors2[ i18 + 3 ] = link.source.color.r*brightness;
		colors2[ i18 + 4 ] = link.source.color.g*brightness;
		colors2[ i18 + 5 ] = link.source.color.b*brightness;
		colors2[ i18 + 6 ] = link.target.color.r*brightness;
		colors2[ i18 + 7 ] = link.target.color.g*brightness;
		colors2[ i18 + 8 ] = link.target.color.b*brightness;
		
		colors2[ i18 + 9 ] = link.source.color.r*brightness;
		colors2[ i18 + 10 ] = link.source.color.g*brightness;
		colors2[ i18 + 11 ] = link.source.color.b*brightness;
		colors2[ i18 + 12 ] = link.target.color.r*brightness;
		colors2[ i18 + 13 ] = link.target.color.g*brightness;
		colors2[ i18 + 14 ] = link.target.color.b*brightness;
		colors2[ i18 + 15 ] = link.target.color.r*brightness;
		colors2[ i18 + 16 ] = link.target.color.g*brightness;
		colors2[ i18 + 17 ] = link.target.color.b*brightness;

	}
	graph3d.linksGeometry.attributes.position.needsUpdate = true;
	graph3d.linksGeometry.attributes.coord.needsUpdate = true;
	graph3d.linksGeometry.attributes.customColor.needsUpdate = true;
	graph3d.linksGeometry.attributes.brightness.needsUpdate = true;
    graph3d.linksGeometry.computeBoundingSphere();
	}
	
	//players
	var positions=graph3d.playersGeometry.attributes.position.array;
	var colors=graph3d.playersGeometry.attributes.customColor.array;
	var sizes=graph3d.playersGeometry.attributes.size.array;
	var color=new THREE.Color();var i=0,i3=0;
	for(var j in graph3d.world.pArray)//though it doesn't use D3 forces, it needs to be clicked
	{
		var player=graph3d.world.pArray[j];var node=world.vertices[player.position].duplicates[Object.keys(world.vertices[player.position].duplicates)[0]];
		/*
		if(node){
			positions[ i3 + 0 ] = node.x;
			positions[ i3 + 1 ] = node.y;
			positions[ i3 + 2 ] = node.z;
			sizes[i]=node.color.v * 4  + 8;
			
		}
		else{
			positions[ i3 + 0 ] = 0;
			positions[ i3 + 1 ] = 0;
			positions[ i3 + 2 ] = 0;
			sizes[i]= 8;

		}
		*/
		//debug: put this at the camera target
		positions[ i3 + 0 ] = graph3d.controls.target.x;
		positions[ i3 + 1 ] = graph3d.controls.target.y;
		positions[ i3 + 2 ] = graph3d.controls.target.z;
		sizes[i]=16;
			
		colors[ i3 + 0 ] = 0.3;
		colors[ i3 + 1 ] = (player.id==graph3d.localPlayerID)?1:0.3;//green for self
		colors[ i3 + 2 ] = 0.3;
		/*color.setHSL(node.color.h / 360, node.color.s, 1 - (node.color.s / 2));
		
		if(player.id==graph3d.localPlayerID){
			sizes[i]=node.color.v * 4  + 8;
			colors[ i3 + 0 ] = 0.3;
			colors[ i3 + 1 ] = 1;//green for self
			colors[ i3 + 2 ] = 0.3;
		}
		else{
			sizes[ i ] =node.color.v * 4  + 3.5;
			colors[ i3 + 0 ] = color.r;
			colors[ i3 + 1 ] = color.g;
			colors[ i3 + 2 ] = color.b;
		}//todo - the player should have a power value in itself
		*/
		i++;i3+=3;
	}
	
	graph3d.playersGeometry.attributes.position.needsUpdate = true;
	graph3d.playersGeometry.attributes.customColor.needsUpdate = true;
	graph3d.playersGeometry.attributes.size.needsUpdate = true;
    graph3d.playersGeometry.computeBoundingSphere();
	
	/*
	//cloth - this is actually rather expensive!
	if(graph3d.clothMesh.visible){
		var windStrength = Math.cos( time / 7000 ) * 20 + 40;

		windForce.set( Math.sin( time / 2000 ), Math.cos( time / 3000 ), Math.sin( time / 1000 ) )
		windForce.normalize()
		windForce.multiplyScalar( windStrength );

		simulate( time );
		
		//cloth
		var p = cloth.particles;

		for ( var i = 0, il = p.length; i < il; i ++ ) {

			graph3d.clothGeometry.vertices[ i ].copy( p[ i ].position );

		}

		graph3d.clothGeometry.verticesNeedUpdate = true;

		graph3d.clothGeometry.computeFaceNormals();
		graph3d.clothGeometry.computeVertexNormals();
		
		
	}
	*/
	
	//logs
	
	var logs=graph3d.logElem.children;
	for(var i =0;i<logs.length;i++)
	{
		if((new Date().getTime()-logs[i].createTime)>2000){logs[i].style.display="none";}
	}
	var lastlog=graph3d.logElem.lastElementChild;
	if(lastlog&&(lastlog.style.display=="none")){graph3d.logElem.removeChild(lastlog);}
}



/**  adapted from //https://stackoverflow.com/questions/2303690/resizing-an-image-in-an-html5-canvas
 * Hermite resize - fast image resize/resample using Hermite filter. 1 cpu version!
 * 
 * @param {HtmlElement} canvas
 * @param {int} width
 * @param {int} height
 * @param {boolean} resize_canvas if true, canvas will be resized. Optional.
 */
function resample_single(canvas, width, height, resize_canvas) {
    var width_source = canvas.width;
    var height_source = canvas.height;
    width = Math.round(width);
    height = Math.round(height);

    var ratio_w = width_source / width;
    var ratio_h = height_source / height;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);

    var ctx = canvas.getContext("2d");
    var img = ctx.getImageData(0, 0, width_source, height_source);
    var img2 = ctx.createImageData(width, height);
    var data = img.data;
    var data2 = img2.data;

    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var x2 = (i + j * width) * 4;
            var weight = 0;
            var weights = 0;
            var weights_alpha = 0;
            var gx_r = 0;
            var gx_g = 0;
            var gx_b = 0;
            var gx_a = 0;
            var center_y = (j + 0.5) * ratio_h;
            var yy_start = Math.floor(j * ratio_h);
            var yy_stop = Math.ceil((j + 1) * ratio_h);
            for (var yy = yy_start; yy < yy_stop; yy++) {
                var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                var center_x = (i + 0.5) * ratio_w;
                var w0 = dy * dy; //pre-calc part of w
                var xx_start = Math.floor(i * ratio_w);
                var xx_stop = Math.ceil((i + 1) * ratio_w);
                for (var xx = xx_start; xx < xx_stop; xx++) {
                    var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                    var w = Math.sqrt(w0 + dx * dx);
                    if (w >= 1) {
                        //pixel too far
                        continue;
                    }
                    //hermite filter
                    weight = 2 * w * w * w - 3 * w * w + 1;
                    var pos_x = 4 * (xx + yy * width_source);
                    //alpha
                    gx_a += weight * data[pos_x + 3];
                    weights_alpha += weight;
                    //colors
                    if (data[pos_x + 3] < 255)
                        weight = weight * data[pos_x + 3] / 250;
                    gx_r += weight * data[pos_x];
                    gx_g += weight * data[pos_x + 1];
                    gx_b += weight * data[pos_x + 2];
                    weights += weight;
                }
            }
            data2[x2] = gx_r / weights;
            data2[x2 + 1] = gx_g / weights;
            data2[x2 + 2] = gx_b / weights;
            data2[x2 + 3] = gx_a / weights_alpha;
        }
    }
    //clear and resize canvas
    if (resize_canvas === true) {
        canvas.width = width;
        canvas.height = height;
    } else {
        ctx.clearRect(0, 0, width_source, height_source);
    }

    //draw
    ctx.putImageData(img2, 0, 0);
}
