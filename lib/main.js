var Nuxeo = require('nuxeo'),
  Queue = require('promise-queue'),
  path = require('path'),
  fs = require('fs');

exports.import = function(config) {
  var nuxeo = new Nuxeo({
    baseURL: config.baseURL,
    auth: {
      method: 'basic',
      username: config.username,
      password: config.password
    },
    timeout: config.timeout
  });

  var localPath = config.localPath;
  if (!path.isAbsolute(localPath)) {
    localPath = path.join(process.cwd(), localPath);
  }

  // functions to create documents from files
  function createDocumentFromFile(file, remotePath) {
    var stats = fs.statSync(file);
    var blob = new Nuxeo.Blob({
      content: fs.createReadStream(file),
      name: path.basename(file),
      size: stats.size
    })
    return nuxeo.operation(config.chainId)
      .context({
        currentDocument: remotePath
      })
      .input(blob)
      .execute()
      .then((doc) => {
        if (config.verbose) {
          console.log('Created document: ' + doc.path);
        }
        filesCreated++;
      }).catch((error) => {
        if (config.verbose) {
          console.log('Task in error for: ' + file);
        }
        filesNotWellProcessed.push({ path: file, err: error });
      });
  };

  // functions to create folders
  function createFolder(dir, remotePath) {
    var folder = {
      'entity-type': 'document',
      type: config.folderishType,
      name: path.basename(dir),
      properties: {
        "dc:title": path.basename(dir)
      }
    }
    return nuxeo.repository()
      .create(remotePath, folder)
      .then((doc) => {
        if (config.verbose) {
          console.log('Created folder: ' + doc.path);
        }
        foldersCreated++;
        walk(dir, doc.path);
      }).catch((error) => {
        if (config.verbose) {
          console.log('Taks in error for: ' + dir);
        }
        foldersNotWellProcessed.push({ path: dir, err: error });
      });
  };

  function createDocument(opts) {
    if (config.verbose) {
      console.log('Started task for: ' + opts.absPath);
    }

    var isDirectory = fs.statSync(opts.absPath).isDirectory();
    if (isDirectory) {
      foldersCount++;
      return createFolder(opts.absPath, opts.remotePath);
    } else {
      filesCount++;
      return createDocumentFromFile(opts.absPath, opts.remotePath);
    }
  }

  // for the final report
  var filesCount = 0,
    foldersCount = 0,
    filesCreated = 0,
    foldersCreated = 0,
    filesNotWellProcessed = [],
    foldersNotWellProcessed = [];

  var queue = new Queue(config.maxConcurrentRequests, Infinity);

  // walk the whole directory tree
  function walk(localPath, remotePath) {
    if (fs.statSync(localPath).isFile()) {
      queue.add(createDocument.bind(this, {
        absPath: localPath,
        remotePath: remotePath
      }));
    } else {
      fs.readdir(localPath, function(err, files) {
        files.forEach(function(file) {
          var absPath = path.join(localPath, file);
          queue.add(createDocument.bind(this, {
            absPath: absPath,
            remotePath: remotePath
          }));
        });
      });
    }
  };

  var start = new Date();
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
};
