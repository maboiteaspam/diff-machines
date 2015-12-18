# diff-machines

diff files between machines over ssh.

## Install

    npm i diff-machines -g

## Usage

`diff-machines` is a binary to install globally.

```ssh

  diff files between machines over ssh.

  Usage
     diff-machines [hostA] [hostB] [files or services...]
     diff-machines [opts] -- [hostA] [hostB] [files or services...]

  Options
     -v    verbose
     -h    show help

 Examples
     diff-machines user@hostA:port user@hostB:port php .bashrc
     diff-machines -v -- vagrant@loalhost:2222 vagrant@loalhost:2222 php .bashrc
     diff-machines -h
```

It will diff the service `php` and the file `.bashrc` between `hostA` and `hostB`.

The result is sent to `stdout` and produce unified patch with support of `jsdiff`

```sh
# node bin.js vagrant vagrant php .bashrc


Index: /etc/php.ini
===================================================================
--- /etc/php.ini
+++ /etc/php.ini



Index: .bashrc
===================================================================
--- .bashrc
+++ .bashrc

```

## Configuration

`diff-machines` can read a configuration file located on `cwd`.

This file is an exported `function()` which returns an `object`.

This configuration object can configure ssh `hosts` and `services` by name.

`service` are functions resolver which receives an `sshConn` of `ssh2-utils`
and invoke `call(err, filePath)`.

`filePath` is the location of the file identified for the given `service`.

__configuration__

```js
{
    host1:{},
    host2:{},
    services:{
        service1: function (sshConn, done){ done(err, filePath); },
        service2: function (sshConn, done){ done(err, filePath); }
    },
}
```

In this example,
`php` ini file is resolved with the help of the `php` binary itself. Cross-distro.

`notFound`, demonstrate that passing anything into `err` will effectively stop the program.

__diff-svc.js__

```js

var SSH2  = require('ssh2-utils')

module.exports = function () {
  var ssh = new SSH2();
  return {
    'vagrant': {
      'host':'127.0.0.1',
      port: 2222,
      username: 'vagrant',
      password: 'vagrant'
    },
    'services': {
      'php': function (conn, done) {
        ssh.exec(conn, 'php -r "echo php_ini_loaded_file();"', function (err, stdout, stderr) {
          done(err, stdout)
        })
      },
      'notFound': function (conn, done) {
        done(false)
      }
    }
  }
};

```

## Re-usable services

It s possible to pass in not `service` name of the `local` config object, rather than,
`module` names.


So if one would export the `php` service to a module name `php-ini`, that would look like,

__index.js__

```js

var SSH2  = require('ssh2-utils')
var ssh = new SSH2();

module.exports = function (conn, done) {
    ssh.exec(conn, 'php -r "echo php_ini_loaded_file();"', function (err, stdout, stderr) {
        done(err, stdout)
    });
}

```


It would then be possible to invoke `diff-machines` in such fashion

```bash

diff-machines -v -- vagrant@loalhost:2222 vagrant@loalhost:2222 php-ini .bashrc

```

Obviously you d need to `npm i php-ini --save` before that.
Thus lock the remote dependency into a package json of your projects.


## More

- https://github.com/kpdecker/jsdiff
- https://github.com/sindresorhus/multiline
- https://github.com/mscdex/ssh2/
- https://github.com/maboiteaspam/ssh2-utils
- https://github.com/maboiteaspam/diff-machines/blob/master/diff-svc.js


## ssh & vagrant

__~/.ssh/config__

```
Host localhost
  HostName 127.0.0.1
  Port 2222
  StrictHostKeyChecking no
```

- http://serverfault.com/questions/6233/how-to-remove-strict-rsa-key-checking-in-ssh-and-whats-the-problem-here
