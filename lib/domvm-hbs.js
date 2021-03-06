/**
 * Copyright (c) 2018 Vincent Racine, Graham Dixon
 * All rights reserved. (MIT Licensed)
 *
 * domvm-hbs.js
 * this package compiles handlebar templates to JSX at build time (forked from vincentracine/hyperbars)
 * @preserve https://github.com/gdixon/domvm-hbs
 */

module.exports = (function(domvm_hbs) {
    'use strict';

    var htmlparser = require("htmlparser2");

    /**
     * Parse handlebar template
     * @param html
     * @returns {Array}
     */
    var parse = function(html) {
        var tree = [],
            current = null;

        // Create parser
        var parser = new htmlparser.Parser({
            onopentag: function(name, attrs) {
                var node = {
                    type: 'tag',
                    parent: current,
                    name: name,
                    attributes: attrs,
                    children: []
                };

                if (current) {
                    current.children.push(node);
                } else {
                    tree.push(node);
                }
                current = node;
            },
            ontext: function(text) {
                // Deal with adjacent blocks and expressions
                var multiple = text.search(/{({[^{}]+})}/) > -1;
                if (multiple) {
                    text = text.split(/{({[^{}]+})}/g);
                    text = text.map(function(item, index, array) {
                        if (!item || item == "") return undefined;
                        if (item == "{") return "";

                        if (item[0] == "{" && item.length > 1 && array[index + 1] != "}") {
                            item = "{" + item + "}";
                        }
                        if (item[0] == "{" && item.length > 1 && array[index + 1] == "}") {
                            item = "{{" + item + "}}";
                            text[index + 1] = "";
                        }

                        return item;
                    }).filter(function(item) {
                        return item != "{" || item != "}"
                    });
                } else {
                    text = [text];
                }

                text = text.filter(Boolean);

                text.forEach(function(text) {
                    var node = {
                        type: 'text',
                        content: text.replace(/'/g, "\\'")
                    };
                    if (current) {
                        current.children.push(node);
                    } else {
                        tree.push(node);
                    }
                });
            },
            onclosetag: function(tagname) {
                current = current ? current.parent : null;
            }
        }, {
            decodeEntities: true
        });

        // Initiate parsing
        parser.write(html);

        // Stop parser
        parser.end();

        // Return parsed html tree
        return tree;
    };

    domvm_hbs.prototype = {

        'setup': function(obj) {
            obj = obj || {};
            htmlparser = obj.htmlparser;
        },

        /**
         * Compiles HTML to use with virtual-dom
         *
         * options params:
         * | name  | default | description
         * ---------------------------------
         * | debug |  false  | outputs the js to console
         * | raw   |  false  | returns the compiled function as a string
         *
         * @param template html
         * @param options options
         * @returns * compiled function
         */
        'compile': function(template, options, originalState) {
            var partials = this.partials;
            options = options || {};
            options.debug = options.debug || false;
            options.raw = options.raw || false;
            options.cache = options.cache || true;
            options.pragma = options.pragma || "h";

            // Remove special characters
            template = template.replace(/> </g, '><')
                .replace(/> {{/g, '>{{')
                .replace(/}} </g, '}}<')
                .replace(/\n/g, '')
                .replace(/\t/g, '');

            /**
             * Injects a pre-compiled partial into the code-generation procedure
             * @param string handlebar partial expression body
             * @returns {string}
             */
            var injectPartial = function(string) {
                var regex = /([\S]+="[^"]*")/g,
                    parameters = string.split(regex).filter(Boolean),
                    headers = parameters[0].split(' ').slice(1),
                    partial = partials[headers[0]];

                if (!partial)
                    throw new Error('Partial "' + headers[0] + '" is missing. Please add it to domvm_hbs.partials.');

                // Partial context setup
                if (headers[1]) {
                    var context;
                    if (headers[1].indexOf('=') > -1) {
                        context = "context";
                        var parameter = headers[1].split('='),
                            parsed = block2js(parameter[1]);
                        if (parsed.indexOf("''+") == 0) parsed = parsed.slice(3);
                        parameters.push(parameter[0] + "=" + parsed);
                    } else {
                        context = block2js(headers[1]);
                        if (context.indexOf("''+") == 0) context = context.slice(3);
                    }
                }

                // Partial parameters setup
                parameters = parameters.slice(1).filter(function(s) {
                    return !!s.trim()
                }).map(function(s) {
                    return s.replace('=', ':')
                });
                return partial.toString() + "(Runtime.merge" + (context ? "(" + context : "(context") + (parameters.length ? ",{" + parameters.join(',') + "}))" : "))");
            };

            /**
             * Returns a formatted string in javascript format based on handlebar expression
             * @param string
             */
            var block2js = function(string) {
                if (string == "this") return 'context';
                if (string[0] == '@') return "options['" + string + "']";
                if (string[0] == '>') return injectPartial(string);
                var sanitised = string.replace(/(this).?/, '').replace(/..\//g, 'parent.'),
                    options = "";

                if (string.indexOf('.') > -1 && string.indexOf('..') == -1) {
                    var dot = sanitised.indexOf('.');
                    options = sanitised.slice(dot);
                    sanitised = sanitised.slice(0, dot);
                }

                // Do not encode HTML
                if (sanitised[0] == "{") {
                    sanitised = sanitised.slice(1);
                    return [
                        "options." + options.pragma + "('div',{'innerHTML':",
                        "''+" + (sanitised.indexOf('parent') == 0 ? sanitised : "context['" + sanitised + "']" + options),
                        "}, [])"
                    ].join('');
                }
                return "''+" + (sanitised.indexOf('parent') == 0 ? sanitised : "context['" + sanitised + "']" + options);
            };

            /**
             * Places single quotes around a string.
             * @param string
             * @returns {string}
             */
            var string2js = function(string) {
                var open = string.indexOf('{{'),
                    close = string.indexOf('}}'),
                    value = string.slice(open + 2, close);
                if (open != -1 && close != -1) {
                    return open > 0 ? "'" + string.slice(0, open) + "'+" + block2js(value) : block2js(value);
                } else {
                    return "'" + string + "'"
                }
            };

            /**
             * Convert vnode to javascript
             * @param vnode
             * @returns {string}
             */
            var node2js = function(vnode) {
                if (!vnode.children || !vnode.children.length) {
                    vnode.children = '[]';
                }
                return "options." + options.pragma + '(' + [string2js(vnode.name), vnode.attributes, vnode.children].join(',') + ')';
            };

            /**
             * Converts vtext node to javascript
             * @param vtext
             * @returns {*}
             */
            var text2js = function(vtext) {
                return string2js(vtext.content);
            };

            /**
             * Converts handlebar expression to javascript
             * @param expression
             * @returns {*}
             */
            var expression2js = function(expression) {
                if (expression.indexOf('{{/') > -1) {
                    return ']})';
                }

                // Parse
                expression = expression
                    .replace(/(this).?/, '')
                    .replace(/..\//g, 'parent.');

                // Function extraction
                var whitespace = expression.indexOf(' '),
                    fn = expression.slice(3, whitespace);

                // Attribute extraction
                var regex = /([\S]+="[^"]*")/g,
                    parameters = expression
                    .substring(whitespace, expression.length)
                    .replace('}}', '')
                    .split(regex)
                    .filter(function(string) {
                        return !!string && string != " "
                    })
                    .map(function(string) {
                        if (string.indexOf("=") > -1) {
                            var s = string.trim().split("=");
                            s[0] = block2js(s[0]);
                            if (s[1][0] != '"' && s[1].slice(-1) != '"') {
                                s[1] = block2js(s[1]);
                                if (s[1].indexOf("''+") == 0) {
                                    s[1] = s[1].slice(3);
                                }
                            }
                            return `{ left: ${s[0]}, right: ${s[1]} }`;
                        } else {
                            string = block2js(string.trim());
                            if (string.indexOf("''+") == 0) {
                                string = string.slice(3);
                            }
                            return string;
                        }
                    });
                return [
                    "Runtime.",
                    fn,
                    "(context, " + "{ value: " + parameters + " }" + ", function(context, parent, options){return ["
                ].join('');
            };

            /**
             * Converts attribute value to javascript
             * @param attribute
             * @returns {string}
             */
            var attrs2js = function(attribute) {
                attribute = attribute.replace(/'/g, "\\'");
                var blocks = attribute.split(/({{[^{}]+)}}/g);
                blocks = blocks.map(function(block) {
                    return isHandlebarExpression(block) ? expression2js(block) : block.indexOf('{{') > -1 ? block2js(block.slice(2)) : "'" + block + "'"
                }).join('+');
                return blocks.replace(/\[\+/g, "[").replace(/\[''\+/g, "[").replace(/\+['']*\]/g, "]");
            };

            /**
             * True is the argument contains handlebar expression
             * @param string
             * @returns {boolean}
             */
            var isHandlebarExpression = function(string) {
                return string.indexOf('{{#') > -1 || string.indexOf('{{/') > -1
            };

            /**
             * True is the argument contains handlebar expression
             * @param string
             * @returns {boolean}
             */
            var isHandlebarBlock = function(string) {
                return string.indexOf('{{') > -1 && string.indexOf('}}') > -1
            };

            /**
             * Converts vnode to javascript
             * @param node
             */
            var toJavaScript = function(node) {
                if (node.children && node.children.length) {
                    node.children = [
                        '[', node.children.map(toJavaScript).join(','), ']'
                    ].join('').replace(/return \[,/g, "return [").replace(/,\]}\)\]/g, "]})]");
                }

                if (node.attributes) {
                    node.attributes = [
                        '{',
                        Object.keys(node.attributes).map(function(name) {
                            return [string2js(name), attrs2js(node.attributes[name])].join(':')
                        }).join(','),
                        '}'
                    ].join('')
                }

                if (node.type == 'text') {
                    // Deal with handlebar expressions in text
                    if (isHandlebarExpression(node.content)) {
                        return expression2js(node.content);
                    } else {
                        return text2js(node);
                    }
                }

                if (node.type == 'tag') {
                    return node2js(node);
                }
            };

            // Parse handlebar template using htmlparser
            var parsed = parse(template)[0];

            // Convert to hyperscript
            var fn = [
                '(function(vm, state) {  var Runtime = domvm_hbs_runtime.methods; return function(){  var context = (state || originalState); return ',
                toJavaScript(parsed),
                '}.bind({})}.bind({}))'
            ].join('');

            // Remove those pesky line-breaks!
            fn = fn.replace(/(\r\n|\n|\r)/gm, "");

            if (options.debug || this.debug) {
                console.log(fn);
            }

            // function is currently a string so eval it and return it
            return options.raw ? fn : eval(fn);
        },

        /**
         * Dependencies
         */
        'htmlparser': htmlparser
    };

    return new domvm_hbs();

})(function() {
    this.debug = false;
    this.partials = {};
});
