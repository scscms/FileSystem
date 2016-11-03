/*
 早期插件，有些语法已经过时，仅供参考！
 https://github.com/summera/chromestore.js
 chromestore.js

 Takes an optional, initial fileSchema which it creates
 upon initialization.

 fileSchema  [{path: 'path string', callback: callback function},
 {path: 'path string', callback: callback function},
 {path: 'path string', callback: callback function}]

 */
var ChromeStore = (function(fileSchema) {
    fileSchema = typeof fileSchema !== 'undefined' ? fileSchema : [];
    var fs = null;

    function errorHandler(DOMError) {
        var msg = '';

        switch (DOMError.name) {
            case 'QuotaExceededError':
                msg = 'QuotaExceededError';
                break;
            case 'NotFoundError':
                msg = 'NotFoundError';
                break;
            case 'SecurityError':
                msg = 'SecurityError';
                break;
            case 'InvalidModificationError':
                msg = 'InvalidModificationError';
                break;
            case 'InvalidStateError':
                msg = 'InvalidStateError';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };
        console.log('Error: ' + msg);
    }

    return {

        /*
         Initialize chromestore
         Request persistent filesystem and amount of bytes
         Create initial fileSchema if there is one

         requestedBytes  [int]: requested size of storage in bytes
         callback        [function]: function to be executed when initialization is complete.
         passed reference to initialized chromestore.
         */
        init: function(requestedBytes, callback) {

            //Store this in that to be be used inside nested functions
            var that = this;

            function createFileSchema(schema){
                for (var key in schema){
                    if(schema.hasOwnProperty(key)){
                        var obj = schema[key];
                        if(obj['path']){
                            that.getDir(obj['path'], {create: true}, obj['callback']);
                        }
                    }
                }
            }

            function requestFS(grantedBytes) {
                window.webkitRequestFileSystem(window.PERSISTENT, grantedBytes, function(filesystem) {
                    fs = filesystem;
                    console.log ('fs: ', arguments); // I see this on Chrome 27 in Ubuntu
                    console.log("Granted Bytes: " + grantedBytes);
                    console.log("**********************************");

                    createFileSchema(fileSchema);

                    if(callback){callback(that);} //Execute callback

                }, errorHandler);
            }

            function getGranted(requestedBytes){
                navigator.webkitPersistentStorage.requestQuota (requestedBytes, function(grantedBytes) {
                    console.log("==================================");
                    console.log("PERSISTENT STORAGE");
                    console.log("==================================");
                    console.log("**********************************");
                    console.log ('requestQuota: ', arguments);

                    requestFS(grantedBytes, callback);

                }, errorHandler);
            }


            getGranted(requestedBytes);

        },

        /*
         Create/get directory or directories on filesystem.
         Recursively creates directories on passed in path.
         If directory already exists, one is not made.

         path        [string]: path of directories in which to create
         callback    [function]: function to be executed when directory has been created
         */
        getDir: function(path, flags, callback) {

            function recursiveCreate(path, callback, root){
                path = (typeof path === 'object' ? path : path.split('/'));
                var rootDir = root ? root : fs.root;

                // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
                if (path[0] == '.' || path[0] == '') {
                    path = path.slice(1);
                }

                rootDir.getDirectory(path[0], flags, function(dirEntry) {
                    // Recursively add the new subfolder (if we still have another to create).
                    if (path.length - 1) {
                        recursiveCreate(path.slice(1), callback, dirEntry);
                    }
                    else {
                        if(callback) callback(dirEntry);
                    }
                }, errorHandler);
            }

            recursiveCreate(path, callback);
        },

        /*
         Delete directory

         path        [string]: path to directory in which to delete
         callback    [function]: function to be executed when directory has been deleted
         */
        deleteDir: function(path, flags, callback){

            var flags = flags || {};
            if(flags.recursive === undefined) flags.recursive = false;

            var rootDir = fs.root;

            rootDir.getDirectory(path,{},function(dirEntry){
                if(flags.recursive){
                    dirEntry.removeRecursively(function(){

                        //call callback function if specified
                        if(callback) callback();
                    }, errorHandler);
                }
                else{
                    dirEntry.remove(function(){

                        //call callback function if specified
                        if(callback) callback();
                    }, errorHandler);
                }
            }, errorHandler);
        },

        /*
         Rename directory

         path        [string]: path to directory in which to rename
         newName     [string]: new name of directory
         callback    [function]: function to be executed when directory is renamed
         */
        renameDir: function(path, newName, callback) {
            var rootDir = fs.root;
            var pathArray = path.split('/');
            var pLength = pathArray.length;
            var pathToParent="";

            for(var i = 0; i<=pLength-2; i++){
                pathToParent = pathToParent+pathArray[i]+"/";
            }

            rootDir.getDirectory(pathToParent,{},function(parentDir){
                pathToParent = parentDir;
            },errorHandler);

            rootDir.getDirectory(path,{},function(dirEntry){
                dirEntry.moveTo(pathToParent,newName,function(newDir) {
                    console.log(path + ' Directory renamed.');

                    //call callback function if specified
                    if(callback) callback(newDir);
                }, errorHandler);
            }, errorHandler);
        },

        /*  
         Create/get file
         Directory in which file is created must exist before
         creating file

         path        [string]: path to new file
         create      [boolean]: true creates the file if it doesn't exist,
         exclusive   [boolean]: true will throw an error if file already exists, false will overwrite contents
         callback    [function]: function to be executed when file is created. passed the FileEntry object
         */
        getFile: function(path, flags, callback) {
            fs.root.getFile(path, flags, function(fileEntry) {
                if(callback) {callback(fileEntry);}
            }, errorHandler);
        },

        /*
         Delete file

         path [string]: path to file in wich to delete
         */
        deleteFile: function(path) {
            fs.root.getFile(path, {create: false}, function(fileEntry) {

                fileEntry.remove(function() {

                }, errorHandler);

            }, errorHandler);
        },

        /*
         Rename file

         path        [string]: path to file in which to rename
         newName     [string]: new name of file
         callback    [function]: function in which to execute when file is renamed.
         passed the FileEntry object
         */
        renameFile: function(path, newName, callback) {
            var rootDir = fs.root;
            var pathArray = path.split('/');
            var pLength = pathArray.length;
            var pathToParent= "";

            for(var i = 0; i<=pLength-2; i++){
                pathToParent = pathToParent+pathArray[i]+"/";
            }

            rootDir.getDirectory(pathToParent,{},function(parentDir){
                pathToParent = parentDir;
            },errorHandler);

            fs.root.getFile(path, {}, function(fileEntry){
                fileEntry.moveTo(pathToParent, newName,function(){
                    console.log('File renamed');

                    //call callback function if specified
                    if(callback) callback(fileEntry);
                }, errorHandler);
            }, errorHandler);
        },

        /*
         Return the number of used and remaining bytes in filesystem

         callback [function]: function to be executed when used and remaining bytes have been received
         from filesystem.  passed the number of used and remaining bytes
         */
        usedAndRemaining: function(callback) {
            navigator.webkitPersistentStorage.queryUsageAndQuota(function (used, remaining){
                if(callback){callback(used, remaining);}
            });
        },

        /*
         Create new FileWriter object and returns it to the caller
         */
        createWriter: function() {
            var fw = new FileWriter(fs);
            return fw;
        },

        /*
         Write to a file
         If file does not exist, createFlag must be set to True

         path        [string]: path of file in which to write / create
         fileType    [string]: type of file (eg. video/mp4, application/text)
         data        [string]: blob to be written to the file
         createFlag  [boolean]: create new file
         callback    [function]: function to be executed when data has been written

         */
        write: function(path, fileType, data, flags, callback) {
            var fw = this.createWriter();
            fw.writeData(path, fileType, data, flags, callback);
        },

        /*
         Create new DataReceiver object and returns it to the caller
         */
        createReceiver: function() {
            var receiver = new DataReceiver();
            return receiver;
        },

        /*
         Get data from a specified url
         Returns a function with 'data' parameter

         url         [string]: URL path of the file to be downloaded
         callback    [function]: function to be executed when file has finished downloading
         */
        getData: function(url, callback) {
            var receiver = this.createReceiver();
            receiver.getData(url, callback);
        },

        /*
         Get data from a URL and store it in local persistent storage
         Calls getData and write in sequence

         url         [string]: URL path of the file to be downloaded
         path        [string]: path of file in which to write / create
         fileType    [string]: type of file (eg. video/mp4, application/text)
         createFlag  [boolean]: create new file
         callback    [function]: function to be executed when file has been written
         */
        getAndWrite: function(url, path, fileType, flags, callback) {
            var that = this;
            this.getData(url, function(data){
                that.write(path, fileType, data, flags, callback)
            });
        },

        /*
         Delete all files and directories that already exists in local persistent storage
         */
        purge: function() {
            var dirReader = fs.root.createReader();
            dirReader.readEntries(function(entries) {
                for (var i = 0, entry; entry = entries[i]; ++i) {
                    if (entry.isDirectory) {
                        entry.removeRecursively(function() {}, errorHandler);
                    } else {
                        entry.remove(function() {}, errorHandler);
                    }
                }
                console.log('Local storage emptied.');
            }, errorHandler);
        },

        /*
         List all files that exists in the specified path.
         Outputs an array of objects

         path        [string]: path to be listed, defaults to root when not specified
         callback    [function]: function to be executed when file has been written
         */
        ls: function(path,callback) {
            var dirReader;
            var arr = [];
            var rootDir = fs.root;
            var pathArray = path.split('/');
            var pLength = pathArray.length;
            var pathToParent= "";

            for(var i = 0; i<=pLength-1; i++){
                pathToParent = pathToParent+pathArray[i]+"/";
            }

            rootDir.getDirectory(pathToParent,{},function(parentDir){
                pathToParent = parentDir;
                dirReader = (pathToParent) ? pathToParent.createReader() : fs.root.createReader();
                dirReader.readEntries(function(entries) {
                    if (!entries.length) {
                        console.log('Filesystem is empty.');
                    }

                    for (var i = 0, entry; entry = entries[i]; ++i) {
                        arr.push({
                            name: entry.name,
                            fileEntry: entry.filesystem
                        });
                    }

                    if(callback) callback(arr);
                }, errorHandler);
            },errorHandler);
        }

    };

});

