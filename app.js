/** @jsx React.DOM */
var TrayStore = {
  dropbox: {},
  // init: function() {
  //   var client = new Dropbox.Client({key: DROPBOX_APP_KEY});
  //   this.dropbox.client = client;
  //   // Try to finish OAuth authorization.
  //   client.authenticate({interactive: false}, function (error) {
  //     if (error) {
  //       alert('Authentication error: ' + error);
  //     }
  //   });
  //   if (client.isAuthenticated()) {
  //     // Client is authenticated. Display UI.
  //     console.log("dropbox authenticated.")
  //     requestSafariPush(function(deviceToken) {
  //       var xhr = new XMLHttpRequest();
  //       var payload = JSON.stringify({uid: client.dropboxUid(), deviceToken: deviceToken, accessToken: client.credentials().token});
  //       console.log("payload: " + payload);
  //       xhr.open('POST', TRAY_REGISTER_URL, true);
  //       xhr.setRequestHeader('X-PINGOTHER', 'pingpong');
  //       //xhr.setRequestHeader('Content-Type', "application/json");
  //       xhr.send(payload);
  //     });
  //   }
  //   window.dropboxLogin = function() {
  //     client.authenticate();
  //   };
  // },
  // promiseItems: function() {
  //   var datastoreManager = this.dropbox.client.getDatastoreManager();
  //   return new Promise(function(resolve, reject) {
  //     datastoreManager.openDefaultDatastore(function(error, datastore) {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         var itemTable = datastore.getTable('items');
  //         var items = itemTable.query().map(function(record){ return record.getFields(); });
  //         resolve(items.sort(function(a, b) {
  //           return b.orderDate - a.orderDate;
  //         }));
  //       }
  //     });
  //   });
  // },
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
        console.log("payload: " + payload);
        xhr.open('POST', TRAY_REGISTER_URL, true);
        xhr.setRequestHeader('X-PINGOTHER', 'pingpong');
        //xhr.setRequestHeader('Content-Type', "application/json");
        xhr.send(payload);
      });
    }
    window.dropboxLogin = function() {
      client.authenticate();
    };
    return Bacon.fromCallback(function(callback) {
      if (this.dropbox.client.isAuthenticated()) {
        var datastoreManager = this.dropbox.client.getDatastoreManager();
        datastoreManager.openDefaultDatastore(function(error, datastore) {
          if (error) {
            console.error(error);
            callback(Bacon.Error(error));
          } else {
            var itemTable = datastore.getTable('items');
            var items = itemTable.query().map(function(record){ return record.getFields(); });
            callback(items.sort(function(a, b) {
              return b.orderDate - a.orderDate;
            }));
          }
        });
      }
    }.bind(this));
  },
};


var App = React.createClass({
  getInitialState: function() {
    return {
      items: []
    };
  },
  componentWillMount: function() {
    TrayStore.streamItems()
    .onValue(function(items) {
      this.setState({items: items});
    }.bind(this));
    // TrayStore.init();
    // TrayStore.promiseItems()
    // .then(function(items) {
    //   this.setState({items: items});
    // }.bind(this));
  },
  render: function() {
    var items = this.state.items.map(function(item) {
      return <li>{item.text}</li>;
    });
    return (
      <div>
        <ul>
          {items}
        </ul>
      </div>
    );
  }
});


React.renderComponent(
  <App />,
  document.getElementById('app')
);
