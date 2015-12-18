# diff-machines

diff files between machines over ssh.

## Install

    npm i diff-machines -g

## Usage

`diff-machines` is a binary to install globally.

```js
diff-machines [hostA] [hostB] [files or services...]
diff-machines [opts] -- [hostA] [hostB] [files or services...]

diff-machines user@hostA:port user@hostB:port php .bashrc

diff-machines -v -- vagrant@loalhost:2222 vagrant@loalhost:2222 php .bashrc

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

```json
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

## More

- https://github.com/kpdecker/jsdiff
- https://github.com/sindresorhus/multiline
- https://github.com/maboiteaspam/ssh2-utils


## ssh & vagrant

__~/.ssh/config__

```
Host localhost
  HostName 127.0.0.1
  Port 2222
  StrictHostKeyChecking no
```

- http://serverfault.com/questions/6233/how-to-remove-strict-rsa-key-checking-in-ssh-and-whats-the-problem-here
