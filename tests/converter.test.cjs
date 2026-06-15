const assert = require('node:assert/strict');
const { convertDropboxLink, isDropboxHost } = require('../assets/app.js');

const cases = [
  {
    name: 'modern Dropbox APK link keeps only rlkey and swaps host',
    input: 'https://www.dropbox.com/scl/fi/pb82uozxt9witiq2njybf/example.apk?rlkey=idba0011ck5r6gfdgfqijf7ty43g&st=randomkey&dl=0',
    status: 'converted',
    output: 'https://dl.dropboxusercontent.com/scl/fi/pb82uozxt9witiq2njybf/example.apk?rlkey=idba0011ck5r6gfdgfqijf7ty43g'
  },
  {
    name: 'modern link without scheme is accepted',
    input: 'www.dropbox.com/scl/fi/abc/example.apk?rlkey=KEY123&st=RANDOM&dl=0',
    status: 'converted',
    output: 'https://dl.dropboxusercontent.com/scl/fi/abc/example.apk?rlkey=KEY123'
  },
  {
    name: 'modern link with query parameters in different order keeps rlkey only',
    input: 'https://dropbox.com/scl/fi/abc/example.apk?dl=0&rlkey=KEY123&st=RANDOM&utm_source=share',
    status: 'converted',
    output: 'https://dl.dropboxusercontent.com/scl/fi/abc/example.apk?rlkey=KEY123'
  },
  {
    name: 'old style dl=0 link becomes dl=1',
    input: 'https://www.dropbox.com/s/abc/example.apk?dl=0',
    status: 'converted',
    output: 'https://www.dropbox.com/s/abc/example.apk?dl=1'
  },
  {
    name: 'already direct dropboxusercontent link is ready',
    input: 'https://dl.dropboxusercontent.com/scl/fi/abc/example.apk?rlkey=KEY123',
    status: 'already_modified',
    output: 'https://dl.dropboxusercontent.com/scl/fi/abc/example.apk?rlkey=KEY123'
  },
  {
    name: 'fake dropbox-looking hostname is rejected',
    input: 'https://evil-dropbox.com/scl/fi/abc/example.apk?rlkey=KEY123&dl=0',
    status: 'not_dropbox',
    output: ''
  },
  {
    name: 'empty input is invalid',
    input: '   ',
    status: 'invalid',
    output: ''
  },
  {
    name: 'Dropbox link with no matching conversion rule is no_change',
    input: 'https://www.dropbox.com/home/example.apk',
    status: 'no_change',
    output: ''
  }
];

for (const item of cases) {
  const actual = convertDropboxLink(item.input);
  assert.equal(actual.status, item.status, item.name + ' status');
  assert.equal(actual.output, item.output, item.name + ' output');
}

assert.equal(isDropboxHost('dropbox.com'), true);
assert.equal(isDropboxHost('www.dropbox.com'), true);
assert.equal(isDropboxHost('dl.dropboxusercontent.com'), true);
assert.equal(isDropboxHost('evil-dropbox.com'), false);
assert.equal(isDropboxHost('dropbox.com.evil.example'), false);

console.log('All converter tests passed.');
