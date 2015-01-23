# nuxeo-node-importer

Command line tool to import a local folder to a Nuxeo Platform instance.

## Installation

    $ npm install -g troger/nuxeo-node-importer

This module is not yet published on npm.

## Usage

    $ nuxeo-importer [options] local-path remote-path

Recursively import the files and directories of `local-path` to the `remote-path` on a Nuxeo Platform instance.

Default behavior:
- for each directory, it creates a document of type `Folder`.
- for each file, it uses the `FileManager.Import` operation to create the corresponding document.


Options are:

- `-b --baseURL`: the base URL of the Nuxeo Platform instance. Default to `http://localhost:8080/nuxeo`.
- `-u, --username`: the username to use to connect to the server. Default to `Administrator`.
- `-p, --password`: the password to use to connect to the server. Default to `Administrator`.
- `-c, --chainId`: operation chain to use when creating files. Default to `FileManager.Import`.
- `-f, --folderishType`: document type to use when creating folders. Default to `Folder`.
- `-m, --maxConcurrentRequests`: Maximum number of concurrent requests. Default to 5.
- `-t, --timeout`: Timeout in ms. Default to 30000.
- `-v, --verbose`: verbose output, print configuration and more logs Default to `false`.