/*
 FileWriter Object
 method: writeData
 */
var FileWriter = (function(filesystem) {
    var fs = filesystem;
    function errorHandler(DOMError) {
        var msg = '';

        switch (DOMError.name) {
            case 'QuotaExceededError':
                msg = 'QuotaExceededError';
                break;
            case 'NotFoundError':
                msg = 'NotFoundError';
                break;
            case 'SecurityError':
                msg = 'SecurityError';
                break;
            case 'InvalidModificationError':
                msg = 'InvalidModificationError';
                break;
            case 'InvalidStateError':
                msg = 'InvalidStateError';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };
        console.log('Error: ' + msg);
    }

    return {
        /*
         Write data to a file
         If file does not exist, createFlag must be set to True
         If file already exists and createFlag is set to True, its content will be overwritten

         path        [string]: path of file in which to write / create
         fileType    [string]: type of file (eg. video/mp4, application/text)
         data        [string]: blob to be written to the file
         createFlag  [boolean]: create new file
         callback    [function]: function to be executed when data has been written
         */
        writeData: function(path, fileType, data, flags, callback){
            fs.root.getFile(path, flags, function(fileEntry) {

                // Create a FileWriter object for our FileEntry (log.txt).
                fileEntry.createWriter(function(fileWriter) {

                    fileWriter.onwriteend = function(e) {
                        console.log('Write completed.');
                        if(callback) {callback(fileEntry);}
                    };

                    fileWriter.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                    };

                    // Create a new Blob and write it to log.txt.
                    var blob = new Blob([data], {type: fileType});

                    fileWriter.write(blob);

                }, errorHandler);

            }, errorHandler);
        }
    }
});

/*
 DataReceiver object
 Method: getData
 */
var DataReceiver = (function() {

    return {

        /*
         Get data from a specified url
         Returns a function with 'data' parameter

         url         [string]: URL path of the file to be downloaded
         callback    [function]: function to be executed when file has finished downloading
         */
        getData: function(url, callback){
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = "arraybuffer";

            xhr.onload = function(e) {
                if(this.status == 200) {
                    callback(this.response);
                }
            }

            xhr.send();
        }
    }

});