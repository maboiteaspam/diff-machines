
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
      'nodejs': function (conn, done) {
        done(false)
      }
    }
  }
};
