/**
 * Copyright (c) 2018 Vincent Racine, Graham Dixon
 * All rights reserved. (MIT Licensed)
 *
 * domvm-hbs-runtime.js
 * this package compiles handlebar templates to JSX at build time (forked from vincentracine/hyperbars)
 * @preserve https://github.com/gdixon/domvm-hbs
 */

module.exports = (function(domvm_hbs_runtime) {
    'use strict';

    var domvm_hbs_runtime = {};

    var isObject = function(a) {
        return Object.prototype.toString.call(a) === '[object Object]'
    };

    domvm_hbs_runtime.prototype = {

        'setup': function(obj) {
            obj = obj || {};
        },

        /**
         * Register helpers
         */
        'registerHelper': function(name, handler) {
            domvm_hbs_runtime.methods[name] = handler;
        }
    };

    domvm_hbs_runtime.methods = {
        'if': function(context, expression, callback) {
            if (expression.value) {
                return callback(isObject(expression.value) ? expression.value : context, context);
            }
            return "";
        },
        'unless': function(context, expression, callback) {
            if (!expression.value) {
                return callback(isObject(expression.value) ? expression.value : context, context);
            }
            return "";
        },
        'each': function(context, expression, callback) {
            return expression.value.map(function(item, index, array) {
                var options = {};
                options['@index'] = index;
                options['@first'] = index == 0;
                options['@last'] = index == array.length - 1;
                return callback(item, context, options)
            })
        },
        /**
         * credit: http://stackoverflow.com/a/8625261/5678694
         */
        'merge': function() {
            var obj = {},
                i = 0,
                il = arguments.length,
                key;
            for (; i < il; i++) {
                for (key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) {
                        obj[key] = arguments[i][key];
                    }
                }
            }
            return obj;
        }
    };

    return domvm_hbs_runtime;

})(function() {
    this.debug = false;
});
