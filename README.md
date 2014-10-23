TrayWeb
=======

Create a dropbox app
--------------------

Go to [Dropbox app console](https://www.dropbox.com/developers/apps), then create an app.
- Allow datastore and app folder access permissions.
- Added `http://localhost:8010/` to OAuth2 Redirect URLs for development server.
- With the value of "App key" of the app, replace `DROPBOX_APP_KEY` in env.js.


Local development
-----------------

    python -m SimpleHTTPServer 8010

### Test local webhook

Temporary, change TRAY_REGISTER_URL in env.js to local one.

    TRAY_REGISTER_URL = "http://localhost:5000/register";

### Add new bower package

    bower install --save <package>

Manually add `<script>` or `<link>` tag to `index.html`.

    git add app/components
