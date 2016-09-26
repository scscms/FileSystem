# FileSystem<sup>shine</sup>
### 1、简介
FileSystem提供了文件夹和文件的创建、移动、删除等操作，大大方便了数据的本地处理，而且所有的数据都是在沙盒(sandboxed)中，不同的web程序不能互相访问，这就保证了数据的完整和安全。<br/>
目前只有Chrome浏览器对FileSystem API支持，所以只能运行在Chrome浏览器中。<br/>
应用场景：

- [x] 1.持久型上传器

>选中要上传的文件或目录后，系统会将文件复制到本地沙盒并批次上传。即使发生浏览器崩溃、网络中断等状况，也可在之后重新开始上传。

- [x] 2.视频游戏、音乐或其他具有大量媒体资产的应用

>预先下载文件，需要用时无需等待。

- [x] 3.可使用离线访问权限或本地存储的高速音频/照片编辑器

>通过创建目录来整理项目文件这一功能非常有用。
>修改后的文件应可供客户端应用 \[iTunes、Picasa] 访问。

- [x] 4.离线web存储<br/>
>下载网络文件本地存储，区别其他本地文件存储的是，本存储可管理。本地文件可通过二进制地址或者filesystem:协议访问，形成本地web网站。这正是我使用的功能。

### 2、申请空间
>如果开发功能开放给用户使用建议申请临时空间存储，如果自己使用可申请永久存储空间。因为申请永远存储需要用户同意才能执行。

