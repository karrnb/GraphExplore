// https://github.com/vasturiano/d3-force-3d Version 1.0.7. Copyright 2017 Vasco Asturiano.
//modified slightly to add the new forceRadial
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3= global.d3 || {})));//_force??
}(this, (function (exports) { 'use strict';
var center = function(x, y, z) {
  var nodes;
  if (x == null) x = 0;
  if (y == null) y = 0;
  if (z == null) z = 0;
  function force() {
    var i,
        n = nodes.length,
        node,
        sx = 0,
        sy = 0,
        sz = 0;
    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x || 0, sy += node.y || 0, sz += node.z || 0;
    }
    for (sx = sx / n - x, sy = sy / n - y, sz = sz / n - z, i = 0; i < n; ++i) {
      node = nodes[i];
      if (sx) { node.x -= sx; }
      if (sy) { node.y -= sy; }
      if (sz) { node.z -= sz; }
    }
  }
  force.initialize = function(_) {
    nodes = _;
  };
  force.x = function(_) {
    return arguments.length ? (x = +_, force) : x;
  };
  force.y = function(_) {
    return arguments.length ? (y = +_, force) : y;
  };
  force.z = function(_) {
    return arguments.length ? (z = +_, force) : z;
  };
  return force;
};
var center2D = function(x, y, z) {
  var nodes;
  if (x == null) x = 0;
  if (y == null) y = 0;
  //if (z == null) z = 0;
  function force() {
    var i,
        n = nodes.length,
        node,
        sx = 0,
        sy = 0;
        //sz = 0;
    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x || 0, sy += node.y || 0; //sz += node.z || 0;
    }
    for (sx = sx / n - x, sy = sy / n - y,  i = 0; i < n; ++i) {//sz = sz / n - z
      node = nodes[i];
      if (sx) { node.x -= sx; }
      if (sy) { node.y -= sy; }
      //if (sz) { node.z -= sz; }
    }
  }
  force.initialize = function(_) {
    nodes = _;
  };
  force.x = function(_) {
    return arguments.length ? (x = +_, force) : x;
  };
  force.y = function(_) {
    return arguments.length ? (y = +_, force) : y;
  };
  //force.z = function(_) {
   // return arguments.length ? (z = +_, force) : z;
//};
  return force;
};
var constant = function(x) {
  return function() {
    return x;
  };
};
var jiggle = function() {
  return (Math.random() - 0.5) * 1e-6;
};
var tree_add = function(d) {
  var x = +this._x.call(null, d);
  return add(this.cover(x), x, d);
};
function add(tree, x, d) {
  if (isNaN(x)) return tree; // ignore invalid points
  var parent,
      node = tree._root,
      leaf = {data: d},
      x0 = tree._x0,
      x1 = tree._x1,
      xm,
      xp,
      right,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return tree._root = leaf, tree;
  // Find the existing leaf for the new point, or add it.
  while (node.length) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (parent = node, !(node = node[i = +right])) return parent[i] = leaf, tree;
  }
  // Is the new point is exactly coincident with the existing point?
  xp = +tree._x.call(null, node.data);
  if (x === xp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  // Otherwise, split the leaf node until the old and new point are separated.
  do {
    parent = parent ? parent[i] = new Array(2) : tree._root = new Array(2);
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
  } while ((i = +right) === (j = +(xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll(data) {
  var i, n = data.length,
      x,
      xz = new Array(n),
      x0 = Infinity,
      x1 = -Infinity;
  // Compute the points and their extent.
  for (i = 0; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, data[i]))) continue;
    xz[i] = x;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
  }
  // If there were no (valid) points, inherit the existing extent.
  if (x1 < x0) x0 = this._x0, x1 = this._x1;
  // Expand the tree to cover the new points.
  this.cover(x0).cover(x1);
  // Add the new points.
  for (i = 0; i < n; ++i) {
    add(this, xz[i], data[i]);
  }
  return this;
}
var tree_cover = function(x) {
  if (isNaN(x = +x)) return this; // ignore invalid points
  var x0 = this._x0,
      x1 = this._x1;
  // If the binarytree has no extent, initialize them.
  // Integer extent are necessary so that if we later double the extent,
  // the existing half boundaries don�t change due to floating point error!
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1;
  }
  // Otherwise, double repeatedly to cover.
  else if (x0 > x || x > x1) {
    var z = x1 - x0,
        node = this._root,
        parent,
        i;
    switch (i = +(x < (x0 + x1) / 2)) {
      case 0: {
        do parent = new Array(2), parent[i] = node, node = parent;
        while (z *= 2, x1 = x0 + z, x > x1);
        break;
      }
      case 1: {
        do parent = new Array(2), parent[i] = node, node = parent;
        while (z *= 2, x0 = x1 - z, x0 > x);
        break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  // If the binarytree covers the point already, just return.
  else return this;
  this._x0 = x0;
  this._x1 = x1;
  return this;
};
var tree_data = function() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do data.push(node.data); while (node = node.next)
  });
  return data;
};
var tree_extent = function(_) {
  return arguments.length
      ? this.cover(+_[0][0]).cover(+_[1][0])
      : isNaN(this._x0) ? undefined : [[this._x0], [this._x1]];
};
var Half = function(node, x0, x1) {
  this.node = node;
  this.x0 = x0;
  this.x1 = x1;
};
var tree_find = function(x, radius) {
  var data,
      x0 = this._x0,
      x1,
      x2,
      x3 = this._x1,
      halves = [],
      node = this._root,
      q,
      i;
  if (node) halves.push(new Half(node, x0, x3));
  if (radius == null) radius = Infinity;
  else {
    x0 = x - radius;
    x3 = x + radius;
  }
  while (q = halves.pop()) {
    // Stop searching if this half can�t contain a closer node.
    if (!(node = q.node)
        || (x1 = q.x0) > x3
        || (x2 = q.x1) < x0) continue;
    // Bisect the current half.
    if (node.length) {
      var xm = (x1 + x2) / 2;
      halves.push(
        new Half(node[1], xm, x2),
        new Half(node[0], x1, xm)
      );
      // Visit the closest half first.
      if (i = +(x >= xm)) {
        q = halves[halves.length - 1];
        halves[halves.length - 1] = halves[halves.length - 1 - i];
        halves[halves.length - 1 - i] = q;
      }
    }
    // Visit this point. (Visiting coincident points isn�t necessary!)
    else {
      var d = x - +this._x.call(null, node.data);
      if (d < radius) {
        radius = d;
        x0 = x - d;
        x3 = x + d;
        data = node.data;
      }
    }
  }
  return data;
};
var tree_remove = function(d) {
  if (isNaN(x = +this._x.call(null, d))) return this; // ignore invalid points
  var parent,
      node = this._root,
      retainer,
      previous,
      next,
      x0 = this._x0,
      x1 = this._x1,
      x,
      xm,
      right,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return this;
  // Find the leaf node for the point.
  // While descending, also retain the deepest parent with a non-removed sibling.
  if (node.length) while (true) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (!(parent = node, node = node[i = +right])) return this;
    if (!node.length) break;
    if (parent[(i + 1) & 1]) retainer = parent, j = i;
  }
  // Find the point to remove.
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  // If there are multiple coincident points, remove just the point.
  if (previous) return (next ? previous.next = next : delete previous.next), this;
  // If this is the root point, remove it.
  if (!parent) return this._root = next, this;
  // Remove this leaf.
  next ? parent[i] = next : delete parent[i];
  // If the parent now contains exactly one leaf, collapse superfluous parents.
  if ((node = parent[0] || parent[1])
      && node === (parent[1] || parent[0])
      && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }
  return this;
};
function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}
var tree_root = function() {
  return this._root;
};
var tree_size = function() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do ++size; while (node = node.next)
  });
  return size;
};
var tree_visit = function(callback) {
  var halves = [], q, node = this._root, child, x0, x1;
  if (node) halves.push(new Half(node, this._x0, this._x1));
  while (q = halves.pop()) {
    if (!callback(node = q.node, x0 = q.x0, x1 = q.x1) && node.length) {
      var xm = (x0 + x1) / 2;
      if (child = node[1]) halves.push(new Half(child, xm, x1));
      if (child = node[0]) halves.push(new Half(child, x0, xm));
    }
  }
  return this;
};
var tree_visitAfter = function(callback) {
  var halves = [], next = [], q;
  if (this._root) halves.push(new Half(this._root, this._x0, this._x1));
  while (q = halves.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, x1 = q.x1, xm = (x0 + x1) / 2;
      if (child = node[0]) halves.push(new Half(child, x0, xm));
      if (child = node[1]) halves.push(new Half(child, xm, x1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.x1);
  }
  return this;
};
function defaultX(d) {
  return d[0];
}
var tree_x = function(_) {
  return arguments.length ? (this._x = _, this) : this._x;
};
function binarytree(nodes, x) {
  var tree = new Binarytree(x == null ? defaultX : x, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Binarytree(x, x0, x1) {
  this._x = x;
  this._x0 = x0;
  this._x1 = x1;
  this._root = undefined;
}
function leaf_copy(leaf) {
  var copy = {data: leaf.data}, next = copy;
  while (leaf = leaf.next) next = next.next = {data: leaf.data};
  return copy;
}
var treeProto = binarytree.prototype = Binarytree.prototype;
treeProto.copy = function() {
  var copy = new Binarytree(this._x, this._x0, this._x1),
      node = this._root,
      nodes,
      child;
  if (!node) return copy;
  if (!node.length) return copy._root = leaf_copy(node), copy;
  nodes = [{source: node, target: copy._root = new Array(2)}];
  while (node = nodes.pop()) {
    for (var i = 0; i < 2; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(2)});
        else node.target[i] = leaf_copy(child);
      }
    }
  }
  return copy;
};
treeProto.add = tree_add;
treeProto.addAll = addAll;
treeProto.cover = tree_cover;
treeProto.data = tree_data;
treeProto.extent = tree_extent;
treeProto.find = tree_find;
treeProto.remove = tree_remove;
treeProto.removeAll = removeAll;
treeProto.root = tree_root;
treeProto.size = tree_size;
treeProto.visit = tree_visit;
treeProto.visitAfter = tree_visitAfter;
treeProto.x = tree_x;
var tree_add$1 = function(d) {
  var x = +this._x.call(null, d),
      y = +this._y.call(null, d);
  return add$1(this.cover(x, y), x, y, d);
};
function add$1(tree, x, y, d) {
  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points
  var parent,
      node = tree._root,
      leaf = {data: d},
      x0 = tree._x0,
      y0 = tree._y0,
      x1 = tree._x1,
      y1 = tree._y1,
      xm,
      ym,
      xp,
      yp,
      right,
      bottom,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return tree._root = leaf, tree;
  // Find the existing leaf for the new point, or add it.
  while (node.length) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
  }
  // Is the new point is exactly coincident with the existing point?
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  // Otherwise, split the leaf node until the old and new point are separated.
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll$1(data) {
  var d, i, n = data.length,
      x,
      y,
      xz = new Array(n),
      yz = new Array(n),
      x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
  // Compute the points and their extent.
  for (i = 0; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
    xz[i] = x;
    yz[i] = y;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // If there were no (valid) points, inherit the existing extent.
  if (x1 < x0) x0 = this._x0, x1 = this._x1;
  if (y1 < y0) y0 = this._y0, y1 = this._y1;
  // Expand the tree to cover the new points.
  this.cover(x0, y0).cover(x1, y1);
  // Add the new points.
  for (i = 0; i < n; ++i) {
    add$1(this, xz[i], yz[i], data[i]);
  }
  return this;
}
var tree_cover$1 = function(x, y) {
  if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points
  var x0 = this._x0,
      y0 = this._y0,
      x1 = this._x1,
      y1 = this._y1;
  // If the quadtree has no extent, initialize them.
  // Integer extent are necessary so that if we later double the extent,
  // the existing quadrant boundaries don�t change due to floating point error!
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1;
    y1 = (y0 = Math.floor(y)) + 1;
  }
  // Otherwise, double repeatedly to cover.
  else if (x0 > x || x > x1 || y0 > y || y > y1) {
    var z = x1 - x0,
        node = this._root,
        parent,
        i;
    switch (i = (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
      case 0: {
        do parent = new Array(4), parent[i] = node, node = parent;
        while (z *= 2, x1 = x0 + z, y1 = y0 + z, x > x1 || y > y1);
        break;
      }
      case 1: {
        do parent = new Array(4), parent[i] = node, node = parent;
        while (z *= 2, x0 = x1 - z, y1 = y0 + z, x0 > x || y > y1);
        break;
      }
      case 2: {
        do parent = new Array(4), parent[i] = node, node = parent;
        while (z *= 2, x1 = x0 + z, y0 = y1 - z, x > x1 || y0 > y);
        break;
      }
      case 3: {
        do parent = new Array(4), parent[i] = node, node = parent;
        while (z *= 2, x0 = x1 - z, y0 = y1 - z, x0 > x || y0 > y);
        break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  // If the quadtree covers the point already, just return.
  else return this;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
};
var tree_data$1 = function() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do data.push(node.data); while (node = node.next)
  });
  return data;
};
var tree_extent$1 = function(_) {
  return arguments.length
      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
};
var Quad = function(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
};
var tree_find$1 = function(x, y, radius) {
  var data,
      x0 = this._x0,
      y0 = this._y0,
      x1,
      y1,
      x2,
      y2,
      x3 = this._x1,
      y3 = this._y1,
      quads = [],
      node = this._root,
      q,
      i;
  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
  if (radius == null) radius = Infinity;
  else {
    x0 = x - radius, y0 = y - radius;
    x3 = x + radius, y3 = y + radius;
    radius *= radius;
  }
  while (q = quads.pop()) {
    // Stop searching if this quadrant can�t contain a closer node.
    if (!(node = q.node)
        || (x1 = q.x0) > x3
        || (y1 = q.y0) > y3
        || (x2 = q.x1) < x0
        || (y2 = q.y1) < y0) continue;
    // Bisect the current quadrant.
    if (node.length) {
      var xm = (x1 + x2) / 2,
          ym = (y1 + y2) / 2;
      quads.push(
        new Quad(node[3], xm, ym, x2, y2),
        new Quad(node[2], x1, ym, xm, y2),
        new Quad(node[1], xm, y1, x2, ym),
        new Quad(node[0], x1, y1, xm, ym)
      );
      // Visit the closest quadrant first.
      if (i = (y >= ym) << 1 | (x >= xm)) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    }
    // Visit this point. (Visiting coincident points isn�t necessary!)
    else {
      var dx = x - +this._x.call(null, node.data),
          dy = y - +this._y.call(null, node.data),
          d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x - d, y0 = y - d;
        x3 = x + d, y3 = y + d;
        data = node.data;
      }
    }
  }
  return data;
};
var tree_remove$1 = function(d) {
  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points
  var parent,
      node = this._root,
      retainer,
      previous,
      next,
      x0 = this._x0,
      y0 = this._y0,
      x1 = this._x1,
      y1 = this._y1,
      x,
      y,
      xm,
      ym,
      right,
      bottom,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return this;
  // Find the leaf node for the point.
  // While descending, also retain the deepest parent with a non-removed sibling.
  if (node.length) while (true) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
  }
  // Find the point to remove.
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  // If there are multiple coincident points, remove just the point.
  if (previous) return (next ? previous.next = next : delete previous.next), this;
  // If this is the root point, remove it.
  if (!parent) return this._root = next, this;
  // Remove this leaf.
  next ? parent[i] = next : delete parent[i];
  // If the parent now contains exactly one leaf, collapse superfluous parents.
  if ((node = parent[0] || parent[1] || parent[2] || parent[3])
      && node === (parent[3] || parent[2] || parent[1] || parent[0])
      && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }
  return this;
};
function removeAll$1(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}
var tree_root$1 = function() {
  return this._root;
};
var tree_size$1 = function() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do ++size; while (node = node.next)
  });
  return size;
};
var tree_visit$1 = function(callback) {
  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
    }
  }
  return this;
};
var tree_visitAfter$1 = function(callback) {
  var quads = [], next = [], q;
  if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
};
function defaultX$1(d) {
  return d[0];
}
var tree_x$1 = function(_) {
  return arguments.length ? (this._x = _, this) : this._x;
};
function defaultY(d) {
  return d[1];
}
var tree_y = function(_) {
  return arguments.length ? (this._y = _, this) : this._y;
};
function quadtree(nodes, x, y) {
  var tree = new Quadtree(x == null ? defaultX$1 : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Quadtree(x, y, x0, y0, x1, y1) {
  this._x = x;
  this._y = y;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = undefined;
}
function leaf_copy$1(leaf) {
  var copy = {data: leaf.data}, next = copy;
  while (leaf = leaf.next) next = next.next = {data: leaf.data};
  return copy;
}
var treeProto$1 = quadtree.prototype = Quadtree.prototype;
treeProto$1.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
      node = this._root,
      nodes,
      child;
  if (!node) return copy;
  if (!node.length) return copy._root = leaf_copy$1(node), copy;
  nodes = [{source: node, target: copy._root = new Array(4)}];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
        else node.target[i] = leaf_copy$1(child);
      }
    }
  }
  return copy;
};
treeProto$1.add = tree_add$1;
treeProto$1.addAll = addAll$1;
treeProto$1.cover = tree_cover$1;
treeProto$1.data = tree_data$1;
treeProto$1.extent = tree_extent$1;
treeProto$1.find = tree_find$1;
treeProto$1.remove = tree_remove$1;
treeProto$1.removeAll = removeAll$1;
treeProto$1.root = tree_root$1;
treeProto$1.size = tree_size$1;
treeProto$1.visit = tree_visit$1;
treeProto$1.visitAfter = tree_visitAfter$1;
treeProto$1.x = tree_x$1;
treeProto$1.y = tree_y;
var tree_add$2 = function(d) {
  var x = +this._x.call(null, d),
      y = +this._y.call(null, d),
      z = +this._z.call(null, d);
  return add$2(this.cover(x, y, z), x, y, z, d);
};
function add$2(tree, x, y, z, d) {
  if (isNaN(x) || isNaN(y) || isNaN(z)) return tree; // ignore invalid points
  var parent,
      node = tree._root,
      leaf = {data: d},
      x0 = tree._x0,
      y0 = tree._y0,
      z0 = tree._z0,
      x1 = tree._x1,
      y1 = tree._y1,
      z1 = tree._z1,
      xm,
      ym,
      zm,
      xp,
      yp,
      zp,
      right,
      bottom,
      deep,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return tree._root = leaf, tree;
  // Find the existing leaf for the new point, or add it.
  while (node.length) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
    if (parent = node, !(node = node[i = deep << 2 | bottom << 1 | right])) return parent[i] = leaf, tree;
  }
  // Is the new point is exactly coincident with the existing point?
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  zp = +tree._z.call(null, node.data);
  if (x === xp && y === yp && z === zp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  // Otherwise, split the leaf node until the old and new point are separated.
  do {
    parent = parent ? parent[i] = new Array(8) : tree._root = new Array(8);
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
  } while ((i = deep << 2 | bottom << 1 | right) === (j = (zp >= zm) << 2 | (yp >= ym) << 1 | (xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll$2(data) {
  var d, i, n = data.length,
      x,
      y,
      z,
      xz = new Array(n),
      yz = new Array(n),
      zz = new Array(n),
      x0 = Infinity,
      y0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity,
      z1 = -Infinity;
  // Compute the points and their extent.
  for (i = 0; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) continue;
    xz[i] = x;
    yz[i] = y;
    zz[i] = z;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  // If there were no (valid) points, inherit the existing extent.
  if (x1 < x0) x0 = this._x0, x1 = this._x1;
  if (y1 < y0) y0 = this._y0, y1 = this._y1;
  if (z1 < z0) z0 = this._z0, z1 = this._z1;
  // Expand the tree to cover the new points.
  this.cover(x0, y0, z0).cover(x1, y1, z1);
  // Add the new points.
  for (i = 0; i < n; ++i) {
    add$2(this, xz[i], yz[i], zz[i], data[i]);
  }
  return this;
}
var tree_cover$2 = function(x, y, z) {
  if (isNaN(x = +x) || isNaN(y = +y) || isNaN(z = +z)) return this; // ignore invalid points
  var x0 = this._x0,
      y0 = this._y0,
      z0 = this._z0,
      x1 = this._x1,
      y1 = this._y1,
      z1 = this._z1;
  // If the octree has no extent, initialize them.
  // Integer extent are necessary so that if we later double the extent,
  // the existing octant boundaries don�t change due to floating point error!
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1;
    y1 = (y0 = Math.floor(y)) + 1;
    z1 = (z0 = Math.floor(z)) + 1;
  }
  // Otherwise, double repeatedly to cover.
  else if (x0 > x || x > x1 || y0 > y || y > y1 || z0 > z || z > z1) {
    var t = x1 - x0,
        node = this._root,
        parent,
        i;
    switch (i = (z < (z0 + z1) / 2) << 2 | (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
      case 0: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z1 = z0 + t, x > x1 || y > y1 || z > z1);
        break;
      }
      case 1: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z1 = z0 + t, x0 > x || y > y1 || z > z1);
        break;
      }
      case 2: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z1 = z0 + t, x > x1 || y0 > y || z > z1);
        break;
      }
      case 3: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z1 = z0 + t, x0 > x || y0 > y || z > z1);
        break;
      }
      case 4: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z0 = z1 - t, x > x1 || y > y1 || z0 > z);
        break;
      }
      case 5: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z0 = z1 - t, x0 > x || y > y1 || z0 > z);
        break;
      }
      case 6: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z0 = z1 - t, x > x1 || y0 > y || z0 > z);
        break;
      }
      case 7: {
        do parent = new Array(8), parent[i] = node, node = parent;
        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z0 = z1 - t, x0 > x || y0 > y || z0 > z);
        break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  // If the octree covers the point already, just return.
  else return this;
  this._x0 = x0;
  this._y0 = y0;
  this._z0 = z0;
  this._x1 = x1;
  this._y1 = y1;
  this._z1 = z1;
  return this;
};
var tree_data$2 = function() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do data.push(node.data); while (node = node.next)
  });
  return data;
};
var tree_extent$2 = function(_) {
  return arguments.length
      ? this.cover(+_[0][0], +_[0][1], +_[0][2]).cover(+_[1][0], +_[1][1], +_[1][2])
      : isNaN(this._x0) ? undefined : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
};
var Octant = function(node, x0, y0, z0, x1, y1, z1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.z0 = z0;
  this.x1 = x1;
  this.y1 = y1;
  this.z1 = z1;
};
var tree_find$2 = function(x, y, z, radius) {
  var data,
      x0 = this._x0,
      y0 = this._y0,
      z0 = this._z0,
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      x3 = this._x1,
      y3 = this._y1,
      z3 = this._z1,
      octs = [],
      node = this._root,
      q,
      i;
  if (node) octs.push(new Octant(node, x0, y0, z0, x3, y3, z3));
  if (radius == null) radius = Infinity;
  else {
    x0 = x - radius, y0 = y - radius, z0 = z - radius;
    x3 = x + radius, y3 = y + radius, z3 = z + radius;
    radius *= radius;
  }
  while (q = octs.pop()) {
    // Stop searching if this octant can�t contain a closer node.
    if (!(node = q.node)
        || (x1 = q.x0) > x3
        || (y1 = q.y0) > y3
        || (z1 = q.z0) > z3
        || (x2 = q.x1) < x0
        || (y2 = q.y1) < y0
        || (z2 = q.z1) < z0) continue;
    // Bisect the current octant.
    if (node.length) {
      var xm = (x1 + x2) / 2,
          ym = (y1 + y2) / 2,
          zm = (z1 + z2) / 2;
      octs.push(
        new Octant(node[7], xm, ym, zm, x2, y2, z2),
        new Octant(node[6], x1, ym, zm, xm, y2, z2),
        new Octant(node[5], xm, y1, zm, x2, ym, z2),
        new Octant(node[4], x1, y1, zm, xm, ym, z2),
        new Octant(node[3], xm, ym, z1, x2, y2, zm),
        new Octant(node[2], x1, ym, z1, xm, y2, zm),
        new Octant(node[1], xm, y1, z1, x2, ym, zm),
        new Octant(node[0], x1, y1, z1, xm, ym, zm)
      );
      // Visit the closest octant first.
      if (i = (z >= zm) << 2 | (y >= ym) << 1 | (x >= xm)) {
        q = octs[octs.length - 1];
        octs[octs.length - 1] = octs[octs.length - 1 - i];
        octs[octs.length - 1 - i] = q;
      }
    }
    // Visit this point. (Visiting coincident points isn�t necessary!)
    else {
      var dx = x - +this._x.call(null, node.data),
          dy = y - +this._y.call(null, node.data),
          dz = z - +this._z.call(null, node.data),
          d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x - d, y0 = y - d, z0 = z - d;
        x3 = x + d, y3 = y + d, z3 = z + d;
        data = node.data;
      }
    }
  }
  return data;
};
var tree_remove$2 = function(d) {
  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) return this; // ignore invalid points
  var parent,
      node = this._root,
      retainer,
      previous,
      next,
      x0 = this._x0,
      y0 = this._y0,
      z0 = this._z0,
      x1 = this._x1,
      y1 = this._y1,
      z1 = this._z1,
      x,
      y,
      z,
      xm,
      ym,
      zm,
      right,
      bottom,
      deep,
      i,
      j;
  // If the tree is empty, initialize the root as a leaf.
  if (!node) return this;
  // Find the leaf node for the point.
  // While descending, also retain the deepest parent with a non-removed sibling.
  if (node.length) while (true) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
    if (!(parent = node, node = node[i = deep << 2 | bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[(i + 1) & 7] || parent[(i + 2) & 7] || parent[(i + 3) & 7] || parent[(i + 4) & 7] || parent[(i + 5) & 7] || parent[(i + 6) & 7] || parent[(i + 7) & 7]) retainer = parent, j = i;
  }
  // Find the point to remove.
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  // If there are multiple coincident points, remove just the point.
  if (previous) return (next ? previous.next = next : delete previous.next), this;
  // If this is the root point, remove it.
  if (!parent) return this._root = next, this;
  // Remove this leaf.
  next ? parent[i] = next : delete parent[i];
  // If the parent now contains exactly one leaf, collapse superfluous parents.
  if ((node = parent[0] || parent[1] || parent[2] || parent[3] || parent[4] || parent[5] || parent[6] || parent[7])
      && node === (parent[7] || parent[6] || parent[5] || parent[4] || parent[3] || parent[2] || parent[1] || parent[0])
      && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }
  return this;
};
function removeAll$2(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}
var tree_root$2 = function() {
  return this._root;
};
var tree_size$2 = function() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do ++size; while (node = node.next)
  });
  return size;
};
var tree_visit$2 = function(callback) {
  var octs = [], q, node = this._root, child, x0, y0, z0, x1, y1, z1;
  if (node) octs.push(new Octant(node, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
    }
  }
  return this;
};
var tree_visitAfter$2 = function(callback) {
  var octs = [], next = [], q;
  if (this._root) octs.push(new Octant(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.z0, q.x1, q.y1, q.z1);
  }
  return this;
};
function defaultX$2(d) {
  return d[0];
}
var tree_x$2 = function(_) {
  return arguments.length ? (this._x = _, this) : this._x;
};
function defaultY$1(d) {
  return d[1];
}
var tree_y$1 = function(_) {
  return arguments.length ? (this._y = _, this) : this._y;
};
function defaultZ(d) {
  return d[2];
}
var tree_z = function(_) {
  return arguments.length ? (this._z = _, this) : this._z;
};
function octree(nodes, x, y, z) {
  var tree = new Octree(x == null ? defaultX$2 : x, y == null ? defaultY$1 : y, z == null ? defaultZ : z, NaN, NaN, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Octree(x, y, z, x0, y0, z0, x1, y1, z1) {
  this._x = x;
  this._y = y;
  this._z = z;
  this._x0 = x0;
  this._y0 = y0;
  this._z0 = z0;
  this._x1 = x1;
  this._y1 = y1;
  this._z1 = z1;
  this._root = undefined;
}
function leaf_copy$2(leaf) {
  var copy = {data: leaf.data}, next = copy;
  while (leaf = leaf.next) next = next.next = {data: leaf.data};
  return copy;
}
var treeProto$2 = octree.prototype = Octree.prototype;
treeProto$2.copy = function() {
  var copy = new Octree(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1),
      node = this._root,
      nodes,
      child;
  if (!node) return copy;
  if (!node.length) return copy._root = leaf_copy$2(node), copy;
  nodes = [{source: node, target: copy._root = new Array(8)}];
  while (node = nodes.pop()) {
    for (var i = 0; i < 8; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(8)});
        else node.target[i] = leaf_copy$2(child);
      }
    }
  }
  return copy;
};
treeProto$2.add = tree_add$2;
treeProto$2.addAll = addAll$2;
treeProto$2.cover = tree_cover$2;
treeProto$2.data = tree_data$2;
treeProto$2.extent = tree_extent$2;
treeProto$2.find = tree_find$2;
treeProto$2.remove = tree_remove$2;
treeProto$2.removeAll = removeAll$2;
treeProto$2.root = tree_root$2;
treeProto$2.size = tree_size$2;
treeProto$2.visit = tree_visit$2;
treeProto$2.visitAfter = tree_visitAfter$2;
treeProto$2.x = tree_x$2;
treeProto$2.y = tree_y$1;
treeProto$2.z = tree_z;
function x(d) {
  return d.x + d.vx;
}
function y(d) {
  return d.y + d.vy;
}
function z(d) {
  return d.z + d.vz;
}
var collide = function(radius) {
  var nodes,
      nDim,
      radii,
      strength = 1,
      iterations = 1;
  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);
  function force() {
    var i, n = nodes.length,
        tree,
        node,
        xi,
        yi,
        zi,
        ri,
        ri2;
    for (var k = 0; k < iterations; ++k) {
      tree =
          (nDim === 1 ? binarytree(nodes, x)
          :(nDim === 2 ? quadtree(nodes, x, y)
          :(nDim === 3 ? octree(nodes, x, y, z)
          :null
      ))).visitAfter(prepare);
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        ri = radii[node.index], ri2 = ri * ri;
        xi = node.x + node.vx;
        if (nDim > 1) { yi = node.y + node.vy; }
        if (nDim > 2) { zi = node.z + node.vz; }
        tree.visit(apply);
      }
    }
    function apply(treeNode, arg1, arg2, arg3, arg4, arg5, arg6) {
      var args = [arg1, arg2, arg3, arg4, arg5, arg6];
      var x0 = args[0],
          y0 = args[1],
          z0 = args[2],
          x1 = args[nDim],
          y1 = args[nDim+1],
          z1 = args[nDim+2];
      var data = treeNode.data, rj = treeNode.r, r = ri + rj;
      if (data) {
        if (data.index > node.index) {
          var x = xi - data.x - data.vx,
              y = (nDim > 1 ? yi - data.y - data.vy : 0),
              z = (nDim > 2 ? zi - data.z - data.vz : 0),
              l = x * x + y * y + z * z;
          if (l < r * r) {
            if (x === 0) x = jiggle(), l += x * x;
            if (nDim > 1 && y === 0) y = jiggle(), l += y * y;
            if (nDim > 2 && z === 0) z = jiggle(), l += z * z;
            l = (r - (l = Math.sqrt(l))) / l * strength;
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
            if (nDim > 1) { node.vy += (y *= l) * r; }
            if (nDim > 2) { node.vz += (z *= l) * r; }
            data.vx -= x * (r = 1 - r);
            if (nDim > 1) { data.vy -= y * r; }
            if (nDim > 2) { data.vz -= z * r; }
          }
		  if (isNaN(node.vx)) { throw Error("NaN in forces") }
        }
        return;
      }
      return x0 > xi + r || x1 < xi - r
          || (nDim > 1 && (y0 > yi + r || y1 < yi - r))
          || (nDim > 2 && (z0 > zi + r || z1 < zi - r));
    }
  }
  function prepare(treeNode) {
    if (treeNode.data) return treeNode.r = radii[treeNode.data.index];
    for (var i = treeNode.r = 0; i < Math.pow(2, nDim); ++i) {
      if (treeNode[i] && treeNode[i].r > treeNode.r) {
        treeNode.r = treeNode[i].r;
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    radii = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
  }
  force.initialize = function(initNodes, numDimensions) {
    nodes = initNodes;
    nDim = numDimensions;
    initialize();
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };
  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
  };
  return force;
};
var prefix = "$";
function Map() {}
Map.prototype = map.prototype = {
  constructor: Map,
  has: function(key) {
    return (prefix + key) in this;
  },
  get: function(key) {
    return this[prefix + key];
  },
  set: function(key, value) {
    this[prefix + key] = value;
    return this;
  },
  remove: function(key) {
    var property = prefix + key;
    return property in this && delete this[property];
  },
  clear: function() {
    for (var property in this) if (property[0] === prefix) delete this[property];
  },
  keys: function() {
    var keys = [];
    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
    return keys;
  },
  values: function() {
    var values = [];
    for (var property in this) if (property[0] === prefix) values.push(this[property]);
    return values;
  },
  entries: function() {
    var entries = [];
    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
    return entries;
  },
  size: function() {
    var size = 0;
    for (var property in this) if (property[0] === prefix) ++size;
    return size;
  },
  empty: function() {
    for (var property in this) if (property[0] === prefix) return false;
    return true;
  },
  each: function(f) {
    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
  }
};
function map(object, f) {
  var map = new Map;
  // Copy constructor.
  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });
  // Index array by numeric index or specified key function.
  else if (Array.isArray(object)) {
    var i = -1,
        n = object.length,
        o;
    if (f == null) while (++i < n) map.set(i, object[i]);
    else while (++i < n) map.set(f(o = object[i], i, object), o);
  }
  // Convert object to map.
  else if (object) for (var key in object) map.set(key, object[key]);
  return map;
}
function Set() {}
var proto = map.prototype;
Set.prototype = set.prototype = {
  constructor: Set,
  has: proto.has,
  add: function(value) {
    value += "";
    this[prefix + value] = value;
    return this;
  },
  remove: proto.remove,
  clear: proto.clear,
  values: proto.keys,
  size: proto.size,
  empty: proto.empty,
  each: proto.each
};
function set(object, f) {
  var set = new Set;
  // Copy constructor.
  if (object instanceof Set) object.each(function(value) { set.add(value); });
  // Otherwise, assume it�s an array.
  else if (object) {
    var i = -1, n = object.length;
    if (f == null) while (++i < n) set.add(object[i]);
    else while (++i < n) set.add(f(object[i], i, object));
  }
  return set;
}
function index(d) {
  return d.index;
}
function find(nodeById, nodeId) {
  var node = nodeById.get(nodeId);
  if (!node) throw new Error("missing: " + nodeId);
  return node;
}
var link = function(links) {
  var id = index,
      strength = defaultStrength,
      strengths,
      distance = constant(30),
      distances,
      nodes,
      nDim,
      count,
      bias,
      iterations = 1;
  if (links == null) links = [];
  function defaultStrength(link) {
    return 1 / Math.min(count[link.source.index], count[link.target.index]);
  }
  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x = 0, y = 0, z = 0, l, b; i < n; ++i) {
        link = links[i], source = link.source, target = link.target;
        x = target.x + target.vx - source.x - source.vx || jiggle();
        if (nDim > 1) { y = target.y + target.vy - source.y - source.vy || jiggle(); }
        if (nDim > 2) { z = target.z + target.vz - source.z - source.vz || jiggle(); }
        l = Math.sqrt(x * x + y * y + z * z);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x *= l, y *= l, z *= l;
        target.vx -= x * (b = bias[i]);
        if (nDim > 1) { target.vy -= y * b; }
        if (nDim > 2) { target.vz -= z * b; }
        source.vx += x * (b = 1 - b);
        if (nDim > 1) { source.vy += y * b; }
        if (nDim > 2) { source.vz += z * b; }
		if(isNaN(target.vx+ source.vx)){throw Error("NaN in nodes");}
		 if ((nDim > 1) &&(isNaN(target.vy + source.vy))){throw Error("NaN in nodes");}
		 if ((nDim > 2) &&(isNaN(target.vz +source.vz))){throw Error("NaN in nodes");}
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i,
        n = nodes.length,
        m = links.length,
        nodeById = map(nodes, id),
        link;
    for (i = 0, count = new Array(n); i < m; ++i) {
      link = links[i], link.index = i;
      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
      count[link.source.index] = (count[link.source.index] || 0) + 1;
      count[link.target.index] = (count[link.target.index] || 0) + 1;
    }
    for (i = 0, bias = new Array(m); i < m; ++i) {
      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }
    strengths = new Array(m), initializeStrength();
    distances = new Array(m), initializeDistance();
  }
  function initializeStrength() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }
  function initializeDistance() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      distances[i] = +distance(links[i], i, links);
    }
  }
  force.initialize = function(initNodes, numDimensions) {
    nodes = initNodes;
    nDim = numDimensions;
    initialize();
  };
  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };
  force.id = function(_) {
    return arguments.length ? (id = _, force) : id;
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength;
  };
  force.distance = function(_) {
    return arguments.length ? (distance = typeof _ === "function" ? _ : constant(+_), initializeDistance(), force) : distance;
  };
  return force;
};
var noop = {value: function() {}};
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames(typename + "", _),
        t,
        i = -1,
        n = T.length;
    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }
    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$2(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$2(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};
function get(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}
function set$2(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}
var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1000;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function(f) { setTimeout(f, 17); };
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call =
  this._time =
  this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we�ve set an alarm, if we haven�t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, delay);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clockNow, interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}
