/**
 * desc: 打包
 * by: nighca
 * Date: 14-04-02
 */

var UG = require('uglify-js'),
    path = require('path');

var util = require('./util'),
    parse = require('./parse'),
    config = require('./config');

var mangleNames = function(ast){
    ast.figure_out_scope();
    ast.compute_char_frequency();
    ast.mangle_names();

    return ast;
};

var createStatement = function(code){
    return UG.parse('(' + code + ')').body[0].body;
};

var modify = function(ast, options) {
    var id = options.id,
        dependencies = options.dependencies;

    var trans = new UG.TreeTransformer(function(node, descend) {
        // modify define
        if (node instanceof UG.AST_Call && node.expression.name === 'define' && node.args.length) {
            node.args.unshift(createStatement(JSON.stringify(dependencies)));
            node.args.unshift(createStatement(JSON.stringify(id)));
            return node;
        }
    });
    ast = ast.transform(trans);

    return ast;
};

var cache = util.cache,
    transform = util.transSep,
    adjustId = function(id){
        return transform(path.join(config().root, id));
    };

cache.register('amdCode', function(filePath){
    var id = path.relative(config().root, util.removeExt(filePath)),
        ast = cache.getAst(filePath),
        dependencies = cache.getCmdDep(filePath);

    return modify(ast, {
        id: transform(id),
        dependencies: dependencies.map(transform)
    }).print_to_string({
        beautify: config().dev
    });
});

module.exports = {
    mangleNames: mangleNames
};