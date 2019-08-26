const assert = require('assert').strict;
const a = require('./antihtml');

describe("antihtml", function() {
    describe("_html", function() {
        it("should throw when passed a non-Array", function() {
            let error = new Error("tag must be an Array");
            assert.throws(() => a._html(0), error);
        });

        it("should throw when first element is not a string", function() {
            let error =
                new Error("first element in tag must be a string, not 0");
            assert.throws(() => a._html([0]), error);
        });

        it("should throw when passed an unsupported content type", function() {
            let error = new Error("Unsupported content type number");
            assert.throws(() => a._html(['a', 0]), error);
        });

        it("should ignore nulls", function() {
            assert(a._html(['a', null, null, null]).nodes.length === 0);
        });

        it("should give location information on error", function() {
            let error = new Error(
                "Unsupported content type number\n  in a id=\"a\":2"
            );
            assert.throws(() => a._html(['a', {'id': 'a'}, ['b', 0]]), error);
        });
    });

    describe("_serialize", function() {
        it("should throw if passed a node with an unknown child", function() {
            let badNode = a._html(['a']);
            badNode.nodes.push(0);
            assert.throws(
                () => a._serialize(badNode), new Error("unsupported node 0")
            );
        });

        it("should return an empty string for void nodes", function() {
            let element = new a._html(['br', a.Text("test")]);
            assert.equal(a._serialize(element), '');
        });

        it("should return an empty string for text nodes", function() {
            let element = new a._html(['br', a.Text("test")]);
            assert.equal(a._serialize(element.nodes[0]), '');
        });
    });

    describe("htmlDocument", function() {
        it("should return an empty document with no parameters", function() {
            assert.equal(a.htmlDocument(), '<!DOCTYPE html>');
        });

        it("should work with a simple html document ", function() {
            assert.equal(
                a.htmlDocument(['title', a.Text("Test")]),
                '<!DOCTYPE html><title>Test</title>'
            );
        });

        it("should work with a complex html document ", function() {
            assert.equal(
                a.htmlDocument(
                    ['html',
                        ['head', ['title', a.Text("Test")]],
                        ['body', ['h1', a.Text("Hello world")]],
                    ]
                ),
                '<!DOCTYPE html><html><head><title>Test</title></head>'
                +'<body><h1>Hello world</h1></body></html>'
            );
        });

        it("should not modify the input aguments", function() {
            let document = ['html',
                ['head', ['title', {'id': 'bar'}, a.Text("Test")]],
                ['body', ['h1', 'foo', a.Text("Hello world")]],
            ];
            let reference = ['html',
                ['head', ['title', {'id': 'bar'}, a.Text("Test")]],
                ['body', ['h1', 'foo', a.Text("Hello world")]],
            ];
            a.htmlDocument(document);
            assert.deepEqual(document, reference);
        });

        it("should work with text nodes", function() {
            assert.equal(
                a.htmlDocument(a.Text("Test")),
                '<!DOCTYPE html>Test'
            );
        });

        it("should work with comment nodes", function() {
            assert.equal(
                a.htmlDocument(a.Comment("Test")),
                '<!DOCTYPE html><!--Test-->'
            );
        });

        it("should throw an error with invalid content", function() {
            assert.throws(
                () => a.htmlDocument(0),
                new Error("Unsupported root content type number")
            );
        });
    });

    describe("htmlFragment", function() {
        it("should serialize a simple <a> element", function() {
            assert.equal(a.htmlFragment(['a']), '<a></a>');
        });

        it("should serialize simple attributes", function() {
            assert.equal(a.htmlFragment(
                ['a', {'id': 'test'}]),
                '<a id="test"></a>'
            );
        });

        let attribChars = [
            ["&", '&', '&amp;'],
            ["no break space", '\xA0', '&nbsp;'],
            ["\"", '"', '&quot;'],
            ["&\"\"&amp;", '&\"\"&amp;', '&amp;&quot;&quot;&amp;amp;'],
        ];

        for (let [name, character, result] of attribChars) {
            it(`should escape ${name} in attributes`, function() {
                assert.equal(
                    a.htmlFragment(['a', {'id': character}]),
                    `<a id="${result}"></a>`
                );
            });
        }

        let nodeChars = [
            ["&", '&', '&amp;'],
            ["no break space", '\xA0', '&nbsp;'],
            ["<", '<', '&lt;'],
            [">", '>', '&gt;'],
            ["&<<>>&amp;", '&<<>>&amp;', '&amp;&lt;&lt;&gt;&gt;&amp;amp;'],
        ];

        for (let [name, character, result] of nodeChars) {
            it(`should escape ${name} in node content`, function() {
                assert.equal(
                    a.htmlFragment(['a', a.Text(character)]),
                    `<a>${result}</a>`
                );
            });
        }

        it("should serialise a class", function() {
            assert.equal(
                a.htmlFragment(['a', 'foo']),
                '<a class="foo"></a>'
            );
        });

        it("should serialise multiple classes", function() {
            assert.equal(
                a.htmlFragment(['a', 'foo', 'bar']),
                '<a class="foo bar"></a>'
            );
        });

        it("should override class if set as attribute", function() {
            assert.equal(
                a.htmlFragment(['a', 'foo', {'class': 'bar'}]),
                '<a class="bar"></a>'
            );
        });

        it("should serialize comments", function() {
            assert.equal(
                a.htmlFragment(['a', a.Comment("test")]),
                '<a><!--test--></a>'
            );
        });

        it("should throw on comments containing -->", function() {
            assert.throws(
                () => a.htmlFragment(['a', a.Comment("-->")]),
                new Error("Comment containing -->")
            );
        });

        it("should work fine on element text <!--", function() {
            assert.equal(
                a.htmlFragment(['a', a.Text("<!--")]),
                '<a>&lt;!--</a>'
            );
        });

        it("should work on preserving element", function() {
            assert.equal(
                a.htmlFragment(['script', a.Text("test")]),
                '<script>test</script>'
            );
        });

        it("should throw on preserving element text <!--", function() {
            assert.throws(
                () => a.htmlFragment(['script', a.Text("<!--")]),
                new Error("<!-- in text preserving element")
            );
        });

        it("should throw on preserving element text <tag", function() {
            assert.throws(
                () => a.htmlFragment(['script', a.Text("<script")]),
                new Error("opening tag in text preserving element")
            );
        });

        it("should throw on preserving element text </tag", function() {
            assert.throws(
                () => a.htmlFragment(['script', a.Text("</script")]),
                new Error("closing tag in text preserving element")
            );
        });

        it("should serialize br as void", function() {
            assert.equal(a.htmlFragment(['br', a.Text("test")]), '<br>');
        });

        it("should serialize frame as void", function() {
            assert.equal(a.htmlFragment(['frame', a.Text("test")]), '<frame>');
        });

        it("should work with text nodes", function() {
            assert.equal(a.htmlFragment(a.Text("Test")), 'Test');
        });

        it("should work with comment nodes", function() {
            assert.equal(a.htmlFragment(a.Comment("Test")), '<!--Test-->');
        });

        it("should allow multiple nodes", function() {
            assert.equal(
                a.htmlFragment(a.Comment("Test"), a.Text("spam"), ['a']),
                '<!--Test-->spam<a></a>'
            );
        });
    });
});
