module.exports = {
  name: 'basis.ua',

  init: function(){
    basis.require('basis.ua');
    var browser = basis.ua;

    var cookieName = 'test-cookie-' + Math.random().toFixed(8).substr(2);
  },

  test: [
    {
      name: 'Cookie',
      testcase: [
        {
          name: 'set',
          test: function(){
            browser.cookies.set(cookieName, 1);
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie), true);

            browser.cookies.set(cookieName, 'basis-test');
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*basis-test\\s*(;|$)')).test(document.cookie), true);

            browser.cookies.set(cookieName);
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=?\\s*(;|$)')).test(document.cookie), true);
          }
        },
        {
          name: 'get',
          test: function(){
            browser.cookies.set(cookieName, 1);
            this.is('1', browser.cookies.get(cookieName));

            browser.cookies.set(cookieName, 'basis-test');
            this.is('basis-test', browser.cookies.get(cookieName));

            browser.cookies.set(cookieName);
            this.is('', browser.cookies.get(cookieName));

            browser.cookies.set(cookieName, 'Привет мир');
            this.is('Привет мир', browser.cookies.get(cookieName));
          }
        },
        {
          name: 'remove',
          test: function(){
            browser.cookies.set(cookieName, 1);
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie), true);

            browser.cookies.remove(cookieName);
            this.is(false, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie), true);
            this.is(false, (new RegExp(cookieName)).test(document.cookie), true);
          }
        },
        {
          name: 'remove by path',
          test: function(){
            var path = location.pathname.replace(/\/[^\/]+$/, '/');

            // set with path
            browser.cookies.set(cookieName, 1, 0, path);
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie), true);

            // no effect for remove without path
            browser.cookies.remove(cookieName);
            this.is(true, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie));
            this.is(true, (new RegExp(cookieName)).test(document.cookie));

            // remove
            browser.cookies.remove(cookieName, path);
            this.is(false, (new RegExp('(^|\;)\\s*' + cookieName + '\\s*=\\s*1\\s*(;|$)')).test(document.cookie));
            this.is(false, (new RegExp(cookieName)).test(document.cookie));
          }
        }
      ]
    },
    {
      name: 'clear test cookies',
      test: function(){
        document.cookie = cookieName + '=;expires=' + new Date(0);
      }
    }
  ]
};
