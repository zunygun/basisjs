module.exports = {
  name: 'basis.data.vector',

  init: function(){
    basis.require('basis.data');
    basis.require('basis.data.vector');

    (function(){
      var proto = basis.data.Object.prototype;
      var eventsMap = {};
      var seed = 1;
      var eventTypeFilter = function(event){
        return event.type == this;
      };

      proto.debug_emit = function(event){
        if (!this.testEventId_)
        {
          this.testEventId_ = seed++;
          eventsMap[this.testEventId_] = [];
        }

        eventsMap[this.testEventId_].push(event);
      };

      window.getEvents = function(object, type){
        var events = eventsMap[object.testEventId_];

        if (events && type)
          events = events.filter(eventTypeFilter, type);

        return events;
      };

      window.eventCount = function(object, type){
        var events = getEvents(object, type);

        return events ? events.length : 0;
      };

      window.getLastEvent = function(object, type){
        var events = getEvents(object, type);

        return events && events[events.length - 1];
      };
    })();

    function createDS(count){
      return new basis.data.Dataset({
        items: basis.array.create(count || 10, function(idx){
          return new basis.data.Object({
            data: {
              value: idx
            }
          })
        })
      });
    }

    function checkVector(vector){
      var sourceItems = [];
      var keys = basis.object.keys(vector.members_);
      var items = vector.getItems();
      var scount = 0;
      var scount2 = 0;

      for (var key in vector.items_)
        if (items.indexOf(vector.items_[key]) == -1)
          return 'getItems and vector.items_ diconnected';

      if (keys.length != vector.itemCount)
        return 'itemCount broken';

      for (var key in vector.sourceMap_)
      {
        var sourceObjectInfo = vector.sourceMap_[key];
        if (sourceObjectInfo.object.basisObjectId != key)
          return 'wrong key of source object (' + key + ')';
        if (sourceObjectInfo.key != vector.rule(sourceObjectInfo.object))
          return 'key property of sourceObjectInfo is wrong (' + key + ')';
        if (sourceObjectInfo.key in vector.members_ == false)
          return 'sourceObjectInfo.key is not in member map (' + key + ')';
        if (key in vector.members_[sourceObjectInfo.key] == false)
          return 'link to sourceObjectInfo in member is missed (' + key + ')';
        if (vector.members_[sourceObjectInfo.key][key] != sourceObjectInfo)
          return 'wrong link to sourceObjectInfo in member (' + key + ')';

        for (var k in sourceObjectInfo.values)
        {
          if (k in vector.calcs == false)
            return 'no calc for key ' + k;
          if (sourceObjectInfo.values[k] !== vector.calcs[k].valueGetter(sourceObjectInfo.object))
            return 'wrong value in sourceObjectInfo (' + k + ')';
        }

        for (var k in vector.calcs)
          if (k in sourceObjectInfo.values == false)
            return 'no value for calc in sourceObjectInfo.values ' + k;

        scount++;
      }

      var mcount = 0;
      for (var key in vector.members_)
      {
        var member = vector.members_[key];
        var ocount = 0;
        for (var k in member)
        {
          switch (k)
          {
            case 'count':
            case 'item':
              break;
            default:
              if (isNaN(k))
                return 'wrong property `' + k + '` in vector member';
              if (k in vector.sourceMap_ == false)
                return 'object with id `' + k + '` is not found in sourceMap';
              if (member[k] !== vector.sourceMap_[k])
                return 'broken link';
              ocount++;
              scount2++;
          }
        }

        if (String(member.item.key) != key)
          return 'member item has wrong value for key';
        if (ocount != member.count)
          return 'member count broken';

        mcount++;
      }

      if (mcount != vector.itemCount)
        return 'itemCount or links broken';

      if (scount != scount2)
        return 'source object count broken';

      return false;
    }
  },

  test: [
    {
      name: 'construct',
      test: [
        {
          name: 'no config',
          test: function(){
            var vector = new basis.data.vector.Vector;

            this.is(false, checkVector(vector));
            this.is(0, vector.itemCount);
          }
        },
        {
          name: 'source and calcs (no rule)',
          test: function(){
            var vector = new basis.data.vector.Vector({
              source: createDS(),
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              }
            });

            this.is(false, checkVector(vector));
            this.is(1, vector.itemCount);
            this.is(10, vector.pick().data.count);
            this.is(45, vector.pick().data.sum);
          }
        },
        {
          name: 'source, rule and calcs',
          test: function(){
            var vector = new basis.data.vector.Vector({
              source: createDS(),
              rule: 'data.value>>1',
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              }
            });

            this.is(5, vector.itemCount);

            var items = vector.getItems();
            var count2count = 0;
            var sumcheck = 0;
            for (var i = 0; i < items.length; i++)
            {
              var item = items[i];
              count2count += item.data.count == 2;
              sumcheck += item.data.sum == 4 * item.key + 1;
            }
            this.is(5, count2count);
            this.is(5, sumcheck);

            // check vector
            this.is(false, checkVector(vector));
          }
        }
      ]
    },
    {
      name: 'dynamics',
      test: [
        {
          name: 'create with no source, and set new source after creation',
          test: function(){
            var dataset = createDS();
            var vector = new basis.data.vector.Vector({
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              }
            });

            this.is(0, vector.itemCount);

            vector.setSource(dataset);
            this.is(1, vector.itemCount);
            this.is(10, vector.pick().data.count);
            this.is(45, vector.pick().data.sum);

            this.is(false, checkVector(vector));
          }
        },
        {
          name: 'create with source, drop source, and set new source',
          test: function(){
            var dataset = createDS();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              }
            });

            var isDestroyed = false;
            vector.pick().addHandler({
              destroy: function(){
                isDestroyed = true;
              }
            });

            vector.setSource();
            this.is(false, checkVector(vector));
            this.is(0, vector.itemCount);
            this.is(true, isDestroyed);

            vector.setSource(dataset);
            this.is(false, checkVector(vector));
            this.is(1, vector.itemCount);
            this.is(10, vector.pick().data.count);
            this.is(45, vector.pick().data.sum);
          }
        },
        {
          name: 'create with no rule, set some rule, than set default',
          test: function(){
            var deleted;
            var inserted;
            var vector = new basis.data.vector.Vector({
              source: createDS(),
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              },
              handler: {
                itemsChanged: function(sender, delta){
                  deleted = delta.deleted;
                  inserted = delta.inserted;
                }
              }
            });
            this.is(1, vector.itemCount);
            this.is(10, vector.pick().data.count);
            this.is(45, vector.pick().data.sum);

            //////////////////////////////

            var items = vector.getItems();

            vector.setRule(basis.getter('data.value >> 1'));
            this.is(items, deleted);
            this.is(vector.getItems(), inserted);
            this.is(5, inserted && inserted.length);
            this.is(false, checkVector(vector));
            var items = vector.getItems();
            var count2count = 0;
            var sumcheck = 0;
            for (var i = 0; i < items.length; i++)
            {
              var item = items[i];
              count2count += item.data.count == 2;
              sumcheck += item.data.sum == 4 * item.key + 1;
            }
            this.is(5, vector.itemCount);
            this.is(5, count2count);
            this.is(5, sumcheck);

            //////////////////////////////

            var items = vector.getItems();

            vector.setRule();
            this.is(items, deleted);
            this.is(5, deleted && deleted.length);
            this.is(vector.getItems(), inserted);
            this.is(false, checkVector(vector));
            this.is(1, vector.itemCount);
            this.is(10, vector.pick().data.count);
            this.is(45, vector.pick().data.sum);
          }
        },
        {
          name: 'source object values - calcs',
          test: function(){
            var dataset = createDS();
            var items = dataset.getItems();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              calcs: {
                sum: basis.data.vector.sum('data.value'),
                count: basis.data.vector.count()
              }
            });

            items.forEach(function(object){
              object.update({ value: 0 })
            });
            this.is(false, checkVector(vector));
            this.is(0, vector.pick().data.sum);

            items.forEach(function(object, idx){
              object.update({ value: idx })
            });
            this.is(false, checkVector(vector));
            this.is(45, vector.pick().data.sum);
          }
        },
        {
          name: 'source object values - key',
          test: function(){
            var dataset = createDS();
            var items = dataset.getItems();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              rule: 'data.value'
            });

            this.is(false, checkVector(vector));
            this.is(10, vector.itemCount);

            items.forEach(function(object){
              object.update({ value: 0 });
            });
            this.is(false, checkVector(vector));
            this.is(1, vector.itemCount);

            items.forEach(function(object, idx){
              object.update({ value: idx });
            });
            this.is(false, checkVector(vector));
            this.is(10, vector.itemCount);
          }
        },
        {
          name: 'move some items from one key to another',
          test: function(){
            var dataset = createDS();
            var items = dataset.getItems();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              rule: 'data.value & 1',
              calcs: {
                sum: basis.data.vector.sum('data.value')
              }
            });

            this.is(false, checkVector(vector));
            this.is(2, vector.itemCount);

            for (var i = 0; i < items.length / 2; i++)
              items[i].update({ value: 0 })

            this.is(false, checkVector(vector));
            this.is(2, vector.itemCount);
            this.is(false, isNaN(vector.getItems()[0].data.sum));
            this.is(false, isNaN(vector.getItems()[1].data.sum));
          }
        },
        {
          name: 'delete items from source',
          test: function(){
            var dataset = createDS();
            var items = dataset.getItems().slice();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              rule: 'data.value & 1',
              calcs: {
                sum: basis.data.vector.sum('data.value')
              }
            });

            this.is(false, checkVector(vector));
            this.is(2, vector.itemCount);

            // delete half
            for (var i = 0; i < items.length / 2; i++)
              items[i].destroy()

            this.is(false, checkVector(vector));
            this.is(2, vector.itemCount);
            this.is(false, isNaN(vector.getItems()[0].data.sum));
            this.is(false, isNaN(vector.getItems()[1].data.sum));

            // delete all
            dataset.clear()

            this.is(false, checkVector(vector));
            this.is(0, vector.itemCount);
          }
        },
        {
          name: 'setCalc',
          test: function(){
            var dataset = createDS();
            var vector = new basis.data.vector.Vector({
              source: dataset,
              calcs: {
                value: basis.data.vector.sum('data.value')
              }
            });

            var sum = dataset.getItems().reduce(function(res, item){ return res + item.data.value }, 0);
            this.is(sum, vector.pick().data.value)

            vector.setCalc('value', basis.data.vector.count());
            this.is(dataset.itemCount, vector.pick().data.value)

            vector.setCalc('value');
            this.is(undefined, vector.pick().data.value)

            vector.setCalc('value', basis.data.vector.count());
            this.is(dataset.itemCount, vector.pick().data.value)

            vector.setCalc('value', basis.data.vector.sum('data.value'));
            this.is(sum, vector.pick().data.value);
          }
        }
      ]
    }
  ]
};
