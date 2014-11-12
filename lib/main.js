var nuxeo = require('nuxeo'),
  async = require('async'),
  path = require('path'),
  fs = require('fs'),
  rest = require('restler');

exports.import = function(config) {
  var client = new nuxeo.Client({
    baseURL: config.baseURL,
    username: config.username,
    password: config.password
  });

  var localPath = config.localPath;
  // TODO replace with path.isAbsolute() when switching to node 0.11.x
  if (localPath[0] !== '/') {
    localPath = path.join(process.cwd(), localPath);
  }

  if (fs.statSync(localPath).isFile()) {
    createDocumentFromFile(localPath, config.remotePath, createDocumentCallback);
    return;
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
  }

  var createDocumentCallback = function(err, file, data) {
    if (err) {
      console.error('Error while creating file: ' + file);
      console.error(err);
      return;
    }

    if (config.verbose) {
      console.log('Created remote file: ' + data.path);
    }
  }

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
  }

  var createFolderCallback = function(err, dir, data) {
    if (err) {
      console.error('Error while creating folder: ' + dir);
      console.error(err);
      return;
    }

    if (config.verbose) {
      console.log('Created remote directory: ' + data.path);
    }
    walk(dir, data.path);
  }

  // our queue to process requests
  var queue = async.queue(function(task, asyncCallback) {
    if (config.verbose) {
      console.log('Started task for: ' + task.absPath);
    }
    if (fs.statSync(task.absPath).isDirectory()) {
      createFolder(task.absPath, task.remotePath, function(err, dir, data) {
        createFolderCallback(err, dir, data);
        if (config.verbose) {
          console.log('Finished task for: ' + task.absPath);
        }
        asyncCallback();
      });
    } else {
      createDocumentFromFile(task.absPath, task.remotePath, function(err, file, data) {
        createDocumentCallback(err, file, data);
        if (config.verbose) {
          console.log('Finished task for: ' + task.absPath);
        }
        asyncCallback();
      });
    }
  }, config.maxConcurrentRequests);

  // walk the whole directory tree
  var walk = function(localPath, remotePath) {
    fs.readdir(localPath, function(err, files) {
      files.forEach(function(file) {
        var absPath = path.join(localPath, file);
        queue.push({ absPath: absPath, remotePath: remotePath })
      })
    })
  };
  walk(localPath, config.remotePath);

};
