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

- `--baseURL`: the base URL of the Nuxeo Platform instance. Default to `http://localhost:8080/nuxeo`.
- `--username`: the username to use to connect to the server. Default to `Administrator`.
- `--password`: the password to use to connect to the server. Default to `Administrator`.
- `--chainId`: operation chain to use when creating files. Default to `FileManager.Import`.
- `--folderishType`: document type to use when creating folders. Default to `Folder`.
- `--verbose`: verbose output, print configuration and more logs Default to `false`.
