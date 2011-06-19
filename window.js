/*!
 * Basis javasript library 
 * http://code.google.com/p/basis-js/
 *
 * @copyright
 * Copyright (c) 2006-2011 Roman Dvornov.
 *
 * @license
 * GNU General Public License v2.0 <http://www.gnu.org/licenses/gpl-2.0.html>
 */

  (function(){

   /**
    * @namespace Basis.Controls.Window
    */

    var namespace = 'Basis.Controls.Window';

    // import names

    var Class = Basis.Class;
    var DOM = Basis.DOM;
    var Event = Basis.Event;
    var CSS = Basis.CSS;
    var Cleaner = Basis.Cleaner;
    var Template = Basis.Html.Template;

    var nsWrappers = DOM.Wrapper;

    var createEvent = Basis.EventObject.createEvent;

    var TmplNode = nsWrappers.TmplNode;
    var TmplContainer = nsWrappers.TmplContainer;

   /**
    * @class
    * @extends Basis.DOM.Wrapper.HtmlNode
    */
    var Blocker = Class(TmplNode, {
      className: namespace + '.Blocker',

      captureElement: null,

      template: new Template(
        '<div{element} class="Basis-Blocker">' + 
          '<div{content} class="Basis-Blocker-Mate"/>' +
        '</div>'
      ),

      init: function(config){
        TmplNode.prototype.init.call(this, config);

        DOM.setStyle(this.element, {
          display: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        });

        Cleaner.add(this);
      },
      capture: function(element, zIndex){
        this.captureElement = DOM.get(element || document.body);
        if (this.captureElement)
        {
          DOM.insert(this.captureElement, this.element);
          this.element.style.zIndex = zIndex || 1000;
          DOM.show(this.element);
        }
      },
      release: function(){
        if (this.captureElement)
        {
          if (this.element.parentNode == this.captureElement)
            DOM.remove(this.element);

          delete this.captureElement;
          DOM.hide(this.element);
        }
      },
      destroy: function(){
        this.release();
        
        TmplNode.prototype.destroy.call(this);
        
        Cleaner.remove(this);
      }
    });

    //
    //  Window
    //

   /**
    * @class
    */
    var Window = Class(TmplContainer, {
      className: namespace + '.Window',

      template: new Template(
        '<div{element} class="Basis-Window" event-mousedown="mousedown" event-keypress="keypress">' +
          '<div class="Basis-Window-Canvas">' +
            '<div class="corner-left-top"/>' +
            '<div class="corner-right-top"/>' +
            '<div class="side-top"/>' +
            '<div class="side-left"/>' +
            '<div class="side-right"/>' +
            '<div class="content"/>' +
            '<div class="corner-left-bottom"/>' +
            '<div class="corner-right-bottom"/>' +
            '<div class="side-bottom"/>' +
          '</div>' +
          '<div class="Basis-Window-Layout">' +
            '<div class="Basis-Window-Title"><div{title} class="Basis-Window-TitleCaption"/></div>' +
            '<div{content} class="Basis-Window-Content">' +
              '<!-- {childNodesHere} -->' +
            '</div>' +
          '</div>' +
        '</div>'
      ),

      templateAction: function(actionName, event){
        if (actionName == 'mousedown')
          this.activate();

        if (actionName == 'keypress')
        {
          var key = Event.key(event);

          if (key == Event.KEY.ESCAPE)
          {
            if (this.closeOnEscape)
              this.close(0);
          }
          else if (key == Event.KEY.ENTER)
          {
            if (Event.sender(event).tagName != 'TEXTAREA')
              Event.kill(event);
          }
        }
      },

      // properties

      event_beforeShow: createEvent('beforeShow'),
      event_open: createEvent('open'),
      event_close: createEvent('close'),
      event_active: createEvent('active'),

      closeOnEscape: true,

      autocenter: false,
      autocenter_: false,
      modal: false,
      closed: true,

      init: function(config){
        //this.inherit(config);
        TmplContainer.prototype.init.call(this, config);

        // make main element invisible by default
        DOM.hide(this.element);

        // modal window
        /*if (config.modal)
          this.modal = true;*/

        // process title
        if (this.title)
          DOM.insert(this.tmpl.title, this.title);

        /*if ('closeOnEscape' in config)
          this.closeOnEscape = !!config.closeOnEscape;*/

        // add generic rule
        var genericRuleClassName = 'genericRule-' + this.eventObjectId;
        CSS.cssClass(this.element).add(genericRuleClassName);
        this.cssRule = DOM.Style.cssRule('.' + genericRuleClassName);

        // make window moveable
        if (this.moveable)
        {
          if (Basis.DragDrop)
          {
            this.dde = new Basis.DragDrop.MoveableElement({
              element: this.element,
              trigger: this.tmpl.title.parentNode,
              fixRight: false,
              fixBottom: false
            });

            this.dde.addHandler({
              move: function(){
                this.autocenter = false;
                this.element.style.margin = 0;
              },
              over: function(){
                this.cssRule.setStyle(Object.slice(this.element.style, 'left top'.qw()));
                DOM.setStyle(this.element, {
                  top: '',
                  left: ''
                });
              }
            }, this);
          }
          else
          {
            ;;;if(typeof console != 'undefined') console.warn('`moveable` property of Window is not allowed. Drag&Drop module required.')
          }
        }

        // buttons
        var buttons = Array.from(config.buttons).map(function(button){ return Object.complete({ handler: button.handler ? button.handler.bind(this) : button.handler }, button); }, this);

        // common buttons
        var buttons_ = Object.slice(this, ['buttonOk', 'buttonCancel']);
        /*if (this.buttonOk)
          buttons_.buttonOk = this.buttonOk;
        if (this.buttonCancel)
          buttons_.buttonCancel = this.buttonCancel;*/
         
        for (var buttonId in buttons_)
        {
          var button = buttons_[buttonId];
          buttons.push({
            name: buttonId == 'buttonOk' ? 'ok' : 'cancel',
            caption: button.caption || button.title || button,
            handler: (button.handler || this.close).bind(this)
          });
        }

        if (buttons.length)
        {
          this.buttonPanel = new Basis.Controls.Button.ButtonPanel({
            cssClassName: 'Basis-Window-ButtonPlace',
            container: this.tmpl.content,
            childNodes: buttons
          });
        }

        if (!this.titleButton || this.titleButton.close !== false)
        {
          var titleButtonContainer = DOM.insert(this.tmpl.title.parentNode, DOM.createElement('SPAN.Basis-Window-Title-ButtonPlace'), DOM.INSERT_BEGIN);
          CSS.cssClass(titleButtonContainer.parentNode).add('Basis-Window-Title-ButtonPlace-Close');
          DOM.insert(
            titleButtonContainer,
            DOM.createElement(
              {
                description: 'A[href=#].Basis-Window-Title-CloseButton',
                click: new Event.Handler(function(event){
                  Event.kill(event);
                  this.close(0);
                }, this)
              },
              DOM.createElement('SPAN', 'Close')
            )
          );
        }

        if (this.autocenter !== false)
          this.autocenter = this.autocenter_ = true;

        // handlers
        if (this.thread)
        {
          this.thread.addHandler({
            finish: function(){
              if (this.closed)
                DOM.remove(this.element);
            }
          }, this);
        }

        //Event.addHandler(this.element, 'keypress', buttonKeyPressHandler, this);
        //addHandler(this.element, 'click', Event.kill);
        //Event.addHandler(this.element, 'mousedown', this.activate, this);

        Cleaner.add(this);
      },
      setTitle: function(title){
        DOM.insert(DOM.clear(this.tmpl.title), title);
      },
      realign: function(){
        if (this.autocenter)
        {
          //this.autocenter = false;
          this.element.style.margin = '';
          this.cssRule.setStyle(this.element.offsetWidth ? {
            //left: Math.max(0, parseInt(0.5 * (document.body.clientWidth  - this.element.offsetWidth))) + 'px',
            //top:  Math.max(0, parseInt(0.5 * (document.body.clientHeight - this.element.offsetHeight))) + 'px'
            left: '50%',
            top: '50%',
            marginLeft: -this.element.offsetWidth/2 + 'px',
            marginTop: -this.element.offsetHeight/2 + 'px'
          } : { left: 0, top: 0 });
        }
      },
      activate: function(){
        //windowManager.activate(this);
        this.select();
      },
      open: function(params, x, y){
        if (this.closed)
        {
          DOM.visibility(this.element, false);
          DOM.show(this.element);

          windowManager.appendChild(this);
          this.closed = false;

          this.realign();

          if (this.thread)
            this.thread.start(true);

          //this.dispatch('beforeShow', params);
          this.event_beforeShow(params);
          DOM.visibility(this.element, true);

          if (this.buttonPanel && this.buttonPanel.firstChild)
            this.buttonPanel.firstChild.select();

          this.event_open(params);
          this.event_active(params);
          /*this.dispatch('open', params);
          this.dispatch('active', params);*/
        }
        else
        {
          //windowManager.activate(this);
          //;;;if (typeof console != 'undefined') console.warn('make window activate on window.open()');
          this.realign();
        }
      },
      close: function(modalResult){
        if (!this.closed)
        {
          if (this.thread)
            this.thread.start(1);
          else
            DOM.remove(this.element);

          windowManager.removeChild(this);

          this.autocenter = this.autocenter_;

          this.closed = true;
          this.event_close(modalResult)
          //this.dispatch('close', modalResult);
        }
      },
      destroy: function(){
        if (this.dde)
        {
          this.dde.destroy();
          delete this.dde;
        }

        TmplContainer.prototype.destroy.call();

        this.cssRule.destroy();
        delete this.cssRule;

        Cleaner.remove(this);
      }
    });

    //
    // Window manager
    //

    var wmBlocker = new Blocker();
    var windowManager = new nsWrappers.Control({
      id: 'Basis-WindowStack',
      childClass: Window
    });

    windowManager.addHandler({
      childNodesModified: function(){
        CSS.cssClass(this.element).bool('IsNotEmpty', this.firstChild);

        var modalIndex = -1;

        if (this.lastChild)
        {
          for (var i = 0, node; node = this.childNodes[i]; i++)
          {
            node.element.style.zIndex = 2001 + i * 2;
            if (node.modal)
              modalIndex = i;
          }

          this.lastChild.select();
        }

        if (modalIndex != -1)
          wmBlocker.capture(this.element, 2000 + modalIndex * 2);
        else
          wmBlocker.release();
      }
    });

    windowManager.selection.addHandler({
      datasetChanged: function(){
        var selected = this.pick();
        var lastWin = windowManager.lastChild;
        if (selected)
        {
          if (selected.parentNode == windowManager && selected != lastWin)
          {
            // put selected on top
            windowManager.insertBefore(selected);
            windowManager.event_childNodesModified({});
          }
        }
        else
        {
          if (lastWin)
            this.add([lastWin]);
        }
      }      
    });

    Event.onLoad(function(){
      DOM.insert(document.body, windowManager.element, DOM.INSERT_BEGIN);
      for (var node = windowManager.firstChild; node; node = node.nextSibling)
        node.realign();
    });

    //
    // export names
    //

    Basis.namespace(namespace).extend({
      Window: Window,
      Blocker: Blocker,
      getWindowTopZIndex: function(){ return windowManager.childNodes.length * 2 + 2001 }
    });

  })();
