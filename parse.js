/**
 * desc: 分析依赖
 * by: nighca
 * Date: 14-04-02
 */

var UG = require('uglify-js'),
    fs = require('fs'),
    path = require('path'),
    util = require('./util'),
    config = require('./config');

var cache = util.cache;

var makeGetter = function(funcName){
    return function(node){
        return (
            (node instanceof UG.AST_Call && node.expression.print_to_string() === funcName) ?
            (node.args[0] && node.args[0].print_to_string()) :
            null
        );
    };
},

    getVal = util.getVal,

    getTpl = makeGetter('Q.loadTemplate'),

    getCMDDep = makeGetter('require'),

    add = util.add;

var getCmdDepRec = function(filePath){
    var ast = cache.getAst(filePath),
        dirPath = path.dirname(filePath),
        id = path.relative(config().root, dirPath),
        deps = [];

    var walker = new UG.TreeWalker(function(node, descend) {
        var module, dep;

        if((module = getCMDDep(node))){
            module = getVal(module);
            var moduleFile = util.addExt(path.join(dirPath, module));
            deps = add(deps, cache.getCmdDep(moduleFile), path.join(id, module));

            return true;
        }
    });
    ast.walk(walker);

    return deps;
};

cache.register('cmdDep', getCmdDepRec);

var getCmdDep = function(filePath){
    return cache.getCmdDep(filePath);
};

var getTplDepRec = function(filePath){
    var ast = cache.getAst(filePath),
        dirPath = path.dirname(filePath),
        tplDeps = [];

    var walker = new UG.TreeWalker(function(node, descend) {
        var module, dep;

        if((module = getCMDDep(node))){
            var moduleFile = util.addExt(path.join(dirPath, getVal(module)));
            tplDeps = add(tplDeps, cache.getTplDep(moduleFile));

            return true;
        }

        if((dep = getTpl(node))){
            tplDeps = add(tplDeps, getVal(dep));
        }
    });
    ast.walk(walker);

    return tplDeps;
};

cache.register('tplDep', getTplDepRec);

var getTplDep = function(filePath){
    return cache.getTplDep(filePath);
};

module.exports = {
    makeGetter: makeGetter,
    getTplDep: getTplDep,
    getCmdDep: getCmdDep
};