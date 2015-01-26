var nuxeo = require('nuxeo'),
  async = require('async'),
  path = require('path'),
  fs = require('fs'),
  rest = require('restler');

exports.import = function(config) {
  var client = new nuxeo.Client({
    baseURL: config.baseURL,
    username: config.username,
    password: config.password,
    timeout: config.timeout
  });

  var localPath = config.localPath;
  // TODO replace with path.isAbsolute() when switching to node 0.11.x
  if (localPath[0] !== '/') {
    localPath = path.join(process.cwd(), localPath);
  }

  // functions to create documents from files
  var createDocumentFromFile = function(file, remotePath, callback) {
    var operation = client.operation(config.chainId)
      .context({
        currentDocument: remotePath
      })
      .input(rest.file(file, null, fs.statSync(file).size, null, null));

    operation.execute(function(err, data, response) {
      if (err) {
        callback(err, file, null);
      } else {
        callback(null, file, data);
      }
    })
  };

  // functions to create folders
  var createFolder = function(dir, remotePath, callback) {
    client.document(remotePath)
      .create({
        type: config.folderishType,
        name: path.basename(dir),
        properties: {
          "dc:title": path.basename(dir)
        }
      }, function(err, folder) {
        if (err) {
          callback(err, dir, null);
        } else {
          callback(null, dir, folder);
        }
      });
  };

  var documentCreatedCallback = function(file, doc, callback) {
    if (config.verbose) {
      console.log('Created document: ' + doc.path);
    }

    callback(null, file, doc);
  };

  // for the final report
  var filesCount = 0,
    foldersCount = 0,
    filesCreated = 0,
    foldersCreated = 0,
    filesNotWellProcessed = [],
    foldersNotWellProcessed = [];

  // our queue to process requests
  var queue = async.queue(function(task, queueCallback) {
    if (config.verbose) {
      console.log('Started task for: ' + task.absPath);
    }

    var isDirectory = fs.statSync(task.absPath).isDirectory();
    var funcs = [];
    if (isDirectory) {
      funcs.push(createFolder.bind(this, task.absPath, task.remotePath));
      foldersCount++;
    } else {
      funcs.push(createDocumentFromFile.bind(this, task.absPath, task.remotePath));
      filesCount++;
    }
    funcs = funcs.concat([
      documentCreatedCallback
    ]);

    async.waterfall(funcs, function(err, localFile, doc) {
      if (err) {
        if (isDirectory) {
          foldersNotWellProcessed.push({
            path: task.absPath,
            err: err
          });
        } else {
          filesNotWellProcessed.push({
            path: task.absPath,
            err: err
          });
        }

        if (config.verbose) {
          console.log('Taks in error for: ' + task.absPath);
        }
        queueCallback(); // next task
        return;
      }

      if (config.verbose) {
        console.log('Finished task for: ' + task.absPath);
      }

      queueCallback();
      if (isDirectory) {
        foldersCreated++;
        walk(task.absPath, doc.path);
      } else {
        filesCreated++;
      }
    });
  }, config.maxConcurrentRequests);

  // walk the whole directory tree
  var walk = function(localPath, remotePath) {
    if (fs.statSync(localPath).isFile()) {
      queue.push({
        absPath: localPath,
        remotePath: remotePath
      });
    } else {
      fs.readdir(localPath, function(err, files) {
        files.forEach(function(file) {
          var absPath = path.join(localPath, file);
          queue.push({
            absPath: absPath,
            remotePath: remotePath
          });
        });
      });
    }
  };

  var start = new Date();

  client.connect(function(err, client) {
    if (err) {
      // cannot connect
      throw err;
    }
    walk(localPath, config.remotePath);

    process.on('exit', function() {
      var end = new Date();

      console.log('');
      console.log('Report Summary');
      console.log('--------------');
      console.log('  Total documents processed   ' + (foldersCreated + filesCreated) + '/' + (foldersCount + filesCount));
      console.log('    Files processed           ' + filesCreated + '/' + filesCount);
      console.log('    Folders processed         ' + foldersCreated + '/' + foldersCount);
      console.log('  Total time                  ' + (end - start) + 'ms');
      console.log('  Average time per document   ' + ((end - start) / (foldersCreated + filesCreated)).toFixed(2) + 'ms');
      console.log('');
      if (filesNotWellProcessed.length > 0) {
        console.log('Files not well processed');
        console.log('------------------------');
        filesNotWellProcessed.forEach(function(file) {
          console.log(file.path);
          console.log('  Reason: ' + file.err.message);
          if (config.verbose) {
            console.log('  Error');
            console.log(JSON.stringify(file.err, null, 2));
          }
          console.log('');
        });
      }
      if (foldersNotWellProcessed.length > 0) {
        console.log('Folders not well processed');
        console.log('--------------------------');
        foldersNotWellProcessed.forEach(function(folder) {
          console.log(folder.path);
          console.log('  Reason: ' + folder.err.message);
          if (config.verbose) {
            console.log('  Error');
            console.log('  ' + JSON.stringify(folder.err, null, 2));
          }
          console.log('');
        });
      }
      console.log('');
    });
  });
};
