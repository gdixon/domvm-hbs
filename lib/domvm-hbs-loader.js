/**
 * Copyright (c) 2018 Graham Dixon
 * All rights reserved. (MIT Licensed)
 *
 * domvm-hbs-loader.js
 * this package compiles handlebar templates to JSX at build time
 * @preserve https://github.com/gdixon/domvm-hbs
 */

// parser to convert hbs to hyperscript el calls
const domvm_hbs = require('domvm-hbs');

// export the hbs file as callable hyperscript
module.exports = function(content) {
    // allow the response to be cached
    this.cacheable = true;

    // options outside of the call
    const options = {
        'pragma': "el",
        raw: true
    };

    // precompile the hbs to jsx (cant bind context yet)
    const precompile = domvm_hbs.compile(content, options);

    // locally scope the hbs runtime and jsx el function assigning the el fn to options
    const locallyScoped = "var domvm_hbs_runtime = require('domvm-hbs/lib/domvm-hbs-runtime'); var el = require('domvm-jsx'); var options = {el: el};";

    // compile the hbs template before allowing it to repsond to vm calls - inline options and pragma fn
    return "module.exports = (function() { " + locallyScoped + " return " + precompile + ";})()";
}

// run separate from the module system
module.exports.seperable = true;