var MAX_DIMENSIONS = 3;
function x$1(d) {
  return d.x;
}
function y$1(d) {
  return d.y;
}
function z$1(d) {
  return d.z;
}
var initialRadius = 10;
var initialAngleRoll = Math.PI * (3 - Math.sqrt(5));
var initialAngleYaw = Math.PI / 24; // Sequential
var simulation = function(nodes, numDimensions) {
  numDimensions = numDimensions || 3;
  var nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(numDimensions))),
      simulation,
      alpha = 1,
      alphaMin = 0.001,
      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
      alphaTarget = 0,
      velocityDecay = 0.6,
      forces = map(),
      stepper = timer(step),
      event = dispatch("tick", "end");
  if (nodes == null) nodes = [];
  function step() {
    tick();
    event.call("tick", simulation);
    if (alpha < alphaMin) {
      stepper.stop();
      event.call("end", simulation);
    }
  }
  function tick() {
    var i, n = nodes.length, node;
    alpha += (alphaTarget - alpha) * alphaDecay;
	for (i = 0; i < n; ++i) {
		node = nodes[i];if(isNaN(node.x+node.vx)){throw Error("NaN in nodes");}
	}
	let max_coords=100000;
    forces.each(function(force) {
      force(alpha); 
	  for (i = 0; i < n; ++i) {
		node = nodes[i];if(isNaN(node.x+node.vx+node.y+node.vy+node.z+node.vz)){throw Error("NaN in nodes");}
			if((Math.abs(node.x)>max_coords)||(Math.abs(node.y)>max_coords)||(Math.abs(node.z)>max_coords)){
			//throw Error("distance too great in nodes");
				node.x=Math.min(node.x,max_coords);node.x=Math.max(node.x,-max_coords);
				node.y=Math.min(node.y,max_coords);node.y=Math.max(node.y,-max_coords);
				node.z=Math.min(node.z,max_coords);node.z=Math.max(node.z,-max_coords);
			}
	  }
    });
    for (i = 0; i < n; ++i) {
      node = nodes[i];
      if (node.fx == null) node.x += node.vx *= velocityDecay;
      else node.x = node.fx, node.vx = 0;
      if (nDim > 1) {
        if (node.fy == null) node.y += node.vy *= velocityDecay;
        else node.y = node.fy, node.vy = 0;
      }
      if (nDim > 2) {
        if (node.fz == null) node.z += node.vz *= velocityDecay;
        else node.z = node.fz, node.vz = 0;
      }
	  if(isNaN(node.x+node.y+node.z)){throw Error("NaN in nodes");}
    }
  }
  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.index = i;
      if (isNaN(node.x) || (nDim > 1 && isNaN(node.y)) || (nDim > 2 && isNaN(node.z))) {
        var radius = initialRadius * (nDim > 2 ? Math.cbrt(i) : (nDim > 1 ? Math.sqrt(i) : i)),
          rollAngle = i * initialAngleRoll,
          yawAngle = i * initialAngleYaw;
        node.x = radius * (nDim > 1 ? Math.cos(rollAngle) : 1);
        if (nDim > 1) { node.y = radius * Math.sin(rollAngle); }
        if (nDim > 2) { node.z = radius * Math.sin(yawAngle); }
      }
      if (isNaN(node.vx) || (nDim > 1 && isNaN(node.vy)) || (nDim > 2 && isNaN(node.vz))) {
        node.vx = 0;
        if (nDim > 1) { node.vy = 0; }
        if (nDim > 2) { node.vz = 0; }
      }
	  if(isNaN(node.x+node.y+node.z)){throw Error("NaN in nodes");}
    }
  }
  function initializeForce(force) {
    if (force.initialize) force.initialize(nodes, nDim);
    return force;
  }
  initializeNodes();
  return simulation = {
    tick: tick,
    restart: function() {
      return stepper.restart(step), simulation;
    },
    stop: function() {
      return stepper.stop(), simulation;
    },
    numDimensions: function(_) {
      return arguments.length
          ? (nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(_))), forces.each(initializeForce), simulation)
          : nDim;
    },
    nodes: function(_) {
      return arguments.length ? (nodes = _, initializeNodes(), forces.each(initializeForce), simulation) : nodes;
    },
    alpha: function(_) {
      return arguments.length ? (alpha = +_, simulation) : alpha;
    },
    alphaMin: function(_) {
      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
    },
    alphaDecay: function(_) {
      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
    },
    alphaTarget: function(_) {
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    },
    velocityDecay: function(_) {
      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
    },
    force: function(name, _) {
      return arguments.length > 1 ? ((_ == null ? forces.remove(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
    },
    find: function() {
      var args = Array.prototype.slice.call(arguments);
      var x = args.shift() || 0,
          y = (nDim > 1 ? args.shift() : null) || 0,
          z = (nDim > 2 ? args.shift() : null) || 0,
          radius = args.shift() || Infinity;
      var i = 0,
          n = nodes.length,
          dx,
          dy,
          dz,
          d2,
          node,
          closest;
      radius *= radius;
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x - node.x;
        dy = y - (node.y || 0);
        dz = z - (node.z ||0);
        d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < radius) closest = node, radius = d2;
      }
      return closest;
    },
    on: function(name, _) {
      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
    }
  };
};
var manyBody2D = function() {
  var nodes,
      node,
      alpha,
      strength = constant(-30),
      strengths,
      distanceMin2 = 1,
      distanceMax2 = Infinity,
      theta2 = 0.81;

  function force(_) {
    var i, n = nodes.length, tree = quadtree(nodes, x$1, y$1).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
  }

  function accumulate(quad) {
    var strength = 0, q, c, weight = 0, x, y, i;

    // For internal nodes, accumulate forces from child quadrants.
    if (quad.length) {
      for (x = y = i = 0; i < 4; ++i) {
        if ((q = quad[i]) && (c = Math.abs(q.value))) {
          strength += q.value, weight += c, x += c * q.x, y += c * q.y;
        }
      }
      quad.x = x / weight;
      quad.y = y / weight;
    }

    // For leaf nodes, accumulate forces from coincident quadrants.
    else {
      q = quad;
      q.x = q.data.x;
      q.y = q.data.y;
      do strength += strengths[q.data.index];
      while (q = q.next);
    }

    quad.value = strength;
  }

  function apply(quad, x1, _, x2) {
    if (!quad.value) return true;

    var x = quad.x - node.x,
        y = quad.y - node.y,
        w = x2 - x1,
        l = x * x + y * y;

    // Apply the Barnes-Hut approximation if possible.
    // Limit forces for very close nodes; randomize direction if coincident.
	//for this demo: duplicates don't need 2D forces between them
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x === 0) x = jiggle(), l += x * x;
        if (y === 0) y = jiggle(), l += y * y;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x * quad.value * alpha / l;if (isNaN(node.vx)) { throw Error("NaN in forces") }
        node.vy += y * quad.value * alpha / l;
      }
      return true;
    }

    // Otherwise, process points directly.
    else if (quad.length || l >= distanceMax2) return;

    // Limit forces for very close nodes; randomize direction if coincident.
    if (quad.data !== node || quad.next) {
		if((quad.data.original!=node.original)){
		  if (x === 0) x = jiggle(), l += x * x;
		  if (y === 0) y = jiggle(), l += y * y;
		  if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
		}
    }

    do if (quad.data !== node) {
		if((quad.data.original==node.original))continue;
      w = strengths[quad.data.index] * alpha / l;
      node.vx += x * w;if (isNaN(node.vx)) { throw Error("NaN in forces") }
      node.vy += y * w;
    } while (quad = quad.next);
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };

  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };

  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };

  return force;
};
var manyBody = function() {
  var nodes,
      nDim,
      node,
      alpha,
      strength = constant(-30),
      strengths,
      distanceMin2 = 1,
      distanceMax2 = Infinity,
      theta2 = 0.81;
  function force(_) {
    var i,
        n = nodes.length,
        tree =
            (nDim === 1 ? binarytree(nodes, x$1)
            :(nDim === 2 ? quadtree(nodes, x$1, y$1)
            :(nDim === 3 ? octree(nodes, x$1, y$1, z$1)
            :null
        ))).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
  }
  function accumulate(treeNode) {
    var strength = 0, q, c, x$$1, y$$1, z$$1, i;
    // For internal nodes, accumulate forces from children.
    if (treeNode.length) {
      for (x$$1 = y$$1 = z$$1 = i = 0; i < 4; ++i) {
        if ((q = treeNode[i]) && (c = q.value)) {
          strength += c, x$$1 += c * (q.x || 0), y$$1 += c * (q.y || 0), z$$1 += c * (q.z || 0);
        }
      }
      treeNode.x = x$$1 / strength;
      if (nDim > 1) { treeNode.y = y$$1 / strength; }
      if (nDim > 2) { treeNode.z = z$$1 / strength; }
    }
    // For leaf nodes, accumulate forces from coincident nodes.
    else {
      q = treeNode;
      q.x = q.data.x;
      if (nDim > 1) { q.y = q.data.y; }
      if (nDim > 2) { q.z = q.data.z; }
      do strength += strengths[q.data.index];
      while (q = q.next);
    }
    treeNode.value = strength;
  }
  function apply(treeNode, x1, arg1, arg2, arg3) {
    if (!treeNode.value) return true;
    var x2 = [arg1, arg2, arg3][nDim-1];
    var x$$1 = treeNode.x - node.x,
        y$$1 = (nDim > 1 ? treeNode.y - node.y : 0),
        z$$1 = (nDim > 2 ? treeNode.z - node.z : 0),
        w = x2 - x1,
        l = x$$1 * x$$1 + y$$1 * y$$1 + z$$1 * z$$1;
    // Apply the Barnes-Hut approximation if possible.
    // Limit forces for very close nodes; randomize direction if coincident.
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
        if (nDim > 1 && y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
        if (nDim > 2 && z$$1 === 0) z$$1 = jiggle(), l += z$$1 * z$$1;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x$$1 * treeNode.value * alpha / l;if (isNaN(node.vx)) { throw Error("NaN in forces") }
        if (nDim > 1) { node.vy += y$$1 * treeNode.value * alpha / l; }
        if (nDim > 2) { node.vz += z$$1 * treeNode.value * alpha / l; }
      }
      return true;
    }
    // Otherwise, process points directly.
    else if (treeNode.length || l >= distanceMax2) return;
    // Limit forces for very close nodes; randomize direction if coincident.
    if (treeNode.data !== node || treeNode.next) {
      if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
      if (nDim > 1 && y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
      if (nDim > 2 && z$$1 === 0) z$$1 = jiggle(), l += z$$1 * z$$1;
      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
    }
    do if (treeNode.data !== node) {
      w = strengths[treeNode.data.index] * alpha / l;
      node.vx += x$$1 * w;if (isNaN(node.vx)) { throw Error("NaN in forces") }
      if (nDim > 1) { node.vy += y$$1 * w; }
      if (nDim > 2) { node.vz += z$$1 * w; }
    } while (treeNode = treeNode.next);
  }
  force.initialize = function(initNodes, numDimensions) {
    nodes = initNodes;
    nDim = numDimensions;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };
  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };
  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };
  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };
  return force;
};


