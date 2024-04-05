import { strict as assert } from 'node:assert';
import * as a from './antihtml.js';

describe("antihtml", function() {
	describe("el", function() {
		it("should throw when type is not a string", function() {
			let error =
				new Error("Element type must be a string, not 0");
			assert.throws(() => a.el(0), error);
		});

		it("should throw when passed an unsupported child", function() {
			let error = new TypeError(
				"Expected string or object as child to <a> but got number"
			);
			assert.throws(() => a.el('a', 0), error);

			error = new TypeError(
				"Unsupported object type as child to <a>: Number"
			);
			assert.throws(() => a.el('a', new Number(0)), error);

			const custom = { constructor: undefined, };
			error = new TypeError(
				"Unsupported object type as child to <a>"
			);
			assert.throws(() => a.el('a', Object.create(custom)), error);
		});

		it("should ignore nulls", function() {
			assert(a.el('a', null, null, null).childNodes.length === 0);
		});

		it("should recursively handle arrays", function() {
			assert(a.el('a', ["foo", a.el('br'), ["bar"]]).childNodes.length === 3);
		});
	});

	describe("_serialize", function() {
		it("should throw if passed a node with an unknown child", function() {
			let badNode = a.el('a');
			badNode.childNodes.push(0);
			assert.throws(
				() => a._serialize(badNode), new Error("Unsupported node 0")
			);
		});

		it("should return an empty string for void nodes", function() {
			let element = new a.el('br', "test");
			assert.equal(a._serialize(element), '');
		});

		it("should return an empty string for text nodes", function() {
			let element = new a.el('br', "test");
			assert.equal(a._serialize(element.childNodes[0]), '');
		});
	});

	describe("htmlDocument", function() {
		it("should return an empty document with no parameters", function() {
			assert.equal(a.htmlDocument(), '<!DOCTYPE html>');
		});

		it("should work with a simple html document", function() {
			assert.equal(
				a.htmlDocument(a.el('title', "Test")),
				'<!DOCTYPE html><title>Test</title>'
			);
		});

		it("should work with a complex html document", function() {
			assert.equal(
				a.htmlDocument(
					a.el('html',
						a.el('head', a.el('title', "Test")),
						a.el('body', a.el('h1', "Hello world")),
					)
				),
				'<!DOCTYPE html><html><head><title>Test</title></head>'
				+'<body><h1>Hello world</h1></body></html>'
			);
		});

		it("should not modify the input aguments", function() {
			let document = a.el('html',
				a.el('head', a.el('title', {'id': 'bar'}, "Test")),
				a.el('body', a.el('h1', {'class': 'foo'}, "Hello world")),
			);
			let reference = a.el('html',
				a.el('head', a.el('title', {'id': 'bar'}, "Test")),
				a.el('body', a.el('h1', {'class': 'foo'}, "Hello world")),
			);
			a.htmlDocument(document);
			assert.deepEqual(document, reference);
		});

		it("should work with text nodes", function() {
			assert.equal(
				a.htmlDocument(a.tx("Test")),
				'<!DOCTYPE html>Test'
			);
		});

		it("should work with comment nodes", function() {
			assert.equal(
				a.htmlDocument(a.comment("Test")),
				'<!DOCTYPE html><!--Test-->'
			);
		});

		it("should throw an error with invalid content", function() {
			assert.throws(
				() => a.htmlDocument(0),
				new TypeError(
					"Expected string or object as child to <root> but got number"
				),
			);
		});

		it("should serialise html fragments verbatim", function() {
			assert.equal(
				a.htmlDocument(a.unsafeHTML('>invalid&html<')),
				'<!DOCTYPE html>>invalid&html<'
			);
		});
	});

	describe("htmlFragment", function() {
		it("should serialize a simple <a> element", function() {
			assert.equal(a.htmlFragment(a.el('a')), '<a></a>');
		});

		it("should serialize simple attributes", function() {
			assert.equal(a.htmlFragment(
				a.el('a', {'id': 'test'})),
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
					a.htmlFragment(a.el('a', {'id': character})),
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
					a.htmlFragment(a.el('a', character)),
					`<a>${result}</a>`
				);
			});
		}

		it("should serialise string as text", function() {
			assert.equal(
				a.htmlFragment(a.el('a', "foo")),
				'<a>foo</a>'
			);
		});

		it("should serialise Text nodes as text", function() {
			assert.equal(
				a.htmlFragment(a.el('a', a.tx("foo"))),
				'<a>foo</a>'
			);
		});

		it("should serialise multiple strings as text", function() {
			assert.equal(
				a.htmlFragment(a.el('a', "foo", "bar")),
				'<a>foobar</a>'
			);
		});

		it("should serialize comments", function() {
			assert.equal(
				a.htmlFragment(a.el('a', a.comment("test"))),
				'<a><!--test--></a>'
			);
		});

		it("should throw on comments containing -->", function() {
			assert.throws(
				() => a.htmlFragment(a.el('a', a.comment("-->"))),
				new Error("Comment containing -->")
			);
		});

		it("should escape element text <!--", function() {
			assert.equal(
				a.htmlFragment(a.el('a', "<!--")),
				'<a>&lt;!--</a>'
			);
		});

		it("should work on preserving element", function() {
			assert.equal(
				a.htmlFragment(a.el('script', "test")),
				'<script>test</script>'
			);
		});

		it("should throw on preserving element containing <!--", function() {
			assert.throws(
				() => a.htmlFragment(a.el('script', "<!--")),
				new Error("<!-- in text preserving element")
			);
		});

		it("should throw on preserving element containing <tag", function() {
			assert.throws(
				() => a.htmlFragment(a.el('script', "<script")),
				new Error("Opening tag in text preserving element")
			);
		});

		it("should throw on preserving element containing </tag", function() {
			assert.throws(
				() => a.htmlFragment(a.el('script', "</script")),
				new Error("Closing tag in text preserving element")
			);
		});

		it("should serialize br as void", function() {
			assert.equal(a.htmlFragment(a.el('br', "test")), '<br>');
		});

		it("should serialize frame as void", function() {
			assert.equal(a.htmlFragment(a.el('frame', "test")), '<frame>');
		});

		it("should serialise html fragments verbatim", function() {
			assert.equal(
				a.htmlFragment(a.el('a', a.unsafeHTML('>invalid&html<'))),
				"<a>>invalid&html<</a>"
			);
		});

		it("should serialise text nodes", function() {
			assert.equal(a.htmlFragment(a.tx("Test")), 'Test');
		});

		it("should serialise comment nodes", function() {
			assert.equal(a.htmlFragment(a.comment("Test")), '<!--Test-->');
		});

		it("should allow multiple nodes", function() {
			assert.equal(
				a.htmlFragment(a.comment("Test"), a.tx("spam"), a.el('a')),
				'<!--Test-->spam<a></a>'
			);
		});
	});
});
