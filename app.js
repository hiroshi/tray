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


var ItemPreview = React.createClass({
  propTypes: {
    record: React.PropTypes.object.isRequired,
  },
  _handleArchive: function(e) {
    TrayStore.archiveItem(this.props.record);
  },
  render: function() {
    var text = this.props.record.get('text');
    var re = /(^|\s)[^\s]+:[^\s]+(\s|$)/g;
    var texts = [];
    var last = 0;
    while ((m = re.exec(text)) != null) {
      // text between last match and this
      if (last != m.index) {
        texts.push(<span key={last}>{text.substring(last, m.index)}</span>);
      }
      // this match
      texts.push(<a key={m.index} href={m[0]} target="_blank">{m[0]}</a>);
      last = m.index + m[0].length;
    }
    // last part of text
    texts.push(<span key={last}>{text.substring(last)}</span>);
    return (
      <div className='item'>
        <div className="preview">
          {texts}
        </div>
        <div>
          <button onClick={this.props.startEdit}>Edit</button>
          <button className="error" onClick={this._handleArchive}>Archive</button>
        </div>
      </div>
    );
  }
});

var ItemEdit = React.createClass({
  _handleDone: function() {
    var text = this.refs.text.getDOMNode().value.trim();
    this.props.record.set('text', text);
    this.props.endEdit();
  },
  render: function() {
    return (
      <div className="item">
        <div>
          <textarea ref='text' defaultValue={this.props.record.get('text')} />
        </div>
        <div>
          <button onClick={this._handleDone}>Done</button>
        </div>
      </div>
    );
  }
});

var Item = React.createClass({
  getInitialState: function() {
    return {
      editing: false
    };
  },
  propTypes: {
    record: React.PropTypes.object.isRequired,
  },
  _toggleEdit: function() {
    this.setState({editing: !this.state.editing});
  },
  render: function() {
    if (this.state.editing) {
      return <ItemEdit record={this.props.record} endEdit={this._toggleEdit} />;
    } else {
      return <ItemPreview record={this.props.record} startEdit={this._toggleEdit} />;
    }
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
        <div className="row">
          <div className="full">
            <form onSubmit={this._pushItem} className="item">
              <div>
                <textarea ref='text' />
              </div>
              <div>
                <button type='sumbmit'>Push</button>
              </div>
            </form>
            <ul className="items">
              {items}
            </ul>
          </div>
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
