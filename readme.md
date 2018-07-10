# domvm-hbs

 > This package compiles handlebar templates to JSX at build time.

--------

## Using domvm and handlebars

This package will take a handlebars template and convert it to JSX at build time allowing for the template to be constructed against domvm (or any virtual dom that supports JSX via a pragma call) and to be rendered at runtime against live state.

While not all of domvm's features can be accommodated by JSX syntax (and therefore handlebar templates), it's possible to cover a fairly large subset via a defineElementSpread pragma. Please refer to demos and examples in the [JSX wiki](https://github.com/domvm/domvm/wiki/JSX).

## Quick start

- install via npm/yarn and set-up config to match the rest of this readme
    ```
    npm install domvm-hbs --save
    ```

## Combining domvm and handlebars with webpack and babel

- package.json
    ```
    ...

    "devDependencies": {
        "webpack": "^3.8.1",
        "babel-core": "^6.26.0",
        "babel-loader": "^7.1.2",
        "babel-preset-env": "^1.6.1",
        "babel-plugin-transform-react-jsx": "^6.24.1"
    },
    "dependencies": {
        "domvm": "^3.3.3",
        "domvm-hbs": "^1.0.0"
    }

    ...
    ```
- webpack.config.js
    ```
    ...

    module: {
        loaders: [
            {
                test: /\.(jsx|js)$/,
                loader: ['babel-loader']
            },
            {
                test: /\.hbs$/,
                loader: ['domvm-hbs/lib/domvm-hbs-loader'],
                exclude: /node_modules/
            }
        ]
    }

    ...
    ```
- babel.rc
    ```
    {
        "presets": [
            "env"
        ],
        "plugins": [
            [
                "transform-react-jsx",
                {
                    "pragma": "el"
                }
            ]
        ]
    }
    ```

- template.hbs
    ```
    <div>
        <h1>Handlebars test</h1>
        <div>
            <a>Name: </a>
            {{#if profile}}
                {{name}}
            {{/if}}
        </div>
    </div>
    ```

- your-project-file.js
    ```
    ...

    // inlcude a handlebars template (which will be converted to jsx on inclusion)
    const template = require('template.hbs');

    // create a view layer carrying the state to the template
    const view = function(vm, state) {

        // apply the state to the hbs template's JSX function
        return template(vm, state);
    };

    // state is provided to the template at runtime
    let state = {profile: {name: "Foo bar"}};

    // create a vm from the view
    const vm = domvm.createView(view, state);

    // mount to the dom
    vm.mount(document.getElementById('root'));

    ...
    ```

## Acknowledgements

This package is a fork from [vincentracine/hyperbars](https://github.com/vincentracine/hyperbars) - this package separates the core functionality from the runtime allowing for the templates to be compiled at build time and to be executed later.

 - [Leon Sorokin (leeoniya)](https://github.com/leeoniya) - Author of domvm
 - [Vincent Racine (vincentracine)](https://github.com/vincentracine) - Author of hyperbars

## License

* [Licensed](https://github.com/gdixon/domvm-hbs/blob/master/LICENSE) under the MIT License (MIT).