var radial = function(radius, x, y, z) {
  var nodes,
	  nDim,
      strength = constant(0.1),
      strengths,
      radiuses;

  if (typeof radius !== "function") radius = constant(+radius);
  if (x == null) x = 0;
  if (y == null) y = 0;
  if (z == null) z = 0;

  function force(alpha) {
    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i],dx = node.x - x || 1e-6,dy,dz;
      var total=dx*dx;
	  if(nDim>1){dy = node.y - y || 1e-6;total+=dy*dy;}
      if(nDim>2){dz = node.z - z || 1e-6;total+=dz*dz;}
      var r = Math.sqrt(total),
          k = (radiuses[i] - r) * strengths[i] * alpha / r;
      node.vx += dx * k;
	  if (isNaN(node.vx)) { throw Error("NaN in forces") }
      if(nDim>1){node.vy += dy * k;if (isNaN(dy)) { throw Error("NaN in forces") }}
      if(nDim>2){node.vz += dz * k;if (isNaN(dz)) { throw Error("NaN in forces") }}
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    radiuses = new Array(n);
    for (i = 0; i < n; ++i) {
      radiuses[i] = +radius(nodes[i], i, nodes);
      strengths[i] = isNaN(radiuses[i]) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_,numDimensions) {
    nodes = _, nDim=numDimensions, initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
  };

  force.x = function(_) {
    return arguments.length ? (x = +_, force) : x;
  };

  force.y = function(_) {
    return arguments.length ? (y = +_, force) : y;
  };
  
  force.y = function(_) {
    return arguments.length ? (z = +_, force) : z;
  };

  return force;
};


