/** @jsx React.DOM */
var TrayStore = {
  dropbox: {},
  _defaultDatastore: function() {
    if (this.dropbox.defaultDatastore) {
      return Bacon.once(this.dropbox.defaultDatastore);
    } else {
      return Bacon.fromCallback(function(callback) {
        var datastoreManager = this.dropbox.client.getDatastoreManager();
        datastoreManager.openDefaultDatastore(function(error, datastore) {
          if (error) {
            console.error(error);
            callback(Bacon.Error(error));
          } else {
            this.dropbox.defaultDatastore = datastore;
            callback(datastore);
          }
        }.bind(this));
      }.bind(this))
    }
  },
  streamItems: function() {
    var client = new Dropbox.Client({key: DROPBOX_APP_KEY});
    this.dropbox.client = client;
    // Try to finish OAuth authorization.
    client.authenticate({interactive: false}, function (error) {
      if (error) {
        alert('Authentication error: ' + error);
      }
    });
    if (client.isAuthenticated()) {
      // Client is authenticated. Display UI.
      console.log("dropbox authenticated.")
      requestSafariPush(function(deviceToken) {
        var xhr = new XMLHttpRequest();
        var payload = JSON.stringify({uid: client.dropboxUid(), deviceToken: deviceToken, accessToken: client.credentials().token});
        //console.log("payload: " + payload);
        xhr.open('POST', TRAY_REGISTER_URL, true);
        xhr.setRequestHeader('X-PINGOTHER', 'pingpong');
        //xhr.setRequestHeader('Content-Type', "application/json");
        xhr.send(payload);
      });
    }
    window.dropboxLogin = function() {
      client.authenticate();
    };
    return Bacon.fromBinder(function(callback) {
      this._defaultDatastore().onValue(function(datastore) {
        var callbackItems = function() {
          var itemTable = datastore.getTable('items');
          // Quick and dirty onetime migration
          // itemTable.query().forEach(function(record) {
          //   record.update({archived: false});
          // });
          // Return initial items
          var items = itemTable.query({archived: false});
          callback(items.sort(function(a, b) {
            return b.get('orderDate') - a.get('orderDate');
          }));
        };
        callbackItems();
        // Listen to farther changes
        datastore.recordsChanged.addListener(function(event) {
          if (event.affectedRecordsForTable('items')) {
            callbackItems();
          }
        });
      });
      return function() {
        // unsub functionality here, this one's a no-op
        console.log('unsub items stream');
      }
    }.bind(this));
  },
  addText: function(text) {
    this._defaultDatastore()
    .onValue(function(datastore) {
      var itemTable = datastore.getTable('items');
      var now = new Date();
      itemTable.insert({
        text: text,
        archived: false,
        createDate: now,
        orderDate: now});
    });
  },
  archiveItem: function(record) {
    record.update({archived: true});
  },
};

var Item = React.createClass({
  propTypes: {
    record: React.PropTypes.object.isRequired,
  },
  _handleArchive: function(e) {
    TrayStore.archiveItem(this.props.record);
  },
  render: function() {
    return (
      <div className='item'>
        <span>{this.props.record.get('text')}</span>
        <button className="error" onClick={this._handleArchive}>Archive</button>
      </div>
    );
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {
      login: false,
      items: [],
    };
  },
  componentWillMount: function() {
    var stream = TrayStore.streamItems();
    stream.onValue(function(items) {
      this.setState({items: items, login: true});
    }.bind(this));
    stream.onError(function(error) {
      console.error(error);
    });
  },
  _pushItem: function(e) {
    e.preventDefault();
    var text = this.refs.text.getDOMNode().value.trim();
    TrayStore.addText(text);
    this.refs.text.getDOMNode().value = "";
  },
  render: function() {
    if (this.state.login) {
      items = this.state.items.map(function(item) {
        //return <li key={item.getId()}>{item.get('text')}</li>;
        return <li key={item.getId()}><Item record={item} /></li>;
      });
      return (
        <div>
          <form onSubmit={this._pushItem}>
            <textarea ref='text' />
            <button type='sumbmit'>Push</button>
          </form>
          <ul>
            {items}
          </ul>
        </div>
      );
    } else {
      return <button onClick={dropboxLogin}>dropbox login</button>
    }
  }
});


React.render(
  <App />,
  document.getElementById('app')
);
