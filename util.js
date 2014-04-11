/**
 * desc: util
 * by: nighca
 * Date: 14-04-02
 */

var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    UG = require('uglify-js'),
    log4js = require("log4js"),
    config = require('./config');

log4js.configure({
    appenders: [
        { type: 'console' }
    ]
});

var type = function(o){
    return Object.prototype.toString.call(o);
};

var add = function(to, arr){
    for(var i = 1, l = arguments.length; i < l; i++){
        arr = arguments[i];
        arr = type(arr) === '[object Array]' ? arr : [arr];
        to = to.concat(arr.filter(function(item){
            return to.indexOf(item) < 0;
        }));
    }
    return to;
};

var addExt = function(fileName, ext){
    return fileName.replace(/(\.\w+){0,1}$/, '.' + (ext || 'js'));
};

var removeExt = function(fileName){
    return fileName.replace(/(\.\w+){0,1}$/, '');
};

var getVal = function(str){
    return (new Function('return ' + str))();
};

var transSep = function(p){
    return p.replace(/\\/g, '/');
};

var forEach = function(object, handler){
    var key, result;

    if(type(object) === '[object Array]'){
        for(var i = 0, l = object.length; i < l; i++){
            if(handler.call(this, object[i], i) === false){
                return;
            }
        }

        return;
    }

    for(key in object){
        if(object.hasOwnProperty(key)){
            if(handler.call(this, object[key], key) === false){
                return;
            }
        }
    }
};

var filter = function(object, check){
    if(type(object) === '[object Array]'){
        return object.filter(check);
    }

    var result = {};
    forEach(object, function(val, key){
        if(check(val, key)){
            result[key] = val;
        }
    });

    return result;
};

var clone = function(from){
    var to = {};

    for(var k in from){
        if(from.hasOwnProperty(k)){
            to[k] = from[k];
        }
    }

    return to;
};

var tryMkdirSync = function(p){
    if(!fs.existsSync(p)){
        return fs.mkdirSync.apply(this, arguments);
    }
};

var mkdirSyncEx = function(base, p){
    tryMkdirSync(base);

    var curr = base;
    path.normalize(p).split(path.sep).forEach(function(folder){
        curr = path.join(curr, folder);
        tryMkdirSync(curr);
    });

    return curr;
};

var absolute = function(){
    return path.join.apply(path, ([config().root]).concat(Array.prototype.slice.call(arguments)));
};

var formatTime = function(d, sep){
    d = d || new Date();
    return [
        d.getFullYear(),
        d.getMonth() + 1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
    ].join(sep || '_');
};

var begin = function(name){
    var begin = Date.now();

    return {
        name: name,
        begin: begin,
        count: function(){
            return Date.now() - begin;
        },
        end: function(){
            return Date.now() - begin;
        }
    };
};

var cache = {
    storage: {},
    register: function(name, getter){
        var upperName = name.slice(0, 1).toUpperCase() + name.slice(1),
            getMethod = 'get' + upperName,
            setMethod = 'set' + upperName;

        var storage = this.storage[name] = this.storage[name] || {};
        this[getMethod] = function(key, refresh){
            storage[key] = (refresh || !(key in storage)) ? getter.apply(this, arguments) : storage[key];
            return storage[key];
        };
        this[setMethod] = function(key, value){
            storage[key] = value;
            return storage[key];
        };
    }
};

cache.register('code', function(filePath){
    return fs.readFileSync(filePath, 'utf8');
});

cache.register('ast', function(filePath){
    return UG.parse(cache.getCode(filePath));
});

cache.register('stat', function(filePath){
    return fs.statSync(filePath);
});

cache.register('ls', function(folder){
    return fs.readdirSync(folder).map(function(name){
        var p = path.join(folder, name),
            stat = cache.getStat(p);
        return {
            name: name,
            path: p,
            stat: stat,
            file: stat.isFile()
        };
    });
});

var md5 = function(str){
    var hash = crypto.createHash('md5');
    hash.update(str, 'utf8');
    return hash.digest('hex');
};

var render = function(template, vars){
    return template.replace(/\{\{([^\{\}]*)\}\}/g, function(_, name){
        return vars[name.trim()] || '';
    });
};

var listFileFromWildcards = function(root, wildcard){
    var paths = wildcard.split('/'),
        list = [{
            path: root,
            file: false
        }];

    forEach(paths, function(name){
        var nlist = [];

        forEach(list.filter(function(f){
            return !f.file;
        }), function(f){
            var l = cache.getLs(f.path);

            forEach(l, function(f2){
                f2.vars = f.vars ? clone(f.vars) : {
                    __num__: 0
                };
            });

            nlist = nlist.concat(l);
        });

        if(name !== '*'){
            nlist = nlist.filter(function(f){
                return f.name === name;
            });
        }else{
            forEach(nlist, function(f){
                f.vars['$' + f.vars.__num__] = f.name;
                f.vars.__num__++;
            });
        }

        list = nlist;
    });

    list = list.filter(function(f){
        return f.file;
    });

    return list;
};

var protect = function(type, cnt){
    switch(type){
    case 'js':
        return '/* ' + cnt + ' */';
        break;
    case 'html':
        return '<!-- ' + cnt + ' -->';
        break;
    case 'makefile':
        return cnt.replace(/^|(\r{0,1}\n)/g, '\r\n#');
        break;
    default:
        return cnt;
    }
};

module.exports = {
    cache: cache,
    type: type,
    add: add,
    addExt: addExt,
    removeExt: removeExt,
    getVal: getVal,
    transSep: transSep,
    forEach: forEach,
    filter: filter,
    clone: clone,
    formatTime: formatTime,
    tryMkdirSync: tryMkdirSync,
    mkdirSyncEx: mkdirSyncEx,
    absolute: absolute,
    begin: begin,
    getLogger: log4js.getLogger,
    md5: md5,
    render: render,
    listFileFromWildcards: listFileFromWildcards,
    protect: protect
};