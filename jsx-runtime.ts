import { el, type Element as AntiElement } from "./antihtml.js"

function jsx(type: string | Function, config: Record<string, any>, maybeKey: any) {
	if (typeof type === "string") {
		if ("children" in config) {
			const { children, ...attributes } = config;
			return el(type, attributes, children);
		}
		return el(type, config);
	}
	return type(config);
}

function Fragment(config: Record<string, unknown>) {
	return config.children;
}

export { Fragment, jsx, jsx as jsxs, jsx as jsxDEV }

export namespace JSX {
	export interface IntrinsicElements {
		[elementName: string]: any;
	}
	export interface ElementChildrenAttribute {
		children: {};
	}
	export type Element = AntiElement;
}
