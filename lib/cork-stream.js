'use strict';

const util = require('util');
const Duplex = require('stream').Duplex;

function CorkStream(socket) {
  Duplex.call(this);

  this._corked = false;
  this.socket = socket;

  this.socket.on('error', err => this.emit('error', err));
  this.socket.once('end', () => this.push(null));
  this.socket.on('close', () => this.emit('close'));
  this.socket.on('timeout', () => this.emit('timeout'));

  this.once('finish', () => {
    if (!this.socket.destroyed)
      this.socket.end();
  });
}
util.inherits(CorkStream, Duplex);
module.exports = CorkStream;

function uncork(stream) {
  if (stream.socket.destroyed)
    return;

  stream._corked = false;
  stream.socket.uncork();
}

CorkStream.prototype._write = function _write(data, enc, callback) {
  if (!this._corked) {
    this._corked = true;
    this.socket.cork();
    process.nextTick(uncork, this);
  }

  if (this.socket.write(data, enc) !== false)
    return callback(null);

  this.socket.once('drain', () => callback(null));
};

CorkStream.prototype._read = function _read() {
  const chunk = this.socket.read();
  if (chunk)
    return this.push(chunk);

  this.socket.once('readable', () => {
    this._read();
  });
};
