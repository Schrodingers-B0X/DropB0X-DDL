# Dropbox to DDL Converter

A lightweight static web app that converts Dropbox APK share links into direct-style links suitable for creating Downloader shortcodes through [aftv.news](https://aftv.news).

## What problem this solves

Shared Dropbox links have changed their URL queries over the years and they don't work as DDL's (direct download links) due to them showing a landing page with a "Download" button. Modifying the share link to be a DDL, is a workaround so no landing page is shown and it directly downloads... i.e. is a DDL. Just one example but newer Dropbox links typically look like this:

```text
https://www.dropbox.com/scl/fi/pb82uozxt9witiq2njybf/example.apk?rlkey=idba0011ck5r6gfdgfqijf7ty43g&st=randomkey&dl=0
```

For Downloader/AFTV shortcode creation, the useful direct-style version is:

```text
https://dl.dropboxusercontent.com/scl/fi/pb82uozxt9witiq2njybf/example.apk?rlkey=idba0011ck5r6gfdgfqijf7ty43g
```

This tool performs that conversion automatically.

## Conversion logic

The browser JavaScript follows this order:

1. Trim the pasted link.
2. Add `https://` if the user pasted a URL without a scheme.
3. Parse the URL safely with the browser's `URL` API.
4. Only allow these Dropbox hosts:
   - `dropbox.com`
   - `www.dropbox.com`
   - `dl.dropboxusercontent.com`
5. If the URL already looks direct/download-ready, show it as ready.
6. If the URL has an `rlkey` value, output:

   ```text
   https://dl.dropboxusercontent.com + original path + ?rlkey=VALUE
   ```

7. If it is an old-style Dropbox link with `dl=0`, change it to `dl=1`.
8. Otherwise, show a clear “no matching rule” message.

## Project structure

```text
.
├── index.html
├── assets/
│   ├── app.js
│   ├── favicon.svg
│   └── style.css
├── tests/
│   └── converter.test.cjs
├── .github/
│   └── workflows/
│       └── pages.yml
├── .nojekyll
├── .gitignore
├── LICENSE
└── README.md
```

## Using the converter

1. Create or log into a Dropbox Basic account.
2. Upload your APK file.
3. Copy the original Dropbox share link.
4. Paste it into the converter.
5. Click **Create correct URL**.
6. Copy the generated URL.
7. Open [aftv.news](https://aftv.news).
8. Paste the generated URL, complete the CAPTCHA, and shorten it.
9. Use the returned Downloader shortcode on TV devices.

## Local testing

You can open `index.html` directly in a browser.

For a more realistic local test, serve the folder with a tiny local web server:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Running tests locally

The test file uses Node.js and has no external dependencies:

```bash
node --check assets/app.js
node tests/converter.test.cjs
```

## Privacy

This tool does not send Dropbox links to a backend server. The only external site linked from the UI is `aftv.news`, which you open separately to create a Downloader shortcode.

## Notes

This project is not affiliated with Dropbox, AFTVnews, or the Downloader app.
