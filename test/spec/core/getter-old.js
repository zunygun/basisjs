module.exports = {
  name: 'basis.getter (backward capability)',

  sandbox: true,
  init: function(){
    var basis = window.basis.createSandbox();

    basis.dev.warn = function(){};
    var data = [
      { a: 11, b: 21, c: 31 },
      { a: 12, b: 22 },
      { a: 13, c: 33 },
      { b: 24, c: 34 },
      { a: 15 },
      { b: 26 },
      { c: 37 },
      { d: { a: 1, b: 2, c: 3 } }
    ];

    var longPath = {
      foo: {
        bar: {
          baz: {
            basis: {
              js: {}
            }
          }
        }
      }
    };
  },

  test: [
    {
      name: 'create from path',
      test: function(){
        var g = basis.getter('foo');
        this.is(longPath.foo, g(longPath));

        var g = basis.getter('foo.bar');
        this.is(longPath.foo.bar, g(longPath));

        var g = basis.getter('foo.bar.baz');
        this.is(longPath.foo.bar.baz, g(longPath));

        var g = basis.getter('foo.bar.baz.basis');
        this.is(longPath.foo.bar.baz.basis, g(longPath));

        var g = basis.getter('foo.bar.baz.basis.js');
        this.is(longPath.foo.bar.baz.basis.js, g(longPath));
      }
    },
    {
      name: 'create from path with modificator',
      test: function(){
        var g = basis.getter('a', 'value: {0:.2}');
        this.is('value: 11.00', g(data[0]));
      }
    },
    {
      name: 'create from function',
      test: function(){
        var g = basis.getter(function(object){
          return object.a;
        });
        this.is(11, g(data[0]));

        var g = basis.getter(function(object){
          return object.a;
        }, 'value: {0:.2}');
        this.is('value: 11.00', g(data[0]));
      }
    },
    {
      name: 'create from getter',
      test: function(){
        var g = basis.getter('a');
        var g2 = basis.getter(g);
        this.is(g, g2);
        this.is(11, g(data[0]));
        this.is(11, g2(data[0]));

        var g = basis.getter('a', '[{0}]');
        var g2 = basis.getter(g);
        this.is(true, g === g2);
        this.is('[11]', g(data[0]));
        this.is('[11]', g2(data[0]));

        var g = basis.getter('a', '[{0}]');
        var g2 = basis.getter(g, basis.fn.$self);
        this.is(false, g === g2);
        this.is('[11]', g(data[0]));
        this.is('[11]', g2(data[0]));

        var g = basis.getter('a');
        var g2 = basis.getter(g, '[{0}]');
        this.is(false, g === g2);
        this.is(11, g(data[0]));
        this.is('[11]', g2(data[0]));

        var g = basis.getter('a', '[{0}]');
        var g2 = basis.getter(g, '{{0}}');
        this.is(false, g === g2);
        this.is('[11]', g(data[0]));
        this.is('{[11]}', g2(data[0]));

      }
    },
    {
      name: 'use on array',
      test: function(){
        var g = basis.getter('a');
        this.is('11,12,13,,15,,,', data.map(g).join(','));
        this.is('11,12,13,15', data.map(g).filter(basis.fn.$isNotNull).join(','));
      }
    },
    {
      name: 'comparation',
      test: function(){
        this.is(true, basis.getter('a') === basis.getter('a'));
        this.is(true, basis.getter('a', '') !== basis.getter('a'));
        this.is(true, basis.getter('a', false) === basis.getter('a'));
        this.is(true, basis.getter('a', null) === basis.getter('a'));
        this.is(true, basis.getter('a', undefined) === basis.getter('a'));

        this.is(true, basis.getter(basis.fn.$self) === basis.getter(basis.fn.$self));
        this.is(true, !basis.fn.$self.getter);
        this.is(true, !basis.fn.$self.__extend__);

        /* jscs:disable requireKeywordsOnNewLine */
        this.is(true, basis.getter(function(){ return 1; }) !== basis.getter(function(){ return 1; }));
        this.is(true, basis.getter(function(){ return 1; }) !== basis.getter(function(){ return 1; }));
        this.is(true, basis.getter(function(){ return 1; }) !== basis.getter(function(){ return 2; }));

        this.is(true, basis.getter(function(){ return 1; }, Number) !== basis.getter(function(){ return 1; }, Number));
        this.is(true, basis.getter(function(){ return 1; }, Number) !== basis.getter(function(){ return 1; }, Number));
        this.is(true, basis.getter(function(){ return 1; }, Number) !== basis.getter(function(){ return 2; }, Number));

        this.is(true, basis.getter(function(){ return 1; }, '') !== basis.getter(function(){ return 1; }, ''));
        this.is(true, basis.getter(function(){ return 1; }, '') !== basis.getter(function(){ return 1; }, ''));
        this.is(true, basis.getter(function(){ return 1; }, '') !== basis.getter(function(){ return 2; }, ''));

        this.is(true, basis.getter(function(){ return 1; }, 'f') !== basis.getter(function(){ return 1; }, 'f'));
        this.is(true, basis.getter(function(){ return 1; }, 'f') !== basis.getter(function(){ return 1; }, 'f'));
        this.is(true, basis.getter(function(){ return 1; }, 'f') !== basis.getter(function(){ return 2; }, 'f'));

        this.is(true, basis.getter(function(){ return 1; }, 'f') !== basis.getter(function(){ return 1; }, 'fs'));
        /* jscs:enable requireKeywordsOnNewLine */

        this.is(true, basis.getter('a', Number) !== basis.getter('a'));
        this.is(true, basis.getter('a', Number) === basis.getter('a', Number));
        this.is(true, basis.getter(basis.fn.$self, Number) === basis.getter(basis.fn.$self, Number));
        this.is(true, basis.getter(basis.fn.$self, '') === basis.getter(basis.fn.$self, ''));
        this.is(true, basis.getter(basis.fn.$self, 'asd') === basis.getter(basis.fn.$self, 'asd'));
        this.is(true, basis.getter(basis.fn.$self, String) !== basis.getter(basis.fn.$self, Number));

        this.is(true, basis.getter('a', '') === basis.getter('a', ''));
        this.is(true, basis.getter('a', '') !== basis.getter('a', 'f'));

        this.is(true, basis.getter('a', Number) === basis.getter(basis.getter('a', Number)));
        this.is(true, basis.getter('a', Number) !== basis.getter(basis.getter('a', Number), Number));

        this.is(true, basis.getter('a', basis.getter('b', Number)) === basis.getter('a', basis.getter('b', Number)));
        this.is(true, basis.getter('a', basis.getter('b', Number)) !== basis.getter('a', basis.getter('a', Number)));
        this.is(true, basis.getter('a', basis.getter('b', Number)) !== basis.getter('a', basis.getter('b')));
      }
    },
    {
      name: 'non-cacheable comparation',
      test: function(){
        var object = {};
        var array = {};

        this.is(true, basis.getter('a', {}) !== basis.getter('a', {}));
        this.is(true, basis.getter('a', object) !== basis.getter('a', object));

        this.is(true, basis.getter('a', []) !== basis.getter('a', []));
        this.is(true, basis.getter('a', array) !== basis.getter('a', array));
      }
    },
    {
      name: 'extensible',
      test: function(){
        var __extend__ = basis.getter('').__extend__;
        var func = function(){};
        var getter = basis.getter('random');

        this.is(true, typeof __extend__ == 'function');

        this.is(__extend__, basis.getter('a').__extend__);
        this.is(__extend__, basis.getter('a', '').__extend__);
        this.is(__extend__, basis.getter('a', function(){}).__extend__);
        this.is(__extend__, basis.getter('a', {}).__extend__);
        this.is(__extend__, basis.getter('a', []).__extend__);

        this.is(__extend__, basis.getter(basis.fn.$true).__extend__);
        this.is(__extend__, basis.getter(basis.fn.$true, '').__extend__);
        this.is(__extend__, basis.getter(basis.fn.$true, function(){}).__extend__);
        this.is(__extend__, basis.getter(basis.fn.$true, {}).__extend__);
        this.is(__extend__, basis.getter(basis.fn.$true, []).__extend__);

        this.is(__extend__, basis.getter(function(){}).__extend__);
        this.is(__extend__, basis.getter(function(){}, '').__extend__);
        this.is(__extend__, basis.getter(function(){}, function(){}).__extend__);
        this.is(__extend__, basis.getter(function(){}, {}).__extend__);
        this.is(__extend__, basis.getter(function(){}, []).__extend__);

        this.is(__extend__, basis.getter(getter).__extend__);
        this.is(__extend__, basis.getter(getter, '').__extend__);
        this.is(__extend__, basis.getter(getter, getter).__extend__);
        this.is(__extend__, basis.getter(getter, {}).__extend__);
        this.is(__extend__, basis.getter(getter, []).__extend__);

        this.is(true, basis.getter('a').__extend__() === basis.getter());
        this.is(true, basis.getter('a').__extend__() === basis.fn.nullGetter);
        this.is(true, basis.getter('a').__extend__('a') === basis.getter('a'));
        this.is(true, basis.getter('a').__extend__(func) === basis.getter(func));
      }
    }
  ]
};
