import { createHighlighterCore } from "shiki/core";
import javascript from "shiki/langs/javascript.mjs";
import python from "shiki/langs/python.mjs";
import typescript from "shiki/langs/typescript.mjs";
import vue from "shiki/langs/vue.mjs";
import json from "shiki/langs/json.mjs";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import light from "shiki/themes/github-light.mjs";
import dark from "shiki/themes/github-dark.mjs";

export const highlighter = createHighlighterCore({
  themes: [light, dark],
  langs: [javascript, python, typescript, vue, json, css, html],
  loadWasm: import("shiki/wasm"),
});
