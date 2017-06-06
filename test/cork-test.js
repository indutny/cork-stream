'use strict';
/* global describe it */

const assert = require('assert');
const PassThrough = require('stream').PassThrough;

const CorkStream = require('../');

describe('cork-stream', () => {
  it('should propagate reads', (cb) => {
    const fake = new PassThrough();

    const cork = new CorkStream(fake);

    let chunks = '';
    cork.on('data', chunk => chunks += chunk);
    cork.once('end', () => {
      assert.equal(chunks, 'hello world!');
      cb();
    });

    fake.write('hello');
    fake.write(' ');
    setImmediate(() => {
      fake.write('world');
      fake.end('!');
    });
  });

  it('should propagate writes', (cb) => {
    const fake = new PassThrough();

    const cork = new CorkStream(fake);

    cork.write('hello');
    cork.write(' ');
    setImmediate(() => {
      cork.write('world');
      cork.end('!');
    });

    let chunks = '';
    fake.on('data', chunk => chunks += chunk);
    fake.once('end', () => {
      assert.equal(chunks, 'hello world!');
      cb();
    });
  });

  it('should propagate errors', (cb) => {
    const fake = new PassThrough();

    const cork = new CorkStream(fake);

    cork.once('error', (err) => {
      assert(err);
      cb();
    });

    fake.emit('error', new Error('ohai'));
  });

  it('should cork/uncork', (cb) => {
    const log = [];
    const fake = {
      on: () => {},
      once: () => {},

      cork: () => log.push('cork'),
      uncork: () => log.push('uncork'),
      write: data => log.push(data.toString()),
      end: () => {
        log.push('end');

        assert.deepEqual(log, [
          'cork',
          'hello',
          ' ',
          'uncork',
          'cork',
          'world',
          '!',
          'uncork',
          'end'
        ]);
        cb();
      }
    };

    const cork = new CorkStream(fake);

    cork.write('hello');
    cork.write(' ');
    setImmediate(() => {
      cork.write('world');
      cork.end('!');
    });
  });
});