var x$2 = function(x) {
  var strength = constant(0.1),
      nodes,
      strengths,
      xz;
  if (typeof x !== "function") x = constant(x == null ? 0 : +x);
  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
	   if (isNaN(strengths[i])) { throw Error("NaN in forces") }
	   if (isNaN(node.vx)) { throw Error("NaN in forces") }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }
  force.initialize = function(_) {
    nodes = _;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };
  force.x = function(_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
  };
  return force;
};
var y$2 = function(y) {
  var strength = constant(0.1),
      nodes,
      strengths,
      yz;
  if (typeof y !== "function") y = constant(y == null ? 0 : +y);
  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    yz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }
  force.initialize = function(_) {
    nodes = _;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };
  force.y = function(_) {
    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
  };
  return force;
};
var z$2 = function(z) {
  var strength = constant(0.1),
      nodes,
      strengths,
      zz;
  if (typeof z !== "function") z = constant(z == null ? 0 : +z);
  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vz += (zz[i] - node.z) * strengths[i] * alpha;
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    zz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(zz[i] = +z(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }
  force.initialize = function(_) {
    nodes = _;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };
  force.z = function(_) {
    return arguments.length ? (z = typeof _ === "function" ? _ : constant(+_), initialize(), force) : z;
  };
  return force;
};
exports.forceCenter = center;
exports.forceCenter2D = center2D;
exports.forceCollide = collide;
exports.forceLink = link;
exports.forceManyBody = manyBody;
exports.forceManyBody2D = manyBody2D;
exports.forceRadial = radial;
exports.forceSimulation = simulation;
exports.forceX = x$2;
exports.forceY = y$2;
exports.forceZ = z$2;
Object.defineProperty(exports, '__esModule', { value: true });
})));
