'use strict';

const util = require('util');
const Duplex = require('stream').Duplex;

function CorkStream(socket, options) {
  Duplex.call(this);

  this.options = Object.assign({}, options);

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

    // Custom cork
    if (this.options.cork)
      this.options.cork(this.socket);
    else
      this.socket.cork();

    // Custom uncork
    if (this.options.uncork)
      this.options.uncork(this.socket, () => { this._corked = false; });
    else
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
