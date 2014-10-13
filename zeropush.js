function requestSafariPush(grantedCallback) {
  var checkRemotePermission = function (permissionData) {
    if (permissionData.permission === 'default') {
      // This is a new web service URL and its validity is unknown.
      window.safari.pushNotification.requestPermission(
        'https://tray-safari.zeropush.com', // The web service URL.
        'web.com.yakitara.tray',  // The Website Push ID.
        {},                                 // Extra data is unused when using hosted push packages.
        checkRemotePermission               // The callback function.
      );
    }
    else if (permissionData.permission === 'denied') {
      // The user said no. Talk to your UX expert to see what you can do to entice your
      // users to subscribe to push notifications.
      console.log('denied');
    }
    else if (permissionData.permission === 'granted') {
      // The web service URL is a valid push provider, and the user said yes.
      // permissionData.deviceToken is now available to use.
      grantedCallback(permissionData.deviceToken);
    }
  };
  // Ensure that the user can receive Safari Push Notifications.
  if ('safari' in window && 'pushNotification' in window.safari) {
    var permissionData = window.safari.pushNotification.permission('web.com.yakitara.tray');
    checkRemotePermission(permissionData);
  }
  else {
    // A good time to let a user know they are missing out on a feature or just bail out completely?
  }
};

