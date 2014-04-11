/**
 * desc: config
 * by: nighca
 * Date: 14-04-02
 */

var config = {};

module.exports = function(cfg){
    if(cfg){
        for(var name in cfg){
            if(cfg.hasOwnProperty(name)){
                config[name] = cfg[name];
            }
        }
    }

    return config;
};