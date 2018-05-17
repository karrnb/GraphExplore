import tulip
import tulipgui
import http.server
import json
import logging
import cgi
import networkx as nx
from networkx.readwrite import json_graph
PORT = 8000


nodes=[]
edges=[]
properties={}
result={'nodes':nodes,'links':edges,'properties':properties}
g=tulip.tlp.loadGraph("eroads.tlp")
layout=g.getLayoutProperty("tempLayout")
algorithms=tulip.tlp.getLayoutAlgorithmPluginsList()
algorithmsText=json.dumps(algorithms)
algorithmname=""
props={}
G = nx.Graph()
for p in g.getProperties():
	props[p]=g.getProperty(p)
	properties[p]={'name':props[p].getName(),'type':props[p].getTypename(),'nodeDefaultValue':props[p].getNodeDefaultStringValue(),'edgeDefaultValue':props[p].getEdgeDefaultStringValue()}
for n in g.getNodes():
	id=g.nodePos(n);
	node={"id":id}
	nodes.append(node)
	
	#nxnode=G.nodes[id]
	for p in props:
		if p=="id": continue
		if props[p].getNodeStringValue(n)!=properties[p]['nodeDefaultValue']:
			value=props[p].getNodeStringValue(n)
			node[p]=value
			#G.nodes()[id][p]=value
	G.add_node(id,node)
for e in g.getEdges():
	sourceid=g.nodePos(g.source(e))
	targetid=g.nodePos(g.target(e))
	edge={"source":sourceid,"target":targetid}
	edges.append(edge)
	G.add_edge(sourceid, targetid)
	nxedge=G[sourceid][targetid]
	for p in props:
		if (p=="source") or (p =="target"): continue
		if props[p].getEdgeStringValue(e)!=properties[p]['edgeDefaultValue']:
			value=props[p].getEdgeStringValue(e)
			if properties[p]["type"]=="int": value =int(value)
			if properties[p]["type"]=="double": value =float(value)
			edge[p]=value
			nxedge[p]=value
resultText=json.dumps(result)
resultText2 = json.dumps(json_graph.node_link_data(G))


class TestHandler(http.server.SimpleHTTPRequestHandler):
	def _set_headers(self):
		self.send_response(200)
		self.send_header('Content-type', 'application/json')
		self.end_headers()
	def do_GET(self):
		#self._set_headers()
		if self.path== '/data.json':
			self._set_headers()
			self.wfile.write(resultText.encode('utf-8'))
		elif self.path== '/data2.json':
			self._set_headers()
			self.wfile.write(resultText2.encode('utf-8'))
		elif self.path== '/layout-algorithms.json':
			self._set_headers()
			self.wfile.write(algorithmsText.encode('utf-8'))
		else:
			http.server.SimpleHTTPRequestHandler.do_GET(self)
	def do_HEAD(self):
		self._set_headers()
	def do_POST(self):
		# ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
		# print(ctype)
		# if ctype == 'multipart/form-data':
			# postvars = cgi.parse_multipart(self.rfile, pdict)
		# elif ctype == 'application/x-www-form-urlencoded':
			# length = int(self.headers.get('content-length'))
			# postvars = cgi.parse_qs(self.rfile.read(length), keep_blank_values=1)
		# elif ctype == 'application/json':
			# length = int(self.headers.get('content-length'))
			# postvars = json.loads(self.rfile.read(length).decode("utf-8"))
		# else:
			# postvars = {}
		length = int(self.headers.get('content-length'))
		postvars = json.loads(self.rfile.read(length).decode("utf-8"))
		print(json.dumps(postvars))
		self._set_headers()
		#self.wfile.write("POST request for {}".format(self.path).encode('utf-8'))
		if postvars['type']== "shortestPath":
			sp=nx.shortest_path(G, source=int(postvars['source']), target=int(postvars['target']), weight="length")
			self.wfile.write(json.dumps(sp).encode('utf-8'))
		elif postvars['type']== "layout":
			algorithmname=postvars['algorithm']
			print(algorithmname)
			params = tulip.tlp.getDefaultPluginParameters(algorithmname, g)
			g.applyLayoutAlgorithm(algorithmname, layout, params)
			layoutresult=[]
			for n in g.getNodes():
				layoutresult.append(layout.getNodeStringValue(n))
			self.wfile.write(json.dumps(layoutresult).encode('utf-8'))
						
server_address = ("", PORT)
server = http.server.HTTPServer(server_address, TestHandler)
print("start")
server.serve_forever()
print("done")