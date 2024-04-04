# AntiHTML

The simple stupid data structure oriented HTML serializer.

## Simple exaple

```js
import * as a from 'antihtml';

let document = a.htmlDocument(['html',
    ['head',
        ['meta', {'charset': 'utf-8'}],
        ['title', a.Text("Hello world")],
    ],
    ['body',
        ['h1', a.Text("Hello world")],
        ['p', a.Text("This is a sample html document")],
    ]
]);
```

Produces a string containing an html document roghly equivalent to the following, with the exception of there being no newlines or extra whitespace:

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
