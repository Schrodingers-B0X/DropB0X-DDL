(function (global) {
  'use strict';

  const ALLOWED_DROPBOX_HOSTS = new Set([
    'dropbox.com',
    'www.dropbox.com',
    'dl.dropboxusercontent.com'
  ]);

  function normaliseHost(host) {
    return String(host || '').toLowerCase().replace(/\.$/, '');
  }

  function isDropboxHost(host) {
    return ALLOWED_DROPBOX_HOSTS.has(normaliseHost(host));
  }

  function hasUrlScheme(input) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  }

  function parseUrlRobust(input) {
    const trimmed = String(input || '').trim();
    if (!trimmed) return null;

    const candidate = hasUrlScheme(trimmed)
      ? trimmed
      : 'https://' + trimmed.replace(/^\/+/, '');

    try {
      return new URL(candidate);
    } catch (_err) {
      return null;
    }
  }

  function result(status, message, output, rule, debug) {
    return {
      status,
      message,
      output: output || '',
      rule,
      debug
    };
  }

  function convertDropboxLink(input) {
    const inputRaw = String(input || '');
    const inputTrimmed = inputRaw.trim();

    const debug = {
      input_raw: inputRaw,
      input_trimmed: inputTrimmed,
      parsed_href: null,
      host: null,
      params: {},
      rule: null
    };

    if (!inputTrimmed) {
      debug.rule = 'invalid_empty';
      return result('invalid', 'Paste a Dropbox link first.', '', 'invalid_empty', debug);
    }

    const url = parseUrlRobust(inputTrimmed);
    if (!url || !url.hostname) {
      debug.rule = 'invalid_parse';
      return result('invalid', 'That does not look like a valid URL.', '', 'invalid_parse', debug);
    }

    const host = normaliseHost(url.hostname);
    debug.parsed_href = url.href;
    debug.host = host;
    debug.params = Object.fromEntries(url.searchParams.entries());

    if (!isDropboxHost(host)) {
      debug.rule = 'not_dropbox';
      return result(
        'not_dropbox',
        'This is not a recognised Dropbox share link. Paste a link from dropbox.com or www.dropbox.com.',
        '',
        'not_dropbox',
        debug
      );
    }

    const alreadyModified =
      host === 'dl.dropboxusercontent.com' ||
      url.searchParams.get('dl') === '1' ||
      url.searchParams.get('raw') === '1';

    if (alreadyModified) {
      debug.rule = 'stop_already_modified';
      url.protocol = 'https:';
      return result(
        'already_modified',
        'This link already looks download-ready. You can copy it, or paste the original Dropbox share link again if you need a fresh conversion.',
        url.href,
        'stop_already_modified',
        debug
      );
    }

    const rlkey = url.searchParams.get('rlkey');
    if (rlkey) {
      debug.rule = 'rlkey_hostswap_keep_only_rlkey';
      const out = new URL('https://dl.dropboxusercontent.com');
      out.pathname = url.pathname;
      out.searchParams.set('rlkey', rlkey);

      return result(
        'converted',
        'Converted modern Dropbox link. Host changed to dl.dropboxusercontent.com and only rlkey was kept.',
        out.href,
        'rlkey_hostswap_keep_only_rlkey',
        debug
      );
    }

    if (url.searchParams.get('dl') === '0') {
      debug.rule = 'dl0_to_dl1';
      url.protocol = 'https:';
      url.searchParams.set('dl', '1');

      return result(
        'converted',
        'Converted old-style Dropbox link by changing dl=0 to dl=1.',
        url.href,
        'dl0_to_dl1',
        debug
      );
    }

    debug.rule = 'no_change';
    return result(
      'no_change',
      'No conversion rule matched. Paste an unmodified Dropbox share link with rlkey, or an old-style link ending in dl=0.',
      '',
      'no_change',
      debug
    );
  }

  function getStatusUi(status) {
    const map = {
      converted: {
        title: 'Correct URL created',
        kicker: 'Success',
        badge: 'Ready',
        className: 'ok'
      },
      already_modified: {
        title: 'Already download-ready',
        kicker: 'Already modified',
        badge: 'Ready',
        className: 'warn'
      },
      not_dropbox: {
        title: 'Not a Dropbox link',
        kicker: 'Check link',
        badge: 'Not Dropbox',
        className: 'err'
      },
      no_change: {
        title: 'No matching rule',
        kicker: 'Needs original share link',
        badge: 'No change',
        className: 'warn'
      },
      invalid: {
        title: 'Invalid input',
        kicker: 'Try again',
        badge: 'Invalid',
        className: 'err'
      }
    };

    return map[status] || map.invalid;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();

    try {
      document.execCommand('copy');
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    } finally {
      document.body.removeChild(temp);
    }
  }

  function initApp() {
    const form = document.getElementById('converterForm');
    const input = document.getElementById('dropboxLink');
    const resultBox = document.getElementById('resultBox');
    const resultKicker = document.getElementById('resultKicker');
    const resultTitle = document.getElementById('resultTitle');
    const resultBadge = document.getElementById('resultBadge');
    const resultMessage = document.getElementById('resultMessage');
    const outputWrap = document.getElementById('outputWrap');
    const convertedLink = document.getElementById('convertedLink');
    const copyBtn = document.getElementById('copyBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const debugToggle = document.getElementById('debugToggle');
    const debugBox = document.getElementById('debugBox');

    function render(res) {
      const ui = getStatusUi(res.status);
      resultBox.hidden = false;
      resultBox.className = 'result ' + ui.className;
      resultKicker.textContent = ui.kicker;
      resultTitle.textContent = ui.title;
      resultBadge.textContent = ui.badge;
      resultBadge.className = 'badge ' + ui.className;
      resultMessage.textContent = res.message;

      if (res.output) {
        outputWrap.hidden = false;
        convertedLink.value = res.output;
      } else {
        outputWrap.hidden = true;
        convertedLink.value = '';
      }

      debugBox.hidden = !debugToggle.checked;
      debugBox.textContent = JSON.stringify(res.debug, null, 2);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      render(convertDropboxLink(input.value));
    });

    copyBtn.addEventListener('click', function () {
      const text = convertedLink.value;
      if (!text) return;

      const original = copyBtn.textContent;
      copyText(text)
        .then(function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = original; }, 1200);
        })
        .catch(function () {
          copyBtn.textContent = 'Copy failed';
          setTimeout(function () { copyBtn.textContent = original; }, 1600);
        });
    });

    pasteBtn.addEventListener('click', function () {
      if (!navigator.clipboard || !window.isSecureContext) {
        input.focus();
        return;
      }

      navigator.clipboard.readText()
        .then(function (text) {
          if (text) input.value = text.trim();
          input.focus();
        })
        .catch(function () {
          input.focus();
        });
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      resultBox.hidden = true;
      convertedLink.value = '';
      input.focus();
    });

    debugToggle.addEventListener('change', function () {
      if (resultBox.hidden) return;
      const res = convertDropboxLink(input.value);
      render(res);
    });
  }

  const api = {
    convertDropboxLink,
    parseUrlRobust,
    isDropboxHost,
    normaliseHost
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.DropboxDownloaderConverter = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