```JavaScript
//文件系统请求标识window.webkitRequestFileSystem用于兼容旧版chrome
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
//接着向浏览器申请空间
window.requestFileSystem(window.TEMPORARY, //PERSISTENT(永久) or TEMPORARY(临时)
    1024*1024, //1M
    initialize, //成功后的回调函数
    errorHandler); //错误后的回调函数
```
但是我们不希望每次访问网页都去申请空间，可以先判断是否申请过空间来处理。完整代码：
```JavaScript
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
var fileSystemObj = {
    fs          : null,//文件系统对象
    size        : 52428800,//申请50M临时空间 50*1024*1024
    errorHandler:function(e){
        //处理各种错误
        switch (e.name) {
            case 'QuotaExceededError':
                break;
            case 'NotFoundError':
                break;
            case 'SecurityError':
                break;
            case 'InvalidStateError':
                break;
            case 'InvalidModificationError':
                break;
            default:
        }
    },
    initialize  : function() {
        //初始化
        window.requestFileSystem(TEMPORARY, this.size, function (fs) {
            fileSystemObj.fs = fs;
        })
    }
};
if(window.requestFileSystem) {
    navigator.webkitTemporaryStorage.queryUsageAndQuota(function (usage, quota) {
        //usage已经使用的空间，quota申请的总空间
        if (!quota) {
            //还没有申请过空间
            navigator.webkitTemporaryStorage.requestQuota(fileSystemObj.size, function (grantedBytes) {
                fileSystemObj.initialize();
            }, fileSystemObj.errorHandler);
        }else{
            fileSystemObj.initialize();
        }
    });
}
```
### 3、创建文件
```JavaScript
window.requestFileSystem(TEMPORARY, this.size, function (fs) {
    fileSystemObj.fs = fs;
    fs.root.getFile('log.txt', {create: true, exclusive: true}, function(fileEntry) {
        console.log(fileEntry);//留意它的几个属性
        // 生成FileWriter对象
        fileEntry.createWriter(function(fileWriter) {
            fileWriter.onwriteend = function(e) {
                console.log('写入完成');
            };
            fileWriter.onerror = function(e) {
                console.log('写入失败: ' + e.toString());
            };
            //可以创建ArrayBuffer、Blob等对象写入文件，但不建议使用BlobBuilder弃用方法
            fileWriter.write(new Blob(["something"], {type: "text/plain"}));
        }, fileSystemObj.errorHandler);
    }, fileSystemObj.errorHandler);
})
```
其中fs.root.getFile意思是在根目录下获取文件。create: true表示假如文件不存在就自动创建。而exclusive: true表示保证文件的唯一性，即假如文件存在时不继续执行后面的代码，立刻返回文件。
案例查看 [createFile.html](https://rawgit.com/scscms/FileSystem/master/createFile.html)
### 4、读取文件
getFile获取文件后可以使用FileReader对象读取文件内容。
```JavaScript
    fs.root.getFile('log.txt', {}, function(fileEntry) {
        fileEntry.file(function(file) {
           var reader = new FileReader();    
           reader.onloadend = function(e) {
             var txtArea = document.createElement('textarea');
             txtArea.value = this.result;
             document.body.appendChild(txtArea);
           }; 
           reader.readAsText(file);
        }, fileSystemObj.errorHandler);    
    }, fileSystemObj.errorHandler);
```
案例查看[readerFile.html](https://rawgit.com/scscms/FileSystem/master/readerFile.html)
### 5、创建文件夹
```JavaScript
    fs.root.getDirectory("abc", {create: true}, function(dirEntry) {
        //ok
    }, fileSystemObj.errorHandler);
```
getDirectory是获取文件夹函数，重点在于添加了{create: true}属性，当文件夹不存在时自动创建。
我们还可以通过修改函数达到创建"abc/aa/cc"这种套嵌式的文件夹。
案例查看[readerFolder.html](https://rawgit.com/scscms/FileSystem/master/readerFolder.html)
### 6、罗列文件和文件夹
经过以上几个操作，在浏览器的filesystem系统里已经存在一些文件夹和文件，下面我们来罗列根目录下的文件和文件夹。
```JavaScript
//读取绝对地址方法
window.resolveLocalFileSystemURL=window.resolveLocalFileSystemURL||window.webkitResolveLocalFileSystemURL;
```
所谓绝对地址指的是filesystem:http:\/\/www.scscms.com/temporary形式的绝对地址。
当然我们也可以使用getDirectory方法获取相对本目录下的所有文件和文件夹。
案例查看[listFile.html](https://rawgit.com/scscms/FileSystem/master/listFile.html)
### 7、修改文件
修改文件与创建文件一样。只文档类型需要注意，同时默认保存为utf-8编码。写入模式重点需要注意。
### 8、复制文件或文件夹
复制文件有两种形式，一是用户选择硬盘的文件，另一种是filesystem复制filesystem里的文件。
第一种形式几乎可以理解是克隆，靠getFile,createWriter形式重建文件。而后者可使用moveTo、copyTo形式直接移动或者复制
FileEntry 和 DirectoryEntry 均可使用 copyTo() 复制现有条目。该方法会自动以递归方式复制文件夹。
```JavaScript
    function copy(cwd, src, dest) {
        cwd.getFile(src, {}, function(fileEntry) {

            cwd.getDirectory(dest, {}, function(dirEntry) {
                fileEntry.copyTo(dirEntry);
            }, errorHandler);

        }, errorHandler);
    }
```
### 9、删除文件
```JavaScript
fileSystemObj.fs.root.getFile(file,{create: false}, function(fileEntry) {
    fileEntry.remove(function(){
        //has been deleted
    }, fileSystemObj.errorHandler);
}, fileSystemObj.errorHandler);
```
### 10、删除文件夹
```JavaScript
fileSystemObj.fs.root.getDirectory("An absolute folder path",{}, function (dirEntry) {
    dirEntry.removeRecursively(function() {
        //has been deleted
    }, fileSystemObj.errorHandler);
});
```
以递归方式删除目录。如果您不需要某个包含条目的目录，不妨使用 removeRecursively()。该方法将以递归方式删除目录及其内容。
以下代码会以递归方式删除“music”目录及其包含的所有文件和目录：
```JavaScript
fileSystemObj.fs.root.getDirectory('/misc/xxx/music', {}, function(dirEntry) {
        dirEntry.removeRecursively(function() {
            console.log('Directory removed.');
        }, fileSystemObj.errorHandler);
    }, fileSystemObj.errorHandler);
```
### 2、ajax下载文件

fileEntry.getMetadata(successCallback, opt_errorCallback);
fileEntry.remove(successCallback, opt_errorCallback);
fileEntry.moveTo(dirEntry, opt_newName, opt_successCallback, opt_errorCallback);
fileEntry.copyTo(dirEntry, opt_newName, opt_successCallback, opt_errorCallback);
fileEntry.getParent(successCallback, opt_errorCallback);
fileEntry.toURL(opt_mimeType);

fileEntry.file(successCallback, opt_errorCallback);
fileEntry.createWriter(successCallback, opt_errorCallback);