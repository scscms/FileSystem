# FileSystem<sup>shine</sup>
## 简介
FileSystem提供了文件夹和文件的创建、移动、删除等操作，大大方便了数据的本地处理，而且所有的数据都是在沙盒(sandboxed)中，不同的web程序不能互相访问，这就保证了数据的完整和安全。
目前只有Chrome浏览器对FileSystem API支持，所以只能运行在Chrome浏览器中。
应用场景：
1.持久型上传器
   选中要上传的文件或目录后，系统会将文件复制到本地沙盒并批次上传。即使发生浏览器崩溃、网络中断等状况，也可在之后重新开始上传。
2.视频游戏、音乐或其他具有大量媒体资产的应用
   预先下载文件，需要用时无需等待。
3.可使用离线访问权限或本地存储的高速音频/照片编辑器
   通过创建目录来整理项目文件这一功能非常有用。
   修改后的文件应可供客户端应用 \[iTunes、Picasa] 访问。
4.离线web存储
   下载网络文件本地存储，区别其他本地文件存储的是，本存储可管理。本地文件可通过二进制地址或者filesystem:协议访问，形成本地web网站。这正是我使用的功能。
## 申请空间
如果开发功能开放给用户使用建议申请临时空间存储，如果自己使用可申请永久存储空间。因为申请永远存储需要用户同意才能执行。
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
## 创建文件
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
            fileWriter.write(new Blob(["something 你好"], {type: "text/plain"}));
        }, fileSystemObj.errorHandler);
    }, fileSystemObj.errorHandler);
})
```
其中fs.root.getFile意思是在根目录下获取文件。create: true表示假如文件不存在就自动创建。而exclusive: true表示保证文件的唯一性，即假如文件存在时不继续执行后面的代码，立刻返回文件。
## 创建文件夹
## 查看文件
## 读取文件
## 修改文件
## 复制文件或文件夹
## 删除文件
## 删除文件夹
## ajax下载文件
