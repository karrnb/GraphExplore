var highlight={nodes:{},links:{}};
function highlightPath(path)
  {
    
    if(path.length>0){
      highlight.nodes[path[0]]=true;
      for(var i=1;i<path.length;i++)
      {
        highlight.nodes[path[i]]=true;
        highlight.links[mygraph.nodeMap[path[i-1]].edges[path[i]].index]=true;
      }
    }
    nodeSelection.each(function(d,i) {
      if(d.id in highlight.nodes){this.classList.add("selected");}
      else{this.classList.remove("selected");}
    });
    linkSelection.each(function(d,i) {
      if(d.index in highlight.links){
        this.classList.add("selected");this.classList.remove("neighbor");
      }
      else{
        this.classList.remove("selected");
        if((d.source.id in highlight.nodes)||(d.target.id in highlight.nodes)){
          this.classList.add("neighbor");
        }
        else{this.classList.remove("neighbor");}
      }

    });
  }