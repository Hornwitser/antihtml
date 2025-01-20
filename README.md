# AntiHTML

The simple stupid data structure oriented HTML serializer.

## Simple exaple

```js
import { el, htmlDocument, prettify } from 'antihtml';

const title = "Hello world";
const document = el('html',
    el('head',
        el('meta', {'charset': 'utf-8'}),
        el('title', title),
    ),
    el('body',
        el('h1', title),
        el('p', "This is a sample html document"),
    ),
);
const html = htmlDocument(prettify(document, "    "));
```

The produced `html` string is the following:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Hello world</title>
    </head>
    <body>
        <h1>Hello world</h1>
        <p>This is a sample html document</p>
    </body>
</html>
```

## JSX support

Using JSX is also supported, for example with JSX the above code could also have been written as:

```jsx
import { htmlDocument, prettify } from 'antihtml';

function Head(props) {
    return <head>
        <meta charset="utf-8" />
        <title>{props.title}</title>
    </head>;
}

const title = "Hello world";
const document = <html>
    <Head title={title} />
    <body>
        <h1>{title}</h1>,
        <p>This is a sample html document</p>
    </body>
</html>;
const html = htmlDocument(prettify(document, "    "));
```

For this to work you need to configure a transpiler to convert the JSX to `_jsx` calls, with the source to import it from set to `"antihtml"`.
In TypeScript this can be accomplished with a tsconfig.json containing the following options:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "antihtml"
    }
}
```
