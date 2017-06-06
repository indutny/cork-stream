'use strict';

const util = require('util');
const Duplex = require('stream').Duplex;

function CorkStream(socket) {
  Duplex.call(this);

  this._corked = false;
  this.socket = socket;

  this.socket.on('error', err => this.emit('error', err));
  this.socket.once('end', () => this.push(null));

  this.once('finish', () => this.socket.end());
}
util.inherits(CorkStream, Duplex);
module.exports = CorkStream;

function uncork(stream) {
  stream._corked = false;
  stream.socket.uncork();
}

CorkStream.prototype._write = function _write(data, enc, callback) {
  if (!this._corked) {
    this._corked = true;
    this.socket.cork();
    process.nextTick(uncork, this);
  }

  this.socket.write(data, enc, callback);
};

CorkStream.prototype._read = function _read() {
  const chunk = this.socket.read();
  if (chunk)
    return this.push(chunk);

  this.socket.once('readable', () => {
    this._read();
  });
};
