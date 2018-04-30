var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

//Set up tooltip
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function (d) {
    return  d.name + "";
})
svg.call(tip);

var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

var linkpath = ("../data/road_data.csv");
var nodepath = ("../data/cities.csv");

d3.csv(nodepath, function(error, nodes2) {
    if (error) throw error;

    nodes2.forEach(function(node) {
        node.id = node.id;
        node.name = node.name;
    });

    console.log(nodes2);

    d3.csv(linkpath, function(error, links) {
        if (error) throw error;

        var nodesByName = {};

        links.forEach(function(link) {
            link.source = nodeByName(link.source);
            // console.log(link.source)
            // var sourceVar = nodes2.filter(function(d) {return d.id = link.source});
            // var targetVar = nodes2.filter(function(d) {return d.id = link.target});
            // link.source = sourceVar.name;
            // link.target = targetVar.name;
            link.target = nodeByName(link.target);
        });

        var nodes = d3.values(nodes2);

        // console.log(nodes)

        // var link = svg.selectAll(".link")
        //     .data(links)
        //     .enter().append("line")
        //         .attr("class", "link")
        //         .attr("stroke-width", 1);

        var link = svg.append("g")
          .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
          .attr("stroke-width", function(d) { return Math.sqrt(1); });

        console.log(link)

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
                .attr("class", "node")
                .attr("r", 4.5)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))
                .on('dblclick', connectedNodes)
                .on('mouseover', tip.show) //Added
                .on('mouseout', tip.hide);

        node.append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) { return d.id });

        simulation
            .nodes(nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(links);

        function ticked() {
            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        }

              //Toggle stores whether the highlighting is on
        var toggle = 0;

             //Create an array logging what is connected to what
        var linkedByIndex = {};

        for (i = 0; i < nodes.length; i++) {
            linkedByIndex[i + "," + i] = 1;
        };

        links.forEach(function (d) {
            linkedByIndex[d.source.index + "," + d.target.index] = 1;
        });

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

        function neighboring(a, b) {
            return linkedByIndex[a.index + "," + b.index];
        }

        function connectedNodes() {
            if (toggle == 0) {
                    //Reduce the opacity of all but the neighbouring nodes
                d = d3.select(this).node().__data__;
                
                node.style("opacity", function (o) {
                    return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
                });      
                link.style("opacity", function (o) {
                    return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
                }); 
                  //Reduce the op    
                toggle = 1;
            } else {
                    //Put them back to opacity=1
                node.style("opacity", 1);
                link.style("opacity", 1);
                toggle = 0;
            }
        }
        
        function nodeByName(name) {
            return nodesByName[name] || (nodesByName[name] = {name: name});
        }
    });
});

/*
d3.csv(nodepath, function(nodes) {
    var nodelookup = {};
    var nodecollector = {};
    count = 0; 
    // we want to create a lookup table that will relate the links file and the nodes file
    nodes.forEach(function(row) {
        nodelookup[row.id] = row.id; 
        nodecollector[row.id] = {name: row.name, group: '1'};
    });

    console.log(nodecollector);
    console.log(nodelookup);

    d3.csv(linkpath, function(linkchecker) {
        var linkcollector = {};
        indexsource = 0;
        indextarget = 0; 
        count= 0;
        //console.log(nodelookup['celery'])
        linkchecker.forEach(function(link) {
            // console.log(link);
            linkcollector[count] = {source: link.source, target: link.target};
        //console.log(linkcollector[count]) 
            count++
        });

        console.log(linkcollector);

        var nodes = d3.values(nodecollector);
        var links = d3.values(linkcollector);

        console.log(nodes);
        console.log(links);


        var link = svg.selectAll(".link")
            .data(links)
            .enter().append("g")
            .attr("class", "links")
            .enter().append("line")
            .attr("stroke-width", 1);
                
        console.log(link);
          // Create the node circles.
        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .enter().append("circle")
            .attr("r", 5)
            .attr("fill", function(d) { return color(d.group); })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on('dblclick', connectedNodes)
            .on('mouseover', tip.show) //Added
            .on('mouseout', tip.hide);
         
         // //put in little circles to drag
         //  node.append("circle")
         //      .attr("r", 4.5)
         //    .attr("class", function(d) { return "node " + d.group; })
         //    .call(force.drag);
            
        //add the words  
        node.append("text")
              .attr("dx", 12)
              .attr("dy", ".35em")
              .text(function(d) { return d.name });

          simulation
              .nodes(nodes)
              .on("tick", ticked);

          simulation.force("link")
              .links(links);

          function ticked() {
            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
          }

          //Toggle stores whether the highlighting is on
          var toggle = 0;

          //Create an array logging what is connected to what
          var linkedByIndex = {};
          for (i = 0; i < nodes.length; i++) {
            linkedByIndex[i + "," + i] = 1;
          };

          links.forEach(function (d) {
            linkedByIndex[d.source.index + "," + d.target.index] = 1;
          });

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

          function neighboring(a, b) {
              return linkedByIndex[a.index + "," + b.index];
          }

        function connectedNodes() {
            if (toggle == 0) {
                //Reduce the opacity of all but the neighbouring nodes
                d = d3.select(this).node().__data__;
                node.style("opacity", function (o) {
                    return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
                });      
                link.style("opacity", function (o) {
                    return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
                }); 
              //Reduce the op    
                toggle = 1;
            } else {
                //Put them back to opacity=1
                node.style("opacity", 1);
                link.style("opacity", 1);
                toggle = 0;
            }
        }
    });
});
*/