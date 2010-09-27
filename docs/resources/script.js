(function(){

 /**
  * @namespace
  */

  var namespace = 'BasisDoc';

  // import names

  var Class = Basis.Class;
  var DOM = Basis.DOM;
  var Event = Basis.Event;
  var Data = Basis.Data;
  var Template = Basis.Html.Template;

  var cssClass = Basis.CSS.cssClass;

  var nsWrapers = Basis.DOM.Wrapers;
  var nsTree = Basis.Controls.Tree;
  var nsTabs = Basis.Controls.Tabs;
  var nsForm = Basis.Controls.Form;
  var nsEntity = Basis.Entity;

  var nsCore = BasisDoc.Core;
  var nsView = BasisDoc.View;
  var nsNav = BasisDoc.Nav;

  //
  // main part
  //

  var curHash;

  //
  //  Overview 
  //

  var buildin = {
    'Object': Object,
    'String': String,
    'Number': Number,
    'Date': Date,
    'Array': Array,
    'Function': Function,
    'Boolean': Boolean
  };

  nsCore.walk(buildin, '', 'object');
  Object.iterate(buildin, function(name, value){
    value.className = name;
    nsCore.walk(value, name, 'class');
    nsCore.walk(value.prototype, name + '.prototype', 'prototype');
  });

  var walkStartTime = Date.now();
  Basis.namespaces_['Basis'] = Basis;
  nsCore.walk(Basis.namespaces_, '', 'object',0);
  if (typeof console != 'undefined') console.log(Date.now() - walkStartTime, nsCore.walkThroughCount());

  //
  // View
  //

  var objectView = new nsWrapers.HtmlContainer({
    childClass: nsView.View,
    handlers: {
      delegateChanged: function(object, oldDelegate){
        this.clear(true);
        this.setChildNodes(this.delegate ? [nsView.viewTitle, nsView.viewJsDoc].concat(this.delegate.views) : null).forEach(function(node){
          node.setDelegate(this);
        }, this.getRootDelegate());
      }
    }
  });

  //
  // NavTree
  //

  var NavTree = Class(nsTree.Tree, {
    childClass: nsNav.docSection,
    open: function(path, noScroll){
      path = path.replace(/^#/, '');

      if (!path || (curHash == '#' + path))
        return;

      curHash = location.hash = '#' + path;

      var rootNS = path.split(".")[0];
      if (buildin[rootNS])
        rootNS = 'window';

      var node = this.childNodes.search(rootNS, 'info.objPath');

      console.log(node);

      if (node)
      {
        node.expand();
        node = node.childNodes
                 .sortAsObject('info.objPath')
                 .reverse()
                 .search(0, function(node){
                   return path.indexOf(node.info.objPath);
                 });
      }

      if (node)
      {
        var cursor = node.info.objPath;
        var least = path.replace(new RegExp("^" + cursor.forRegExp() + '\\.?'), '');
        if (least)
        {
          var parts = least.split(/\./);
          while (node && parts.length)
          {
            var p = parts.shift();
            cursor += '.' + p;
            if (p == 'prototype')
              cursor += '.' + parts.shift();

            node.expand();
            node = node.childNodes.search(cursor, 'info.objPath');
          }
        }

        if (node)
        {
          node.select();
          //node.expand();
          if (!noScroll)
            node.element.scrollIntoView(false);

          document.title = 'Basis API - ' + node.info.title + (node.info.path ? ' @ ' + node.info.path : '');
        }
      }
    }
  });

  var navTree = new NavTree({
    selection: {
      handlers: {
        change: function(){
          objectView.setDelegate(this.items[0]);
        }
      }
    },
    childNodes: [
      {
        info: { title: 'Buildin class extensions', objPath: 'window' },
        collapsed: true,
        childNodes: Object.iterate(buildin, function(key, value){
          return new nsNav.docClass({
            info: {
              kind: 'Class',
              title: key,
              path: '',
              objPath: key,
              obj: value
            }
          });
        })
      },
      {
        info: { title: 'Basis', objPath: 'Basis' },
        childNodes: Object.iterate(Basis.namespaces_, function(key){
          return new nsNav.docNamespace({
            info: map[key]
          })
        })
      }
    ]
  });

  var SearchTree = Class(nsTree.Tree, {
    
  });

  var searchTree = new nsTree.Tree({
    id: 'SearchTree',
    localSorting: Data('info.title', String.toLowerCase),
    localGrouping: nsNav.nodeTypeGrouping,
    childClass: Class(nsTree.TreeNode, {
      template: new Template(
        '<li{element} class="Basis-Tree-Node">' + 
          '<div{content|selectedElement} class="Tree-Node-Title Tree-Node-Content">' + 
            '<a{title} href="#">' +
              '<span class="namespace">{namespaceText}</span>' +
              '<span{label} class="label">{titleText}</span>' +
            '</a>' + 
          '</div>' + 
        '</li>'
      ),
      init: function(config){
        config = this.inherit(config);

        this.title.href = '#' + this.info.objPath;
        cssClass(this.content).add(this.info.kind.capitalize() + '-Content');

        if (/^(function|method|class)$/.test(this.info.kind))
          DOM.insert(this.label, DOM.createElement('SPAN.args', nsCore.getFunctionDescription(this.info.obj).args.quote('(')));

        this.namespaceText.nodeValue = this.info.kind != 'namespace' ? this.info.path : '';
      }
    })
  });

  var sidebarPages = new nsTabs.PageControl({
    childNodes: [
      {
        name: 'tree',
        childNodes: navTree
      },
      {
        name: 'search',
        childNodes: searchTree
      }
    ]
  });

  var SearchMatchInput = Class(nsForm.MatchInput, {
    matchFilterClass: Class(nsForm.MatchFilter, {
      changeHandler: function(value){
        var fc = value.charAt(0);
        var v = value.substr(1).replace(/./g, function(m){ return '[' + m.toUpperCase() + m.toLowerCase() + ']' });
        var rx = new RegExp('(^|[^a-zA-Z])([' + fc.toLowerCase() + fc.toUpperCase() +']' + v + ')|([a-z])(' + fc.toUpperCase() + v + ')');
        //console.log(rx.source);
        var textNodeGetter = this.textNodeGetter;
        var map = this.map;

        map['SPAN.match'] = function(s, i){ return s && (i % 5 == 2 || i % 5 == 4) };

        this.node.setMatchFunction(value ? function(child, reset){
          if (!reset)
          {
            var textNode = child._m || textNodeGetter(child);
            var p = textNode.nodeValue.split(rx);
            if (p.length > 1)
            {
              DOM.replace(
                child._x || textNode,
                child._x = DOM.createElement('SPAN.matched', DOM.wrap(p, map))
              );
              child._m = textNode;
              return true;
            }
          }
          
          if (child._x)
          {
            DOM.replace(child._x, child._m);
            delete child._x;
            delete child._m;
          }
          
          return false;
        } : null);
        this.node.element.scrollTop = 0;
      }
    })
  });

  var loadSearchIndex = Function.runOnce(function(){
    searchTree.setChildNodes(nsCore.Search.values.map(Data.wrapper('info')));
  });

  var searchInput = new SearchMatchInput({
    matchFilter: {
      node: searchTree,
      regexpGetter: function(value){
        return new RegExp('(^|[^a-z])(' + value.forRegExp() + ')', 'i');
      },
      handlers: {
        change: function(value){
          if (value != '')
            loadSearchIndex();

          sidebarPages.item(value != '' ? 'search' : 'tree').select();
        }
      }
    }
  });
  Event.addHandler(searchInput.field, 'keyup', function(event){
    var key = Event.key(event);
    var ctrl = this.matchFilter.node;
    var selected = ctrl.selection.items[0];
    
    if ([Event.KEY.UP, Event.KEY.DOWN].has(key))
    {
      var cn = ctrl.childNodes;
      var pos, node;
      
      if (selected && selected.matched)
        pos = cn.indexOf(selected);
      
      if (key == Event.KEY.UP)
        node = cn.lastSearch(true, 'matched', pos ? pos - 1 : null);
      else
        node = cn.search(true, 'matched', pos ? pos + 1 : null);

      if (node)
        node.select();
    }
    else
      if ([Event.KEY.ENTER, Event.KEY.CTRL_ENTER].has(key))
        if (selected)
          navTree.open(selected.info.objPath);
  }, searchInput);

  /*
  var clsTree = new nsTree.Tree({
    childFactory: function(cfg){
      return new nsTree.TreeFolder([{ document: this.document }].merge(cfg));
    },
    childNodes: Object.values(rootClasses).map(Data('classMap_'))
  })*/

  //
  // Layout
  //

  var layout = new Basis.Layout.Layout({
    container: 'Layout',
    left: {
      id: 'Sidebar',
      content: new Basis.Layout.Layout({
        top: {
          id: 'Toolbar',
          content: searchInput.element
        },
        client: {
          id: 'Sidebar',
          content: sidebarPages.element
        }
      })
    },
    client: {
      id: 'Content',
      overflow: 'auto',
      overflowY: 'scroll',
      overflowX: 'visible',
      content: [
        //clsTree.element,
        objectView.element
      ]
    }
  });

  Event.addGlobalHandler('click', function(e){
    if (!Event.mouseButton(e, Event.MOUSE_LEFT))
      return;
    
    var sender = Event.sender(e);
    if (sender.tagName != 'A')
      sender = DOM.parent(sender, 'A');
    if (sender && sender.hash != '')
      navTree.open(sender.hash, DOM.parentOf(navTree.element, sender));

    //DOM.focus(searchInput.field, true);
  });
  var searchInputFocused = false;
  Event.addHandler(searchInput.field, 'focus', function(){ searchInputFocused = true; });
  Event.addHandler(searchInput.field, 'blur', function(){ searchInputFocused = false; });
  Event.addGlobalHandler('keydown', function(e){
    DOM.focus(searchInput.field, !searchInputFocused);
  });

  function checkLocation(){
    if (location.hash != curHash)
      navTree.open(location.hash);
  }

  setInterval(checkLocation, 250);
  setTimeout(checkLocation, 0);

  DOM.focus(searchInput.field, true);

  //
  // jsDocs parse
  //

  var scripts = DOM.tag(document, 'SCRIPT').map(Data('getAttribute("src")')).filter(Data('match(/^\\.\\.\\/[a-z0-9\\_]+\\.js$/i)')); //['../basis.js', '../dom_wraper.js', '../tree.js'];
  //  console.log(DOM.tag(document, 'SCRIPT').map(Data('getAttribute("src")')).filter(Data('match(/^\\.\\.\\/[a-z0-9\\_]+\\.js$/i)')));

  scripts.forEach(function(src){
    nsCore.loadResource(src, 'jsdoc');
  });

})();