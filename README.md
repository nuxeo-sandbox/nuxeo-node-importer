# nuxeo-node-importer

Command line tool to import a local folder to a Nuxeo Platform instance.

## Installation

    $ npm install -g troger/nuxeo-node-importer

This module is not yet published on npm.

## Usage

    $ nuxeo-importer [options] local-path remote-path

Recursively import the files and directories of `local-path` to the `remote-path` on a Nuxeo Platform instance.
For each directory, it creates a document of type `Folder`.
For each file, it uses the `FileManager.Import` operation to create the corresponding document.


Options are:

- `--baseURL`: the base URL of the Nuxeo Platform instance
- `--username`: the username to use to connect to the server
- `--password`: the password to use to connect to the server
