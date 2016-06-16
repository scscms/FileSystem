function isTypeObject(obj,type){
    return Object.prototype.toString.call(obj) === '[object '+type+']';
}
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
var STRING_HASH = new Date().toLocaleString().match(/(\d+)/g).slice(0,4).join(""),
        LOCATION_ORIGIN = "http://" + location.hostname,//ie低版本不支持location.origin
        HREF_FM_HOME = LOCATION_ORIGIN + "/fm2/app/publicV2/html/recommend/index.html";//电台默认首页
var fileSystemObj = {
    URL_FM_HOMEPAGE: "/fm2/app/publicV2/html/recommend/index.html",
    ARRAY_LOCAL_PICTURE: [],//获取本地所有文件列表，用于比对判断是否需要下载文件
    fs          : null,//文件系统对象
    fmPicture   : "/fm2/app/publicV2/dist/images/fmimages/",//电台图片文件夹
    fmDate      : "/fm2/app/publicv2/dist/js/data/",//电台数据文件夹
    size        : 500*1024*1024,//申请500M临时空间 500*1024*1024
    rootFolder  : "filesystem:" + LOCATION_ORIGIN + "/temporary",
    hasUpdate   : false,//是否已经更新过
    logUrl      : "",
    log:function(key,parameter){
        fileSystemObj.logUrl += "&"+ key + "=" + (parameter|| (new Date()).getTime() - _st);
    },
    getFileMineType : function(file){
        var suffix = file.replace(/.*?([^.]+)$/,"$1").toLowerCase(),mineType;
        if(/^(txt|htm|html|css|swf|js|jpe|jpg|jpeg|png|gif|bmp)$/.test(suffix)) {
            switch (suffix) {
                case "txt":
                    mineType = "text/plain;charset=UTF-8";
                    break;
                case "htm":
                case "html":
                    mineType = "text/html;charset=UTF-8";
                    break;
                case "css":
                    mineType = "text/css;charset=UTF-8";
                    break;
                case "js":
                    mineType = "application/javascript;charset=UTF-8";
                    break;
                case "swf":
                    mineType = "application/x-shockwave-flash";
                    break;
                case "jpe":
                case "jpg":
                    mineType = "image/jpeg";
                    break;
                case "jpeg":
                case "png":
                case "gif":
                case "bmp":
                    mineType = "image/" + suffix;
                    break;
            }
        }
        return mineType;
    },
    initialize : function(){
        window.requestFileSystem(TEMPORARY, this.size, function (fs) {
            fileSystemObj.fs = fs;
            fileSystemObj.log("initialize");
            //===============获取本地所有文件列表
            fileSystemObj.listFiles("/fm2/app/publicV2",function(array){
                if(array.length){
                    fileSystemObj.ARRAY_LOCAL_PICTURE = array;
                    fileSystemObj.log("Has_ListFiles_" + array.length);
                    localStorage.setItem("ARRAY_LOCAL_PICTURE",JSON.stringify(array));
                }else{
                    if(curHref.indexOf("filesystem:") != -1){
                        fileSystemObj.log("indexError");
                        dealLocalStorage("clear");
                        curHref = HREF_FM_HOME;
                        writeIframe();
                    }
                }
            },true);
            //===============验证html正常
            if(curHref.indexOf("filesystem:") != -1) {
                fileSystemObj.downLoader(fileSystemObj.rootFolder + fileSystemObj.URL_FM_HOMEPAGE, {save: false}, function (html) {
                    if (html && html.indexOf("<!--kugouend-->") == -1) {
                        fileSystemObj.log("kugouEndError");
                        dealLocalStorage("clear");
                        curHref = HREF_FM_HOME;
                        fileSystemObj.dropDirs(fileSystemObj.fs.root, function () {
                            writeIframe();
                        });
                    }
                });
            }
        }, fileSystemObj.errorHandler);
    },
    updateData:function(array){
        localStorage.setItem("refresh","");
        if(!fileSystemObj.fs) return;
        fileSystemObj.downFiles(array,{},function(){});
        function BatchFileName(url,arr){
            url = url.replace(/[\s'"]/g,"");
            var fileName = url.replace(/.*?([^/]+)$/,"$1");
            if(fileSystemObj.ARRAY_LOCAL_PICTURE.indexOf(fileName) == -1 && arr.indexOf(fileName) == -1){
                arr.push(LOCATION_ORIGIN + url);
            }
        }
        function downHome(arr,path){
            //开始下载本地不存在的js\images css 和index.html
            fileSystemObj.downFiles(arr, {}, function () {
                fileSystemObj.downLoader(path, {fileName: "index.html"}, function (html) {
                    if (html && html.indexOf("<!--kugouend-->") != -1) {
                        localStorage.setItem("FM_HOMEPAGE","SUCCEED");
                        fileSystemObj.log("FM_HOMEPAGE_SUCCEED");
                    }else{
                        fileSystemObj.log("FM_HOMEPAGE_ERROR");
                        localStorage.setItem("FM_HOMEPAGE","");
                    }
                    if(window.version == 8040 && !sessionStorage.getItem("log")){
                        new Image().src = "http://stat.www2.kugou.com/stat.html?type=fileLog"+fileSystemObj.logUrl;//发送log到服务器
                        sessionStorage.setItem("log","send");
                    }
                })
            });
        }
        if(fileSystemObj.hasUpdate){ return }
        fileSystemObj.hasUpdate = true;
        //===============下载recommend/index.html提取js；提取css并分析css
        fileSystemObj.downLoader(LOCATION_ORIGIN + fileSystemObj.URL_FM_HOMEPAGE + "?t=" + STRING_HASH,{fileName:"temp_index.html"},function(content){
            if(content && content.indexOf("<!--kugouend-->") != -1){
                var arr = [],path = this.fullPath;
                content.replace(/<script[^>]+?src="([^"]+)[^<]+?<\/script>/ig,function(a,url){
                    BatchFileName(url,arr);//fm-1stPage-min_bc25f11.js
                    return "";
                }).replace(/<link[^>]+?href=["']([^"']+)/ig,function(a,url){
                    //下载css文件并解析背景图片 fm_d8d2b72.css 不下载重复的css文件
                    var fileName = url.replace(/.*?([^/]+)$/,"$1");
                    if(fileSystemObj.ARRAY_LOCAL_PICTURE.indexOf(fileName) == -1){
                        fileSystemObj.downLoader(LOCATION_ORIGIN + url,{},function(cssText){
                            if(cssText && cssText.indexOf("filesystem_css_end") != -1){
                                cssText.replace(/background(?:\-image)?:url\(([^\)]+)\)/gi,function(a,url){
                                    BatchFileName(url,arr);
                                    return "";
                                });
                                downHome(arr,path);//开始下载本地不存在的js\images
                                fileSystemObj.log("FM_CSS_SUCCEED");
                            }else{
                                fileSystemObj.log("FM_CSS_ERROR");
                            }
                        });
                    }else{
                        fileSystemObj.log("FM_CSS_CACHE");
                        downHome(arr,path);
                    }
                    return "";
                });
            }
        });
    },
    createDir :function(rootDir, folders, callBack) {
        folders = isTypeObject(folders,'Array') ? folders : folders.replace(/\\+/g,'/').split(/\/+/g);
        if (folders.length){
            var folder = folders.shift();
            if("" !== folder){
                rootDir.getDirectory(folder, {create: true}, function(dirEntry) {
                    fileSystemObj.createDir(dirEntry, folders, callBack);
                }, fileSystemObj.errorHandler);
            }else{
                fileSystemObj.createDir(rootDir, folders, callBack);
            }
        }else{
            isTypeObject(callBack,'Function') && callBack.call(rootDir);
        }
    },
    saveFile:function(obj,callBack){
        var _callBack = isTypeObject(callBack,'Function') ? callBack : function(){};
        fileSystemObj.createDir(fileSystemObj.fs.root,obj.pathname,function(){
            fileSystemObj.fs.root.getFile(obj.pathname + obj.fileName, {create: true,exclusive:false}, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    //fileWriter.seek(0);
                    fileWriter.onwriteend = function () {
                        if (fileWriter.length === 0) {
                            obj.mineType = obj.mineType || fileSystemObj.getFileMineType(obj.fileName);
                            if(isTypeObject(obj.content,'Blob')) {
                                fileWriter.write(obj.content);
                            }else if(isTypeObject(obj.content,'ArrayBuffer')){
                                obj.content = new Blob([new Uint8Array(obj.content)], {type: obj.mineType});
                                fileWriter.write(obj.content);
                            }else{
                                obj.error = "[object Null]";
                                return _callBack.call(obj);
                            }
                        } else {
                            if(/(txt|htm|html|css)$/.test(obj.fileName)) {
                                var reader = new FileReader();
                                reader.onload = function (e) {
                                    _callBack.call(obj, e.target.result);
                                };
                                reader.readAsText(obj.content);
                            }else{
                                _callBack.call(obj,"ok");
                            }
                        }
                    };
                    fileWriter.onerror = function (e) {
                        obj.error = e.message;
                        _callBack.call(obj);
                    };
                    fileWriter.truncate(0);//先清空
                });
            })
        });
    },
    listFileName:function(absolutePath,callBack){
        resolveLocalFileSystemURL(absolutePath,function(dirEntry){
            var dirReader = dirEntry.createReader(),array = [];
            dirReader.readEntries(function(results){
                for(var i = results.length; i--;){
                    if(results[i].isFile){
                        array.push(results[i].name);
                    }
                }
                callBack.call(this,array);
            },fileSystemObj.errorHandler);
        },function(e){
            callBack.call(e,[]);
        })
    },
    listFiles:function(path,callBack,recursion){
        var _array = [],count = 0,directory = [];
        function _list(path){
            count ++;
            fileSystemObj.fs.root.getDirectory(path,{}, function(dirEntry) {
                directory.push(dirEntry);
                var dirReader = dirEntry.createReader();
                dirReader.readEntries(function(results){
                    count --;
                    for(var i = 0; i < results.length; i++){
                        var file = results[i];
                        if(file.isFile){
                            _array.push(file.name);
                        }else if(recursion){
                            _list(file.fullPath);
                        }
                    }
                    !count && callBack.call(null,_array);
                },fileSystemObj.errorHandler);
            }, function(e){
                callBack.call("error",_array);//e.name=NotFoundError
            });
        }
        /\w+/i.test(path) ? _list(path) : callBack.call("error",_array);
    },
    dropDirs:function(path,callBack){
        fileSystemObj.fs.root.getDirectory(path,{}, function (dirEntry) {
            dirEntry.removeRecursively(function() {
                isTypeObject(callBack,'Function') && callBack.call(dirEntry);
            }, fileSystemObj.errorHandler);
        });
    },
    errorHandler:function(e){
        switch (e.name) {
            case 'QuotaExceededError'://超出空间
                fileSystemObj.dropDirs(fileSystemObj.fs.root,function(){
                    fileSystemObj.fs = null;
                    dealLocalStorage("clear");
                });
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
        fileSystemObj.log("errorHandler",e.name);
    },
    downFiles:function(array,settings,complete){
        function _fun(){
            array.length > 0 ? fileSystemObj.downLoader(array.shift(),settings,_fun): complete.call(null);
        }
        isTypeObject(array,'Array') ? _fun() : complete.call({error:"InvalidArray"});
    },
    downLoader:function(url,settings,complete){
        if(!fileSystemObj.fs) return;
        function regStr(str,reg){
            var _t = str.toString().split(/\?|#/)[0].match(reg);
            return _t ? _t[1] : "";
        }
        var _this = this,
                pathname = regStr(url,/https?:\/\/[^/]+(?:\/temporary)?(.+?)[^/]+$/i),//文件相对绝对路径
                fileName = regStr(url,/([^\/]+)$/),//文件名
                suffix 　= regStr(fileName,/([^.]+)$/),//文件后缀名
                key,xhr,
                obj = {
                    url         :　url,//备用地址
                    responseType:　"arraybuffer",//[arraybuffer|blob|document|text] 禁止配置
                    async       :　true,//是否异步，默认true
                    pathname    :　pathname||"/",//默认保持与网络路径一样
                    fileName    :　fileName,//默认保持与网络名称一样
                    save        :　true, //是否保存文件，默认保存
                    content     :  "",//文本内容
                    error       :  null    //错误信息
                };
        if(isTypeObject(settings,"Object")){
            for(key in settings){
                if(settings.hasOwnProperty(key))obj[key] = settings[key];//合并配置
            }
        }
        //处理电台图片
        if(url.indexOf(".kugou.com/") == -1){
            obj.pathname = "/fm2/app/publicV2/dist/images/fmimages/";
        }
        complete = isTypeObject(complete,"Function") ? complete : function(){};
        if(obj.mineType = fileSystemObj.getFileMineType(suffix)) {
            if(obj.save){
                obj.responseType = "blob";//下载文件强制格式，以防乱码
            }else{
                if("swf" == suffix) {
                    obj.responseType = "arraybuffer";
                }else{
                    obj.responseType = "text";
                }
            }
            obj.fullPath = fileSystemObj.rootFolder + obj.pathname + obj.fileName;
            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4 && xhr.status == 200){
                    obj.content = this.response;
                    obj.save ? _this.saveFile(obj,complete) : complete.call(obj,obj.content);
                }
            };
            xhr.onload = function(){
                if(xhr.status != 200){
                    obj.error = xhr.status;
                    complete.call(obj);
                }
            };
            xhr.onerror = function(e){
                obj.error = e;
                complete.call(obj);
            };
            xhr.open('GET', url, true);
            xhr.responseType = obj.responseType;
            xhr.send();
        }else{
            obj.error = "ILLEGAL_SUFFIX";
            complete.call(obj);
        }
    }
};
if(window.requestFileSystem) {
    navigator.webkitTemporaryStorage.queryUsageAndQuota(function (usage, quota) {
        if (!quota) {
            navigator.webkitTemporaryStorage.requestQuota(fileSystemObj.size, function (grantedBytes) {
                fileSystemObj.initialize();
            }, fileSystemObj.errorHandler);
        }else{
            fileSystemObj.initialize();
        }
    });
}
