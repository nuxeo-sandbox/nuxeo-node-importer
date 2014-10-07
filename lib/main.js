var nuxeo = require('nuxeo'),
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
    createFile(client, localPath, config.remotePath, function(err, data) {
      if (err) {
        console.error("Error while creating file: " + absPath);
        console.error(err);
        return;
      }
      console.log("Created remote file: " + data.path)
    })
    return;
  }

  // walk the whole directory tree
  var walk = function(localPath, remotePath) {
    fs.readdir(localPath, function(err, files) {
      files.forEach(function(file) {
        var absPath = path.join(localPath, file);
        if (fs.statSync(absPath).isDirectory()) {
          createFolder(absPath, remotePath, createFolderCallback)
        } else {
          createDocumentFromFile(absPath, remotePath, createDocumentCallback)
        }
      })
    })
  };
  walk(localPath, config.remotePath);

  var createDocumentFromFile = function(file, remotePath, callback) {
    var operation = client.operation("FileManager.Import")
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
      console.error("Error while creating file: " + file);
      console.error(err);
      return;
    }
    console.log("Created remote file: " + data.path);
  }

  var createFolder = function(dir, remotePath, callback) {
    client.document(remotePath)
      .create({
        type: 'Folder',
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
      console.error("Error while creating folder: " + dir);
      console.error(err);
      return;
    }
    console.log("Created remote directory: " + data.path);

    walk(dir, data.path);
  }
};

// exports.import({baseURL: "http://localhost:8080/nuxeo", username: "Administrator", password: "Administrator",localPath: "node_modules", remotePath: "/default-domain/workspaces/ws/"});
