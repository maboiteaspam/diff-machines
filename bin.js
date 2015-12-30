#!/usr/bin/env node

function usage () {/*

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
 */}

var pkg     = require('./package.json')
var argv    = require('minimist')(process.argv.slice(2));
var debug   = require('@maboiteaspam/set-verbosity')(pkg.name, process.argv);
var help    = require('@maboiteaspam/show-help')(usage, process.argv, pkg);
var fs      = require('fs')
var async   = require('async')
var SSH2    = require('ssh2-utils')
var jsdiff  = require('diff');
var hParse  = require('@maboiteaspam/ssh-host-parse');

var rawArgs = argv['_'];
debug('rawArgs %j', rawArgs);
(!rawArgs || rawArgs.length<3) && help.print(usage, pkg) && help.die("Missing hosts");

var hostLeft = {
  'host':'127.0.0.1',
  port: 22,
  username: '',
  password: ''
};
var hostRight = {
  'host':'127.0.0.1',
  port: 22,
  username: '',
  password: ''
};
var todo = {}

var config = {}
if (fs.existsSync('./diff-svc.js')) {
  config = require('./diff-svc.js')(argv)
}



var machineLeft = rawArgs.shift();
var machineRight = rawArgs.shift();

if (machineLeft in config) hostLeft = config[machineLeft];
else hostLeft = hParse(machineLeft) || help.die('Invalid address for '+machineLeft);

if (machineRight in config) hostRight = config[machineRight];
else hostRight = hParse(machineRight) || help.die('Invalid address for '+machineRight);

rawArgs.forEach(function (service) {
  if (service in config.services)
    todo[service] = config.services[service]
  else {
    try{
      todo[service] = require(service)
    }catch(ex){
      todo[service] = function (sshConn, done) {
        done(null, service)
      }
    }
  }
});

debug('hostLeft %j', hostLeft);
debug('hostRight %j', hostRight);


var connLeft;
var connRight;

var ssh = new SSH2();


async.parallel([
  function (next) {
    ssh.getConnReady(hostLeft, function (err, conn) {
      if (err) throw err;
      connLeft = conn;
      next(err)
    })
  },
  function (next) {
    ssh.getConnReady(hostRight, function (err, conn) {
      if (err) throw err;
      connRight = conn;
      next(err)
    })
  }
], function connReady () {

  debug('connections acquired')

  var collectedFiles = {}
  var collectFiles = []
  Object.keys(todo).forEach(function(service) {
    collectedFiles[service] = {left:null, right: null, leftcontent: null, rightContent: null, diff: null}
    collectFiles.push(function(next){
      todo[service](connLeft, function (err, file) {
        debug('left %s %s', service, file)
        collectedFiles[service].left = file
        next(err)
      })
    })
    collectFiles.push(function(next){
      todo[service](connRight, function (err, file) {
        debug('right %s %s', service, file)
        collectedFiles[service].right = file
        next(err)
      })
    })
  })
  async.parallel(collectFiles, function filesCollected(err) {
    if (err) throw err;

    var collectContents = []
    Object.keys(collectedFiles).forEach(function (service) {
      var leftFile  = collectedFiles[service].left;
      var rightFile = collectedFiles[service].right;

      collectContents.push(function (next) {
        ssh.readFile(connLeft, leftFile, function (err, content) {
          debug('left %s %s', service, content)
          collectedFiles[service].leftContent = content
          next(err?"File not found "+leftFile:null)
        })
      })
      collectContents.push(function (next) {
        ssh.readFile(connRight, rightFile, function (err, content) {
          debug('right %s %s', service, content)
          collectedFiles[service].rightContent = content
          next(err?"File not found "+rightFile:null)
        })
      })
    })

    async.parallel(collectContents, function gotFilesContent(err) {
      if (err) throw err;

      connLeft.end()
      connRight.end()
      Object.keys(collectedFiles).forEach(function (service) {
        var leftFile      = collectedFiles[service].left;
        var rightFile     = collectedFiles[service].right;
        var leftContent   = collectedFiles[service].leftContent;
        var rightContent  = collectedFiles[service].rightContent;

        collectedFiles[service].diff = jsdiff.createTwoFilesPatch(leftFile, rightFile, leftContent, rightContent, '', '')

        debug('diff %j', collectedFiles[service].diff)

        console.log('')
        console.log('')
        console.log(collectedFiles[service].diff)
      })
    })
  })
});
